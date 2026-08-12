import sys
import os
import sqlite3
from datetime import datetime
from passlib.context import CryptContext

# [BANDERA 0] Verificando rutas del sistema operativo
print("🚩 [BANDERA 0] Iniciando script de instalación...")
print(f"   -> Directorio del script: {os.path.dirname(__file__)}")
print(f"   -> Directorio de trabajo actual (CWD): {os.getcwd()}")

# Inyectar el directorio raíz del proyecto en el path de ejecución
raiz_proyecto = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(raiz_proyecto)
print(f"   -> Raíz del proyecto inyectada al sys.path: {raiz_proyecto}")

try:
    print("🚩 [BANDERA 0.1] Intentando importar configuración y modelos ORM...")
    from config.database import engine, Base
    import models.cuenta
    import models.empresa
    print("   -> [OK] Importaciones del ORM exitosas.")
except ImportError as e:
    print(f"   -> [WARN] Error de importación: {str(e)}")
    print("   -> Se continuará usando ejecución SQLite directa.")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Catálogo estándar NIIF El Salvador
CUENTAS_NIIF = [
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

def ejecutar_instalacion(anio_fiscal):
    print("")
    print("=== PROCESANDO INSTALACIÓN CON BANDERAS DE SEGUIMIENTO ===")
    
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'sistema_contable.db')) 
    print(f"🚩 [BANDERA 1] Ruta absoluta destino SQLite: {db_path}")
    
    # Paso 1: Creación de la estructura ORM
    print("")
    print("[1/5] Ejecutando Base.metadata.create_all...")
    try:
        Base.metadata.create_all(bind=engine)
        print("      [OK] ORM finalizado sin excepciones lanzadas.")
    except Exception as e:
        print(f"      [ERROR ORM] {str(e)}")

    # Conexión SQL directa
    try:
        print(f"🚩 [BANDERA 2] Abriendo conexión nativa a SQLite...")
        conexion = sqlite3.connect(db_path)
        cursor = conexion.cursor()
        print("      [OK] Conexión establecida de forma nativa.")

        # Paso 2: Esquema de seguridad (Usuarios)
        print("")
        print("[2/5] Gestionando tabla 'usuarios'...")
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
        
        cursor.execute("SELECT id FROM usuarios WHERE username = 'admin'")
        if not cursor.fetchone():
            print("   -> [BANDERA 2.1] El usuario 'admin' no existe. Inyectando...")
            cursor.execute(
                """
                INSERT INTO usuarios (username, hashed_password, rol, activo) 
                VALUES (?, ?, ?, 1)
                """,
                ("admin", pwd_context.hash("admin123"), "admin")
            )
            print("      [OK] Usuario administrador guardado temporalmente en memoria.")
        else:
            print("      [INFO] El usuario 'admin' ya existe.")

        # Paso 3: Empresa semilla
        print("")
        print("[3/5] Gestionando tabla 'empresas'...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS empresas (
                id TEXT PRIMARY KEY,
                razon_social TEXT NOT NULL,
                nombre_comercial TEXT,
                nit TEXT NOT NULL,
                nrc TEXT,
                giro TEXT NOT NULL,
                normativa TEXT NOT NULL,
                usuario_creacion TEXT NOT NULL,
                fecha_creacion TEXT NOT NULL,
                terminal_ip TEXT NOT NULL
            )
            """
        )
        
        cursor.execute("SELECT id FROM empresas WHERE id = 'EMP01'")
        if not cursor.fetchone():
            print("   -> [BANDERA 3.1] La empresa 'EMP01' no existe. Inyectando...")
            cursor.execute(
                """
                INSERT INTO empresas (id, razon_social, nombre_comercial, nit, nrc, giro, normativa, usuario_creacion, fecha_creacion, terminal_ip) 
                VALUES ('EMP01', 'EMPRESA INICIAL S.A. DE C.V.', 'EMPRESA INICIAL', '0000-000000-000-0', '00000-0', 'Configuración del Sistema', 'NIIF_PYMES', 'admin', ?, '127.0.0.1')
                """,
                (datetime.now().strftime("%Y-%m-%d %H:%M:%S"),)
            )
            print("      [OK] Empresa 'EMP01' inyectada temporalmente.")
        else:
            print("      [INFO] La empresa 'EMP01' ya existe.")

        # Paso 4: Períodos fiscales (Corregido: id se maneja automático)
        print("")
        print(f"[4/5] Gestionando tabla 'control_periodos' para el año {anio_fiscal}...")
        
        # Consultamos si ya existen periodos para este año
        try:
            cursor.execute("SELECT id FROM control_periodos WHERE empresa_id = 'EMP01' AND anio = ?", (anio_fiscal,))
            existencias_periodos = cursor.fetchall()
        except sqlite3.OperationalError:
            # Si la tabla no se creó con el ORM por alguna razón, la creamos aquí
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS control_periodos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    empresa_id TEXT NOT NULL,
                    anio INTEGER NOT NULL,
                    mes INTEGER NOT NULL,
                    mes_abierto INTEGER DEFAULT 1,
                    anio_abierto INTEGER DEFAULT 1,
                    total_partidas INTEGER DEFAULT 0
                )
                """
            )
            existencias_periodos = []

        print(f"   -> [BANDERA 4.1] Períodos encontrados en BD para {anio_fiscal}: {len(existencias_periodos)}")
        
        if len(existencias_periodos) == 0:
            print(f"   -> [BANDERA 4.2] Generando los 12 meses para el año {anio_fiscal}...")
            for mes in range(1, 13):
                print(f"      -> Insertando mes: {mes:02d} para año {anio_fiscal}")
                cursor.execute(
                    """
                    INSERT INTO control_periodos (empresa_id, anio, mes, mes_abierto, anio_abierto, total_partidas)
                    VALUES ('EMP01', ?, ?, 1, 1, 0)
                    """,
                    (anio_fiscal, mes)
                )
            print(f"      [OK] 12 meses agregados a memoria transaccional.")
        else:
            print("      [INFO] Ciclo de meses omitido porque ya existen registros.")

        # Paso 5: Catálogo Independiente (Empresa + Año + Cuenta)
        print("")
        print(f"[5/5] Gestionando tabla 'cuentacontable' para EMP01 e hito fiscal {anio_fiscal}...")
        
        try:
            cursor.execute("SELECT cuentas FROM cuentacontable WHERE empresa_id = 'EMP01' AND anio = ? LIMIT 5", (anio_fiscal,))
            muestras_catalogo = cursor.fetchall()
        except sqlite3.OperationalError:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS cuentacontable (
                    empresa_id TEXT NOT NULL,
                    anio INTEGER NOT NULL,
                    cuentas TEXT NOT NULL,
                    nombre TEXT NOT NULL,
                    ctadep TEXT,
                    nivel INTEGER NOT NULL,
                    resumen INTEGER NOT NULL,
                    usuario_creacion TEXT,
                    terminal_ip TEXT,
                    PRIMARY KEY (empresa_id, anio, cuentas)
                )
                """
            )
            muestras_catalogo = []

        print(f"   -> [BANDERA 5.1] Muestra de cuentas existentes para EMP01-{anio_fiscal}: {muestras_catalogo}")
        
        if len(muestras_catalogo) == 0:
            print(f"   -> [BANDERA 5.2] Inyectando cuentas de forma masiva ({len(CUENTAS_NIIF)} ítems)...")
            for cta in CUENTAS_NIIF:
                cursor.execute(
                    """
                    INSERT INTO cuentacontable (empresa_id, anio, cuentas, nombre, ctadep, nivel, resumen, usuario_creacion, terminal_ip) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'admin_instalador', '127.0.0.1')
                    """,
                    ('EMP01', anio_fiscal, cta["cuentas"], cta["nombre"], cta["ctadep"], cta["nivel"], 1 if cta["resumen"] else 0)
                )
            print("      [OK] Cuentas mapeadas e inyectadas a memoria transaccional.")
        else:
            print("      [INFO] Catálogo omitido porque ya posee registros vigentes.")

        print("")
        print("🚩 [BANDERA FINAL] Aplicando conexion.commit() definitivo...")
        conexion.commit()
        print("      [OK] Todos los datos han sido grabados exitosamente en el disco duro.")

    except Exception as e:
        print(f"\n❌ [ERROR CRÍTICO EN TRANSACCIÓN] Hubo un colapso en el sembrado directo: {str(e)}")
    finally:
        if 'conexion' in locals() and conexion:
            conexion.close()
            print("🚩 [BANDERA AUTOMÁTICA] Conexión con SQLite cerrada de manera segura.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            anio_seleccionado = int(sys.argv[1])
        except ValueError:
            anio_seleccionado = None
    else:
        anio_seleccionado = None

    if anio_seleccionado is None:
        anio_actual = datetime.now().year
        entrada = input(f"Introduce el año fiscal a inicializar (Presiona Enter para usar {anio_actual}): ").strip()
        if entrada == "":
            anio_seleccionado = anio_actual
        else:
            try:
                anio_seleccionado = int(entrada)
            except ValueError:
                anio_seleccionado = anio_actual

    ejecutar_instalacion(anio_seleccionado)