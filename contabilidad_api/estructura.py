import os
from pathlib import Path

def crear_andamiaje_sistema_contable():
    """
    Crea la estructura de carpetas y archivos para el sistema de contabilidad modular.
    Diseñado para separar responsabilidades por entidad y evitar el crecimiento desordenado.
    """
    # Raíz del backend del proyecto contable
    base_dir = Path(".")

    # 1. Definición de la estructura de subcarpetas jerárquicas
    directorios = [
        base_dir / "config",                # Configuraciones globales y de base de datos
        base_dir / "models",                # Modelos ORM de SQLAlchemy separados por entidad
        base_dir / "schemas",               # Esquemas de validación Pydantic por entidad
        base_dir / "crud",                  # Lógica de negocio y consultas de base de datos (Create, Read, Update, Delete)
        base_dir / "routers",               # Endpoints de la API (FastAPI Routers) por módulo
        base_dir / "services",              # Motores de cálculo complejos (Consolidación de estados financieros)
        base_dir / "middleware",            # Controladores de sesiones, auditoría y seguridad
        base_dir / "scripts"                # Scripts independientes de mantenimiento (MIGRACIONES / INIT)
    ]

    # 2. Creación de directorios físicos
    print("=== INICIANDO CREACIÓN DE DIRECTORIOS CONTABLES ===")
    for directorio in directorios:
        directorio.mkdir(parents=True, exist_ok=True)
        print(f"[Directorio Creado / Verificado] -> {directorio}")

    # 3. Definición de archivos necesarios (inicializadores y módulos)
    archivos = [
        # Capa de Configuración Central
        base_dir / "config" / "__init__.py",
        base_dir / "config" / "database.py",
        
        # Capa de Modelos de Base de Datos (Inmutabilidad)
        base_dir / "models" / "__init__.py",
        base_dir / "models" / "empresa.py",
        base_dir / "models" / "cuenta.py",
        base_dir / "models" / "periodo.py",
        base_dir / "models" / "partida.py",
        base_dir / "models" / "firma.py",
        
        # Capa de Esquemas de Validación (Pydantic)
        base_dir / "schemas" / "__init__.py",
        base_dir / "schemas" / "empresa.py",
        base_dir / "schemas" / "cuenta.py",
        base_dir / "schemas" / "periodo.py",
        base_dir / "schemas" / "partida.py",
        base_dir / "schemas" / "reporte.py",
        base_dir / "schemas" / "firma.py",
        base_dir / "schemas" / "auditoria.py",  # Esquema base para reusar los campos de login
        
        # Capa de Controladores de Datos (CRUD)
        base_dir / "crud" / "__init__.py",
        base_dir / "crud" / "empresa.py",
        base_dir / "crud" / "cuenta.py",
        base_dir / "crud" / "periodo.py",
        base_dir / "crud" / "partida.py",
        base_dir / "crud" / "firma.py",
        
        # Capa de Rutas de la API (Routers de FastAPI)
        base_dir / "routers" / "__init__.py",
        base_dir / "routers" / "empresa.py",
        base_dir / "routers" / "cuenta.py",
        base_dir / "routers" / "periodo.py",
        base_dir / "routers" / "partida.py",
        base_dir / "routers" / "reporte.py",
        
        # Capa de Servicios Lógicos de Alto Nivel
        base_dir / "services" / "__init__.py",
        base_dir / "services" / "motor_reportes.py", # Centraliza las fórmulas matemáticas de los Estados Financieros
        
        # Capa de Interceptores y Login Context
        base_dir / "middleware" / "__init__.py",
        base_dir / "middleware" / "contexto_auditoria.py",
        
        # Scripts Autónomos de Inicialización
        base_dir / "scripts" / "__init__.py",
        base_dir / "scripts" / "init_db.py",
        
        # Orquestador Principal - NOTA: El script no sobrescribirá si ya existe
        base_dir / "main.py"
    ]

    print("\n=== INICIANDO CREACIÓN DE ARCHIVOS DE ARQUITECTURA ===")
    for archivo in archivos:
        if archivo.name == "main.py" and archivo.exists():
            # Regla de oro estricta: No tocar el archivo main.py bajo ninguna circunstancia si ya existe
            print(f"[REGLA DE PROTECCIÓN DE DATOS] -> main.py ya existe en el directorio. Omitiendo modificación.")
            continue
        
        # Crea el archivo en modo append si no existe para no borrar código existente por error
        if not archivo.exists():
            with open(archivo, "w", encoding="utf-8") as f:
                # Escribimos un encabezado de identificación para mantener la guía limpia
                f.write(f"# Archivo modular: {archivo.relative_to(base_dir)}\n# Diseñado de acuerdo a regulaciones contables.\n")
            print(f"[Archivo Inicializado] -> {archivo}")
        else:
            print(f"[Archivo Existente - Resguardado] -> {archivo}")

    print("\n=== PROCESO DE CONFIGURACIÓN DEL CAJÓN COMPLETADO CON ÉXITO ===")
    print("El andamiaje modular está listo para recibir el código entidad por entidad de forma aislada.")

if __name__ == "__main__":
    crear_andamiaje_sistema_contable()