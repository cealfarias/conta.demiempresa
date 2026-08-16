from fastapi import APIRouter, Depends
from auth_module import validar_token

# ==================== IMPORTACIÓN DE ROUTERS DE NEGOCIO CONTABLE ====================
from routers.empresa import router as empresa_router
from routers.cuenta import router as cuenta_router
from routers.partida import router as partida_router
from routers.periodo import router as periodo_router
from routers.manual import router as manual_router
from routers.reportes import router as reportes_router # <-- NUEVA LÍNEA
from routers.usuario import router as usuario_router
from routers.soporte import router as soporte_router

# ==================== ROUTER MAESTRO PROTEGIDO ====================
api_router = APIRouter(dependencies=[Depends(validar_token)])

# Inclusión de los submódulos del sistema
api_router.include_router(empresa_router)
api_router.include_router(cuenta_router)
api_router.include_router(partida_router)
api_router.include_router(periodo_router)
api_router.include_router(manual_router)
api_router.include_router(reportes_router) # <-- NUEVA LÍNEA
api_router.include_router(usuario_router)
api_router.include_router(soporte_router)