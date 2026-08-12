import os
from pathlib import Path

def crear_andamiaje_frontend():
    base_dir = Path(".")
    
    # 1. Definición de directorios Frontend
    directorios = [
        base_dir / "templates",
        base_dir / "static",
        base_dir / "static" / "css",
        base_dir / "static" / "js",
    ]

    print("=== INICIANDO CREACIÓN DE ESTRUCTURA FRONTEND ===")
    for directorio in directorios:
        directorio.mkdir(parents=True, exist_ok=True)
        print(f"[Directorio Creado / Verificado] -> {directorio}")

    # 2. Contenido de los archivos estáticos (CSS / JS)
    css_content = """
/* static/css/style.css */
body {
    background-color: #f8f9fa;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.sidebar {
    min-height: 100vh;
    background-color: #343a40;
    color: white;
}
.sidebar a {
    color: #adb5bd;
    text-decoration: none;
    padding: 10px 15px;
    display: block;
}
.sidebar a:hover, .sidebar a.active {
    color: #fff;
    background-color: #495057;
}
.card-kpi {
    border-left: 4px solid #0d6efd;
}
"""

    js_content = """
/* static/js/main.js */
// Utilidad global para manejar el Token JWT y peticiones autorizadas

function getAuthToken() {
    return localStorage.getItem('access_token');
}

function checkAuth() {
    const token = getAuthToken();
    if (!token && window.location.pathname !== '/login.html' && window.location.pathname !== '/') {
        window.location.href = '/login.html';
    }
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('rol');
    localStorage.removeItem('empresa_activa');
    localStorage.removeItem('anio_activo');
    window.location.href = '/login.html';
}

async function apiFetch(endpoint, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    const config = {
        ...options,
        headers: headers
    };
    const response = await fetch(endpoint, config);
    if (response.status === 401) {
        logout();
    }
    return response;
}

// Ejecutar validación de seguridad al cargar cualquier página
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
});
"""

    # 3. Contenido de las plantillas HTML (Jinja2)
    login_html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Sistema Contable</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body class="d-flex align-items-center py-4 bg-light" style="height: 100vh;">
    <main class="form-signin w-100 m-auto" style="max-width: 400px;">
        <div class="card shadow-sm">
            <div class="card-body p-4">
                <h2 class="text-center mb-4">Acceso Seguro</h2>
                <form id="loginForm">
                    <div class="form-floating mb-3">
                        <input type="text" class="form-control" id="username" name="username" placeholder="Usuario" required>
                        <label for="username">Usuario</label>
                    </div>
                    <div class="form-floating mb-3">
                        <input type="password" class="form-control" id="password" name="password" placeholder="Contraseña" required>
                        <label for="password">Contraseña</label>
                    </div>
                    <button class="w-100 btn btn-lg btn-primary" type="submit">Ingresar</button>
                    <div id="loginError" class="alert alert-danger mt-3 d-none" role="alert"></div>
                </form>
            </div>
        </div>
    </main>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('username', document.getElementById('username').value);
            formData.append('password', document.getElementById('password').value);

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('rol', data.rol);
                    window.location.href = '/index.html';
                } else {
                    const errDiv = document.getElementById('loginError');
                    errDiv.textContent = data.detail || 'Error de credenciales';
                    errDiv.classList.remove('d-none');
                }
            } catch (error) {
                console.error('Error de conexión:', error);
            }
        });
    </script>
</body>
</html>"""

    index_html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Selección de Entorno - Sistema Contable</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body class="bg-light pt-5">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card shadow-sm">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">Paso 2: Selección de Empresa y Ejercicio</h4>
                    </div>
                    <div class="card-body">
                        <form id="envForm">
                            <div class="mb-3">
                                <label for="empresa" class="form-label">Empresa / Entidad</label>
                                <select class="form-select" id="empresa" required>
                                    <option value="" selected disabled>Cargando empresas...</option>
                                    <!-- Aquí se inyectarán las empresas vía JS -->
                                    <option value="EMP01">Comercial Demo S.A. (NIIF)</option>
                                </select>
                            </div>
                            <div class="mb-4">
                                <label for="anio" class="form-label">Año Contable</label>
                                <input type="number" class="form-control" id="anio" value="2026" min="2000" max="2100" required>
                            </div>
                            <button type="submit" class="btn btn-success w-100">Ingresar al Sistema</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="/static/js/main.js"></script>
    <script>
        document.getElementById('envForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const empresa = document.getElementById('empresa').value;
            const anio = document.getElementById('anio').value;
            
            localStorage.setItem('empresa_activa', empresa);
            localStorage.setItem('anio_activo', anio);
            
            window.location.href = '/dashboard.html';
        });
    </script>
</body>
</html>"""

    plantilla_base_dashboard = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{titulo} - Sistema Contable</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
    <div class="d-flex">
        <!-- Sidebar -->
        <div class="sidebar p-3" style="width: 250px;">
            <h4 class="text-white text-center mb-4">Contabilidad</h4>
            <div id="entorno-info" class="text-warning small mb-3 text-center"></div>
            <hr class="text-secondary">
            <a href="/dashboard.html" class="{activo_dash}">Dashboard</a>
            <a href="/catalogo.html" class="{activo_cat}">Catálogo de Cuentas</a>
            <a href="/partidas.html" class="{activo_part}">Libro Diario (Partidas)</a>
            <a href="/reportes.html" class="{activo_rep}">Reportes Financieros</a>
            <a href="/configuracion.html" class="{activo_conf}">Configuración</a>
            <hr class="text-secondary">
            <button onclick="logout()" class="btn btn-danger btn-sm w-100 mt-3">Cerrar Sesión</button>
        </div>

        <!-- Contenido Principal -->
        <div class="flex-grow-1 bg-light">
            <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom px-4">
                <span class="navbar-brand mb-0 h1">{titulo}</span>
            </nav>
            <div class="container-fluid p-4">
                {contenido}
            </div>
        </div>
    </div>
    <script src="/static/js/main.js"></script>
    <script>
        document.addEventListener("DOMContentLoaded", () => {
            const emp = localStorage.getItem('empresa_activa');
            const anio = localStorage.getItem('anio_activo');
            if(!emp || !anio) {
                window.location.href = '/index.html';
            }
            document.getElementById('entorno-info').innerText = `Empresa: ${emp} | Año: ${anio}`;
        });
    </script>
