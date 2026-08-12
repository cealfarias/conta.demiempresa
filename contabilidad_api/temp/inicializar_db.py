import sys
import os

# 1. Inyectar el directorio raíz del proyecto en el path de ejecución de Python
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.database import engine, Base
import models.cuenta
import models.empresa
# Si existen otros modelos, descomentar y agregar aquí:
# import models.usuario
# import models.periodo

def crear_tablas():
    print("Iniciando motor de SQLAlchemy desde el directorio temporal...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Tablas creadas exitosamente con la arquitectura actualizada.")
    except Exception as e:
        print(f"Error crítico al crear las tablas: {str(e)}")

if __name__ == "__main__":
    crear_tablas()