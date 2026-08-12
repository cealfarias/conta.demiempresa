from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

# ==================== IMPORTACIÓN DE MODELOS ====================
from models.manual import ManualContable
from models.cuenta import CuentaContable
from config.database import get_db

router = APIRouter(
    prefix="/api/v1/manual", 
    tags=["Manual Contable"]
)

# Esquema de respuesta ad-hoc para el Offcanvas de la vista
class ManualResponse(BaseModel):
    cuenta_codigo: str
    nombre_cuenta: str
    descripcion_rubro: str
    se_carga_por: str
    se_abona_por: str
    significado_saldo: str

# Esquemas de entrada para el payload de la importación masiva
class LineaManualItem(BaseModel):
    cuenta_codigo: str
    descripcion_rubro: str
    se_carga_por: str
    se_abona_por: str
    significado_saldo: str

class ImportarManualPayload(BaseModel):
    lineas: List[LineaManualItem]
    terminal_ip: str
    usuario_creacion: str

@router.get("/{cuenta_codigo}", response_model=ManualResponse)
def obtener_manual_por_cuenta(cuenta_codigo: str, db: Session = Depends(get_db)):
    """
    Busca el detalle técnico del manual para una cuenta contable específica.
    """
    manual = db.query(ManualContable).filter(ManualContable.cuenta_codigo == cuenta_codigo).first()
    
    if not manual:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="El manual contable no está configurado para la cuenta seleccionada."
        )

    # Extraer el nombre de la cuenta para mejorar la UX en el frontend
    cuenta = db.query(CuentaContable).filter(CuentaContable.cuentas == cuenta_codigo).first()
    nombre_cta = cuenta.nombre if cuenta else "Cuenta Desconocida"

    return {
        "cuenta_codigo": manual.cuenta_codigo,
        "nombre_cuenta": nombre_cta,
        "descripcion_rubro": manual.descripcion_rubro,
        "se_carga_por": manual.se_carga_por,
        "se_abona_por": manual.se_abona_por,
        "significado_saldo": manual.significado_saldo
    }

@router.post("/importar-masivo", status_code=status.HTTP_201_CREATED)
def importar_manual_masivo(payload: ImportarManualPayload, db: Session = Depends(get_db)):
    """
    Procesa e importa de forma masiva las líneas del manual contable correlacionadas por el usuario.
    """
    if not payload.lineas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no contiene líneas válidas para procesar."
        )
        
    try:
        registros_creados = 0
        for item in payload.lineas:
            # Verificar si ya existe un registro para esa cuenta contable
            registro_existente = db.query(ManualContable).filter(
                ManualContable.cuenta_codigo == item.cuenta_codigo
            ).first()
            
            if registro_existente:
                # Actualización de datos si ya existe la configuración del manual para la cuenta
                registro_existente.descripcion_rubro = item.descripcion_rubro
                registro_existente.se_carga_por = item.se_carga_por
                registro_existente.se_abona_por = item.se_abona_por
                registro_existente.significado_saldo = item.significado_saldo
            else:
                # Inserción de un nuevo registro en el manual contable
                nuevo_manual = ManualContable(
                    cuenta_codigo=item.cuenta_codigo,
                    descripcion_rubro=item.descripcion_rubro,
                    se_carga_por=item.se_carga_por,
                    se_abona_por=item.se_abona_por,
                    significado_saldo=item.significado_saldo
                )
                db.add(nuevo_manual)
            
            registros_creados += 1
            
        db.commit()
        return {
            "status": "success",
            "mensaje": f"Se procesaron e importaron {registros_creados} registros del manual con éxito."
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno procesando la importación: {str(e)}"
        )