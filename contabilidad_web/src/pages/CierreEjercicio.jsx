import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  XCircle,
  ChevronRight,
  ShieldAlert,
  Calculator,
  Lock,
  ArrowRight,
  Check,
  CircleDashed,
  BookOpen
} from 'lucide-react';
import { useAssistant } from '../contexts/AssistantContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://conta-demiempresa.onrender.com';

export default function CierreEjercicio() {
  const navigate = useNavigate();
  const { startCierreOnboarding, startPreCierreFixes, say, dismiss } = useAssistant();

  const empresaId = localStorage.getItem('empresa_activa');
  const anioActivo = localStorage.getItem('anio_activo');
  const token = localStorage.getItem('token');
  const anioNum = parseInt(anioActivo) || new Date().getFullYear();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [preCierreData, setPreCierreData] = useState(null);
  const [puedeCerrar, setPuedeCerrar] = useState(false);

  const [calcReservaLegal, setCalcReservaLegal] = useState(true);
  const [calcISR, setCalcISR] = useState(true);

  const [confirmLiquidacion, setConfirmLiquidacion] = useState(false);
  const [cierreResult, setCierreResult] = useState(null);

  // Efecto que controla la aparición del Asistente
  useEffect(() => {
    // Solo actuamos cuando ya tenemos los datos de pre-cierre
    if (preCierreData) {
      if (!puedeCerrar) {
        startCierreOnboarding(() => {
          startPreCierreFixes(
            preCierreData.borradores_lista, 
            preCierreData.meses_abiertos,
            preCierreData.cuentas_faltantes
          );
        });
      } else {
        startCierreOnboarding();
      }
    }
  }, [preCierreData, puedeCerrar, startCierreOnboarding, startPreCierreFixes]);

  useEffect(() => {
    const fetchPreCierre = async () => {
      if (!empresaId || !anioNum || !token) return;
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/v1/partidas/pre-cierre/${empresaId}/${anioNum}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPreCierreData(res.data);
        setPuedeCerrar(res.data.puede_cerrar === true);
      } catch (err) {
        console.error(err);
        const serverMsg = err.response?.data?.detail || "Error al obtener datos de pre-cierre.";
        toast.error(serverMsg);
      } finally {
        setLoading(false);
      }
    };
    fetchPreCierre();
  }, [empresaId, anioNum, token]);

  const executeCierreCompleto = async () => {
    try {
      setLoading(true);
      const payload = {
        empresa_id: empresaId,
        anio: anioNum,
        anio_nuevo: anioNum + 1,
        calcular_reserva_legal: calcReservaLegal,
        calcular_isr: calcISR
      };
      
      const res = await axios.post(`${API_URL}/api/v1/partidas/ejecutar-cierre-completo`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCierreResult(res.data);
      toast.success('Cierre ejecutado exitosamente en base de datos');
      
      // Narración del Avatar de los procesos realizados
      say("Generando partidas automáticas... Base Legal: Código de Comercio y NIIF para PYMES.", "cierre-page");
      
      await new Promise(r => setTimeout(r, 4500));
      
      if (calcReservaLegal) {
        say("Generando Provisión de Reserva Legal del 7%. (Base legal: Art. 295 del Código de Comercio de El Salvador).", "cierre-page");
        await new Promise(r => setTimeout(r, 4500));
      }
      
      if (calcISR) {
        say("Calculando Impuesto Sobre la Renta (ISR) según tasas vigentes. (Base legal: Art. 41 Ley de Impuesto sobre la Renta).", "cierre-page");
        await new Promise(r => setTimeout(r, 4500));
      }
      
      say("Liquidando cuentas de Ingresos y Egresos. Enviando el resultado final a la cuenta de Patrimonio (Utilidades/Pérdidas). (Base legal: Sec. 3 NIIF PYMES y PCGA).", "cierre-page");
      await new Promise(r => setTimeout(r, 5500));
      
      say("Sellando el ejercicio y generando catálogos y partida de apertura para el nuevo año fiscal. ¡Todo listo!", null, [
        { label: 'Continuar a Resultados', action: () => {
          dismiss();
          setStep(4);
        }}
      ]);

    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al ejecutar el cierre completo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = () => {
    localStorage.setItem('anio_activo', String(anioNum + 1));
    navigate('/dashboard');
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  const steps = [
    { num: 1, title: 'Pre-Cierre' },
    { num: 2, title: 'Provisiones' },
    { num: 3, title: 'Liquidación' },
    { num: 4, title: 'Sellar' },
    { num: 5, title: 'Apertura' }
  ];

  const utilidadBruta = preCierreData?.utilidad_bruta || 0;
  const reservaLegal = calcReservaLegal ? utilidadBruta * 0.07 : 0;
  const baseISR = utilidadBruta - reservaLegal;
  const isr = calcISR ? baseISR * 0.25 : 0;
  const utilidadNeta = utilidadBruta - reservaLegal - isr;

  const renderStepper = () => (
    <div className="flex items-center justify-between mb-8 overflow-x-auto py-2">
      {steps.map((s, idx) => (
        <React.Fragment key={s.num}>
          <div className="flex flex-col items-center min-w-[80px]">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-colors ${
              step > s.num 
                ? 'bg-emerald-600 text-white' 
                : step === s.num 
                  ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30' 
                  : 'bg-gray-700 text-gray-400'
            }`}>
              {step > s.num ? <Check size={20} /> : s.num}
            </div>
            <span className={`text-xs font-medium ${step >= s.num ? 'text-emerald-400' : 'text-gray-500'}`}>
              {s.title}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-1 mx-2 rounded-full ${step > s.num ? 'bg-emerald-600' : 'bg-gray-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div id="cierre-page" className="p-6 max-w-4xl mx-auto text-gray-200 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Cierre de Ejercicio Fiscal {anioNum}</h1>
        <p className="text-gray-400">Asistente automatizado para la liquidación, sellado y apertura del nuevo año fiscal.</p>
      </div>

      <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
        {renderStepper()}

        {loading && step < 4 && (
          <div className="flex flex-col items-center justify-center py-12">
            <CircleDashed className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-400">Procesando información...</p>
          </div>
        )}

        {/* ==================== PASO 1: PRE-CIERRE ==================== */}
        {!loading && step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">1. Validación de Pre-Cierre</h2>
            
            {preCierreData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-300">Requisitos</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      {preCierreData.borradores_pendientes === 0 ? <CheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={20} /> : <XCircle className="text-red-500 mt-0.5 shrink-0" size={20} />}
                      <div>
                        <p className="text-sm font-medium text-gray-200">Sin borradores pendientes</p>
                        {preCierreData.borradores_pendientes > 0 && <p className="text-xs text-red-400">{preCierreData.borradores_pendientes} partidas en estado borrador.</p>}
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      {preCierreData.meses_abiertos.length === 0 ? <CheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={20} /> : <XCircle className="text-red-500 mt-0.5 shrink-0" size={20} />}
                      <div>
                        <p className="text-sm font-medium text-gray-200">Todos los meses cerrados</p>
                        {preCierreData.meses_abiertos.length > 0 && (
                          <p className="text-xs text-red-400">Meses abiertos: {preCierreData.meses_abiertos.join(', ')}</p>
                        )}
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      {preCierreData.cuadre_global ? <CheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={20} /> : <XCircle className="text-red-500 mt-0.5 shrink-0" size={20} />}
                      <div>
                        <p className="text-sm font-medium text-gray-200">Cuadre global verificado</p>
                        {!preCierreData.cuadre_global && <p className="text-xs text-red-400">Las partidas del año no cuadran.</p>}
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      {!preCierreData.cierre_previo_existe ? <CheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={20} /> : <XCircle className="text-red-500 mt-0.5 shrink-0" size={20} />}
                      <div>
                        <p className="text-sm font-medium text-gray-200">Sin cierre previo</p>
                        {preCierreData.cierre_previo_existe && <p className="text-xs text-red-400">Este ejercicio ya fue cerrado anteriormente.</p>}
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                  <h3 className="text-lg font-medium text-gray-300 mb-4">Resumen Financiero</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Ingresos:</span>
                      <span className="text-gray-200 font-medium">{formatCurrency(preCierreData.total_ingresos)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Gastos:</span>
                      <span className="text-gray-200 font-medium">{formatCurrency(preCierreData.total_gastos)}</span>
                    </div>
                    <div className="border-t border-gray-700 pt-3 mt-3 flex justify-between items-center">
                      <span className="text-gray-300 font-semibold">Utilidad Bruta:</span>
                      <span className={`font-bold text-lg ${utilidadBruta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(utilidadBruta)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No se pudo cargar la información de pre-cierre.</p>
            )}

            <div className="flex justify-between pt-4 border-t border-gray-700 items-center">
              <div>
                {/* El asistente ahora se activa automáticamente si no puede cerrar */}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!puedeCerrar}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors font-medium"
              >
                Continuar al Paso 2
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ==================== PASO 2: PROVISIONES ==================== */}
        {!loading && step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">2. Configuración de Provisiones</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <div>
                    <h4 className="text-sm font-medium text-gray-200">Reserva Legal (7%)</h4>
                    <p className="text-xs text-gray-400">Art. 123 Código de Comercio</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={calcReservaLegal} onChange={() => setCalcReservaLegal(!calcReservaLegal)} />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <div>
                    <h4 className="text-sm font-medium text-gray-200">Impuesto sobre la Renta (25%)</h4>
                    <p className="text-xs text-gray-400">Código Tributario Art. 37</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={calcISR} onChange={() => setCalcISR(!calcISR)} />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-5 border border-gray-700">
                <h3 className="text-lg font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <Calculator size={18} className="text-emerald-500" />
                  Proyección de Resultados
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Utilidad Bruta:</span>
                    <span className="text-gray-200">{formatCurrency(utilidadBruta)}</span>
                  </div>
                  {calcReservaLegal && (
                    <div className="flex justify-between items-center text-red-400">
                      <span>(-) Reserva Legal (7%):</span>
                      <span>{formatCurrency(reservaLegal)}</span>
                    </div>
                  )}
                  {calcISR && (
                    <div className="flex justify-between items-center text-red-400">
                      <span>(-) ISR Proyectado (25%):</span>
                      <span>{formatCurrency(isr)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-700 pt-3 mt-3 flex justify-between items-center text-base">
                    <span className="text-gray-300 font-semibold">Utilidad Neta Estimada:</span>
                    <span className={`font-bold ${utilidadNeta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(utilidadNeta)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-700">
              <button onClick={() => setStep(1)} className="px-6 py-2 text-gray-400 hover:text-white transition-colors">
                Regresar
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
              >
                Continuar a Liquidación
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ==================== PASO 3: LIQUIDACIÓN ==================== */}
        {!loading && step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">3. Ejecutar Cierre Completo</h2>
            
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="text-amber-500 w-6 h-6 shrink-0 mt-1" />
                <div>
                  <h3 className="text-amber-400 font-medium text-lg mb-2">⚠️ Atención — Proceso Irreversible</h3>
                  <p className="text-amber-200/80 text-sm mb-3">
                    Al confirmar, se ejecutarán los siguientes procesos de forma automática:
                  </p>
                  <ul className="text-sm text-amber-200/70 space-y-1 list-disc ml-4 mb-4">
                    {calcReservaLegal && <li>Provisión de Reserva Legal por {formatCurrency(reservaLegal)}</li>}
                    {calcISR && <li>Provisión de ISR por {formatCurrency(isr)}</li>}
                    <li>Liquidación de todas las cuentas de Ingresos y Gastos</li>
                    <li>Registro del Resultado del Ejercicio por {formatCurrency(utilidadNeta)}</li>
                    <li>Sellado permanente del ejercicio fiscal {anioNum}</li>
                    <li>Creación del entorno completo para el año {anioNum + 1} (catálogo, manual, saldos iniciales y partida de apertura)</li>
                  </ul>
                  
                  <label className="flex items-start gap-3 cursor-pointer bg-gray-900/50 p-3 rounded-lg">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 rounded bg-gray-900 border-gray-600 text-amber-500 focus:ring-amber-500"
                      checked={confirmLiquidacion}
                      onChange={(e) => setConfirmLiquidacion(e.target.checked)}
                    />
                    <span className="text-sm text-gray-200">
                      Confirmo que he realizado una <strong>copia de seguridad</strong> de mi información y deseo ejecutar el cierre del ejercicio fiscal {anioNum}.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-700">
              <button onClick={() => setStep(2)} className="px-6 py-2 text-gray-400 hover:text-white transition-colors">
                Regresar
              </button>
              <button
                onClick={executeCierreCompleto}
                disabled={!confirmLiquidacion || loading}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors font-medium"
              >
                {loading ? 'Ejecutando Cierre...' : 'Ejecutar Cierre Completo'}
                <Lock size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ==================== PASO 4: SELLADO ==================== */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">4. Ejercicio Sellado</h2>
            
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold text-emerald-400">¡Ejercicio {anioNum} Cerrado con Éxito!</h3>
              <p className="text-gray-300 max-w-lg mx-auto">
                La liquidación ha sido ejecutada, las cuentas de resultados quedaron a cero, y el ejercicio ha sido sellado de forma permanente.
              </p>
              {cierreResult && (
                <div className="bg-gray-900 inline-block text-left p-4 rounded-lg text-sm text-gray-300 mt-4 border border-gray-700 space-y-1">
                  <p><strong>Resultado del Ejercicio:</strong> <span className={cierreResult.resultado_ejercicio >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(cierreResult.resultado_ejercicio)}</span></p>
                  <p><strong>Partida de Liquidación:</strong> #{cierreResult.partida_liquidacion_numero || '9999'}</p>
                  <p><strong>Estado:</strong> <span className="text-emerald-400">Sellado</span></p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-700">
              <button
                onClick={() => setStep(5)}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
              >
                Ver Apertura del Nuevo Año
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ==================== PASO 5: APERTURA ==================== */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">5. Apertura Completada</h2>
            
            <div className="bg-gray-900 border border-emerald-500/50 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Nuevo Ejercicio {anioNum + 1}</h3>
                  <p className="text-emerald-400 text-sm">Listo para iniciar operaciones contables</p>
                </div>
              </div>

              <div className="space-y-4 ml-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                  <span className="text-gray-300">Ejercicio fiscal {anioNum + 1} inicializado con 12 períodos abiertos.</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                  <span className="text-gray-300">Catálogo de cuentas clonado exitosamente al nuevo año.</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                  <span className="text-gray-300">Manual de cuentas clonado exitosamente al nuevo año.</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                  <span className="text-gray-300">Saldos iniciales de cuentas de balance trasladados.</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                  <span className="text-gray-300">Resultado del ejercicio trasladado a Utilidades Retenidas.</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                  <span className="text-gray-300">Partida de apertura generada (Partida #1, Enero {anioNum + 1}).</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-700">
              <button
                onClick={handleFinalize}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-900/20 transition-all font-bold text-lg"
              >
                Ir al Ejercicio {anioNum + 1}
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
