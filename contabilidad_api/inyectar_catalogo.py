import urllib.request
import urllib.parse
import json

# ================= DATOS DE AUTENTICACIÓN =================
LOGIN_URL = "http://127.0.0.1:8000/api/login"
CATALOGO_URL = "http://127.0.0.1:8000/catalogo/"
USERNAME = "admin"
PASSWORD = "admin123"

# ================= CATÁLOGO ESTÁNDAR NIIF EL SALVADOR =================
cuentas_niif = [
    {"cuentas": "1", "nombre": "ACTIVO", "ctadep": None, "nivel": 1, "resumen": True},
    {"cuentas": "11", "nombre": "ACTIVO CORRIENTE", "ctadep": "1", "nivel": 2, "resumen": True},
    {"cuentas": "1101", "nombre": "EFECTIVO Y EQUIVALENTES", "ctadep": "11", "nivel": 3, "resumen": True},
    {"cuentas": "110101", "nombre": "CAJA GENERAL", "ctadep": "1101", "nivel": 4, "resumen": False},
    {"cuentas": "110102", "nombre": "FONDOS DEPOSITADOS EN BANCOS", "ctadep": "1101", "nivel": 4, "resumen": True},
    {"cuentas": "11010201", "nombre": "Bancos Locales Cta. Corriente", "ctadep": "110102", "nivel": 5, "resumen": False},
    {"cuentas": "1102", "nombre": "CUENTAS Y DOCUMENTOS POR COBRAR", "ctadep": "11", "nivel": 3, "resumen": True},
    {"cuentas": "110201", "nombre": "Clientes Locales", "ctadep": "1102", "nivel": 4, "resumen": False},
    {"cuentas": "1103", "nombre": "INVENTARIOS", "ctadep": "11", "nivel": 3, "resumen": True},
    {"cuentas": "110301", "nombre": "Inventario de Mercaderías", "ctadep": "1103", "nivel": 4, "resumen": False},
    {"cuentas": "12", "nombre": "ACTIVO NO CORRIENTE", "ctadep": "1", "nivel": 2, "resumen": True},
    {"cuentas": "1201", "nombre": "PROPIEDAD, PLANTA Y EQUIPO", "ctadep": "12", "nivel": 3, "resumen": True},
    {"cuentas": "120101", "nombre": "Mobiliario y Equipo", "ctadep": "1201", "nivel": 4, "resumen": False},
    {"cuentas": "120102", "nombre": "Depreciación Acumulada", "ctadep": "1201", "nivel": 4, "resumen": False},
    
    {"cuentas": "2", "nombre": "PASIVO", "ctadep": None, "nivel": 1, "resumen": True},
    {"cuentas": "21", "nombre": "PASIVO CORRIENTE", "ctadep": "2", "nivel": 2, "resumen": True},
    {"cuentas": "2101", "nombre": "CUENTAS Y DOCUMENTOS POR PAGAR", "ctadep": "21", "nivel": 3, "resumen": True},
    {"cuentas": "210101", "nombre": "Proveedores Locales", "ctadep": "2101", "nivel": 4, "resumen": False},
    {"cuentas": "2102", "nombre": "PROVISIONES Y RETENCIONES", "ctadep": "21", "nivel": 3, "resumen": True},
    {"cuentas": "210201", "nombre": "Retenciones y Cotizaciones por Pagar", "ctadep": "2102", "nivel": 4, "resumen": False},
    
    {"cuentas": "3", "nombre": "PATRIMONIO", "ctadep": None, "nivel": 1, "resumen": True},
    {"cuentas": "31", "nombre": "CAPITAL SOCIAL", "ctadep": "3", "nivel": 2, "resumen": True},
    {"cuentas": "3101", "nombre": "Capital Pagado", "ctadep": "31", "nivel": 3, "resumen": False},
    {"cuentas": "32", "nombre": "RESULTADOS ACUMULADOS", "ctadep": "3", "nivel": 2, "resumen": True},
    {"cuentas": "3201", "nombre": "Utilidades de Ejercicios Anteriores", "ctadep": "32", "nivel": 3, "resumen": False},
    {"cuentas": "33", "nombre": "RESULTADOS DEL EJERCICIO", "ctadep": "3", "nivel": 2, "resumen": True},
    {"cuentas": "3301", "nombre": "Utilidad o Pérdida del Ejercicio", "ctadep": "33", "nivel": 3, "resumen": False},
    
    {"cuentas": "4", "nombre": "INGRESOS", "ctadep": None, "nivel": 1, "resumen": True},
    {"cuentas": "41", "nombre": "INGRESOS POR OPERACIONES", "ctadep": "4", "nivel": 2, "resumen": True},
    {"cuentas": "4101", "nombre": "Ingresos por Ventas de Bienes", "ctadep": "41", "nivel": 3, "resumen": False},
    {"cuentas": "4102", "nombre": "Ingresos por Servicios", "ctadep": "41", "nivel": 3, "resumen": False},
    
    {"cuentas": "5", "nombre": "COSTOS Y GASTOS", "ctadep": None, "nivel": 1, "resumen": True},
    {"cuentas": "51", "nombre": "COSTOS DE VENTA", "ctadep": "5", "nivel": 2, "resumen": True},
    {"cuentas": "5101", "nombre": "Costo de Ventas de Bienes", "ctadep": "51", "nivel": 3, "resumen": False},
    {"cuentas": "52", "nombre": "GASTOS DE OPERACIÓN", "ctadep": "5", "nivel": 2, "resumen": True},
    {"cuentas": "5201", "nombre": "Gastos de Administración", "ctadep": "52", "nivel": 3, "resumen": False},
    {"cuentas": "5202", "nombre": "Gastos de Venta", "ctadep": "52", "nivel": 3, "resumen": False},
    
    {"cuentas": "6", "nombre": "CUENTAS DE LIQUIDACION", "ctadep": None, "nivel": 1, "resumen": True},
    {"cuentas": "61", "nombre": "PERDIDAS Y GANANCIAS", "ctadep": "6", "nivel": 2, "resumen": True},
    {"cuentas": "6101", "nombre": "Pérdidas y Ganancias", "ctadep": "61", "nivel": 3, "resumen": False},
    
    {"cuentas": "7", "nombre": "CUENTAS DE ORDEN DEUDORAS", "ctadep": None, "nivel": 1, "resumen": True},
    {"cuentas": "8", "nombre": "CUENTAS DE ORDEN ACREEDORAS", "ctadep": None, "nivel": 1, "resumen": True}
]

