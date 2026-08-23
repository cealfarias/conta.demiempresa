from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import math
import csv
import io
import json
from datetime import datetime
from decimal import Decimal, InvalidOperation

# ==================== IMPORTACIÓN DE MODELOS Y ESQUEMAS ====================
from models.partida import PartidaCabecera, PartidaDetalle
from models.periodo import ControlPeriodo
from models.cuenta import CuentaContable
from schemas.partida import PartidaCompletaCrear, PaginaPartidasRespuesta, CierreContableRequest, EstadoPartidaUpdate, PreCierreResponse, CierreCompletoRequest
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

    # 3. Validar que cada línea no altere ambas columnas simultáneamente y verificar cuentas
    codigos_detalle = [linea.cuenta_codigo for linea in partida_in.detalles]
    cuentas_bd = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == partida_in.empresa_id,
        CuentaContable.anio == partida_in.anio,
        CuentaContable.cuentas.in_(codigos_detalle)
    ).all()
    mapa_cuentas = {c.cuentas: c for c in cuentas_bd}

    for index, linea in enumerate(partida_in.detalles):
        cuenta = mapa_cuentas.get(linea.cuenta_codigo)
        if not cuenta:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inconsistencia en línea {index + 1}: La cuenta {linea.cuenta_codigo} no existe en el catálogo activo."
            )
        if cuenta.resumen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inconsistencia en línea {index + 1}: La cuenta {linea.cuenta_codigo} es una cuenta de Resumen (padre). Las partidas solo pueden usar cuentas de Detalle."
            )
        
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

    except Exception as e:
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
        cuenta = db.query(CuentaContable).filter_by(
            empresa_id=partida.empresa_id, 
            anio=partida.anio, 
            cuentas=d.cuenta_codigo
        ).first()
        nombre_cuenta = cuenta.nombre if cuenta else "Cuenta Desconocida"
        
        lineas_mapeadas.append({
            "cuenta_codigo": d.cuenta_codigo,
            "cuenta_nombre": nombre_cuenta,
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
        "detalles": lineas_mapeadas,
        "usuario_creacion": partida.usuario_creacion,
        "fecha_creacion": partida.fecha_creacion.isoformat() if partida.fecha_creacion else None,
        "usuario_modificacion": partida.usuario_modificacion,
        "fecha_modificacion": partida.fecha_modificacion.isoformat() if partida.fecha_modificacion else None
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

    # 2. Validar cuadre contable estricto y verificar cuentas
    total_debe = sum(linea.debe for linea in partida_in.detalles)
    total_haber = sum(linea.haber for linea in partida_in.detalles)

    if total_debe != total_haber:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error de cuadre: Suma del Debe (${total_debe}) no coincide con Suma del Haber (${total_haber})."
        )
        
    codigos_detalle = [linea.cuenta_codigo for linea in partida_in.detalles]
    cuentas_bd = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == partida_in.empresa_id,
        CuentaContable.anio == partida_in.anio,
        CuentaContable.cuentas.in_(codigos_detalle)
    ).all()
    mapa_cuentas = {c.cuentas: c for c in cuentas_bd}

    for index, linea in enumerate(partida_in.detalles):
        cuenta = mapa_cuentas.get(linea.cuenta_codigo)
        if not cuenta:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inconsistencia en línea {index + 1}: La cuenta {linea.cuenta_codigo} no existe."
            )
        if cuenta.resumen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Inconsistencia en línea {index + 1}: La cuenta {linea.cuenta_codigo} es de Resumen (padre). Solo use cuentas de Detalle."
            )

    # 3. Localizar la cabecera existente en la BD
    partida = db.query(PartidaCabecera).filter(PartidaCabecera.id == partida_id).first()
    if not partida:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La partida con ID {partida_id} no existe en el sistema."
        )

    if partida.estado != "Borrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Operación denegada. La partida está en estado '{partida.estado}' y no puede ser modificada. El sistema bloqueó la edición."
        )

    try:
        # 4. Actualizar los campos modificables de la cabecera
        partida.fecha = partida_in.fecha
        partida.concepto = partida_in.concepto
        partida.usuario_modificacion = partida_in.usuario
        partida.fecha_modificacion = datetime.utcnow()
        partida.terminal_ip = partida_in.terminal_ip
        
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

