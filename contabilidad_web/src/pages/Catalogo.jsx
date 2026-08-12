import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Folder, FileText, ChevronRight, Search, Plus, Edit2, Trash2, BarChart2 } from 'lucide-react';
import SaldosMensualesModal from '../components/SaldosMensualesModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Catalogo() {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState('todos');

  // Modal Saldos Mensuales state
  const [modalSaldosOpen, setModalSaldosOpen] = useState(false);
  const [cuentaSeleccionadaSaldos, setCuentaSeleccionadaSaldos] = useState(null);

  useEffect(() => {
    fetchCuentas();
  }, []);

  const fetchCuentas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/v1/catalogo/?empresa_id=CANTARES&anio=2026`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort accounts by code for hierarchical display
      const sorted = response.data.sort((a, b) => a.cuentas.localeCompare(b.cuentas));
      setCuentas(sorted);
    } catch (error) {
      console.error('Error fetching catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCuentas = cuentas.filter(cuenta => {
    const nombre = cuenta.nombre || '';
    const codigo = cuenta.cuentas || '';
    const matchSearch = nombre.toLowerCase().includes(searchTerm.toLowerCase()) || codigo.includes(searchTerm);
    const matchNivel = nivelFiltro === 'todos' || cuenta.nivel === parseInt(nivelFiltro);
    return matchSearch && matchNivel;
  });

  // Unique levels for the filter dropdown
  const niveles = [...new Set(cuentas.map(c => c.nivel))].sort((a, b) => a - b);

  return (
    <div className="p-4 md:p-6 flex flex-col h-[calc(100vh-80px)]">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Catálogo de Cuentas</h2>
          <p className="text-slate-500 text-xs mt-0.5">Estructura financiera NIIF</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-sm shadow-emerald-500/20">
          <Plus className="w-4 h-4" />
          <span>Nueva Cuenta</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="p-2.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Buscar código o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            
            <select
              value={nivelFiltro}
              onChange={(e) => setNivelFiltro(e.target.value)}
              className="py-1.5 pl-3 pr-8 border border-slate-200 rounded-md text-xs text-slate-700 bg-white focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="todos">Todos los Niveles</option>
              {niveles.map(n => (
                <option key={n} value={n}>Nivel {n}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-slate-500 font-medium px-2">
            {filteredCuentas.length} cuentas
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-auto flex-1 bg-white">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-2 px-4 whitespace-nowrap w-32">Código</th>
                <th className="py-2 px-4">Nombre de la Cuenta</th>
                <th className="py-2 px-4 text-center w-24">Nivel</th>
                <th className="py-2 px-4 text-center w-32">Tipo</th>
                <th className="py-2 px-4 text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-500">Cargando catálogo...</p>
                  </td>
                </tr>
              ) : filteredCuentas.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500">
                    No se encontraron cuentas.
                  </td>
                </tr>
              ) : (
                filteredCuentas.map((cuenta) => (
                  <tr 
                    key={cuenta.cuentas} 
                    className="border-b border-slate-100 hover:bg-emerald-50/50 transition-colors group text-[13px]"
                  >
                    <td className="py-1.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {cuenta.cuentas}
                    </td>
                    <td className="py-1.5 px-4 max-w-[250px] md:max-w-md">
                      <div className="flex items-center truncate" style={{ paddingLeft: `${(cuenta.nivel - 1) * 1.25}rem` }} title={cuenta.nombre}>
                        {cuenta.resumen ? (
                          <Folder className="w-3.5 h-3.5 text-emerald-500 mr-1.5 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                        )}
                        <span className={`truncate ${cuenta.resumen ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                          {cuenta.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-4 text-center">
                      <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-medium">
                        Nivel {cuenta.nivel}
                      </span>
                    </td>
                    <td className="py-1.5 px-4 text-center">
                      {!cuenta.resumen && (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] rounded font-medium bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                          Detalle
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Editar cuenta">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => {
                            setCuentaSeleccionadaSaldos(cuenta);
                            setModalSaldosOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                          title="Saldos Mensuales"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar cuenta">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SaldosMensualesModal 
        isOpen={modalSaldosOpen}
        onClose={() => setModalSaldosOpen(false)}
        cuenta={cuentaSeleccionadaSaldos}
      />
    </div>
  );
}

export default Catalogo;
