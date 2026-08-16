import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Simple Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Home/Resumen component for Dashboard
const DashboardHome = () => (
  <div className="p-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-slate-500 text-sm font-medium mb-2">Activos Totales</h3>
        <p className="text-3xl font-bold text-slate-800">$0.00</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-slate-500 text-sm font-medium mb-2">Pasivos Totales</h3>
        <p className="text-3xl font-bold text-slate-800">$0.00</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-slate-500 text-sm font-medium mb-2">Patrimonio Neto</h3>
        <p className="text-3xl font-bold text-slate-800">$0.00</p>
      </div>
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center py-20">
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileText className="w-10 h-10 text-emerald-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-700 mb-2">Dashboard en línea</h3>
      <p className="text-slate-500 max-w-md mx-auto">
        Tu sistema contable está conectado a la API de Python. Selecciona una opción en el menú lateral.
      </p>
    </div>
  </div>
);

function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "564147336188-mdfp0vsvn8na8bllflsm8ntrv91cfinp.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Router>
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
            <Route index element={<DashboardHome />} />
            <Route path="seguridad" element={<Seguridad />} />
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
          </Route>
          
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
