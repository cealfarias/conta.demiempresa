from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
from database.session import get_db
from models.models import (
    CuentaContable, ManualContable, PartidaCabecera, PartidaDetalle,
    ConfiguracionContable, ControlPeriodo, EjercicioFiscal
)
from auth_module import obtener_usuario_actual, TokenData, SECRET_KEY
import hmac
import hashlib
import json
from decimal import Decimal

def sign_payload(payload: dict) -> str:
    payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    return hmac.new(SECRET_KEY.encode('utf-8'), payload_str.encode('utf-8'), hashlib.sha256).hexdigest()


router = APIRouter(prefix="/api/v1/respaldo", tags=["Respaldo y Recuperacion"])

@router.get("/generar/{empresa_id}/{anio}")
def generar_backup(empresa_id: str, anio: int, db: Session = Depends(get_db)):
    # 1. Configuración Contable
    config = db.query(ConfiguracionContable).filter(ConfiguracionContable.empresa_id == empresa_id).first()
    config_data = {
        "prefijo_ingresos": config.prefijo_ingresos,
        "prefijo_gastos": config.prefijo_gastos,
        "prefijo_liquidadora": config.prefijo_liquidadora,
        "cuenta_utilidad": config.cuenta_utilidad,
        "cuenta_utilidades_retenidas": config.cuenta_utilidades_retenidas,
        "cuenta_perdidas_acumuladas": config.cuenta_perdidas_acumuladas,
        "porcentaje_reserva_legal": str(config.porcentaje_reserva_legal) if config.porcentaje_reserva_legal is not None else None,
        "cuenta_reserva_legal": config.cuenta_reserva_legal,
        "tasa_isr": str(config.tasa_isr) if config.tasa_isr is not None else None,
        "cuenta_isr_por_pagar": config.cuenta_isr_por_pagar,
        "cuenta_gasto_isr": config.cuenta_gasto_isr,
        "exencion_isr": config.exencion_isr
    } if config else None

    # 2. Ejercicio Fiscal y Periodos
    ejercicio = db.query(EjercicioFiscal).filter_by(empresa_id=empresa_id, anio=anio).first()
    if not ejercicio:
        raise HTTPException(status_code=404, detail="No existe información para el año seleccionado.")

    ejercicio_data = {
        "anio": ejercicio.anio,
        "fecha_inicio": ejercicio.fecha_inicio.isoformat() if ejercicio.fecha_inicio else None,
        "fecha_fin": ejercicio.fecha_fin.isoformat() if ejercicio.fecha_fin else None,
        "estado_cerrado": ejercicio.estado_cerrado
    }

    periodos = db.query(ControlPeriodo).filter_by(empresa_id=empresa_id, anio=anio).order_by(ControlPeriodo.mes).all()
    periodos_data = [{"mes": p.mes, "mes_abierto": p.mes_abierto, "anio_abierto": p.anio_abierto, "total_partidas": p.total_partidas} for p in periodos]

    # 3. Catálogo de Cuentas
    catalogo = db.query(CuentaContable).filter_by(empresa_id=empresa_id, anio=anio).all()
    catalogo_data = [{
        "cuentas": c.cuentas,
        "nombre": c.nombre,
        "ctadep": c.ctadep,
        "nivel": c.nivel,
        "resumen": c.resumen,
        "saldo_inicial": str(c.saldo_inicial) if c.saldo_inicial is not None else "0.00",
        "saldo_final": str(c.saldo_final) if c.saldo_final is not None else "0.00"
    } for c in catalogo]

    # 4. Manual Contable
    manual = db.query(ManualContable).filter_by(empresa_id=empresa_id, anio=anio).all()
    manual_data = [{
        "cuenta_codigo": m.cuenta_codigo,
        "descripcion_rubro": m.descripcion_rubro,
        "se_carga_por": m.se_carga_por,
        "se_abona_por": m.se_abona_por,
        "significado_saldo": m.significado_saldo,
        "base_medicion": m.base_medicion
    } for m in manual]

    # 5. Partidas (Cabeceras y Detalles)
    partidas = db.query(PartidaCabecera).filter_by(empresa_id=empresa_id, anio=anio).all()
    partidas_data = []
    for p in partidas:
        detalles = db.query(PartidaDetalle).filter_by(partida_id=p.id).all()
        partidas_data.append({
            "cabecera": {
                "mes": p.mes,
                "numero_partida": p.numero_partida,
                "fecha": p.fecha.isoformat() if p.fecha else None,
                "concepto": p.concepto,
                "estado": p.estado,
                "observaciones": p.observaciones
            },
            "detalles": [{
                "cuenta_codigo": d.cuenta_codigo,
                "concepto": d.concepto,
                "debe": str(d.debe) if d.debe is not None else "0.00",
                "haber": str(d.haber) if d.haber is not None else "0.00",
                "referencia": d.referencia
            } for d in detalles]
        })

    backup = {
        "version": "1.0",
        "timestamp": datetime.now().isoformat(),
        "empresa_id": empresa_id,
        "anio": anio,
        "configuracion": config_data,
        "ejercicio": ejercicio_data,
        "periodos": periodos_data,
        "catalogo": catalogo_data,
        "manual": manual_data,
        "partidas": partidas_data
    }
    
    backup["_signature"] = sign_payload(backup)
    return backup

