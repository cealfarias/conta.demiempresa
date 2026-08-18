import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Volume2, VolumeX, MessageSquare, X } from 'lucide-react';

const routeMessages = {
  '/dashboard': 'Bienvenido a tu panel de control. Aquí puedes ver el resumen financiero de tu empresa.',
  '/dashboard/partidas': 'Módulo de partidas. Aquí registrarás tus ingresos, gastos y movimientos diarios. Recuerda cuadrar el debe y el haber.',
  '/dashboard/catalogo': 'Este es tu catálogo de cuentas. Mantén tu estructura organizada para generar mejores reportes.',
  '/dashboard/configuracion': 'Configuración del sistema. Desde aquí puedes invitar nuevos usuarios, asignar roles y configurar tu empresa.',
  '/dashboard/reportes/estado-resultados': 'Estado de Resultados. Revisa los ingresos, costos y la utilidad neta de este periodo.',
  '/dashboard/reportes/balance-general': 'Balance General. Aquí puedes ver la salud financiera, tus activos, pasivos y el patrimonio de la empresa.',
  '/dashboard/reportes/balance-comprobacion': 'Balance de Comprobación. Úsalo para asegurarte de que la suma de saldos deudores y acreedores sea igual.',
  '/dashboard/suscripcion': 'Suscripción. Administra tu plan premium para acceder a auditorías avanzadas y funciones pro.',
};

export default function AssistantAvatar() {
  const location = useLocation();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const synth = window.speechSynthesis;
  const utteranceRef = useRef(null);
  
  // Encontrar el mensaje adecuado, buscando coincidencias parciales si no hay exacta
  const getMessageForRoute = (pathname) => {
    // Exact match
    if (routeMessages[pathname]) return routeMessages[pathname];
    
    // Partial matches
    if (pathname.includes('/partidas/editar')) {
      return 'Modo de edición de partida. Completa los datos generales y luego modifica los detalles de las cuentas.';
    }
    if (pathname.includes('/catalogo/saldos')) {
      return 'Saldos mensuales. Revisa el historial y la gráfica de movimientos de esta cuenta específica.';
    }
    
    // Default
    return '';
  };

  useEffect(() => {
    // Si la síntesis de voz no está soportada, no hacemos nada
    if (!synth) return;

    // Detener cualquier locución previa al cambiar de ruta
    synth.cancel();

    const text = getMessageForRoute(location.pathname);
    if (!text) {
      setShowMessage(false);
      return;
    }

    setCurrentText(text);
    setShowMessage(true);

    if (!isMuted) {
      // Necesitamos esperar un momento breve por temas de bugs en algunos navegadores
      setTimeout(() => {
        speakText(text);
      }, 500);
    }
    
    // Auto-hide the text bubble after some time
    const timer = setTimeout(() => {
      setShowMessage(false);
    }, 12000);

    return () => {
      clearTimeout(timer);
      synth.cancel();
    };
  }, [location.pathname, isMuted]);

  const speakText = (text) => {
    if (!synth || isMuted) return;
    
    synth.cancel(); // Cancelar locución actual si la hay
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; // Español
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Intentar buscar una voz en español que suene natural
    const voices = synth.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft')));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    synth.speak(utterance);
  };

  const toggleMute = () => {
    if (!isMuted) {
      synth.cancel();
      setIsSpeaking(false);
    } else if (currentText) {
      speakText(currentText);
    }
    setIsMuted(!isMuted);
  };

  const repeatMessage = () => {
    setShowMessage(true);
    speakText(currentText);
  };

  // Ensure voices are loaded (Chrome sometimes needs this)
  useEffect(() => {
    if (synth && synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = () => {
        // Voices loaded
      };
    }
  }, []);

  // Check if we are in premium trial or logic
  // For now, always show. In the future: if (!isPremium && trialExpired) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      
      {/* Burbuja de Mensaje Flotante */}
      {showMessage && currentText && (
        <div className="mb-4 bg-white p-4 rounded-2xl shadow-2xl border border-indigo-100 max-w-xs animate-in slide-in-from-bottom-4 fade-in relative">
          <button 
            onClick={() => setShowMessage(false)}
            className="absolute -top-2 -right-2 bg-slate-100 text-slate-500 rounded-full p-1 hover:bg-slate-200 transition-colors shadow-sm"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="flex items-start space-x-3">
            <div className="bg-indigo-100 p-2 rounded-full mt-1 shrink-0">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {currentText}
            </p>
          </div>
          {/* Triangulito de la burbuja apuntando al avatar */}
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-b border-r border-indigo-100 transform rotate-45"></div>
        </div>
      )}

      {/* Avatar / Botón principal */}
      <div className="flex items-center space-x-3">
        {/* Controles secundarios */}
        <div className={`flex bg-white shadow-lg rounded-full border border-slate-200 overflow-hidden transition-all duration-300 ${(isSpeaking || showMessage) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
          <button 
            onClick={repeatMessage}
            className="p-2.5 text-indigo-600 hover:bg-indigo-50 transition-colors border-r border-slate-200"
            title="Repetir mensaje"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button 
            onClick={toggleMute}
            className="p-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
            title={isMuted ? "Activar voz" : "Silenciar voz"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Círculo del Avatar */}
        <button
          onClick={toggleMute}
          className={`relative group flex items-center justify-center w-14 h-14 rounded-full shadow-2xl shadow-indigo-500/40 transition-all duration-500 ${isSpeaking && !isMuted ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 animate-pulse' : 'bg-gradient-to-tr from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500'}`}
        >
          {/* Ondas animadas cuando habla */}
          {isSpeaking && !isMuted && (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-75"></span>
              <span className="absolute -inset-2 rounded-full border border-purple-300 animate-ping opacity-50" style={{ animationDelay: '0.2s' }}></span>
            </>
          )}
          
          <Bot className="w-7 h-7 text-white" />

          {/* Badge de silencio */}
          {isMuted && (
            <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white rounded-full p-1 border-2 border-white shadow-sm">
              <VolumeX className="w-3 h-3" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
