import React, { useState } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import bgImage from '../assets/bg-registro.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Registro() {
  const [empresaId, setEmpresaId] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [nit, setNit] = useState('');
  const [giro, setGiro] = useState('');
  const [normativa, setNormativa] = useState('NIIF_PYMES');
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedMailing, setAcceptedMailing] = useState(false);
  
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
      // 1. Create Company
      const empresaPayload = {
        id: empresaId.toUpperCase(),
        razon_social: nombreEmpresa,
        nit: nit,
        giro: giro || 'General',
        normativa: normativa,
        terminal_ip: "127.0.0.1",
        usuario_creacion: username
      };

      await axios.post(`${API_URL}/api/v1/empresas/nueva`, empresaPayload, {
        headers: { 'Content-Type': 'application/json' }
      });

      // 2. Create User
      const userPayload = {
        username: username,
        email: email,
        rol: "Administrador",
        is_active: true,
        password: password,
        usuario_creacion: "sistema",
        terminal_ip: "127.0.0.1"
      };

      await axios.post(`${API_URL}/api/v1/usuarios/`, userPayload, {
        headers: { 'Content-Type': 'application/json' }
      });

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);

    } catch (err) {
      console.error("Register Error:", err);
      if (err.response) {
        setError(`Error: ${err.response.data?.detail || 'No se pudo crear el entorno.'}`);
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
        <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Entorno Creado!</h2>
          <p className="text-slate-600 mb-6">La empresa y tu cuenta de administrador han sido registradas exitosamente. Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#EBEBEB] overflow-x-hidden">
      {/* Left side: Background Image & Overlay */}
      <div className="md:w-[45%] relative hidden md:flex flex-col justify-center p-12">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})` }}
        >
          {/* Glassmorphism Dark Overlay */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            El Motor de Tu<br />Crecimiento<br />Empresarial
          </h1>
          <p className="text-slate-200 text-base mb-10 max-w-md leading-relaxed">
            Digitaliza, integra y toma el control absoluto de todas las áreas operativas de tu negocio.
          </p>
          
          <ul className="space-y-6">
            <li className="flex items-center text-slate-100 font-medium">
              <div className="w-10 h-10 bg-slate-800/60 rounded-full flex items-center justify-center mr-4">🏢</div>
              Gestión Integral de Áreas y Sucursales
            </li>
            <li className="flex items-center text-slate-100 font-medium">
              <div className="w-10 h-10 bg-slate-800/60 rounded-full flex items-center justify-center mr-4">📦</div>
              Inventario Preciso y Trazabilidad Total
            </li>
            <li className="flex items-center text-slate-100 font-medium">
              <div className="w-10 h-10 bg-slate-800/60 rounded-full flex items-center justify-center mr-4">📈</div>
              Facturación Electrónica al Instante (DTE)
            </li>
          </ul>
        </div>
      </div>

      {/* Right side: Form Container */}
      <div className="md:w-[55%] flex justify-center items-center p-4 sm:p-8 relative">
        <div className="w-full max-w-xl">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Crear nueva Empresa</h2>
            <p className="text-sm text-slate-500 mt-1">Ingresa los datos para crear tu espacio de facturación</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 text-center">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre Empresa</label>
                <input 
                  type="text" 
                  required
                  value={nombreEmpresa}
                  onChange={e => setNombreEmpresa(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ID Empresa (Corto)</label>
                <input 
                  type="text" 
                  maxLength={10}
                  required
                  placeholder="Ej: DEMI"
                  value={empresaId}
                  onChange={e => setEmpresaId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">NIT / NRC (Opcional)</label>
                <input 
                  type="text" 
                  value={nit}
                  onChange={e => setNit(e.target.value)}
                  placeholder="0614-..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Giro de Negocio</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Venta de tecnología"
                  value={giro}
                  onChange={e => setGiro(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Normativa Contable</label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input type="radio" value="NIIF_PYMES" checked={normativa === 'NIIF_PYMES'} onChange={(e) => setNormativa(e.target.value)} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="ml-2 text-sm text-slate-700">NIIF para PYMES</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" value="NIFACES" checked={normativa === 'NIFACES'} onChange={(e) => setNormativa(e.target.value)} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="ml-2 text-sm text-slate-700">NIFACES</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Usuario Administrador</label>
              <input 
                type="text" 
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contraseña Maestra</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mt-6">
              <div className="flex items-start mb-3">
                <input 
                  type="checkbox" 
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                <label className="ml-2 text-xs text-slate-600 cursor-pointer" onClick={() => setAcceptedTerms(!acceptedTerms)}>
                  He leído y acepto los <span className="text-indigo-600 hover:underline">Términos de Referencia</span> y el <span className="text-indigo-600 hover:underline">Contrato de Servicio</span> de Facturación e Inventario SaaS.
                </label>
              </div>
              <div className="flex items-start">
                <input 
                  type="checkbox"
                  checked={acceptedMailing}
                  onChange={(e) => setAcceptedMailing(e.target.checked)}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                <label className="ml-2 text-xs text-slate-600 cursor-pointer" onClick={() => setAcceptedMailing(!acceptedMailing)}>
                  Acepto recibir correos con actualizaciones y novedades de facturación electrónica.
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              {loading ? 'Registrando Entorno...' : 'Registrar Empresa'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#EBEBEB] text-slate-500">O regístrate con</span>
              </div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                  onSuccess={(credentialResponse) => {
                  try {
                    const token = credentialResponse.credential;
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));

                    const decoded = JSON.parse(jsonPayload);
                    setEmail(decoded.email);
                    if (decoded.given_name) {
                      setUsername(decoded.given_name.toLowerCase().replace(/\s+/g, ''));
                    } else {
                      setUsername(decoded.email.split('@')[0]);
                    }
                  } catch (e) {
                    console.error("Error decoding token", e);
                  }
                }}
                onError={() => {
                  console.log('Login Failed');
                }}
                theme="outline"
                size="large"
                text="signup_with"
                width="100%"
              />
            </div>
            
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            ¿Ya tienes un espacio? <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500">Inicia Sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Registro;
