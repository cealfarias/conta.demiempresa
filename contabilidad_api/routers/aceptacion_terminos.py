from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from models.aceptacion_terminos import AceptacionTerminos
from schemas.aceptacion_terminos import AceptacionTerminosCreate, AceptacionTerminosResponse
import datetime

router = APIRouter(
    prefix="/api/v1/terminos",
    tags=["Aceptación de Términos"]
)


@router.post("/aceptar", response_model=AceptacionTerminosResponse, status_code=201)
def registrar_aceptacion(
    datos: AceptacionTerminosCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Registra la aceptación de los Términos de Referencia por parte del usuario.
    Este endpoint es PÚBLICO (no requiere JWT) ya que se ejecuta durante el registro.
    
    Captura automáticamente:
    - IP de origen (X-Forwarded-For para proxies como Vercel/Render, o IP directa)
    - User-Agent del navegador
    - Fecha y hora UTC del servidor (no del cliente, para evitar manipulación)
    """
    # Obtener la IP real del usuario (considerando proxies/load balancers)
    ip_origen = request.headers.get("x-forwarded-for", request.headers.get("x-real-ip", request.client.host))
    # Si hay múltiples IPs en X-Forwarded-For, tomar la primera (la del cliente real)
    if ip_origen and "," in ip_origen:
        ip_origen = ip_origen.split(",")[0].strip()

    user_agent = request.headers.get("user-agent", "Desconocido")

    registro = AceptacionTerminos(
        email=datos.email,
        username=datos.username,
        empresa_id=datos.empresa_id,
        nombre_empresa=datos.nombre_empresa,
        version_terminos=datos.version_terminos,
        fecha_aceptacion=datetime.datetime.now(datetime.timezone.utc),
        ip_origen=ip_origen,
        user_agent=user_agent,
        metodo_registro=datos.metodo_registro,
        acepto_mailing=datos.acepto_mailing
    )

    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


@router.get("/historial/{email}", response_model=List[AceptacionTerminosResponse])
def consultar_historial(email: str, db: Session = Depends(get_db)):
    """
    Consulta el historial de aceptaciones de términos de un usuario por email.
    Útil para auditoría interna y presentación de evidencia legal.
    """
    registros = db.query(AceptacionTerminos).filter(
        AceptacionTerminos.email == email
    ).order_by(AceptacionTerminos.fecha_aceptacion.desc()).all()

    if not registros:
        raise HTTPException(status_code=404, detail="No se encontraron registros de aceptación para este email.")
    
    return registros


@router.get("/todos", response_model=List[AceptacionTerminosResponse])
def listar_todas_aceptaciones(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Lista todas las aceptaciones registradas. Solo para uso administrativo.
    """
    return db.query(AceptacionTerminos).order_by(
        AceptacionTerminos.fecha_aceptacion.desc()
    ).offset(skip).limit(limit).all()
