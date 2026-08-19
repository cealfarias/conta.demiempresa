from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import bcrypt
import jwt
import pyotp
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# ================= IMPORTACIONES ARQUITECTURA UNIFICADA =================
# Importamos la conexión central y el modelo ORM del sistema contable
from config.database import get_db, Base, engine
from models.usuario import Usuario

# ================= CONFIGURACIÓN =================
SECRET_KEY = "LLAVE_MAESTRA_PARA_JWT_PRODUCCION"  # Cambiar en producción
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login", auto_error=False)

app = FastAPI(title="Módulo de Seguridad Integrado")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= FUNCIONES CRIPTOGRÁFICAS =================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

# ================= INICIALIZACIÓN DE DATOS =================
# Garantiza que la tabla de usuarios exista en sistema_contable.db
Base.metadata.create_all(bind=engine)

def crear_admin_por_defecto():
    # Usamos next() para extraer la sesión del generador get_db()
    db = next(get_db())
    
    # Auto-migración defensiva por si en Postgres ya existía la tabla pero no la columna "telefono"
    from sqlalchemy import text
    try:
        db.execute(text("ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(50);"))
        db.commit()
    except Exception:
        db.rollback()
        pass

    admin = None
    try:
        admin = db.query(Usuario).filter(Usuario.username == 'admin').first()
    except Exception as e:
        print(f"Error querying admin: {e}")
    
    if not admin:
        # Se incluyen los campos de auditoría exigidos por el modelo
        admin_user = Usuario(
            username="admin",
            email="admin@sistema.local",
            hashed_password=get_password_hash("admin123"),
            rol="admin",
            is_active=True,
            usuario_creacion="sistema_init",
            terminal_ip="127.0.0.1"
        )
        db.add(admin_user)
        db.commit()
    db.close()

# Ejecutar migracion de bd de 2FA y validacin del usuario inicial al arrancar el mdulo
try:
    from scripts.upgrade_db_2fa import upgrade
    upgrade()
except Exception as e:
    print(f"Advertencia: No se pudo ejecutar la actualizacin de 2FA automtica: {e}")

crear_admin_por_defecto()

# ================= UTILIDADES JWT =================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ================= ENDPOINTS =================
class TokenResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    rol: Optional[str] = None
    requires_2fa: Optional[bool] = False
    temp_token: Optional[str] = None

class Verify2FARequest(BaseModel):
    temp_token: str
    code: str

class Enable2FARequest(BaseModel):
    code: str

class TokenData(BaseModel):
    username: Optional[str] = None
    rol: Optional[str] = None
    nombre: Optional[str] = None
    id: Optional[str] = None

async def obtener_usuario_actual(request: Request) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o ausentes",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = None
    authorization: str = request.headers.get("Authorization")
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        
    if not token:
        token = request.query_params.get("token")
        
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        rol: str = payload.get("rol")
        
        nombre: str = payload.get("nombre", username)
        user_id: str = payload.get("id", username)
        
        if username is None or rol is None:
            raise credentials_exception
            
        return TokenData(username=username, rol=rol, nombre=nombre, id=user_id)
    except jwt.PyJWTError:
        raise credentials_exception

