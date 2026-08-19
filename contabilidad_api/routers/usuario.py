from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from schemas.usuario import Usuario, UsuarioCreate, UsuarioUpdate
from crud import usuario as crud_usuario

router = APIRouter(
    prefix="/api/v1/usuarios",
    tags=["Usuarios"]
)

@router.post("/", response_model=Usuario, status_code=status.HTTP_201_CREATED)
def create_user(usuario: UsuarioCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_user = crud_usuario.get_usuario_by_username(db, username=usuario.username)
    if db_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")
    
    db_email = crud_usuario.get_usuario_by_email(db, email=usuario.email)
    if db_email:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
        
    if usuario.empresa_id:
        current_users = crud_usuario.get_usuarios(db, empresa_id=usuario.empresa_id, skip=0, limit=100)
        if len(current_users) >= 4:
            raise HTTPException(status_code=402, detail="Límite de licencia alcanzado. Máximo 4 usuarios permitidos.")
            
    nuevo_usuario = crud_usuario.create_usuario(db=db, usuario=usuario)
    
    # Crear ticket interno automtico para que el Admin d la bienvenida
    if nuevo_usuario.empresa_id:
        import crud.soporte
        import schemas.soporte
        
        ticket_data = schemas.soporte.TicketSoporteCreate(
            asunto="✨ Nuevo Registro en la Plataforma",
            categoria="Sistema",
            prioridad="Alta",
            mensaje_inicial=f"Hola equipo, el usuario {nuevo_usuario.username} ({nuevo_usuario.email}) se ha registrado en la plataforma con el rol de {nuevo_usuario.rol}. Usa este hilo para darle una cálida bienvenida."
        )
        ticket = crud.soporte.crear_ticket_soporte(
            db=db,
            ticket_data=ticket_data,
            empresa_id=nuevo_usuario.empresa_id,
            usuario_id=nuevo_usuario.id
        )
        
        from utils.email import notificar_nuevo_ticket
        # Notificar al administrador (propietario)
        background_tasks.add_task(
            notificar_nuevo_ticket,
            ticket_data.asunto,
            ticket_data.mensaje_inicial,
            "cealfarias@gmail.com"
        )
        
    return nuevo_usuario

@router.get("/check-email/{email}")
def check_email(email: str, db: Session = Depends(get_db)):
    db_email = crud_usuario.get_usuario_by_email(db, email=email)
    if db_email:
        return {"exists": True}
    return {"exists": False}

@router.get("/", response_model=List[Usuario])
def read_users(empresa_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    usuarios = crud_usuario.get_usuarios(db, empresa_id=empresa_id, skip=skip, limit=limit)
    return usuarios

@router.get("/{usuario_id}", response_model=Usuario)
def read_user(usuario_id: int, db: Session = Depends(get_db)):
    db_user = crud_usuario.get_usuario(db, usuario_id=usuario_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return db_user

@router.put("/{usuario_id}", response_model=Usuario)
def update_user(usuario_id: int, usuario_update: UsuarioUpdate, db: Session = Depends(get_db)):
    db_user = crud_usuario.update_usuario(db, usuario_id=usuario_id, usuario_update=usuario_update)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return db_user

@router.delete("/{usuario_id}")
def delete_user(usuario_id: int, db: Session = Depends(get_db)):
    db_user = crud_usuario.delete_usuario(db, usuario_id=usuario_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"mensaje": "Usuario eliminado exitosamente"}