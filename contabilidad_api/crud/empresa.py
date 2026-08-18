from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import models.empresa as m_empresa
import schemas.empresa as s_empresa

def registrar_nueva_empresa(db: Session, empresa_in: s_empresa.EmpresaCreate):
    existe = db.query(m_empresa.Empresa).filter(m_empresa.Empresa.id == empresa_in.id).first()
    if existe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El ID de la empresa ya se encuentra registrado.")
    
    nueva_empresa = m_empresa.Empresa(
        id=empresa_in.id,
        razon_social=empresa_in.razon_social,
        nombre_comercial=empresa_in.nombre_comercial,
        nit=empresa_in.nit,
        nrc=empresa_in.nrc,
        giro=empresa_in.giro,
        normativa=empresa_in.normativa,
        usuario_creacion=empresa_in.usuario_creacion,
        terminal_ip=empresa_in.terminal_ip
    )
    db.add(nueva_empresa)
    db.commit()
    db.refresh(nueva_empresa)
    return nueva_empresa

def obtener_todas_empresas(db: Session, usuario: str = None, rol: str = None):
    # Si el usuario es administrador global, o si no se especificó filtro, se devuelven todas
    if not usuario or rol == "admin":
        return db.query(m_empresa.Empresa).all()
        
    from models.usuario import Usuario
    user_obj = db.query(Usuario).filter(Usuario.username == usuario).first()
    
    if user_obj and getattr(user_obj, 'empresa_id', None):
        # Si el usuario tiene una empresa asignada (ej: Contador de DEMI), solo ve esa empresa
        return db.query(m_empresa.Empresa).filter(m_empresa.Empresa.id == user_obj.empresa_id).all()
        
    # Si es un usuario normal sin empresa fija (ej: dueño local que creó empresas), ve las que él creó
    return db.query(m_empresa.Empresa).filter(m_empresa.Empresa.usuario_creacion == usuario).all()