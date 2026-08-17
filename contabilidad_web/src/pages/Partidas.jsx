import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Calendar, FileText, ChevronLeft, ChevronRight, Eye, Edit2, Trash2, Filter, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Partidas() {
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const anularPartida = async (id, nomenclatura) => {
    if (!window.confirm(`¿Está seguro que desea ANULAR la partida No. ${nomenclatura}? Los montos se reducirán a cero y esta acción no se puede deshacer.`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:8000/api/v1/partidas/${id}/anular`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPartidas(); // Recargar la tabla
    } catch (err) {
      alert(err.response?.data?.detail || "Error al anular la partida");
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [mesActual, setMesActual] = useState(1);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'numero_partida', direction: 'asc' });
  
  const navigate = useNavigate();

  const meses = [
    { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' }
  ];

  useEffect(() => {
    fetchPartidas();
  }, [mesActual, paginaActual]);

  const fetchPartidas = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Forzamos empresa CANTARES y año 2026 por ahora
      const response = await axios.get(`${API_URL}/api/v1/partidas/resumen`, {
        params: {
          empresa_id: 'CANTARES',
          anio: 2026,
          mes: mesActual,
          page: paginaActual
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setPartidas(response.data.registros);
      setTotalPaginas(response.data.total_paginas);
      setTotalRegistros(response.data.total_registros);
    } catch (error) {
      console.error('Error fetching partidas:', error);
      setPartidas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNuevaPartida = () => {
    navigate('/dashboard/partidas/nueva');
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPartidas = [...partidas].sort((a, b) => {
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];
    
    // Convert to Date for proper comparison if sorting by date
    if (sortConfig.key === 'fecha') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }
    
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredPartidas = sortedPartidas.filter(p => 
    p.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.numero_partida.toString().includes(searchTerm)
  );

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span className="w-3 h-3 ml-1 inline-block opacity-0" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline-block text-indigo-500" /> : <ArrowDown className="w-3 h-3 ml-1 inline-block text-indigo-500" />;
  };

  return (
    <div className="p-4 md:p-6 flex flex-col h-[calc(100vh-80px)]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-indigo-600" />
            Partidas Diarias
          </h2>
          <p className="text-slate-500 text-sm mt-1">Registro de comprobantes contables</p>
        </div>
        
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Selector de Mes */}
          <div className="relative flex-1 md:flex-none">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <select
              value={mesActual}
              onChange={(e) => {
                setMesActual(Number(e.target.value));
                setPaginaActual(1);
              }}
              className="w-full md:w-40 pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm appearance-none cursor-pointer"
            >
              {meses.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <button 
              onClick={() => navigate('/dashboard/partidas/importar')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2 shadow-lg shadow-emerald-500/20 whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline">Importar Partidas</span>
            </button>
            <button 
              onClick={() => navigate('/dashboard/partidas/nueva')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2 shadow-lg shadow-indigo-500/20 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Nueva Partida</span>
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center shrink-0 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por concepto o número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow bg-white"
            />
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Filter className="w-4 h-4" />
            <span>Mostrando {filteredPartidas.length} de {totalRegistros} en este mes</span>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-auto flex-1 bg-white">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                <th 
                  className="py-3 px-5 whitespace-nowrap w-24 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  onClick={() => handleSort('numero_partida')}
                >
                  <div className="flex items-center">Partida <SortIcon columnKey="numero_partida" /></div>
                </th>
                <th 
                  className="py-3 px-5 whitespace-nowrap w-32 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  onClick={() => handleSort('fecha')}
                >
                  <div className="flex items-center">Fecha <SortIcon columnKey="fecha" /></div>
                </th>
                <th className="py-3 px-5">Concepto</th>
                <th className="py-3 px-5 text-center w-32">Estado</th>
                <th className="py-3 px-5 text-center w-32">Nomenclatura</th>
                <th className="py-3 px-5 text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">Cargando transacciones...</p>
                  </td>
                </tr>
              ) : filteredPartidas.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="text-center text-slate-400 py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="font-medium text-slate-600 mb-1">No hay partidas registradas</p>
                      <p className="text-sm">En el mes de {meses.find(m => m.id === mesActual)?.nombre}</p>
                      <p className="text-xs text-slate-400 mt-2">Favor de recargar la página con Ctrl+F5 si espera ver registros recientes.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPartidas.map((partida) => (
                  <tr 
                    key={partida.id} 
                    className="hover:bg-indigo-50/40 transition-colors group"
                  >
                    <td className="py-3 px-5 font-bold text-slate-700">
                      #{partida.numero_partida.toString().padStart(4, '0')}
                    </td>
                    <td className="py-3 px-5 text-slate-600 font-medium whitespace-nowrap">
                      {new Date(partida.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-5 text-slate-700">
                      <div className="line-clamp-2" title={partida.concepto}>
                        {partida.concepto}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 text-[11px] rounded-full font-semibold border ${
                        partida.estado === 'Impresa' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        partida.estado === 'Borrador' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        partida.estado === 'Mayorizado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          partida.estado === 'Impresa' ? 'bg-emerald-500' : 
                          partida.estado === 'Borrador' ? 'bg-amber-500' :
                          partida.estado === 'Mayorizado' ? 'bg-blue-500' :
                          'bg-rose-500'
                        }`}></span>
                        {partida.estado}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium font-mono">
                        {partida.nomenclatura}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-center">
                      <div className="flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => navigate(`/dashboard/partidas/imprimir/${partida.id}`)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                          title="Imprimir Comprobante"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => navigate(`/dashboard/partidas/editar/${partida.id}`)}
                          disabled={partida.estado !== 'Borrador'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            partida.estado === 'Borrador' 
                            ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50' 
                            : 'text-slate-200 cursor-not-allowed'
                          }`} 
                          title={partida.estado === 'Borrador' ? "Editar" : "Candado activado"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => anularPartida(partida.id, partida.nomenclatura)}
                          disabled={partida.estado !== 'Borrador'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            partida.estado === 'Borrador' 
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' 
                            : 'text-slate-200 cursor-not-allowed'
                          }`} 
                          title={partida.estado === 'Borrador' ? "Anular Partida" : "No se puede anular en este estado"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPaginas > 1 && (
          <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
            <span className="text-sm text-slate-500">
              Página <span className="font-medium text-slate-700">{paginaActual}</span> de <span className="font-medium text-slate-700">{totalPaginas}</span>
            </span>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Partidas;
