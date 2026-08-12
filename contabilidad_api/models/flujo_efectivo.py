import uuid
from sqlalchemy import Column, String, ForeignKey
from config.database import Base # Ajusta la ruta a tu instancia Base

class MapeoFlujoEfectivo(Base):
    __tablename__ = "mapeo_flujo_efectivo"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    empresa_id = Column(String(36), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    actividad = Column(String(50), nullable=False)  # Valores esperados: EFECTIVO, OPERACION, INVERSION, FINANCIACION
    prefijo_cuenta = Column(String(10), nullable=False) # Ej: "1101", "12", "21"