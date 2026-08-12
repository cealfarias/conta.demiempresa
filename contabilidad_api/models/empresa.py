# Archivo modular: models/empresa.py
from sqlalchemy import Column, String, DateTime
import datetime
from config.database import Base

class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(String, primary_key=True, index=True, nullable=False)
    razon_social = Column(String, nullable=False)
    nombre_comercial = Column(String, nullable=True)
    nit = Column(String, unique=True, nullable=False)
    nrc = Column(String, nullable=True)
    giro = Column(String, nullable=False)
    normativa = Column(String, nullable=False) # NIIF_PYMES o NIFACES

    # Campos de auditoría exigidos por el login del usuario
    usuario_creacion = Column(String, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    usuario_modificacion = Column(String, nullable=True)
    fecha_modificacion = Column(DateTime, nullable=True)
    terminal_ip = Column(String, nullable=False)