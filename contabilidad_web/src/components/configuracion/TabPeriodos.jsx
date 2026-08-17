import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, AlertTriangle, CheckCircle2, Lock, Unlock, Play, FolderLock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function TabPeriodos({ empresaId }) {
  const [ejercicios, setEjercicios] = useState([]);
  const [selectedAnio, setSelectedAnio] = useState(null);
  const [periodos, setPeriodos] = useState([]);
  
  const [nuevoAnio, setNuevoAnio] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEjercicios();
  }, [empresaId]);

  const fetchEjercicios = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/periodos/ejercicios/${empresaId}`);
      const list = response.data;
      setEjercicios(list);
      if (list.length > 0 && !selectedAnio) {
        setSelectedAnio(list[0]);
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setEjercicios([]);
      } else {
        console.error('Error fetching ejercicios:', err);
      }
    }
  };

  useEffect(() => {
    if (selectedAnio) {
      fetchControlMeses(selectedAnio);
    }
  }, [selectedAnio]);

  const fetchControlMeses = async (anio) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/v1/periodos/control/${empresaId}/${anio}`);
      setPeriodos(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching periodos:', err);
      if (err.response && err.response.status === 404) {
        setPeriodos([]);
      } else {
        setError('Error al cargar los meses del ejercicio.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInicializar = async () => {
    if (!nuevoAnio || isNaN(nuevoAnio) || nuevoAnio.length !== 4) {
      setError('Por favor, ingresa un año válido de 4 dígitos.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess('');
      const usuario = localStorage.getItem('username') || 'admin';
      
      const payload = {
        empresa_id: empresaId,
        anio: parseInt(nuevoAnio, 10),
        usuario: usuario
      };
      
      await axios.post(`${API_URL}/api/v1/periodos/inicializar`, payload);
      setSuccess(`Ejercicio fiscal ${nuevoAnio} inicializado correctamente.`);
      
      setNuevoAnio('');
      await fetchEjercicios();
      setSelectedAnio(parseInt(nuevoAnio, 10));
    } catch (err) {
      console.error('Error inicializando año:', err);
      setError(err.response?.data?.detail || 'Error al inicializar el año.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const handleCerrarMes = async (mes) => {
    if (!window.confirm(`¿Estás seguro de que deseas cerrar el mes ${mes}? Ya no podrás crear más partidas en este período.`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await axios.put(`${API_URL}/api/v1/periodos/cierre-mes/${empresaId}/${selectedAnio}/${mes}`);
      setSuccess(`Mes ${mes} cerrado exitosamente.`);
      await fetchControlMeses(selectedAnio);
    } catch (err) {
      setError(err.response?.data?.detail || `Error al cerrar el mes ${mes}.`);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const handleCerrarAnio = async () => {
    if (!window.confirm(`¿ADVERTENCIA: Estás a punto de cerrar el ejercicio fiscal ${selectedAnio} completo. Esta acción es irreversible. ¿Deseas continuar?`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await axios.put(`${API_URL}/api/v1/periodos/cierre-anio/${empresaId}/${selectedAnio}`);
      setSuccess(`Ejercicio ${selectedAnio} sellado definitivamente.`);
      await fetchControlMeses(selectedAnio);
    } catch (err) {
      setError(err.response?.data?.detail || `Error al cerrar el año ${selectedAnio}.`);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(''), 5000);
    }
  };

  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const isAnioCerrado = periodos.length > 0 && periodos.every(p => !p.anio_abierto);
  const todosMesesCerrados = periodos.length === 12 && periodos.every(p => !p.mes_abierto);

  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center space-x-3 mb-6 border border-red-100">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-center space-x-3 mb-6 border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Inicializar Año */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ejercicios Fiscales</h2>
            <p className="text-sm text-slate-500 mt-1">Abre nuevos períodos contables para comenzar a registrar operaciones.</p>
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="text"
              placeholder="Año ej: 2026"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-32 outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={nuevoAnio}
              onChange={(e) => setNuevoAnio(e.target.value)}
            />
            <button 
              onClick={handleInicializar}
              disabled={loading}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>Inicializar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control de Meses */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Control de Meses</h2>
              <p className="text-sm text-slate-500">Bloquea la edición de meses finalizados.</p>
            </div>
          </div>
          
          <select 
            className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 bg-slate-50"
            value={selectedAnio || ''}
            onChange={(e) => setSelectedAnio(parseInt(e.target.value))}
            disabled={ejercicios.length === 0}
          >
            {ejercicios.length === 0 && <option value="">Sin años</option>}
            {ejercicios.map(anio => (
              <option key={anio} value={anio}>Ejercicio {anio}</option>
            ))}
          </select>
        </div>

        {periodos.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                  <tr>
                    <th className="px-6 py-4">Mes</th>
                    <th className="px-6 py-4">Partidas Registradas</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodos.map((p) => (
                    <tr key={p.mes} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {nombresMeses[p.mes - 1]}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 py-1 px-3 rounded-full text-xs font-semibold">
                          {p.total_partidas} Partidas
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {p.mes_abierto ? (
                          <span className="flex items-center space-x-1 text-emerald-600 font-medium text-xs">
                            <Unlock className="w-4 h-4" />
                            <span>ABIERTO</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-rose-600 font-medium text-xs">
                            <Lock className="w-4 h-4" />
                            <span>CERRADO</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.mes_abierto ? (
                          <button
                            onClick={() => handleCerrarMes(p.mes)}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-xs border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 py-1.5 px-3 rounded-lg transition-colors"
                          >
                            Cerrar Mes
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">Bloqueado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Cierre Anual */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Cierre Definitivo de Ejercicio</h3>
                <p className="text-sm text-slate-500">Sella el año completo y prepara saldos para el siguiente.</p>
              </div>
              <button
                onClick={handleCerrarAnio}
                disabled={!todosMesesCerrados || isAnioCerrado || loading}
                className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                <FolderLock className="w-4 h-4" />
                <span>{isAnioCerrado ? 'Año Cerrado' : 'Ejecutar Cierre Anual'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            {loading ? 'Cargando...' : 'Selecciona un ejercicio fiscal para ver sus períodos.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default TabPeriodos;
