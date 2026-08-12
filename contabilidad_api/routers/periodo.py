from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime
from pydantic import BaseModel

# ==================== IMPORTACIÓN DE MODELOS Y CONFIGURACIONES ====================
from models.periodo import ControlPeriodo, EjercicioFiscal
from config.database import get_db
from models.partida import PartidaCabecera 

router = APIRouter(
    prefix="/api/v1/periodos",
    tags=["Periodos"]
)

# Esquema Pydantic para la validación de la carga útil de entrada
class InicializarPeriodoIn(BaseModel):
    empresa_id: str
    anio: int
    usuario: str

@router.post("/inicializar")
def inicializar_ejercicio_fiscal(datos: InicializarPeriodoIn, db: Session = Depends(get_db)):
    """
    Inicializa un nuevo año contable con banderas detalladas en la consola de Uvicorn.
    """
    print("\n🚩 [API-PERIODOS - BANDERA 1] Petición POST recibida en /inicializar")
    print(f"   -> Payload del Frontend: empresa_id='{datos.empresa_id}', anio={datos.anio}, usuario='{datos.usuario}'")
    
    # 1. Validar existencia real en la tabla de control de períodos
    print("🚩 [API-PERIODOS - BANDERA 2] Consultando la tabla 'control_periodos' en la BD...")
    # 1. 🛡️ CONTROL DE INTEGRIDAD MODIFICADO PARA EL FRONTEND
    periodo_existente = db.query(ControlPeriodo).filter_by(
        empresa_id=datos.empresa_id, 
        anio=datos.anio
    ).first()

    if periodo_existente:
        print("🚩 [API-PERIODOS] El año ya existía. Devolviendo 200 para calmar al Frontend.")
        # En lugar de lanzar un HTTPException (400), devolvemos un éxito ficticio
        return {
            "mensaje": f"El ejercicio fiscal {datos.anio} ya estaba inicializado. Acceso concedido."
        }

    print("🚩 [API-PERIODOS - BANDERA 4] Validación aprobada. No hay duplicados. Iniciando guardado...")

    # 2. Registrar la cabecera del Ejercicio Fiscal
    try:
        print("   -> Mapeando registro en cabecera 'EjercicioFiscal'...")
        nuevo_ejercicio = EjercicioFiscal(
            empresa_id=datos.empresa_id,
            anio=datos.anio,
            fecha_inicio=datetime.date(datos.anio, 1, 1),
            fecha_fin=datetime.date(datos.anio, 12, 31),
            estado_cerrado=False,
            usuario_creacion=datos.usuario
        )
        db.add(nuevo_ejercicio)
        print("   -> [OK] Cabecera encolada exitosamente.")
    except Exception as e:
        print(f"   ❌ [ERROR CABECERA] No se pudo mapear la cabecera: {str(e)}")

    # 3. Registrar los 12 meses correspondientes en la tabla de control
    print("🚩 [API-PERIODOS - BANDERA 5] Mapeando los 12 meses en memoria para 'control_periodos'...")
    meses_a_insertar = []
    for mes in range(1, 13):
        nuevo_mes = ControlPeriodo(
            empresa_id=datos.empresa_id,
            anio=datos.anio,
            mes=mes,
            mes_abierto=True,
            anio_abierto=True,
            total_partidas=0
        )
        meses_a_insertar.append(nuevo_mes)
    print(f"   -> [OK] {len(meses_a_insertar)} meses listos para inserción masiva.")

    try:
        print("🚩 [API-PERIODOS - BANDERA 6] Ejecutando db.bulk_save_objects() y db.commit()...")
        db.bulk_save_objects(meses_a_insertar)
        db.commit()
        print("   -> 🎉 [ÉXITO TOTAL] ¡Base de datos actualizada y guardada en disco!")
    except Exception as e:
        print(f"   ❌ [ERROR CRÍTICO SQL] Fallo al aplicar commit en la base de datos: {str(e)}")
        db.rollback()
        print("   -> [ROLLBACK] Cambios revertidos de forma segura para evitar corrupción.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al asentar los períodos: {str(e)}"
        )

    return {
        "mensaje": f"Ejercicio fiscal {datos.anio} inicializado correctamente con 12 períodos abiertos."
    }

