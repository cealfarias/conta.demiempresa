from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
import schemas.integracion as s_integracion
import crud.integracion as c_integracion
from schemas.partida import PartidaCompletaCrear
from routers.partida import guardar_partida_completa_transaccional
from auth_module import validar_token_dependency

router = APIRouter(prefix="/api/v1/integracion", tags=["Integraciones API"])

@router.post("/generar-llave", response_model=s_integracion.IntegracionResponse, dependencies=[Depends(validar_token_dependency)])
def api_generar_llave(request: s_integracion.IntegracionCreate, empresa_id: str, usuario: str, db: Session = Depends(get_db)):
    return c_integracion.crear_integracion(db, empresa_id, request, usuario)

@router.get("/llaves/{empresa_id}", response_model=List[s_integracion.IntegracionResponse], dependencies=[Depends(validar_token_dependency)])
def api_listar_llaves(empresa_id: str, db: Session = Depends(get_db)):
    return c_integracion.obtener_integraciones(db, empresa_id)

@router.post("/webhook/partida")
def webhook_recibir_partida(
    payload: PartidaCompletaCrear, 
    x_api_key: str = Header(None), 
    db: Session = Depends(get_db)
):
    if not x_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Falta el header X-API-Key")
    
    integracion = c_integracion.validar_api_key(db, x_api_key)
    if not integracion:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API Key invlida o inactiva")

    # Aseguramos que la partida se asigne a la empresa correcta segn el API Key
    payload.empresa_id = integracion.empresa_id
    payload.terminal_ip = "Webhook API"
    payload.usuario_creacion = integracion.nombre_app

    try:
        return guardar_partida_completa_transaccional(payload, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

