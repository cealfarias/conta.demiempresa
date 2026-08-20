const fs = require('fs');
let code = fs.readFileSync('./src/contexts/AssistantContext.jsx', 'utf8');

const regex = /const isCatalogoArea = location\.pathname\.startsWith\('\/dashboard\/catalogo'\);/;
const replaceWith = `const isCatalogoArea = location.pathname.startsWith('/dashboard/catalogo');
    const isPartidasArea = location.pathname.startsWith('/dashboard/partidas');`;

code = code.replace(regex, replaceWith);

const regex2 = /if \(step > 0 && !isDashboardRoot && !isCatalogoArea\) \{/;
const replaceWith2 = `if (step > 0 && !isDashboardRoot && !isCatalogoArea && onboardingType !== 'PARTIDAS') {`;

code = code.replace(regex2, replaceWith2);

const regex3 = /const evaluateDashboardStatus = /;
const newFunction = `
  const startPartidasOnboarding = useCallback((username) => {
    const isFirstTime = localStorage.getItem('avatar_partidas_done') !== 'true';
    if (!isFirstTime) return;
    
    setIsActive(true);
    setOnboardingType('PARTIDAS');
    setStep(20);
    
    // Paso 1
    say(\`Hola \${username}, en esta sección se verán las partidas del mes seleccionado.\`, 'mes-selector');
    
    // Paso 2 (después de 8s)
    setTimeout(() => {
       if (window.location.pathname !== '/dashboard/partidas') return;
       setStep(21);
       say('Puedes ordenarlas por número de partida y por fecha haciendo click en el encabezado de la cuadrícula.', 'grid-headers');
    }, 8000);
    
    // Paso 3 (después de 16s)
    setTimeout(() => {
       if (window.location.pathname !== '/dashboard/partidas') return;
       setStep(22);
       say('Si gustas puedes realizar una búsqueda por concepto o número de partida.', 'search-bar');
    }, 16000);
    
    // Paso 4 (después de 24s)
    setTimeout(() => {
       if (window.location.pathname !== '/dashboard/partidas') return;
       setStep(23);
       say('Para adicionar una partida nueva solo da click en el botón de nueva partida.', 'btn-nueva-partida');
    }, 24000);
    
    // Paso 5 (después de 32s)
    setTimeout(() => {
       if (window.location.pathname !== '/dashboard/partidas') return;
       setStep(24);
       say('Si en algun dado caso no ves tus partidas recarga la página, o envía un mensaje a soporte técnico.');
    }, 32000);
    
    // Paso 6 (Pausa de 10s extra -> total 45s)
    setTimeout(() => {
       if (window.location.pathname !== '/dashboard/partidas') return;
       setStep(25);
       say('Te diré un tips para mejorar tu experiencia... puedes importar tus partidas... te ahorrarás mucho trabajo...', 'btn-importar-partidas');
    }, 45000);
    
    // Fin
    setTimeout(() => {
       if (window.location.pathname !== '/dashboard/partidas') return;
       localStorage.setItem('avatar_partidas_done', 'true');
       dismiss();
    }, 55000);

  }, [say]);

  const evaluateDashboardStatus = `;

code = code.replace(regex3, newFunction);

const regex4 = /reportProgress,\s*dismiss/;
const replaceWith4 = `reportProgress,
    startPartidasOnboarding,
    dismiss`;
code = code.replace(regex4, replaceWith4);

fs.writeFileSync('./src/contexts/AssistantContext.jsx', code);
