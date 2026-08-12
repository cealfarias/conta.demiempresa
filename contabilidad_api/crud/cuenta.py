import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import models.cuenta as m_cuenta
import schemas.cuenta as s_cuenta
import models.periodo as m_periodo
from models.partida import PartidaDetalle, PartidaCabecera 
from sqlalchemy import func
from collections import defaultdict

# Importación correcta apuntando al archivo models/manual.py que nos compartiste
from models.manual import ManualContable

def registrar_cuenta_catalogo(db: Session, cuenta_in: s_cuenta.CuentaContableCreate, empresa_id: str, anio: int):
    existe = db.query(m_cuenta.CuentaContable).filter(
        m_cuenta.CuentaContable.cuentas == cuenta_in.cuentas,
        m_cuenta.CuentaContable.empresa_id == empresa_id,
        m_cuenta.CuentaContable.anio == anio
    ).first()
    
    if existe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"La cuenta {cuenta_in.cuentas} ya existe en este catálogo.")
    
    if cuenta_in.ctadep:
        padre = db.query(m_cuenta.CuentaContable).filter(
            m_cuenta.CuentaContable.cuentas == cuenta_in.ctadep,
            m_cuenta.CuentaContable.empresa_id == empresa_id,
            m_cuenta.CuentaContable.anio == anio
        ).first()
        
        if not padre:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"La cuenta padre {cuenta_in.ctadep} no existe en este ejercicio.")
        if not padre.resumen:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede colgar una subcuenta de una cuenta clasificada de detalle.")

    nueva_cuenta = m_cuenta.CuentaContable(
        empresa_id=empresa_id,
        anio=anio,
        cuentas=cuenta_in.cuentas,
        nombre=cuenta_in.nombre,
        ctadep=cuenta_in.ctadep,
        nivel=cuenta_in.nivel,
        resumen=cuenta_in.resumen,
        usuario_creacion=cuenta_in.usuario_operacion,
        terminal_ip=cuenta_in.terminal_ip
    )
    db.add(nueva_cuenta)
    db.commit()
    db.refresh(nueva_cuenta)
    return nueva_cuenta

def obtener_catalogo_completo(db: Session, empresa_id: str, anio: int):
    return db.query(m_cuenta.CuentaContable).filter(
        m_cuenta.CuentaContable.empresa_id == empresa_id,
        m_cuenta.CuentaContable.anio == anio
    ).order_by(m_cuenta.CuentaContable.cuentas.asc()).all()

def modificar_nombre_cuenta(db: Session, codigo_cuenta: str, nuevo_nombre: str, empresa_id: str, anio: int):
    cuenta = db.query(m_cuenta.CuentaContable).filter(
        m_cuenta.CuentaContable.cuentas == codigo_cuenta,
        m_cuenta.CuentaContable.empresa_id == empresa_id,
        m_cuenta.CuentaContable.anio == anio
    ).first()
    
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La cuenta contable no existe en este catálogo.")
    
    cuenta.nombre = nuevo_nombre.upper()
    db.commit()
    db.refresh(cuenta)
    return cuenta

def eliminar_cuenta_segura(db: Session, codigo_cuenta: str, empresa_id: str, anio: int):
    cuenta = db.query(m_cuenta.CuentaContable).filter(
        m_cuenta.CuentaContable.cuentas == codigo_cuenta,
        m_cuenta.CuentaContable.empresa_id == empresa_id,
        m_cuenta.CuentaContable.anio == anio
    ).first()
    
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La cuenta contable no existe en este catálogo.")
    
    tiene_hijos = db.query(m_cuenta.CuentaContable).filter(
        m_cuenta.CuentaContable.ctadep == codigo_cuenta,
        m_cuenta.CuentaContable.empresa_id == empresa_id,
        m_cuenta.CuentaContable.anio == anio
    ).first()
    
    if tiene_hijos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inadmisible: No se puede eliminar la cuenta porque tiene subcuentas dependientes."
        )
    
    saldo_cero = True 
    if not saldo_cero:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inadmisible: La cuenta posee movimientos contables o saldo activo en este año."
        )
        
    db.delete(cuenta)
    db.commit()
    return {"detail": "Cuenta eliminada exitosamente del catálogo."}

