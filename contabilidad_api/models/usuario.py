from sqlalchemy import Column, Integer, String, Boolean, DateTime
import datetime
from config.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    rol = Column(String, nullable=False) # Ej: admin, contador
    is_active = Column(Boolean, default=True)

    # Campos 2FA (Opcional)
    two_factor_secret = Column(String, nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)

    # Campos de auditoría exigidos por el sistema
    usuario_creacion = Column(String, nullable=False)
    # Corrección de DeprecationWarning para Python 3.12+
    fecha_creacion = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    usuario_modificacion = Column(String, nullable=True)
    fecha_modificacion = Column(DateTime, nullable=True)
    terminal_ip = Column(String, nullable=False)