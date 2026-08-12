import uuid
from sqlalchemy import Column, String, ForeignKey, Boolean
from config.database import Base 

class ConfiguracionContable(Base):
    __tablename__ = "configuracion_contable"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    empresa_id = Column(String(36), ForeignKey("empresas.id", ondelete="CASCADE"), unique=True, nullable=False)
    prefijo_ingresos = Column(String(2), nullable=False)
    prefijo_gastos = Column(String(2), nullable=False)
    prefijo_liquidadora = Column(String(2), nullable=False)
    cuenta_utilidad = Column(String(20), default="310601", nullable=False)
    exencion_isr = Column(Boolean, default=False)