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
      const esVoice = voices.find(v => v.lang.startsWith('es-') && v.name.includes('Google'));
      if (esVoice) utterance.voice = esVoice;
      else {
        const anyEs = voices.find(v => v.lang.startsWith('es-'));
        if (anyEs) utterance.voice = anyEs;
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
    window.speechSynthesis?.cancel();
  };

  const startOnboarding = useCallback(() => {
    console.log("startOnboarding called! Current state:", {
      done: localStorage.getItem('onboarding_catalog_done')
    });
    if (localStorage.getItem('onboarding_catalog_done') === 'true') {
      console.log("Onboarding was already marked as done. Ignoring.");
      return;
    }
    
    console.log("Setting assistant to ACTIVE and step to 1");
    setIsActive(true);
    setStep(1);
    say('¡Bienvenido! He detectado que no tienes un catálogo de cuentas activo. Tu primera tarea es crearlo, ¡Vamos allá!');
    
    setTimeout(() => {
      navigate('/dashboard/catalogo');
    }, 4500);
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

  }, [isActive, step, location.pathname, say, navigate]);

  const reportProgress = useCallback((action) => {
    if (!isActive) return;

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
  }, [isActive, step, say, navigate]);

  return (
    <AssistantContext.Provider value={{
      isActive,
      message,
      options,
      startOnboarding,
      reportProgress,
      dismiss
    }}>
      {children}
    </AssistantContext.Provider>
  );
};
