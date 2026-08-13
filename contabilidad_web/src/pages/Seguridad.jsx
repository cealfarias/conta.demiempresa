import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, ShieldAlert, Smartphone, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Seguridad() {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // State for setup flow
  const [setupMode, setSetupMode] = useState(false);
  const [qrUri, setQrUri] = useState('');
  const [secret, setSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [setupError, setSetupError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch2FAStatus();
  }, []);

  const fetch2FAStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/2fa/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIs2FAEnabled(response.data.is_2fa_enabled);
    } catch (err) {
      console.error('Error fetching 2FA status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate2FA = async () => {
    setActionLoading(true);
    setSetupError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/2fa/generate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQrUri(response.data.uri);
      setSecret(response.data.secret);
      setSetupMode(true);
    } catch (err) {
      setSetupError(err.response?.data?.detail || 'Error al generar 2FA');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnable2FA = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setSetupError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/2fa/enable`, { code: totpCode }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIs2FAEnabled(true);
      setSetupMode(false);
      setTotpCode('');
      setSecret('');
      setQrUri('');
    } catch (err) {
      setSetupError(err.response?.data?.detail || 'Cdigo incorrecto. Intenta de nuevo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!window.confirm("Ests seguro de que deseas desactivar la seguridad 2FA? Dejars tu cuenta menos protegida.")) {
      return;
    }
    
    setActionLoading(true);
    setSetupError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/2fa/disable`, { code: totpCode }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIs2FAEnabled(false);
      setTotpCode('');
    } catch (err) {
      setSetupError(err.response?.data?.detail || 'Cdigo incorrecto. Intenta de nuevo.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Centro de Seguridad</h1>
        <p className="text-sm text-slate-500 mt-1">Protege tu cuenta contable y la informacin financiera de tu empresa.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-full ${is2FAEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              {is2FAEnabled ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Autenticacin de Dos Factores (2FA)</h2>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Aade una capa extra de seguridad. Cuando est activado, necesitars ingresar un cdigo desde tu telfono cada vez que inicies sesin.
              </p>
            </div>
          </div>
          <div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${is2FAEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {is2FAEnabled ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        </div>

        <div className="p-5 md:p-6">
          {setupError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
              {setupError}
            </div>
          )}

          {!is2FAEnabled && !setupMode && (
            <div className="flex flex-col items-center justify-center text-center py-6">
              <Smartphone className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-700 mb-1">Protege tu Ecosistema</h3>
              <p className="text-sm text-slate-500 mb-5 max-w-sm">
                Te recomendamos usar Google Authenticator, Authy o Microsoft Authenticator para generar tus cdigos seguros.
              </p>
              <button
                onClick={handleGenerate2FA}
                disabled={actionLoading}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center"
              >
                {actionLoading ? 'Generando...' : 'Configurar 2FA ahora'}
              </button>
            </div>
          )}

          {!is2FAEnabled && setupMode && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div className="w-full md:w-1/2">
                  <h3 className="text-base font-bold text-slate-800 mb-2">Paso 1: Escanea el Cdigo QR</h3>
                  <p className="text-slate-500 text-xs mb-3">
                    Abre tu aplicacin autenticadora en tu celular y escanea la siguiente imagen para enlazar tu cuenta.
                  </p>
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4">
                    <p className="text-[11px] text-blue-800 font-medium mb-1">Cules son las aplicaciones autenticadoras?</p>
                    <p className="text-[11px] text-blue-700">Puedes descargar gratis cualquiera de estas en tu tienda de apps (App Store o Play Store): <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, o <strong>Authy</strong>.</p>
                  </div>
                  <div className="bg-white p-3 inline-block border-2 border-slate-100 rounded-lg shadow-sm mb-3">
                    <QRCodeSVG value={qrUri} size={160} level="H" />
                  </div>
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-200 font-mono text-center">
                    Cdigo manual: <br/><strong className="text-slate-700 tracking-wider text-xs mt-1 block">{secret}</strong>
                  </p>
                </div>
                
                <div className="w-full md:w-1/2">
                  <h3 className="text-base font-bold text-slate-800 mb-2">Paso 2: Verifica el Cdigo</h3>
                  <p className="text-slate-500 text-xs mb-4">
                    Ingresa el cdigo de 6 dgitos que aparece en tu aplicacin.
                  </p>
                  
                  <form onSubmit={handleEnable2FA} className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Cdigo de Autenticacin
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      className="block w-full py-2 px-3 text-center text-xl tracking-[0.5em] border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-mono text-slate-800 outline-none mb-4 shadow-sm"
                      placeholder="000000"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading || totpCode.length !== 6}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-500/20"
                    >
                      {actionLoading ? 'Verificando...' : 'Activar 2FA'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSetupMode(false)}
                      className="w-full text-slate-500 hover:text-slate-700 mt-4 text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {is2FAEnabled && (
            <div className="animate-in fade-in duration-300">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5 flex items-start space-x-3 mb-6">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-emerald-800 text-sm">Tu cuenta est protegida</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    El sistema requerir un cdigo temporal de 6 dgitos cada vez que intentes iniciar sesin.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6 mt-6">
                <h3 className="text-base font-bold text-slate-800 mb-1">Desactivar 2FA</h3>
                <p className="text-slate-500 text-xs mb-4">
                  Para desactivar la proteccin de dos factores, debes ingresar un cdigo de autenticacin vlido actual.
                </p>
                
                <form onSubmit={handleDisable2FA} className="max-w-sm">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white font-mono tracking-widest text-slate-800 outline-none text-sm"
                        placeholder="000000"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={actionLoading || totpCode.length !== 6}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {actionLoading ? 'Desactivando...' : 'Desactivar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Seguridad;
