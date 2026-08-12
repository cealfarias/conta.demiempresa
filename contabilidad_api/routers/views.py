import os
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from models.partida import PartidaCabecera
from config.database import get_db

router = APIRouter()

# Configuramos los templates para este módulo de vistas
templates = Jinja2Templates(directory="templates")

# ==================== MANTENIMIENTO DE EMPRESAS Y USUARIOS ====================

@router.get("/empresas.html")
async def pagina_empresas(request: Request):
    """Mantenimiento y administración de empresas"""
    return templates.TemplateResponse(request=request, name="empresas.html", context={"request": request})

@router.get("/usuarios.html")
async def pagina_usuarios(request: Request):
    """Mantenimiento y administración de usuarios del sistema"""
    return templates.TemplateResponse(request=request, name="usuarios.html", context={"request": request})

# ==================== PÁGINAS HTML DEL SISTEMA CONTABLE ====================

@router.get("/")
@router.get("/login.html")
async def pagina_login(request: Request):
    """Muestra la pantalla de login procesada por Jinja2"""
    return templates.TemplateResponse(request=request, name="login.html", context={"request": request})

@router.get("/registro.html")
async def pagina_registro(request: Request):
    """Muestra la pantalla pública para el registro de nuevos usuarios"""
    return templates.TemplateResponse(request=request, name="registro.html", context={"request": request})

@router.get("/index.html")
async def home(request: Request):
    """Pantalla de selección de Empresa y Año (Paso 2 del flujo)"""
    return templates.TemplateResponse(request=request, name="index.html", context={"request": request})

@router.get("/dashboard.html")
async def dashboard(request: Request):
    """Dashboard principal con los KPIs contables"""
    return templates.TemplateResponse(request=request, name="dashboard.html", context={"request": request})

@router.get("/catalogo.html")
async def pagina_catalogo(request: Request):
    """Administración del catálogo de cuentas y políticas"""
    return templates.TemplateResponse(request=request, name="catalogo.html", context={"request": request})

@router.get("/saldos_mensuales.html")
async def pagina_saldos_mensuales(request: Request):
    """Consulta y cálculo de saldos mensuales distribuidos para una cuenta específica"""
    return templates.TemplateResponse(request=request, name="saldos_mensuales.html", context={"request": request})

@router.get("/movimientos_cuenta.html")
async def pagina_movimientos_cuenta(request: Request):
    """Auxiliar para revisar el detalle de movimientos de un mes en particular"""
    return templates.TemplateResponse(request=request, name="movimientos_cuenta.html", context={"request": request})

# ============ RUTA OBSOLETA REMOVIDA (pagina_partidas) ============

@router.get("/reportes.html")
async def pagina_reportes(request: Request):
    """Generación de Balance y Estado de Resultados"""
    return templates.TemplateResponse(request=request, name="reportes.html", context={"request": request})

@router.get("/importar_catalogo.html")
async def pagina_importar_catalogo(request: Request):
    """Interfaz de mapeo interactivo para importar CSV"""
    return templates.TemplateResponse(request=request, name="importar_catalogo.html", context={"request": request})

@router.get("/configuracion.html")
async def pagina_configuracion(request: Request):
    """Apertura y Cierre de Períodos Contables y Firmas"""
    return templates.TemplateResponse(request=request, name="configuracion.html", context={"request": request})

# ==================== MÓDULO DE PARTIDAS (NUEVAS RUTAS) ====================

@router.get("/partidas_resumen.html")
async def pagina_partidas_resumen(request: Request):
    """Tabla de resumen y navegación paginada de partidas"""
    return templates.TemplateResponse(request=request, name="partidas_resumen.html", context={"request": request})

# Ruta unificada para manejar el antiguo enlace y el nuevo acceso.
@router.get("/partidas.html")
@router.get("/partida.html")
async def pagina_partida(request: Request):
    """Espacio de trabajo para digitación de una partida contable (Acceso unificado)"""
    return templates.TemplateResponse(request=request, name="partida.html", context={"request": request})


    # Agregar en templates/views.py junto a los demás endpoints GET de páginas

@router.get("/importar_manual.html")
async def pagina_importar_manual(request: Request):
    """Interfaz de mapeo interactivo para importar las instrucciones del manual contable"""
    return templates.TemplateResponse(request=request, name="importar_manual.html", context={"request": request})

@router.get("/imprimir-partida/{partida_id}")
async def imprimir_partida(request: Request, partida_id: int, db: Session = Depends(get_db)):
    # Buscar la partida en la base de datos
    cabecera = db.query(PartidaCabecera).filter(PartidaCabecera.id == partida_id).first()
    
    if not cabecera:
        raise HTTPException(status_code=404, detail="Partida no encontrada")
    
    # Renderizar la plantilla pasándole el objeto 'cabecera' (que ya incluye los 'detalles' por la relación de SQLAlchemy)
    return templates.TemplateResponse(
        request=request, 
        name="impresion_partida.html", 
        context={"cabecera": cabecera}
    )

@router.get("/libro_diario.html")
async def pagina_libro_diario(request: Request):
    """Generación y visualización del Libro Diario Legal"""
    return templates.TemplateResponse(request=request, name="libro_diario.html", context={"request": request})

@router.get("/balance_comprobacion.html")
async def pagina_balance_comprobacion(request: Request):
    """Generación y visualización del Balance de Comprobación"""
    return templates.TemplateResponse(request=request, name="balance_comprobacion.html", context={"request": request})

@router.get("/estado_resultados.html")
async def pagina_estado_resultados(request: Request):
    """Generación y visualización del Estado de Resultados"""
    return templates.TemplateResponse(request=request, name="estado_resultados.html", context={"request": request})

@router.get("/balance_general.html")
async def pagina_balance_general(request: Request):
    """Generación y visualización del Balance General (Estado de Situación Financiera)"""
    return templates.TemplateResponse(request=request, name="balance_general.html", context={"request": request})

@router.get("/cierre_contable.html")
async def pagina_cierre_contable(request: Request):
    """Pantalla de ejecución del Cierre Contable Anual"""
    return templates.TemplateResponse(request=request, name="cierre_contable.html", context={"request": request})

@router.get("/mapeo_flujos.html")
async def pagina_mapeo_flujos(request: Request):
    """Pantalla de parametrización del Estado de Flujos de Efectivo"""
    return templates.TemplateResponse(request=request, name="mapeo_flujos.html", context={"request": request})

@router.get("/flujo_efectivo.html")
async def pagina_flujo_efectivo(request: Request):
    """Pantalla del Estado de Flujos de Efectivo"""
    return templates.TemplateResponse(request=request, name="flujo_efectivo.html", context={"request": request})

@router.get("/tendencias.html")
async def pagina_tendencias(request: Request):
    """Gráfico de análisis de tendencia de 12 meses para cualquier métrica financiera"""
    return templates.TemplateResponse(request=request, name="tendencias.html", context={"request": request})


@router.get("/logout")
async def pagina_logout(request: Request):
    """Página de cierre de sesión y agradecimiento"""
    return templates.TemplateResponse(request=request, name="logout.html", context={"request": request})

