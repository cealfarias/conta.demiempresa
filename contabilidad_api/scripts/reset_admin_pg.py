import os
import sys
from dotenv import load_dotenv
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

load_dotenv()
pg_url = os.getenv("DATABASE_URL")
if pg_url.startswith("postgres://"):
    pg_url = pg_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(pg_url)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

with engine.connect() as conn:
    result = conn.execute(text("SELECT * FROM usuarios WHERE username='admin'")).fetchone()
    if not result:
        print("Usuario admin no existe. Creando...")
        hashed = pwd_context.hash('admin123')
        conn.execute(text("INSERT INTO usuarios (username, hashed_password, rol, activo) VALUES ('admin', :h, 'admin', 1)"), {"h": hashed})
        conn.commit()
        print("Usuario admin creado.")
    else:
        print("Usuario admin existe. Reseteando password a admin123...")
        hashed = pwd_context.hash('admin123')
        conn.execute(text("UPDATE usuarios SET hashed_password=:h WHERE username='admin'"), {"h": hashed})
        conn.commit()
        print("Password reseteada.")
