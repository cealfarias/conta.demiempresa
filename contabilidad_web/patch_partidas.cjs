const fs = require('fs');
let code = fs.readFileSync('./src/pages/Partidas.jsx', 'utf8');

// 1. Import useAssistant
if (!code.includes('useAssistant')) {
  code = code.replace("import { useNavigate } from 'react-router-dom';", "import { useNavigate } from 'react-router-dom';\nimport { useAssistant } from '../contexts/AssistantContext';");
}

// 2. Add useAssistant and username
if (!code.includes('startPartidasOnboarding')) {
  const insertHook = `const navigate = useNavigate();
  const { startPartidasOnboarding } = useAssistant();
  const username = localStorage.getItem('username') || 'Usuario';
  
  useEffect(() => {
    startPartidasOnboarding(username);
  }, [startPartidasOnboarding, username]);`;
  
  code = code.replace('const navigate = useNavigate();', insertHook);
}

// 3. Add IDs
// mes-selector
code = code.replace('<select', '<select id="mes-selector"');

// btn-importar-partidas
code = code.replace('onClick={() => navigate(\'/dashboard/partidas/importar\')}', 'id="btn-importar-partidas" onClick={() => navigate(\'/dashboard/partidas/importar\')}');

// btn-nueva-partida
code = code.replace('onClick={handleNuevaPartida}', 'id="btn-nueva-partida" onClick={handleNuevaPartida}');

// search-bar
code = code.replace('placeholder="Buscar por concepto o número..."', 'id="search-bar" placeholder="Buscar por concepto o número..."');

// grid-headers
code = code.replace('<thead className="bg-slate-50 border-b border-slate-200">', '<thead id="grid-headers" className="bg-slate-50 border-b border-slate-200">');

fs.writeFileSync('./src/pages/Partidas.jsx', code);
