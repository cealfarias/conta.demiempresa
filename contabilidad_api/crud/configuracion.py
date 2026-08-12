from sqlalchemy.orm import Session
from models.configuracion import ConfiguracionContable
from schemas.configuracion import ConfiguracionContableBase

def guardar_reglas_contables(db: Session, reglas: ConfiguracionContableBase):
    # 1. Buscar si la empresa ya tiene reglas configuradas
    config_actual = db.query(ConfiguracionContable).filter(
        ConfiguracionContable.empresa_id == reglas.empresa_id
    ).first()

    # 2. Actualizar si existe
    if config_actual:
        config_actual.prefijo_ingresos = reglas.prefijo_ingresos
        config_actual.prefijo_gastos = reglas.prefijo_gastos
        config_actual.prefijo_liquidadora = reglas.prefijo_liquidadora
        # Nuevos campos mapeados para la actualización
        config_actual.cuenta_utilidad = reglas.cuenta_utilidad
        config_actual.exencion_isr = reglas.exencion_isr
    # 3. Insertar si es la primera vez
    else:
        nueva_config = ConfiguracionContable(
            empresa_id=reglas.empresa_id,
            prefijo_ingresos=reglas.prefijo_ingresos,
            prefijo_gastos=reglas.prefijo_gastos,
            prefijo_liquidadora=reglas.prefijo_liquidadora,
            # Nuevos campos mapeados para la inserción
            cuenta_utilidad=reglas.cuenta_utilidad,
            exencion_isr=reglas.exencion_isr
        )
        db.add(nueva_config)

    db.commit()
    return {"mensaje": "Reglas contables guardadas con éxito"}

def obtener_reglas_contables(db: Session, empresa_id: str):
    config = db.query(ConfiguracionContable).filter(
        ConfiguracionContable.empresa_id == empresa_id
    ).first()
    
    # Inyectar valores estructurales por defecto si la empresa es nueva
    if not config:
        return {
            "empresa_id": empresa_id,
            "prefijo_ingresos": "5",
            "prefijo_gastos": "4",
            "prefijo_liquidadora": "6",
            "cuenta_utilidad": "310601",
            "exencion_isr": False
        }
    return config