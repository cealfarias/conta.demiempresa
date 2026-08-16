from sqlalchemy.orm import Session
import models
import schemas
from datetime import datetime

def crear_ticket_soporte(db: Session, ticket_data: schemas.soporte.TicketSoporteCreate, empresa_id: int, usuario_id: int):
    ticket = models.soporte.TicketSoporte(
        empresa_id=empresa_id,
        usuario_id=usuario_id,
        asunto=ticket_data.asunto,
        categoria=ticket_data.categoria or "Soporte Técnico",
        prioridad=ticket_data.prioridad or "Media",
        estado="ABIERTO"
    )
    db.add(ticket)
    db.flush()

    # Agregar primer mensaje inicial
    mensaje_inicial = models.soporte.MensajeTicket(
        ticket_id=ticket.id,
        remitente_usuario_id=usuario_id,
        es_propietario=False,
        contenido=ticket_data.mensaje_inicial
    )
    db.add(mensaje_inicial)

    db.commit()
    db.refresh(ticket)
    return ticket

def obtener_tickets_usuario(db: Session, empresa_id: int, es_propietario: bool = False):
    query = db.query(models.soporte.TicketSoporte)
    if not es_propietario:
        query = query.filter(models.soporte.TicketSoporte.empresa_id == empresa_id)
    return query.order_by(models.soporte.TicketSoporte.fecha_actualizacion.desc()).all()

def obtener_ticket_por_id(db: Session, ticket_id: int):
    return db.query(models.soporte.TicketSoporte).filter(models.soporte.TicketSoporte.id == ticket_id).first()

def agregar_mensaje_ticket(db: Session, ticket_id: int, usuario_id: int, contenido: str, es_propietario: bool):
    ticket = db.query(models.soporte.TicketSoporte).filter(models.soporte.TicketSoporte.id == ticket_id).first()
    if not ticket:
        return None

    mensaje = models.soporte.MensajeTicket(
        ticket_id=ticket_id,
        remitente_usuario_id=usuario_id,
        es_propietario=es_propietario,
        contenido=contenido
    )
    db.add(mensaje)
    
    ticket.fecha_actualizacion = datetime.utcnow()
    if es_propietario and ticket.estado == "ABIERTO":
        ticket.estado = "EN_PROCESO"

    db.commit()
    db.refresh(mensaje)
    return mensaje

def cambiar_estado_ticket(db: Session, ticket_id: int, nuevo_estado: str):
    ticket = db.query(models.soporte.TicketSoporte).filter(models.soporte.TicketSoporte.id == ticket_id).first()
    if ticket:
        ticket.estado = nuevo_estado
        ticket.fecha_actualizacion = datetime.utcnow()
        db.commit()
        db.refresh(ticket)
    return ticket
