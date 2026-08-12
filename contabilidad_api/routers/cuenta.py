import csv
import io
import json
import jwt
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List

import schemas.cuenta as s_cuenta
import crud.cuenta as c_cuenta
from models.cuenta import CuentaContable
from config.database import get_db

router = APIRouter(prefix="/api/v1/catalogo", tags=["Catálogo de Cuentas Jerárquico"])

@router.post("/", response_model=s_cuenta.CuentaContableResponse)
def incorporar_cuenta(
    cuenta: s_cuenta.CuentaContableCreate, 
    empresa_id: str = Query(..., description="ID de la Empresa Activa"),
    anio: int = Query(..., description="Año del Ejercicio Contable"),
    db: Session = Depends(get_db)
):
    return c_cuenta.registrar_cuenta_catalogo(db=db, cuenta_in=cuenta, empresa_id=empresa_id, anio=anio)

@router.get("/", response_model=List[s_cuenta.CuentaContableResponse])
def listar_cuentas(
    empresa_id: str = Query(..., description="ID de la Empresa Activa"),
    anio: int = Query(..., description="Año del Ejercicio Contable"),
    db: Session = Depends(get_db)
):
    return c_cuenta.obtener_catalogo_completo(db=db, empresa_id=empresa_id, anio=anio)

@router.put("", response_model=s_cuenta.CuentaContableResponse)
def actualizar_nombre(
    codigo_cuenta: str = Query(...), 
    nombre: str = Query(...), 
    empresa_id: str = Query(..., description="ID de la Empresa Activa"),
    anio: int = Query(..., description="Año del Ejercicio Contable"),
    db: Session = Depends(get_db)
):
    return c_cuenta.modificar_nombre_cuenta(db=db, codigo_cuenta=codigo_cuenta, nuevo_nombre=nombre, empresa_id=empresa_id, anio=anio)

@router.delete("/{codigo_cuenta}")
def eliminar_cuenta(
    codigo_cuenta: str, 
    empresa_id: str = Query(..., description="ID de la Empresa Activa"),
    anio: int = Query(..., description="Año del Ejercicio Contable"),
    db: Session = Depends(get_db)
):
    return c_cuenta.eliminar_cuenta_segura(db=db, codigo_cuenta=codigo_cuenta, empresa_id=empresa_id, anio=anio)

# ================= MÓDULO: MANUAL CONTABLE (HERENCIA ASCENDENTE) =================
@router.get("/manual/{codigo_cuenta}")
def obtener_manual_cuenta(
    codigo_cuenta: str,
    empresa_id: str = Query(None, description="ID de la Empresa Activa enviado por frontend"),
    anio: int = Query(None, description="Año del Ejercicio Contable enviado por frontend"),
    db: Session = Depends(get_db)
):
    """
    Endpoint que responde a las peticiones del frontend (CatalogoAPI.consultarManual).
    Ruta ajustada para coincidir con /api/v1/catalogo/manual/{codigo_cuenta}
    """
    return c_cuenta.consultar_manual_cuenta(db=db, codigo_cuenta=codigo_cuenta)

@router.get("/buscar")
def buscar_cuentas_inteligente(
    q: str = Query(..., min_length=1), 
    empresa_id: str = Query(..., description="ID de la Empresa Activa"),
    anio: int = Query(..., description="Año del Ejercicio Contable"),
    db: Session = Depends(get_db)
):
    termino = f"%{q}%"
    cuentas = db.query(CuentaContable).filter(
        CuentaContable.empresa_id == empresa_id,
        CuentaContable.anio == anio,
        CuentaContable.resumen == False,
        or_(
            CuentaContable.cuentas.ilike(termino),
            CuentaContable.nombre.ilike(termino)
        )
    ).limit(15).all()

    return [{"codigo": c.cuentas, "nombre": c.nombre} for c in cuentas]

