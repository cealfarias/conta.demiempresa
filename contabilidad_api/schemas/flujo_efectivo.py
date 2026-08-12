from pydantic import BaseModel
from typing import List

class MapeoFlujoBase(BaseModel):
    actividad: str
    prefijo_cuenta: str

class MapeoFlujoCrear(MapeoFlujoBase):
    empresa_id: str

class MapeoFlujoOut(MapeoFlujoCrear):
    id: str

    class Config:
        from_attributes = True

class MapeoFlujoMasivoRequest(BaseModel):
    empresa_id: str
    mapeos: List[MapeoFlujoBase]