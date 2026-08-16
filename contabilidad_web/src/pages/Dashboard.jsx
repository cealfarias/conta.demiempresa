import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, FileText, Settings, ShieldCheck, Users, BookOpen, Menu } from 'lucide-react';

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const empresaNombre = localStorage.getItem('empresa_nombre') || localStorage.getItem('empresa_activa') || 'Sin Empresa';
  const anioActivo = localStorage.getItem('anio_activo') || '----';

  useEffect(() => {
    if (!localStorage.getItem('empresa_activa') || !localStorage.getItem('anio_activo')) {
      navigate('/seleccionar-entorno', { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex print:block print:bg-white">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out bg-slate-900 text-white flex flex-col print:hidden`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between min-h-[73px]">
          {isSidebarOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-xl font-bold text-emerald-400">Contabilidad</h1>
              <p className="text-xs text-slate-400 mt-1">v2.0 - Ecosistema</p>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors mx-auto"
            title="Minimizar menú"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-2 overflow-hidden">
          <Link to="/dashboard" className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${location.pathname === '/dashboard' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} ${!isSidebarOpen && 'justify-center'}`} title="Resumen">
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Resumen</span>}
          </Link>
          <Link to="/dashboard/catalogo" className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${location.pathname === '/dashboard/catalogo' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} ${!isSidebarOpen && 'justify-center'}`} title="Catálogo de Cuentas">
            <BookOpen className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Catálogo de Cuentas</span>}
          </Link>
          <Link to="/dashboard/partidas" className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${location.pathname === '/dashboard/partidas' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} ${!isSidebarOpen && 'justify-center'}`} title="Partidas Diarias">
            <FileText className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Partidas Diarias</span>}
          </Link>
          <a href="#" className={`flex items-center space-x-3 px-3 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors ${!isSidebarOpen && 'justify-center'}`} title="Reportes">
            <Users className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Reportes</span>}
          </a>
          <Link to="/dashboard/seguridad" className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${location.pathname === '/dashboard/seguridad' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} ${!isSidebarOpen && 'justify-center'}`} title="Seguridad (2FA)">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Seguridad (2FA)</span>}
          </Link>
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className={`flex items-center space-x-3 px-3 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors ${!isSidebarOpen && 'justify-center'}`}
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white print:overflow-visible print:block">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:justify-between md:items-center shrink-0 z-10 shadow-sm print:hidden">
          <div className="flex items-center mb-4 md:mb-0 space-x-4">
            <h2 className="text-xl font-bold text-slate-800">Panel Contable</h2>
            <div className="h-6 w-px bg-slate-300 hidden md:block"></div>
            <div className="flex items-center space-x-3 text-sm flex-wrap gap-y-2">
              <div className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-medium">
                <span className="text-emerald-500 mr-2">🏢</span> Empresa: {empresaNombre}
              </div>
              <div className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 font-medium">
                <span className="text-blue-500 mr-2">📅</span> Ejercicio: {anioActivo}
              </div>
              <Link 
                to="/seleccionar-entorno" 
                className="flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 rounded-lg border border-slate-200 font-medium transition-colors"
                title="Cambiar Empresa / Año"
              >
                <Settings className="w-4 h-4 mr-2 text-slate-500" />
                Cambiar Entorno
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-700">Usuario: admin</p>
              <p className="text-xs text-slate-500">Rol: Administrador</p>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-emerald-400 font-bold border-2 border-emerald-500/30">
              AD
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50 relative print:overflow-visible print:bg-white">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
