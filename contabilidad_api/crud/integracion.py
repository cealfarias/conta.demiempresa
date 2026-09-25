from sqlalchemy.orm import Session
from models.integracion import IntegracionAPI
import schemas.integracion as s_integracion
import uuid
import secrets

def generar_api_key():
    return f"sk_live_{secrets.token_urlsafe(32)}"

def crear_integracion(db: Session, empresa_id: str, integracion: s_integracion.IntegracionCreate, usuario: str):
    nueva_integracion = IntegracionAPI(
        id=str(uuid.uuid4()),
        empresa_id=empresa_id,
        nombre_app=integracion.nombre_app,
        api_key=generar_api_key(),
        activa=integracion.activa,
        usuario_creacion=usuario
    )
    db.add(nueva_integracion)
    db.commit()
    db.refresh(nueva_integracion)
    return nueva_integracion

def obtener_integraciones(db: Session, empresa_id: str):
    return db.query(IntegracionAPI).filter(IntegracionAPI.empresa_id == empresa_id).all()

def validar_api_key(db: Session, api_key: str):
    if not api_key:
        return None
    
    existing = db.query(IntegracionAPI).filter(IntegracionAPI.api_key == api_key, IntegracionAPI.activa == True).first()
    if existing:
        return existing

    # Soporte para llaves automáticas del ecosistema (ej: auto_empresa123)
    if api_key.startswith("auto_"):
        emp_id = api_key.replace("auto_", "")
        from models.empresa import Empresa
        empresa = db.query(Empresa).filter(Empresa.id == emp_id).first()
        if not empresa:
            empresa = db.query(Empresa).first()
        
        target_empresa_id = empresa.id if empresa else emp_id
        
        nueva_auto = IntegracionAPI(
            id=str(uuid.uuid4()),
            empresa_id=target_empresa_id,
            nombre_app="Facturacion Ecosistema (Auto)",
            api_key=api_key,
            activa=True,
            usuario_creacion="Sistema Ecosistema"
        )
        try:
            db.add(nueva_auto)
            db.commit()
            db.refresh(nueva_auto)
            return nueva_auto
        except Exception:
            db.rollback()
            return db.query(IntegracionAPI).filter(IntegracionAPI.api_key == api_key).first()

    return None

