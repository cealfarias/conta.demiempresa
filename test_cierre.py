import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'contabilidad_api'))

from config.database import SessionLocal
from crud.cierre import pre_cierre_validacion

def main():
    db = SessionLocal()
    try:
        # We need an empresa_id that exists. 
        # Let's get the first one.
        from models.periodo import ControlPeriodo
        cp = db.query(ControlPeriodo).first()
        if not cp:
            print("No data in ControlPeriodo")
            return
            
        print(f"Testing with empresa: {cp.empresa_id}, anio: {cp.anio}")
        res = pre_cierre_validacion(db, cp.empresa_id, cp.anio)
        print("Success:")
        print(res)
    except Exception as e:
        import traceback
        print("Error occurred:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == '__main__':
    main()
