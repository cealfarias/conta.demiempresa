import React, { useState, useEffect } from 'react';
import { ArrowLeft, Book, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

export default function Terminos() {
  const navigate = useNavigate();
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Apuntamos al archivo centralizado en Vercel directamente para evitar problemas de DNS
    const url = window.location.hostname === 'localhost' 
      ? '/terminos.md' 
      : 'https://demiempresa.vercel.app/terminos.md';
      
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('No se pudo cargar los términos');
        return res.text();
      })
      .then(text => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Header Fijo */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <Book className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-lg hidden sm:block">Términos de Referencia</h1>
          </div>
          
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <CheckCircle className="w-4 h-4" />
            Documento Legal Vigente
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-slate-900 text-white py-16 border-b-4 border-indigo-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">Términos de Referencia y<br/>Contrato de Servicio</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Acuerdo legal que rige el uso de la Plataforma SaaS. 
            Al crear un entorno, usted acepta incondicionalmente estos términos.
          </p>
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="max-w-4xl mx-auto px-4 py-12 -mt-8 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8 sm:p-12">
          
          <div className="flex items-center gap-4 text-slate-500 mb-8 pb-8 border-b border-slate-100">
            <span className="flex items-center gap-1.5 text-sm">
              <Clock className="w-4 h-4" /> Obteniendo última versión de demiempresa.online
            </span>
          </div>

          <div className="prose prose-slate prose-indigo max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Cargando términos centralizados...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-48 text-red-500">
                <p>Error al cargar los términos. Por favor intente más tarde.</p>
              </div>
            ) : (
              <ReactMarkdown>{markdown}</ReactMarkdown>
            )}
          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-12 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm">
          <p>© 2026 Mi Empresa Online. Todos los derechos reservados.</p>
          <p className="mt-2">Hecho en El Salvador por ingenieros y contadores de primer nivel.</p>
        </div>
      </footer>

    </div>
  );
}