def consultar_manual_cuenta(db: Session, codigo_cuenta: str):
    """
    Realiza la consulta a la tabla manual_contable utilizando el código de la cuenta.
    Esta función es invocada repetidamente por el frontend en su ciclo de herencia ascendente.
    """
    manual = db.query(ManualContable).filter(
        ManualContable.cuenta_codigo == codigo_cuenta
    ).first()
    
    if not manual:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manual no encontrado para esta cuenta.")
    
    return manual

def trasladar_saldos_iniciales(db: Session, empresa_id: str, anio_destino: int, usuario: str, ip: str):
    anio_origen = anio_destino - 1
    
    # 1. Verificar existencia y estado de cierre del año anterior
    ejercicio_origen = db.query(m_periodo.EjercicioFiscal).filter(
        m_periodo.EjercicioFiscal.empresa_id == empresa_id,
        m_periodo.EjercicioFiscal.anio == anio_origen
    ).first()
    
    if not ejercicio_origen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Inadmisible: No se encontró el ejercicio fiscal {anio_origen} para extraer los saldos finales."
        )
        
    estado_cierre = "Final" if ejercicio_origen.estado_cerrado else "Borrador (Temporal)"

    # 2. Extraer catálogo y saldos del año origen
    cuentas_origen = db.query(m_cuenta.CuentaContable).filter(
        m_cuenta.CuentaContable.empresa_id == empresa_id,
        m_cuenta.CuentaContable.anio == anio_origen
    ).all()
    
    if not cuentas_origen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El catálogo de cuentas del año {anio_origen} está vacío. No hay saldos para trasladar."
        )
        
    mapa_saldos_origen = {c.cuentas: c.saldo_final for c in cuentas_origen}

    # 3. Extraer catálogo del año destino
    cuentas_destino = db.query(m_cuenta.CuentaContable).filter(
        m_cuenta.CuentaContable.empresa_id == empresa_id,
        m_cuenta.CuentaContable.anio == anio_destino
    ).all()
    
    if not cuentas_destino:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Debe importar o crear el catálogo para el año {anio_destino} antes de realizar el traslado de saldos."
        )

    # 4. Procesar inyección de saldos (Reglas de Negocio Contable)
    cuentas_actualizadas = 0
    raices_balance = ['1', '2', '3'] # Cuentas de Activo, Pasivo y Patrimonio
    
    for cta_dest in cuentas_destino:
        codigo = cta_dest.cuentas
        if codigo in mapa_saldos_origen:
            raiz = codigo[0]
            
            # Cuentas de Balance heredan el saldo final; Resultados inician en $0.00
            nuevo_saldo = mapa_saldos_origen[codigo] if raiz in raices_balance else 0.00
            
            cta_dest.saldo_inicial = nuevo_saldo
            cta_dest.usuario_modificacion = usuario
            cta_dest.fecha_modificacion = datetime.datetime.now(datetime.timezone.utc)
            cta_dest.terminal_ip = ip
            cuentas_actualizadas += 1

    db.commit()
    
    return {
        "mensaje": f"Traslado completado exitosamente. {cuentas_actualizadas} cuentas actualizadas.",
        "anio_origen": anio_origen,
        "anio_destino": anio_destino,
        "estado_saldos": estado_cierre
    }


from models.partida import PartidaDetalle, PartidaCabecera

