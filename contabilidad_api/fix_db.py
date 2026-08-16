import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

try:
    print("Iniciando corrección de secuencias y contadores en Render...")
    
    # 1. Sincronizar secuencia de partidas_cabecera
    print("Sincronizando partidas_cabecera_id_seq...")
    db.execute(text("SELECT setval('partidas_cabecera_id_seq', COALESCE((SELECT MAX(id) FROM partidas_cabecera), 1))"))
    
    # 2. Sincronizar secuencia de partidas_detalle
    print("Sincronizando partidas_detalle_id_seq...")
    db.execute(text("SELECT setval('partidas_detalle_id_seq', COALESCE((SELECT MAX(id) FROM partidas_detalle), 1))"))
    
    # 3. Recalcular total_partidas en control_periodos mes por mes
    print("Recalculando total_partidas en control_periodos...")
    db.execute(text("""
        UPDATE control_periodos cp
        SET total_partidas = COALESCE((
            SELECT COUNT(*) 
            FROM partidas_cabecera pc 
            WHERE pc.empresa_id = cp.empresa_id 
              AND pc.anio = cp.anio 
              AND pc.mes = cp.mes
        ), 0)
    """))
    
    db.commit()
    print("Corrección finalizada con éxito. Ya no habrá UniqueViolation y los correlativos son exactos.")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