def obtener_token():
    data = urllib.parse.urlencode({'username': USERNAME, 'password': PASSWORD}).encode('utf-8')
    req = urllib.request.Request(LOGIN_URL, data=data)
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return res_data.get('access_token')
    except Exception as e:
        print(f"❌ Error al autenticar: {e}")
        return None

def inyectar_cuentas(token):
    for cta in cuentas_niif:
        payload = {
            "cuentas": cta["cuentas"],
            "nombre": cta["nombre"],
            "ctadep": cta["ctadep"],
            "nivel": cta["nivel"],
            "resumen": cta["resumen"],
            "usuario_creacion": "script_carga",
            "terminal_ip": "127.0.0.1"
        }
        
        req = urllib.request.Request(CATALOGO_URL, data=json.dumps(payload).encode('utf-8'), headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        })
        
        try:
            with urllib.request.urlopen(req) as response:
                print(f"✅ Cuenta inyectada: {cta['cuentas']} - {cta['nombre']}")
        except urllib.error.HTTPError as e:
            error_msg = e.read().decode('utf-8')
            print(f"⚠️  No se pudo inyectar {cta['cuentas']}: {error_msg}")
        except Exception as e:
            print(f"❌ Error de conexión al procesar {cta['cuentas']}: {e}")

if __name__ == "__main__":
    print("=== INICIANDO INYECCIÓN DE CATÁLOGO ===")
    token = obtener_token()
    if token:
        print("🔓 Autenticación exitosa. Token obtenido.")
        inyectar_cuentas(token)
        print("=== PROCESO FINALIZADO ===")
    else:
        print("⛔ No se pudo obtener el token de seguridad.")