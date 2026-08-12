from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import datetime

# ==================== IMPORTACIÓN DE MODELOS ====================
from models.manual import ManualContable
from models.cuenta import CuentaContable
from config.database import get_db

router = APIRouter(
    prefix="/api/v1/manual", 
    tags=["Manual Contable"]
)

# Esquema de respuesta para el Offcanvas de la vista (Filtra por contexto)
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
    lineas: list[LineaManualItem]
    terminal_ip: str
    usuario_creacion: str
    empresa_id: str  # Contexto inyectado de la empresa seleccionada
    anio: int        # Contexto inyectado del año seleccionado

@router.get("/{empresa_id}/{anio}/{cuenta_codigo}", response_model=ManualResponse)
def obtener_manual_por_cuenta(empresa_id: str, anio: int, cuenta_codigo: str, db: Session = Depends(get_db)):
    """
    Busca el detalle técnico del manual para una cuenta contable específica
    bajo el contexto de una empresa y año determinados.
    """
    manual = db.query(ManualContable).filter(
        ManualContable.cuenta_codigo == cuenta_codigo,
        ManualContable.empresa_id == empresa_id,
        ManualContable.anio == anio
    ).first()
    
    if not manual:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="El manual contable no está configurado para la cuenta seleccionada en este ejercicio."
        )

    # Extraer el nombre de la cuenta del catálogo bajo el mismo aislamiento conceptual
    cuenta = db.query(CuentaContable).filter(
        CuentaContable.cuentas == cuenta_codigo,
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.anio == anio
    ).first()
    
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
    Procesa e importa masivamente las líneas del manual contable asignándoles
    la empresa y año seleccionados actualmente en el sistema.
    """
    if not payload.lineas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no contiene líneas válidas para procesar."
        )
        
    try:
        registros_procesados = 0
        cuentas_no_encontradas = []

        for item in payload.lineas:
            # Limpieza de comillas dobles residuales del string del CSV
            carga_limpia = item.se_carga_por.replace('""', '').strip()
            abono_limpio = item.se_abona_por.replace('""', '').strip()
            codigo_limpio = item.cuenta_codigo.strip()

            if not codigo_limpio:
                continue

            # 1. Validar rigurosamente que la cuenta exista en el catálogo para dicha empresa y año
            cuenta_existe = db.query(CuentaContable).filter(
                CuentaContable.cuentas == codigo_limpio,
                CuentaContable.empresa_id == payload.empresa_id,
                CuentaContable.anio == payload.anio
            ).first()

            if not cuenta_existe:
                # Almacenar la cuenta que falló la validación para informar al usuario
                cuentas_no_encontradas.append(codigo_limpio)
                continue

            # 2. Verificar existencia previa en el manual contable para actualización (Upsert)
            registro_existente = db.query(ManualContable).filter(
                ManualContable.cuenta_codigo == codigo_limpio,
                ManualContable.empresa_id == payload.empresa_id,
                ManualContable.anio == payload.anio
            ).first()
            
            if registro_existente:
                # Actualización de la ficha técnica del manual existente
                registro_existente.descripcion_rubro = item.descripcion_rubro
                registro_existente.se_carga_por = carga_limpia if carga_limpia else "No especificado"
                registro_existente.se_abona_por = abono_limpio if abono_limpio else "No especificado"
                registro_existente.significado_saldo = item.significado_saldo
                registro_existente.usuario_modificacion = payload.usuario_creacion
                registro_existente.fecha_modificacion = datetime.datetime.now(datetime.timezone.utc)
                registro_existente.terminal_ip = payload.terminal_ip
            else:
                # Inserción con herencia de claves y campos obligatorios de auditoría
                nuevo_manual = ManualContable(
                    empresa_id=payload.empresa_id,
                    anio=payload.anio,
                    cuenta_codigo=codigo_limpio,
                    descripcion_rubro=item.descripcion_rubro,
                    se_carga_por=carga_limpia if carga_limpia else "No especificado",
                    se_abona_por=abono_limpio if abono_limpio else "No especificado",
                    significado_saldo=item.significado_saldo,
                    base_medicion=None,
                    usuario_creacion=payload.usuario_creacion,
                    fecha_creacion=datetime.datetime.now(datetime.timezone.utc),
                    terminal_ip=payload.terminal_ip
                )
                db.add(nuevo_manual)
            
            registros_procesados += 1
            
        # Romper el flujo si no se pudo procesar absolutamente ninguna cuenta debido a desajustes de catálogo
        if registros_procesados == 0:
            db.rollback()
            muestra_cuentas = ", ".join(cuentas_no_encontradas[:5])
            total_fallas = len(cuentas_no_encontradas)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ninguna cuenta del archivo coincide con el Catálogo de Cuentas activo para la Empresa {payload.empresa_id} y Año {payload.anio}. Verifique códigos. Muestra de fallas ({total_fallas}): [{muestra_cuentas}]"
            )

        db.commit()
        
        mensaje_retorno = f"Se procesaron e importaron {registros_procesados} registros del manual con éxito."
        
        # Se envía el detalle estructurado de los elementos excluidos para ser dibujado en la tabla HTML
        return {
            "status": "success",
            "mensaje": mensaje_retorno,
            "omitidas": cuentas_no_encontradas,
            "total_omitidas": len(cuentas_no_encontradas)
        }
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno procesando la importación: {str(e)}"
        )