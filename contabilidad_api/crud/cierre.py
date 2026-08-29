from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
from decimal import Decimal
from datetime import date
from typing import Dict, Any

from models.cuenta import CuentaContable
from models.partida import PartidaCabecera, PartidaDetalle
from models.periodo import EjercicioFiscal, ControlPeriodo
from models.configuracion import ConfiguracionContable
from models.manual import ManualContable

def _obtener_correlativo_partida(db: Session, empresa_id: str, anio: int, mes: int) -> int:
    """Obtiene el siguiente correlativo para número de partida en un mes específico."""
    max_num = db.query(func.max(PartidaCabecera.numero_partida)).filter(
        PartidaCabecera.empresa_id == empresa_id,
        PartidaCabecera.anio == anio,
        PartidaCabecera.mes == mes
    ).scalar()
    return (max_num or 0) + 1

def pre_cierre_validacion(db: Session, empresa_id: str, anio: int) -> dict:
    """
    Paso 1: Valida que la empresa esté lista para el cierre del ejercicio.
    """
    # 1. Verificar borradores pendientes
    borradores_objs = db.query(PartidaCabecera.id, PartidaCabecera.numero_partida).filter(
        PartidaCabecera.empresa_id == empresa_id,
        PartidaCabecera.anio == anio,
        PartidaCabecera.estado == 'Borrador'
    ).all()
    borradores_lista = [{"id": b[0], "numero_partida": b[1]} for b in borradores_objs]
    borradores_pendientes = len(borradores_lista) > 0

    # 2. Verificar si todos los meses están cerrados
    meses_abiertos_objs = db.query(ControlPeriodo.mes).filter(
        ControlPeriodo.empresa_id == empresa_id,
        ControlPeriodo.anio == anio,
        ControlPeriodo.mes_abierto == True
    ).all()
    meses_abiertos = [m[0] for m in meses_abiertos_objs] if meses_abiertos_objs else []

    # 3. Verificar cuadre global
    suma_debe = db.query(func.sum(PartidaDetalle.debe)).join(PartidaCabecera).filter(
        PartidaCabecera.empresa_id == empresa_id,
        PartidaCabecera.anio == anio,
        PartidaCabecera.estado.in_(['Impresa', 'Auditada', 'Mayorizada'])
    ).scalar() or Decimal('0.00')

    suma_haber = db.query(func.sum(PartidaDetalle.haber)).join(PartidaCabecera).filter(
        PartidaCabecera.empresa_id == empresa_id,
        PartidaCabecera.anio == anio,
        PartidaCabecera.estado.in_(['Impresa', 'Auditada', 'Mayorizada'])
    ).scalar() or Decimal('0.00')

    cuadre_global = abs(suma_debe - suma_haber) < Decimal('0.01')

    # 4. Verificar cierre previo
    cierre_previo = db.query(func.count(PartidaCabecera.id)).filter(
        PartidaCabecera.empresa_id == empresa_id,
        PartidaCabecera.anio == anio,
        PartidaCabecera.estado == 'Cierre'
    ).scalar() or 0
    cierre_previo_existe = cierre_previo > 0

    # 5. Calcular ingresos y gastos
    config = db.query(ConfiguracionContable).filter(ConfiguracionContable.empresa_id == empresa_id).first()
    if not config:
        # Auto-crear configuración por defecto para no bloquear al usuario
        config = ConfiguracionContable(
            empresa_id=empresa_id,
            prefijo_ingresos="5",
            prefijo_gastos="4",
            prefijo_liquidadora="6",
            cuenta_utilidad="310601",
            cuenta_utilidades_retenidas="310501",
            cuenta_perdidas_acumuladas="310602",
            porcentaje_reserva_legal="7",
            cuenta_reserva_legal="310401",
            tasa_isr="25",
            cuenta_isr_por_pagar="210301",
            cuenta_gasto_isr="420101",
            exencion_isr=False
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    total_ingresos = Decimal('0.00')
    total_gastos = Decimal('0.00')

    cuentas_ingresos = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.anio == anio,
        CuentaContable.cuentas.startswith(config.prefijo_ingresos),
        CuentaContable.resumen == False
    ).all()

    cuentas_gastos = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.anio == anio,
        CuentaContable.cuentas.startswith(config.prefijo_gastos),
        CuentaContable.resumen == False
    ).all()

    for cta in cuentas_ingresos:
        total_ingresos += (cta.saldo_inicial or Decimal('0.00'))
        mov_haber = db.query(func.sum(PartidaDetalle.haber - PartidaDetalle.debe)).join(PartidaCabecera).filter(
            PartidaCabecera.empresa_id == empresa_id,
            PartidaCabecera.anio == anio,
            PartidaCabecera.estado.in_(['Impresa', 'Auditada', 'Mayorizada']),
            PartidaDetalle.cuenta_codigo == cta.cuentas
        ).scalar() or Decimal('0.00')
        total_ingresos += mov_haber

    for cta in cuentas_gastos:
        total_gastos += (cta.saldo_inicial or Decimal('0.00'))
        mov_debe = db.query(func.sum(PartidaDetalle.debe - PartidaDetalle.haber)).join(PartidaCabecera).filter(
            PartidaCabecera.empresa_id == empresa_id,
            PartidaCabecera.anio == anio,
            PartidaCabecera.estado.in_(['Impresa', 'Auditada', 'Mayorizada']),
            PartidaDetalle.cuenta_codigo == cta.cuentas
        ).scalar() or Decimal('0.00')
        total_gastos += mov_debe

    utilidad_bruta = total_ingresos - total_gastos

    # Verificar si faltan cuentas clave de configuración
    config = db.query(ConfiguracionContable).filter(ConfiguracionContable.empresa_id == empresa_id).first()
    cuentas_faltantes = []
    if not config:
        config = ConfiguracionContable(
            empresa_id=empresa_id, prefijo_ingresos="5", prefijo_gastos="4", prefijo_liquidadora="6",
            cuenta_utilidad="310601", cuenta_utilidades_retenidas="310501", cuenta_perdidas_acumuladas="310602",
            porcentaje_reserva_legal="7", cuenta_reserva_legal="310401", tasa_isr="25", cuenta_isr_por_pagar="210301",
            cuenta_gasto_isr="420101", exencion_isr=False
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        
    cuentas_necesarias = [
        (config.cuenta_utilidad, "Resultado del Ejercicio"),
        (config.cuenta_reserva_legal, "Reserva Legal"),
        (config.cuenta_gasto_isr, "Gasto por Impuesto sobre la Renta"),
        (config.cuenta_isr_por_pagar, "Impuesto sobre la Renta por Pagar"),
        (config.cuenta_utilidades_retenidas, "Utilidades Retenidas"),
        (config.cuenta_perdidas_acumuladas, "Pérdidas Acumuladas")
    ]
    
    for cta_cod, nombre_cta in cuentas_necesarias:
        if cta_cod:
            existe = db.query(CuentaContable).filter(
                CuentaContable.empresa_id == empresa_id, CuentaContable.anio == anio, CuentaContable.cuentas == cta_cod
            ).first()
            if not existe:
                cuentas_faltantes.append({"codigo": cta_cod, "nombre": nombre_cta})

    total_partidas = db.query(func.count(PartidaCabecera.id)).filter(
        PartidaCabecera.empresa_id == empresa_id,
        PartidaCabecera.anio == anio
    ).scalar() or 0
    hay_movimientos = total_partidas > 0

    puede_cerrar = not borradores_pendientes and len(meses_abiertos) == 0 and cuadre_global and not cierre_previo_existe and len(cuentas_faltantes) == 0 and hay_movimientos

    return {
        "puede_cerrar": puede_cerrar,
        "borradores_pendientes": len(borradores_lista),
        "borradores_lista": borradores_lista,
        "meses_abiertos": meses_abiertos,
        "cuentas_faltantes": cuentas_faltantes,
        "hay_movimientos": hay_movimientos,
        "total_partidas": total_partidas,
        "cuadre_global": cuadre_global,
        "total_ingresos": float(total_ingresos),
        "total_gastos": float(total_gastos),
        "utilidad_bruta": float(utilidad_bruta),
        "cierre_previo_existe": cierre_previo_existe
    }

def _asegurar_cuenta_existe(db: Session, empresa_id: str, anio: int, cuenta_codigo: str, nombre: str):
    if not cuenta_codigo: return
    cuenta = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.anio == anio,
        CuentaContable.cuentas == cuenta_codigo
    ).first()
    
    if not cuenta:
        # Calcular padre
        ctadep = cuenta_codigo[:-2] if len(cuenta_codigo) >= 3 else (cuenta_codigo[:-1] if len(cuenta_codigo) > 1 else None)
        nivel = len(cuenta_codigo)
        
        # Crear padre primero (recursivo) para cumplir con la llave foránea
        if ctadep:
            _asegurar_cuenta_existe(db, empresa_id, anio, ctadep, f"Clasificación {ctadep}")
            
        nueva_cuenta = CuentaContable(
            empresa_id=empresa_id,
            anio=anio,
            cuentas=cuenta_codigo,
            nombre=nombre,
            ctadep=ctadep,
            nivel=nivel,
            resumen=(nivel < 6),  # Normalmente cuentas de 6+ son de detalle
            saldo_inicial=Decimal('0.00'),
            saldo_final=Decimal('0.00'),
            usuario_creacion="Sistema",
            terminal_ip="127.0.0.1"
        )
        db.add(nueva_cuenta)
        db.flush()

