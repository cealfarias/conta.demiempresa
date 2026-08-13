import sys
import os
import sqlalchemy
from sqlalchemy import text

# Agregar el directorio padre al sys.path para poder importar config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import engine, Base
from models.usuario import Usuario

def upgrade():
    # Asegurar que las tablas existan si la bd est vaca
    Base.metadata.create_all(bind=engine)
    
    try:
        with engine.connect() as conn:
            # Check if columns exist
            try:
                conn.execute(text("SELECT two_factor_secret, is_2fa_enabled FROM usuarios LIMIT 1"))
                print("Las columnas 2FA ya existen en la base de datos.")
                return
            except sqlalchemy.exc.OperationalError:
                # Si falla, las columnas no existen (en sqlite y postgres tiran error)
                pass
            except sqlalchemy.exc.ProgrammingError:
                # Postgres tira ProgrammingError
                pass

            # Dependiendo del motor, la sintaxis puede variar, pero ALTER TABLE ADD COLUMN es estndar
            print("Agregando columnas two_factor_secret e is_2fa_enabled a la tabla usuarios...")
            
            # Es mejor hacerlas una por una para compatibilidad con sqlite
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN two_factor_secret VARCHAR"))
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN is_2fa_enabled BOOLEAN DEFAULT FALSE"))
            
            conn.commit()
            print("Base de datos actualizada con xito para soportar 2FA.")
            
    except Exception as e:
        print(f"Error al actualizar la base de datos: {e}")

if __name__ == "__main__":
    upgrade()
