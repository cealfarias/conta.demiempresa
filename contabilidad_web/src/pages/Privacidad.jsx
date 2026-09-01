import React from 'react';
import { Shield, Lock, Eye, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Privacidad() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-emerald-600 px-8 py-10 text-white text-center">
            <h1 className="text-3xl font-bold mb-4">Política de Privacidad</h1>
            <p className="text-emerald-100">
              Última actualización: 1 de Septiembre de 2026
            </p>
          </div>
          <div className="px-8 py-10 space-y-8 text-slate-700 leading-relaxed">
            
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-emerald-500" />
                1. Introducción
              </h2>
              <p>
                Bienvenido al Sistema Contable SaaS (en adelante, "la Plataforma"). La privacidad y seguridad de su información contable y personal son nuestra máxima prioridad. Esta Política de Privacidad describe cómo recopilamos, utilizamos y protegemos sus datos cuando utiliza nuestros servicios y, específicamente, cuando se autentica utilizando servicios de terceros como Google OAuth.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Eye className="w-6 h-6 text-emerald-500" />
                2. Información que Recopilamos
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Datos de Autenticación (Google OAuth):</strong> Si decide iniciar sesión mediante Google, recopilamos únicamente su nombre público, dirección de correo electrónico e imagen de perfil. No tenemos acceso a sus contraseñas de Google ni a sus correos electrónicos privados.</li>
                <li><strong>Datos Contables:</strong> Recopilamos la información financiera y estructurada que usted ingresa voluntariamente en su espacio de trabajo (catálogos, partidas, clientes, proveedores).</li>
                <li><strong>Datos Técnicos:</strong> Registramos la dirección IP de las terminales que acceden a la plataforma por motivos de seguridad (ej. para bloqueos preventivos y auditorías).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-emerald-500" />
                3. Uso de la Información
              </h2>
              <p className="mb-2">La información recopilada se utiliza exclusivamente para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Crear y gestionar su entorno contable aislado (Multi-tenant).</li>
                <li>Validar su identidad mediante Google OAuth para otorgarle un acceso seguro y rápido sin necesidad de contraseñas adicionales.</li>
                <li>Notificarle sobre mantenimientos, actualizaciones o cierres contables en su espacio de trabajo.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6 text-emerald-500" />
                4. Protección y Aislamiento de Datos
              </h2>
              <p>
                Implementamos estándares rigurosos de cifrado y aislamiento arquitectónico. Su información financiera y tokens de acceso están encriptados y separados lógicamente de otras empresas. <strong>No vendemos, alquilamos ni compartimos</strong> su información personal, correo electrónico o datos contables con terceros para fines publicitarios ni de ninguna otra índole.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Derechos del Usuario (ARCO)</h2>
              <p>
                Usted mantiene el control total sobre su información. En cualquier momento puede solicitar la exportación (JSON/Excel), rectificación o eliminación completa de sus datos y de su cuenta conectada a Google desde el panel de Configuración, o enviando un ticket al equipo de Soporte Técnico.
              </p>
            </section>

            <div className="pt-8 border-t border-slate-200 text-center">
              <button 
                onClick={() => navigate(-1)}
                className="bg-slate-100 text-slate-700 px-6 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Volver atrás
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
