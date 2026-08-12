# Archivo modular: models/periodo.py
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, DateTime, UniqueConstraint
import datetime
from config.database import Base

class EjercicioFiscal(Base):
    __tablename__ = "ejercicios_fiscales"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    empresa_id = Column(String, ForeignKey("empresas.id", ondelete="RESTRICT"), nullable=False)
    anio = Column(Integer, nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    estado_cerrado = Column(Boolean, default=False, nullable=False)

    usuario_creacion = Column(String, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint('empresa_id', 'anio', name='_empresa_anio_uc'),)


class ControlPeriodo(Base):
    __tablename__ = "control_periodos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    empresa_id = Column(String, ForeignKey("empresas.id", ondelete="RESTRICT"), nullable=False)
    anio = Column(Integer, nullable=False)
    mes = Column(Integer, nullable=False)
    mes_abierto = Column(Boolean, default=True, nullable=False)
    anio_abierto = Column(Boolean, default=True, nullable=False)
    total_partidas = Column(Integer, default=0, nullable=False)

    __table_args__ = (UniqueConstraint('empresa_id', 'anio', 'mes', name='_empresa_anio_mes_uc'),)