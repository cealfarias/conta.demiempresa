from sqlalchemy import Column, Integer, String, DateTime, Text
import datetime
from config.database import Base


class AceptacionTerminos(Base):
    """
    Registro legal de la aceptación de los Términos de Referencia y Condiciones de Servicio.
    Cada fila es evidencia irrefutable de que un usuario aceptó los términos en una fecha y hora
    específica, desde una IP determinada, y con una versión identificable del documento.
    
    Diseñado para ser presentado como prueba documental ante instancias judiciales o arbitrales.
    """
    __tablename__ = "aceptacion_terminos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Identificación del usuario que aceptó
    email = Column(String, nullable=False, index=True)
    username = Column(String, nullable=False)
    empresa_id = Column(String, nullable=True)
    nombre_empresa = Column(String, nullable=True)
    
    # Datos legales de la aceptación
    version_terminos = Column(String, nullable=False)  # Ej: "v2026.08.22"
    fecha_aceptacion = Column(DateTime, nullable=False, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    ip_origen = Column(String, nullable=False)  # IP desde donde se aceptó
    user_agent = Column(Text, nullable=True)  # Navegador/dispositivo del usuario
    
    # Campos adicionales de contexto
    metodo_registro = Column(String, nullable=True)  # "formulario" o "google_oauth"
    acepto_mailing = Column(String, default="no")  # "si" o "no"
