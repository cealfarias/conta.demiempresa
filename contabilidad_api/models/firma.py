# Archivo modular: models/firma.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
import datetime
from config.database import Base

class FirmaReporte(Base):
    __tablename__ = "firmas_reportes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    empresa_id = Column(String, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    anio = Column(Integer, nullable=False)
    cargo = Column(String, nullable=False) # Representante Legal, Contador, Auditor
    nombre_firmante = Column(String, nullable=False)
    numero_acreditacion = Column(String, nullable=True) # Sello JVPC si aplica
    orden_impresion = Column(Integer, nullable=False)

    usuario_creacion = Column(String, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    usuario_modificacion = Column(String, nullable=True)
    fecha_modificacion = Column(DateTime, nullable=True)
    terminal_ip = Column(String, nullable=False)