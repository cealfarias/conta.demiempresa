import re

with open('c:\\conta.demiempresa\\contabilidad_web\\src\\components\\SoporteModal.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace imports
content = content.replace("import { api } from '../services/api';", "import axios from 'axios';\nconst API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';")
content = content.replace('import { api } from "../services/api";', "import axios from 'axios';\nconst API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';")

# Replace getTicketsSoporte()
content = content.replace("await api.getTicketsSoporte()", "(await axios.get(`${API_URL}/api/v1/soporte/tickets`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })).data")

# Replace crearTicketSoporte(nuevoForm)
content = content.replace("await api.crearTicketSoporte(nuevoForm)", "(await axios.post(`${API_URL}/api/v1/soporte/tickets`, nuevoForm, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })).data")

# Replace enviarMensajeTicket(selectedTicket.id, nuevoMensaje)
content = re.sub(r"await api\.enviarMensajeTicket\(([^,]+),\s*([^)]+)\)", r"(await axios.post(`${API_URL}/api/v1/soporte/tickets/${\1}/mensajes`, { contenido: \2 }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })).data", content)

# Replace cambiarEstadoTicket(selectedTicket.id, nuevoEstado)
content = re.sub(r"await api\.cambiarEstadoTicket\(([^,]+),\s*([^)]+)\)", r"(await axios.put(`${API_URL}/api/v1/soporte/tickets/${\1}/estado?nuevo_estado=${\2}`, null, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })).data", content)

with open('c:\\conta.demiempresa\\contabilidad_web\\src\\components\\SoporteModal.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SoporteModal.jsx patched to use axios.")
