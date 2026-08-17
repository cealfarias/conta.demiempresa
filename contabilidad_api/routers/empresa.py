from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import schemas.empresa as s_empresa
import crud.empresa as c_empresa
from config.database import get_db
from crud import configuracion as c_configuracion
from schemas import configuracion as s_configuracion
from fastapi import HTTPException, Depends
from crud import flujo_efectivo as c_flujo
from schemas import flujo_efectivo as s_flujo
from auth_module import obtener_usuario_actual, TokenData

# El prefijo maneja la base "/api/v1/empresas"
router = APIRouter(prefix="/api/v1/empresas", tags=["Control General de Empresas"])

# CAMBIO AQUÍ: Se añade "/nueva" para escuchar en /api/v1/empresas/nueva
@router.post("/nueva", response_model=s_empresa.EmpresaResponse)
def crear_empresa(empresa: s_empresa.EmpresaCreate, db: Session = Depends(get_db)):
    return c_empresa.registrar_nueva_empresa(db=db, empresa_in=empresa)

@router.get("/todas", response_model=List[s_empresa.EmpresaResponse])
def listar_empresas(db: Session = Depends(get_db), current_user: TokenData = Depends(obtener_usuario_actual)):
    return c_empresa.obtener_todas_empresas(db=db, usuario=current_user.username, rol=current_user.rol)


@router.post("/reglas-contables")
def api_guardar_reglas_contables(
    reglas: s_configuracion.ConfiguracionContableBase,
    db: Session = Depends(get_db)
):
    """
    Guarda o actualiza de manera masiva los prefijos de las reglas contables de la empresa.
    """
    # Seguridad: Validación estricta a nivel servidor contra peticiones anómalas
    if int(reglas.prefijo_liquidadora) < 6:
        raise HTTPException(status_code=400, detail="Operación rechazada: El dígito liquidador no puede ser menor a 6.")
        
    if reglas.prefijo_ingresos == reglas.prefijo_gastos:
        raise HTTPException(status_code=400, detail="Operación rechazada: Los prefijos de ingresos y gastos no pueden ser iguales.")

    return c_configuracion.guardar_reglas_contables(db=db, reglas=reglas)

@router.get("/reglas-contables/{empresa_id}")
def api_obtener_reglas_contables(
    empresa_id: str,
    db: Session = Depends(get_db)
):
    """
    Obtiene las reglas contables activas para inyectarlas en el frontend o en los reportes.
    """
    return c_configuracion.obtener_reglas_contables(db=db, empresa_id=empresa_id)

@router.post("/mapeo-flujos")
def api_guardar_mapeo_flujos(
    request: s_flujo.MapeoFlujoMasivoRequest,
    db: Session = Depends(get_db)
):
    """Guarda la configuración de mapeo de flujos de efectivo para la empresa."""
    return c_flujo.guardar_mapeo_flujos(db=db, request=request)

@router.get("/mapeo-flujos/{empresa_id}")
def api_obtener_mapeo_flujos(
    empresa_id: str,
    db: Session = Depends(get_db)
):
    """Obtiene la configuración de mapeo de flujos de efectivo de la empresa."""
    return c_flujo.obtener_mapeo_flujos(db=db, empresa_id=empresa_id)