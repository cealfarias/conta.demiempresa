from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from config.database import get_db
from auth_module import obtener_usuario_actual
from utils.email import notificar_nuevo_ticket, notificar_nuevo_mensaje_ticket
import models.soporte
import models.usuario
import schemas.soporte
import crud.soporte

router = APIRouter(
    prefix="/api/v1/soporte",
    tags=["Soporte Técnico"]
)

@router.post("/tickets", response_model=schemas.soporte.TicketSoporteResponse)
def crear_ticket(
    ticket_in: schemas.soporte.TicketSoporteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    usuario_actual = Depends(obtener_usuario_actual)
):
    usuario_db = db.query(models.usuario.Usuario).filter(models.usuario.Usuario.username == usuario_actual.username).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    ticket = crud.soporte.crear_ticket_soporte(
        db=db,
        ticket_data=ticket_in,
        empresa_id=usuario_db.empresa_id,
        usuario_id=usuario_db.id
    )
    
    background_tasks.add_task(
        notificar_nuevo_ticket,
        ticket_in.asunto,
        ticket_in.mensaje,
        usuario_db.email or usuario_db.username
    )
    
    res = schemas.soporte.TicketSoporteResponse.from_orm(ticket)
    res.nombre_empresa = ticket.empresa.nombre if ticket.empresa else "Empresa"
    res.nombre_usuario = ticket.usuario.username if ticket.usuario else "Usuario"
    return res

@router.get("/tickets", response_model=List[schemas.soporte.TicketSoporteResponse])
def listar_tickets(
    db: Session = Depends(get_db),
    usuario_actual = Depends(obtener_usuario_actual)
):
    usuario_db = db.query(models.usuario.Usuario).filter(models.usuario.Usuario.username == usuario_actual.username).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    email = getattr(usuario_db, 'email', '') or ''
    username = getattr(usuario_db, 'username', '') or ''
    es_propietario = email.lower() == "cealfarias@gmail.com" or username.lower() in ["cealfarias", "cesararias", "propietario"]
    tickets = crud.soporte.obtener_tickets_usuario(db, empresa_id=usuario_db.empresa_id, es_propietario=es_propietario)
    
    resultado = []
    for t in tickets:
        item = schemas.soporte.TicketSoporteResponse.from_orm(t)
        item.nombre_empresa = t.empresa.nombre if t.empresa else "Empresa"
        item.nombre_usuario = t.usuario.username if t.usuario else "Usuario"
        
        mensajes_fmt = []
        for m in t.mensajes:
            mf = schemas.soporte.MensajeTicketResponse.from_orm(m)
            mf.nombre_remitente = m.remitente.username if m.remitente else ("Propietario / Soporte" if m.es_propietario else "Usuario")
            mensajes_fmt.append(mf)
            
        item.mensajes = mensajes_fmt
        resultado.append(item)
        
    return resultado

@router.post("/tickets/{ticket_id}/mensajes", response_model=schemas.soporte.MensajeTicketResponse)
def enviar_mensaje(
    ticket_id: int,
    mensaje_in: schemas.soporte.MensajeTicketCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    usuario_actual = Depends(obtener_usuario_actual)
):
    usuario_db = db.query(models.usuario.Usuario).filter(models.usuario.Usuario.username == usuario_actual.username).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    ticket = crud.soporte.obtener_ticket_por_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado.")

    email = getattr(usuario_db, 'email', '') or ''
    username = getattr(usuario_db, 'username', '') or ''
    es_propietario = email.lower() == "cealfarias@gmail.com" or username.lower() in ["cealfarias", "admin", "propietario", "superadmin", "cesar", "cesararias", "soporte"] or usuario_db.rol == "admin"
    if not es_propietario and ticket.empresa_id != usuario_db.empresa_id:
        raise HTTPException(status_code=403, detail="No tiene permisos para responder a este ticket.")

    mensaje = crud.soporte.agregar_mensaje_ticket(
        db=db,
        ticket_id=ticket_id,
        usuario_id=usuario_db.id,
        contenido=mensaje_in.contenido,
        es_propietario=es_propietario
    )
    
    ticket_owner_email = ticket.usuario.email if ticket.usuario and ticket.usuario.email else "usuario@example.com"
    background_tasks.add_task(
        notificar_nuevo_mensaje_ticket,
        ticket.asunto,
        mensaje_in.contenido,
        usuario_db.username,
        ticket_owner_email
    )
    
    res = schemas.soporte.MensajeTicketResponse.from_orm(mensaje)
    res.nombre_remitente = usuario_db.username
    return res

@router.put("/tickets/{ticket_id}/estado", response_model=schemas.soporte.TicketSoporteResponse)
def cambiar_estado(
    ticket_id: int,
    nuevo_estado: str,
    db: Session = Depends(get_db),
    usuario_actual = Depends(obtener_usuario_actual)
):
    usuario_db = db.query(models.usuario.Usuario).filter(models.usuario.Usuario.username == usuario_actual.username).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    ticket = crud.soporte.cambiar_estado_ticket(db, ticket_id, nuevo_estado)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado.")

    res = schemas.soporte.TicketSoporteResponse.from_orm(ticket)
    res.nombre_empresa = ticket.empresa.nombre if ticket.empresa else "Empresa"
    res.nombre_usuario = ticket.usuario.username if ticket.usuario else "Usuario"
    return res
@router.get("/unread", response_model=int)
def contar_tickets_no_leidos(
    db: Session = Depends(get_db),
    usuario_actual = Depends(obtener_usuario_actual)
):
    usuario_db = db.query(models.usuario.Usuario).filter(models.usuario.Usuario.username == usuario_actual.username).first()
    if not usuario_db:
        return 0

    email = getattr(usuario_db, "email", "") or ""
    username = getattr(usuario_db, "username", "") or ""
    es_propietario = email.lower() == "cealfarias@gmail.com" or username.lower() in ["cealfarias", "admin", "propietario", "superadmin", "cesar", "cesararias", "soporte"] or usuario_db.rol == "admin"

    query = db.query(models.soporte.TicketSoporte)
    
    if es_propietario:
        query = query.filter(models.soporte.TicketSoporte.estado.in_(["ABIERTO", "ESPERANDO RESPUESTA", "REABIERTO"]))
    else:
        query = query.filter(models.soporte.TicketSoporte.empresa_id == usuario_db.empresa_id)
        query = query.filter(models.soporte.TicketSoporte.estado.in_(["RESPONDIDO", "EN_PROCESO"]))
        
    return query.count()

