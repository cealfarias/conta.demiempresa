from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db

# Asumiendo las rutas estándar de tu proyecto para importar modelos y esquemas
from models.flujo_efectivo import MapeoFlujoEfectivo
from schemas.flujo_efectivo import MapeoFlujoOut, MapeoFlujoMasivoRequest

router = APIRouter(prefix="/api/v1/flujos", tags=["Flujos de Efectivo"])

@router.get("/mapeo/{empresa_id}", response_model=List[MapeoFlujoOut])
def obtener_mapeo(empresa_id: str, db: Session = Depends(get_db)):
    """Obtiene todas las reglas de mapeo configuradas para una empresa."""
    mapeos = db.query(MapeoFlujoEfectivo).filter(MapeoFlujoEfectivo.empresa_id == empresa_id).all()
    return mapeos

@router.post("/mapeo/masivo", status_code=status.HTTP_200_OK)
def guardar_mapeo_masivo(request: MapeoFlujoMasivoRequest, db: Session = Depends(get_db)):
    """Reemplaza el mapeo completo de flujos para una empresa."""
    try:
        # Eliminación de reglas anteriores para evitar duplicidades
        db.query(MapeoFlujoEfectivo).filter(MapeoFlujoEfectivo.empresa_id == request.empresa_id).delete()
        
        nuevos_mapeos = []
        for mapeo in request.mapeos:
            nuevo_registro = MapeoFlujoEfectivo(
                empresa_id=request.empresa_id,
                actividad=mapeo.actividad,
                prefijo_cuenta=mapeo.prefijo_cuenta
            )
            db.add(nuevo_registro)
            nuevos_mapeos.append(nuevo_registro)
        
        db.commit()
        return {"detail": "Reglas de mapeo guardadas exitosamente", "registros_procesados": len(nuevos_mapeos)}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en base de datos: {str(e)}")