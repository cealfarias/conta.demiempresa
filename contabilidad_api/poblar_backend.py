import os
from pathlib import Path

def poblar_logica_backend():
    base_dir = Path(".")
    archivos = {}

    # ==================== SCHEMAS ====================
    archivos[base_dir / "schemas" / "auditoria.py"] = """from pydantic import BaseModel, Field

class AuditoriaBase(BaseModel):
    usuario_operacion: str = Field(..., description="Nombre de usuario extraído de la sesión del Login")
    terminal_ip: str = Field(..., description="IP del cliente capturada por el middleware")
"""

    archivos[base_dir / "schemas" / "empresa.py"] = """from pydantic import BaseModel, Field, field_validator
from typing import Optional
from .auditoria import AuditoriaBase

class EmpresaBase(BaseModel):
    id: str = Field(..., min_length=2, max_length=10, description="Código identificador único")
    razon_social: str = Field(..., min_length=1)
    nombre_comercial: Optional[str] = None
    nit: str = Field(..., description="NIT formato salvadoreño")
    nrc: Optional[str] = None
    giro: str = Field(..., min_length=1)
    normativa: str = Field(..., description="Debe ser NIIF_PYMES o NIFACES")

    @field_validator("normativa")
    def validar_normativa_salvador(cls, v):
        if v not in {"NIIF_PYMES", "NIFACES"}:
            raise ValueError("La normativa debe ser estrictamente NIIF_PYMES o NIFACES")
        return v

class EmpresaCreate(EmpresaBase, AuditoriaBase):
    pass

class EmpresaResponse(EmpresaBase):
    class Config:
        from_attributes = True
"""

    archivos[base_dir / "schemas" / "cuenta.py"] = """from pydantic import BaseModel, Field, field_validator
from typing import Optional
from .auditoria import AuditoriaBase

class CuentaContableBase(BaseModel):
    cuentas: str = Field(..., description="Código estructurado numérico")
    nombre: str = Field(..., min_length=1)
    ctadep: Optional[str] = None
    nivel: int = Field(..., gt=0)
    resumen: bool = Field(True, description="True si consolida saldos, False si recibe partidas directas")

    @field_validator("nivel")
    def verificar_niveles_universales(cls, v, info):
        codigo = info.data.get("cuentas")
        if v == 1 and codigo not in {"1", "2", "3", "4", "5", "6", "7"}:
            raise ValueError("El nivel 1 corresponde únicamente a las clases del 1 al 7 fijadas por la normativa")
        return v

class CuentaContableCreate(CuentaContableBase, AuditoriaBase):
    pass

class CuentaContableResponse(CuentaContableBase):
    class Config:
        from_attributes = True
"""

    archivos[base_dir / "schemas" / "periodo.py"] = """from pydantic import BaseModel, Field
from datetime import date

class EjercicioFiscalCreate(BaseModel):
    empresa_id: str
    anio: int = Field(..., ge=2000, le=2100)
    fecha_inicio: date
    fecha_fin: date
    usuario_operacion: str

class ControlPeriodoUpdate(BaseModel):
    empresa_id: str
    anio: int
    mes: int
    mes_abierto: bool
"""

    archivos[base_dir / "schemas" / "partida.py"] = """from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import List, Optional
from decimal import Decimal
from .auditoria import AuditoriaBase

class PartidaDetalleBase(BaseModel):
    cuenta_codigo: str
    debe: Decimal = Field(Decimal("0.00"), ge=0)
    haber: Decimal = Field(Decimal("0.00"), ge=0)
    concepto_detalle: Optional[str] = None

class PartidaDetalleCreate(PartidaDetalleBase):
    pass

class PartidaDetalleResponse(PartidaDetalleBase):
    id: int
    partida_id: int
    class Config:
        from_attributes = True

class PartidaCabeceraCreate(AuditoriaBase):
    empresa_id: str
    fecha: date
    concepto: str
    numero_partida: int
    detalles: List[PartidaDetalleCreate]

    @field_validator("detalles")
    def verificar_partida_doble_estricta(cls, v):
        if len(v) < 2:
            raise ValueError("Una partida contable exige al menos dos líneas de movimientos")
        total_debe = sum(linea.debe for linea in v)
        total_haber = sum(linea.haber for linea in v)
        if total_debe != total_haber:
            raise ValueError(f"Descuadre contable: Suma Debe ({total_debe}) != Suma Haber ({total_haber})")
        return v

class PartidaCabeceraResponse(BaseModel):
    id: int
    empresa_id: str
    anio: int
    mes: int
    numero_partida: int
    fecha: date
    concepto: str
    estado: str
    detalles: List[PartidaDetalleResponse]
    class Config:
        from_attributes = True
"""

    # ==================== CRUD ====================
    archivos[base_dir / "crud" / "empresa.py"] = """from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import models.empresa as m_empresa
import schemas.empresa as s_empresa

def registrar_nueva_empresa(db: Session, empresa_in: s_empresa.EmpresaCreate):
    existe = db.query(m_empresa.Empresa).filter(m_empresa.Empresa.id == empresa_in.id).first()
    if existe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El ID de la empresa ya se encuentra registrado.")
    
    nueva_empresa = m_empresa.Empresa(
        id=empresa_in.id,
        razon_social=empresa_in.razon_social,
        nombre_comercial=empresa_in.nombre_comercial,
        nit=empresa_in.nit,
        nrc=empresa_in.nrc,
        giro=empresa_in.giro,
        normativa=empresa_in.normativa,
        usuario_creacion=empresa_in.usuario_operacion,
        terminal_ip=empresa_in.terminal_ip
    )
    db.add(nueva_empresa)
    db.commit()
    db.refresh(nueva_empresa)
    return nueva_empresa
"""

    archivos[base_dir / "crud" / "cuenta.py"] = """from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import models.cuenta as m_cuenta
import schemas.cuenta as s_cuenta

def registrar_cuenta_catalogo(db: Session, cuenta_in: s_cuenta.CuentaContableCreate):
    existe = db.query(m_cuenta.CuentaContable).filter(m_cuenta.CuentaContable.cuentas == cuenta_in.cuentas).first()
    if existe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"La cuenta {cuenta_in.cuentas} ya existe en este catálogo.")
    
    if cuenta_in.ctadep:
        padre = db.query(m_cuenta.CuentaContable).filter(m_cuenta.CuentaContable.cuentas == cuenta_in.ctadep).first()
        if not padre:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"La cuenta padre {cuenta_in.ctadep} no existe.")
        if not padre.resumen:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede colgar una subcuenta de una cuenta clasificada de detalle.")

    nueva_cuenta = m_cuenta.CuentaContable(
        cuentas=cuenta_in.cuentas,
        nombre=cuenta_in.nombre,
        ctadep=cuenta_in.ctadep,
        nivel=cuenta_in.nivel,
        resumen=cuenta_in.resumen,
        usuario_creacion=cuenta_in.usuario_operacion,
        terminal_ip=cuenta_in.terminal_ip
    )
    db.add(nueva_cuenta)
    db.commit()
    db.refresh(nueva_cuenta)
    return nueva_cuenta
"""

    archivos[base_dir / "crud" / "partida.py"] = """from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import models.partida as m_partida
import models.periodo as m_periodo
import models.cuenta as m_cuenta
import schemas.partida as s_partida

def registrar_asiento_diario(db: Session, partida_in: s_partida.PartidaCabeceraCreate):
    anio_partida = partida_in.fecha.year
    mes_partida = partida_in.fecha.month

    periodo = db.query(m_periodo.ControlPeriodo).filter(
        m_periodo.ControlPeriodo.empresa_id == partida_in.empresa_id,
        m_periodo.ControlPeriodo.anio == anio_partida,
        m_periodo.ControlPeriodo.mes == mes_partida
    ).first()

    if not periodo or not periodo.mes_abierto or not periodo.anio_abierto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inadmisible: El período contable solicitado ({mes_partida}/{anio_partida}) se encuentra cerrado."
        )

    for d in partida_in.detalles:
        cuenta = db.query(m_cuenta.CuentaContable).filter(m_cuenta.CuentaContable.cuentas == d.cuenta_codigo).first()
        if not cuenta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La cuenta {d.cuenta_codigo} no existe en el catálogo."
            )
        if cuenta.resumen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Violación normativa: No se permiten movimientos directos en la cuenta de resumen {d.cuenta_codigo}."
            )

    cabecera = m_partida.PartidaCabecera(
        empresa_id=partida_in.empresa_id,
        anio=anio_partida,
        mes=mes_partida,
        numero_partida=partida_in.numero_partida,
        fecha=partida_in.fecha,
        concepto=partida_in.concepto,
        estado="Borrador",
        usuario_creacion=partida_in.usuario_operacion,
        terminal_ip=partida_in.terminal_ip
    )
    db.add(cabecera)
    db.commit()
    db.refresh(cabecera)

    for d in partida_in.detalles:
        detalle_linea = m_partida.PartidaDetalle(
            partida_id=cabecera.id,
            cuenta_codigo=d.cuenta_codigo,
            debe=d.debe,
            haber=d.haber,
            concepto_detalle=d.concepto_detalle
        )
        db.add(detalle_linea)
    
    periodo.total_partidas += 1
    db.commit()
    db.refresh(cabecera)
    return cabecera

def obtener_libro_diario_empresa(db: Session, empresa_id: str, anio: int):
    return db.query(m_partida.PartidaCabecera).filter(
        m_partida.PartidaCabecera.empresa_id == empresa_id,
        m_partida.PartidaCabecera.anio == anio
    ).order_by(m_partida.PartidaCabecera.numero_partida.asc()).all()
"""

    # ==================== ROUTERS ====================
    archivos[base_dir / "routers" / "empresa.py"] = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import schemas.empresa as s_empresa
