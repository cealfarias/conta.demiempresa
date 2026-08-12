import uuid
from sqlalchemy.orm import Session
from models.flujo_efectivo import MapeoFlujoEfectivo
from schemas.flujo_efectivo import MapeoFlujoMasivoRequest

def guardar_mapeo_flujos(db: Session, request: MapeoFlujoMasivoRequest):
    # 1. Eliminar mapeo anterior para la empresa (reemplazo total)
    db.query(MapeoFlujoEfectivo).filter(
        MapeoFlujoEfectivo.empresa_id == request.empresa_id
    ).delete(synchronize_session=False)

    # 2. Insertar los nuevos mapeos en bloque
    nuevos_mapeos = []
    for mapeo in request.mapeos:
        nuevo_registro = MapeoFlujoEfectivo(
            id=str(uuid.uuid4()),
            empresa_id=request.empresa_id,
            actividad=mapeo.actividad,
            prefijo_cuenta=mapeo.prefijo_cuenta
        )
        nuevos_mapeos.append(nuevo_registro)

    db.bulk_save_objects(nuevos_mapeos)
    db.commit()
    return {"mensaje": f"Se han guardado {len(nuevos_mapeos)} reglas de flujo de efectivo correctamente."}

def obtener_mapeo_flujos(db: Session, empresa_id: str):
    return db.query(MapeoFlujoEfectivo).filter(
        MapeoFlujoEfectivo.empresa_id == empresa_id
    ).all()