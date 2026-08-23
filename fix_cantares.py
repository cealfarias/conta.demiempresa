import os

files = [
    'contabilidad_web/src/pages/FlujoEfectivo.jsx',
    'contabilidad_web/src/pages/MovimientosMes.jsx',
    'contabilidad_web/src/pages/PartidaEditor.jsx',
    'contabilidad_web/src/pages/PartidaImpresion.jsx',
    'contabilidad_web/src/pages/Partidas.jsx',
    'contabilidad_web/src/pages/SaldosMensuales.jsx'
]

replacements = [
    (
        '<h2 className="text-xl font-bold text-slate-800 uppercase">CANTARES S.A DE C.V.</h2>',
        '<h2 className="text-xl font-bold text-slate-800 uppercase">{localStorage.getItem(\'nombre_empresa_activa\') || \'Empresa Activa\'}</h2>'
    ),
    (
        "const [empresaId] = useState(location.state?.empresaId || 'CANTARES');",
        "const [empresaId] = useState(location.state?.empresaId || localStorage.getItem('empresa_activa'));"
    ),
    (
        "const response = await axios.get(`${API_URL}/api/v1/catalogo/?empresa_id=CANTARES&anio=2026`, {",
        "const empresaActiva = localStorage.getItem('empresa_activa');\n      const anioActivo = localStorage.getItem('anio_activo') || new Date().getFullYear();\n      const response = await axios.get(`${API_URL}/api/v1/catalogo/?empresa_id=${empresaActiva}&anio=${anioActivo}`, {"
    ),
    (
        "empresa_id: 'CANTARES',",
        "empresa_id: localStorage.getItem('empresa_activa'),"
    ),
    (
        '<h1 className="text-2xl font-bold uppercase tracking-widest text-slate-900 mb-1">CANTARES</h1>',
        '<h1 className="text-2xl font-bold uppercase tracking-widest text-slate-900 mb-1">{localStorage.getItem(\'nombre_empresa_activa\') || \'Empresa Activa\'}</h1>'
    ),
    (
        "- Sistema Contable Cantares",
        "- Sistema Contable {localStorage.getItem('nombre_empresa_activa') || 'Empresa Activa'}"
    ),
    (
        "// Forzamos empresa CANTARES y ao 2026 por ahora",
        ""
    ),
    (
        "// Forzamos empresa CANTARES y año 2026 por ahora",
        ""
    ),
    (
        "anio: 2026,",
        "anio: localStorage.getItem('anio_activo') || new Date().getFullYear(),"
    ),
    (
        "const [empresaId] = useState('CANTARES'); // Hardcoded for now, could be context",
        "const [empresaId] = useState(localStorage.getItem('empresa_activa'));"
    )
]

for fpath in files:
    full_path = os.path.join('c:\\conta.demiempresa', fpath)
    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        for old, new in replacements:
            content = content.replace(old, new)
            
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {fpath}')