@app.post("/api/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Checklist de seguridad estructural (Máx. 72 bytes para bcrypt)
    if len(form_data.password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Búsqueda utilizando SQLAlchemy y el modelo unificado
    user = db.query(Usuario).filter(Usuario.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Validación booleana nativa de SQLAlchemy
    if not user.is_active:
        raise HTTPException(status_code=400, detail="El usuario está inactivo")

    # Si 2FA está habilitado, retornamos un token temporal
    if getattr(user, 'is_2fa_enabled', False):
        temp_token = create_access_token(
            data={"sub": user.username, "type": "temp_2fa"},
            expires_delta=timedelta(minutes=5)
        )
        return {
            "requires_2fa": True,
            "temp_token": temp_token
        }

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "rol": user.rol},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "rol": user.rol
    }

def validar_token_dependency(request: Request, token: str = Depends(oauth2_scheme)):
    public_paths = [
        "/api/v1/empresas/nueva",
        "/api/v1/usuarios/",
        "/api/v1/periodos/inicializar"
    ]
    
    path = request.url.path
    if path in public_paths and request.method == "POST":
        return None
        
    if path.startswith("/api/v1/usuarios/check-email/") and request.method == "GET":
        return None
        
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"valido": True, "usuario": payload.get("sub"), "rol": payload.get("rol")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

@app.get("/api/me")
def validar_token(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"valido": True, "usuario": payload.get("sub"), "rol": payload.get("rol")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

class GoogleLoginRequest(BaseModel):
    credential: str

@app.post("/api/login/google", response_model=TokenResponse)
def google_login(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        # Reemplazar por tu Client ID de produccion
        CLIENT_ID = "520602063183-02kdfek3f8vp2g146j2khacmhj4nbn6a.apps.googleusercontent.com"
        idinfo = id_token.verify_oauth2_token(req.credential, google_requests.Request(), CLIENT_ID)
        email = idinfo['email']
        
        user = db.query(Usuario).filter(Usuario.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no registrado en el sistema. Por favor crea un entorno primero.")
            
        if not user.is_active:
            raise HTTPException(status_code=400, detail="El usuario está inactivo.")

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "rol": user.rol},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "rol": user.rol
        }
    except ValueError:
        raise HTTPException(status_code=401, detail="Token de Google inválido")

@app.post("/api/login/verify-2fa", response_model=TokenResponse)
def verify_2fa(req: Verify2FARequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(req.temp_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        if token_type != "temp_2fa" or not username:
            raise HTTPException(status_code=401, detail="Token temporal invlido")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token temporal expirado o invlido")

    user = db.query(Usuario).filter(Usuario.username == username).first()
    if not user or not getattr(user, 'is_2fa_enabled', False) or not getattr(user, 'two_factor_secret', None):
        raise HTTPException(status_code=400, detail="2FA no est configurado para este usuario")

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(req.code):
        raise HTTPException(status_code=401, detail="Cdigo 2FA incorrecto")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "rol": user.rol},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "rol": user.rol
    }

# ================= RUTAS DE ADMINISTRACIN 2FA =================
@app.get("/api/2fa/status")
async def get_2fa_status(current_user: TokenData = Depends(obtener_usuario_actual), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == current_user.username).first()
    return {"is_2fa_enabled": getattr(user, 'is_2fa_enabled', False)}

@app.post("/api/2fa/generate")
async def generate_2fa(current_user: TokenData = Depends(obtener_usuario_actual), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == current_user.username).first()
    if getattr(user, 'is_2fa_enabled', False):
        raise HTTPException(status_code=400, detail="2FA ya est habilitado")

    secret = pyotp.random_base32()
    user.two_factor_secret = secret
    db.commit()

    totp = pyotp.TOTP(secret)
    # El provisioning URI se usa para generar el cdigo QR en el frontend
    uri = totp.provisioning_uri(name=user.username, issuer_name="Ecosistema Contable")
    
    return {"secret": secret, "uri": uri}

@app.post("/api/2fa/enable")
async def enable_2fa(req: Enable2FARequest, current_user: TokenData = Depends(obtener_usuario_actual), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == current_user.username).first()
    if getattr(user, 'is_2fa_enabled', False):
        raise HTTPException(status_code=400, detail="2FA ya est habilitado")
    
    if not getattr(user, 'two_factor_secret', None):
        raise HTTPException(status_code=400, detail="Debes generar el secreto 2FA primero")

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(req.code):
        raise HTTPException(status_code=401, detail="Cdigo incorrecto")

    user.is_2fa_enabled = True
    db.commit()
    return {"message": "2FA habilitado correctamente"}

@app.post("/api/2fa/disable")
async def disable_2fa(req: Enable2FARequest, current_user: TokenData = Depends(obtener_usuario_actual), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == current_user.username).first()
    if not getattr(user, 'is_2fa_enabled', False):
        raise HTTPException(status_code=400, detail="2FA no est habilitado")

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(req.code):
        raise HTTPException(status_code=401, detail="Cdigo incorrecto")

    user.is_2fa_enabled = False
    user.two_factor_secret = None
    db.commit()
    return {"message": "2FA deshabilitado correctamente"}