import sys
sys.path.append('c:/conta.demiempresa/contabilidad_api')
from models.cuenta import CuentaContable
from decimal import Decimal
cuenta = CuentaContable(
    empresa_id='TEST',
    anio=2026,
    cuentas='11',
    nombre='TEST',
    ctadep='1',
    nivel=2,
    resumen=True,
    saldo_inicial=Decimal('0'),
    saldo_final=Decimal('0'),
    usuario_creacion='Sistema',
    terminal_ip='127.0.0.1'
)
print('TERMINAL IP IS:', cuenta.terminal_ip)
