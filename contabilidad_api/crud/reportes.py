from sqlalchemy.orm import Session
from sqlalchemy import func
from models.cuenta import CuentaContable
from models.partida import PartidaCabecera, PartidaDetalle
from models.configuracion import ConfiguracionContable
from models.flujo_efectivo import MapeoFlujoEfectivo

def _obtener_nivel_cuenta(cta):
    """
    Helper robusto: Intenta extraer el nivel de la base de datos.
    Si la columna 'nivel' no existe, lo infiere lógicamente por la longitud NIIF.
    """
    if hasattr(cta, 'nivel') and cta.nivel is not None:
        return cta.nivel
        
    l = len(cta.cuentas)
    if l == 1: return 1
    if l == 2: return 2
    if l in (3, 4): return 3  # Cuentas de Mayor
    if l in (5, 6): return 4  # Sub Cuentas
    return 5

# MODIFICACIÓN NIIF: Se agregó el parámetro "modo" para controlar mensual vs acumulado
def obtener_estado_resultados(db: Session, empresa_id: str, anio: int, mes: int, nivel: int = 3, modo: str = "acumulado"):
    config = db.query(ConfiguracionContable).filter(
        ConfiguracionContable.empresa_id == empresa_id
    ).first()

    prefijo_ingresos = config.prefijo_ingresos if config else '5'
    prefijo_gastos = config.prefijo_gastos if config else '4'
    exencion_isr = config.exencion_isr if config and hasattr(config, 'exencion_isr') else False

    cuentas = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.anio == anio,
        (CuentaContable.cuentas.like(f'{prefijo_ingresos}%') | CuentaContable.cuentas.like(f'{prefijo_gastos}%'))
    ).all()

    # Construcción de la consulta base para los movimientos
    query_movimientos = db.query(
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
    )

    # Inyección de la condición matemática mensual vs acumulado
    if modo == "mensual":
        query_movimientos = query_movimientos.filter(PartidaCabecera.mes == mes)
    else:
        query_movimientos = query_movimientos.filter(PartidaCabecera.mes <= mes)

    movimientos = query_movimientos.group_by(PartidaDetalle.cuenta_codigo).all()

    dict_movimientos = {
        mov.cuenta_codigo: {
            "debe": float(mov.total_debe or 0), 
            "haber": float(mov.total_haber or 0)
        } for mov in movimientos
    }

    saldos_acumulados = { c.cuentas: 0.0 for c in cuentas }
    info_cuentas = { c.cuentas: c for c in cuentas }
    
    total_ingresos = 0.0
    total_gastos = 0.0

    # 1. Calcular saldos base SOLO en cuentas de detalle
    for cta in cuentas:
        resumen = getattr(cta, 'resumen', False)
        if not resumen:
            codigo = cta.cuentas
            debe_acumulado = dict_movimientos.get(codigo, {}).get("debe", 0.0)
            haber_acumulado = dict_movimientos.get(codigo, {}).get("haber", 0.0)
            
            saldo = 0.0
            if codigo.startswith(prefijo_ingresos): 
                saldo = haber_acumulado - debe_acumulado
                total_ingresos += saldo
            elif codigo.startswith(prefijo_gastos): 
                saldo = debe_acumulado - haber_acumulado
                total_gastos += saldo

            # 2. Algoritmo Roll-Up: Empujar el saldo de la hoja a todos sus padres
            if saldo != 0.0:
                for parent_code in saldos_acumulados.keys():
                    if codigo.startswith(parent_code):
                        saldos_acumulados[parent_code] += saldo

    ingresos = []
    gastos = []

    # 3. Filtrar árbol por el Nivel solicitado
    for codigo, cta in info_cuentas.items():
        cta_nivel = _obtener_nivel_cuenta(cta)
        if cta_nivel > nivel:
            continue
            
        saldo = saldos_acumulados[codigo]
        resumen = getattr(cta, 'resumen', False)
        
        # Ocultar cuentas en cero, a menos que sean padres con hijos que sí tienen saldo
        if saldo == 0.0:
            tiene_hijos = any(saldos_acumulados[k] != 0.0 for k in saldos_acumulados.keys() if k.startswith(codigo) and k != codigo)
            if not tiene_hijos:
                continue

        item = {
            "codigo": codigo, 
            "nombre": cta.nombre, 
            "saldo": saldo,
            "nivel": cta_nivel,
            "resumen": resumen
        }
        
        if codigo.startswith(prefijo_ingresos): ingresos.append(item)
        elif codigo.startswith(prefijo_gastos): gastos.append(item)

    ingresos.sort(key=lambda x: x["codigo"])
    gastos.sort(key=lambda x: x["codigo"])

    return {
        "empresa_id": empresa_id,
        "anio": anio,
        "mes_corte": mes,
        "exencion_isr": exencion_isr,  # Inyectamos este dato al JSON de respuesta
        "ingresos": ingresos,
        "gastos": gastos,
        "totales": {
            "ingresos": total_ingresos,
            "gastos": total_gastos,
            "utilidad": total_ingresos - total_gastos
        }
    }


