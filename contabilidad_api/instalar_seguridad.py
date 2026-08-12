import sys
import os
import datetime
import shutil

# Aseguramos que el path de ejecución reconozca los módulos del proyecto
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from config.database import engine, SessionLocal
from models.usuario import Usuario
from crud.usuario import get_password_hash

def respaldar_base_de_datos():
    """Realiza una copia física del archivo .db y verifica su integridad antes de continuar."""
    print("Iniciando copia de seguridad y verificación de la base de datos...")
    
    # Ruta absoluta asumiendo que la base de datos está en la raíz del proyecto
    directorio_raiz = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(directorio_raiz, 'sistema_contable.db')
    
    if not os.path.exists(db_path):
        print(f"ERROR CRÍTICO: No se encontró la base de datos origen en {db_path}.")
        print("El script se detendrá por seguridad. No se realizará ninguna modificación.")
        return False

    # Verificar que la base de datos origen tenga datos (tamaño mayor a 0)
    tamano_origen = os.path.getsize(db_path)
    if tamano_origen == 0:
        print("ERROR CRÍTICO: El archivo de base de datos origen está vacío (0 bytes).")
        print("El script se detendrá por seguridad para evitar pérdida de datos.")
        return False

    # Extraer fecha actual para el nombre del archivo
    fecha_actual = datetime.datetime.now().strftime("%Y_%m_%d_%H_%M_%S")
    backup_nombre = f"sistema_contable_backup_{fecha_actual}.db"
    backup_path = os.path.join(directorio_raiz, backup_nombre)
    
    try:
        # Ejecutar copia física
        shutil.copy2(db_path, backup_path)
        
        # Verificación post-copia: existencia y tamaño idéntico
        if not os.path.exists(backup_path):
            print("ERROR CRÍTICO: El archivo de respaldo no se generó en el disco.")
            return False
            
        tamano_respaldo = os.path.getsize(backup_path)
        if tamano_respaldo != tamano_origen:
            print(f"ERROR CRÍTICO: Inconsistencia en el respaldo. Origen: {tamano_origen} bytes, Respaldo: {tamano_respaldo} bytes.")
            print("El script se detendrá por seguridad.")
            return False

        print(f"Verificación exitosa: Copia de seguridad creada con datos ({tamano_respaldo} bytes) en: {backup_nombre}")
        return True
        
    except Exception as e:
        print(f"ERROR CRÍTICO durante la copia: {str(e)}")
        return False

def reset_y_crear_admin():
    print("Iniciando reconstrucción de la seguridad del sistema...")
    
    # 1. Eliminar la tabla antigua que causaba conflictos
    print("1. Eliminando estructura obsoleta de usuarios...")
    Usuario.__table__.drop(engine, checkfirst=True)
    
    # 2. Crear la nueva tabla basada estrictamente en models/usuario.py
    print("2. Creando nueva estructura avanzada de usuarios...")
    Usuario.__table__.create(engine, checkfirst=True)
    
    # 3. Inyectar el usuario administrador maestro
    print("3. Inyectando usuario administrador...")
    db = SessionLocal()
    try:
        nuevo_admin = Usuario(
            username="admin",
            email="admin@sistema.local",
            hashed_password=get_password_hash("Admin2026*"),
            rol="admin",
            is_active=True,
            usuario_creacion="sistema_init",
            fecha_creacion=datetime.datetime.now(datetime.timezone.utc),
            terminal_ip="127.0.0.1"
        )
        db.add(nuevo_admin)
        db.commit()
        
        print("¡Éxito! Base de datos de seguridad sincronizada.")
        print("--------------------------------------------------")
        print("Usuario: admin")
        print("Contraseña: Admin2026*")
        print("--------------------------------------------------")
        print("Inicia tu servidor FastAPI con uvicorn y prueba el acceso en login.html.")
    except Exception as e:
        print(f"Error crítico al inyectar el usuario: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Ejecutar primero el respaldo preventivo y capturar el resultado
    respaldo_exitoso = respaldar_base_de_datos()
    
    # Solo si el respaldo fue exitoso y verificado en bytes, se procede con la alteración de la base de datos
    if respaldo_exitoso:
        reset_y_crear_admin()
    else:
        print("PROCESO CANCELADO: No se modificó la base de datos debido a un fallo en el respaldo y verificación.")