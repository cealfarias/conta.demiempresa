import React, { useEffect, useState, useRef } from 'react';
import { Bot, X, RotateCcw } from 'lucide-react';
import { useAssistant } from '../../contexts/AssistantContext';

export default function Avatar() {
  const { isActive, message, options, dismiss, resetAllOnboardings } = useAssistant();
  const [displayedText, setDisplayedText] = useState('');
  
  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialClientX: 0, initialClientY: 0 });
  
  // Menu state
  const [showMenu, setShowMenu] = useState(false);

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
    }, 40);

    return () => clearInterval(interval);
  }, [message]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY
      });
    };

    const handleMouseUp = (e) => {
      setIsDragging(false);
      // Determine if it was a pure click (no significant drag)
      const dx = Math.abs(e.clientX - dragRef.current.initialClientX);
      const dy = Math.abs(e.clientY - dragRef.current.initialClientY);
      
      if (dx < 5 && dy < 5) {
        setShowMenu(prev => !prev);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y,
      initialClientX: e.clientX,
      initialClientY: e.clientY
    };
  };

  return (
    <div 
      className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end animate-in slide-in-from-bottom-8 fade-in duration-500"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      {/* Burbuja de menú manual */}
      {showMenu && !isActive && (
        <div className="bg-white text-slate-800 p-3 rounded-2xl rounded-br-sm shadow-xl border border-slate-100 mb-4 w-56 relative animate-in fade-in zoom-in-95">
          <button 
            onClick={() => setShowMenu(false)}
            className="absolute -top-2 -right-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-full p-1 transition-opacity shadow-sm z-10"
            title="Cerrar menú"
          >
            <X className="w-3 h-3" />
          </button>
          
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Asistente Virtual</h5>
          
          <button 
            onClick={() => {
              setShowMenu(false);
              if (resetAllOnboardings) resetAllOnboardings();
            }}
            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Repetir tutoriales
          </button>
        </div>
      )}

      {/* Burbuja de diálogo del asistente (cuando está activo) */}
      {isActive && message && (
        <div className="bg-white text-slate-800 p-4 rounded-2xl rounded-br-sm shadow-xl border border-slate-100 mb-4 max-w-sm relative group">
          <button 
            onClick={dismiss}
            className="absolute -top-2 -right-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Cerrar asistente"
          >
            <X className="w-3 h-3" />
          </button>
          
          <p className="text-sm font-medium leading-relaxed select-text">
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
      <div 
        className="relative cursor-move drag-handle"
        onMouseDown={handleMouseDown}
        title="Arrastra para mover o haz click para opciones"
      >
        <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-25 pointer-events-none"></div>
        <div className={`relative bg-gradient-to-tr from-indigo-600 to-purple-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2 border-white pointer-events-none transition-all ${isActive ? 'animate-bounce shadow-indigo-500/30' : 'shadow-slate-400 hover:scale-105'}`} style={isActive ? { animationDuration: '3s' } : {}}>
          <Bot className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}
