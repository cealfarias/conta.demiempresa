import React, { useState } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, Send, AlertCircle, Building, Phone } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://conta-demiempresa.onrender.com';

export default function Suscripcion() {
  const [comprobante, setComprobante] = useState('');
  const [enviando, setEnviando] = useState(false);
  const isPremium = localStorage.getItem('licencia_tipo') === 'premium';

  const handleSubmitPago = async (e) => {
    e.preventDefault();
    if (!comprobante.trim()) return;

    try {
      setEnviando(true);
      const data = {
        asunto: `COMPROBANTE DE PAGO: ${comprobante}`,
        categoria: 'Facturación / Licencia',
        prioridad: 'Alta',
        mensaje_inicial: `He realizado el pago para activar la Licencia Pro Enterprise.\n\nNúmero de Referencia / Comprobante: ${comprobante}\nMétodo: Transfer365 Davivienda (69893101 - Cesar Arias)`
      };
      
      await axios.post(`${API_URL}/api/v1/soporte/tickets`, data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      toast.success('¡Comprobante enviado! El administrador lo verificará pronto.', { duration: 5000 });
      setComprobante('');
    } catch (err) {
      toast.error('Hubo un error al enviar el comprobante.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Suscripción y Pagos</h1>
          <p className="text-slate-500 text-sm">Gestiona tu licencia y activa funciones premium</p>
        </div>
      </div>

      {isPremium ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8 flex items-start space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-800 mb-1">¡Licencia Pro Enterprise Activa!</h3>
            <p className="text-emerald-600 mb-3">Tu cuenta goza de todos los beneficios premium, sin anuncios y con soporte prioritario.</p>
            <div className="inline-flex items-center px-3 py-1 bg-emerald-200 text-emerald-800 text-xs font-bold rounded-full">
              ESTADO: VERIFICADO Y ACTIVO
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="p-8 md:p-10 text-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="inline-flex items-center px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full border border-blue-500/30 mb-3">
                  RECOMENDADO
                </span>
                <h2 className="text-3xl font-bold mb-2">Licencia Pro Enterprise</h2>
                <p className="text-slate-300 max-w-md">Desbloquea el potencial completo de tu contabilidad empresarial sin limitaciones.</p>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-4xl font-black">$29<span className="text-xl text-slate-400 font-normal">/mes</span></div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-slate-300"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> <span>Licencia Multi-Empresa (Varias entidades)</span></div>
                <div className="flex items-center space-x-2 text-slate-300"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> <span>Paquetes de Usuarios Extra (+5 empleados)</span></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-slate-300"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> <span>Soporte 24/7 Prioritario</span></div>
                <div className="flex items-center space-x-2 text-slate-300"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> <span>Sin anuncios ni interrupciones</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Gateway Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-2 mb-4 text-slate-800">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold">Pasarela de Pago Segura</h3>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-4">
            <div className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Método Aceptado (El Salvador)</div>
            
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg mb-3 shadow-sm">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-slate-700">Banco Davivienda</span>
              </div>
              <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-1 rounded">Transfer365 Móvil</span>
            </div>

            <div className="space-y-2 mt-4 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 flex items-center"><Phone className="w-4 h-4 mr-2" /> Número Móvil:</span>
                <strong className="text-slate-800 font-mono text-base">6989-3101</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 flex items-center"><Building className="w-4 h-4 mr-2" /> Titular de Cuenta:</span>
                <strong className="text-slate-800">Cesar Arias</strong>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2 text-xs text-slate-500 bg-blue-50 p-3 rounded border border-blue-100">
            <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p>Realiza la transferencia desde la app de tu banco usando <strong>Transfer365 Móvil</strong> al número indicado. Guarda el número de referencia.</p>
          </div>
        </div>

                {/* Pago con n1co */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4 text-slate-800">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold">Pago Digital - n1co</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-5">
              Paga instantáneamente con tu tarjeta de crédito o débito Visa y Mastercard a través de la pasarela segura de n1co.
            </p>
          </div>

          <div>
            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const res = await axios.post(`${API_URL}/api/pagos/checkout-n1co`, {
                    amount: 2900
                  }, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (res.data.checkout_url) {
                    window.open(res.data.checkout_url, '_blank');
                  }
                } catch(e) {
                  toast.error("Error al generar el link de pago");
                }
              }}
              className="w-full py-3 px-4 rounded-lg text-white font-bold flex items-center justify-center space-x-2 transition-all shadow-sm bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 hover:shadow-lg"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pagar $29.00 con n1co</span>
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              Serás redirigido a la pasarela segura de n1co.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
