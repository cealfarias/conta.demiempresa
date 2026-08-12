import sys
import os
import sqlite3
from datetime import datetime

# 1. Inyectar el directorio raíz del proyecto
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def crear_empresa_semilla():
    # IMPORTANTE: Cambia 'contabilidad.db' por el nombre real de tu archivo SQLite
    db_path = os.path.join(os.path.dirname(__file__), '..', 'contabilidad.db') 
    
    if not os.path.exists(db_path):
        print(f"Error: No se encontró la base de datos en: '{db_path}'.")
        return

    try:
        conexion = sqlite3.connect(db_path)
        cursor = conexion.cursor()
        
        # 2. Datos estrictos de la empresa inicial requeridos por tu modelo
        emp_id = "EMP01"
        razon_social = "EMPRESA INICIAL S.A. DE C.V."
        nombre_comercial = "EMPRESA INICIAL"
        nit = "0000-000000-000-0"
        nrc = "00000-0"
        giro = "Configuración del Sistema"
        normativa = "NIIF_PYMES"
        usuario = "admin"
        fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ip = "127.0.0.1"

        # 3. Inyección directa saltando la validación del ORM
        cursor.execute(
            """
            INSERT INTO empresas (
                id, razon_social, nombre_comercial, nit, nrc, giro, 
                normativa, usuario_creacion, fecha_creacion, terminal_ip
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (emp_id, razon_social, nombre_comercial, nit, nrc, giro, normativa, usuario, fecha, ip)
        )
        
        conexion.commit()
        print(f"¡Éxito! Empresa semilla '{emp_id}' creada correctamente. Ya puedes iniciar sesión.")
        
    except sqlite3.IntegrityError:
        print(f"Error: La empresa '{emp_id}' ya existe en la base de datos.")
    except Exception as e:
        print(f"Error crítico al inyectar la empresa: {str(e)}")
    finally:
        if 'conexion' in locals() and conexion:
            conexion.close()

if __name__ == "__main__":
    crear_empresa_semilla()