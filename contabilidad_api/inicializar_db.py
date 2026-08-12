# inicializar_db.py
from config.database import engine, Base

# Importación estricta de todos los modelos físicos
# SQLAlchemy requiere leerlos en memoria para convertirlos en tablas SQL.
import models.cuenta
import models.empresa
# IMPORTANTE: Si tienes más modelos (ej. models.usuario, models.periodo), 
# expórtalos explícitamente aquí:
# import models.usuario 
# import models.periodo

def crear_tablas():
    print("Iniciando motor de SQLAlchemy...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Tablas creadas exitosamente con la nueva arquitectura.")
    except Exception as e:
        print(f"Error crítico al crear las tablas: {str(e)}")

if __name__ == "__main__":
    crear_tablas()