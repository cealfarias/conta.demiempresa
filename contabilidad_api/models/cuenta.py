# Archivo modular: models/cuenta.py
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKeyConstraint, Numeric
import datetime
from config.database import Base

class CuentaContable(Base):
    __tablename__ = "catalogo_cuentas"

    # Llave primaria compuesta para aislamiento multi-empresa y multi-año
    empresa_id = Column(String, primary_key=True, index=True, nullable=False)
    anio = Column(Integer, primary_key=True, index=True, nullable=False)
    cuentas = Column(String, primary_key=True, index=True, nullable=False)
    
    nombre = Column(String, nullable=False)
    ctadep = Column(String, nullable=True)
    nivel = Column(Integer, nullable=False)
    resumen = Column(Boolean, default=True, nullable=False)

    # Campos estructurales para el control de saldos y traslados interanuales
    saldo_inicial = Column(Numeric(precision=12, scale=2), default=0.00, nullable=False)
    saldo_final = Column(Numeric(precision=12, scale=2), default=0.00, nullable=False)

    usuario_creacion = Column(String, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    usuario_modificacion = Column(String, nullable=True)
    fecha_modificacion = Column(DateTime, nullable=True)
    terminal_ip = Column(String, nullable=False)

    # Restricción de llave foránea compuesta para mantener la integridad jerárquica
    # dentro del mismo contexto de empresa y ejercicio contable.
    __table_args__ = (
        ForeignKeyConstraint(
            ['ctadep', 'empresa_id', 'anio'],
            ['catalogo_cuentas.cuentas', 'catalogo_cuentas.empresa_id', 'catalogo_cuentas.anio'],
            ondelete="RESTRICT"
        ),
    )