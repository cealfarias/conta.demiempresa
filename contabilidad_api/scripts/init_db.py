# Archivo modular: scripts/init_db.py
import sys
from pathlib import Path

# Añadir el directorio raíz al path de Python para evitar fallos de importación modular
sys.path.append(str(Path(__file__).resolve().parent.parent))

from config.database import engine, Base
import models # Fuerza el registro completo de las tablas en los metadatos de SQLAlchemy

def levantar_tablas_sistema():
    print("Estableciendo conexión y compilando el esquema contable relacional en SQLite...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Éxito absoluto: Todas las tablas estructurales han sido asentadas de forma fidedigna.")
    except Exception as e:
        print(f"Fallo crítico en la inicialización física del motor de datos: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    levantar_tablas_sistema()