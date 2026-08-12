from pydantic import BaseModel, Field

class AuditoriaBase(BaseModel):
    usuario_creacion: str = Field(..., description="Nombre de usuario extraído de la sesión del Login")
    terminal_ip: str = Field(..., description="IP del cliente capturada por el middleware")
