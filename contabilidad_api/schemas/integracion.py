from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class IntegracionBase(BaseModel):
    nombre_app: str
    activa: bool = True

class IntegracionCreate(IntegracionBase):
    pass

class IntegracionResponse(IntegracionBase):
    id: str
    empresa_id: str
    api_key: str
    fecha_creacion: datetime

    class Config:
        from_attributes = True

class IntegracionPayloadPartida(BaseModel):
    concepto: str
    fecha: str
    detalles: list

