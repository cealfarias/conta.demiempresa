import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function TabFlujoEfectivo({ empresaId }) {
  const [mapeos, setMapeos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchMapeos();
  }, [empresaId]);

  const fetchMapeos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/v1/flujos/mapeo/${empresaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMapeos(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching mapeos:', err);
      setError('Error al cargar la configuración.');
    } finally {
      setLoading(false);
    }
  };

  const addMapeo = () => {
    setMapeos([...mapeos, { actividad: 'OPERACION', prefijo_cuenta: '' }]);
  };

  const removeMapeo = (index) => {
    const newMapeos = [...mapeos];
    newMapeos.splice(index, 1);
    setMapeos(newMapeos);
  };

  const updateMapeo = (index, field, value) => {
    const newMapeos = [...mapeos];
    newMapeos[index][field] = value;
    setMapeos(newMapeos);
  };

  const handleSave = async () => {
    const invalid = mapeos.some(m => !m.prefijo_cuenta.trim());
    if (invalid) {
      setError('Todos los mapeos deben tener un prefijo de cuenta especificado.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/v1/flujos/mapeo/masivo`, {
        empresa_id: empresaId,
        mapeos: mapeos.map(m => ({ actividad: m.actividad, prefijo_cuenta: m.prefijo_cuenta }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccessMessage('Configuración guardada correctamente.');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error('Error saving mapeos:', err);
      setError('Ocurrió un error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center space-x-3 mb-6 border border-red-100">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-center space-x-3 mb-6 border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Mapeo del Estado de Flujos de Efectivo</h2>
          <p className="text-sm text-slate-500 mt-1">
            Asigna qué prefijos de tu Catálogo de Cuentas corresponden a las actividades de Operación, Inversión o Financiación.
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-slate-500 px-2">
                <div className="col-span-4">Clasificación / Actividad</div>
                <div className="col-span-7">Prefijo Contable (Ej. "11" o "1101")</div>
                <div className="col-span-1 text-center">Acción</div>
              </div>

              {mapeos.length === 0 && (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No hay mapeos configurados. Tus cuentas aparecerán como "Sin Clasificar" en el reporte.
                </div>
              )}

              {mapeos.map((mapeo, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="col-span-4">
                    <select
                      className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={mapeo.actividad}
                      onChange={(e) => updateMapeo(index, 'actividad', e.target.value)}
                    >
                      <option value="EFECTIVO">Efectivo y Equivalentes</option>
                      <option value="OPERACION">Actividades de Operación</option>
                      <option value="INVERSION">Actividades de Inversión</option>
                      <option value="FINANCIACION">Actividades de Financiación</option>
                    </select>
                  </div>
                  <div className="col-span-7">
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Ej. 11, 1205, 21"
                      value={mapeo.prefijo_cuenta}
                      onChange={(e) => updateMapeo(index, 'prefijo_cuenta', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      onClick={() => removeMapeo(index)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar regla"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addMapeo}
                className="mt-4 flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-medium px-4 py-2 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Mapeo</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TabFlujoEfectivo;
