import React from 'react';
import { AlertCircle, LifeBuoy } from 'lucide-react';

export default function GlobalErrorAlert({ error, context = "Sistema Contable", extraInfo = {} }) {
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

🛠️ PASOS PARA REPRODUCIR (Opcional):
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
      
      <div className="flex justify-end pt-2 border-t border-red-100/50 mt-1">
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