# ================= MÓDULO: TRASLADO DE SALDOS INTERANUALES =================
@router.post("/trasladar-saldos")
async def trasladar_saldos(
    request: Request,
    empresa_id: str = Query(..., description="ID de la Empresa Activa"),
    anio: int = Query(..., description="Año del Ejercicio Contable Destino"),
    db: Session = Depends(get_db)
):
    """
    Lee los saldos finales del ejercicio anterior y los inyecta como saldos iniciales 
    en el catálogo del año destino, respetando la regla contable para cuentas de Resultados.
    """
    ip_cliente = request.client.host if request.client else "127.0.0.1"
    usuario_actual = "sistema"
    
    # Extracción pasiva del usuario desde el JWT
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, options={"verify_signature": False})
            usuario_actual = payload.get("sub", "sistema")
        except Exception:
            pass
            
    return c_cuenta.trasladar_saldos_iniciales(
        db=db, 
        empresa_id=empresa_id, 
        anio_destino=anio, 
        usuario=usuario_actual, 
        ip=ip_cliente
    )

@router.get("/{codigo_cuenta}/saldos-mensuales")
def obtener_saldos_cuenta(
    codigo_cuenta: str,
    empresa_id: str = Query(..., description="ID de la Empresa Activa"),
    anio: int = Query(..., description="Año del Ejercicio Contable"),
    db: Session = Depends(get_db)
):
    """Obtiene el saldo inicial y la sumatoria mensual de cargos y abonos de una cuenta."""
    return c_cuenta.obtener_saldos_mensuales_cuenta(
        db=db, 
        empresa_id=empresa_id, 
        anio=anio, 
        codigo_cuenta=codigo_cuenta
    )

