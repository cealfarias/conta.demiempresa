import sys
import os
import sqlite3
from passlib.context import CryptContext

# 1. Inyectar el directorio raíz del proyecto en el path de ejecución de Python
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def crear_usuario_semilla():
    # 2. Forzar la búsqueda de la base de datos en el directorio padre (raíz)
    db_path = os.path.join(os.path.dirname(__file__), '..', 'sistema_contable.db') 
    
    if not os.path.exists(db_path):
        print(f"Error: No se encontró la base de datos en la ruta esperada: '{db_path}'. Verifica el nombre del archivo.")
        return

    usuario = "admin"
    contrasena_plana = "admin123"
    rol = "admin"
    
    contrasena_encriptada = pwd_context.hash(contrasena_plana)
    
    try:
        conexion = sqlite3.connect(db_path)
        cursor = conexion.cursor()
        
        # 3. Construcción forzada de la tabla si no existe
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                rol TEXT NOT NULL,
                activo INTEGER DEFAULT 1
            )
            """
        )

        # 4. Inyección del usuario administrador
        cursor.execute(
            """
            INSERT INTO usuarios (username, hashed_password, rol, activo) 
            VALUES (?, ?, ?, 1)
            """,
            (usuario, contrasena_encriptada, rol)
        )
        
        conexion.commit()
        print(f"¡Éxito! Tabla verificada y usuario '{usuario}' creado exitosamente.")
        print(f"Contraseña de acceso: {contrasena_plana}")
        
    except sqlite3.IntegrityError:
        print(f"Error: El usuario '{usuario}' ya existe en la base de datos.")
    except Exception as e:
        print(f"Error crítico al inyectar el usuario: {str(e)}")
    finally:
        if 'conexion' in locals() and conexion:
            conexion.close()

if __name__ == "__main__":
    crear_usuario_semilla()