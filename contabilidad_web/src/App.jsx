import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Terminos from './pages/Terminos';
import Dashboard from './pages/Dashboard';
import Catalogo from './pages/Catalogo';
import SaldosMensuales from './pages/SaldosMensuales';
import MovimientosMes from './pages/MovimientosMes';
import Seguridad from './pages/Seguridad';
import Partidas from './pages/Partidas';
import ImportarPartidas from './pages/ImportarPartidas';
import PartidaEditor from './pages/PartidaEditor';
import PartidaImpresion from './pages/PartidaImpresion';
import ImportarCatalogo from './pages/ImportarCatalogo';
import ImportarManual from './pages/ImportarManual';
import SeleccionarEntorno from './pages/SeleccionarEntorno';
import ReportesDashboard from './pages/ReportesDashboard';
import BalanceGeneral from './pages/BalanceGeneral';
import EstadoResultados from './pages/EstadoResultados';
import FlujoEfectivo from './pages/FlujoEfectivo';
import { FileText } from 'lucide-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import DashboardInicio from './pages/DashboardInicio';
import ConfiguracionEmpresa from './pages/ConfiguracionEmpresa';
import Suscripcion from './pages/Suscripcion';
import { AssistantProvider } from './contexts/AssistantContext';
import Avatar from './components/assistant/Avatar';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Global session watcher that checks expiration every minute
const SessionWatcher = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (['/login', '/registro', '/terminos'].includes(location.pathname)) return;

    const checkToken = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        // Add a 5 minute grace period to avoid immediate kickouts due to slight clock skew
        if (payload.exp && payload.exp < (currentTime - 300)) {
          console.warn(`Token expirado. Exp: ${payload.exp}, Actual: ${currentTime}`);
          localStorage.clear();
          navigate('/login');
        }
      } catch (e) {
        console.error("Error validando token en SessionWatcher", e);
      }
    };

    checkToken();
    const interval = setInterval(checkToken, 60000);
    return () => clearInterval(interval);
  }, [navigate, location.pathname]);

  return null;
};

// Home/Resumen component for Dashboard is now DashboardInicio

function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "520602063183-02kdfek3f8vp2g146j2khacmhj4nbn6a.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Router>
        <AssistantProvider>
          <SessionWatcher />
          <Avatar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/terminos" element={<Terminos />} />
            
            <Route path="/seleccionar-entorno" element={<ProtectedRoute><SeleccionarEntorno /></ProtectedRoute>} />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            >
              <Route index element={<DashboardInicio />} />
              <Route path="seguridad" element={<Seguridad />} />
              <Route path="configuracion" element={<ConfiguracionEmpresa />} />
              <Route path="catalogo" element={<Catalogo />} />
              <Route path="catalogo/importar" element={<ImportarCatalogo />} />
              <Route path="catalogo/importar-manual" element={<ImportarManual />} />
              <Route path="catalogo/saldos/:codigo" element={<SaldosMensuales />} />
              <Route path="catalogo/movimientos/:codigo/:mes" element={<MovimientosMes />} />
              <Route path="partidas" element={<Partidas />} />
              <Route path="partidas/importar" element={<ImportarPartidas />} />
              <Route path="partidas/nueva" element={<PartidaEditor />} />
              <Route path="partidas/editar/:id" element={<PartidaEditor />} />
              <Route path="partidas/imprimir/:id" element={<PartidaImpresion />} />
              <Route path="reportes" element={<ReportesDashboard />} />
              <Route path="reportes/balance-general" element={<BalanceGeneral />} />
              <Route path="reportes/estado-resultados" element={<EstadoResultados />} />
              <Route path="reportes/flujo-efectivo" element={<FlujoEfectivo />} />
              <Route path="cierre" element={<CierreEjercicio />} />
              <Route path="suscripcion" element={<Suscripcion />} />
            </Route>
            
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </AssistantProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
