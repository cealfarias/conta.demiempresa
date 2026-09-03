import React, { useState } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import bgImage from '../assets/bg-contabilidad.png';
import GlobalErrorAlert from '../components/GlobalErrorAlert';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Registro() {
  const [empresaId, setEmpresaId] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [nit, setNit] = useState('');
  const [giro, setGiro] = useState('');
  const [pais, setPais] = useState('El Salvador');
  const [moneda, setMoneda] = useState('USD');
  const [normativa, setNormativa] = useState('NIIF_PYMES');
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  
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
      // 0. Verificar si el correo ya existe
      const checkRes = await axios.get(`${API_URL}/api/v1/usuarios/check-email/${encodeURIComponent(email)}`);
      if (checkRes.data.exists) {
        setError('Este correo electrónico ya está registrado. Solo se permite una empresa por usuario. Adquiere una Licencia Multi-Empresa para agregar más entidades.');
        setLoading(false);
        return;
      }

      // 1. Create Company
      const empresaPayload = {
        id: empresaId.toUpperCase(),
        razon_social: nombreEmpresa,
        nit: nit,
        giro: giro || 'General',
        normativa: normativa,
        pais: pais,
        moneda: moneda,
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
        telefono: telefono || null,
        rol: "Administrador",
        empresa_id: empresaId.toUpperCase(),
        is_active: true,
        password: password,
        usuario_creacion: "sistema",
        terminal_ip: "127.0.0.1"
      };

      await axios.post(`${API_URL}/api/v1/usuarios/`, userPayload, {
        headers: { 'Content-Type': 'application/json' }
      });

      // 3. Initialize Period
      const periodoPayload = {
        empresa_id: empresaId.toUpperCase(),
        anio: parseInt(anio),
        usuario: username
      };

      await axios.post(`${API_URL}/api/v1/periodos/inicializar`, periodoPayload, {
        headers: { 'Content-Type': 'application/json' }
      });

      // 4. Registrar aceptación de Términos de Referencia (evidencia legal)
      try {
        await axios.post(`${API_URL}/api/v1/terminos/aceptar`, {
          email: email,
          username: username,
          empresa_id: empresaId.toUpperCase(),
          nombre_empresa: nombreEmpresa,
          version_terminos: "v2026.08.22",
          metodo_registro: "formulario",
          acepto_mailing: acceptedMailing ? "si" : "no"
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (termErr) {
        // No bloquear el registro si falla el guardado de términos
        console.warn("No se pudo registrar la aceptación de términos:", termErr);
      }

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
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }}>
          {/* Glassmorphism Dark Overlay */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Inteligencia<br />Financiera
          </h1>
          <p className="text-slate-200 text-base mb-10 max-w-md leading-relaxed">
            Accede a tu módulo contable y cumple con los estándares NIIF con facilidad.
          </p>
          
          <ul className="space-y-6">
            <li className="flex items-center text-slate-100 font-medium">
              <div className="w-10 h-10 bg-slate-800/60 rounded-full flex items-center justify-center mr-4">🧾</div>
              Partidas Contables Automatizadas
            </li>
            <li className="flex items-center text-slate-100 font-medium">
              <div className="w-10 h-10 bg-slate-800/60 rounded-full flex items-center justify-center mr-4">📊</div>
              Estados Financieros en Tiempo Real
            </li>
            <li className="flex items-center text-slate-100 font-medium">
              <div className="w-10 h-10 bg-slate-800/60 rounded-full flex items-center justify-center mr-4">🏦</div>
              Cierre Ejercicios y Control de Periodos
            </li>
          </ul>
        </div>
      </div>

      {/* Right side: Form Container */}
      <div className="md:w-[55%] flex justify-center items-center p-4 sm:p-8 relative">
        <div className="w-full max-w-xl">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Crear nueva Empresa</h2>
            <p className="text-sm text-slate-500 text-center mb-8">
              Ingresa los datos para crear tu entorno contable
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <GlobalErrorAlert 
              error={error} 
              context="Registro de Empresa" 
              extraInfo={{ EmpresaID: empresaId, NombreEmpresa: nombreEmpresa, AdminUser: username }}
            />

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
                <label className="block text-xs font-medium text-slate-700 mb-1">País</label>
                <select 
                  value={pais}
                  onChange={e => setPais(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                >
                  <option value="El Salvador">El Salvador</option>
                  <option value="México">México</option>
                  <option value="Guatemala">Guatemala</option>
                  <option value="Honduras">Honduras</option>
                  <option value="Nicaragua">Nicaragua</option>
                  <option value="Costa Rica">Costa Rica</option>
                  <option value="Panamá">Panamá</option>
                  <option value="Colombia">Colombia</option>
                  <option value="Ecuador">Ecuador</option>
                  <option value="Perú">Perú</option>
                  <option value="Chile">Chile</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Uruguay">Uruguay</option>
                  <option value="Paraguay">Paraguay</option>
                  <option value="Bolivia">Bolivia</option>
                  <option value="República Dominicana">República Dominicana</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Moneda Base</label>
                <select 
                  value={moneda}
                  onChange={e => setMoneda(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                >
                  <option value="USD">Dólar Estadounidense (USD)</option>
                  <option value="MXN">Peso Mexicano (MXN)</option>
                  <option value="COP">Peso Colombiano (COP)</option>
                  <option value="CLP">Peso Chileno (CLP)</option>
                  <option value="ARS">Peso Argentino (ARS)</option>
                  <option value="PEN">Sol Peruano (PEN)</option>
                  <option value="GTQ">Quetzal Guatemalteco (GTQ)</option>
                  <option value="HNL">Lempira Hondureño (HNL)</option>
                  <option value="NIO">Córdoba Nicaragüense (NIO)</option>
                  <option value="CRC">Colón Costarricense (CRC)</option>
                  <option value="PAB">Balboa Panameño (PAB)</option>
                  <option value="DOP">Peso Dominicano (DOP)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">NIT / RUC / Identificador Tributario</label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Año Contable (Inicial)</label>
                <input 
                  type="number" 
                  required
                  min="2000"
                  max="2100"
                  value={anio}
                  onChange={e => setAnio(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                <label className="block text-xs font-medium text-slate-700 mb-1">WhatsApp (Opcional)</label>
                <input 
                  type="tel" 
                  placeholder="+503 7000 0000"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
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
                  He leído y acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium" onClick={(e) => e.stopPropagation()}>Términos de Referencia</a> y el <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium" onClick={(e) => e.stopPropagation()}>Contrato de Servicio</a> de Contabilidad SaaS.
                </label>
              </div>

              <div className="flex items-start mt-2">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={acceptedMailing}
                  onChange={(e) => setAcceptedMailing(e.target.checked)}
                />
                <label className="ml-2 text-xs text-slate-600 cursor-pointer" onClick={() => setAcceptedMailing(!acceptedMailing)}>
                  Acepto recibir correos con actualizaciones y novedades contables.
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