import crud.empresa as c_empresa
from config.database import get_db

router = APIRouter(prefix="/empresas", tags=["Control General de Empresas"])

@router.post("/", response_model=s_empresa.EmpresaResponse)
def crear_empresa(empresa: s_empresa.EmpresaCreate, db: Session = Depends(get_db)):
    return c_empresa.registrar_nueva_empresa(db=db, empresa_in=empresa)
"""

    archivos[base_dir / "routers" / "cuenta.py"] = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import schemas.cuenta as s_cuenta
import crud.cuenta as c_cuenta
from config.database import get_db

router = APIRouter(prefix="/catalogo", tags=["Catálogo de Cuentas Jerárquico"])

@router.post("/", response_model=s_cuenta.CuentaContableResponse)
def incorporar_cuenta(cuenta: s_cuenta.CuentaContableCreate, db: Session = Depends(get_db)):
    return c_cuenta.registrar_cuenta_catalogo(db=db, cuenta_in=cuenta)
"""

    archivos[base_dir / "routers" / "partida.py"] = """from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
import schemas.partida as s_partida
import crud.partida as c_partida
from config.database import get_db

router = APIRouter(prefix="/partidas", tags=["Transacciones del Libro Diario"])

@router.post("/", response_model=s_partida.PartidaCabeceraResponse)
def crear_asiento_contable(partida: s_partida.PartidaCabeceraCreate, db: Session = Depends(get_db)):
    return c_partida.registrar_asiento_diario(db=db, partida_in=partida)

@router.get("/", response_model=List[s_partida.PartidaCabeceraResponse])
def obtener_diario(empresa_id: str = Query(...), anio: int = Query(...), db: Session = Depends(get_db)):
    return c_partida.obtener_libro_diario_empresa(db=db, empresa_id=empresa_id, anio=anio)
"""

    print("=== INICIANDO INYECCIÓN DE LÓGICA BACKEND ===")
    for ruta, contenido in archivos.items():
        ruta.parent.mkdir(parents=True, exist_ok=True)
        with open(ruta, "w", encoding="utf-8") as f:
            f.write(contenido.strip() + "\n")
        print(f"[Archivo Actualizado] -> {ruta}")

    print("=== LÓGICA BACKEND INYECTADA CON ÉXITO ===")

if __name__ == "__main__":
    poblar_logica_backend()