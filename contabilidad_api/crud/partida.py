from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from typing import List
import math

# ==================== IMPORTACIÓN DE MODELOS Y ESQUEMAS ====================
from models.partida import PartidaCabecera, PartidaDetalle
from models.periodo import ControlPeriodo
from schemas.partida import PartidaCompletaCrear, PaginaPartidasRespuesta, CierreContableRequest
from config.database import get_db
from crud import cierre as c_cierre
from auth_module import obtener_usuario_actual, TokenData

router = APIRouter(
    prefix="/api/v1/partidas",
    tags=["Manejo de Partidas Contables"]
)

# Función de validación de seguridad
def verificar_periodo_abierto(empresa_id: str, anio: int, mes: int, db: Session):
    """
    Guardia de seguridad: Bloquea cualquier intento de alterar la contabilidad en meses/años cerrados.
    """
    periodo = db.query(ControlPeriodo).filter_by(empresa_id=empresa_id, anio=anio, mes=mes).first()
    
    if not periodo:
        raise HTTPException(status_code=404, detail="El período contable no existe. Verifique la configuración de la empresa.")
        
    if not periodo.anio_abierto:
        raise HTTPException(
            status_code=403, 
            detail=f"TRANSACCIÓN RECHAZADA: El ejercicio fiscal {anio} está completamente cerrado y auditado."
        )
        
    if not periodo.mes_abierto:
        raise HTTPException(
            status_code=403, 
            detail=f"TRANSACCIÓN RECHAZADA: El mes {mes} se encuentra cerrado. No se permiten nuevas partidas ni modificaciones."
        )
        
    return True


