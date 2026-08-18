from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base

class TicketSoporte(Base):
    __tablename__ = "sop_ticket"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(String, ForeignKey("empresas.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    asunto = Column(String(200), nullable=False)
    categoria = Column(String(50), default="Soporte Técnico")
    prioridad = Column(String(20), default="Media")
    estado = Column(String(20), default="ABIERTO")
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_actualizacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    empresa = relationship("Empresa")
    usuario = relationship("Usuario")
    mensajes = relationship("MensajeTicket", back_populates="ticket", cascade="all, delete-orphan", order_by="MensajeTicket.fecha_envio.asc()")

class MensajeTicket(Base):
    __tablename__ = "sop_mensaje"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("sop_ticket.id"), nullable=False)
    remitente_usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    es_propietario = Column(Boolean, default=False)
    contenido = Column(Text, nullable=False)
    fecha_envio = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("TicketSoporte", back_populates="mensajes")
    remitente = relationship("Usuario")
