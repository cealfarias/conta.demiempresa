const fs = require('fs');
let code = fs.readFileSync('./src/contexts/AssistantContext.jsx', 'utf8');

if (!code.includes('resetAllOnboardings')) {
  const insertReset = `
  const resetAllOnboardings = useCallback(() => {
    localStorage.removeItem('avatar_first_greeting_done');
    localStorage.removeItem('avatar_partidas_done');
    window.location.reload();
  }, []);

  const dismiss = () => {`;
  code = code.replace('const dismiss = () => {', insertReset);

  const exportReset = `startPartidasOnboarding,
    resetAllOnboardings,
    dismiss`;
  code = code.replace(/startPartidasOnboarding,\s*dismiss/, exportReset);

  fs.writeFileSync('./src/contexts/AssistantContext.jsx', code);
}
