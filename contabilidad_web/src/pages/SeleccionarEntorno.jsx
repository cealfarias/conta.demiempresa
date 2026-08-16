import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Building, Calendar, Clock, ArrowRight, AlertCircle, Settings } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SeleccionarEntorno() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form states
  const [empresaId, setEmpresaId] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [mes, setMes] = useState((new Date().getMonth() + 1).toString());

  const meses = [
    { id: '1', nombre: 'Enero' }, { id: '2', nombre: 'Febrero' }, { id: '3', nombre: 'Marzo' },
    { id: '4', nombre: 'Abril' }, { id: '5', nombre: 'Mayo' }, { id: '6', nombre: 'Junio' },
    { id: '7', nombre: 'Julio' }, { id: '8', nombre: 'Agosto' }, { id: '9', nombre: 'Septiembre' },
    { id: '10', nombre: 'Octubre' }, { id: '11', nombre: 'Noviembre' }, { id: '12', nombre: 'Diciembre' }
  ];

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/v1/empresas/todas`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmpresas(res.data);
      } catch (err) {
        console.error('Error fetching empresas:', err);
        setError('No se pudieron cargar las empresas. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    };
    fetchEmpresas();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!empresaId) {
      setError('Debes seleccionar una empresa.');
      return;
    }
    
    setError(null);
    setSubmitLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      // Verificamos el control de periodos
      const res = await axios.get(`${API_URL}/api/v1/periodos/control/${empresaId}/${anio}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const periodos = res.data;
      const periodoMes = periodos.find(p => p.mes === parseInt(mes));
      
      if (!periodoMes) {
        setError('El mes seleccionado no figura en la estructura de control del ejercicio.');
        setSubmitLoading(false);
        return;
      }
      
      const empresaSelect = empresas.find(e => e.id === empresaId);
      const empresaNombre = empresaSelect ? (empresaSelect.nombre_comercial || empresaSelect.razon_social) : empresaId;

      localStorage.setItem('empresa_activa', empresaId);
      localStorage.setItem('anio_activo', anio);
      localStorage.setItem('mes_activo', mes);
      localStorage.setItem('empresa_nombre', empresaNombre);

      navigate('/dashboard');
      
    } catch (err) {
      if (err.response?.status === 404) {
        // Ejercicio no inicializado
        setError(`El ejercicio fiscal ${anio} no se encuentra inicializado. Por favor contacte al Administrador.`);
      } else {
        setError(err.response?.data?.detail || 'Error al validar el entorno contable.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Configuración de Entorno</h2>
          <p className="text-emerald-100 text-sm">Paso 2: Seleccione los parámetros de trabajo</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg flex items-start gap-3 text-sm animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  Empresa / Entidad
                </label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="" disabled>
                    {loading ? 'Cargando empresas...' : 'Seleccione una empresa...'}
                  </option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.id} - {emp.razon_social}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Año Contable
                  </label>
                  <input 
                    type="number" 
                    min="2000" 
                    max="2100"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                    value={anio}
                    onChange={(e) => setAnio(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Mes
                  </label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                    value={mes}
                    onChange={(e) => setMes(e.target.value)}
                    required
                  >
                    {meses.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitLoading || loading}
              className="mt-8 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {submitLoading ? 'Validando...' : (
                <>Ingresar al Sistema <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
            
            {/* Optional config links if needed later */}
          </form>
        </div>
      </div>
    </div>
  );
}
