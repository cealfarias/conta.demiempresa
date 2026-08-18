from pydantic import BaseModel, Field
from typing import Optional
import datetime

class UsuarioBase(BaseModel):
    username: str
    email: str = Field(pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    rol: str
    empresa_id: Optional[str] = None
    telefono: Optional[str] = None
    is_active: Optional[bool] = True

class UsuarioCreate(UsuarioBase):
    password: str
    usuario_creacion: str
    terminal_ip: str

class UsuarioUpdate(BaseModel):
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    rol: Optional[str] = None
    telefono: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    usuario_modificacion: str
    terminal_ip: str

class Usuario(UsuarioBase):
    id: int
    fecha_creacion: datetime.datetime
    usuario_creacion: str
    usuario_modificacion: Optional[str] = None
    fecha_modificacion: Optional[datetime.datetime] = None
    terminal_ip: str

    class Config:
        from_attributes = True