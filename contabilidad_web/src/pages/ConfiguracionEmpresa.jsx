import React, { useState } from 'react';
import { Settings, Calendar, Users, DollarSign } from 'lucide-react';
import TabFlujoEfectivo from '../components/configuracion/TabFlujoEfectivo';
import TabPeriodos from '../components/configuracion/TabPeriodos';
import TabUsuarios from '../components/configuracion/TabUsuarios';
import ErrorBoundary from '../components/ErrorBoundary';

function ConfiguracionEmpresa() {
  const [activeTab, setActiveTab] = useState('periodos');
  const empresaId = localStorage.getItem('empresa_id');

  const tabs = [
    { id: 'periodos', label: 'Períodos Contables', icon: Calendar },
    { id: 'usuarios', label: 'Usuarios y Roles', icon: Users },
    { id: 'flujo', label: 'Mapeo Flujo Efectivo', icon: DollarSign },
  ];

  return (
    <ErrorBoundary>
      <div className="p-8 pb-32 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <Settings className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Centro de Control</h1>
          <p className="text-slate-500">Administra los parámetros contables, períodos y accesos del sistema</p>
        </div>
      </div>

      <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex space-x-1 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeTab === 'periodos' && <TabPeriodos empresaId={empresaId} />}
        {activeTab === 'usuarios' && <TabUsuarios empresaId={empresaId} />}
        {activeTab === 'flujo' && <TabFlujoEfectivo empresaId={empresaId} />}
      </div>
    </div>
    </ErrorBoundary>
  );
}

export default ConfiguracionEmpresa;
