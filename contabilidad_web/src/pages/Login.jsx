import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import GlobalErrorAlert from '../components/GlobalErrorAlert';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const queryParams = new URLSearchParams(location.search);
  const isExpired = queryParams.get('expired') === 'true';
  
  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post(`${API_URL}/api/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (response.data.requires_2fa) {
        setRequires2FA(true);
        setTempToken(response.data.temp_token);
        setError('');
      } else if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('rol', response.data.rol);
        setTimeout(() => navigate('/seleccionar-entorno'), 600);
      }
    } catch (err) {
      console.error("Login Error:", err);
      if (err.response) {
        setError(`Error (${err.response.status}): ${err.response.data?.detail || 'Credenciales inválidas.'}`);
      } else if (err.request) {
        setError('Error de Red: El servidor se está iniciando. Por favor, espera unos segundos e intenta nuevamente.');
      } else {
        setError(`Error interno: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/login/verify-2fa`, {
        temp_token: tempToken,
        code: totpCode
      });

      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('rol', response.data.rol);
        setTimeout(() => navigate('/seleccionar-entorno'), 600);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Código 2FA incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="login-container">
        <div className="login-wrapper" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div className="login-right" style={{ padding: '3rem 2rem', width: '100%' }}>
            <div className="login-card">
              <div className="login-header">
                <div className="logo-placeholder" style={{ color: '#059669' }}>🔐</div>
                <h2>Verificación en 2 Pasos</h2>
                <p className="text-muted">Abre Google Authenticator e ingresa el código de 6 dígitos.</p>
              </div>

              <form onSubmit={handle2FASubmit}>
                <GlobalErrorAlert error={error} context="Login 2FA" />
                
                <div className="form-group" style={{ textAlign: 'center' }}>
                  <input 
                    type="text" 
                    value={totpCode} 
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="form-input" 
                    placeholder="000000"
                    style={{ fontSize: '2rem', letterSpacing: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}
                    required 
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ padding: '0.85rem', fontSize: '1rem', marginTop: '1rem', background: '#059669' }}>
                  {loading ? 'Verificando...' : 'Verificar y Entrar'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container" style={{ backgroundImage: "linear-gradient(rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.7)), url('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80')" }}>
      
      {/* Burbujita de sesión expirada */}
      {isExpired && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-[bounce_1s_infinite]">
          <div className="bg-amber-100 text-amber-800 border-2 border-amber-400 px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex items-center space-x-3 font-bold text-sm">
            <span className="text-xl">⚠️</span>
            <span>¡Tu sesión ha expirado por seguridad! Por favor, inicia sesión nuevamente.</span>
          </div>
        </div>
      )}

      <div className="login-wrapper">
        {/* Lado izquierdo */}
        <div className="login-left">
          <div className="login-left-content">
            <h1>Inteligencia<br />Financiera</h1>
            <p style={{ fontSize: '1.25rem', opacity: 0.9, lineHeight: 1.5 }}>
              Accede a tu módulo contable y cumple con los estándares NIIF con facilidad.
            </p>
            <ul className="login-benefits" style={{ marginTop: '3rem' }}>
              <li className="benefit-item">
                <div className="benefit-icon">🧾</div>
                <span>Partidas Contables Automatizadas</span>
              </li>
              <li className="benefit-item">
                <div className="benefit-icon">📊</div>
                <span>Estados Financieros en Tiempo Real</span>
              </li>
              <li className="benefit-item">
                <div className="benefit-icon">🏦</div>
                <span>Cierre Ejercicios y Control de Periodos</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Lado derecho */}
        <div className="login-right">
          <div className="login-card">
            <div className="login-header">
              <div className="logo-placeholder" style={{ color: '#059669', fontSize: '2.5rem' }}>🏛️</div>
              <h2>Iniciar Sesión</h2>
              <p className="text-muted">Ingresa a tu módulo de Contabilidad</p>
            </div>

            <form onSubmit={handleLoginSubmit}>
              <GlobalErrorAlert error={error} context="Login General" />

              <div className="form-group">
                <label className="form-label">Correo Electrónico / Usuario</label>
                <input 
                  type="text" 
                  name="username" 
                  className="form-input" 
                  required 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input 
                  type="password" 
                  name="password" 
                  className="form-input" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <a href="#" className="text-muted" style={{ fontSize: '0.85rem', textDecoration: 'none' }}>¿Olvidaste tu contraseña?</a>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ padding: '0.85rem', fontSize: '1rem', background: '#059669', border: 'none' }}>
                {loading ? 'Ingresando...' : 'Ingresar a Contabilidad'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
                <hr style={{ flex: 1, borderTop: '1px solid #e2e8f0', margin: 0 }} />
                <span style={{ padding: '0 1rem', color: '#64748b', fontSize: '0.875rem' }}>O ingresa con</span>
                <hr style={{ flex: 1, borderTop: '1px solid #e2e8f0', margin: 0 }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    try {
                      setLoading(true);
                      const response = await axios.post(`${API_URL}/api/login/google`, {
                        credential: credentialResponse.credential
                      });
                      if (response.data.access_token) {
                        localStorage.setItem('token', response.data.access_token);
                        localStorage.setItem('rol', response.data.rol);
                        setTimeout(() => navigate('/seleccionar-entorno'), 600);
                      }
                    } catch (err) {
                      setError(err.response?.data?.detail || 'Error al iniciar sesión con Google.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={() => {
                    console.log('Login Failed');
                  }}
                  theme="outline"
                  size="large"
                  width="100%"
                  text="signin_with"
                />
              </div>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
              <Link to="/registro" className="text-muted" style={{ textDecoration: 'none' }}>
                ¿No tienes un ecosistema? <strong style={{ color: '#059669' }}>Crea tu Empresa aquí</strong>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