@router.get("/pre-cierre/{empresa_id}/{anio}")
def api_pre_cierre(
    empresa_id: str,
    anio: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(obtener_usuario_actual)
):
    """
    Ejecuta las validaciones previas al cierre del ejercicio fiscal.
    Retorna un diagnóstico completo del estado del año contable.
    """
    try:
        resultado = c_cierre.pre_cierre_validacion(db=db, empresa_id=empresa_id, anio=anio)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en pre-cierre: {str(e)}")

@router.post("/ejecutar-cierre-completo")
def api_ejecutar_cierre_completo(
    request: CierreCompletoRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(obtener_usuario_actual)
):
    """
    Ejecuta el proceso completo de cierre del ejercicio fiscal en 5 pasos:
    1. Validación pre-cierre
    2. Provisiones (Reserva Legal + ISR)
    3. Partida de Liquidación
    4. Sellado del ejercicio
    5. Apertura del siguiente año (catálogo, manual, saldos, partida de apertura)
    
    Basado en NIIF para PYMES, PCGA y normativa de la JVCP de El Salvador.
    """
    try:
        usuario_id = current_user.username if current_user.username else "Sistema"
        
        resultado = c_cierre.ejecutar_cierre_completo(
            db=db,
            empresa_id=request.empresa_id,
            anio=request.anio,
            anio_nuevo=request.anio_nuevo,
            usuario_id=usuario_id,
            calcular_reserva_legal=request.calcular_reserva_legal,
            calcular_isr=request.calcular_isr
        )
        return resultado
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error crítico en cierre completo: {str(e)}")

