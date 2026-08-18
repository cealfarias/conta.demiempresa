import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, Trash2, ShieldCheck, Mail, Save, X, AlertTriangle, CheckCircle2, Phone, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function TabUsuarios({ empresaId }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [nuevoUser, setNuevoUser] = useState({
    username: '',
    email: '',
    password: '',
    telefono: '',
    rol: 'Contador'
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (empresaId) {
      fetchUsuarios();
    }
  }, [empresaId]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/v1/usuarios/?empresa_id=${empresaId}`);
      setUsuarios(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching usuarios:', err);
      setError('Error al cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!nuevoUser.username || !nuevoUser.email || !nuevoUser.password) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const usuarioLogueado = localStorage.getItem('username') || 'admin';
      
      const payload = {
        ...nuevoUser,
        empresa_id: empresaId,
        usuario_creacion: usuarioLogueado,
        terminal_ip: '127.0.0.1'
      };
      
      await axios.post(`${API_URL}/api/v1/usuarios/`, payload);
      setSuccess('Usuario creado exitosamente.');
      setShowModal(false);
      setNuevoUser({ username: '', email: '', password: '', telefono: '', rol: 'Contador' });
      await fetchUsuarios();
    } catch (err) {
      console.error('Error creando usuario:', err);
      if (err.response?.status === 402) {
        setShowModal(false);
        setShowUpgradeModal(true);
      } else {
        setError(err.response?.data?.detail || 'Error al crear el usuario.');
      }
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario ${username}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${API_URL}/api/v1/usuarios/${id}`);
      setSuccess(`Usuario ${username} eliminado correctamente.`);
      await fetchUsuarios();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al eliminar el usuario.');
      setLoading(false);
    } finally {
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const openWhatsApp = (telefono) => {
    if (!telefono) return;
    const cleanPhone = telefono.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center space-x-3 mb-6 border border-red-100">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{typeof error === 'string' ? error : JSON.stringify(error)}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-center space-x-3 mb-6 border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Directorio de Usuarios</h2>
              <p className="text-sm text-slate-500">Administra los accesos y roles del sistema.</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>

        {loading && usuarios.length === 0 ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No hay usuarios registrados.</td>
                  </tr>
                ) : (
                  usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {u.username}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs">{u.email}</span>
                          </div>
                          {u.telefono && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-xs">{u.telefono}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`py-1 px-3 rounded-full text-xs font-semibold ${
                          u.rol === 'Administrador' ? 'bg-indigo-100 text-indigo-700' :
                          u.rol === 'Auditor' ? 'bg-purple-100 text-purple-700' :
                          u.rol === 'Contador' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.is_active ? (
                          <span className="flex items-center space-x-1 text-emerald-600 font-medium text-xs">
                            <ShieldCheck className="w-4 h-4" />
                            <span>ACTIVO</span>
                          </span>
                        ) : (
                          <span className="text-rose-600 font-medium text-xs">INACTIVO</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {u.telefono && (
                            <button
                              onClick={() => openWhatsApp(u.telefono)}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            disabled={u.rol === 'Administrador' && u.username === 'admin'}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={u.rol === 'Administrador' ? "No se puede eliminar admin" : "Eliminar usuario"}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Creación */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Crear Empleado / Usuario</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-200 hover:text-slate-600 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Usuario</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="ej. jperez"
                    value={nuevoUser.username}
                    onChange={e => setNuevoUser({...nuevoUser, username: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rol en el Sistema</label>
                  <select 
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={nuevoUser.rol}
                    onChange={e => setNuevoUser({...nuevoUser, rol: e.target.value})}
                  >
                    <option value="Administrador">Administrador (Propietario)</option>
                    <option value="Contador">Contador (Cierre/Reportes)</option>
                    <option value="Auxiliar Contable">Auxiliar Contable (Digitador)</option>
                    <option value="Auditor">Auditor (Solo Lectura)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="ej. jperez@empresa.com"
                    value={nuevoUser.email}
                    onChange={e => setNuevoUser({...nuevoUser, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp (Opcional)</label>
                  <input 
                    type="tel" 
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="ej. +503 7000 0000"
                    value={nuevoUser.telefono}
                    onChange={e => setNuevoUser({...nuevoUser, telefono: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña de Acceso</label>
                <input 
                  type="password" 
                  className="w-full border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={nuevoUser.password}
                  onChange={e => setNuevoUser({...nuevoUser, password: e.target.value})}
                  required
                />
              </div>
              
              <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Registrar Empleado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Upgrade (Límite Alcanzado) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in duration-200 text-center p-8">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Límite de Licencia</h3>
            <p className="text-slate-600 mb-6">
              Has alcanzado el límite de <strong>4 usuarios</strong> permitidos en tu licencia actual. 
              Para agregar más colaboradores (por usuario extra o paquetes de 5-10 empleados), debes solicitar una ampliación de licencia.
            </p>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={() => navigate('/dashboard/suscripcion')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Actualizar Licencia
              </button>
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TabUsuarios;
