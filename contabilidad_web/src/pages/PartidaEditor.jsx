import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, X, Plus, Trash2, Calculator, AlertCircle, ArrowLeft, ShieldCheck, Clock, User, ShieldAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function PartidaEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [catalogo, setCatalogo] = useState([]);
  const [catalogoCompleto, setCatalogoCompleto] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [nomenclatura, setNomenclatura] = useState('');
  
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState('');
  const [estado, setEstado] = useState('Borrador');
  const [auditInfo, setAuditInfo] = useState(null);
  const [detalles, setDetalles] = useState([
    { id: 1, cuenta_codigo: '', cuenta_nombre: '', debe: '', haber: '', concepto_detalle: '' },
    { id: 2, cuenta_codigo: '', cuenta_nombre: '', debe: '', haber: '', concepto_detalle: '' }
  ]);
  
  const [guardando, setGuardando] = useState(false);
  const rol = (localStorage.getItem('rol') || '').trim().toLowerCase();
  const isPremium = localStorage.getItem('licencia_tipo') === 'premium';

  useEffect(() => {
    fetchCatalogo().then(() => {
      if (id) fetchPartidaExistente();
    });
  }, [id]);

  const fetchPartidaExistente = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/v1/partidas/individual/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      setEstado(data.estado || 'Borrador');
      if (data.estado !== 'Borrador') {
        showToast(`La partida está '${data.estado}' y es de solo lectura.`);
        setGuardando(true); // Bloquea los botones visualmente
      }
      setFecha(data.fecha.split('T')[0]);
      setConcepto(data.concepto);
      setNomenclatura(data.nomenclatura || '');
      setAuditInfo({
        usuario_creacion: data.usuario_creacion,
        fecha_creacion: data.fecha_creacion,
        usuario_modificacion: data.usuario_modificacion,
        fecha_modificacion: data.fecha_modificacion
      });
      if (data.detalles && data.detalles.length > 0) {
        setDetalles(data.detalles.map((d, index) => ({
          id: Date.now() + index,
          cuenta_codigo: d.cuenta_codigo,
          cuenta_nombre: d.cuenta_nombre || '',
          debe: d.debe ? formatAmount(d.debe) : '',
          haber: d.haber ? formatAmount(d.haber) : '',
          concepto_detalle: d.concepto_detalle || ''
        })));
      }
    } catch (err) {
      showToast("Error al cargar la partida para edición.");
    }
  };

  const fetchCatalogo = async () => {
    try {
      const token = localStorage.getItem('token');
      const empresaActiva = localStorage.getItem('empresa_activa');
      const anioActivo = localStorage.getItem('anio_activo') || new Date().getFullYear();
      const response = await axios.get(`${API_URL}/api/v1/catalogo/?empresa_id=${empresaActiva}&anio=${anioActivo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCatalogoCompleto(response.data);
      const cuentasDetalle = response.data.filter(c => !c.resumen).sort((a, b) => a.cuentas.localeCompare(b.cuentas));
      setCatalogo(cuentasDetalle);
    } catch (err) {
      console.error('Error fetching catalog for editor:', err);
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const parseAmount = (val) => {
    if (!val) return 0;
    return parseFloat(val.toString().replace(/,/g, '')) || 0;
  };

  const formatAmount = (val) => {
    const num = parseAmount(val);
    if (num === 0 && (!val || val === '')) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleBlurCuenta = (id, value) => {
    if (!value) return;
    const codigoPuro = value.split(' ')[0];
    const cuentaEncontrada = catalogoCompleto.find(c => c.cuentas === codigoPuro);
    
    if (cuentaEncontrada) {
      if (cuentaEncontrada.resumen) {
        showToast(`Cuentas padre (${codigoPuro}) no permitidas.`);
        handleChangeDetalle(id, 'cuenta_codigo', ''); // Limpiar el campo
        handleChangeDetalle(id, 'cuenta_nombre', '');
      } else {
        handleChangeDetalle(id, 'cuenta_codigo', codigoPuro);
        handleChangeDetalle(id, 'cuenta_nombre', cuentaEncontrada.nombre);
      }
    } else {
      showToast(`La cuenta '${codigoPuro}' no existe.`);
      handleChangeDetalle(id, 'cuenta_codigo', ''); // Limpiar el campo
      handleChangeDetalle(id, 'cuenta_nombre', '');
    }
  };

  const handleAddRow = () => {
    setDetalles([
      ...detalles, 
      { id: Date.now(), cuenta_codigo: '', cuenta_nombre: '', debe: '', haber: '', concepto_detalle: '' }
    ]);
  };

  const handleRemoveRow = (id) => {
    if (detalles.length <= 2) {
      showToast("Una partida debe tener al menos dos líneas.");
      return;
    }
    setDetalles(detalles.filter(d => d.id !== id));
  };

  const handleChangeDetalle = (id, field, value) => {
    setDetalles(detalles.map(d => {
      if (d.id === id) {
        const updated = { ...d, [field]: value };
        // If typing on Debe, clear Haber, and vice versa
        if (field === 'debe' && value !== '' && parseAmount(value) > 0) updated.haber = '';
        if (field === 'haber' && value !== '' && parseAmount(value) > 0) updated.debe = '';
        return updated;
      }
      return d;
    }));
  };

  const totalDebe = detalles.reduce((sum, d) => sum + parseAmount(d.debe), 0);
  const totalHaber = detalles.reduce((sum, d) => sum + parseAmount(d.haber), 0);
  const diferencia = Math.abs(totalDebe - totalHaber);
  const isCuadrada = totalDebe === totalHaber && totalDebe > 0;

  const handleChangeEstado = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/api/v1/partidas/estado/${id}`, 
        { estado: 'Borrador' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEstado('Borrador');
      setGuardando(false);
      showToast(response.data.mensaje || "Estado cambiado a Borrador. Ya puede editar.");
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al cambiar el estado.");
    }
  };

  const handleGuardar = async () => {
    if (!fecha) return showToast("La fecha es obligatoria.");
    if (!concepto.trim()) return showToast("El concepto general es obligatorio.");
    if (!isCuadrada) return showToast("La partida no está cuadrada. Debe y Haber deben ser iguales.");
    
    // Validate details
    for (let i = 0; i < detalles.length; i++) {
      const d = detalles[i];
      const codigoPuro = d.cuenta_codigo.split(' ')[0];
      if (!codigoPuro) return showToast(`La línea ${i+1} no tiene cuenta contable asignada.`);
      
      // Strict Validation: Ensure account exists in the detail catalog
      const accountExists = catalogo.find(c => c.cuentas === codigoPuro);
      if (!accountExists) {
        return showToast(`La cuenta '${codigoPuro}' en la línea ${i+1} no es válida. Solo se permiten cuentas de Detalle.`);
      }

      const valDebe = parseAmount(d.debe);
      const valHaber = parseAmount(d.haber);
      if (valDebe === 0 && valHaber === 0) return showToast(`La línea ${i+1} debe tener un valor en Debe o Haber.`);
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        empresa_id: localStorage.getItem('empresa_activa'),
        anio: parseInt(fecha.split('-')[0], 10),
        mes: parseInt(fecha.split('-')[1], 10),
        fecha: fecha,
        concepto: concepto,
        usuario: 'admin',
        terminal_ip: '127.0.0.1',
        detalles: detalles.map(d => ({
          cuenta_codigo: d.cuenta_codigo.split(' ')[0], // Extracts code if user typed "1101 - Bancos"
          debe: parseAmount(d.debe),
          haber: parseAmount(d.haber),
          concepto_detalle: d.concepto_detalle || null
        }))
      };

      let response;
      if (id) {
        // Edit Mode
        response = await axios.put(`${API_URL}/api/v1/partidas/actualizar/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Create Mode
        response = await axios.post(`${API_URL}/api/v1/partidas/guardar-completa`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      // En lugar de ir a la lista, ir directo al comprobante de impresión
      const finalId = id ? id : response.data.partida_id;
      navigate(`/dashboard/partidas/imprimir/${finalId}`);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || "Error interno al guardar la partida.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col min-h-full">
      <div className="flex items-center space-x-4 mb-6 shrink-0">
        <button 
          onClick={() => navigate('/dashboard/partidas')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {id ? `Editar Partida Diaria ${nomenclatura ? `- No. ${nomenclatura}` : ''}` : 'Nueva Partida Diaria'}
          </h2>
          <p className="text-slate-500 text-sm">{id ? 'Modifique los detalles del comprobante' : 'Registre un nuevo comprobante contable'}</p>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-rose-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 font-semibold text-sm border-2 border-white">
            <AlertCircle className="w-5 h-5" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
           {/* Burbuja de estado Mayorizada */}
        {id && estado === 'Mayorizada' && (rol === 'contador' || rol === 'administrador' || rol === 'admin') && (
          <div className="mb-6 relative bg-white border border-amber-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-amber-100 rounded-full p-2.5 mt-1">
                  <ShieldCheck className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">Partida Mayorizada</h3>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                      Esta partida se encuentra protegida. ¿Quieres editar la partida? Cambia el estado con un solo clic.
                    </p>
                  </div>
                  <button 
                    onClick={handleChangeEstado}
                    className="inline-flex items-center justify-center px-4 py-2 border border-amber-300 shadow-sm text-xs font-bold rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors shrink-0"
                  >
                    Cambiar a Borrador
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panel de Auditoría (Exclusivo Premium) */}
        {id && isPremium && auditInfo && (
          <div className="mb-6 relative bg-white border border-indigo-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <ShieldAlert className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Panel de Auditoría Avanzada</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                  Premium
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start space-x-3">
                  <div className="mt-0.5"><User className="w-4 h-4 text-slate-400" /></div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Registro Original</p>
                    <p className="text-slate-700"><span className="font-medium">{auditInfo.usuario_creacion}</span></p>
                    <div className="flex items-center text-slate-500 text-xs mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {auditInfo.fecha_creacion ? new Date(auditInfo.fecha_creacion).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
                {auditInfo.usuario_modificacion && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start space-x-3">
                    <div className="mt-0.5"><User className="w-4 h-4 text-slate-400" /></div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Última Modificación</p>
                      <p className="text-slate-700"><span className="font-medium">{auditInfo.usuario_modificacion}</span></p>
                      <div className="flex items-center text-slate-500 text-xs mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {auditInfo.fecha_modificacion ? new Date(auditInfo.fecha_modificacion).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
        {/* Cabecera de la Partida */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 shrink-0 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Fecha de Registro
            </label>
            <input 
              type="date" 
              value={fecha}
              disabled={estado !== 'Borrador'}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Concepto General</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${estado === 'Borrador' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                {estado}
              </span>
            </label>
            <input 
              type="text" 
              value={concepto}
              disabled={estado !== 'Borrador'}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Provisión de planilla mensual..."
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>

        {/* Detalle (Cuadrícula) */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-slate-100/80 backdrop-blur border-b border-slate-200 z-10">
              <tr className="text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-[35%]">Cuenta Contable (Detalle)</th>
                <th className="py-3 px-4 w-32 text-right">Debe ($)</th>
                <th className="py-3 px-4 w-32 text-right">Haber ($)</th>
                <th className="py-3 px-4">Concepto Detalle</th>
                <th className="py-3 px-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detalles.map((d, index) => (
                <tr key={d.id} className="hover:bg-slate-50 group">
                  <td className="py-2 px-4 text-center text-slate-400 font-medium text-xs">
                    {index + 1}
                  </td>
                  <td className="py-2 px-4">
                    <input 
                      type="text"
                      list="cuentas-list"
                      value={d.cuenta_codigo}
                      disabled={estado !== 'Borrador'}
                      onChange={(e) => handleChangeDetalle(d.id, 'cuenta_codigo', e.target.value)}
                      onBlur={(e) => handleBlurCuenta(d.id, e.target.value)}
                      placeholder="Seleccione cuenta..."
                      className="w-full px-3 py-1.5 bg-transparent border border-transparent group-hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded text-sm font-mono outline-none transition-colors disabled:opacity-70"
                    />
                    {d.cuenta_nombre && (
                      <div className="text-[10px] font-semibold text-emerald-700 mt-0.5 px-3 uppercase truncate">
                        {d.cuenta_nombre}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-4 align-top">
                    <input 
                      type="text"
                      value={d.debe}
                      disabled={estado !== 'Borrador'}
                      onChange={(e) => handleChangeDetalle(d.id, 'debe', e.target.value.replace(/[^0-9.,]/g, ''))}
                      onBlur={(e) => handleChangeDetalle(d.id, 'debe', formatAmount(e.target.value))}
                      onFocus={(e) => handleChangeDetalle(d.id, 'debe', e.target.value.replace(/,/g, ''))}
                      placeholder="0.00"
                      className="w-full px-3 py-1.5 text-right bg-transparent border border-transparent group-hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded text-sm font-medium text-slate-700 font-mono outline-none transition-colors disabled:opacity-70"
                    />
                  </td>
                  <td className="py-2 px-4 align-top">
                    <input 
                      type="text"
                      value={d.haber}
                      disabled={estado !== 'Borrador'}
                      onChange={(e) => handleChangeDetalle(d.id, 'haber', e.target.value.replace(/[^0-9.,]/g, ''))}
                      onBlur={(e) => handleChangeDetalle(d.id, 'haber', formatAmount(e.target.value))}
                      onFocus={(e) => handleChangeDetalle(d.id, 'haber', e.target.value.replace(/,/g, ''))}
                      placeholder="0.00"
                      className="w-full px-3 py-1.5 text-right bg-transparent border border-transparent group-hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded text-sm font-medium text-slate-700 font-mono outline-none transition-colors disabled:opacity-70"
                    />
                  </td>
                  <td className="py-2 px-4 align-top">
                    <input 
                      type="text"
                      value={d.concepto_detalle}
                      disabled={estado !== 'Borrador'}
                      onChange={(e) => handleChangeDetalle(d.id, 'concepto_detalle', e.target.value)}
                      placeholder="Anotación..."
                      className="w-full px-3 py-1.5 bg-transparent border border-transparent group-hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded text-sm text-slate-600 outline-none transition-colors disabled:opacity-70"
                    />
                  </td>
                  <td className="py-2 px-4 text-center align-top">
                    {estado === 'Borrador' && (
                      <button 
                        onClick={() => handleRemoveRow(d.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                        title="Quitar línea"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <datalist id="cuentas-list">
            {catalogo.map(c => (
              <option key={c.cuentas} value={c.cuentas}>
                {c.cuentas} - {c.nombre}
              </option>
            ))}
          </datalist>

          <div className="p-4 border-t border-slate-100 border-dashed">
            {estado === 'Borrador' && (
              <button 
                onClick={handleAddRow}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir nueva línea</span>
              </button>
            )}
          </div>
        </div>

        {/* Totales y Acciones (Footer fijado abajo) */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-8 w-full md:w-auto">
            <div className="flex items-center text-slate-500 text-sm font-semibold">
              <Calculator className="w-4 h-4 mr-2" />
              TOTALES
            </div>
            <div className="text-right">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Total Debe</span>
              <span className={`text-lg font-bold font-mono ${!isCuadrada && totalDebe > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                ${totalDebe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Total Haber</span>
              <span className={`text-lg font-bold font-mono ${!isCuadrada && totalHaber > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                ${totalHaber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            {!isCuadrada && (totalDebe > 0 || totalHaber > 0) && (
              <div className="text-right px-4 py-1.5 bg-rose-100 rounded-lg">
                <span className="block text-[10px] uppercase font-bold text-rose-500">Diferencia</span>
                <span className="text-sm font-bold font-mono text-rose-700">
                  ${diferencia.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            
            {isCuadrada && (
              <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-emerald-200">
                Partida Cuadrada
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            <button 
              onClick={() => navigate('/dashboard/partidas')}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            {rol !== 'auditor' && (
              <button 
                onClick={handleGuardar}
                disabled={!isCuadrada || guardando}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all shadow-lg ${
                  isCuadrada && !guardando
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30' 
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{guardando ? 'Guardando...' : (id ? 'Actualizar Partida' : 'Guardar Partida')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PartidaEditor;