@router.get("/control/{empresa_id}/{anio}")
def obtener_periodos_ejercicio(empresa_id: str, anio: int, db: Session = Depends(get_db)):
    """
    Devuelve los 12 meses de un ejercicio contable específico para dibujarlos en la tabla del frontend.
    """
    print(f"\n🚩 [API-PERIODOS] Petición GET recibida en /control/{empresa_id}/{anio}")
    
    # Consultamos los períodos ordenados por mes (del 1 al 12)
    periodos = db.query(ControlPeriodo).filter_by(
        empresa_id=empresa_id, 
        anio=anio
    ).order_by(ControlPeriodo.mes).all()
    
    # Si la base de datos devuelve una lista vacía, lanzamos el verdadero 404
    if not periodos:
        print("   -> ❌ No se encontraron registros. Devolviendo 404 Not Found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Año no inicializado o sin registros en la base de datos."
        )
        
    print(f"   -> [OK] Se encontraron {len(periodos)} meses. Enviando al frontend.")
    return periodos

# ==================== NUEVO ENDPOINT QUIRÚRGICO ====================
@router.get("/ejercicios/{empresa_id}", response_model=list[int])
def obtener_ejercicios_por_empresa(empresa_id: str, db: Session = Depends(get_db)):
    """
    Devuelve un listado de años fiscales registrados para alimentar los combobox del sistema.
    """
    ejercicios = db.query(EjercicioFiscal.anio).filter_by(
        empresa_id=empresa_id
    ).group_by(EjercicioFiscal.anio).order_by(EjercicioFiscal.anio.desc()).all()
    
    if not ejercicios:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay ejercicios para esta empresa.")
        
    return [ej[0] for ej in ejercicios]
# ===================================================================

@router.put("/cierre-mes/{empresa_id}/{anio}/{mes}")
def cerrar_mes(empresa_id: str, anio: int, mes: int, db: Session = Depends(get_db)):
    """
    Cierra un mes específico. No requiere orden cronológico.
    """
    periodo = db.query(ControlPeriodo).filter_by(
        empresa_id=empresa_id, 
        anio=anio, 
        mes=mes
    ).first()

    if not periodo:
        raise HTTPException(status_code=404, detail="El mes especificado no existe o no ha sido inicializado.")
    
    if not periodo.mes_abierto:
        raise HTTPException(status_code=400, detail=f"El mes {mes} ya se encontraba cerrado.")

    periodo.mes_abierto = False
    db.commit()
    
    return {"mensaje": f"El mes {mes} del año {anio} ha sido cerrado exitosamente."}

@router.put("/cierre-anio/{empresa_id}/{anio}")
def cerrar_ejercicio_fiscal(empresa_id: str, anio: int, db: Session = Depends(get_db)):
    """
    Sella el año completo. REQUISITO: Los 12 meses deben estar cerrados previamente.
    """
    # 1. Extraer los 12 meses
    periodos = db.query(ControlPeriodo).filter_by(empresa_id=empresa_id, anio=anio).all()
    
    if len(periodos) < 12:
        raise HTTPException(status_code=400, detail="Estructura corrupta: No se encontraron los 12 meses del ejercicio.")

    # 2. Validar regla de negocio: Ningún mes puede estar abierto
    meses_abiertos = [p.mes for p in periodos if p.mes_abierto]
    if meses_abiertos:
        raise HTTPException(
            status_code=403, 
            detail=f"Imposible cerrar el año. Faltan por cerrar los meses: {meses_abiertos}"
        )

    # 3. Extraer la cabecera del Ejercicio Fiscal
    ejercicio = db.query(EjercicioFiscal).filter_by(empresa_id=empresa_id, anio=anio).first()
    if not ejercicio:
        raise HTTPException(status_code=404, detail="Cabecera del ejercicio fiscal no encontrada.")
    
    if ejercicio.estado_cerrado:
        raise HTTPException(status_code=400, detail="El ejercicio fiscal ya estaba cerrado.")

    # 4. Sellar el año en cabecera y en el detalle de los 12 meses
    ejercicio.estado_cerrado = True
    for p in periodos:
        p.anio_abierto = False
        
    db.commit()

    return {"mensaje": f"Cierre anual {anio} ejecutado con éxito. El ejercicio ha quedado sellado de forma definitiva."}



@router.get("/verificar-borradores/{empresa_id}/{anio}/{mes}")
def verificar_borradores(empresa_id: str, anio: int, mes: int, db: Session = Depends(get_db)):
    """
    Realiza una auditoría pasiva para contar cuántas partidas en estado 'Borrador' 
    existen en un período contable específico.
    """
    try:
        # Nota: Ajusta 'PartidaCabecera' y 'estado' si tus nombres de modelo/columna varían
        conteo = db.query(PartidaCabecera).filter(
            PartidaCabecera.empresa_id == empresa_id,
            PartidaCabecera.anio == anio,
            PartidaCabecera.mes == mes,
            PartidaCabecera.estado == 'Borrador'
        ).count()
        
        return {"conteo_borradores": conteo}
    except Exception as e:
        print(f"❌ [ERROR AUDITORÍA] Fallo al verificar borradores: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno al auditar partidas.")