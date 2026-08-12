import os
import sys
from dotenv import load_dotenv

# Add parent directory to path so we can import models and config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import all models
from models.cuenta import CuentaContable
from models.partida import PartidaCabecera, PartidaDetalle
from models.periodo import EjercicioFiscal, ControlPeriodo
from models.empresa import Empresa
from models.manual import ManualContable
from models.usuario import Usuario

load_dotenv()

def migrar_datos():
    # 1. Configurar conexión SQLite (Origen)
    sqlite_url = "sqlite:///./sistema_contable.db"
    engine_sqlite = create_engine(sqlite_url)
    SessionLocal_sqlite = sessionmaker(autocommit=False, autoflush=False, bind=engine_sqlite)
    db_sqlite = SessionLocal_sqlite()

    # 2. Configurar conexión PostgreSQL (Destino)
    pg_url = os.getenv("DATABASE_URL")
    if not pg_url or pg_url.startswith("sqlite"):
        print("Error: DATABASE_URL no está configurada o sigue apuntando a SQLite en el archivo .env")
        print("Asegúrate de que DATABASE_URL apunte a tu base de datos Render (postgres://...)")
        return

    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)

    print(f"Conectando a PostgreSQL: {pg_url.split('@')[1] if '@' in pg_url else 'Render DB'}")
    engine_pg = create_engine(pg_url)
    SessionLocal_pg = sessionmaker(autocommit=False, autoflush=False, bind=engine_pg)
    db_pg = SessionLocal_pg()

    # 3. Importar y crear esquema en PostgreSQL (si no existe)
    from config.database import Base
    print("Creando esquema en PostgreSQL...")
    Base.metadata.create_all(bind=engine_pg)

    # 4. Definir el orden de migración (importante por llaves foráneas)
    modelos = [
        ("Usuarios", Usuario),
        ("Empresas", Empresa),
        ("Ejercicios Fiscales", EjercicioFiscal),
        ("Catálogo de Cuentas", CuentaContable),
        ("Manual Contable", ManualContable),
        ("Control de Periodos", ControlPeriodo),
        ("Partidas Cabecera", PartidaCabecera),
        ("Partidas Detalle", PartidaDetalle),
    ]

    print("\nIniciando migración de datos...")
    for nombre, Modelo in modelos:
        print(f"Migrando {nombre}...")
        registros_sqlite = db_sqlite.query(Modelo).all()
        
        if not registros_sqlite:
            print(f"  - No hay registros en {nombre}.")
            continue

        registros_pg = db_pg.query(Modelo).all()
        if registros_pg:
            print(f"  - ATENCIÓN: La tabla de {nombre} ya tiene datos en PostgreSQL. Saltando para evitar duplicidad.")
            continue

        count = 0
        for registro in registros_sqlite:
            # Crear una nueva instancia limpia para la sesión PG
            datos_registro = {c.name: getattr(registro, c.name) for c in Modelo.__table__.columns}
            nuevo_registro = Modelo(**datos_registro)
            db_pg.add(nuevo_registro)
            count += 1
            
            # Commit en lotes pequeños para no saturar
            if count % 100 == 0:
                db_pg.commit()
                
        db_pg.commit()
        print(f"  - [OK] {count} registros migrados con éxito.")

    db_sqlite.close()
    db_pg.close()
    print("\n¡Migración Completada Exitosamente!")

if __name__ == "__main__":
    migrar_datos()
