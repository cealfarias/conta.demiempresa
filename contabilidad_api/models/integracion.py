from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
import datetime
from config.database import Base

class IntegracionAPI(Base):
    __tablename__ = "integraciones_api"

    id = Column(String, primary_key=True, index=True, nullable=False)
    empresa_id = Column(String, ForeignKey("empresas.id"), nullable=False)
    nombre_app = Column(String, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=False)
    activa = Column(Boolean, default=True, nullable=False)

    usuario_creacion = Column(String, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

