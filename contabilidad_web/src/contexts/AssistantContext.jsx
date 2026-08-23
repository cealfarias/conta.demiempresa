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
  
  const dismiss = useCallback(() => {
    setIsActive(false);
    setStep(0);
    setHighlightId(null);
    setOptions(null);
    setOnboardingType(null);
    window.speechSynthesis?.cancel();
  }, []);
  
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

  const startCierreOnboarding = useCallback(() => {
    if (localStorage.getItem('avatar_cierre_done') === 'true') return;
    
    setIsActive(true);
    setOnboardingType('CIERRE');
    
    setTimeout(() => {
      say(
        "Bienvenido al módulo de Cierre del Ejercicio Fiscal. Este es un proceso sumamente delicado y de carácter irreversible.",
        null,
        null
      );
      
      setTimeout(() => {
        say(
          "Antes de continuar, te recuerdo que bajo nuestros Términos de Servicio, eres el único responsable de la integridad de tus datos. Te recomiendo encarecidamente que realices una copia de seguridad local (Backup) antes de proceder.",
          "cierre-page",
          [
            { 
              label: "Entendido, estoy listo", 
              action: () => {
                say("Excelente. El sistema te guiará paso a paso en la liquidación de cuentas de resultados y la preparación de los saldos iniciales para el siguiente año.");
                localStorage.setItem('avatar_cierre_done', 'true');
                setTimeout(() => dismiss(), 6000);
              }
            }
          ]
        );
      }, 7000);
    }, 1000);
  }, [say]);


  const startPreCierreFixes = useCallback((borradores, meses) => {
    setIsActive(true);
    const queue = [];
    if (borradores && borradores.length > 0) {
      borradores.forEach(b => queue.push({ type: 'borrador', id: b.id, numero: b.numero_partida }));
    }
    if (meses && meses.length > 0) {
      queue.push({ type: 'meses', meses });
    }

    const executeNextFix = (q, index) => {
      if (index >= q.length) {
        navigate('/dashboard/cierre');
        say("¡Excelente! Hemos completado todas las correcciones necesarias. Ahora puedes proceder a generar las provisiones.", null, [
          { label: 'Entendido', action: dismiss }
        ]);
        return;
      }

      const step = q[index];
      if (step.type === 'borrador') {
        navigate(`/dashboard/partidas/editar/${step.id}`);
        say(`La Partida #${step.numero} está en Borrador. Por favor, revísala y guárdala (Mayorizar o Imprimir). Cuando termines, presiona Continuar.`, null, [
          { label: 'Ya la guardé, Continuar', action: () => executeNextFix(q, index + 1) }
        ]);
      } else if (step.type === 'meses') {
        navigate('/dashboard/configuracion');
        say(`Falta cerrar los meses: ${step.meses.join(', ')}. Ve a la pestaña "Períodos Contables" y ciérralos. Avísame cuando termines.`, null, [
          { label: 'Ya los cerré, Continuar', action: () => executeNextFix(q, index + 1) }
        ]);
      }
    };

    say(
      `He detectado que faltan requisitos. Hay ${borradores?.length || 0} partida(s) en borrador y ${meses?.length || 0} mes(es) sin cerrar. ¿Quieres que te guíe paso a paso para corregirlos?`,
      null,
      [
        {
          label: 'Sí, guíame',
          action: () => executeNextFix(queue, 0)
        },
        {
          label: 'No, lo haré yo',
          action: dismiss
        }
      ]
    );
  }, [say, dismiss, navigate]);

  const resetAllOnboardings = useCallback(() => {
    localStorage.removeItem('avatar_first_greeting_done');
    localStorage.removeItem('avatar_partidas_done');
    sessionStorage.removeItem('avatar_login_greeted');
    window.location.reload();
  }, []);



  const getGreetingByTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  // Saludo de bienvenida en la página de Login
  const startLoginGreeting = useCallback(() => {
    const alreadyGreeted = sessionStorage.getItem('avatar_login_greeted');
    if (alreadyGreeted) return;

    sessionStorage.setItem('avatar_login_greeted', 'true');
    setIsActive(true);
    setOnboardingType('LOGIN_GREETING');

    const greeting = getGreetingByTime();
    say(`¡${greeting}! Soy tu asistente virtual especializado en las Normas Internacionales de Información Financiera, NIIF. Estoy aquí para guiarte en toda la aplicación contable de Mi Empresa Online.`);

    // Fase 2: Pausa de 10 segundos y luego invitación a registrarse
    setTimeout(() => {
      if (window.location.pathname !== '/login' && window.location.pathname !== '/registro') return;
      say('Si aún no tienes una cuenta, te invito a registrarte. El proceso es rápido y sencillo, en menos de 5 minutos tendrás tu entorno contable listo. Te recomendamos registrarte con tu cuenta de Google para mayor seguridad y comodidad.');
    }, 18000);

    // Se oculta después de 38 segundos en total
    setTimeout(() => {
      if (window.location.pathname === '/login' || window.location.pathname === '/registro') {
        dismiss();
      }
    }, 38000);
  }, [say]);

  // Cuando el usuario intenta login con Google pero no está registrado
  const handleGoogleNotRegistered = useCallback((email) => {
    setIsActive(true);
    setOnboardingType('LOGIN_GREETING');
    say(`La cuenta ${email} aún no está registrada en el sistema. No te preocupes, te redirigiremos a la página de registro donde podrás crear tu entorno contable en menos de 5 minutos.`);

    setTimeout(() => {
      navigate('/registro');
    }, 5000);

    setTimeout(() => {
      dismiss();
    }, 8000);
  }, [say, navigate]);

  const startPartidasOnboarding = useCallback((username) => {
    const isFirstTime = localStorage.getItem('avatar_partidas_done') !== 'true';
    if (!isFirstTime) return;
    
    setIsActive(true);
    setOnboardingType('PARTIDAS');
    setStep(20);
    
    // Paso 1
    say(`Hola ${username}, en esta sección se verán las partidas del mes seleccionado.`, 'mes-selector');
    
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
    const isPartidasArea = location.pathname.startsWith('/dashboard/partidas');
    
    if (step > 0 && !isDashboardRoot && !isCatalogoArea && onboardingType !== 'PARTIDAS' && onboardingType !== 'LOGIN_GREETING') {
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
    startPartidasOnboarding,
    startLoginGreeting,
    handleGoogleNotRegistered,
    resetAllOnboardings,
    startCierreOnboarding,
    startPreCierreFixes,
    dismiss
    }}>
      {children}
    </AssistantContext.Provider>
  );
};
