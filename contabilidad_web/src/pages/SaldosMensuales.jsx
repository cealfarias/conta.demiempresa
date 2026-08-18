import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Printer, Eye } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function SaldosMensuales() {
  const { codigo } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [cuentaInfo, setCuentaInfo] = useState(location.state?.cuenta || { cuentas: codigo, nombre: 'Cargando...' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [empresaId] = useState(localStorage.getItem('empresa_activa'));
  const [anio] = useState(2026); // Hardcoded for now, could be context

  useEffect(() => {
    fetchSaldos();
  }, [codigo]);

  const fetchSaldos = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v1/catalogo/${codigo}/saldos-mensuales?empresa_id=${empresaId}&anio=${anio}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
      // If we didn't have full cuenta info from location state, we might need to fetch it separately,
      // but for now we assume the catalog passed it, or it will just show the code.
    } catch (err) {
      console.error('Error fetching saldos mensuales:', err);
      setError('Error al obtener los saldos. Verifique la conexión.');
    } finally {
      setLoading(false);
    }
  };

  const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  let saldoAcumulado = data ? parseFloat(data.saldo_inicial || 0) : 0;
  
  const raiz = codigo ? codigo.charAt(0) : '1';
  const esAcreedora = ['2', '3', '5'].includes(raiz);

  const formatCurrency = (val) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMonthClick = (numeroMes, nombreMes) => {
    navigate(`/dashboard/catalogo/movimientos/${codigo}/${numeroMes}`, {
      state: { 
        cuenta: cuentaInfo, 
        mesNombre: nombreMes,
        empresaId,
        anio
      }
    });
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-5xl mx-auto bg-slate-50 min-h-full print:bg-white print:p-0">
      
      {/* Header and Controls - Hidden on print */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 print:hidden gap-4">
        <button 
          onClick={() => navigate('/dashboard/catalogo')}
          className="flex items-center text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium bg-slate-100"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Volver al Catálogo
        </button>
        
        <button 
          onClick={handlePrint}
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-colors font-bold shadow-sm"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Reporte
        </button>
      </div>

      {/* Report Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6 print:shadow-none print:border-none print:p-0 print:mb-4">
        <div className="mb-2">
          <span className="px-2 py-0.5 bg-slate-800 text-white text-[11px] font-bold rounded mr-2 uppercase tracking-wider">
            Empresa: {empresaId}
          </span>
          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[11px] font-bold rounded uppercase tracking-wider">
            Ejercicio: {anio}
          </span>
        </div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-4 mb-1">
          Consulta de Saldos Mensuales
        </h2>
        <h1 className="text-2xl font-bold text-indigo-900">
          {cuentaInfo.cuentas} - {cuentaInfo.nombre}
        </h1>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
        <div className="p-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <h3 className="font-semibold text-slate-800">Distribución de Saldos por Periodo</h3>
          <p className="text-xs text-slate-500">Haz clic en un mes para ver sus movimientos detallados.</p>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-slate-500 font-medium">Calculando saldos...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-6 text-center">
              {error}
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 print:bg-slate-50 border-b-2 border-slate-200 text-slate-700 uppercase text-[11px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4 w-32">Mes del Año</th>
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4 text-right w-32">Cargos</th>
                  <th className="py-3 px-4 text-right w-32">Abonos</th>
                  <th className="py-3 px-4 text-right w-36">Saldo Acumulado</th>
                  <th className="py-3 px-4 text-center w-24 print:hidden">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Saldo Inicial */}
                <tr className="bg-slate-50/50 font-semibold text-slate-700">
                  <td className="py-3 px-4 text-slate-400">--</td>
                  <td className="py-3 px-4">SALDO INICIAL</td>
                  <td className="py-3 px-4 text-right font-mono text-xs">$0.00</td>
                  <td className="py-3 px-4 text-right font-mono text-xs">$0.00</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-indigo-700">
                    ${formatCurrency(saldoAcumulado)}
                  </td>
                  <td className="py-3 px-4 text-center print:hidden">--</td>
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
                    <tr 
                      key={numeroMes} 
                      onClick={() => handleMonthClick(numeroMes, nombreMes)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-bold text-slate-700 group-hover:text-indigo-700">{nombreMes}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">Saldos correspondientes a {nombreMes}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                        ${formatCurrency(cargos)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                        ${formatCurrency(abonos)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        ${formatCurrency(saldoAcumulado)}
                      </td>
                      <td className="py-3 px-4 text-center print:hidden">
                        <button 
                          className="p-1.5 bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded transition-colors shadow-sm"
                          title={`Ver movimientos de ${nombreMes}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMonthClick(numeroMes, nombreMes);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
    </div>
  );
}

export default SaldosMensuales;