@router.post("/restaurar/{empresa_id}/{anio}")
async def restaurar_backup(empresa_id: str, anio: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        content = await file.read()
        backup = json.loads(content)
        
        signature_provided = backup.pop("_signature", None)
        if not signature_provided:
            raise HTTPException(status_code=400, detail="Archivo inválido: No contiene firma de seguridad.")
        
        expected_signature = sign_payload(backup)
        if not hmac.compare_digest(expected_signature, signature_provided):
            raise HTTPException(status_code=400, detail="Archivo corrompido o manipulado: La firma de seguridad no coincide. (No fue generado por este sistema).")
        
        if backup.get("empresa_id") != empresa_id or backup.get("anio") != anio:
            raise HTTPException(status_code=400, detail="El archivo de backup no coincide con la empresa o año seleccionado.")
        
        # Eliminar Partidas
        partidas_ids = [p.id for p in db.query(PartidaCabecera).filter_by(empresa_id=empresa_id, anio=anio).all()]
        if partidas_ids:
            db.query(PartidaDetalle).filter(PartidaDetalle.partida_id.in_(partidas_ids)).delete(synchronize_session=False)
            db.query(PartidaCabecera).filter_by(empresa_id=empresa_id, anio=anio).delete(synchronize_session=False)
        
        # Eliminar Catálogo y Manual
        db.query(ManualContable).filter_by(empresa_id=empresa_id, anio=anio).delete(synchronize_session=False)
        db.query(CuentaContable).filter_by(empresa_id=empresa_id, anio=anio).delete(synchronize_session=False)
        
        # Eliminar Periodos y Ejercicio
        db.query(ControlPeriodo).filter_by(empresa_id=empresa_id, anio=anio).delete(synchronize_session=False)
        db.query(EjercicioFiscal).filter_by(empresa_id=empresa_id, anio=anio).delete(synchronize_session=False)

        # 1. Restaurar Configuración
        if backup.get("configuracion"):
            conf_data = backup["configuracion"]
            config = db.query(ConfiguracionContable).filter_by(empresa_id=empresa_id).first()
            if not config:
                config = ConfiguracionContable(empresa_id=empresa_id)
                db.add(config)
            
            for k, v in conf_data.items():
                if v is not None:
                    if k in ["porcentaje_reserva_legal", "tasa_isr"]:
                        setattr(config, k, Decimal(v))
                    else:
                        setattr(config, k, v)
        
        # 2. Restaurar Ejercicio y Periodos
        ej_data = backup.get("ejercicio", {})
        if ej_data:
            nuevo_ej = EjercicioFiscal(
                empresa_id=empresa_id,
                anio=ej_data["anio"],
                fecha_inicio=ej_data.get("fecha_inicio"),
                fecha_fin=ej_data.get("fecha_fin"),
                estado_cerrado=ej_data.get("estado_cerrado", False),
                usuario_creacion="Sistema"
            )
            db.add(nuevo_ej)
        
        for p_data in backup.get("periodos", []):
            db.add(ControlPeriodo(
                empresa_id=empresa_id,
                anio=anio,
                mes=p_data["mes"],
                mes_abierto=p_data["mes_abierto"],
                anio_abierto=p_data["anio_abierto"],
                total_partidas=p_data["total_partidas"]
            ))

        # 3. Restaurar Catálogo (ordenando para insertar padres primero)
        catalogo = backup.get("catalogo", [])
        catalogo.sort(key=lambda x: len(x["cuentas"]))
        for c in catalogo:
            db.add(CuentaContable(
                empresa_id=empresa_id,
                anio=anio,
                cuentas=c["cuentas"],
                nombre=c["nombre"],
                ctadep=c["ctadep"],
                nivel=c["nivel"],
                resumen=c["resumen"],
                saldo_inicial=Decimal(c["saldo_inicial"]),
                saldo_final=Decimal(c["saldo_final"]),
                usuario_creacion="Sistema",
                terminal_ip="127.0.0.1"
            ))
        db.flush()

        # 4. Restaurar Manual
        for m in backup.get("manual", []):
            db.add(ManualContable(
                empresa_id=empresa_id,
                anio=anio,
                cuenta_codigo=m["cuenta_codigo"],
                descripcion_rubro=m["descripcion_rubro"],
                se_carga_por=m["se_carga_por"],
                se_abona_por=m["se_abona_por"],
                significado_saldo=m["significado_saldo"],
                base_medicion=m["base_medicion"],
                usuario_creacion="Sistema",
                terminal_ip="127.0.0.1"
            ))

        # 5. Restaurar Partidas
        for p in backup.get("partidas", []):
            cab = p["cabecera"]
            nueva_cab = PartidaCabecera(
                empresa_id=empresa_id,
                anio=anio,
                mes=cab["mes"],
                numero_partida=cab["numero_partida"],
                fecha=cab["fecha"],
                concepto=cab["concepto"],
                estado=cab["estado"],
                observaciones=cab.get("observaciones", ""),
                usuario_creacion="Sistema",
                terminal_ip="127.0.0.1"
            )
            db.add(nueva_cab)
            db.flush()
            
            for d in p["detalles"]:
                db.add(PartidaDetalle(
                    partida_id=nueva_cab.id,
                    empresa_id=empresa_id,
                    anio=anio,
                    cuenta_codigo=d["cuenta_codigo"],
                    concepto=d["concepto"],
                    debe=Decimal(d["debe"]),
                    haber=Decimal(d["haber"]),
                    referencia=d.get("referencia", "")
                ))

        db.commit()
        return {"detail": "Restauración completada con éxito. Todos los datos fueron importados."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error durante la restauración: {str(e)}")
