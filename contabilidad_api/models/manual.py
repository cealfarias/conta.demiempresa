# Archivo modular: models/manual.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKeyConstraint
import datetime
from config.database import Base

class ManualContable(Base):
    __tablename__ = "manual_contable"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Columnas de contexto para la llave compuesta
    empresa_id = Column(String, index=True, nullable=False)
    anio = Column(Integer, index=True, nullable=False)
    cuenta_codigo = Column(String, index=True, nullable=False)
    
    descripcion_rubro = Column(Text, nullable=False)
    se_carga_por = Column(Text, nullable=False)
    se_abona_por = Column(Text, nullable=False)
    significado_saldo = Column(Text, nullable=False)
    base_medicion = Column(String, nullable=True)

    usuario_creacion = Column(String, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    usuario_modificacion = Column(String, nullable=True)
    fecha_modificacion = Column(DateTime, nullable=True)
    terminal_ip = Column(String, nullable=False)

    # Restricción de llave foránea compuesta alineada al catálogo de cuentas
    __table_args__ = (
        ForeignKeyConstraint(
            ['cuenta_codigo', 'empresa_id', 'anio'],
            ['catalogo_cuentas.cuentas', 'catalogo_cuentas.empresa_id', 'catalogo_cuentas.anio'],
            ondelete="CASCADE"
        ),
    )