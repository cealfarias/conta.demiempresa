import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, TrendingUp, DollarSign } from 'lucide-react';

function ReportesDashboard() {
  const navigate = useNavigate();

  const reportes = [
    {
      id: 'balance-general',
      title: 'Balance General',
      description: 'Estado de situación financiera de la empresa a una fecha determinada.',
      icon: <FileText className="w-8 h-8 text-emerald-500" />,
      color: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      id: 'estado-resultados',
      title: 'Estado de Resultados',
      description: 'Resumen de ingresos, costos y gastos de un período.',
      icon: <TrendingUp className="w-8 h-8 text-blue-500" />,
      color: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'flujo-efectivo',
      title: 'Flujo de Efectivo',
      description: 'Movimientos de entradas y salidas de efectivo y equivalentes.',
      icon: <DollarSign className="w-8 h-8 text-indigo-500" />,
      color: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Reportes Financieros</h1>
        <p className="text-slate-500 mt-1">
          Generación y exportación de estados financieros NIIF
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportes.map((repo) => (
          <div 
            key={repo.id}
            onClick={() => navigate(`/dashboard/reportes/${repo.id}`)}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className={`w-16 h-16 rounded-2xl ${repo.color} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform`}>
              {repo.icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{repo.title}</h3>
            <p className="text-slate-500 text-sm">
              {repo.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportesDashboard;
