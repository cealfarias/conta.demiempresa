import React, { useEffect, useState } from 'react';
import { Bot, X } from 'lucide-react';
import { useAssistant } from '../../contexts/AssistantContext';

export default function Avatar() {
  const { isActive, message, options, dismiss } = useAssistant();
  const [displayedText, setDisplayedText] = useState('');

  // Efecto de máquina de escribir
  useEffect(() => {
    if (!message) {
      setDisplayedText('');
      return;
    }
    
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(message.substring(0, i + 1));
      i++;
      if (i >= message.length) clearInterval(interval);
    }, 40); // Velocidad de la máquina de escribir

    return () => clearInterval(interval);
  }, [message]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end animate-in slide-in-from-bottom-8 fade-in duration-500">
      {/* Burbuja de diálogo */}
      {message && (
        <div className="bg-white text-slate-800 p-4 rounded-2xl rounded-br-sm shadow-xl border border-slate-100 mb-4 max-w-sm relative group">
          <button 
            onClick={dismiss}
            className="absolute -top-2 -right-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Cerrar asistente"
          >
            <X className="w-3 h-3" />
          </button>
          
          <p className="text-sm font-medium leading-relaxed">
            {displayedText}
            {displayedText.length < message.length && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 animate-pulse"></span>
            )}
          </p>

          {/* Opciones interactivas */}
          {options && displayedText.length === message.length && (
            <div className="mt-4 flex space-x-2">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={opt.action}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                    idx === 0 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Avatar (Robot) que palpita */}
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-25"></div>
        <div className="relative bg-gradient-to-tr from-indigo-600 to-purple-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 border-2 border-white animate-bounce" style={{ animationDuration: '3s' }}>
          <Bot className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}
