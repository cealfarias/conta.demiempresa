import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, Activity } from 'lucide-react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Registro() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('Debes aceptar los Términos de Referencia para continuar.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const payload = {
        username: username,
        email: email,
        rol: "usuario",
        is_active: true,
        password: password,
        usuario_creacion: "sistema",
        terminal_ip: "127.0.0.1"
      };

      await axios.post(`${API_URL}/api/v1/usuarios/`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);

    } catch (err) {
      console.error("Register Error:", err);
      if (err.response) {
        setError(`Error (${err.response.status}): ${err.response.data?.detail || 'No se pudo crear la cuenta.'}`);
      } else if (err.request) {
        setError('Error de conexión. El servidor no responde.');
      } else {
        setError('Ocurrió un error inesperado al procesar la solicitud.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Cuenta Creada!</h2>
          <p className="text-slate-600 mb-6">Tu cuenta ha sido registrada exitosamente. Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Left side: Branding / Info */}
      <div className="bg-slate-900 md:w-5/12 p-10 flex flex-col justify-between relative overflow-hidden hidden md:flex">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-10 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-10 left-20 w-40 h-40 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-white mb-16">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Ecosistema SaaS</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            Únete a la nueva era de la gestión contable.
          </h1>
          <p className="text-slate-400 text-lg max-w-sm leading-relaxed">
            Un solo usuario para acceder a todas las aplicaciones empresariales de tu ecosistema.
          </p>
        </div>

        <div className="relative z-10 text-slate-500 text-sm">
          &copy; 2026 Ecosistema SaaS. Todos los derechos reservados.
        </div>
      </div>

      {/* Right side: Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center space-x-2 text-slate-900 mb-8">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Ecosistema SaaS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Crear Cuenta</h2>
            <p className="text-slate-500 mt-2">Ingresa tus datos para registrarte.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm border border-rose-100 flex items-start animate-in fade-in">
                <ShieldCheck className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de Usuario</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors sm:text-sm outline-none"
                  placeholder="ej. juanperez"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors sm:text-sm outline-none"
                  placeholder="tu@correo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors sm:text-sm outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center mt-4">
              <input
                id="terms"
                type="checkbox"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-slate-700">
                He leído y acepto los <Link to="/terminos" target="_blank" className="text-emerald-600 hover:text-emerald-500 font-medium">Términos de Referencia</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Crear Cuenta <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
            
            <p className="text-center text-sm text-slate-500 mt-6">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
                Ingresa aquí
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Registro;
