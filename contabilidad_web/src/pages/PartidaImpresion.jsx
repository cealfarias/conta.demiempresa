import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Edit } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function PartidaImpresion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partida, setPartida] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPartida = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/v1/partidas/individual/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPartida(response.data);
      } catch (err) {
        setError('Error al cargar la partida para impresión.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPartida();
  }, [id]);

  const handlePrint = async () => {
    if (partida.estado === 'Borrador') {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`${API_URL}/api/v1/partidas/${id}/imprimir`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPartida(prev => ({ ...prev, estado: 'Impresa' }));
      } catch (err) {
        console.error('Error al marcar como impresa', err);
      }
    }
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !partida) {
    return (
      <div className="p-8 text-center text-rose-600">
        <p>{error || 'No se encontró la partida.'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300">
          Volver
        </button>
      </div>
    );
  }

  const totalDebe = partida.detalles.reduce((sum, d) => sum + d.debe, 0);
  const totalHaber = partida.detalles.reduce((sum, d) => sum + d.haber, 0);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex justify-center print:bg-white print:p-0">
      <div className="max-w-4xl w-full">
        
        {/* Barra de Herramientas (Oculta en impresión) */}
        <div className="mb-6 flex justify-between items-center print:hidden bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Regresar
          </button>
          
          <div className="flex space-x-3">
            {(partida.estado === 'Borrador' || 
             (partida.estado === 'Mayorizada' && (localStorage.getItem('rol') === 'Contador' || localStorage.getItem('rol') === 'Administrador'))) && (
              <button 
                onClick={() => navigate(`/dashboard/partidas/editar/${id}`)}
                className="flex items-center bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg transition-colors font-semibold shadow-sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar Partida
              </button>
            )}
            <button 
              onClick={handlePrint}
              className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg transition-colors font-bold shadow-sm"
            >
              <Printer className="w-5 h-5 mr-2" />
              Imprimir Comprobante
            </button>
          </div>
        </div>

        {/* CONTENEDOR DE IMPRESIÓN */}
        <div className={`relative p-10 md:p-14 shadow-lg print:shadow-none border border-slate-200 print:border-none rounded-xl print:rounded-none overflow-hidden ${
          partida.estado === 'Anulada' ? 'bg-rose-50 print:bg-rose-50' : 'bg-white'
        }`}>
          
          {/* Marca de agua si está anulada */}
          {partida.estado === 'Anulada' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0 rotate-[-45deg] scale-150">
              <span className="text-9xl font-black text-rose-600 uppercase tracking-widest border-y-8 border-rose-600 py-4">
                Anulada
              </span>
            </div>
          )}
          
          {/* Cabecera del Documento */}
          <div className="text-center mb-10 relative z-10">
            <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-900 mb-1">CANTARES</h1>
            <h2 className="text-xl font-semibold text-slate-700 mb-6 uppercase">Comprobante de Diario</h2>
            
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4 text-sm font-medium text-slate-800">
              <div className="text-left">
                <p className="mb-1"><span className="font-bold">Fecha:</span> {new Date(partida.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="mb-2"><span className="font-bold">Estado:</span> <span className={partida.estado === 'Anulada' ? 'text-rose-600 font-bold' : ''}>{partida.estado}</span></p>
                <p className="text-[10px] text-slate-500 print:text-slate-700 italic">
                  Impreso el {new Date().toLocaleString('es-ES')} - Sistema Contable Cantares
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold font-mono">No. {partida.nomenclatura}</p>
              </div>
            </div>
          </div>

          <div className="mb-8 text-sm">
            <p className="text-slate-800 font-bold mb-1 uppercase">Concepto:</p>
            <p className="text-slate-700 border p-3 rounded bg-slate-50 print:bg-transparent print:border-slate-300 min-h-[60px]">
              {partida.concepto}
            </p>
          </div>

          {/* Tabla de Detalle */}
          <table className="w-full text-sm border-collapse mb-12 relative z-10">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-50 border-y-2 border-slate-800">
                <th className="py-2 px-2 text-left w-24 border-r border-slate-300">Código</th>
                <th className="py-2 px-2 text-left border-r border-slate-300">Cuenta / Detalle</th>
                <th className="py-2 px-2 text-right w-32 border-r border-slate-300">Debe</th>
                <th className="py-2 px-2 text-right w-32">Haber</th>
              </tr>
            </thead>
            <tbody>
              {partida.detalles.map((d, i) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="py-2 px-2 align-top border-r border-slate-300 font-mono text-xs">{d.cuenta_codigo}</td>
                  <td className="py-2 px-2 align-top border-r border-slate-300">
                    <p className="font-bold text-slate-800">{d.cuenta_nombre}</p>
                    {d.concepto_detalle && <p className="text-xs text-slate-500 italic mt-0.5">{d.concepto_detalle}</p>}
                  </td>
                  <td className="py-2 px-2 text-right align-top border-r border-slate-300 font-mono">
                    {d.debe > 0 ? d.debe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  </td>
                  <td className="py-2 px-2 text-right align-top font-mono">
                    {d.haber > 0 ? d.haber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  </td>
                </tr>
              ))}
              {/* Filas en blanco para llenar espacio si hay muy pocos detalles */}
              {[...Array(Math.max(0, 8 - partida.detalles.length))].map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-slate-100">
                  <td className="py-4 px-2 border-r border-slate-200"></td>
                  <td className="py-4 px-2 border-r border-slate-200"></td>
                  <td className="py-4 px-2 border-r border-slate-200"></td>
                  <td className="py-4 px-2"></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-y-2 border-slate-800 bg-slate-50 print:bg-transparent font-bold">
                <td colSpan="2" className="py-3 px-4 text-right uppercase tracking-wider">Sumas Iguales:</td>
                <td className="py-3 px-2 text-right font-mono border-l-2 border-r border-slate-400">
                  {totalDebe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-2 text-right font-mono border-l border-slate-400">
                  {totalHaber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Firmas */}
          <div className="grid grid-cols-3 gap-8 mt-24 text-center text-xs font-semibold uppercase text-slate-600">
            <div>
              <div className="border-b border-slate-800 w-3/4 mx-auto mb-2 h-8"></div>
              Hecho Por
            </div>
            <div>
              <div className="border-b border-slate-800 w-3/4 mx-auto mb-2 h-8"></div>
              Revisado Por
            </div>
            <div>
              <div className="border-b border-slate-800 w-3/4 mx-auto mb-2 h-8"></div>
              Autorizado Por
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PartidaImpresion;
