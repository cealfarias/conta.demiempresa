import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Folder, FileText, ChevronRight, Search, Plus, Edit2, Trash2, BarChart2, FileUp, Download, Book, Lock, Star, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Caché global para evitar llamadas repetitivas
const manualCache = {};

function Catalogo() {
  const navigate = useNavigate();
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState('todos');
  const [showPaywall, setShowPaywall] = useState(false);
  const userRole = localStorage.getItem('rol') || 'Auditor';
  
  // Estados para el Tooltip Flotante
  const [hoverData, setHoverData] = useState({ visible: false, type: null, x: 0, y: 0, loading: false, data: null, cuentaGanadora: null, cuentaCodigo: null });
  const hoverTimerRef = useRef(null);

  useEffect(() => {
    fetchCuentas();
  }, []);

  const fetchCuentas = async () => {
    try {
      const token = localStorage.getItem('token');
      const empresaId = localStorage.getItem('empresa_activa');
      const anio = localStorage.getItem('anio_activo');
      
      const response = await axios.get(`${API_URL}/api/v1/catalogo/?empresa_id=${empresaId}&anio=${anio}`, {
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

  const fetchManualHeredado = async (codigo) => {
    if (manualCache[codigo]) {
      return manualCache[codigo];
    }
    
    const empresaId = localStorage.getItem('empresa_activa');
    const anio = localStorage.getItem('anio_activo');
    const token = localStorage.getItem('token');
    
    let codigoTemporal = codigo.trim();
    let candidatosJerarquia = [codigoTemporal];

    // Algoritmo de Búsqueda en Cascada (Prototipo reciclado)
    while (codigoTemporal.length > 1) {
        if (codigoTemporal.length > 2 && codigoTemporal.length % 2 === 0) {
            codigoTemporal = codigoTemporal.substring(0, codigoTemporal.length - 2);
        } else {
            codigoTemporal = codigoTemporal.substring(0, codigoTemporal.length - 1);
        }
        if (codigoTemporal) {
            candidatosJerarquia.push(codigoTemporal);
        }
    }
    
    let manualEncontrado = null;
    let codigoGanador = null;
    
    for (const codigoQuery of candidatosJerarquia) {
        try {
            if (manualCache[codigoQuery] && manualCache[codigoQuery].encontrado) {
               manualEncontrado = manualCache[codigoQuery].data;
               codigoGanador = manualCache[codigoQuery].codigoGanador;
               break;
            }
            if (manualCache[codigoQuery] && !manualCache[codigoQuery].encontrado) {
               continue; 
            }
            
            const res = await axios.get(`${API_URL}/api/v1/manual/${empresaId}/${anio}/${codigoQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.data) {
                manualEncontrado = res.data;
                codigoGanador = codigoQuery;
                manualCache[codigoQuery] = { encontrado: true, data: res.data, codigoGanador: codigoQuery };
                break;
            }
        } catch (error) {
            manualCache[codigoQuery] = { encontrado: false };
        }
    }
    
    const resultado = {
       encontrado: !!manualEncontrado,
       data: manualEncontrado,
       codigoGanador: codigoGanador
    };
    
    manualCache[codigo] = resultado;
    return resultado;
  };

  const handleMouseEnter = (e, cuentaCodigo, type) => {
    // Limpiar cualquier timeout previo para evitar parpadeos
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    
    // Calcular posición aproximada sobre el elemento
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + (rect.width / 2);
    const y = rect.bottom;
    
    setHoverData({ visible: true, type, x, y, loading: true, data: null, cuentaGanadora: null, cuentaCodigo });
    
    // Obtener los datos heredados
    fetchManualHeredado(cuentaCodigo).then(res => {
      setHoverData(prev => {
        // Solo actualizar si sigue siendo la misma cuenta que sobrevolamos
        if (prev.visible && prev.cuentaCodigo === cuentaCodigo && prev.type === type) {
          return { ...prev, loading: false, data: res.data, cuentaGanadora: res.codigoGanador };
        }
        return prev;
      });
    });
  };

  const handleMouseLeave = () => {
    // Agregamos un ligero delay antes de desaparecer para que no parpadee tan fuerte
    hoverTimerRef.current = setTimeout(() => {
      setHoverData(prev => ({ ...prev, visible: false }));
    }, 150);
  };

  const filteredCuentas = cuentas.filter(cuenta => {
    const nombre = cuenta.nombre || '';
    const codigo = cuenta.cuentas || '';
    const matchSearch = nombre.toLowerCase().includes(searchTerm.toLowerCase()) || codigo.includes(searchTerm);
    const matchNivel = nivelFiltro === 'todos' || cuenta.nivel === parseInt(nivelFiltro);
    return matchSearch && matchNivel;
  });

  const niveles = [...new Set(cuentas.map(c => c.nivel))].sort((a, b) => a - b);

  return (
    <div className="p-4 md:p-6 flex flex-col h-[calc(100vh-80px)]">
      
      {/* TOOLTIP FLOTANTE */}
      {hoverData.visible && (
        <div 
          className="fixed z-[100] bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 p-4 w-80 pointer-events-none transform -translate-x-1/2 transition-opacity duration-200 animate-in fade-in zoom-in-95"
          style={{ left: hoverData.x, top: hoverData.y + 10 }}
        >
          <div className="flex items-center space-x-2 mb-2 border-b border-slate-100 pb-2">
            {hoverData.type === 'desc' && <Info className="w-4 h-4 text-blue-500" />}
            {hoverData.type === 'cargo' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
            {hoverData.type === 'abono' && <TrendingDown className="w-4 h-4 text-rose-500" />}
            <span className="font-semibold text-slate-800 text-sm">
              {hoverData.type === 'desc' ? 'Descripción del Rubro' : hoverData.type === 'cargo' ? 'Dinámica de Cargos' : 'Dinámica de Abonos'}
            </span>
          </div>
          
          {hoverData.loading ? (
            <div className="flex items-center space-x-2 text-slate-500 py-2">
              <div className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-emerald-500 rounded-full"></div>
              <span className="text-xs font-medium">Buscando políticas...</span>
            </div>
          ) : hoverData.data ? (
            <div className="space-y-2">
              <p className="text-[13px] text-slate-600 leading-relaxed">
                {hoverData.type === 'desc' && (hoverData.data.descripcion_rubro || "No posee descripción asignada.")}
                {hoverData.type === 'cargo' && (hoverData.data.se_carga_por || "No definido.")}
                {hoverData.type === 'abono' && (hoverData.data.se_abona_por || "No definido.")}
              </p>
              {hoverData.cuentaGanadora !== hoverData.cuentaCodigo && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-start space-x-1.5">
                  <Folder className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] font-medium text-sky-700 leading-tight">
                    Políticas heredadas de la cuenta agrupadora: {hoverData.cuentaGanadora}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start space-x-2 text-rose-600 py-1">
              <span className="text-xs font-medium">Ni esta cuenta ni sus cuentas de nivel superior poseen dinámicas registradas en el manual.</span>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Catálogo de Cuentas</h2>
          <p className="text-slate-500 text-xs mt-0.5">Estructura financiera NIIF</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button 
            onClick={() => setShowPaywall(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-sm rounded-lg font-medium transition-colors flex items-center space-x-1.5 md:space-x-2 shadow-sm shadow-amber-500/20"
          >
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Exportar</span>
          </button>
          
          {(userRole === 'Administrador' || userRole === 'Contador') && (
            <>
              <button 
                id="btn-importar-manual"
                onClick={() => navigate('/dashboard/catalogo/importar-manual')}
                className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-sm rounded-lg font-medium transition-colors flex items-center space-x-1.5 md:space-x-2 shadow-sm shadow-sky-500/20"
              >
                <Book className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>Manual</span>
              </button>
    
              <button 
                id="btn-importar-catalogo"
                onClick={() => navigate('/dashboard/catalogo/importar')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-sm rounded-lg font-medium transition-colors flex items-center space-x-1.5 md:space-x-2 shadow-sm shadow-indigo-500/20"
              >
                <FileUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>Importar CSV</span>
              </button>
              <button 
                id="btn-nueva-cuenta"
                onClick={() => {
                  setEditingCuenta(null);
                  setShowModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-sm rounded-lg font-medium transition-colors flex items-center space-x-1.5 md:space-x-2 shadow-sm shadow-emerald-500/20"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>Nueva Cuenta</span>
              </button>
            </>
          )}
        </div>
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
        <div className="overflow-auto flex-1 bg-white relative">
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
            <tbody onMouseLeave={handleMouseLeave}>
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
                    className="border-b border-slate-100 hover:bg-emerald-50/40 transition-colors group text-[13px]"
                  >
                    <td className="py-1.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {cuenta.cuentas}
                    </td>
                    <td className="py-1.5 px-4 max-w-[250px] md:max-w-md">
                      <div className="flex items-center" style={{ paddingLeft: `${(cuenta.nivel - 1) * 1.25}rem` }}>
                        {cuenta.resumen ? (
                          <Folder className="w-3.5 h-3.5 text-emerald-500 mr-1.5 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                        )}
                        <span className={`truncate ${cuenta.resumen ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                          {cuenta.nombre}
                        </span>
                        
                        {/* Hover Targets for Tooltip */}
                        <div className="flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 space-x-0.5">
                          <button 
                            onMouseEnter={(e) => handleMouseEnter(e, cuenta.cuentas, 'desc')}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            aria-label="Ver descripción"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onMouseEnter={(e) => handleMouseEnter(e, cuenta.cuentas, 'cargo')}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            aria-label="Ver dinámica de cargos"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onMouseEnter={(e) => handleMouseEnter(e, cuenta.cuentas, 'abono')}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            aria-label="Ver dinámica de abonos"
                          >
                            <TrendingDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                        {(userRole === 'Administrador' || userRole === 'Contador') && (
                          <button className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Editar cuenta">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            navigate(`/dashboard/catalogo/saldos/${cuenta.cuentas}`, { state: { cuenta } });
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                          title="Saldos Mensuales"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                        {(userRole === 'Administrador' || userRole === 'Contador') && (
                          <button className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar cuenta">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/30">
                <Star className="w-8 h-8 text-white fill-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Funcionalidad Premium</h3>
            </div>
            
            <div className="p-6 text-center">
              <p className="text-slate-600 mb-6">
                La exportación masiva a Excel y CSV está disponible en nuestros <strong>Planes Pro</strong>. 
                Actualiza tu cuenta para llevar tu gestión contable y auditorías al siguiente nivel.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => setShowPaywall(false)}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Actualizar a Pro
                </button>
                <button 
                  onClick={() => setShowPaywall(false)}
                  className="w-full bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Catalogo;