def obtener_balance_general(db: Session, empresa_id: str, anio: int, mes: int, nivel: int = 3):
    # MODIFICACIÓN NIIF: Traer árbol completo (resumen y detalle)
    cuentas = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.anio == anio,
        (CuentaContable.cuentas.like('1%') | CuentaContable.cuentas.like('2%') | CuentaContable.cuentas.like('3%'))
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
        PartidaCabecera.mes <= mes,
        PartidaCabecera.estado != "Borrador",
        (PartidaDetalle.cuenta_codigo.like('1%') | PartidaDetalle.cuenta_codigo.like('2%') | PartidaDetalle.cuenta_codigo.like('3%'))
    ).group_by(PartidaDetalle.cuenta_codigo).all()

    dict_movimientos = {
        mov.cuenta_codigo: {
            "debe": float(mov.total_debe or 0), 
            "haber": float(mov.total_haber or 0)
        } for mov in movimientos
    }

    saldos_acumulados = { c.cuentas: 0.0 for c in cuentas }
    info_cuentas = { c.cuentas: c for c in cuentas }
    
    total_activo = 0.0
    total_pasivo = 0.0
    total_patrimonio = 0.0

    # 1. Calcular saldos base y sumar a totales maestros
    for cta in cuentas:
        resumen = getattr(cta, 'resumen', False)
        if not resumen:
            codigo = cta.cuentas
            saldo_inicial = float(cta.saldo_inicial)
            debe = dict_movimientos.get(codigo, {}).get("debe", 0.0)
            haber = dict_movimientos.get(codigo, {}).get("haber", 0.0)

            saldo = 0.0
            if codigo.startswith('1'):
                saldo = saldo_inicial + debe - haber
                total_activo += saldo
            elif codigo.startswith('2'):
                saldo = saldo_inicial + haber - debe
                total_pasivo += saldo
            elif codigo.startswith('3'):
                saldo = saldo_inicial + haber - debe
                total_patrimonio += saldo

            # 2. Algoritmo Roll-Up NIIF
            if saldo != 0.0:
                for parent_code in saldos_acumulados.keys():
                    if codigo.startswith(parent_code):
                        saldos_acumulados[parent_code] += saldo

    # 3. Integración de Utilidad Neta en el Patrimonio
    estado_resultados = obtener_estado_resultados(db, empresa_id, anio, mes, nivel=1, modo="acumulado")
    utilidad_ejercicio = float(estado_resultados["totales"]["utilidad"])
    
    # Empujamos la utilidad al Nivel 1 del Patrimonio para que la ecuación cuadre visualmente
    if '3' in saldos_acumulados:
        saldos_acumulados['3'] += utilidad_ejercicio
        
    total_patrimonio += utilidad_ejercicio

    activos, pasivos, patrimonio = [], [], []

    # 4. Filtrar por nivel solicitado
    for codigo, cta in info_cuentas.items():
        cta_nivel = _obtener_nivel_cuenta(cta)
        if cta_nivel > nivel:
            continue
            
        saldo = saldos_acumulados[codigo]
        resumen = getattr(cta, 'resumen', False)
        
        if saldo == 0.0:
            tiene_hijos = any(saldos_acumulados[k] != 0.0 for k in saldos_acumulados.keys() if k.startswith(codigo) and k != codigo)
            if not tiene_hijos:
                continue

        item = {
            "codigo": codigo, 
            "nombre": cta.nombre, 
            "saldo": saldo,
            "nivel": cta_nivel,
            "resumen": resumen
        }
        
        if codigo.startswith('1'): activos.append(item)
        elif codigo.startswith('2'): pasivos.append(item)
        elif codigo.startswith('3'): patrimonio.append(item)

    # Inyección de cuenta virtual para la utilidad
    texto_utilidad = "Utilidad del Ejercicio" if utilidad_ejercicio >= 0 else "Pérdida del Ejercicio"
    patrimonio.append({
        "codigo": "3-RESULTADO", 
        "nombre": texto_utilidad, 
        "saldo": utilidad_ejercicio,
        "nivel": nivel, 
        "resumen": False
    })

    activos.sort(key=lambda x: x["codigo"])
    pasivos.sort(key=lambda x: x["codigo"])
    patrimonio.sort(key=lambda x: x["codigo"])

    return {
        "empresa_id": empresa_id,
        "anio": anio,
        "mes_corte": mes,
        "activos": activos,
        "pasivos": pasivos,
        "patrimonio": patrimonio,
        "totales": {
            "activo": total_activo,
            "pasivo": total_pasivo,
            "patrimonio": total_patrimonio,
            "pasivo_mas_patrimonio": total_pasivo + total_patrimonio
        }
    }


