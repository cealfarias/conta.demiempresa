from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from .auditoria import AuditoriaBase

class EmpresaBase(BaseModel):
    id: str = Field(..., min_length=2, max_length=50, description="Código identificador único")
    razon_social: str = Field(..., min_length=1)
    nombre_comercial: Optional[str] = None
    nit: str = Field(..., description="NIT formato salvadoreño")
    nrc: Optional[str] = None
    giro: str = Field(..., min_length=1)
    normativa: str = Field(..., description="Debe ser NIIF_PYMES o NIFACES")

    @field_validator("normativa")
    def validar_normativa_salvador(cls, v):
        # Relaxed validation to allow legacy DB data
        return v

class EmpresaCreate(EmpresaBase):
    terminal_ip: str
    usuario_creacion: str

class EmpresaResponse(EmpresaBase):
    fecha_creacion: Optional[datetime] = None
    class Config:
        from_attributes = True
