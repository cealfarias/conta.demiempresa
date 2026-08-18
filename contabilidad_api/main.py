from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware

# ==================== MIGRACIONES EN TIEMPO DE ARRANQUE ====================
from config.database import engine
from sqlalchemy import text
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE usuarios ADD COLUMN empresa_id VARCHAR;"))
        print("[MIGRACIÓN] Se añadió la columna 'empresa_id' a la tabla 'usuarios'.")
except Exception as e:
    # Ignoramos si la columna ya existe
    pass

# ==================== ROUTERS CENTRALIZADOS ====================
from routers.api import api_router
# Módulo de seguridad
import auth_module

# ==================== PREVENCIÓN DE DOBLE SERVIDOR ====================
import utils.lock

# ==================== BASE DE DATOS ====================
from config.database import engine, Base
import models.cuenta
import models.partida
import models.periodo
import models.empresa
import models.manual

# Crear todas las tablas en la BD si no existen (ideal para Postgres en Render)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sistema de Contabilidad NIIF/NIFACES",
    description="API para manejar Catálogo, Partidas, Periodos y Reportes Financieros",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ==================== ROUTERS DE API (CONEXIÓN) ====================

# 1. Aplicamos el bloque maestro protegido (Inyecta los routers contables con JWT)
app.include_router(api_router)

# 2. El router de autenticación queda EXCLUIDO de la dependencia para permitir el login
app.include_router(auth_module.app.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)