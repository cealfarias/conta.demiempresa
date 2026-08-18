from fastapi import APIRouter, Depends, HTTPException, status
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
def create_user(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    db_user = crud_usuario.get_usuario_by_username(db, username=usuario.username)
    if db_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")
    
    db_email = crud_usuario.get_usuario_by_email(db, email=usuario.email)
    if db_email:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
        
    return crud_usuario.create_usuario(db=db, usuario=usuario)

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