from pydantic import BaseModel, Field, field_validator
from typing import Optional
from .auditoria import AuditoriaBase

class CuentaContableBase(BaseModel):
    cuentas: str = Field(..., description="Código estructurado numérico")
    nombre: str = Field(..., min_length=1)
    ctadep: Optional[str] = None
    nivel: int = Field(..., gt=0)
    resumen: bool = Field(True, description="True si consolida saldos, False si recibe partidas directas")

    @field_validator("nivel")
    def verificar_niveles_universales(cls, v, info):
        codigo = info.data.get("cuentas")
        # Se amplía la cobertura para incluir las cuentas 8 y 9
        if v == 1 and codigo not in {"1", "2", "3", "4", "5", "6", "7", "8", "9"}:
            raise ValueError("El nivel 1 corresponde únicamente a las clases del 1 al 9 fijadas por la normativa")
        return v

class CuentaContableCreate(CuentaContableBase, AuditoriaBase):
    pass

class CuentaContableResponse(CuentaContableBase):
    empresa_id: str
    anio: int

    class Config:
        from_attributes = True