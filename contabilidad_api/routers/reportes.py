from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from config.database import get_db
from crud import reportes as c_reportes

# 1. Inicialización obligatoria del enrutador para FastAPI
router = APIRouter(prefix="/api/v1/reportes", tags=["Reportes Financieros"])

# 2. Endpoint del Estado de Flujos de Efectivo
@router.get("/flujo-efectivo")
def api_estado_flujo_efectivo(
    empresa_id: str = Query(..., description="ID de la empresa activa"),
    anio: int = Query(..., description="Año fiscal a consultar"),
    mes: int = Query(..., description="Mes de corte (1-12)"),
    db: Session = Depends(get_db)
):
    """
    Genera el Estado de Flujos de Efectivo clasificando las variaciones
    según el mapeo de prefijos configurado para la empresa.
    """
    try:
        resultado = c_reportes.obtener_flujo_efectivo(
            db=db, 
            empresa_id=empresa_id, 
            anio=anio, 
            mes=mes
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar flujo de efectivo: {str(e)}")
    
@router.get("/balance-general/{empresa_id}/{anio}/{mes}")
def api_balance_general(
    empresa_id: str,
    anio: int,
    mes: int,
    nivel: int = Query(3, description="Nivel de profundidad NIIF (1 al 7)"),
    db: Session = Depends(get_db)
):
    """
    Genera el Balance General (Estado de Situación Financiera) procesando 
    los saldos acumulados de Activo, Pasivo y Patrimonio según el nivel NIIF.
    """
    try:
        resultado = c_reportes.obtener_balance_general(
            db=db, 
            empresa_id=empresa_id, 
            anio=anio, 
            mes=mes,
            nivel=nivel  # <-- Inyectamos el nuevo parámetro al motor CRUD
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar balance general: {str(e)}")


@router.get("/estado-resultados/{empresa_id}/{anio}/{mes}")
def api_estado_resultados(
    empresa_id: str,
    anio: int,
    mes: int,
    nivel: int = Query(3, description="Nivel de profundidad NIIF"),
    modo: str = Query("acumulado", description="Modo de consulta: acumulado o mensual"),
    db: Session = Depends(get_db)
):
    try:
        resultado = c_reportes.obtener_estado_resultados(
            db=db, empresa_id=empresa_id, anio=anio, mes=mes, nivel=nivel, modo=modo
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar estado de resultados: {str(e)}")