</body>
</html>"""

    # Generación de pantallas internas reemplazando las variables de la plantilla base
    dashboard_html = plantilla_base_dashboard.format(
        titulo="Dashboard", activo_dash="active", activo_cat="", activo_part="", activo_rep="", activo_conf="",
        contenido="""
        <div class="row">
            <div class="col-md-4 mb-4">
                <div class="card card-kpi shadow-sm">
                    <div class="card-body">
                        <h6 class="text-muted">Total Activos</h6>
                        <h3 class="mb-0">$ 0.00</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card card-kpi shadow-sm" style="border-left-color: #dc3545;">
                    <div class="card-body">
                        <h6 class="text-muted">Total Pasivos</h6>
                        <h3 class="mb-0">$ 0.00</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card card-kpi shadow-sm" style="border-left-color: #198754;">
                    <div class="card-body">
                        <h6 class="text-muted">Partidas en Borrador</h6>
                        <h3 class="mb-0">0</h3>
                    </div>
                </div>
            </div>
        </div>
        """
    )

    catalogo_html = plantilla_base_dashboard.format(
        titulo="Catálogo de Cuentas", activo_dash="", activo_cat="active", activo_part="", activo_rep="", activo_conf="",
        contenido="""
        <div class="card shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center bg-white">
                <h5 class="mb-0">Estructura Jerárquica</h5>
                <button class="btn btn-primary btn-sm">+ Nueva Cuenta</button>
            </div>
            <div class="card-body">
                <p class="text-muted">El catálogo de cuentas se cargará aquí vía API...</p>
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Nombre de la Cuenta</th>
                            <th>Nivel</th>
                            <th>Tipo</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-cuentas">
                        <!-- Llenado dinámico -->
                    </tbody>
                </table>
            </div>
        </div>
        """
    )

    partidas_html = plantilla_base_dashboard.format(
        titulo="Libro Diario (Partidas)", activo_dash="", activo_cat="", activo_part="active", activo_rep="", activo_conf="",
        contenido="""
        <div class="card shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center bg-white">
                <h5 class="mb-0">Registro de Transacciones</h5>
                <button class="btn btn-primary btn-sm">+ Registrar Partida</button>
            </div>
            <div class="card-body">
                <table class="table table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>No.</th>
                            <th>Fecha</th>
                            <th>Concepto</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-partidas">
                        <!-- Llenado dinámico -->
                    </tbody>
                </table>
            </div>
        </div>
        """
    )

    reportes_html = plantilla_base_dashboard.format(
        titulo="Reportes Financieros", activo_dash="", activo_cat="", activo_part="", activo_rep="active", activo_conf="",
        contenido="""
        <div class="row">
            <div class="col-md-6 mb-4">
                <div class="card shadow-sm h-100">
                    <div class="card-body text-center">
                        <h5 class="card-title">Balance General</h5>
                        <p class="text-muted">Generar Estado de Situación Financiera al cierre.</p>
                        <button class="btn btn-outline-primary">Generar Reporte</button>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-4">
                <div class="card shadow-sm h-100">
                    <div class="card-body text-center">
                        <h5 class="card-title">Estado de Resultados</h5>
                        <p class="text-muted">Consultar ingresos, costos y gastos del período.</p>
                        <button class="btn btn-outline-success">Generar Reporte</button>
                    </div>
                </div>
            </div>
        </div>
        """
    )

    configuracion_html = plantilla_base_dashboard.format(
        titulo="Configuración del Sistema", activo_dash="", activo_cat="", activo_part="", activo_rep="", activo_conf="active",
        contenido="""
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-white"><h5 class="mb-0">Control de Períodos (Meses)</h5></div>
            <div class="card-body">
                <p>Gestión del semáforo mensual para bloquear o habilitar la digitación de partidas.</p>
                <!-- Interfaz de meses -->
            </div>
        </div>
        """
    )

    # 4. Mapeo de archivos y escritura en disco
    archivos = {
        base_dir / "static" / "css" / "style.css": css_content,
        base_dir / "static" / "js" / "main.js": js_content,
        base_dir / "templates" / "login.html": login_html,
        base_dir / "templates" / "index.html": index_html,
        base_dir / "templates" / "dashboard.html": dashboard_html,
        base_dir / "templates" / "catalogo.html": catalogo_html,
        base_dir / "templates" / "partidas.html": partidas_html,
        base_dir / "templates" / "reportes.html": reportes_html,
        base_dir / "templates" / "configuracion.html": configuracion_html,
    }

    print("\n=== ESCRIBIENDO ARCHIVOS FÍSICOS ===")
    for ruta, contenido in archivos.items():
        with open(ruta, "w", encoding="utf-8") as f:
            f.write(contenido.strip())
        print(f"[Archivo Creado] -> {ruta}")

    print("\n=== ESTRUCTURA FRONTEND COMPLETADA CON ÉXITO ===")

if __name__ == "__main__":
    crear_andamiaje_frontend()