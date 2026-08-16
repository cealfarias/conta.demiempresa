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

  const formatearFila = (cuenta) => {
    const isTotal = cuenta.es_total || cuenta.nivel <= 2;
    const isActivo = cuenta.codigo.startsWith('1');
    // En el pasivo/patrimonio, el saldo normal es acreedor (negativo), as que invertimos el signo para la presentacin
    let saldoMostrar = isActivo ? cuenta.saldo : (cuenta.saldo * -1);

    return (
      <tr key={cuenta.codigo} className={`${isTotal ? 'font-bold' : ''}`}>
        <td className="py-1 px-2 border-b border-slate-100 text-xs text-slate-500 w-16">{cuenta.codigo}</td>
        <td className={`py-1 px-2 border-b border-slate-100 text-xs ${isTotal ? 'text-slate-800 uppercase' : 'text-slate-600 pl-4'}`}>
          {cuenta.nombre}
        </td>
        <td className={`py-1 px-2 border-b border-slate-100 text-xs text-right ${isTotal ? 'text-slate-800' : 'text-slate-600'}`}>
          {saldoMostrar < 0 && !isTotal ? `(${formatoMoneda(saldoMostrar)})` : formatoMoneda(saldoMostrar)}
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
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-6 print:hidden">
          {error}
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
                <div>
                  <h4 className="font-bold text-center border-b-2 border-black pb-1 mb-2">ACTIVO</h4>
                  <table className="w-full">
                    <tbody>
                      {data.activos.map(formatearFila)}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2" className="py-2 px-2 font-bold text-sm uppercase">TOTAL ACTIVO</td>
                        <td className="py-2 px-2 text-right font-bold border-t border-b-4 border-double border-black">
                          {formatoMoneda(data.totales.activo)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Columna Derecha: PASIVOS Y PATRIMONIO */}
                <div>
                  <h4 className="font-bold text-center border-b-2 border-black pb-1 mb-2">PASIVO Y PATRIMONIO</h4>
                  
                  {/* Pasivos */}
                  <table className="w-full mb-6">
                    <tbody>
                      {data.pasivos.map(formatearFila)}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2" className="py-2 px-2 font-bold text-sm uppercase">TOTAL PASIVO</td>
                        <td className="py-2 px-2 text-right font-bold border-t border-black">
                          {formatoMoneda(data.totales.pasivo * -1)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Patrimonio */}
                  <table className="w-full mb-6">
                    <tbody>
                      {data.patrimonio.filter(p => p.codigo !== "3-RESULTADO").map(formatearFila)}
                      {data.patrimonio.filter(p => p.codigo === "3-RESULTADO").map(formatearFila)}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2" className="py-2 px-2 font-bold text-sm uppercase">TOTAL PATRIMONIO</td>
                        <td className="py-2 px-2 text-right font-bold border-t border-black">
                          {formatoMoneda(data.totales.patrimonio * -1)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Total Pasivo + Patrimonio */}
                  <table className="w-full mt-auto">
                    <tfoot>
                      <tr>
                        <td colSpan="2" className="py-2 px-2 font-bold text-sm uppercase">TOTAL PASIVO Y PATRIMONIO</td>
                        <td className="py-2 px-2 text-right font-bold border-t border-b-4 border-double border-black">
                          {formatoMoneda(data.totales.pasivo_mas_patrimonio * -1)}
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
