import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Book, FileText, Settings as ConfigIcon, LogOut, Shield, HelpCircle, FileSpreadsheet, Settings, Menu } from 'lucide-react';
import SoporteModal from '../components/SoporteModal';
import AssistantAvatar from '../components/AssistantAvatar';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSoporteOpen, setIsSoporteOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const empresaNombre = localStorage.getItem('empresa_nombre') || localStorage.getItem('empresa_activa') || 'Sin Empresa';
  const anioActivo = localStorage.getItem('anio_activo') || '----';

  useEffect(() => {
    if (!localStorage.getItem('empresa_activa') || !localStorage.getItem('anio_activo')) {
      navigate('/seleccionar-entorno', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let lastUnreadCount = 0;
    let isInitialLoad = true;

    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const API_URL = import.meta.env.VITE_API_URL || 'https://conta-demiempresa.onrender.com';
        const res = await axios.get(`${API_URL}/api/v1/soporte/unread`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const currentCount = res.data;
        setUnreadCount(currentCount);

        if ((!isInitialLoad && currentCount > lastUnreadCount) || (isInitialLoad && currentCount > 0)) {
          toast.success(`Tienes ${currentCount} mensajes sin leer en Soporte`, {
            duration: 10000,
            position: 'bottom-right',
            style: {
              background: '#0f172a',
              color: '#fff',
              border: '1px solid #334155'
            },
            icon: '💬',
          });
        }
        lastUnreadCount = currentCount;
        isInitialLoad = false;
      } catch (e) {
        // ignore
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    navigate('/login');
  };

  const isPremium = localStorage.getItem('licencia_tipo') === 'premium';
  const fechaCreacion = localStorage.getItem('empresa_fecha_creacion');
  
  let isTrialActive = false;
  let isTrialExpired = false;
  let trialDaysLeft = 0;
  
  if (fechaCreacion) {
    const creationDate = new Date(fechaCreacion);
    const currentDate = new Date();
    const diffTime = currentDate - creationDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays <= 30) {
      isTrialActive = true;
      trialDaysLeft = 30 - diffDays;
    } else {
      isTrialExpired = true;
    }
  } else {
    // Para cuentas legacy, asumimos que están en trial
    isTrialActive = true;
    trialDaysLeft = 30;
  }

  // Extract User Info from JWT
  let currentUsername = 'Usuario';
  let currentUserRole = 'Rol no definido';
  let userInitials = 'US';
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const decoded = JSON.parse(jsonPayload);
      
      currentUsername = decoded.sub || 'Usuario';
      
      // Mapear el ID del rol a un nombre amigable
      const rawRol = String(decoded.rol).toLowerCase();
      if (rawRol.includes('admin')) currentUserRole = 'Administrador';
      else if (rawRol === 'contador' || rawRol === '2') currentUserRole = 'Contador';
      else if (rawRol === 'auditor' || rawRol === '3') currentUserRole = 'Auditor / Consulta';
      else if (rawRol === 'auxiliar' || rawRol === '4') currentUserRole = 'Auxiliar Contable';
      else currentUserRole = `Rol ${decoded.rol}`;
      
      userInitials = currentUsername.substring(0, 2).toUpperCase();
    }
  } catch(e) {
    console.error("Error decoding token for navbar", e);
  }

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
            <Home className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Resumen</span>}
          </Link>
          <Link to="/dashboard/catalogo" className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${location.pathname === '/dashboard/catalogo' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} ${!isSidebarOpen && 'justify-center'}`} title="Catálogo de Cuentas">
            <Book className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Catálogo de Cuentas</span>}
          </Link>
          <Link to="/dashboard/partidas" className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${location.pathname === '/dashboard/partidas' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} ${!isSidebarOpen && 'justify-center'}`} title="Partidas Diarias">
            <FileText className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Partidas Diarias</span>}
          </Link>
          <Link to="/dashboard/reportes" className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${location.pathname.startsWith('/dashboard/reportes') ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} ${!isSidebarOpen && 'justify-center'}`} title="Estados Financieros">
            <FileSpreadsheet className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Estados Financieros</span>}
          </Link>
          <Link to="/dashboard/seguridad" className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${location.pathname === '/dashboard/seguridad' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} ${!isSidebarOpen && 'justify-center'}`} title="Seguridad (2FA)">
            <Shield className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Seguridad (2FA)</span>}
          </Link>
          <button onClick={() => setIsSoporteOpen(true)} className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors text-slate-300 hover:bg-slate-800 hover:text-white ${!isSidebarOpen && 'justify-center'} relative`} title="Soporte (Inbox)">
            <div className="relative">
              <HelpCircle className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Soporte (Inbox)</span>}
            {isSidebarOpen && unreadCount > 0 && (
               <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </button>
          <Link to="/dashboard/suscripcion" className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${location.pathname === '/dashboard/suscripcion' ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-amber-400'} ${!isSidebarOpen && 'justify-center'}`} title="Suscripción Premium">
            <Shield className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Suscripción Premium</span>}
          </Link>
          {currentUserRole !== 'Auditor / Consulta' && currentUserRole !== 'Auxiliar Contable' && (
            <Link to="/dashboard/configuracion" className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors ${location.pathname === '/dashboard/configuracion' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} ${!isSidebarOpen && 'justify-center'}`} title="Configuración de la Empresa">
              <Settings className="w-5 h-5" />
              {isSidebarOpen && <span className="font-medium whitespace-nowrap">Configuración</span>}
            </Link>
          )}
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
              <p className="text-sm font-bold text-slate-700">Usuario: {currentUsername}</p>
              <p className="text-xs text-slate-500">Rol: {currentUserRole}</p>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-emerald-400 font-bold border-2 border-emerald-500/30">
              {userInitials}
            </div>
          </div>
        </header>

          <div className="flex-1 overflow-auto bg-slate-50 relative print:overflow-visible print:bg-white flex flex-col">
            {/* Banner de Promoción / Trial */}
            {!isPremium && isTrialActive && (
              <div className="bg-indigo-600 px-4 py-3 text-white text-center text-sm font-medium shrink-0 print:hidden shadow-sm">
                🎁 Estás usando la versión de prueba (Gratis por 30 días). Te quedan {trialDaysLeft} días. ¡Aprovecha la promoción de fin de año pronto!
              </div>
            )}
            {!isPremium && isTrialExpired && (
              <div className="bg-rose-600 px-4 py-3 text-white text-center text-sm font-medium shrink-0 print:hidden shadow-sm flex items-center justify-center space-x-2">
                <span>⚠️ Tu versión de prueba ha expirado. Algunas funciones pro están limitadas.</span>
                <Link to="/dashboard/suscripcion" className="underline font-bold hover:text-rose-200 transition-colors">
                  Actualizar ahora
                </Link>
              </div>
            )}
            <div className="flex-1 relative">
              <Outlet />
            </div>
          </div>
      </main>

      <SoporteModal isOpen={isSoporteOpen} onClose={() => setIsSoporteOpen(false)} />
      <AssistantAvatar />
      <Toaster />
    </div>
  );
}

export default Dashboard;
