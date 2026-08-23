from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date
from decimal import Decimal

class PartidaDetalleMovimiento(BaseModel):
    cuenta_codigo: str = Field(..., min_length=1, description="Código de la cuenta contable de detalle")
    debe: Decimal = Field(default=Decimal('0.00'), ge=0, description="Monto asignado al Debe")
    haber: Decimal = Field(default=Decimal('0.00'), ge=0, description="Monto asignado al Haber")
    concepto_detalle: Optional[str] = Field(None, description="Concepto específico para esta línea")

class PartidaCompletaCrear(BaseModel):
    empresa_id: str = Field(..., min_length=1, max_length=10)
    anio: int = Field(..., ge=2000, le=2100)
    mes: int = Field(..., ge=1, le=12)
    fecha: date = Field(..., description="Fecha de registro de la partida")
    concepto: str = Field(..., min_length=1, description="Concepto general del asiento contable")
    usuario: str = Field(..., min_length=1, description="Usuario operativo que registra")
    terminal_ip: str = Field(..., min_length=1, description="IP de la terminal origen")
    detalles: List[PartidaDetalleMovimiento] = Field(..., min_length=2, description="Listado de asientos de la partida")

class PartidaResumenLinea(BaseModel):
    id: int
    numero_partida: int
    fecha: date
    concepto: str
    estado: str
    nomenclatura: str

    class Config:
        from_attributes = True

class PaginaPartidasRespuesta(BaseModel):
    total_registros: int
    pagina_actual: int
    total_paginas: int
    registros: List[PartidaResumenLinea]

class CierreContableRequest(BaseModel):
    empresa_id: str
    anio: int
    cuenta_liquidadora_codigo: str

class EstadoPartidaUpdate(BaseModel):
    estado: str

class PreCierreResponse(BaseModel):
    puede_cerrar: bool
    borradores_pendientes: int
    meses_abiertos: list[int]
    cuadre_global: bool
    total_ingresos: float
    total_gastos: float
    utilidad_bruta: float
    cierre_previo_existe: bool

class CierreCompletoRequest(BaseModel):
    empresa_id: str
    anio: int
    anio_nuevo: int
    calcular_reserva_legal: bool = False
    calcular_isr: bool = False
