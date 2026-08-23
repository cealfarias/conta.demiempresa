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
    pass

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE sop_ticket ALTER COLUMN empresa_id DROP NOT NULL;"))
except Exception as e:
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
import models.usuario
import models.soporte
import models.aceptacion_terminos

# Auto-migraciones simples para columnas agregadas recientemente
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(50);"))
except Exception:
    pass

# Migraciones para campos de cierre fiscal en configuracion_contable
for col, default in [
    ("cuenta_utilidades_retenidas", "'310501'"),
    ("cuenta_perdidas_acumuladas", "'310602'"),
    ("porcentaje_reserva_legal", "'7'"),
    ("cuenta_reserva_legal", "'310401'"),
    ("tasa_isr", "'25'"),
    ("cuenta_isr_por_pagar", "'210301'"),
    ("cuenta_gasto_isr", "'420101'"),
]:
    try:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE configuracion_contable ADD COLUMN {col} VARCHAR(20) DEFAULT {default};"))
    except Exception:
        pass

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

# 3. Router de integraciones (mixto: JWT y API Key para webhook)
from routers.integracion import router as integracion_router
app.include_router(integracion_router)

# 4. Router de aceptación de términos (PÚBLICO - se usa durante el registro sin JWT)
from routers.aceptacion_terminos import router as terminos_router
app.include_router(terminos_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)