def obtener_flujo_efectivo(db: Session, empresa_id: str, anio: int, mes: int):
    # Sin modificaciones en esta función, se mantiene idéntica para asegurar estabilidad.
    reglas = db.query(MapeoFlujoEfectivo).filter(
        MapeoFlujoEfectivo.empresa_id == empresa_id
    ).all()
    reglas.sort(key=lambda x: len(x.prefijo_cuenta), reverse=True)

    cuentas = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.anio == anio,
        CuentaContable.resumen == False
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
        PartidaCabecera.mes <= mes,
        PartidaCabecera.estado.notin_(["Borrador", "Cierre"])
    ).group_by(PartidaDetalle.cuenta_codigo).all()

    dict_movimientos = {
        mov.cuenta_codigo: {
            "debe": float(mov.total_debe or 0), 
            "haber": float(mov.total_haber or 0)
        } for mov in movimientos
    }

    flujo = {
        "EFECTIVO": {"cuentas": [], "saldo_inicial": 0.0, "variacion": 0.0, "saldo_final": 0.0},
        "OPERACION": {"cuentas": [], "total": 0.0},
        "INVERSION": {"cuentas": [], "total": 0.0},
        "FINANCIACION": {"cuentas": [], "total": 0.0},
        "SIN_CLASIFICAR": {"cuentas": [], "total": 0.0}
    }

    def clasificar_cuenta(codigo):
        for regla in reglas:
            if codigo.startswith(regla.prefijo_cuenta):
                return regla.actividad
        return "SIN_CLASIFICAR"

    for cta in cuentas:
        codigo = cta.cuentas
        nombre = cta.nombre
        saldo_inicial = float(cta.saldo_inicial)
        
        debe = dict_movimientos.get(codigo, {}).get("debe", 0.0)
        haber = dict_movimientos.get(codigo, {}).get("haber", 0.0)
        
        actividad = clasificar_cuenta(codigo)

        if actividad == "EFECTIVO":
            variacion = debe - haber
            saldo_final = saldo_inicial + variacion
            
            if saldo_inicial != 0 or variacion != 0:
                flujo["EFECTIVO"]["cuentas"].append({
                    "codigo": codigo, "nombre": nombre,
                    "saldo_inicial": saldo_inicial, "variacion": variacion, "saldo_final": saldo_final
                })
                flujo["EFECTIVO"]["saldo_inicial"] += saldo_inicial
                flujo["EFECTIVO"]["variacion"] += variacion
                flujo["EFECTIVO"]["saldo_final"] += saldo_final
        else:
            impacto = haber - debe
            if impacto != 0:
                flujo[actividad]["cuentas"].append({
                    "codigo": codigo, "nombre": nombre, "impacto": impacto
                })
                flujo[actividad]["total"] += impacto

    for key in flujo:
        flujo[key]["cuentas"].sort(key=lambda x: x["codigo"])

    flujo_neto_generado = (
        flujo["OPERACION"]["total"] + 
        flujo["INVERSION"]["total"] + 
        flujo["FINANCIACION"]["total"] + 
        flujo["SIN_CLASIFICAR"]["total"]
    )

    return {
        "empresa_id": empresa_id,
        "anio": anio,
        "mes_corte": mes,
        "detalle": flujo,
        "totales": {
            "flujo_neto_actividades": flujo_neto_generado,
            "variacion_efectivo": flujo["EFECTIVO"]["variacion"],
            "efectivo_inicio": flujo["EFECTIVO"]["saldo_inicial"],
            "efectivo_final": flujo["EFECTIVO"]["saldo_final"],
            "cuadre_perfecto": abs(flujo_neto_generado - flujo["EFECTIVO"]["variacion"]) < 0.01
        }
    }