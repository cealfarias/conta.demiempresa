import uuid
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.partida import PartidaCabecera, PartidaDetalle
from models.cuenta import CuentaContable
from models.configuracion import ConfiguracionContable

def ejecutar_cierre_contable(
    db: Session, 
    empresa_id: str, 
    anio: int, 
    cuenta_liquidadora_codigo: str, 
    usuario_id: str
):
    # 1. Validar regla de negocio: Bloqueo por partidas en Borrador
    borradores = db.query(PartidaCabecera).filter(
        PartidaCabecera.empresa_id == empresa_id,
        PartidaCabecera.anio == anio,
        PartidaCabecera.estado == "Borrador"
    ).count()

    if borradores > 0:
        raise ValueError(f"Existen {borradores} partidas en estado 'Borrador'. Debe mayorizarlas o eliminarlas antes de proceder al cierre.")

    # 2. Validar que la partida de cierre no exista previamente para este año
    cierre_existente = db.query(PartidaCabecera).filter(
        PartidaCabecera.empresa_id == empresa_id,
        PartidaCabecera.anio == anio,
        PartidaCabecera.estado == "Cierre"
    ).first()

    if cierre_existente:
        raise ValueError(f"El ejercicio {anio} ya posee una partida de cierre ejecutada.")

    # 3. Leer Configuración Contable Dinámica
    config = db.query(ConfiguracionContable).filter(
        ConfiguracionContable.empresa_id == empresa_id
    ).first()
    
    prefijo_ingresos = config.prefijo_ingresos if config else '5'
    prefijo_gastos = config.prefijo_gastos if config else '4'
    prefijo_liq_config = config.prefijo_liquidadora if config else '6'

    # 4. Validar integridad de la cuenta liquidadora enviada por el usuario
    if not cuenta_liquidadora_codigo.startswith(prefijo_liq_config):
        raise ValueError(f"El código de la cuenta liquidadora debe iniciar con el dígito configurado ({prefijo_liq_config}).")

    cuenta_liq = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.cuentas == cuenta_liquidadora_codigo,
        CuentaContable.anio == anio,
        CuentaContable.resumen == False
    ).first()

    if not cuenta_liq:
        raise ValueError(f"La cuenta {cuenta_liquidadora_codigo} no existe en el catálogo {anio} o no es de detalle.")

    # 5. Extraer saldos acumulados de Cuentas de Resultado
    cuentas_resultado = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.anio == anio,
        CuentaContable.resumen == False,
        (CuentaContable.cuentas.like(f'{prefijo_ingresos}%') | CuentaContable.cuentas.like(f'{prefijo_gastos}%'))
    ).all()

    movimientos = db.query(
        PartidaDetalle.cuenta_codigo,
        func.sum(PartidaDetalle.debe).label("total_debe"),
        func.sum(PartidaDetalle.haber).label("total_haber")
    ).join(
        PartidaCabecera, PartidaCabecera.id == PartidaDetalle.partida_id
    ).filter(
        PartidaDetalle.empresa_id == empresa_id,
        PartidaDetalle.anio == anio,
        PartidaCabecera.estado != "Borrador",
        (PartidaDetalle.cuenta_codigo.like(f'{prefijo_ingresos}%') | PartidaDetalle.cuenta_codigo.like(f'{prefijo_gastos}%'))
    ).group_by(PartidaDetalle.cuenta_codigo).all()

    dict_movimientos = {
        mov.cuenta_codigo: {
            "debe": float(mov.total_debe or 0), 
            "haber": float(mov.total_haber or 0)
        } for mov in movimientos
    }

    # 6. Crear la Cabecera de la Partida de Cierre
    id_partida = str(uuid.uuid4())
    partida_cierre = PartidaCabecera(
        id=id_partida,
        empresa_id=empresa_id,
        anio=anio,
        mes=12,
        fecha=date(anio, 12, 31),
        tipo_partida="Diario",
        numero_partida=9999, # Numeración especial de cierre
        concepto=f"Partida de Liquidación de Cuentas de Resultado - Ejercicio {anio}",
        estado="Cierre", # Estado inmutable
        usuario_id=usuario_id
    )
    db.add(partida_cierre)

    total_utilidad = 0.0
    detalles_a_insertar = []

    # 7. Construir líneas de detalle para dejar en CERO las cuentas
    for cta in cuentas_resultado:
        codigo = cta.cuentas
        debe_acumulado = dict_movimientos.get(codigo, {}).get("debe", 0.0)
        haber_acumulado = dict_movimientos.get(codigo, {}).get("haber", 0.0)
        
        if debe_acumulado == 0.0 and haber_acumulado == 0.0:
            continue

        if codigo.startswith(prefijo_ingresos):
            saldo = haber_acumulado - debe_acumulado
            if saldo > 0:
                # Ingreso tiene saldo acreedor. Para saldarlo, cargamos (Debe)
                detalles_a_insertar.append(PartidaDetalle(
                    id=str(uuid.uuid4()), partida_id=id_partida, empresa_id=empresa_id, anio=anio,
                    cuenta_codigo=codigo, concepto="Liquidación de Ingresos",
                    debe=saldo, haber=0.0
                ))
                total_utilidad += saldo
            elif saldo < 0:
                # Caso atípico: Ingreso con saldo deudor
                detalles_a_insertar.append(PartidaDetalle(
                    id=str(uuid.uuid4()), partida_id=id_partida, empresa_id=empresa_id, anio=anio,
                    cuenta_codigo=codigo, concepto="Liquidación de Ingresos",
                    debe=0.0, haber=abs(saldo)
                ))
                total_utilidad += saldo

        elif codigo.startswith(prefijo_gastos):
            saldo = debe_acumulado - haber_acumulado
            if saldo > 0:
                # Gasto tiene saldo deudor. Para saldarlo, abonamos (Haber)
                detalles_a_insertar.append(PartidaDetalle(
                    id=str(uuid.uuid4()), partida_id=id_partida, empresa_id=empresa_id, anio=anio,
                    cuenta_codigo=codigo, concepto="Liquidación de Costos/Gastos",
                    debe=0.0, haber=saldo
                ))
                total_utilidad -= saldo
            elif saldo < 0:
                # Caso atípico: Gasto con saldo acreedor
                detalles_a_insertar.append(PartidaDetalle(
                    id=str(uuid.uuid4()), partida_id=id_partida, empresa_id=empresa_id, anio=anio,
                    cuenta_codigo=codigo, concepto="Liquidación de Costos/Gastos",
                    debe=abs(saldo), haber=0.0
                ))
                total_utilidad -= saldo

    # 8. Inyectar la contrapartida (Utilidad o Pérdida) a la cuenta Liquidadora
    if total_utilidad > 0:
        # Utilidad: La liquidadora se abona (Haber)
        detalles_a_insertar.append(PartidaDetalle(
            id=str(uuid.uuid4()), partida_id=id_partida, empresa_id=empresa_id, anio=anio,
            cuenta_codigo=cuenta_liquidadora_codigo, concepto="Reconocimiento de Utilidad del Ejercicio",
            debe=0.0, haber=total_utilidad
        ))
    elif total_utilidad < 0:
        # Pérdida: La liquidadora se carga (Debe)
        detalles_a_insertar.append(PartidaDetalle(
            id=str(uuid.uuid4()), partida_id=id_partida, empresa_id=empresa_id, anio=anio,
            cuenta_codigo=cuenta_liquidadora_codigo, concepto="Reconocimiento de Pérdida del Ejercicio",
            debe=abs(total_utilidad), haber=0.0
        ))

    # Insertar todos los detalles en bloque
    db.bulk_save_objects(detalles_a_insertar)
    db.commit()

    return {
        "mensaje": "Cierre contable ejecutado con éxito",
        "partida_id": id_partida,
        "resultado_ejercicio": total_utilidad
    }