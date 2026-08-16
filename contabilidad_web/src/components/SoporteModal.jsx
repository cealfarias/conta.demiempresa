import React, { useState, useEffect } from 'react';
import { 
  X, MessageSquare, Plus, Send, Headphones, Clock, CheckCircle2, 
  AlertCircle, ShieldCheck, User, Building, CornerDownRight, RefreshCw,
  Crown, CreditCard, Filter, PhoneCall, ExternalLink, Sparkles, Inbox, Check
} from 'lucide-react';
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
import { jwtDecode } from 'jwt-decode';

export default function SoporteModal({ isOpen, onClose }) {

  let user = null;
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      user = { username: decoded.sub || 'user' }; // Asumiendo que sub es el username
    }
  } catch(e) {}

  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'nuevo'
  const [filtroEstado, setFiltroEstado] = useState('TODOS'); // 'TODOS' | 'ABIERTO' | 'PAGOS' | 'RESUELTO'
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  const isOwner = user?.email?.toLowerCase() === 'cealfarias@gmail.com' ||
                  user?.username?.toLowerCase() === 'cealfarias' ||
                  user?.username?.toLowerCase() === 'cesararias' ||
                  user?.username?.toLowerCase() === 'propietario';
  
  // Form para nuevo ticket (solo visible para clientes)
  const [nuevoForm, setNuevoForm] = useState({
    asunto: '',
    categoria: 'Soporte Técnico',
    prioridad: 'Media',
    mensaje_inicial: ''
  });

  // Mensaje en chat activo
  const [nuevoMensaje, setNuevoMensaje] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarTickets();
      if (isOwner) {
        setActiveTab('inbox');
      }
    }
  }, [isOpen, isOwner]);

  const cargarTickets = async () => {
    try {
      setLoading(true);
      const data = (await axios.get(`${API_URL}/api/v1/soporte/tickets`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })).data;
      setTickets(data || []);
      if (data && data.length > 0 && !selectedTicket) {
        setSelectedTicket(data[0]);
      } else if (data && selectedTicket) {
        const actualizado = data.find(t => t.id === selectedTicket.id);
        if (actualizado) setSelectedTicket(actualizado);
      }
    } catch (err) {
      console.error("Error cargando tickets de soporte:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearTicket = async (e) => {
    e.preventDefault();
    if (!nuevoForm.asunto.trim() || !nuevoForm.mensaje_inicial.trim()) return;

    try {
      setLoading(true);
      const creado = (await axios.post(`${API_URL}/api/v1/soporte/tickets`, nuevoForm, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })).data;
      setNuevoForm({ asunto: '', categoria: 'Soporte Técnico', prioridad: 'Media', mensaje_inicial: '' });
      await cargarTickets();
      setSelectedTicket(creado);
      setActiveTab('inbox');
    } catch (err) {
      alert("Error al enviar mensaje a soporte: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !selectedTicket) return;

    try {
      setSendingMsg(true);
      (await axios.post(`${API_URL}/api/v1/soporte/tickets/${selectedTicket.id}/mensajes`, { contenido: nuevoMensaje }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })).data;
      setNuevoMensaje('');
      await cargarTickets();
    } catch (err) {
      alert("Error enviando mensaje: " + err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCambiarEstado = async (nuevoEstado) => {
    if (!selectedTicket) return;
    try {
      (await axios.put(`${API_URL}/api/v1/soporte/tickets/${selectedTicket.id}/estado?nuevo_estado=${nuevoEstado}`, null, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })).data;
      await cargarTickets();
    } catch (err) {
      alert("Error al actualizar estado: " + err.message);
    }
  };

  const handleAprobarPagoLicencia = async () => {
    if (!selectedTicket) return;
    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/v1/soporte/tickets/${selectedTicket.id}/mensajes`, { contenido: "✅ ¡COMPROBANTE VERIFICADO Y LICENCIA PRO ENTERPRISE ACTIVADA!\n\nEstimado cliente, hemos verificado exitosamente tu transferencia por Transfer365 Davivienda (69893101 - Cesar Arias). Tu cuenta cuenta ahora con la Licencia Pro Enterprise sin anuncios. ¡Gracias por tu preferencia!" }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      (await axios.put(`${API_URL}/api/v1/soporte/tickets/${selectedTicket.id}/estado?nuevo_estado=${'RESUELTO'}`, null, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })).data;
      
      localStorage.setItem('licencia_tipo', 'premium');
      window.dispatchEvent(new Event('licencia_change'));

      await cargarTickets();
      alert("✨ Comprobante verificado. Se notificó al cliente y se activó la Licencia Pro Enterprise.");
    } catch (err) {
      alert("Error al aprobar pago: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const ticketsFiltrados = tickets.filter(t => {
    if (filtroEstado === 'ABIERTO') return t.estado === 'ABIERTO';
    if (filtroEstado === 'PAGOS') return t.asunto.includes('COMPROBANTE') || t.categoria === 'Facturación / Licencia';
    if (filtroEstado === 'RESUELTO') return t.estado === 'RESUELTO';
    return true;
  });

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'RESUELTO':
        return <span style={{ background: '#DCFCE7', color: '#15803D', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><CheckCircle2 size={12} /> Resuelto</span>;
      case 'EN_PROCESO':
        return <span style={{ background: '#FEF3C7', color: '#B45309', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Clock size={12} /> En Proceso</span>;
      default:
        return <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><AlertCircle size={12} /> Abierto</span>;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '1040px',
        width: '100%',
        height: '88vh',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        
        {/* Header Modal */}
        <div style={{
          padding: '1rem 1.5rem',
          backgroundColor: isOwner ? '#0F172A' : '#1E293B',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ backgroundColor: isOwner ? '#D97706' : '#2563EB', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
              {isOwner ? <Crown size={22} color="white" /> : <Headphones size={22} color="white" />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold' }}>
                  {isOwner ? '👑 Panel de Control Central del Propietario (cealfarias@gmail.com)' : 'Centro de Mensajería & Soporte Técnico'}
                </h3>
                <span style={{ fontSize: '0.7rem', backgroundColor: isOwner ? '#FEF3C7' : '#DBEAFE', color: isOwner ? '#78350F' : '#1E40AF', fontWeight: 'bold', padding: '0.15rem 0.55rem', borderRadius: '999px' }}>
                  {isOwner ? 'SUPER SUPER USUARIO' : 'VISTA CLIENTE'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>
                {isOwner 
                  ? 'Bandeja de entrada unificada de solicitudes de clientes y validación de comprobantes Transfer365 Davivienda (69893101).' 
                  : 'Envía y recibe mensajes directos con el propietario del sistema y el equipo de soporte técnico.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={cargarTickets}
              style={{ background: 'transparent', border: '1px solid #475569', color: '#CBD5E1', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 'bold' }}
              title="Refrescar mensajes de clientes"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refrescar
            </button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Tab Navigation & Content Container */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Sidebar Left Navigation / Ticket List */}
          <div style={{ width: '340px', borderRight: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px solid #E2E8F0' }}>
              
              {/* Para el Propietario, NO SE MUESTRA EL BOTÓN "+ Nuevo Ticket" */}
              {isOwner ? (
                <div style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#0F172A',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <Inbox size={16} color="#F59E0B" /> Inbox de Clientes ({ticketsFiltrados.length})
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setActiveTab('inbox')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeTab === 'inbox' ? '#2563EB' : '#E2E8F0',
                      color: activeTab === 'inbox' ? 'white' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <MessageSquare size={14} /> Inbox ({ticketsFiltrados.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('nuevo')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeTab === 'nuevo' ? '#16A34A' : '#E2E8F0',
                      color: activeTab === 'nuevo' ? 'white' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Plus size={14} /> Nuevo Ticket
                  </button>
                </div>
              )}

              {/* Filtros Rápidos en el Inbox */}
              <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                <button
                  onClick={() => setFiltroEstado('TODOS')}
                  style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: filtroEstado === 'TODOS' ? '#0F172A' : 'white', color: filtroEstado === 'TODOS' ? 'white' : '#475569', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroEstado('PAGOS')}
                  style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #F59E0B', backgroundColor: filtroEstado === 'PAGOS' ? '#F59E0B' : '#FEF3C7', color: filtroEstado === 'PAGOS' ? 'white' : '#78350F', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  💳 Pagos Transfer365
                </button>
                <button
                  onClick={() => setFiltroEstado('ABIERTO')}
                  style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #3B82F6', backgroundColor: filtroEstado === 'ABIERTO' ? '#2563EB' : '#EFF6FF', color: filtroEstado === 'ABIERTO' ? 'white' : '#1E40AF', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Pendientes
                </button>
                <button
                  onClick={() => setFiltroEstado('RESUELTO')}
                  style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #16A34A', backgroundColor: filtroEstado === 'RESUELTO' ? '#16A34A' : '#DCFCE7', color: filtroEstado === 'RESUELTO' ? 'white' : '#15803D', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Resueltos
                </button>
              </div>
            </div>

            {/* List of Tickets */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {ticketsFiltrados.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                  No hay mensajes de clientes en esta categoría.
                </div>
              ) : (
                ticketsFiltrados.map(ticket => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  const esPago = ticket.asunto.includes('COMPROBANTE') || ticket.categoria === 'Facturación / Licencia';
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setActiveTab('inbox');
                      }}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        marginBottom: '0.4rem',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? (esPago ? '#FEF3C7' : '#EFF6FF') : 'white',
                        border: isSelected ? (esPago ? '2px solid #F59E0B' : '2px solid #3B82F6') : '1px solid #E2E8F0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.65rem', color: esPago ? '#D97706' : '#64748B', fontWeight: 'bold' }}>
                          {esPago ? '💳 COMPROBANTE PAGO' : `#${ticket.id} • ${ticket.categoria}`}
                        </span>
                        {getEstadoBadge(ticket.estado)}
                      </div>
                      <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#1E293B', fontWeight: 'bold' }}>
                        {ticket.asunto}
                      </h5>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#334155' }}>🏢 {ticket.nombre_empresa}</span>
                        <span>{new Date(ticket.fecha_actualizacion).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Main Chat / Detail View Right */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
            
            {!isOwner && activeTab === 'nuevo' ? (
              <form onSubmit={handleCrearTicket} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                <h4 style={{ margin: 0, color: '#1E293B', fontSize: '1.1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                  ✉️ Enviar Nuevo Mensaje al Propietario / Soporte Técnico
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#475569' }}>
                      Categoría de Consulta *
                    </label>
                    <select
                      value={nuevoForm.categoria}
                      onChange={(e) => setNuevoForm({ ...nuevoForm, categoria: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    >
                      <option value="Soporte Técnico">Soporte Técnico / Error en el sistema</option>
                      <option value="Consultoría Laboral">Consultoría Laboral El Salvador</option>
                      <option value="Facturación / Licencia">Facturación & Comprobantes Transfer365</option>
                      <option value="Sugerencia">Sugerencia de nueva funcionalidad</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#475569' }}>
                      Nivel de Prioridad
                    </label>
                    <select
                      value={nuevoForm.prioridad}
                      onChange={(e) => setNuevoForm({ ...nuevoForm, prioridad: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    >
                      <option value="Baja">Baja (Consulta general)</option>
                      <option value="Media">Media (Atención normal)</option>
                      <option value="Alta">Alta (Dificultad de operación)</option>
                      <option value="Urgente">Urgente (Bloqueo crítico)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#475569' }}>
                    Asunto del Mensaje *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Consulta sobre cálculo de aguinaldos o confirmación de pago Transfer365"
                    value={nuevoForm.asunto}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, asunto: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#475569' }}>
                    Mensaje Detallado *
                  </label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Describe en detalle tu inquietud, consulta o referencia de pago..."
                    value={nuevoForm.mensaje_inicial}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, mensaje_inicial: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', resize: 'vertical' }}
                  ></textarea>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inbox')}
                    style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: 'white', color: '#475569', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', backgroundColor: '#16A34A', color: 'white', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Send size={15} /> Enviar Ticket a Soporte
                  </button>
                </div>
              </form>
            ) : selectedTicket ? (
              <>
                {/* Header Ticket Activo */}
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#0F172A', fontWeight: 'bold' }}>
                        {selectedTicket.asunto}
                      </h4>
                      {getEstadoBadge(selectedTicket.estado)}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Empresa Cliente: <strong style={{ color: '#0F172A' }}>{selectedTicket.nombre_empresa}</strong> | Usuario: <strong>{selectedTicket.nombre_usuario}</strong> | Prioridad: <strong>{selectedTicket.prioridad}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {isOwner && (selectedTicket.asunto.includes('COMPROBANTE') || selectedTicket.categoria === 'Facturación / Licencia') && selectedTicket.estado !== 'RESUELTO' && (
                      <button
                        onClick={handleAprobarPagoLicencia}
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', backgroundColor: '#16A34A', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)' }}
                      >
                        <CheckCircle2 size={14} /> Aprobar Transfer365 & Activar Premium
                      </button>
                    )}

                    {selectedTicket.estado !== 'RESUELTO' && (
                      <button
                        onClick={() => handleCambiarEstado('RESUELTO')}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Marcar como Resuelto
                      </button>
                    )}
                  </div>
                </div>

                {/* Body Messages Chat */}
                <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#F1F5F9' }}>
                  {selectedTicket.mensajes?.map(msg => {
                    const esStaff = msg.es_propietario;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: esStaff ? 'flex-start' : 'flex-end',
                          maxWidth: '78%',
                          backgroundColor: esStaff ? '#0F172A' : '#2563EB',
                          color: 'white',
                          borderRadius: esStaff ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                          padding: '0.85rem 1.1rem',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', gap: '1.5rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: esStaff ? '#F59E0B' : '#93C5FD', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {esStaff ? <Crown size={13} color="#F59E0B" /> : <User size={13} />}
                            {esStaff ? 'PROPIETARIO / SOPORTE TÉCNICO' : `${msg.nombre_remitente} (${selectedTicket.nombre_empresa})`}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>
                            {new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                          {msg.contenido}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Send Input Chat */}
                <form onSubmit={handleEnviarMensaje} style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #E2E8F0', backgroundColor: 'white', display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    required
                    placeholder={isOwner ? "Escribe la respuesta oficial al cliente como Propietario..." : "Escribe una respuesta para el ticket de soporte..."}
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg}
                    style={{ padding: '0.65rem 1.25rem', backgroundColor: isOwner ? '#D97706' : '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Send size={15} /> {isOwner ? 'Responder al Cliente' : 'Enviar Mensaje'}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', padding: '2rem' }}>
                <Crown size={54} style={{ color: '#F59E0B', opacity: 0.4, marginBottom: '0.75rem' }} />
                <h4 style={{ margin: '0 0 0.4rem 0', color: '#0F172A' }}>Bandeja Central del Propietario</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', maxWidth: '420px', textAlign: 'center' }}>
                  Selecciona una consulta o comprobante Transfer365 de la lista izquierda para revisar y responder a tus clientes.
                </p>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