@router.put("/{partida_id}/anular", status_code=status.HTTP_200_OK)
def anular_partida(partida_id: int, db: Session = Depends(get_db)):
    """
    Anula lógicamente una partida. Cambia estado a 'Anulada' y encera todos sus movimientos
    para no afectar la contabilidad.
    """
    partida = db.query(PartidaCabecera).filter(PartidaCabecera.id == partida_id).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
        
    verificar_periodo_abierto(partida.empresa_id, partida.anio, partida.mes, db)
    
    if partida.estado == "Anulada":
        raise HTTPException(status_code=400, detail="La partida ya se encuentra anulada.")

    try:
        partida.estado = "Anulada"
        for detalle in partida.detalles:
            detalle.debe = 0.00
            detalle.haber = 0.00
        
        db.commit()
        return {"status": "success", "mensaje": "Partida anulada con éxito"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al anular: {str(e)}")

@router.put("/{partida_id}/imprimir", status_code=status.HTTP_200_OK)
def marcar_partida_impresa(partida_id: int, db: Session = Depends(get_db)):
    """
    Marca la partida como 'Impresa', lo cual le aplica un candado de seguridad
    impidiendo futuras modificaciones.
    """
    partida = db.query(PartidaCabecera).filter(PartidaCabecera.id == partida_id).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
        
    if partida.estado == "Borrador":
        try:
            partida.estado = "Impresa"
            db.commit()
            return {"status": "success", "mensaje": "Candado de impresión activado"}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al marcar como impresa: {str(e)}")
            
    return {"status": "success", "mensaje": "La partida ya tenía un estado superior"}

@router.put("/estado/{partida_id}", status_code=status.HTTP_200_OK)
def cambiar_estado_partida(
    partida_id: int, 
    estado_update: EstadoPartidaUpdate, 
    db: Session = Depends(get_db)
):
    """
    Cambia el estado de una partida (ej. de Mayorizada a Borrador).
    """
    partida = db.query(PartidaCabecera).filter(PartidaCabecera.id == partida_id).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
        
    verificar_periodo_abierto(partida.empresa_id, partida.anio, partida.mes, db)
    
    if estado_update.estado not in ["Borrador", "Mayorizada", "Anulada"]:
        raise HTTPException(status_code=400, detail="Estado no permitido")

    try:
        partida.estado = estado_update.estado
        db.commit()
        return {"status": "success", "mensaje": f"Estado cambiado a {estado_update.estado}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al cambiar estado: {str(e)}")

# ==================== IMPORTACIN DE PARTIDAS ====================
@router.post("/importar-validar")
async def importar_partidas_csv(
    request: Request,
    archivo: UploadFile = File(...),
    mapeo: str = Form(...),
    empresa_id: str = Query(..., description="ID de la Empresa Activa"),
    anio: int = Query(..., description="Ao del Ejercicio Contable"),
    usuario: str = Query(..., description="Usuario activo"),
    db: Session = Depends(get_db)
):
    if not archivo.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe tener extensin .csv")

    try:
        dict_mapeo = json.loads(mapeo)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="El diccionario de mapeo es invlido.")

    col_numero = dict_mapeo.get("numero")
    col_fecha = dict_mapeo.get("fecha")
    col_cuenta = dict_mapeo.get("cuenta")
    col_concepto = dict_mapeo.get("concepto")
    col_debe = dict_mapeo.get("debe")
    col_haber = dict_mapeo.get("haber")

    if not all([col_numero, col_fecha, col_cuenta, col_debe, col_haber]):
        raise HTTPException(status_code=400, detail="Faltan columnas obligatorias en el mapeo.")

    content = await archivo.read()
    try:
        text = content.decode('utf-8-sig')
    except:
        text = content.decode('latin-1')

    reader = csv.DictReader(io.StringIO(text), delimiter=';')
    if not reader.fieldnames or col_numero not in reader.fieldnames:
        reader = csv.DictReader(io.StringIO(text), delimiter=',')

    filas = list(reader)
    if not filas:
        raise HTTPException(status_code=400, detail="El archivo est vaco.")

    # Agrupar por numero original
    grupos = {}
    for i, fila in enumerate(filas):
        try:
            n_orig = fila[col_numero].strip()
        except KeyError:
            raise HTTPException(status_code=400, detail=f"No se encontr la columna '{col_numero}' en el CSV.")
        if not n_orig:
            continue
        if n_orig not in grupos:
            grupos[n_orig] = []
        grupos[n_orig].append((i+2, fila)) # i+2 for excel row number (header is 1)

    errores = []
    partidas_a_guardar = []

    for n_orig, lineas in grupos.items():
        # Validar grupo
        grupo_debe = Decimal('0.00')
        grupo_haber = Decimal('0.00')
        
        fecha_str = lineas[0][1].get(col_fecha, '').strip()
        try:
            # Detectar formato YYYY-MM-DD o DD/MM/YYYY
            if '/' in fecha_str:
                parts = fecha_str.split('/')
                if len(parts[0]) == 4:
                    fecha_obj = datetime.strptime(fecha_str, "%Y/%m/%d").date()
                else:
                    fecha_obj = datetime.strptime(fecha_str, "%d/%m/%Y").date()
            elif '-' in fecha_str:
                parts = fecha_str.split('-')
                if len(parts[0]) == 4:
                    fecha_obj = datetime.strptime(fecha_str, "%Y-%m-%d").date()
                else:
                    fecha_obj = datetime.strptime(fecha_str, "%d-%m-%Y").date()
            else:
                fecha_obj = datetime.strptime(fecha_str, "%Y%m%d").date()
        except:
            errores.append({"partida": n_orig, "error": f"Formato de fecha invlido: {fecha_str}"})
            continue

        if fecha_obj.year != anio:
            errores.append({"partida": n_orig, "error": f"El ao de la fecha ({fecha_obj.year}) no coincide con el ao en curso ({anio})."})
            continue

        mes_obj = fecha_obj.month
        
        # Concepto original de la cabecera
        concepto_orig = lineas[0][1].get(col_concepto, '').strip() if col_concepto else ''
        concepto_final = f"importacin de partida {n_orig}"
        if concepto_orig:
            concepto_final += f" - {concepto_orig}"

        detalles_crear = []
        
        cuenta_nivel_3_nombre = ""

        for row_idx, fila in lineas:
            cuenta_cod = fila.get(col_cuenta, '').strip()
            
            # Validar que la cuenta existe y es de detalle
            cuenta_db = db.query(CuentaContable).filter_by(empresa_id=empresa_id, anio=anio, cuentas=cuenta_cod).first()
            if not cuenta_db:
                errores.append({"partida": n_orig, "error": f"Lnea {row_idx}: La cuenta '{cuenta_cod}' no existe en el catlogo."})
                continue
            
            if cuenta_db.clase == "Padre":
                errores.append({"partida": n_orig, "error": f"Lnea {row_idx}: La cuenta '{cuenta_cod}' es de clase Padre. Solo se permiten cuentas de detalle."})
                continue
                
            # Extraer cuenta N3 si no hay concepto
            if not concepto_orig and not cuenta_nivel_3_nombre:
                if len(cuenta_cod) >= 4:
                    n3_cod = cuenta_cod[:4]
                    c3_db = db.query(CuentaContable).filter_by(empresa_id=empresa_id, anio=anio, cuentas=n3_cod).first()
                    if c3_db:
                        cuenta_nivel_3_nombre = c3_db.nombre

            try:
                debe_val = Decimal(fila.get(col_debe, '0').replace(',', '') or '0')
            except InvalidOperation:
                errores.append({"partida": n_orig, "error": f"Lnea {row_idx}: Valor invlido en Debe '{fila.get(col_debe)}'"})
                debe_val = Decimal('0')
                
            try:
                haber_val = Decimal(fila.get(col_haber, '0').replace(',', '') or '0')
            except InvalidOperation:
                errores.append({"partida": n_orig, "error": f"Lnea {row_idx}: Valor invlido en Haber '{fila.get(col_haber)}'"})
                haber_val = Decimal('0')

            grupo_debe += debe_val
            grupo_haber += haber_val
            
            detalles_crear.append({
                "cuenta_codigo": cuenta_cod,
                "debe": debe_val,
                "haber": haber_val,
                "concepto_detalle": fila.get(col_concepto, '').strip() if col_concepto else ''
            })

        if grupo_debe != grupo_haber:
            errores.append({"partida": n_orig, "error": f"Descuadre: Debe (${grupo_debe}) != Haber (${grupo_haber}). Diferencia: ${abs(grupo_debe - grupo_haber)}"})

        if not concepto_orig:
            concepto_final = f"importacin de partida {n_orig} - partida del mes de {mes_obj} {cuenta_nivel_3_nombre}".strip()

        if not errores:
            partida_obj = {
                "empresa_id": empresa_id,
                "anio": anio,
                "mes": mes_obj,
                "fecha": fecha_obj,
                "concepto": concepto_final,
                "usuario": usuario,
                "terminal_ip": request.client.host if request.client else "0.0.0.0",
                "detalles": detalles_crear
            }
            partidas_a_guardar.append(partida_obj)

    if errores:
        raise HTTPException(status_code=400, detail={"mensaje": "Se encontraron incongruencias en la validacin", "errores": errores})

    # Si pas todas las validaciones, procedemos a guardar (generar los propios correlativos en partida_in)
    importadas = 0
    from schemas.partida import PartidaCompletaCrear
    from routers.partida import guardar_partida_completa_transaccional

    for p_dict in partidas_a_guardar:
        p_crear = PartidaCompletaCrear(**p_dict)
        # Esto reutiliza la logica que ya valida periodo abierto y cuadre, y asigna el numero correlativo oficial
        guardar_partida_completa_transaccional(p_crear, db=db)
        importadas += 1

    return {"success": True, "importadas": importadas, "mensaje": f"Se importaron {importadas} partidas exitosamente."}

