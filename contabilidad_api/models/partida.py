# Archivo modular: models/partida.py
from sqlalchemy import Column, Integer, String, Date, Numeric, Text, ForeignKey, DateTime, UniqueConstraint, ForeignKeyConstraint
from sqlalchemy.orm import relationship
import datetime
from config.database import Base

class PartidaCabecera(Base):
    __tablename__ = "partidas_cabecera"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    empresa_id = Column(String, ForeignKey("empresas.id", ondelete="RESTRICT"), nullable=False)
    anio = Column(Integer, nullable=False)
    mes = Column(Integer, nullable=False)
    numero_partida = Column(Integer, index=True, nullable=False)
    fecha = Column(Date, index=True, nullable=False)
    concepto = Column(Text, nullable=False)
    # Estados permitidos: Borrador, Impresa, Auditada, Mayorizada
    estado = Column(String, default="Borrador", nullable=False) 

    usuario_creacion = Column(String, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    usuario_modificacion = Column(String, nullable=True)
    fecha_modificacion = Column(DateTime, nullable=True)
    terminal_ip = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint('empresa_id', 'anio', 'mes', 'numero_partida', name='_partida_correlativo_uc'),)
    detalles = relationship("PartidaDetalle", back_populates="partida", cascade="all, delete-orphan")


class PartidaDetalle(Base):
    __tablename__ = "partidas_detalle"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    partida_id = Column(Integer, ForeignKey("partidas_cabecera.id", ondelete="CASCADE"), nullable=False)
    
    empresa_id = Column(String, nullable=False)
    anio = Column(Integer, nullable=False)
    cuenta_codigo = Column(String, nullable=False)
    
    debe = Column(Numeric(precision=12, scale=2), default=0.00, nullable=False)
    haber = Column(Numeric(precision=12, scale=2), default=0.00, nullable=False)
    concepto_detalle = Column(String, nullable=True)

    partida = relationship("PartidaCabecera", back_populates="detalles")

    __table_args__ = (
        ForeignKeyConstraint(
            ['empresa_id', 'anio', 'cuenta_codigo'],
            ['catalogo_cuentas.empresa_id', 'catalogo_cuentas.anio', 'catalogo_cuentas.cuentas'],
            ondelete="RESTRICT"
        ),
    )