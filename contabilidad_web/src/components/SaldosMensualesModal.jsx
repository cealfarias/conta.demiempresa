import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Eye } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function SaldosMensualesModal({ isOpen, onClose, cuenta, empresaId = 'CANTARES', anio = 2026 }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (isOpen && cuenta) {
      fetchSaldos();
    }
  }, [isOpen, cuenta]);

  const fetchSaldos = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v1/catalogo/${cuenta.cuentas}/saldos-mensuales?empresa_id=${empresaId}&anio=${anio}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (err) {
      console.error('Error fetching saldos mensuales:', err);
      setError('Error al obtener los saldos. Verifique la conexión.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  let saldoAcumulado = data ? parseFloat(data.saldo_inicial || 0) : 0;
  
  const raiz = cuenta ? cuenta.cuentas.charAt(0) : '1';
  const esAcreedora = ['2', '3', '5'].includes(raiz);

  const formatCurrency = (val) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded">
                EMPRESA: {empresaId} | EJERCICIO: {anio}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase">Consulta de Saldos Mensuales</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {cuenta?.cuentas} - {cuenta?.nombre}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-auto bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-slate-500 font-medium">Calculando saldos...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Mes del Año</th>
                    <th className="py-3 px-4">Concepto</th>
                    <th className="py-3 px-4 text-right">Cargos</th>
                    <th className="py-3 px-4 text-right">Abonos</th>
                    <th className="py-3 px-4 text-right">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Saldo Inicial */}
                  <tr className="bg-slate-50/50 font-semibold text-slate-700">
                    <td className="py-2.5 px-4 text-slate-400">--</td>
                    <td className="py-2.5 px-4">SALDO INICIAL</td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs">$0.00</td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs">$0.00</td>
                    <td className="py-2.5 px-4 text-right font-mono text-sm text-indigo-700">
                      ${formatCurrency(saldoAcumulado)}
                    </td>
                  </tr>
                  
                  {/* Movimientos por mes */}
                  {data?.meses?.map((mov) => {
                    const numeroMes = mov.mes;
                    const nombreMes = mesesNombres[numeroMes - 1] || `Mes ${numeroMes}`;
                    const cargos = parseFloat(mov.cargos || 0);
                    const abonos = parseFloat(mov.abonos || 0);
                    
                    if (esAcreedora) {
                      saldoAcumulado += (abonos - cargos);
                    } else {
                      saldoAcumulado += (cargos - abonos);
                    }

                    return (
                      <tr key={numeroMes} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="py-2.5 px-4 font-semibold text-slate-700">{nombreMes}</td>
                        <td className="py-2.5 px-4 text-slate-500 text-xs">Saldos correspondientes a {nombreMes}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600">
                          ${formatCurrency(cargos)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600">
                          ${formatCurrency(abonos)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                          ${formatCurrency(saldoAcumulado)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}

export default SaldosMensualesModal;
