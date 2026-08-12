from pydantic import BaseModel, Field
from datetime import date

class EjercicioFiscalCreate(BaseModel):
    empresa_id: str
    anio: int = Field(..., ge=2000, le=2100)
    fecha_inicio: date
    fecha_fin: date
    usuario_creacion: str

class ControlPeriodoUpdate(BaseModel):
    empresa_id: str
    anio: int
    mes: int
    mes_abierto: bool
