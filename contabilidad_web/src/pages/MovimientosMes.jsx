import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Printer, Eye, FolderOpen } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function MovimientosMes() {
  const { codigo, mes } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [cuentaInfo] = useState(location.state?.cuenta || { cuentas: codigo, nombre: 'Cargando...' });
  const [mesNombre] = useState(location.state?.mesNombre || `Mes ${mes}`);
  const [empresaId] = useState(location.state?.empresaId || 'CANTARES');
  const [anio] = useState(location.state?.anio || 2026);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchMovimientos();
  }, [codigo, mes]);

  const fetchMovimientos = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v1/catalogo/${codigo}/movimientos/${mes}?empresa_id=${empresaId}&anio=${anio}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (err) {
      console.error('Error fetching movimientos:', err);
      setError('Error al obtener los movimientos. Verifique la conexión.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleVerPartida = (idPartida) => {
    // Open in a new tab to not lose context, or navigate
    window.open(`/dashboard/partidas/imprimir/${idPartida}`, '_blank');
  };

  const raiz = codigo ? codigo.charAt(0) : '1';
  const esAcreedora = ['2', '3', '5'].includes(raiz);
  
  let granTotalSaldo = 0;

  return (
    <div className="p-4 md:p-8 w-full max-w-6xl mx-auto bg-slate-50 min-h-full print:bg-white print:p-0">
      
      {/* Header and Controls - Hidden on print */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 print:hidden gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium bg-slate-100"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Volver a Saldos
        </button>
        
        <button 
          onClick={handlePrint}
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-colors font-bold shadow-sm"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Auxiliar
        </button>
      </div>

      {/* Report Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 mb-6 print:shadow-none print:border-none print:p-0 print:mb-4">
        <div className="mb-2">
          <span className="px-2 py-0.5 bg-slate-800 text-white text-[11px] font-bold rounded mr-2 uppercase tracking-wider">
            Empresa: {empresaId}
          </span>
          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[11px] font-bold rounded uppercase tracking-wider mr-2">
            Ejercicio: {anio}
          </span>
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded uppercase tracking-wider">
            Mes: {mesNombre}
          </span>
        </div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-4 mb-1">
          Auxiliar de Movimientos Detallados
        </h2>
        <h1 className="text-2xl font-bold text-slate-900">
          {cuentaInfo.cuentas} - {cuentaInfo.nombre}
        </h1>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none">
        <div className="p-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <h3 className="font-semibold text-slate-800">Transacciones del mes de {mesNombre}</h3>
          <p className="text-xs text-slate-500">Haz clic en el ojito para visualizar el comprobante de la partida.</p>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-slate-500 font-medium">Buscando transacciones...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-6 text-center">
              {error}
            </div>
          ) : !data?.subcuentas || data.subcuentas.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No se registraron transacciones ni saldos para esta cuenta en {mesNombre}.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 print:bg-slate-50 border-b-2 border-slate-200 text-slate-700 uppercase text-[11px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4 w-28">Fecha</th>
                  <th className="py-3 px-4 w-24">Partida</th>
                  <th className="py-3 px-4">Concepto / Descripción</th>
                  <th className="py-3 px-4 text-right w-28">Cargos</th>
                  <th className="py-3 px-4 text-right w-28">Abonos</th>
                  <th className="py-3 px-4 text-right w-32">Saldo</th>
                  <th className="py-3 px-4 text-center w-16 print:hidden">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.subcuentas.map((sub, idx) => {
                  let saldoLinea = parseFloat(sub.saldo_inicio_mes || 0);

                  return (
                    <React.Fragment key={sub.codigo || idx}>
                      {/* Sub-account Header */}
                      <tr className="bg-slate-800 text-white print:bg-slate-200 print:text-black">
                        <td colSpan="7" className="py-2 px-4 font-bold text-xs uppercase tracking-wider">
                          <div className="flex items-center">
                            <FolderOpen className="w-3.5 h-3.5 mr-2 text-indigo-400 print:text-slate-600" />
                            {sub.codigo} - {sub.nombre}
                          </div>
                        </td>
                      </tr>

                      {/* Sub-account Initial Balance */}
                      <tr className="bg-slate-50/80 font-semibold text-slate-500 text-xs">
                        <td className="py-2 px-4 text-slate-300">--</td>
                        <td className="py-2 px-4 text-slate-300">--</td>
                        <td className="py-2 px-4 italic">Saldo acumulado al inicio del mes</td>
                        <td className="py-2 px-4 text-right font-mono">$0.00</td>
                        <td className="py-2 px-4 text-right font-mono">$0.00</td>
                        <td className="py-2 px-4 text-right font-mono text-slate-800">
                          ${formatCurrency(saldoLinea)}
                        </td>
                        <td className="py-2 px-4 print:hidden"></td>
                      </tr>

                      {/* Sub-account Movements */}
                      {(!sub.movimientos || sub.movimientos.length === 0) ? (
                        <tr>
                          <td colSpan="7" className="py-4 text-center text-slate-400 text-xs italic">
                            Sin movimientos registrados en este periodo. Mantiene saldo inicial.
                          </td>
                        </tr>
                      ) : (
                        sub.movimientos.map((mov, mIdx) => {
                          const cargos = parseFloat(mov.cargos || 0);
                          const abonos = parseFloat(mov.abonos || 0);

                          if (esAcreedora) {
                            saldoLinea += (abonos - cargos);
                          } else {
                            saldoLinea += (cargos - abonos);
                          }

                          const mesFormateado = String(mes).padStart(2, '0');
                          const partidaFormateada = String(mov.partida).padStart(4, '0');
                          const partidaTexto = `${mesFormateado}-${partidaFormateada}`;

                          return (
                            <tr key={mIdx} className="hover:bg-indigo-50/30 transition-colors group">
                              <td className="py-2.5 px-4 font-mono text-slate-500 text-[13px]">{mov.fecha}</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-indigo-600 text-[13px]">{partidaTexto}</td>
                              <td className="py-2.5 px-4 text-slate-700 text-xs">{mov.concepto}</td>
                              <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600">
                                ${formatCurrency(cargos)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600">
                                ${formatCurrency(abonos)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-sm font-bold text-slate-900 group-hover:text-indigo-700">
                                ${formatCurrency(saldoLinea)}
                              </td>
                              <td className="py-2.5 px-4 text-center print:hidden">
                                <button 
                                  onClick={() => handleVerPartida(mov.id_partida)}
                                  className="p-1.5 bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white rounded transition-colors shadow-sm"
                                  title="Visualizar Partida"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                      
                      {/* Invisible accumulator for the grand total */}
                      <span className="hidden">
                        {granTotalSaldo += saldoLinea}
                      </span>
                    </React.Fragment>
                  );
                })}

                {/* Grand Total Row if multiple subaccounts */}
                {data.subcuentas.length > 1 && (
                  <tr className="bg-slate-200 border-t-2 border-slate-400">
                    <td colSpan="5" className="py-4 px-4 text-right font-bold text-slate-800 uppercase text-xs">
                      Saldo Final Consolidado (Cuenta {codigo}):
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-lg font-bold text-indigo-900">
                      ${formatCurrency(granTotalSaldo)}
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
    </div>
  );
}

export default MovimientosMes;
