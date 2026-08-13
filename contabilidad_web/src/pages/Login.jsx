import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Activity, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post(`${API_URL}/api/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data.requires_2fa) {
        setRequires2FA(true);
        setTempToken(response.data.temp_token);
        setError('');
      } else if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('rol', response.data.rol);
        setTimeout(() => navigate('/dashboard'), 600);
      }
    } catch (err) {
      console.error("Login Error:", err);
      if (err.response) {
        // Backend devolvió un código de error (ej. 401, 500)
        setError(`Error del servidor (${err.response.status}): ${err.response.data?.detail || 'Credenciales inválidas.'}`);
      } else if (err.request) {
        // No hubo respuesta del backend (CORS, Red, Servidor Caído)
        setError('Error de Red: No se pudo conectar con el servidor. Revisa si el backend está encendido y si la URL (VITE_API_URL) es correcta.');
      } else {
        // Error interno de React/Axios
        setError(`Error interno: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/api/login/verify-2fa`, {
        temp_token: tempToken,
        code: totpCode
      });

      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('rol', response.data.rol);
        setTimeout(() => navigate('/dashboard'), 600);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Cdigo 2FA incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100 rounded-full blur-[100px] opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-100 rounded-full blur-[100px] opacity-60"></div>

      <div className="w-full max-w-[1000px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 border border-slate-100">
        
        {/* Left Side - Brand & Info */}
        <div className="md:w-5/12 bg-emerald-600 p-10 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-12">
              <div className="bg-white p-2 rounded-lg">
                <Activity className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-xl font-bold tracking-tight">Ecosistema SaaS</span>
            </div>
            
            <h1 className="text-4xl font-bold mb-4 leading-tight">Módulo de<br/>Contabilidad</h1>
            <p className="text-emerald-100 text-lg mb-8">
              Gestión financiera inteligente NIIF/NIFACES. Conectado a tu ecosistema empresarial.
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex items-center space-x-3 text-emerald-100 mb-4 bg-emerald-700/50 p-4 rounded-xl backdrop-blur-sm border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6 shrink-0 text-emerald-300" />
              <p className="text-sm font-medium">Acceso centralizado y cifrado de extremo a extremo.</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="md:w-7/12 p-10 md:p-14 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              {requires2FA ? 'Verificación de Seguridad' : 'Bienvenido de nuevo'}
            </h2>
            <p className="text-slate-500">
              {requires2FA ? 'Ingresa el código de 6 dígitos de tu aplicación autenticadora.' : 'Ingresa las credenciales maestras de tu Ecosistema.'}
            </p>
          </div>

          {!requires2FA ? (
            <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center animate-pulse">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Usuario Central</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 hover:bg-slate-100/50 transition-colors text-slate-800 outline-none"
                      placeholder="admin"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-12 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 hover:bg-slate-100/50 transition-colors text-slate-800 outline-none"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600 focus:outline-none transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-500/30 text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 font-medium transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handle2FAVerify} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center animate-pulse">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 text-center">Código de Autenticación</label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="block w-full py-4 text-center text-3xl tracking-[0.5em] border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 font-mono text-slate-800 outline-none"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-500/30 text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 font-medium transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Verificar Código</span>
                    <ShieldCheck className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => { setRequires2FA(false); setTotpCode(''); setError(''); }}
                  className="text-sm text-slate-500 hover:text-slate-800 underline transition-colors"
                >
                  Volver al inicio de sesión normal
                </button>
              </div>
            </form>
          )}

          <div className="mt-10 text-center">
            <p className="text-sm text-slate-400 font-medium">
              Ecosistema Seguro &bull; NIIF &bull; {new Date().getFullYear()}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;