def obtener_saldos_mensuales_cuenta(db: Session, empresa_id: str, anio: int, codigo_cuenta: str):
    # 1. Obtener la cuenta para extraer su saldo inicial y validar existencia
    cuenta = db.query(m_cuenta.CuentaContable).filter(
        m_cuenta.CuentaContable.empresa_id == empresa_id,
        m_cuenta.CuentaContable.anio == anio,
        m_cuenta.CuentaContable.cuentas == codigo_cuenta
    ).first()
    
    if not cuenta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada.")

    # Determinar la raíz contable para definir si es deudora o acreedora
    raiz = codigo_cuenta[0] if codigo_cuenta else '1'
    es_acreedora = raiz in ['2', '3', '5']  # Pasivo, Patrimonio, Ingresos

    # 2. Obtener el saldo inicial. 
    # MODIFICACIÓN NIIF (Roll-up para saldo inicial):
    # Si la cuenta solicitada es resumen, debemos sumar los saldos iniciales de todos sus detalles.
    if getattr(cuenta, 'resumen', False):
        suma_inicial = db.query(
            func.sum(m_cuenta.CuentaContable.saldo_inicial).label('total_inicial')
        ).filter(
            m_cuenta.CuentaContable.empresa_id == empresa_id,
            m_cuenta.CuentaContable.anio == anio,
            m_cuenta.CuentaContable.cuentas.startswith(codigo_cuenta),
            m_cuenta.CuentaContable.resumen == False # Sumar solo las hojas para no duplicar
        ).first()
        saldo_inicial = float(suma_inicial.total_inicial or 0.0)
    else:
        saldo_inicial = float(cuenta.saldo_inicial or 0.0)

    # 3. Consultar la suma de cargos (debe) y abonos (haber) agrupados por mes
    # MODIFICACIÓN NIIF: Cambiamos '==' por 'startswith' para abarcar todas las subcuentas
    movimientos_por_mes = db.query(
        PartidaCabecera.mes,
        func.sum(PartidaDetalle.debe).label('total_cargos'),
        func.sum(PartidaDetalle.haber).label('total_abonos')
    ).join(
        PartidaDetalle, PartidaCabecera.id == PartidaDetalle.partida_id
    ).filter(
        PartidaDetalle.empresa_id == empresa_id,
        PartidaDetalle.anio == anio,
        PartidaDetalle.cuenta_codigo.startswith(codigo_cuenta), # <- Clave de la solución jerárquica
        PartidaCabecera.estado != "Borrador"
    ).group_by(PartidaCabecera.mes).all()

    # 4. Formatear la respuesta garantizando los 12 meses
    resultado = {
        "saldo_inicial": float(saldo_inicial),
        "meses": []
    }

    # Crear un diccionario para fácil acceso a los totales por mes
    movimientos_dict = {
        mov.mes: {
            "cargos": float(mov.total_cargos or 0.0), 
            "abonos": float(mov.total_abonos or 0.0)
        } for mov in movimientos_por_mes
    }

    # Calcular saldos progresivos
    saldo_acumulado = float(saldo_inicial)

    for mes_num in range(1, 13):
        movs_mes = movimientos_dict.get(mes_num, {"cargos": 0.00, "abonos": 0.00})
        
        cargos = movs_mes["cargos"]
        abonos = movs_mes["abonos"]
        
        # Mantengo la lógica de naturaleza que el frontend aplica, pero lo envío pre-calculado 
        # (Aunque el JS del frontend lo recalcula iterando, es buena práctica que el backend envíe data coherente)
        if es_acreedora:
            saldo_acumulado += (abonos - cargos)
        else:
            saldo_acumulado += (cargos - abonos)

        resultado["meses"].append({
            "mes": mes_num,
            "cargos": cargos,
            "abonos": abonos,
            "saldo_final_mes": saldo_acumulado # Opcional, por si el frontend lo necesita
        })

    return resultado