# ================= MÓDULO: IMPORTACIÓN INTELIGENTE DE CSV =================
@router.post("/importar")
async def importar_catalogo_csv(
    request: Request,
    archivo: UploadFile = File(...),
    mapeo: str = Form(...),
    empresa_id: str = Query(..., description="ID de la Empresa Activa"),
    anio: int = Query(..., description="Año del Ejercicio Contable"),
    db: Session = Depends(get_db)
):
    if not archivo.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe tener extensión .csv")

    try:
        dict_mapeo = json.loads(mapeo)
        col_codigo = dict_mapeo.get("codigo")
        col_nombre = dict_mapeo.get("nombre")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="El diccionario de mapeo es inválido.")

    if not col_codigo or not col_nombre:
        raise HTTPException(status_code=400, detail="Falta mapear las columnas obligatorias (Código y Nombre).")

    # Extracción pasiva de auditoría
    ip_cliente = request.client.host if request.client else "127.0.0.1"
    usuario_actual = "sistema"
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, options={"verify_signature": False})
            usuario_actual = payload.get("sub", "sistema")
        except Exception:
            pass

    contenido = await archivo.read()
    texto_csv = contenido.decode('utf-8-sig') 
    lector = csv.DictReader(io.StringIO(texto_csv), delimiter=';') 

    if lector.fieldnames is None or len(lector.fieldnames) < 2:
        lector = csv.DictReader(io.StringIO(texto_csv), delimiter=',')

    ESTRUCTURA = {
        1: {"nivel": 1, "padre_len": 0},
        2: {"nivel": 2, "padre_len": 1},
        4: {"nivel": 3, "padre_len": 2},
        6: {"nivel": 4, "padre_len": 4},
        8: {"nivel": 5, "padre_len": 6},
        10: {"nivel": 6, "padre_len": 8},
        12: {"nivel": 7, "padre_len": 10},
        14: {"nivel": 8, "padre_len": 12},
        16: {"nivel": 9, "padre_len": 14}
    }

    RAICES_UNIVERSALES = ['1', '2', '3', '4', '5', '6', '7']

    no_importadas = []
    filas_validas = []

    for fila_num, fila in enumerate(lector, start=2):
        c = fila.get(col_codigo, "").strip()
        n = fila.get(col_nombre, "").strip()
        if not c or not n:
            no_importadas.append({"fila": fila_num, "codigo": c, "motivo": "Campos obligatorios vacíos"})
        else:
            filas_validas.append({"fila": fila_num, "codigo": c, "nombre": n})

    filas_validas.sort(key=lambda x: len(x["codigo"]))

    # 3. Cargar códigos existentes AISLADOS por Empresa y Año
    codigos_existentes_bd = {
        c[0] for c in db.query(CuentaContable.cuentas)
        .filter(CuentaContable.empresa_id == empresa_id, CuentaContable.anio == anio)
        .all()
    }
    
    importadas_dict = {} 
    padres_detectados = set()

    for item in filas_validas:
        codigo_csv = item["codigo"]
        nombre_csv = item["nombre"]
        fila_num = item["fila"]

        raiz = codigo_csv[0]
        if raiz not in RAICES_UNIVERSALES:
            no_importadas.append({"fila": fila_num, "codigo": codigo_csv, "motivo": f"Raíz '{raiz}' no reconocida. Debe iniciar del 1 al 7."})
            continue

        longitud = len(codigo_csv)
        regla = ESTRUCTURA.get(longitud)

        if not regla:
            no_importadas.append({"fila": fila_num, "codigo": codigo_csv, "motivo": f"La longitud de {longitud} caracteres no cumple con la progresión matemática de niveles."})
            continue

        nivel_calculado = regla["nivel"]
        longitud_padre = regla["padre_len"]
        cuenta_padre = codigo_csv[:longitud_padre] if longitud_padre > 0 else None

        if cuenta_padre:
            padres_detectados.add(cuenta_padre)
            
            faltantes = []
            padre_actual = cuenta_padre
            
            while padre_actual:
                if padre_actual in codigos_existentes_bd or padre_actual in importadas_dict:
                    break
                faltantes.append(padre_actual)
                
                len_padre = len(padre_actual)
                regla_padre = ESTRUCTURA.get(len_padre)
                len_abuelo = regla_padre["padre_len"]
                padre_actual = padre_actual[:len_abuelo] if len_abuelo > 0 else None

            for p_faltante in reversed(faltantes):
                len_f = len(p_faltante)
                regla_f = ESTRUCTURA.get(len_f)
                len_padre_f = regla_f["padre_len"]
                padre_de_f = p_faltante[:len_padre_f] if len_padre_f > 0 else None
                
                if padre_de_f:
                    padres_detectados.add(padre_de_f)
                    
                importadas_dict[p_faltante] = {
                    "codigo": p_faltante,
                    "nombre": f"CUENTA AUTOGENERADA - {p_faltante}",
                    "nivel": regla_f["nivel"],
                    "cuenta_padre": padre_de_f
                }

        importadas_dict[codigo_csv] = {
            "codigo": codigo_csv,
            "nombre": nombre_csv,
            "nivel": nivel_calculado,
            "cuenta_padre": cuenta_padre
        }

    # 5. Inserción Transaccional en Base de Datos
    try:
        for padre_cod in padres_detectados:
            if padre_cod in codigos_existentes_bd:
                padre_bd = db.query(CuentaContable).filter(
                    CuentaContable.cuentas == padre_cod,
                    CuentaContable.empresa_id == empresa_id,
                    CuentaContable.anio == anio
                ).first()
                if padre_bd and not padre_bd.resumen:
                    padre_bd.resumen = True
                    padre_bd.usuario_modificacion = usuario_actual
                    padre_bd.terminal_ip = ip_cliente

        for cod, cta in importadas_dict.items():
            es_resumen = cod in padres_detectados
            
            if cod not in codigos_existentes_bd:
                nueva_cuenta = CuentaContable(
                    empresa_id=empresa_id,           # Inyección Composite PK
                    anio=anio,                       # Inyección Composite PK
                    cuentas=cta['codigo'],
                    nombre=cta['nombre'],
                    nivel=cta['nivel'],
                    ctadep=cta['cuenta_padre'],
                    resumen=es_resumen,
                    usuario_creacion=usuario_actual,
                    terminal_ip=ip_cliente
                )
                db.add(nueva_cuenta)
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fallo crítico al insertar lote en base de datos: {str(e)}")

    return {
        "mensaje": "Proceso finalizado. El catálogo ha sido asociado a la empresa activa.",
        "importadas": list(importadas_dict.values()),
        "no_importadas": no_importadas
    }

@router.get("/{codigo_cuenta}/movimientos/{mes_num}")
def obtener_movimientos_cuenta_mes(
    codigo_cuenta: str,
    mes_num: int,
    empresa_id: str = Query(..., description="ID de la Empresa Activa"),
    anio: int = Query(..., description="Año del Ejercicio Contable"),
    db: Session = Depends(get_db)
):
    """Obtiene los movimientos detallados de una cuenta en un mes específico, incluyendo arrastre de saldo."""
    return c_cuenta.obtener_movimientos_mes_cuenta(
        db=db, 
        empresa_id=empresa_id, 
        anio=anio, 
        mes=mes_num,
        codigo_cuenta=codigo_cuenta
    )