def generar_provisiones(db: Session, empresa_id: str, anio: int, usuario_id: str, calcular_reserva_legal: bool, calcular_isr: bool) -> dict:
    """
    Paso 2: Genera partidas de provisión para reserva legal e ISR.
    """
    config = db.query(ConfiguracionContable).filter(ConfiguracionContable.empresa_id == empresa_id).first()
    if not config:
        # Auto-crear configuración por defecto para no bloquear al usuario
        config = ConfiguracionContable(
            empresa_id=empresa_id,
            prefijo_ingresos="5",
            prefijo_gastos="4",
            prefijo_liquidadora="6",
            cuenta_utilidad="310601",
            cuenta_utilidades_retenidas="310501",
            cuenta_perdidas_acumuladas="310602",
            porcentaje_reserva_legal="7",
            cuenta_reserva_legal="310401",
            tasa_isr="25",
            cuenta_isr_por_pagar="210301",
            cuenta_gasto_isr="420101",
            exencion_isr=False
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    validacion = pre_cierre_validacion(db, empresa_id, anio)
    utilidad_bruta = Decimal(str(validacion["utilidad_bruta"]))

    if utilidad_bruta <= 0:
        return {"mensaje": "No hay utilidad para provisionar", "reserva_legal": 0.0, "isr": 0.0}

    reserva_legal_monto = Decimal('0.00')
    isr_monto = Decimal('0.00')
    fecha_cierre = date(anio, 12, 31)
    detalles_creados = []
    
    porcentaje_reserva_legal = Decimal(config.porcentaje_reserva_legal) if config.porcentaje_reserva_legal else Decimal('0')
    tasa_isr = Decimal(config.tasa_isr) if config.tasa_isr else Decimal('0')

    # Asegurar que las cuentas configuradas existan en el catálogo antes de usarlas
    _asegurar_cuenta_existe(db, empresa_id, anio, config.cuenta_utilidad, "Resultado del Ejercicio")
    _asegurar_cuenta_existe(db, empresa_id, anio, config.cuenta_reserva_legal, "Reserva Legal")
    _asegurar_cuenta_existe(db, empresa_id, anio, config.cuenta_gasto_isr, "Gasto por Impuesto sobre la Renta")
    _asegurar_cuenta_existe(db, empresa_id, anio, config.cuenta_isr_por_pagar, "Impuesto sobre la Renta por Pagar")
    _asegurar_cuenta_existe(db, empresa_id, anio, config.cuenta_utilidades_retenidas, "Utilidades Retenidas")
    _asegurar_cuenta_existe(db, empresa_id, anio, config.cuenta_perdidas_acumuladas, "Pérdidas Acumuladas")

    if calcular_reserva_legal and porcentaje_reserva_legal > 0:
        reserva_legal_monto = utilidad_bruta * (porcentaje_reserva_legal / Decimal('100.0'))
        if reserva_legal_monto > 0:
            num_partida = _obtener_correlativo_partida(db, empresa_id, anio, 12)
            partida_reserva = PartidaCabecera(
                empresa_id=empresa_id,
                anio=anio,
                mes=12,
                numero_partida=num_partida,
                fecha=fecha_cierre,
                concepto="Provisión de Reserva Legal del Ejercicio",
                estado='Mayorizada',
                usuario_creacion=usuario_id,
                terminal_ip="127.0.0.1"
            )
            db.add(partida_reserva)
            db.flush()
            
            db.add(PartidaDetalle(
                partida_id=partida_reserva.id,
                empresa_id=empresa_id,
                anio=anio,
                cuenta_codigo=config.cuenta_utilidad, 
                debe=reserva_legal_monto,
                haber=Decimal('0.00'),
                concepto_detalle="Provisión de Reserva Legal"
            ))
            db.add(PartidaDetalle(
                partida_id=partida_reserva.id,
                empresa_id=empresa_id,
                anio=anio,
                cuenta_codigo=config.cuenta_reserva_legal,
                debe=Decimal('0.00'),
                haber=reserva_legal_monto,
                concepto_detalle="Provisión de Reserva Legal"
            ))
            detalles_creados.append("Reserva Legal")

    if calcular_isr and not config.exencion_isr and tasa_isr > 0:
        base_isr = utilidad_bruta - reserva_legal_monto
        isr_monto = base_isr * (tasa_isr / Decimal('100.0'))
        if isr_monto > 0:
            num_partida = _obtener_correlativo_partida(db, empresa_id, anio, 12)
            partida_isr = PartidaCabecera(
                empresa_id=empresa_id,
                anio=anio,
                mes=12,
                numero_partida=num_partida,
                fecha=fecha_cierre,
                concepto="Provisión de Impuesto sobre la Renta del Ejercicio",
                estado='Mayorizada',
                usuario_creacion=usuario_id,
                terminal_ip="127.0.0.1"
            )
            db.add(partida_isr)
            db.flush()

            db.add(PartidaDetalle(
                partida_id=partida_isr.id,
                empresa_id=empresa_id,
                anio=anio,
                cuenta_codigo=config.cuenta_gasto_isr,
                debe=isr_monto,
                haber=Decimal('0.00'),
                concepto_detalle="Gasto por ISR"
            ))
            db.add(PartidaDetalle(
                partida_id=partida_isr.id,
                empresa_id=empresa_id,
                anio=anio,
                cuenta_codigo=config.cuenta_isr_por_pagar,
                debe=Decimal('0.00'),
                haber=isr_monto,
                concepto_detalle="ISR por pagar"
            ))
            detalles_creados.append("ISR")

    return {
        "provisiones_creadas": detalles_creados,
        "reserva_legal": float(reserva_legal_monto),
        "isr": float(isr_monto)
    }

def ejecutar_partida_liquidacion(db: Session, empresa_id: str, anio: int, usuario_id: str) -> dict:
    """
    Paso 3: Ejecuta la partida de liquidación de cuentas de resultados.
    """
    config = db.query(ConfiguracionContable).filter(ConfiguracionContable.empresa_id == empresa_id).first()
    if not config:
        # Auto-crear configuración por defecto para no bloquear al usuario
        config = ConfiguracionContable(
            empresa_id=empresa_id,
            prefijo_ingresos="5",
            prefijo_gastos="4",
            prefijo_liquidadora="6",
            cuenta_utilidad="310601",
            cuenta_utilidades_retenidas="310501",
            cuenta_perdidas_acumuladas="310602",
            porcentaje_reserva_legal="7",
            cuenta_reserva_legal="310401",
            tasa_isr="25",
            cuenta_isr_por_pagar="210301",
            cuenta_gasto_isr="420101",
            exencion_isr=False
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    cuentas_resultados = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.anio == anio,
        CuentaContable.resumen == False,
        or_(
            CuentaContable.cuentas.startswith(config.prefijo_ingresos),
            CuentaContable.cuentas.startswith(config.prefijo_gastos)
        )
    ).all()

    partida_cierre = PartidaCabecera(
        empresa_id=empresa_id,
        anio=anio,
        mes=12,
        numero_partida=9999,
        fecha=date(anio, 12, 31),
        concepto="Liquidación de Cuentas de Resultados y Determinación de Utilidad/Pérdida",
        estado='Cierre',
        usuario_creacion=usuario_id,
        terminal_ip="127.0.0.1"
    )
    db.add(partida_cierre)
    db.flush()

    resultado_ejercicio = Decimal('0.00')

    for cta in cuentas_resultados:
        saldo_inicial = cta.saldo_inicial or Decimal('0.00')
        movs = db.query(
            func.sum(PartidaDetalle.debe).label('debe'),
            func.sum(PartidaDetalle.haber).label('haber')
        ).join(PartidaCabecera).filter(
            PartidaCabecera.empresa_id == empresa_id,
            PartidaCabecera.anio == anio,
            PartidaCabecera.estado.in_(['Impresa', 'Auditada', 'Mayorizada']),
            PartidaDetalle.cuenta_codigo == cta.cuentas
        ).first()

        debe = movs.debe or Decimal('0.00')
        haber = movs.haber or Decimal('0.00')

        if cta.cuentas.startswith(config.prefijo_ingresos):
            saldo_final = saldo_inicial + haber - debe
            if saldo_final != Decimal('0.00'):
                db.add(PartidaDetalle(
                    partida_id=partida_cierre.id,
                    empresa_id=empresa_id,
                    anio=anio,
                    cuenta_codigo=cta.cuentas,
                    debe=saldo_final,
                    haber=Decimal('0.00'),
                    concepto_detalle="Liquidación cuenta de ingresos"
                ))
                resultado_ejercicio += saldo_final
        elif cta.cuentas.startswith(config.prefijo_gastos):
            saldo_final = saldo_inicial + debe - haber
            if saldo_final != Decimal('0.00'):
                db.add(PartidaDetalle(
                    partida_id=partida_cierre.id,
                    empresa_id=empresa_id,
                    anio=anio,
                    cuenta_codigo=cta.cuentas,
                    debe=Decimal('0.00'),
                    haber=saldo_final,
                    concepto_detalle="Liquidación cuenta de gastos"
                ))
                resultado_ejercicio -= saldo_final

    if resultado_ejercicio > Decimal('0.00'):
        db.add(PartidaDetalle(
            partida_id=partida_cierre.id,
            empresa_id=empresa_id,
            anio=anio,
            cuenta_codigo=config.cuenta_utilidad,
            debe=Decimal('0.00'),
            haber=resultado_ejercicio,
            concepto_detalle="Utilidad del Ejercicio"
        ))
    elif resultado_ejercicio < Decimal('0.00'):
        db.add(PartidaDetalle(
            partida_id=partida_cierre.id,
            empresa_id=empresa_id,
            anio=anio,
            cuenta_codigo=config.cuenta_utilidad,
            debe=abs(resultado_ejercicio),
            haber=Decimal('0.00'),
            concepto_detalle="Pérdida del Ejercicio"
        ))

    return {
        "partida_id": partida_cierre.id,
        "partida_liquidacion_numero": partida_cierre.numero_partida,
        "resultado_ejercicio": float(resultado_ejercicio)
    }

def sellar_ejercicio(db: Session, empresa_id: str, anio: int) -> dict:
    """
    Paso 4: Sella el ejercicio fiscal actual.
    """
    ejercicio = db.query(EjercicioFiscal).filter(
        EjercicioFiscal.empresa_id == empresa_id,
        EjercicioFiscal.anio == anio
    ).first()
    if ejercicio:
        ejercicio.estado_cerrado = True

    db.query(ControlPeriodo).filter(
        ControlPeriodo.empresa_id == empresa_id,
        ControlPeriodo.anio == anio
    ).update({"anio_abierto": False}, synchronize_session=False)

    return {"mensaje": f"Ejercicio {anio} sellado exitosamente."}

def generar_apertura_siguiente_anio(db: Session, empresa_id: str, anio: int, anio_nuevo: int, usuario_id: str) -> dict:
    """
    Paso 5: Prepara la contabilidad del siguiente año.
    """
    config = db.query(ConfiguracionContable).filter(ConfiguracionContable.empresa_id == empresa_id).first()
    if not config:
        # Auto-crear configuración por defecto para no bloquear al usuario
        config = ConfiguracionContable(
            empresa_id=empresa_id,
            prefijo_ingresos="5",
            prefijo_gastos="4",
            prefijo_liquidadora="6",
            cuenta_utilidad="310601",
            cuenta_utilidades_retenidas="310501",
            cuenta_perdidas_acumuladas="310602",
            porcentaje_reserva_legal="7",
            cuenta_reserva_legal="310401",
            tasa_isr="25",
            cuenta_isr_por_pagar="210301",
            cuenta_gasto_isr="420101",
            exencion_isr=False
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    nuevo_ejercicio = EjercicioFiscal(
        empresa_id=empresa_id,
        anio=anio_nuevo,
        fecha_inicio=date(anio_nuevo, 1, 1),
        fecha_fin=date(anio_nuevo, 12, 31),
        estado_cerrado=False,
        usuario_creacion=usuario_id
    )
    db.add(nuevo_ejercicio)
    
    max_id_result = db.execute(text("SELECT MAX(id) FROM control_periodos")).scalar()
    max_id = max_id_result if max_id_result is not None else 0

    for m in range(1, 13):
        max_id += 1
        db.execute(
            text("""
                INSERT INTO control_periodos (id, empresa_id, anio, mes, mes_abierto, anio_abierto, total_partidas)
                VALUES (:id, :empresa_id, :anio, :mes, :mes_abierto, :anio_abierto, :total_partidas)
            """),
            {
                "id": max_id,
                "empresa_id": empresa_id,
                "anio": anio_nuevo,
                "mes": m,
                "mes_abierto": True,
                "anio_abierto": True,
                "total_partidas": 0
            }
        )

    # Fix Postgres sequence for manual_contable in case of desync
    try:
        db.execute(text("SELECT setval(pg_get_serial_sequence('manual_contable', 'id'), COALESCE(MAX(id), 1)) FROM manual_contable;"))
        db.flush()
    except Exception as e:
        print("Sequence fix skipped or failed", e)

    manuales_viejos = db.query(ManualContable).filter(
        ManualContable.empresa_id == empresa_id,
        ManualContable.anio == anio
    ).all()
    for man in manuales_viejos:
        nuevo_man = ManualContable(
            empresa_id=empresa_id,
            anio=anio_nuevo,
            cuenta_codigo=man.cuenta_codigo,
            descripcion_rubro=man.descripcion_rubro,
            se_carga_por=man.se_carga_por,
            se_abona_por=man.se_abona_por,
            significado_saldo=man.significado_saldo,
            base_medicion=man.base_medicion,
            usuario_creacion=usuario_id,
            terminal_ip="127.0.0.1"
        )
        db.add(nuevo_man)

    cuentas_viejas = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.anio == anio
    ).all()

    cuentas_creadas = 0
    saldos_apertura = []

    for cta in cuentas_viejas:
        saldo_inicial_nuevo = Decimal('0.00')

        if cta.cuentas.startswith(('1', '2', '3')):
            movs = db.query(
                func.sum(PartidaDetalle.debe).label('debe'),
                func.sum(PartidaDetalle.haber).label('haber')
            ).join(PartidaCabecera).filter(
                PartidaCabecera.empresa_id == empresa_id,
                PartidaCabecera.anio == anio,
                PartidaCabecera.estado.in_(['Impresa', 'Auditada', 'Mayorizada', 'Cierre']),
                PartidaDetalle.cuenta_codigo == cta.cuentas
            ).first()

            debe = movs.debe or Decimal('0.00')
            haber = movs.haber or Decimal('0.00')
            saldo_inicial_viejo = cta.saldo_inicial or Decimal('0.00')

            if cta.cuentas == config.cuenta_utilidad:
                pass # Utilidad traspasada a retenidas/acumuladas
            elif cta.cuentas == config.cuenta_utilidades_retenidas:
                movs_util = db.query(
                    func.sum(PartidaDetalle.debe).label('debe'),
                    func.sum(PartidaDetalle.haber).label('haber')
                ).join(PartidaCabecera).filter(
                    PartidaCabecera.empresa_id == empresa_id,
                    PartidaCabecera.anio == anio,
                    PartidaCabecera.estado.in_(['Impresa', 'Auditada', 'Mayorizada', 'Cierre']),
                    PartidaDetalle.cuenta_codigo == config.cuenta_utilidad
                ).first()
                debe_u = movs_util.debe or Decimal('0.00')
                haber_u = movs_util.haber or Decimal('0.00')
                cta_util_vieja = db.query(CuentaContable).filter_by(empresa_id=empresa_id, anio=anio, cuentas=config.cuenta_utilidad).first()
                s_i_util = cta_util_vieja.saldo_inicial if cta_util_vieja else Decimal('0.00')
                resultado = s_i_util + haber_u - debe_u

                saldo_inicial_nuevo = saldo_inicial_viejo + haber - debe
                if resultado > 0:
                    saldo_inicial_nuevo += resultado
                elif resultado < 0 and config.cuenta_perdidas_acumuladas == cta.cuentas:
                    saldo_inicial_nuevo += abs(resultado)
            elif cta.cuentas == config.cuenta_perdidas_acumuladas:
                saldo_inicial_nuevo = saldo_inicial_viejo + debe - haber
                
                movs_util = db.query(
                    func.sum(PartidaDetalle.debe).label('debe'),
                    func.sum(PartidaDetalle.haber).label('haber')
                ).join(PartidaCabecera).filter(
                    PartidaCabecera.empresa_id == empresa_id,
                    PartidaCabecera.anio == anio,
                    PartidaCabecera.estado.in_(['Impresa', 'Auditada', 'Mayorizada', 'Cierre']),
                    PartidaDetalle.cuenta_codigo == config.cuenta_utilidad
                ).first()
                debe_u = movs_util.debe or Decimal('0.00')
                haber_u = movs_util.haber or Decimal('0.00')
                cta_util_vieja = db.query(CuentaContable).filter_by(empresa_id=empresa_id, anio=anio, cuentas=config.cuenta_utilidad).first()
                s_i_util = cta_util_vieja.saldo_inicial if cta_util_vieja else Decimal('0.00')
                resultado = s_i_util + haber_u - debe_u
                
                if resultado < 0:
                     saldo_inicial_nuevo += abs(resultado)
                     
            elif cta.cuentas.startswith('1'):
                saldo_inicial_nuevo = saldo_inicial_viejo + debe - haber
            elif cta.cuentas.startswith(('2', '3')):
                saldo_inicial_nuevo = saldo_inicial_viejo + haber - debe

        nueva_cta = CuentaContable(
            empresa_id=empresa_id,
            anio=anio_nuevo,
            cuentas=cta.cuentas,
            nombre=cta.nombre,
            ctadep=cta.ctadep,
            nivel=cta.nivel,
            resumen=cta.resumen,
            saldo_inicial=saldo_inicial_nuevo,
            saldo_final=saldo_inicial_nuevo,
            usuario_creacion=usuario_id,
            terminal_ip="127.0.0.1"
        )
        db.add(nueva_cta)
        cuentas_creadas += 1

        if not cta.resumen and saldo_inicial_nuevo != Decimal('0.00') and cta.cuentas.startswith(('1', '2', '3')):
            saldos_apertura.append({"cuenta": cta.cuentas, "saldo": saldo_inicial_nuevo, "tipo": cta.cuentas[0]})

    db.flush()

    if saldos_apertura:
        partida_apertura = PartidaCabecera(
            empresa_id=empresa_id,
            anio=anio_nuevo,
            mes=1,
            numero_partida=1,
            fecha=date(anio_nuevo, 1, 1),
            concepto="Partida de Apertura del Ejercicio",
            estado='Mayorizada',
            usuario_creacion=usuario_id,
            terminal_ip="127.0.0.1"
        )
        db.add(partida_apertura)
        db.flush()

        for sa in saldos_apertura:
            debe = Decimal('0.00')
            haber = Decimal('0.00')
            if sa["tipo"] == '1':
                if sa["saldo"] > 0:
                    debe = sa["saldo"]
                else:
                    haber = abs(sa["saldo"])
            elif sa["tipo"] in ('2', '3'):
                if sa["saldo"] > 0:
                    haber = sa["saldo"]
                else:
                    debe = abs(sa["saldo"])

            if debe > 0 or haber > 0:
                db.add(PartidaDetalle(
                    partida_id=partida_apertura.id,
                    empresa_id=empresa_id,
                    anio=anio_nuevo,
                    cuenta_codigo=sa["cuenta"],
                    debe=debe,
                    haber=haber,
                    concepto_detalle="Saldo de apertura"
                ))

    return {
        "ejercicio_creado": anio_nuevo,
        "cuentas_clonadas": cuentas_creadas,
        "partida_apertura_numero": 1 if saldos_apertura else None,
        "partida_apertura_generada": len(saldos_apertura) > 0
    }

def ejecutar_cierre_completo(db: Session, empresa_id: str, anio: int, anio_nuevo: int, usuario_id: str, calcular_reserva_legal: bool, calcular_isr: bool) -> dict:
    """
    Ejecuta el proceso completo de cierre fiscal en una sola transacción.
    """
    try:
        val = pre_cierre_validacion(db, empresa_id, anio)
        if not val["puede_cerrar"]:
            raise ValueError(f"No se cumplen las condiciones para cerrar: {val}")

        prov = generar_provisiones(db, empresa_id, anio, usuario_id, calcular_reserva_legal, calcular_isr)
        liq = ejecutar_partida_liquidacion(db, empresa_id, anio, usuario_id)
        sello = sellar_ejercicio(db, empresa_id, anio)
        aper = generar_apertura_siguiente_anio(db, empresa_id, anio, anio_nuevo, usuario_id)

        db.commit()

        return {
            "exito": True,
            "validacion": val,
            "provisiones": prov,
            "liquidacion": liq,
            "sello": sello,
            "apertura": aper,
            "partida_liquidacion_numero": liq.get("partida_liquidacion_numero"),
            "partida_apertura_numero": aper.get("partida_apertura_numero"),
            "resultado_ejercicio": liq.get("resultado_ejercicio")
        }
    except Exception as e:
        db.rollback()
        raise e