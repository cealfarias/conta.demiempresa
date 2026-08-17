import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function BalanceGeneral() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  // Controles
  const [mesActual, setMesActual] = useState(new Date().getMonth() + 1);
  const [nivelNIIF, setNivelNIIF] = useState(4);
  const anio = 2026; // TODO: sacar del entorno global
  
  // Nombres de firmas configurables con localStorage
  const [firmaContador, setFirmaContador] = useState(localStorage.getItem('firmaContador') || "");
  const [firmaRepresentante, setFirmaRepresentante] = useState(localStorage.getItem('firmaRepresentante') || "");
  const [firmaAuditor, setFirmaAuditor] = useState(localStorage.getItem('firmaAuditor') || "");

  // Guardar automáticamente al cambiar
  useEffect(() => {
    localStorage.setItem('firmaContador', firmaContador);
    localStorage.setItem('firmaRepresentante', firmaRepresentante);
    localStorage.setItem('firmaAuditor', firmaAuditor);
  }, [firmaContador, firmaRepresentante, firmaAuditor]);

  const meses = [
    { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' }
  ];

  const fetchBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const empresa_id = localStorage.getItem('empresa_activa');
      if (!empresa_id) throw new Error("No hay empresa activa seleccionada");

      const response = await axios.get(
        `${API_URL}/api/v1/reportes/balance-general/${empresa_id}/${anio}/${mesActual}?nivel=${nivelNIIF}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Error al cargar el Balance General");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [mesActual, nivelNIIF]);

  const formatoMoneda = (monto) => {
    if (monto === 0) return "-";
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(monto));
  };

  const formatearFila = (cuenta, index, array) => {
    // Trataremos como 'Total' a las cuentas padre (Nivel 3 o menor) o las virtuales de resultado
    const isTotal = cuenta.es_total || cuenta.nivel <= 3;
    let saldoMostrar = cuenta.saldo;
    
    // Identificar si es el último hijo para poner la línea de cierre en el Parcial
    const nextCuenta = array[index + 1];
    const isLastChild = !isTotal && (!nextCuenta || nextCuenta.nivel < cuenta.nivel);

    return (
      <tr key={cuenta.codigo} className={`${isTotal ? 'font-bold' : ''}`}>
        <td 
          className={`py-1.5 px-2 border-slate-100 text-xs ${isTotal ? 'text-slate-800 uppercase' : 'text-slate-600'}`} 
          style={{ paddingLeft: `${(cuenta.nivel - 2) * 1.5 + 0.5}rem` }}
        >
          {cuenta.nombre}
        </td>
        
        {/* Columna PARCIAL (Nivel 4+) */}
        <td className="py-1.5 px-2 text-xs text-right w-24">
          {!isTotal && (
            <div className={`inline-block min-w-[70px] ${isLastChild ? 'border-b border-black pb-0.5' : ''}`}>
               {saldoMostrar < 0 ? `(${formatoMoneda(saldoMostrar)})` : formatoMoneda(saldoMostrar)}
            </div>
          )}
        </td>

        {/* Columna TOTAL (Nivel <= 3) */}
        <td className={`py-1.5 px-2 text-xs text-right w-28 ${isTotal ? 'text-slate-800' : 'text-slate-600'}`}>
          {isTotal && (
             saldoMostrar < 0 ? `(${formatoMoneda(saldoMostrar)})` : formatoMoneda(saldoMostrar)
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full overflow-hidden">
      
      {/* HEADER DE CONTROLES - Oculto al imprimir */}
      <div className="flex items-center justify-between mb-6 print:hidden shrink-0">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/dashboard/reportes')} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-500" />
              Balance General
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <select 
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={mesActual}
            onChange={(e) => setMesActual(parseInt(e.target.value))}
          >
            {meses.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          
          <select 
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={nivelNIIF}
            onChange={(e) => setNivelNIIF(parseInt(e.target.value))}
            title="Nivel de detalle"
          >
            <option value={3}>Nivel 3 (Rubros)</option>
            <option value={4}>Nivel 4 (Cuentas Mayor)</option>
            <option value={5}>Nivel 5 (Subcuentas)</option>
            <option value={6}>Nivel 6 (Detalle)</option>
          </select>

          <button 
            onClick={() => window.print()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {error && (
        <div className={`p-4 rounded-xl border mb-6 print:hidden flex flex-col items-center justify-center text-center ${error.toLowerCase().includes('ssl') || error.toLowerCase().includes('psycopg2') || error.toLowerCase().includes('database') || error.toLowerCase().includes('network') || error.toLowerCase().includes('500') ? 'bg-orange-50 text-orange-700 border-orange-200 animate-bounce' : 'bg-red-50 text-red-600 border-red-100'}`}>
          <p className="font-semibold mb-1">
            {(error.toLowerCase().includes('ssl') || error.toLowerCase().includes('psycopg2') || error.toLowerCase().includes('database') || error.toLowerCase().includes('network') || error.toLowerCase().includes('500')) 
              ? "Oops! Hubo una micro-interrupción de red con el servidor." 
              : "Error al cargar los datos."}
          </p>
          <p className="text-sm">
            {(error.toLowerCase().includes('ssl') || error.toLowerCase().includes('psycopg2') || error.toLowerCase().includes('database') || error.toLowerCase().includes('network') || error.toLowerCase().includes('500')) 
              ? "Por favor, recarga la página (F5 o Ctrl+R) para volver a conectarte." 
              : error}
          </p>
          {(error.toLowerCase().includes('ssl') || error.toLowerCase().includes('psycopg2') || error.toLowerCase().includes('database') || error.toLowerCase().includes('network') || error.toLowerCase().includes('500')) && (
            <button onClick={() => window.location.reload()} className="mt-3 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Recargar Página
            </button>
          )}
        </div>
      )}

      {/* ÁREA DEL REPORTE IMPRIMIBLE */}
      <div className="flex-1 overflow-auto print:overflow-visible pb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-full print:shadow-none print:border-none print:p-0 print:m-0" id="reporte-imprimible">
          
          {loading && !data ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : data ? (
            <>
              {/* Alerta de anomalías contables */}
              {data.anomalias && data.anomalias.length > 0 && (
                <div className="mb-8 relative bg-white border border-rose-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden print:hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 bg-rose-100 rounded-full p-2.5 mt-1">
                        <svg className="h-6 w-6 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-800 tracking-tight">Auto Auditoría</h3>
                        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                          La inteligencia contable del sistema ha detectado y forzado el cuadre de partidas importadas que afectan directamente a <span className="font-semibold text-rose-600">cuentas de RESUMEN (Padre)</span>. Las normas NIIF prohíben afectar estas cuentas de manera directa.
                        </p>
                        
                        <div className="mt-4 grid gap-3">
                          {data.anomalias.map((anomalia, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-slate-100/50">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                                    Partida #{anomalia.numero_partida}
                                  </span>
                                  <span className="text-xs font-medium text-slate-500">
                                    {anomalia.fecha.split('-').reverse().join('/')}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-slate-900">
                                  {anomalia.codigo} - {anomalia.nombre}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {anomalia.debe > 0 && <span className="font-semibold text-slate-700">Debe: <span className="text-slate-900">${anomalia.debe.toFixed(2)}</span></span>}
                                  {anomalia.haber > 0 && <span className="font-semibold text-slate-700 ml-2">Haber: <span className="text-slate-900">${anomalia.haber.toFixed(2)}</span></span>}
                                </p>
                              </div>
                              <a 
                                href={`/dashboard/partidas/editar/${anomalia.partida_id}`}
                                className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors shrink-0"
                              >
                                Editar Partida
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Encabezado del Reporte */}
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-slate-800 uppercase">{data.empresa_nombre}</h2>
                <h3 className="text-lg font-bold text-slate-700">BALANCE GENERAL</h3>
                <p className="text-sm text-slate-600 uppercase">
                  AL {new Date(anio, mesActual, 0).getDate()} DE {meses.find(m => m.id === mesActual).nombre.toUpperCase()} DE {anio}
                </p>
                <p className="text-xs text-slate-500 italic">(Expresado en Dólares de los Estados Unidos de América)</p>
              </div>

              {/* Formato T */}
              <div className="grid grid-cols-2 gap-8 relative">
                {/* Línea divisoria central */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-800 -translate-x-1/2 hidden print:block"></div>

                {/* Columna Izquierda: ACTIVOS */}
                <div className="flex flex-col h-full">
                  <h4 className="font-bold text-center border-b-2 border-black pb-1 mb-2 shrink-0">ACTIVO</h4>
                  <table className="w-full">
                    <tbody>
                      {data.activos.filter(cta => cta.nivel > 1).map(formatearFila)}
                    </tbody>
                  </table>
                  <table className="w-full mt-auto">
                    <tfoot>
                      <tr>
                        <td className="py-2 px-2 font-bold text-sm uppercase">TOTAL ACTIVO</td>
                        <td colSpan="2" className="py-2 px-2 text-right font-bold border-t border-b-4 border-double border-black">
                          {formatoMoneda(data.totales.activo)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Columna Derecha: PASIVOS Y PATRIMONIO */}
                <div className="flex flex-col h-full">
                  <h4 className="font-bold text-center border-b-2 border-black pb-1 mb-2 shrink-0">PASIVO Y PATRIMONIO</h4>
                  
                  {/* Pasivos */}
                  <table className="w-full mb-6 shrink-0">
                    <tbody>
                      {data.pasivos.filter(cta => cta.nivel > 1).map(formatearFila)}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="py-2 px-2 font-bold text-sm uppercase">TOTAL PASIVO</td>
                        <td colSpan="2" className="py-2 px-2 text-right font-bold border-t border-black">
                          {formatoMoneda(data.totales.pasivo)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Patrimonio */}
                  <table className="w-full mb-6 shrink-0">
                    <tbody>
                      {data.patrimonio.filter(p => p.codigo !== "3-RESULTADO" && p.nivel > 1).map(formatearFila)}
                      {data.patrimonio.filter(p => p.codigo === "3-RESULTADO").map(formatearFila)}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="py-2 px-2 font-bold text-sm uppercase">TOTAL PATRIMONIO</td>
                        <td colSpan="2" className="py-2 px-2 text-right font-bold border-t border-black">
                          {formatoMoneda(data.totales.patrimonio)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Total Pasivo + Patrimonio */}
                  <table className="w-full mt-auto">
                    <tfoot>
                      <tr>
                        <td className="py-2 px-2 font-bold text-sm uppercase">TOTAL PASIVO Y PATRIMONIO</td>
                        <td colSpan="2" className="py-2 px-2 text-right font-bold border-t border-b-4 border-double border-black">
                          {formatoMoneda(data.totales.pasivo_mas_patrimonio)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Firmas configurables */}
              <div className="grid grid-cols-3 gap-8 mt-32 px-12 print:mt-40 relative group">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity animate-bounce print:hidden pointer-events-none">
                  Digita el nombre de los responsables, se guardarán automáticamente
                </div>
                <div className="text-center">
                  <div className="border-t border-black w-full mb-2"></div>
                  <input 
                    type="text" 
                    placeholder="Digita el nombre..."
                    value={firmaRepresentante} 
                    onChange={e => setFirmaRepresentante(e.target.value)}
                    className="w-full text-center font-bold text-sm bg-transparent outline-none border-none hover:bg-slate-50 focus:bg-slate-50 print:bg-transparent placeholder:text-slate-300 placeholder:font-normal"
                  />
                  <p className="text-xs text-slate-600">Representante Legal</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-black w-full mb-2"></div>
                  <input 
                    type="text" 
                    placeholder="Digita el nombre..."
                    value={firmaContador} 
                    onChange={e => setFirmaContador(e.target.value)}
                    className="w-full text-center font-bold text-sm bg-transparent outline-none border-none hover:bg-slate-50 focus:bg-slate-50 print:bg-transparent placeholder:text-slate-300 placeholder:font-normal"
                  />
                  <p className="text-xs text-slate-600">Contador</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-black w-full mb-2"></div>
                  <input 
                    type="text" 
                    placeholder="Digita el nombre..."
                    value={firmaAuditor} 
                    onChange={e => setFirmaAuditor(e.target.value)}
                    className="w-full text-center font-bold text-sm bg-transparent outline-none border-none hover:bg-slate-50 focus:bg-slate-50 print:bg-transparent placeholder:text-slate-300 placeholder:font-normal"
                  />
                  <p className="text-xs text-slate-600">Auditor Externo</p>
                </div>
              </div>

            </>
          ) : null}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden !important; }
          #reporte-imprimible, #reporte-imprimible * { visibility: visible !important; }
          #reporte-imprimible { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
          @page { size: landscape; margin: 1cm; }
        }
      `}} />
    </div>
  );
}

export default BalanceGeneral;
