import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function EstadoResultados() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  // Controles
  const [mesActual, setMesActual] = useState(new Date().getMonth() + 1);
  const [modo, setModo] = useState('acumulado');
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

  const fetchEstadoResultados = async () => {
    setLoading(true);
    setError(null);
    try {
      const empresa_id = localStorage.getItem('empresa_activa');
      if (!empresa_id) throw new Error("No hay empresa activa seleccionada");

      const response = await axios.get(
        `${API_URL}/api/v1/reportes/estado-resultados/${empresa_id}/${anio}/${mesActual}?modo=${modo}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Error al cargar el Estado de Resultados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstadoResultados();
  }, [mesActual, modo]);

  const formatoMoneda = (monto) => {
    if (monto === 0) return "-";
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(monto));
  };

  // Cálculos NIIF El Salvador
  let ingresosOperacion = 0;
  let costoVentas = 0;
  let gastosAdmin = 0;
  let gastosVenta = 0;
  let otrosIngresos = 0;
  let otrosGastos = 0;

  if (data) {
    const totalByPrefix = (arr, prefixes) => {
      return arr.filter(c => prefixes.some(p => c.codigo.startsWith(p)))
                .reduce((sum, c) => sum + Math.abs(c.saldo), 0); // Asumimos que la API ya envía saldos absolutos para ER
    };

    ingresosOperacion = totalByPrefix(data.ingresos, ['51']); // Ingresos Ordinarios
    otrosIngresos = totalByPrefix(data.ingresos, ['52']); // Otros Ingresos
    
    costoVentas = totalByPrefix(data.gastos, ['41']); // Costos
    gastosVenta = totalByPrefix(data.gastos, ['42']); // Gastos Venta
    gastosAdmin = totalByPrefix(data.gastos, ['43']); // Gastos Admin
    otrosGastos = totalByPrefix(data.gastos, ['44']); // Gastos Financieros/Otros
  }

  const utilidadBruta = ingresosOperacion - costoVentas;
  const utilidadOperacion = utilidadBruta - gastosAdmin - gastosVenta;
  const utilidadAntesImpuestos = utilidadOperacion + otrosIngresos - otrosGastos;

  let reservaLegal = 0;
  let isr = 0;
  let tasaISRStr = "0%";
  
  const exencionISR = data?.exencion_isr === true || data?.exencion_isr === "true" || data?.exencion_isr === 1;
  const ingresosBrutosGravados = ingresosOperacion + otrosIngresos;

  if (utilidadAntesImpuestos > 0) {
      reservaLegal = utilidadAntesImpuestos * 0.07; 
      if (exencionISR) {
          isr = 0;
          tasaISRStr = "Exento";
      } else {
          const tasaISR = ingresosBrutosGravados <= 150000 ? 0.25 : 0.30;
          tasaISRStr = ingresosBrutosGravados <= 150000 ? "25%" : "30%";
          isr = (utilidadAntesImpuestos - reservaLegal) * tasaISR; 
      }
  }
  const utilidadNeta = utilidadAntesImpuestos - reservaLegal - isr;

  const Fila = ({ titulo, monto, indent = false, isTotal = false, isResta = false }) => (
    <tr>
      <td className={`py-1.5 px-4 border-b border-slate-100 text-sm ${indent ? 'pl-8 text-slate-600' : 'text-slate-800 font-medium'} ${isTotal ? 'font-bold uppercase' : ''}`}>
        {titulo}
      </td>
      <td className={`py-1.5 px-4 border-b border-slate-100 text-sm text-right ${isTotal ? 'font-bold' : 'text-slate-700'}`}>
        {isResta && monto > 0 ? `(${formatoMoneda(monto)})` : formatoMoneda(monto)}
      </td>
    </tr>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col h-full overflow-hidden">
      
      {/* HEADER DE CONTROLES - Oculto al imprimir */}
      <div className="flex items-center justify-between mb-6 print:hidden shrink-0">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/dashboard/reportes')} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              Estado de Resultados
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <select 
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
            value={modo}
            onChange={(e) => setModo(e.target.value)}
          >
            <option value="acumulado">Acumulado a la fecha</option>
            <option value="mensual">Solo el mes</option>
          </select>
          <select 
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
            value={mesActual}
            onChange={(e) => setMesActual(parseInt(e.target.value))}
          >
            {meses.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>

          <button 
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 min-h-full print:shadow-none print:border-none print:p-0 print:m-0" id="reporte-imprimible">
          
          {loading && !data ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : data ? (
            <>
              {/* Encabezado del Reporte */}
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-slate-800 uppercase">{data.empresa_nombre}</h2>
                <h3 className="text-lg font-bold text-slate-700">ESTADO DE RESULTADOS</h3>
                <p className="text-sm text-slate-600 uppercase">
                  {modo === 'acumulado' 
                    ? `DEL 1 DE ENERO AL ${new Date(anio, mesActual, 0).getDate()} DE ${meses.find(m => m.id === mesActual).nombre.toUpperCase()} DE ${anio}`
                    : `DEL 1 AL ${new Date(anio, mesActual, 0).getDate()} DE ${meses.find(m => m.id === mesActual).nombre.toUpperCase()} DE ${anio}`}
                </p>
                <p className="text-xs text-slate-500 italic">(Expresado en Dólares de los Estados Unidos de América)</p>
              </div>

              {/* Cuerpo del Estado de Resultados */}
              <div className="w-full">
                <table className="w-full">
                  <tbody>
                    <Fila titulo="INGRESOS DE OPERACIÓN" monto={ingresosOperacion} isTotal />
                    <Fila titulo="Menos: Costo de Ventas / Costo de Operación" monto={costoVentas} indent isResta />
                    <Fila titulo="UTILIDAD BRUTA" monto={utilidadBruta} isTotal />
                    
                    <tr><td colSpan="2" className="py-2"></td></tr>
                    
                    <Fila titulo="GASTOS DE OPERACIÓN" monto={gastosAdmin + gastosVenta} isTotal />
                    <Fila titulo="Gastos de Administración" monto={gastosAdmin} indent isResta />
                    <Fila titulo="Gastos de Venta y Comercialización" monto={gastosVenta} indent isResta />
                    <Fila titulo="UTILIDAD DE OPERACIÓN" monto={utilidadOperacion} isTotal />
                    
                    <tr><td colSpan="2" className="py-2"></td></tr>

                    <Fila titulo="OTROS INGRESOS Y GASTOS" monto={otrosIngresos - otrosGastos} isTotal />
                    <Fila titulo="Otros Ingresos No Operativos" monto={otrosIngresos} indent />
                    <Fila titulo="Costos Financieros y Otros Gastos" monto={otrosGastos} indent isResta />
                    <Fila titulo="UTILIDAD ANTES DE IMPUESTOS Y RESERVAS" monto={utilidadAntesImpuestos} isTotal />

                    <tr><td colSpan="2" className="py-2"></td></tr>

                    <Fila titulo="PROVISIONES (ESTATUTARIA Y FISCAL)" monto={reservaLegal + isr} isTotal />
                    <Fila titulo="Menos: Reserva Legal (7%)" monto={reservaLegal} indent isResta />
                    <Fila titulo={`Menos: Impuesto sobre la Renta (${tasaISRStr})`} monto={isr} indent isResta />
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="py-3 px-4 font-bold text-sm uppercase border-t border-black">
                        UTILIDAD NETA DEL EJERCICIO
                      </td>
                      <td className="py-3 px-4 text-right font-bold border-t border-b-4 border-double border-black">
                        {formatoMoneda(utilidadNeta)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Firmas configurables */}
              <div className="grid grid-cols-3 gap-8 mt-32 px-4 print:mt-40 relative group">
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
        }
      `}} />
    </div>
  );
}

export default EstadoResultados;
