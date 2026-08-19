import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AssistantContext = createContext();

export const useAssistant = () => useContext(AssistantContext);

export const AssistantProvider = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState(null); // Array of { label, action }
  const [highlightId, setHighlightId] = useState(null);
  const [onboardingType, setOnboardingType] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Load a Spanish voice if available
  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      
      const voices = window.speechSynthesis.getVoices();
      
      // Intentar español de El Salvador primero
      const svVoice = voices.find(v => v.lang === 'es-SV' || v.lang === 'es_SV' || v.name.includes('Salvador'));
      
      if (svVoice) {
        utterance.voice = svVoice;
      } else {
        // Fallback a otras voces en español (priorizando las de Google)
        const esVoice = voices.find(v => v.lang.startsWith('es-') && v.name.includes('Google'));
        if (esVoice) utterance.voice = esVoice;
        else {
          const anyEs = voices.find(v => v.lang.startsWith('es-'));
          if (anyEs) utterance.voice = anyEs;
        }
      }
      
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech API blocked or failed', e);
      }
    }
  }, []);

  const say = useCallback((text, highlight = null, interactiveOptions = null) => {
    setMessage(text);
    setHighlightId(highlight);
    setOptions(interactiveOptions);
    speak(text);
  }, [speak]);

  const dismiss = () => {
    setIsActive(false);
    setStep(0);
    setHighlightId(null);
    setOptions(null);
    setOnboardingType(null);
    window.speechSynthesis?.cancel();
  };

  const getGreetingByTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const evaluateDashboardStatus = useCallback((isCatVacio, isManualVacio) => {
    const isFirstTime = localStorage.getItem('avatar_first_greeting_done') !== 'true';
    
    setIsActive(true);
    
    if (isFirstTime) {
      say('¡Bienvenido a la Contabilidad de mi Empresa Online! Este es el Corazón de la información financiera, aquí te informaremos cuánto dinero tienes y especialmente cuánto es tu Utilidad antes de Impuestos y Renta, o UAIR.');
      localStorage.setItem('avatar_first_greeting_done', 'true');
      
      // Pause before evaluating
      setTimeout(() => {
        if (isCatVacio) {
           setOnboardingType('CATALOG');
           setStep(1);
           say('He revisado tu configuración y he detectado que tu catálogo de cuentas está vacío. Te sugiero que tu primera tarea sea llenarlo junto con el manual de cuentas. ¡Vamos allá!');
           setTimeout(() => navigate('/dashboard/catalogo'), 6000);
        } else if (isManualVacio) {
           setOnboardingType('MANUAL');
           setStep(10);
           say('Veo que ya tienes un catálogo, pero te falta el manual de cuentas. Es muy importante para la experiencia del usuario. ¡Vamos a importarlo!');
           setTimeout(() => navigate('/dashboard/catalogo'), 5000);
        } else {
           say('Todo se ve excelente. Estaré aquí para cualquier consulta contable.');
           setTimeout(() => dismiss(), 5000);
        }
      }, 12000); // Tiempo para decir la introducción
      
    } else {
      const greeting = getGreetingByTime();
      
      if (isCatVacio) {
         setOnboardingType('CATALOG');
         setStep(1);
         say(`¡${greeting}! Nuevamente te sugiero el llenado de tu catálogo y manual de cuentas. ¡Es fundamental! Vamos allá.`);
         setTimeout(() => navigate('/dashboard/catalogo'), 5000);
      } else if (isManualVacio) {
         setOnboardingType('MANUAL');
         setStep(10);
         say(`¡${greeting}! Aún te falta el manual de cuentas. Recuerda que es importante completarlo para una mejor experiencia. ¡Vamos a importarlo!`);
         setTimeout(() => navigate('/dashboard/catalogo'), 6000);
      } else {
         const isPremium = localStorage.getItem('licencia_tipo') === 'premium';
         if (!isPremium) {
           say(`¡${greeting}! Todo está en orden. Te invitamos a pasar a Premium para disfrutar de funcionalidades exclusivas, o si tienes dudas, comunícate con nosotros en Soporte Técnico.`);
           setTimeout(() => dismiss(), 7000);
         } else {
           say(`¡${greeting}! Todo está en orden. Estaré aquí para cualquier consulta contable, o escríbenos a Soporte Técnico si necesitas ayuda.`);
           setTimeout(() => dismiss(), 6000);
         }
      }
    }
  }, [say, navigate]);

  // Manejador del resaltado visual
  useEffect(() => {
    // Limpia el highlight anterior
    document.querySelectorAll('.assistant-highlight').forEach(el => {
      el.classList.remove('assistant-highlight', 'ring-4', 'ring-indigo-500', 'ring-offset-2', 'animate-pulse', 'z-50', 'relative');
    });

    if (highlightId && isActive) {
      const el = document.getElementById(highlightId);
      if (el) {
        el.classList.add('assistant-highlight', 'ring-4', 'ring-indigo-500', 'ring-offset-2', 'animate-pulse', 'z-50', 'relative');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightId, isActive]);

  useEffect(() => {
    if (!isActive) return;

    // Detectar si el usuario salió del flujo de onboarding
    const isDashboardRoot = location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    const isCatalogoArea = location.pathname.startsWith('/dashboard/catalogo');
    
    if (step > 0 && !isDashboardRoot && !isCatalogoArea) {
      // El usuario se fue a otra página (ej. /dashboard/partidas) mientras estaba en onboarding
      say('Veo que estás explorando otra pantalla. ¿Deseas pausar el tutorial por ahora?', null, [
        { label: 'Sí, pausar', action: () => dismiss() },
        { label: 'Continuar tutorial', action: () => { 
            setOptions(null); 
            navigate(onboardingType === 'MANUAL' && step >= 11 ? '/dashboard/catalogo/importar-manual' : '/dashboard/catalogo'); 
        }}
      ]);
      return;
    }

    if (onboardingType === 'CATALOG') {
      if (step === 1 && location.pathname === '/dashboard/catalogo') {
        setStep(2);
        setTimeout(() => {
          say('Puedes crear una cuenta dando clic en "Nueva Cuenta"...', 'btn-nueva-cuenta');
          
          setTimeout(() => {
            setStep(3);
            say('...pero lo más recomendable es importar todo el catálogo.', 'btn-importar-catalogo');
            
            setTimeout(() => {
              setStep(4);
              say('¿Deseas importar el catálogo ahora?', null, [
                { label: 'Sí', action: () => {
                  setOptions(null);
                  say('¡Excelente!');
                  setTimeout(() => navigate('/dashboard/catalogo/importar'), 1500);
                }},
                { label: 'No', action: () => {
                  say('¡De acuerdo! Estaré aquí por si me necesitas.');
                  setTimeout(() => dismiss(), 3000);
                }}
              ]);
            }, 4500);
          }, 4500);
        }, 1000);
      }
      
      if (step === 4 && location.pathname === '/dashboard/catalogo/importar') {
        setStep(5);
        setTimeout(() => {
          say('Primero, dale clic a "Seleccionar archivo" y elige tu Excel o CSV.', 'input-file-import');
        }, 1000);
      }
    } else if (onboardingType === 'MANUAL') {
      if (step === 10 && location.pathname === '/dashboard/catalogo') {
        setStep(11);
        setTimeout(() => {
          say('Haz clic en el botón de "Importar Manual" para subir tu archivo con las descripciones y dinámicas.', 'btn-importar-manual');
        }, 1500);
      }
      
      if (step === 11 && location.pathname === '/dashboard/catalogo/importar-manual') {
        setStep(12);
        setTimeout(() => {
          say('Selecciona tu archivo de Excel o CSV y sigue los mismos pasos que con el catálogo.', 'input-file-import-manual');
        }, 1500);
      }
    }

  }, [isActive, step, location.pathname, say, navigate, onboardingType]);

  const reportProgress = useCallback((action) => {
    if (!isActive) return;

    if (onboardingType === 'CATALOG') {
      if (action === 'FILE_SELECTED' && step === 5) {
        setStep(6);
        say('Ahora da clic al botón que corresponde al código de tu archivo.', 'select-codigo-cuenta');
      }
      else if (action === 'FIRST_MAPPED' && step === 6) {
        setStep(7);
        say('Haz lo mismo con el resto de botones. Una vez hayas mapeado todo, presiona "Importar".', 'btn-importar-action');
      }
      else if (action === 'IMPORT_SUCCESS') {
        say('¡Felicitaciones por haber importado el catálogo con éxito!');
        localStorage.setItem('onboarding_catalog_done', 'true');
        setTimeout(() => {
          dismiss();
          navigate('/dashboard/catalogo');
        }, 4000);
      }
      else if (action === 'IMPORT_ERROR') {
        say('Hay un reporte de cuentas no importadas, por favor resuélvelas.');
        // No ocultamos el assistant, lo dejamos para que el usuario lea
      }
    } else if (onboardingType === 'MANUAL') {
      if (action === 'FILE_SELECTED' && step === 12) {
        setStep(13);
        say('Ahora relaciona cada columna de tu archivo con los campos solicitados y luego presiona "Importar".', 'btn-importar-action');
      }
      else if (action === 'IMPORT_SUCCESS') {
        say('¡Excelente! Has importado tu manual de cuentas con éxito. La experiencia de usuario será fantástica.');
        localStorage.setItem('onboarding_manual_done', 'true');
        setTimeout(() => {
          dismiss();
          navigate('/dashboard/catalogo');
        }, 5000);
      }
      else if (action === 'IMPORT_ERROR') {
        say('Hubo un problema importando el manual. Revisa que los códigos coincidan con tu catálogo actual.');
      }
    }
  }, [isActive, step, say, navigate, onboardingType]);

  return (
    <AssistantContext.Provider value={{
      isActive,
      message,
      options,
      evaluateDashboardStatus,
      reportProgress,
      dismiss
    }}>
      {children}
    </AssistantContext.Provider>
  );
};
