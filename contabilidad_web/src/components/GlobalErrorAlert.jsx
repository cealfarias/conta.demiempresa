import React, { useState, useEffect } from 'react';
import { AlertCircle, LifeBuoy, RefreshCw } from 'lucide-react';

export default function GlobalErrorAlert({ error, context = "Sistema Contable", extraInfo = {}, onRetry }) {
  const [timeLeft, setTimeLeft] = useState(0);

  // Determinar si es un error de inicio de servidor
  const isWakingUp = error?.includes('iniciando');

  useEffect(() => {
    if (isWakingUp) {
      // 120 segundos = 2 minutos
      setTimeLeft(120);
    } else {
      setTimeLeft(0);
    }
  }, [error, isWakingUp]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);

  if (!error) return null;

  const url = typeof window !== 'undefined' ? window.location.href : 'Desconocida';
  const time = new Date().toLocaleString();
  const username = typeof localStorage !== 'undefined' ? (localStorage.getItem('username') || 'No autenticado') : 'Desconocido';
  
  let infoExtraStr = '';
  if (Object.keys(extraInfo).length > 0) {
    infoExtraStr = Object.entries(extraInfo)
      .filter(([_, val]) => val) // Solo incluir valores que existan
      .map(([key, val]) => `- ${key}: ${val}`)
      .join('\n');
  }

  const bodyContent = `Hola soporte, necesito ayuda con el siguiente error.

📋 DETALLE DEL ERROR:
${error}

🔍 INFORMACIÓN DE DIAGNÓSTICO:
- Pantalla: ${context}
- URL: ${url}
- Fecha/Hora: ${time}
- Sesión Local: ${username}
${infoExtraStr}

👣 PASOS PARA REPRODUCIR (Opcional):
1. 
`;

  const mailToUrl = `mailto:cealfarias@gmail.com?subject=Problema Técnico - ${encodeURIComponent(context)}&body=${encodeURIComponent(bodyContent)}`;

  return (
    <div className="bg-red-50/90 border border-red-200 text-red-700 px-4 py-4 rounded-xl mb-6 shadow-sm flex flex-col gap-3 transition-all animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
        <div className="flex-1 font-medium text-sm">
          {error}
        </div>
      </div>
      
      <div className="flex justify-end pt-2 border-t border-red-100/50 mt-1 gap-2">
        {onRetry && (
          <button 
            type="button"
            onClick={onRetry}
            disabled={timeLeft > 0}
            className={`inline-flex items-center gap-2 text-xs font-bold py-2 px-3 rounded-lg transition-colors ${
              timeLeft > 0 
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${timeLeft > 0 ? 'animate-spin' : ''}`} />
            {timeLeft > 0 ? `Iniciando... (${timeLeft}s)` : 'Intenta nuevamente'}
          </button>
        )}
        <a 
          href={mailToUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold py-2 px-3 rounded-lg transition-colors cursor-pointer"
        >
          <LifeBuoy className="w-4 h-4" />
          Soporte Técnico
        </a>
      </div>
    </div>
  );
}