@router.get("/resumen", response_model=PaginaPartidasRespuesta)
def obtener_resumen_partidas_paginado(
    empresa_id: str,
    anio: int,
    mes: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Retorna un listado paginado de los encabezados de partidas para la tabla de navegación.
    Aplica scrolling y segmentación controlada de registros del periodo.
    """
    query_base = db.query(PartidaCabecera).filter_by(
        empresa_id=empresa_id,
        anio=anio,
        mes=mes
    )

    total_registros = query_base.count()
    total_paginas = math.ceil(total_registros / limit) if total_registros > 0 else 1

    partidas = query_base.order_by(PartidaCabecera.numero_partida.asc())\
                          .offset((page - 1) * limit)\
                          .limit(limit)\
                          .all()

    registros_respuesta = []
    for p in partidas:
        nomenclatura_generada = f"{p.mes:02d}-{p.numero_partida:04d}"
        registros_respuesta.append({
            "id": p.id,
            "numero_partida": p.numero_partida,
            "fecha": p.fecha,
            "concepto": p.concepto,
            "estado": p.estado,
            "nomenclatura": nomenclatura_generada
        })

    return {
        "total_registros": total_registros,
        "pagina_actual": page,
        "total_paginas": total_paginas,
        "registros": registros_respuesta
    }

@router.post("/guardar-completa", status_code=status.HTTP_201_CREATED)
def guardar_partida_completa_transaccional(partida_in: PartidaCompletaCrear, db: Session = Depends(get_db)):
    """
    Registra de forma atómica y síncrona la cabecera junto con sus líneas de detalle.
    Verifica cuadre aritmético perfecto y asigna número de partida definitivo en el acto.
    """
    # 1. EL VIGILANTE: Verificar que el mes y el año permitan escrituras
    verificar_periodo_abierto(partida_in.empresa_id, partida_in.anio, partida_in.mes, db)

    # 2. Validar cuadre contable estricto (Debe == Haber) en el payload
    total_debe = sum(linea.debe for linea in partida_in.detalles)
    total_haber = sum(linea.haber for linea in partida_in.detalles)

    if total_debe != total_haber:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error de cuadre: Suma del Debe (${total_debe}) no coincide con Suma del Haber (${total_haber})."
        )

    if total_debe <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La transacción debe poseer montos financieros mayores a cero."
        )

    # 3. Validar que cada línea no altere ambas columnas simultáneamente
    for index, linea in enumerate(partida_in.detalles):
        if linea.debe > 0 and linea.haber > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inconsistencia en línea {index + 1}: No se permite cargar y abonar un mismo renglón."
            )
        if linea.debe == 0 and linea.haber == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inconsistencia en línea {index + 1}: El renglón no registra ningún movimiento financiero."
            )

    # 4. Iniciar bloque transaccional controlado y bloquear periodo
    periodo = db.query(ControlPeriodo).filter_by(
        empresa_id=partida_in.empresa_id,
        anio=partida_in.anio,
        mes=partida_in.mes
    ).with_for_update().first()

    try:
        # 5. Incrementar el contador global del mes para obtener el número de partida real
        periodo.total_partidas += 1
        numero_asignado = periodo.total_partidas

        # 6. Insertar la Cabecera de la Partida
        nueva_cabecera = PartidaCabecera(
            empresa_id=partida_in.empresa_id,
            anio=partida_in.anio,
            mes=partida_in.mes,
            numero_partida=numero_asignado,
            fecha=partida_in.fecha,
            concepto=partida_in.concepto,
            estado="Borrador",
            usuario_creacion=partida_in.usuario,
            terminal_ip=partida_in.terminal_ip
        )
        db.add(nueva_cabecera)
        db.flush()  # Obtener el ID autoincremental de la cabecera sin confirmar la transacción

        # 7. Insertar las Líneas de Detalle asociadas
        for linea in partida_in.detalles:
            nuevo_detalle = PartidaDetalle(
                partida_id=nueva_cabecera.id,
                cuenta_codigo=linea.cuenta_codigo,
                debe=linea.debe,
                haber=linea.haber,
                concepto_detalle=linea.concepto_detalle,
                empresa_id=partida_in.empresa_id,
                anio=partida_in.anio          
            )
            db.add(nuevo_detalle)

        # 8. Consolidar cambios en la base de datos de forma segura
        db.commit()
        
        nomenclatura_final = f"{nueva_cabecera.mes:02d}-{numero_asignado:04d}"
        return {
            "status": "success",
            "mensaje": "Partida e historial de movimientos guardados correctamente.",
            "partida_id": nueva_cabecera.id,
            "numero_partida": numero_asignado,
            "nomenclatura": nomenclatura_final
        }
        
    except IntegrityError:
        # INTERCEPCIÓN ESPECÍFICA DE DUPLICIDAD DE CORRELATIVOS DE BASE DE DATOS
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Fallo crítico inesperado: El número de partida '{numero_asignado}' ya se encuentra registrado y duplicado para el mes {partida_in.mes}. No se puede guardar la información para proteger la integridad contable. Por favor, comuníquese con Soporte Técnico inmediatamente para restablecer los correlativos."
        )

    except Exception as e:
        # EXCEPCIÓN GENÉRICA (Atrapa cualquier otro error que no sea de integridad)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo crítico al procesar la transacción contable: {str(e)}"
        )

@router.get("/individual/{partida_id}")
def obtener_partida_individual_con_detalles(partida_id: int, db: Session = Depends(get_db)):
    """
    Recupera una partida específica por su ID junto con todas sus líneas de detalle
    para poblar el formulario en modo edición.
    """
    partida = db.query(PartidaCabecera).filter(PartidaCabecera.id == partida_id).first()
    
    if not partida:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"La partida con ID {partida_id} no existe en el sistema."
        )
    
    lineas_mapeadas = []
    for d in partida.detalles:
        lineas_mapeadas.append({
            "cuenta_codigo": d.cuenta_codigo,
            "debe": float(d.debe),
            "haber": float(d.haber),
            "concepto_detalle": d.concepto_detalle or ""
        })
        
    nomenclatura_generada = f"{partida.mes:02d}-{partida.numero_partida:04d}"
    
    return {
        "id": partida.id,
        "fecha": partida.fecha.isoformat(),
        "concepto": partida.concepto,
        "estado": partida.estado,
        "nomenclatura": nomenclatura_generada,
        "detalles": lineas_mapeadas
    }

@router.put("/actualizar/{partida_id}", status_code=status.HTTP_200_OK)
def actualizar_partida_completa_transaccional(
    partida_id: int, 
    partida_in: PartidaCompletaCrear, 
    db: Session = Depends(get_db)
):
    """
    Actualiza de forma atómica una partida contable existente.
    Verifica periodos abiertos, limpia las líneas anteriores e inserta los nuevos movimientos.
    """
    # 1. Verificar seguridad del periodo contable
    verificar_periodo_abierto(partida_in.empresa_id, partida_in.anio, partida_in.mes, db)

    # 2. Validar cuadre contable estricto (Debe == Haber)
    total_debe = sum(linea.debe for linea in partida_in.detalles)
    total_haber = sum(linea.haber for linea in partida_in.detalles)

    if total_debe != total_haber:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error de cuadre: Suma del Debe (${total_debe}) no coincide con Suma del Haber (${total_haber})."
        )

    # 3. Localizar la cabecera existente en la BD
    partida = db.query(PartidaCabecera).filter(PartidaCabecera.id == partida_id).first()
    if not partida:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La partida con ID {partida_id} no existe en el sistema."
        )

    try:
        # 4. Actualizar los campos modificables de la cabecera
        partida.fecha = partida_in.fecha
        partida.concepto = partida_in.concepto
        partida.usuario_modificacion = partida_in.usuario
        
        # 5. Remover quirúrgicamente los detalles viejos para evitar duplicados
        db.query(PartidaDetalle).filter(PartidaDetalle.partida_id == partida_id).delete()
        
        # 6. Insertar las nuevas líneas de detalle ajustadas por el digitador
        for linea in partida_in.detalles:
            nuevo_detalle = PartidaDetalle(
                partida_id=partida.id,
                cuenta_codigo=linea.cuenta_codigo,
                debe=linea.debe,
                haber=linea.haber,
                concepto_detalle=linea.concepto_detalle,
                empresa_id=partida_in.empresa_id,
                anio=partida_in.anio          
            )
            db.add(nuevo_detalle)

        # 7. Consolidar cambios en bloque síncrono seguro
        db.commit()
        
        nomenclatura_final = f"{partida.mes:02d}-{partida.numero_partida:04d}"
        return {
            "status": "success",
            "mensaje": "Partida contable modificada y consolidada correctamente.",
            "partida_id": partida.id,
            "nomenclatura": nomenclatura_final
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo crítico al actualizar la transacción contable: {str(e)}"
        )
    
@router.post("/ejecutar-cierre")
def api_ejecutar_cierre(
    request: CierreContableRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(obtener_usuario_actual)
):
    """
    Ejecuta el proceso irreversible de liquidación de cuentas de resultado (Cierre Anual).
    """
    try:
        # Extraemos el usuario del modelo TokenData devuelto por la dependencia de seguridad
        usuario_id = current_user.username if current_user.username else "Sistema"
        
        resultado = c_cierre.ejecutar_cierre_contable(
            db=db,
            empresa_id=request.empresa_id,
            anio=request.anio,
            cuenta_liquidadora_codigo=request.cuenta_liquidadora_codigo,
            usuario_id=usuario_id
        )
        return resultado
        
    except ValueError as e:
        # Capturamos las excepciones de regla de negocio (ej. Partidas en Borrador)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error crítico en cierre: {str(e)}")