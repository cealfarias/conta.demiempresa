import os
from pathlib import Path

def actualizar_flujo_mes():
    base_dir = Path(".")
    
    # 1. Plantilla de Selección de Entorno (index.html) modificada para incluir el Mes
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
                        <h4 class="mb-0">Paso 2: Selección de Empresa, Ejercicio y Mes</h4>
                    </div>
                    <div class="card-body">
                        <form id="envForm">
                            <div class="mb-3">
                                <label for="empresa" class="form-label">Empresa / Entidad</label>
                                <select class="form-select" id="empresa" required>
                                    <option value="" selected disabled>Seleccione una empresa...</option>
                                    <option value="EMP01">Comercial Demo S.A. (NIIF)</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="anio" class="form-label">Año Contable</label>
                                <input type="number" class="form-control" id="anio" value="2026" min="2000" max="2100" required>
                            </div>
                            <div class="mb-4">
                                <label for="mes" class="form-label">Mes de Trabajo</label>
                                <select class="form-select" id="mes" required>
                                    <option value="" selected disabled>Seleccione el mes...</option>
                                    <option value="1">Enero</option>
                                    <option value="2">Febrero</option>
                                    <option value="3">Marzo</option>
                                    <option value="4">Abril</option>
                                    <option value="5">Mayo</option>
                                    <option value="6">Junio</option>
                                    <option value="7">Julio</option>
                                    <option value="8">Agosto</option>
                                    <option value="9">Septiembre</option>
                                    <option value="10">Octubre</option>
                                    <option value="11">Noviembre</option>
                                    <option value="12">Diciembre</option>
                                </select>
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
            const mes = document.getElementById('mes').value;
            
            localStorage.setItem('empresa_activa', empresa);
            localStorage.setItem('anio_activo', anio);
            localStorage.setItem('mes_activo', mes);
            
            window.location.href = '/dashboard.html';
        });
    </script>
</body>
</html>"""

    # 2. Plantilla Base actualizada para recuperar el mes, validarlo y mapear su nombre
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
        document.addEventListener("DOMContentLoaded", () => {{
            const emp = localStorage.getItem('empresa_activa');
            const anio = localStorage.getItem('anio_activo');
            const mes = localStorage.getItem('mes_activo');
            
            if(!emp || !anio || !mes) {{
                window.location.href = '/index.html';
            }}
            
            const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const nombreMes = meses[parseInt(mes) - 1];
            
            document.getElementById('entorno-info').innerText = `Empresa: ${{emp}} | Año: ${{anio}} | Mes: ${{nombreMes}}`;
        }});
    </script>
</body>
</html>"""

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
            </div>
        </div>
        """
    )

    # 3. Lógica JS estática para asegurar el borrado del mes al cerrar sesión
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
    localStorage.removeItem('mes_activo');
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

    archivos = {
        base_dir / "static" / "js" / "main.js": js_content,
        base_dir / "templates" / "index.html": index_html,
        base_dir / "templates" / "dashboard.html": dashboard_html,
        base_dir / "templates" / "catalogo.html": catalogo_html,
        base_dir / "templates" / "partidas.html": partidas_html,
        base_dir / "templates" / "reportes.html": reportes_html,
        base_dir / "templates" / "configuracion.html": configuracion_html,
    }

    print("\\n=== ACTUALIZANDO ARCHIVOS FÍSICOS ===")
    for ruta, contenido in archivos.items():
        with open(ruta, "w", encoding="utf-8") as f:
            f.write(contenido.strip())
        print(f"[Archivo Actualizado] -> {ruta}")

if __name__ == "__main__":
    actualizar_flujo_mes()