import React, { useState, useEffect } from "react";
import axios from "axios";
import { Key, Copy, Plus, Trash2, Shield, Loader2, Network } from "lucide-react";
import { toast } from "react-hot-toast";

export default function TabIntegraciones({ empresaId }) {
  const [llaves, setLlaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombreApp, setNombreApp] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [llaveReciente, setLlaveReciente] = useState(null);

  useEffect(() => {
    cargarLlaves();
  }, [empresaId]);

  const cargarLlaves = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/v1/integracion/llaves/${empresaId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setLlaves(res.data);
    } catch (err) {
      toast.error("Error al cargar integraciones");
    } finally {
      setLoading(false);
    }
  };

  const generarLlave = async (e) => {
    e.preventDefault();
    if (!nombreApp.trim()) return toast.error("El nombre de la app es requerido");

    try {
      setIsCreating(true);
      const res = await axios.post(`/api/v1/integracion/generar-llave?empresa_id=${empresaId}&usuario=Admin`, {
        nombre_app: nombreApp,
        activa: true
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      toast.success("API Key generada con éxito");
      setLlaveReciente(res.data.api_key);
      setNombreApp("");
      cargarLlaves();
    } catch (err) {
      toast.error("Error al generar API Key");
    } finally {
      setIsCreating(false);
    }
  };

  const copiarPortapapeles = (texto) => {
    navigator.clipboard.writeText(texto);
    toast.success("Copiado al portapapeles");
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <Network className="w-5 h-5 mr-2 text-indigo-600" />
            Integraciones de Software (API)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Genera credenciales seguras para conectar otras aplicaciones de Demiempresa (Planilla, Activo Fijo, Facturación) directamente con tu Contabilidad.
          </p>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={generarLlave} className="flex gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Aplicación (Ej. Planilla)</label>
            <input 
              type="text" 
              value={nombreApp}
              onChange={(e) => setNombreApp(e.target.value)}
              className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="¿Qué aplicación vas a conectar?"
              disabled={isCreating}
            />
          </div>
          <div className="flex items-end">
            <button 
              type="submit" 
              disabled={isCreating || !nombreApp.trim()}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center shadow-sm"
            >
              {isCreating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
              Generar API Key
            </button>
          </div>
        </form>

        {llaveReciente && (
          <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-emerald-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-bold text-emerald-800">¡Nueva API Key Generada!</h3>
                <p className="text-sm text-emerald-700 mt-1 mb-3">
                  Copia esta llave y pégala en la configuración de la otra aplicación. <b>Por seguridad, no podrás volver a verla completa una vez recargues la página.</b>
                </p>
                <div className="flex items-center bg-white border border-emerald-200 rounded-lg overflow-hidden">
                  <code className="px-4 py-2 text-sm text-slate-800 flex-1">{llaveReciente}</code>
                  <button onClick={() => copiarPortapapeles(llaveReciente)} className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium border-l border-emerald-200 transition-colors flex items-center">
                    <Copy className="w-4 h-4 mr-2" /> Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Aplicaciones Conectadas Activas</h3>
        
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /></div>
        ) : llaves.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl">
            <Key className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 font-medium">No hay aplicaciones conectadas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {llaves.map((llave) => (
              <div key={llave.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Network className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{llave.nombre_app}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {llave.api_key.substring(0, 12)}••••••••••••••••
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${llave.activa ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {llave.activa ? "Activo" : "Revocada"}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Creado el</p>
                    <p className="text-sm font-medium text-slate-600">{new Date(llave.fecha_creacion).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

