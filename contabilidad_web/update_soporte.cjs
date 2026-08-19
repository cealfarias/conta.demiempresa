const fs = require('fs');
let code = fs.readFileSync('./src/components/SoporteModal.jsx', 'utf8');

// Add selectedUserGroup state
code = code.replace(
  "const [selectedTicket, setSelectedTicket] = useState(null);",
  "const [selectedTicket, setSelectedTicket] = useState(null);\n  const [selectedUserGroup, setSelectedUserGroup] = useState(null);"
);

// Add useMemo for groupedByUser
const useMemoCode = `
  const groupedByUser = React.useMemo(() => {
    if (!isOwner) return [];
    const groups = {};
    
    const ticketsParaAgrupar = tickets.filter(t => {
      if (filtroEstado === 'ABIERTO') return t.estado === 'ABIERTO';
      if (filtroEstado === 'PAGOS') return t.asunto.includes('COMPROBANTE') || t.categoria === 'Facturación / Licencia';
      if (filtroEstado === 'RESUELTO') return t.estado === 'RESUELTO';
      return true;
    });

    ticketsParaAgrupar.forEach(t => {
      const key = t.nombre_usuario + '_' + t.nombre_empresa;
      if (!groups[key]) {
        groups[key] = {
          key: key,
          nombre_usuario: t.nombre_usuario,
          nombre_empresa: t.nombre_empresa,
          tickets: [],
          ultimo_mensaje_fecha: t.fecha_actualizacion,
          unread_count: 0
        };
      }
      groups[key].tickets.push(t);
      if (new Date(t.fecha_actualizacion) > new Date(groups[key].ultimo_mensaje_fecha)) {
        groups[key].ultimo_mensaje_fecha = t.fecha_actualizacion;
      }
      // Count unread: count of tickets that are ABIERTO
      if (t.estado === 'ABIERTO') {
        groups[key].unread_count += 1;
      }
    });

    return Object.values(groups).sort((a, b) => new Date(b.ultimo_mensaje_fecha) - new Date(a.ultimo_mensaje_fecha));
  }, [tickets, filtroEstado, isOwner]);

  useEffect(() => {
    if (isOwner && groupedByUser.length > 0) {
      if (!selectedUserGroup) {
        setSelectedUserGroup(groupedByUser[0]);
      } else {
        const updated = groupedByUser.find(g => g.key === selectedUserGroup.key);
        if (updated) setSelectedUserGroup(updated);
      }
    } else if (isOwner && groupedByUser.length === 0) {
      setSelectedUserGroup(null);
    }
  }, [groupedByUser, isOwner]); // intentionally ignoring selectedUserGroup in deps to avoid loops
`;

code = code.replace(
  "const handleCrearTicket = async (e) => {",
  useMemoCode + "\n  const handleCrearTicket = async (e) => {"
);

// Replace handleEnviarMensaje
const sendMsgCode = `
  const handleEnviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;
    
    let ticketIdTarget = null;
    if (isOwner) {
      if (!selectedUserGroup) return;
      const lastTicket = selectedUserGroup.tickets.sort((a, b) => b.id - a.id)[0];
      if (!lastTicket) return;
      ticketIdTarget = lastTicket.id;
    } else {
      if (!selectedTicket) return;
      ticketIdTarget = selectedTicket.id;
    }

    try {
      setSendingMsg(true);
      await axios.post(\`\${API_URL}/api/v1/soporte/tickets/\${ticketIdTarget}/mensajes\`, { contenido: nuevoMensaje }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
      setNuevoMensaje('');
      await cargarTickets();
    } catch (err) {
      alert("Error enviando mensaje: " + err.message);
    } finally {
      setSendingMsg(false);
    }
  };
`;
code = code.replace(
  /const handleEnviarMensaje = async \(e\) => \{[\s\S]*?finally \{\s*setSendingMsg\(false\);\s*\}\s*\};/,
  sendMsgCode.trim()
);

