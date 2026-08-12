import random
import calendar
import datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from config.database import SessionLocal 
from sqlalchemy import func

from models.cuenta import CuentaContable
from models.partida import PartidaCabecera, PartidaDetalle

def generar_operaciones_mensuales(db: Session, empresa_id: str = "CANTARES", anio: int = 2026):
    usuario_prueba = "admin"
    ip_terminal = "127.0.0.1"

    print(f"ADVERTENCIA: Eliminando todas las partidas existentes para {empresa_id} en el año {anio}...")
    
    # 1. ELIMINAR PARTIDAS EXISTENTES EN CASCADA
    db.query(PartidaDetalle).filter(
        PartidaDetalle.empresa_id == empresa_id,
        PartidaDetalle.anio == anio
    ).delete(synchronize_session=False)
    
    db.query(PartidaCabecera).filter(
        PartidaCabecera.empresa_id == empresa_id,
        PartidaCabecera.anio == anio
    ).delete(synchronize_session=False)
    
    db.commit()
    print("Partidas anteriores eliminadas. Procediendo a generar nuevas operaciones estructuradas...")

    # 2. EXTRAER CATÁLOGO DE DETALLE
    cuentas_db = db.query(CuentaContable).filter_by(
        empresa_id=empresa_id, 
        anio=anio, 
        resumen=False
    ).all()

    if not cuentas_db:
        print(f"Error: No se encontraron cuentas de detalle para {empresa_id} en {anio}.")
        return

    todas_cuentas = [c.cuentas for c in cuentas_db]
    activos = [c.cuentas for c in cuentas_db if c.cuentas.startswith("1")] or todas_cuentas
    pasivos = [c.cuentas for c in cuentas_db if c.cuentas.startswith("2")] or todas_cuentas
    patrimonio = [c.cuentas for c in cuentas_db if c.cuentas.startswith("3")] or todas_cuentas
    gastos = [c.cuentas for c in cuentas_db if c.cuentas.startswith("4")] or todas_cuentas
    ingresos = [c.cuentas for c in cuentas_db if c.cuentas.startswith("5")] or todas_cuentas

    # Asignación de cuentas ancla para mantener saldos positivos matemáticamente
    cta_banco = activos[0] 
    cta_depreciacion_acumulada = activos[-1] if len(activos) > 1 else activos[0]
    cta_proveedor = pasivos[0]
    cta_capital = patrimonio[0]

    correlativo = 1

    print(f"Generando partidas para {empresa_id} - Año {anio} bajo principios NIIF...")
    
    # 3. GENERAR PARTIDAS MENSUALES CONTROLADAS
    for mes in range(1, 13):
        _, max_dias = calendar.monthrange(anio, mes)
        operaciones_mes = []

        # OPERACIÓN CERO: Aporte inicial de capital (Solo en Enero) para blindar Activo y Patrimonio
        if mes == 1:
            operaciones_mes.append({
                "concepto": "Aporte de capital inicial",
                "debe": cta_banco,
                "haber": cta_capital,
                "monto": Decimal('1000000.00')
            })

        # CÁLCULO DE ESTRUCTURA DE COSTOS Y RENTABILIDAD (Regla del 30%)
        gasto_admin = Decimal(random.randint(5000, 15000))
        gasto_ventas = Decimal(random.randint(5000, 15000))
        depreciacion = Decimal(random.randint(1000, 5000))
        
        total_gastos = gasto_admin + gasto_ventas + depreciacion
        
        # Los ingresos son estrictamente un 30% mayores a los costos de operación totales
        ventas_mes = total_gastos * Decimal('1.30')

        # CÁLCULO DE PASIVOS (Compramos X, pero solo pagamos el 60% para que el Pasivo quede positivo)
        compra_credito = Decimal(random.randint(10000, 30000))
        pago_proveedor = compra_credito * Decimal('0.60')

        # ARMAR TRANSACCIONES DEL MES
        operaciones_mes.extend([
            {"concepto": "Ventas mensuales de mercaderia", "debe": cta_banco, "haber": random.choice(ingresos), "monto": ventas_mes},
            {"concepto": "Gastos de administracion", "debe": random.choice(gastos), "haber": cta_banco, "monto": gasto_admin},
            {"concepto": "Gastos de sala de ventas", "debe": random.choice(gastos), "haber": cta_banco, "monto": gasto_ventas},
            # La depreciación abona a un activo distinto al banco. Al solo recibir abonos, se volverá negativa.
            {"concepto": "Depreciacion de activos fijos", "debe": random.choice(gastos), "haber": cta_depreciacion_acumulada, "monto": depreciacion},
            {"concepto": "Compra de inventario al credito", "debe": random.choice(activos), "haber": cta_proveedor, "monto": compra_credito},
            {"concepto": "Abono a proveedores", "debe": cta_proveedor, "haber": cta_banco, "monto": pago_proveedor}
        ])

        # INSERTAR EN BASE DE DATOS
        for op in operaciones_mes:
            dia = random.randint(1, max_dias)
            fecha_partida = datetime.date(anio, mes, dia)

            cabecera = PartidaCabecera(
                empresa_id=empresa_id,
                anio=anio,
                mes=mes,
                numero_partida=correlativo,
                fecha=fecha_partida,
                concepto=f"{op['concepto']} - Mes {mes}",
                estado="Mayorizada",
                usuario_creacion=usuario_prueba,
                terminal_ip=ip_terminal
            )

            detalle_debe = PartidaDetalle(
                empresa_id=empresa_id,
                anio=anio,
                cuenta_codigo=op["debe"],
                debe=op["monto"],
                haber=Decimal('0.00'),
                concepto_detalle=f"Cargo por {op['concepto'].lower()}"
            )

            detalle_haber = PartidaDetalle(
                empresa_id=empresa_id,
                anio=anio,
                cuenta_codigo=op["haber"],
                debe=Decimal('0.00'),
                haber=op["monto"],
                concepto_detalle=f"Abono por {op['concepto'].lower()}"
            )

            cabecera.detalles.extend([detalle_debe, detalle_haber])
            db.add(cabecera)
            correlativo += 1

        # Reiniciar el correlativo para el siguiente mes
        correlativo = 1

    # 4. GUARDAR EN BASE DE DATOS
    try:
        db.commit()
        print("¡Proceso matemático finalizado! Estados financieros blindados generados exitosamente.")
    except Exception as e:
        db.rollback()
        print(f"Ocurrió un error al guardar las partidas: {e}")

if __name__ == "__main__":
    db_session = SessionLocal()
    generar_operaciones_mensuales(db_session)
    db_session.close()