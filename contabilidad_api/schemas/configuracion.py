# Archivo: schemas/configuracion.py
from pydantic import BaseModel

class ConfiguracionContableBase(BaseModel):
    empresa_id: str
    prefijo_ingresos: str
    prefijo_gastos: str
    prefijo_liquidadora: str
    cuenta_utilidad: str = "310601"
    exencion_isr: bool = False

class ConfiguracionContableOut(ConfiguracionContableBase):
    id: str

    class Config:
        from_attributes = True  # Para Pydantic v2 (usar orm_mode = True si estás en v1)