// Replace handleCambiarEstado
const changeStateCode = `
  const handleCambiarEstado = async (nuevoEstado) => {
    if (isOwner) {
      if (!selectedUserGroup) return;
      // Close all tickets for this user
      try {
        for (const t of selectedUserGroup.tickets) {
           if (t.estado !== nuevoEstado) {
             await axios.put(\`\${API_URL}/api/v1/soporte/tickets/\${t.id}/estado?nuevo_estado=\${nuevoEstado}\`, null, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
           }
        }
        await cargarTickets();
      } catch (err) {
        alert("Error al actualizar estado: " + err.message);
      }
    } else {
      if (!selectedTicket) return;
      try {
        await axios.put(\`\${API_URL}/api/v1/soporte/tickets/\${selectedTicket.id}/estado?nuevo_estado=\${nuevoEstado}\`, null, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
        await cargarTickets();
      } catch (err) {
        alert("Error al actualizar estado: " + err.message);
      }
    }
  };
`;
code = code.replace(
  /const handleCambiarEstado = async \(nuevoEstado\) => \{[\s\S]*?catch \(err\) \{\s*alert\("Error al actualizar estado: " \+ err.message\);\s*\}\s*\};/,
  changeStateCode.trim()
);

// handleAprobarPagoLicencia
const approvePagoCode = `
  const handleAprobarPagoLicencia = async () => {
    let targetTicket = null;
    if (isOwner && selectedUserGroup) {
       targetTicket = selectedUserGroup.tickets.find(t => t.asunto.includes('COMPROBANTE') || t.categoria === 'Facturación / Licencia');
    } else {
       targetTicket = selectedTicket;
    }
    
    if (!targetTicket) return;
    try {
      setLoading(true);
      await axios.post(\`\${API_URL}/api/v1/soporte/tickets/\${targetTicket.id}/mensajes\`, { contenido: "✅ ¡COMPROBANTE VERIFICADO Y LICENCIA PRO ENTERPRISE ACTIVADA!\\n\\nEstimado cliente, hemos verificado exitosamente tu transferencia por Transfer365 Davivienda (69893101 - Cesar Arias). Tu cuenta cuenta ahora con la Licencia Pro Enterprise sin anuncios. ¡Gracias por tu preferencia!" }, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
      await axios.put(\`\${API_URL}/api/v1/soporte/tickets/\${targetTicket.id}/estado?nuevo_estado=RESUELTO\`, null, { headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` } });
      
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
`;
code = code.replace(
  /const handleAprobarPagoLicencia = async \(\) => \{[\s\S]*?finally \{\s*setLoading\(false\);\s*\}\s*\};/,
  approvePagoCode.trim()
);

// Sidebar rendering
const oldSidebarTickets = `
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
                          {esPago ? '💳 COMPROBANTE PAGO' : \`#\${ticket.id} • \${ticket.categoria}\`}
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
`;

const newSidebarTickets = `
            {/* List of Tickets / Contacts */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {isOwner ? (
                // OWNER VIEW: WHATSAPP STYLE CONTACTS
                groupedByUser.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                    No hay conversaciones en esta categoría.
                  </div>
                ) : (
                  groupedByUser.map(group => {
                    const isSelected = selectedUserGroup?.key === group.key;
                    // Look for the last message
                    const allMsgs = group.tickets.flatMap(t => t.mensajes || []).sort((a,b) => new Date(a.fecha_envio) - new Date(b.fecha_envio));
                    const lastMsg = allMsgs.length > 0 ? allMsgs[allMsgs.length - 1].contenido : 'Sin mensajes';
                    
                    return (
                      <div
                        key={group.key}
                        onClick={() => {
                          setSelectedUserGroup(group);
                          setActiveTab('inbox');
                        }}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          marginBottom: '0.4rem',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#EFF6FF' : 'white',
                          border: isSelected ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}
                      >
                        {/* Avatar */}
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 'bold', flexShrink: 0 }}>
                          {group.nombre_usuario.substring(0,2).toUpperCase()}
                        </div>
                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.1rem' }}>
                            <h5 style={{ margin: 0, fontSize: '0.85rem', color: '#1E293B', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {group.nombre_usuario}
                            </h5>
                            <span style={{ fontSize: '0.65rem', color: '#64748B' }}>
                              {new Date(group.ultimo_mensaje_fecha).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '160px' }}>
                              {lastMsg}
                            </span>
                            {group.unread_count > 0 && (
                              <span style={{ backgroundColor: '#EF4444', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
                                {group.unread_count}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.65rem', color: '#94A3B8', display: 'block', marginTop: '0.2rem' }}>
                            🏢 {group.nombre_empresa}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                // CLIENT VIEW: ORIGINAL TICKETS
                ticketsFiltrados.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                    No hay mensajes en esta categoría.
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
                            {esPago ? '💳 COMPROBANTE PAGO' : \`#\${ticket.id} • \${ticket.categoria}\`}
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
                )
              )}
            </div>
`;
code = code.replace(oldSidebarTickets.trim(), newSidebarTickets.trim());


// Right Chat rendering
const rightPanelRegex = /\{\/\* Header Ticket Activo \*\/\}[\s\S]*?\{\/\* Footer Send Input Chat \*\/\}/;

const rightPanelNew = `
                {/* Header Ticket Activo (Owner o Client) */}
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#0F172A', fontWeight: 'bold' }}>
                        {isOwner ? selectedUserGroup.nombre_usuario : selectedTicket.asunto}
                      </h4>
                      {!isOwner && getEstadoBadge(selectedTicket.estado)}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Empresa: <strong style={{ color: '#0F172A' }}>{isOwner ? selectedUserGroup.nombre_empresa : selectedTicket.nombre_empresa}</strong> 
                      {!isOwner && <span> | Prioridad: <strong>{selectedTicket.prioridad}</strong></span>}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {isOwner && selectedUserGroup.tickets.some(t => (t.asunto.includes('COMPROBANTE') || t.categoria === 'Facturación / Licencia') && t.estado !== 'RESUELTO') && (
                      <button
                        onClick={handleAprobarPagoLicencia}
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', backgroundColor: '#16A34A', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)' }}
                      >
                        <CheckCircle2 size={14} /> Aprobar Transfer365
                      </button>
                    )}

                    {((isOwner && selectedUserGroup.tickets.some(t => t.estado !== 'RESUELTO')) || (!isOwner && selectedTicket.estado !== 'RESUELTO')) && (
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
                  {(() => {
                     let msgs = [];
                     if (isOwner) {
                       msgs = selectedUserGroup.tickets.flatMap(t => t.mensajes || []).sort((a,b) => new Date(a.fecha_envio) - new Date(b.fecha_envio));
                     } else {
                       msgs = selectedTicket.mensajes || [];
                     }
                     return msgs.map(msg => {
                      const esStaff = msg.es_propietario;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: esStaff ? (isOwner ? 'flex-end' : 'flex-start') : (isOwner ? 'flex-start' : 'flex-end'),
                            maxWidth: '78%',
                            backgroundColor: esStaff ? (isOwner ? '#2563EB' : '#0F172A') : (isOwner ? 'white' : '#2563EB'),
                            color: esStaff ? 'white' : (isOwner ? '#1E293B' : 'white'),
                            border: esStaff ? 'none' : (isOwner ? '1px solid #E2E8F0' : 'none'),
                            borderRadius: esStaff ? (isOwner ? '12px 12px 2px 12px' : '12px 12px 12px 2px') : (isOwner ? '12px 12px 12px 2px' : '12px 12px 2px 12px'),
                            padding: '0.85rem 1.1rem',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', gap: '1.5rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: esStaff ? (isOwner ? '#BFDBFE' : '#F59E0B') : (isOwner ? '#3B82F6' : '#93C5FD'), display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              {esStaff ? <Crown size={13} color={isOwner ? "#BFDBFE" : "#F59E0B"} /> : <User size={13} />}
                              {esStaff ? 'TÚ (SOPORTE)' : \`\${msg.nombre_remitente} (\${isOwner ? selectedUserGroup.nombre_empresa : selectedTicket.nombre_empresa})\`}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: esStaff ? 'rgba(255,255,255,0.7)' : (isOwner ? '#94A3B8' : 'rgba(255,255,255,0.7)') }}>
                              {new Date(msg.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {msg.contenido}
                          </p>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Footer Send Input Chat */}
`;

code = code.replace(rightPanelRegex, rightPanelNew.trim() + "\n                {/* Footer Send Input Chat */}");

code = code.replace(
  /\) \: selectedTicket \? \(/g,
  ") : (isOwner ? selectedUserGroup : selectedTicket) ? ("
);

fs.writeFileSync('./src/components/SoporteModal.jsx', code);
