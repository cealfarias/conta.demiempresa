import React from 'react';
import { ArrowLeft, ShieldCheck, Scale, Database, Server, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Terminos() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8 gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Términos de Referencia y Condiciones</h1>
            <p className="text-slate-500 mt-1">Última actualización: 15 de Agosto de 2026</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 md:p-12 space-y-8 text-slate-700 leading-relaxed">
            
            <section>
              <p className="text-lg">
                Bienvenido al <strong>Sistema Contable SaaS</strong> (en adelante, "la Plataforma"). 
                Al registrar su empresa y utilizar nuestros servicios, usted acepta estar sujeto a los siguientes 
                Términos de Referencia y Condiciones de Servicio. Si no está de acuerdo con alguna parte de estos 
                términos, no podrá acceder a la Plataforma.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Server className="w-6 h-6 text-indigo-500" />
                1. Naturaleza del Servicio
              </h3>
              <p>
                La Plataforma es un software alojado en la nube (SaaS - Software as a Service) diseñado para proveer a 
                las empresas herramientas automatizadas de gestión contable, generación de partidas, control de catálogos, 
                manejo de saldos mensuales, estados financieros y emisión de reportes. La Plataforma actúa exclusivamente 
                como una herramienta informática para facilitar sus procesos contables y de auditoría.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Scale className="w-6 h-6 text-indigo-500" />
                2. Cumplimiento Legal y Normativo
              </h3>
              <p>La Plataforma ha sido desarrollada alineada a las mejores prácticas y estándares financieros, incluyendo:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li><strong>Normas Internacionales de Información Financiera (NIIF):</strong> Estructuras de catálogo y reportes diseñados para facilitar la presentación razonable y el cumplimiento de las NIIF (o NIIF para PYMES).</li>
                <li><strong>Legislación Tributaria:</strong> Herramientas para la correcta clasificación de ingresos, costos y gastos, facilitando la auditoría fiscal ante el Ministerio de Hacienda (según aplique a la jurisdicción).</li>
                <li><strong>Trazabilidad:</strong> Cumplimiento con los principios de auditoría para garantizar el rastro inalterable de las partidas y transacciones generadas.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Star className="w-6 h-6 text-indigo-500" />
                3. Licenciamiento y Modelos de Uso
              </h3>
              <p>La Plataforma se ofrece bajo diferentes modalidades de licencia, las cuales pueden variar según el plan elegido:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li><strong>Versión Gratuita (Freeware con Publicidad):</strong> El uso de la plataforma puede ser gratuito sujeto a la visualización de anuncios publicitarios de terceros y límites en la cantidad de transacciones.</li>
                <li><strong>Período de Prueba (Trial):</strong> Podrá disponer de un período de prueba gratuito de 14 días con todas las funciones Premium habilitadas. Transcurrido este tiempo, deberá adquirir una suscripción o su cuenta pasará a la versión gratuita con restricciones.</li>
                <li><strong>Versiones Pro/Premium:</strong> Libres de publicidad, con características adicionales (como exportación masiva a Excel) descritas en la página de precios.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <ShieldCheck className="w-6 h-6 text-indigo-500" />
                4. Responsabilidad de la Información (Integridad de Datos)
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Exactitud de los Datos:</strong> El usuario administrador o contador de la empresa es el único responsable de la veracidad, exactitud y actualización de los datos contables ingresados en el sistema (montos, catálogos, partidas).</li>
                <li><strong>Criterio Profesional:</strong> Aunque la Plataforma automatiza resúmenes y balances, es responsabilidad del profesional contable de la empresa verificar y firmar los estados financieros. La Plataforma no sustituye el criterio contable de su empresa.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Database className="w-6 h-6 text-indigo-500" />
                5. Privacidad y Confidencialidad de los Datos
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Aislamiento de Datos (Multi-Tenant):</strong> Garantizamos que la información financiera de su empresa está estrictamente aislada y es inaccesible para otras empresas que utilicen la Plataforma.</li>
                <li><strong>Propiedad de los Datos:</strong> Usted retiene todos los derechos y la propiedad intelectual sobre la información financiera ingresada. La Plataforma únicamente actúa como custodio de sus datos.</li>
                <li><strong>Autenticación en 2 Pasos (2FA):</strong> Recomendamos encarecidamente la activación del 2FA disponible en el ecosistema para garantizar la seguridad de su cuenta.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4">6. Propiedad Intelectual y Restricciones</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Nos reservamos todos los derechos de propiedad intelectual sobre el código fuente, la arquitectura, el diseño visual y las bases de datos de la Plataforma.</li>
                <li>El uso de herramientas automatizadas (Web Scraping) para extraer datos o cualquier intento de vulneración de seguridad (hacking) está terminantemente prohibido.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Database className="w-6 h-6 text-indigo-500" />
                7. Módulo de Copias de Seguridad (Backups) y Recuperación (Recovery)
              </h3>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
                <p className="text-amber-800 font-semibold text-sm mb-2">⚠ CLÁUSULA IMPORTANTE - Léase detenidamente</p>
                <p className="text-amber-700 text-sm">
                  El contenido de esta sección establece sus derechos fundamentales sobre su información, así como las condiciones comerciales y técnicas aplicables a los procesos de respaldo y restauración de datos.
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-3">
                <li>
                  <strong>Módulo de Backups (Gratuitos):</strong> Todo usuario, sin importar el tipo de licencia que posea (Freeware o Premium), es propietario absoluto de su propia información financiera. Como garantía de este principio, el usuario tiene derecho ilimitado a realizar respaldos automatizados o manuales de su espacio de trabajo de forma completamente gratuita. Estas copias de seguridad se proporcionan en formato de texto plano estructurado (JSON). Para garantizar la autenticidad de la información, cada archivo generado incluye una firma criptográfica única del sistema.
                </li>
                <li>
                  <strong>Condiciones del Servicio de Recovery (Restauración):</strong> La restauración de un archivo de copia de seguridad (Recovery) es considerada una especialidad profesional técnica de alta sensibilidad, por lo que está sujeta a las siguientes condiciones:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li><strong>Cuentas Freeware (Gratuitas):</strong> La ejecución de cada evento de restauración (Recovery) conlleva un cargo administrativo y técnico de $5.00 USD.</li>
                    <li><strong>Licencias Premium:</strong> Los suscriptores de licencias Premium tienen derecho a un (1) evento de restauración gratuito por mes calendario. Las restauraciones adicionales dentro del mismo mes estarán sujetas a los cargos estándar estipulados para este procedimiento.</li>
                  </ul>
                </li>
                <li>
                  <strong>Integridad y Seguridad del Sistema:</strong> Todo archivo que el usuario desee importar al sistema mediante el módulo de Recovery <strong>debe contener obligatoriamente la firma digital del sistema</strong> intacta. Si la firma del archivo manipulado no concuerda de manera exacta con el algoritmo y las claves de seguridad de la plataforma, el proceso de restauración será denegado inmediatamente.
                </li>
                <li>
                  <strong>Restricción de Formatos:</strong> En aras de proteger y garantizar la integridad absoluta de la base de datos y la arquitectura del sistema, no se permite la importación o inyección de información proveniente de otros tipos de datos, sistemas externos o archivos JSON que no hayan sido generados y firmados orgánicamente por nuestra plataforma.
                </li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4">8. Aceptación de los Términos</h3>
              <p>
                Al marcar la casilla <em>"He leído y acepto los Términos de Referencia"</em> durante el proceso de registro, 
                el usuario declara haber leído, comprendido y aceptado la totalidad de las cláusulas aquí expuestas, 
                incluyendo de manera especial la sección relativa a <strong>Copias de Seguridad y Respaldo de Datos</strong>. 
                El desconocimiento de estos términos no exime al usuario de su cumplimiento.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
