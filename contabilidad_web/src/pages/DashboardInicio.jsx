import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Building2, Activity, PieChart as PieChartIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAssistant } from '../contexts/AssistantContext';

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

  const { startOnboarding } = useAssistant();

  const fetchResumen = async () => {
    if (!empresaId) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const currentYear = localStorage.getItem('anio_activo') || new Date().getFullYear();
      const currentMonth = localStorage.getItem('mes_activo') || (new Date().getMonth() + 1);
      
      const bgResponse = await axios.get(`${API_URL}/api/v1/reportes/balance-general/${empresaId}/${currentYear}/${currentMonth}`, { headers });
      const erResponse = await axios.get(`${API_URL}/api/v1/reportes/estado-resultados/${empresaId}/${currentYear}/${currentMonth}`, { headers });
      
      setData({
        activo: bgResponse.data.totales.activo || 0,
        pasivo: bgResponse.data.totales.pasivo || 0,
        patrimonio: bgResponse.data.totales.patrimonio || 0,
        uair: erResponse.data.totales.utilidad || 0
      });

      // Chequear si el catálogo está vacío para iniciar el onboarding
      try {
        const catRes = await axios.get(`${API_URL}/api/v1/catalogo/resumen/${empresaId}`, { headers });
        if (catRes.data && catRes.data.total_cuentas === 0) {
          startOnboarding();
        }
      } catch (e) {
        console.error('Error fetching catalog summary for onboarding:', e);
      }
      
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

  const chartData = [
    { name: 'Activos', valor: data.activo, fill: '#6366f1' },
    { name: 'Pasivos', valor: data.pasivo, fill: '#f43f5e' },
    { name: 'Patrimonio', valor: data.patrimonio, fill: '#3b82f6' }
  ];

  const ratioSolvencia = data.pasivo > 0 ? (data.activo / data.pasivo).toFixed(2) : 'N/A';
  const activoNeto = data.activo - data.pasivo;

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Resumen Financiero</h1>
        <p className="text-slate-500">Panorama general del estado de la empresa al mes actual</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
        {/* Accesos Rápidos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Accesos Rápidos</h3>
              <p className="text-sm text-slate-500">Navega a las secciones principales</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 flex-grow">
            <button onClick={() => navigate('/dashboard/partidas')} className="p-4 text-left border border-slate-100 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
              <span className="block font-medium text-slate-800 mb-1">Partidas Diarias</span>
              <span className="block text-xs text-slate-500">Registra nuevos movimientos</span>
            </button>
            <button onClick={() => navigate('/dashboard/catalogo')} className="p-4 text-left border border-slate-100 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
              <span className="block font-medium text-slate-800 mb-1">Catálogo de Cuentas</span>
              <span className="block text-xs text-slate-500">Administra tu estructura contable</span>
            </button>
            <button onClick={() => navigate('/dashboard/reportes/balance-general')} className="p-4 text-left border border-slate-100 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
              <span className="block font-medium text-slate-800 mb-1">Balance General</span>
              <span className="block text-xs text-slate-500">Revisa la situación financiera</span>
            </button>
            <button onClick={() => navigate('/dashboard/configuracion')} className="p-4 text-left border border-slate-100 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
              <span className="block font-medium text-slate-800 mb-1">Configuración</span>
              <span className="block text-xs text-slate-500">Mapeos y ajustes</span>
            </button>
          </div>
        </div>
        
        {/* Análisis Financiero Básico */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <PieChartIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Análisis Financiero Básico</h3>
              <p className="text-sm text-slate-500">Composición y Ratios</p>
            </div>
          </div>
          
          <div className="flex-grow flex flex-col">
            <div className="h-48 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={60} />
                  <Tooltip formatter={(value) => formatCurrency(value)} cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-auto">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Ratio de Solvencia</p>
                <p className="text-lg font-bold text-slate-700">{ratioSolvencia}</p>
                <p className="text-[10px] text-slate-400">Activo / Pasivo</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Activo Neto</p>
                <p className={`text-lg font-bold ${activoNeto < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {formatCurrency(activoNeto)}
                </p>
                <p className="text-[10px] text-slate-400">Activo - Pasivo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardInicio;