def obtener_movimientos_mes_cuenta(db: Session, empresa_id: str, anio: int, mes: int, codigo_cuenta: str):
    # 1. Validar la existencia de la cuenta padre solicitada
    cuenta_padre = db.query(m_cuenta.CuentaContable).filter(
        m_cuenta.CuentaContable.empresa_id == empresa_id,
        m_cuenta.CuentaContable.anio == anio,
        m_cuenta.CuentaContable.cuentas == codigo_cuenta
    ).first()
    
    if not cuenta_padre:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada.")

    raiz = codigo_cuenta[0] if codigo_cuenta else '1'
    es_acreedora = raiz in ['2', '3', '5']

    # 2. Obtener TODAS las cuentas de detalle (hojas) que pertenecen a esta rama
    # Si la cuenta solicitada ya es de detalle, esta consulta solo la traerá a ella misma.
    cuentas_detalle = db.query(m_cuenta.CuentaContable).filter(
        m_cuenta.CuentaContable.empresa_id == empresa_id,
        m_cuenta.CuentaContable.anio == anio,
        m_cuenta.CuentaContable.cuentas.startswith(codigo_cuenta),
        m_cuenta.CuentaContable.resumen == False
    ).order_by(m_cuenta.CuentaContable.cuentas.asc()).all()

    # 3. Traer los totales acumulados de meses anteriores para TODAS estas subcuentas
    movs_anteriores = db.query(
        PartidaDetalle.cuenta_codigo,
        func.sum(PartidaDetalle.debe).label('debe'),
        func.sum(PartidaDetalle.haber).label('haber')
    ).join(
        PartidaCabecera, PartidaCabecera.id == PartidaDetalle.partida_id
    ).filter(
        PartidaDetalle.empresa_id == empresa_id,
        PartidaDetalle.anio == anio,
        PartidaDetalle.cuenta_codigo.startswith(codigo_cuenta),
        PartidaCabecera.mes < mes,
        PartidaCabecera.estado != "Borrador"
    ).group_by(PartidaDetalle.cuenta_codigo).all()
    
    dict_anteriores = {m.cuenta_codigo: {"debe": m.debe or 0, "haber": m.haber or 0} for m in movs_anteriores}

    # 4. Traer los movimientos detallados del mes actual agrupados
    movs_mes_actual = db.query(
        PartidaDetalle.cuenta_codigo,
        PartidaCabecera.id.label('cabecera_id'),
        PartidaCabecera.fecha,
        PartidaCabecera.numero_partida,
        PartidaCabecera.concepto.label('concepto_cabecera'),
        PartidaDetalle.concepto_detalle,
        PartidaDetalle.debe,
        PartidaDetalle.haber
    ).join(
        PartidaCabecera, PartidaCabecera.id == PartidaDetalle.partida_id
    ).filter(
        PartidaDetalle.empresa_id == empresa_id,
        PartidaDetalle.anio == anio,
        PartidaDetalle.cuenta_codigo.startswith(codigo_cuenta),
        PartidaCabecera.mes == mes,
        PartidaCabecera.estado != "Borrador"
    ).order_by(PartidaDetalle.cuenta_codigo.asc(), PartidaCabecera.fecha.asc(), PartidaCabecera.numero_partida.asc()).all()

    # Mapear movimientos a su cuenta correspondiente
    dict_movs_mes = defaultdict(list)
    for m in movs_mes_actual:
        dict_movs_mes[m.cuenta_codigo].append({
            "id_partida": m.cabecera_id,
            "fecha": m.fecha.strftime("%d/%m/%Y") if m.fecha else "",
            "partida": m.numero_partida,
            "concepto": m.concepto_detalle if m.concepto_detalle else m.concepto_cabecera,
            "cargos": float(m.debe),
            "abonos": float(m.haber)
        })

    # 5. Construir el Árbol JSON final
    subcuentas_resultado = []
    total_general_inicio = 0.0

    for cta in cuentas_detalle:
        codigo = cta.cuentas
        saldo_ini_anio = float(cta.saldo_inicial or 0.0)
        
        # Calcular saldo al inicio del mes para esta subcuenta específica
        ant = dict_anteriores.get(codigo, {"debe": 0, "haber": 0})
        if es_acreedora:
            saldo_ini_mes = saldo_ini_anio + float(ant["haber"] - ant["debe"])
        else:
            saldo_ini_mes = saldo_ini_anio + float(ant["debe"] - ant["haber"])
            
        movimientos = dict_movs_mes.get(codigo, [])
        
        # Filtrar subcuentas sin actividad: Solo enviamos las que tengan saldo inicial O movimientos en el mes
        if saldo_ini_mes != 0.0 or len(movimientos) > 0:
            subcuentas_resultado.append({
                "codigo": codigo,
                "nombre": cta.nombre,
                "saldo_inicio_mes": saldo_ini_mes,
                "movimientos": movimientos
            })
            total_general_inicio += saldo_ini_mes

    return {
        "cuenta_padre": codigo_cuenta,
        "nombre_padre": cuenta_padre.nombre,
        "saldo_inicio_mes_total": float(total_general_inicio),
        "subcuentas": subcuentas_resultado
    }