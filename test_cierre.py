import sys
import os
sys.path.append('c:/conta.demiempresa/contabilidad_api')
from config.database import SessionLocal
from crud.cierre import _asegurar_cuenta_existe

db = SessionLocal()
try:
    _asegurar_cuenta_existe(db, 'CANTARES', 2026, '310401', 'Reserva Legal')
    db.commit()
    print('EXITO')
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
