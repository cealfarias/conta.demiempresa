from pydantic import BaseModel, Field
from typing import Optional
import datetime


class AceptacionTerminosCreate(BaseModel):
    """Schema para registrar la aceptación de términos desde el frontend."""
    email: str = Field(pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    username: str
    empresa_id: Optional[str] = None
    nombre_empresa: Optional[str] = None
    version_terminos: str = "v2026.08.22"
    metodo_registro: Optional[str] = "formulario"
    acepto_mailing: Optional[str] = "no"


class AceptacionTerminosResponse(BaseModel):
    id: int
    email: str
    username: str
    empresa_id: Optional[str] = None
    nombre_empresa: Optional[str] = None
    version_terminos: str
    fecha_aceptacion: datetime.datetime
    ip_origen: str
    user_agent: Optional[str] = None
    metodo_registro: Optional[str] = None
    acepto_mailing: Optional[str] = None

    class Config:
        from_attributes = True
