import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, TrendingUp, TrendingDown, DollarSign, Wallet, Building2, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DashboardInicio = () => {
  const navigate = useNavigate();
  const empresaId = localStorage.getItem('empresa_activa');
  const [data, setData] = useState({
    activo: 0,
    pasivo: 0,
    patrimonio: 0,
    uair: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResumen();
  }, [empresaId]);

  const fetchResumen = async () => {
    if (!empresaId) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Get current date year for query
      const currentYear = localStorage.getItem('anio_activo') || new Date().getFullYear();
      const currentMonth = localStorage.getItem('mes_activo') || (new Date().getMonth() + 1); // 1-12
      
      // Fetch balance general to get totals
      const bgResponse = await axios.get(`${API_URL}/api/v1/reportes/balance-general/${empresaId}/${currentYear}/${currentMonth}`, { headers });
      
      // Fetch estado resultados to get UAIR
      const erResponse = await axios.get(`${API_URL}/api/v1/reportes/estado-resultados/${empresaId}/${currentYear}/${currentMonth}`, { headers });
      
      setData({
        activo: bgResponse.data.totales.ACTIVO || 0,
        pasivo: bgResponse.data.totales.PASIVO || 0,
        patrimonio: bgResponse.data.totales.PATRIMONIO || 0,
        uair: erResponse.data.totales.UTILIDAD_ANTES_IMPUESTOS_RESERVAS || 0
      });
      
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Resumen Financiero</h1>
        <p className="text-slate-500">Panorama general del estado de la empresa al mes actual</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Activos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group hover:border-indigo-300 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">Total Activos</h3>
                <p className="text-3xl font-bold text-slate-800">
                  {loading ? '...' : formatCurrency(data.activo)}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
            <div className="text-xs font-medium text-indigo-600 flex items-center">
              Bienes y derechos de la empresa
            </div>
          </div>
        </div>

        {/* Pasivos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group hover:border-rose-300 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">Total Pasivos</h3>
                <p className="text-3xl font-bold text-slate-800">
                  {loading ? '...' : formatCurrency(data.pasivo)}
                </p>
              </div>
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
            <div className="text-xs font-medium text-rose-600 flex items-center">
              Deudas y obligaciones
            </div>
          </div>
        </div>

        {/* Patrimonio */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">Patrimonio Neto</h3>
                <p className="text-3xl font-bold text-slate-800">
                  {loading ? '...' : formatCurrency(data.patrimonio)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="text-xs font-medium text-blue-600 flex items-center">
              Capital y reservas
            </div>
          </div>
        </div>

        {/* Utilidad */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">Utilidad (UAIR)</h3>
                <p className={`text-3xl font-bold ${data.uair < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {loading ? '...' : formatCurrency(data.uair)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${data.uair < 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {data.uair < 0 ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
              </div>
            </div>
            <div className={`text-xs font-medium flex items-center ${data.uair < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              Resultado del ejercicio actual
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Accesos Rápidos</h3>
              <p className="text-sm text-slate-500">Navega a las secciones principales</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/dashboard/partidas')} className="p-4 text-left border border-slate-100 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
              <span className="block font-medium text-slate-800 mb-1">Partidas Diarias</span>
              <span className="block text-xs text-slate-500">Registra nuevos movimientos</span>
            </button>
            <button onClick={() => navigate('/dashboard/catalogo')} className="p-4 text-left border border-slate-100 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
              <span className="block font-medium text-slate-800 mb-1">Catálogo de Cuentas</span>
              <span className="block text-xs text-slate-500">Administra tu estructura contable</span>
            </button>
            <button onClick={() => navigate('/dashboard/reportes/balance_general')} className="p-4 text-left border border-slate-100 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
              <span className="block font-medium text-slate-800 mb-1">Balance General</span>
              <span className="block text-xs text-slate-500">Revisa la situación financiera</span>
            </button>
            <button onClick={() => navigate('/dashboard/configuracion')} className="p-4 text-left border border-slate-100 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
              <span className="block font-medium text-slate-800 mb-1">Configuración</span>
              <span className="block text-xs text-slate-500">Mapeos y ajustes</span>
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Sistema En Línea</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-6">
            Todas tus partidas, catálogos y estados financieros se procesan en tiempo real bajo normativas NIIF.
          </p>
          <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm font-medium border border-slate-200 shadow-inner">
            Última conexión exitosa a la base de datos
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardInicio;
