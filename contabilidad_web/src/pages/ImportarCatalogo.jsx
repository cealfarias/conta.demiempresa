import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Upload, Link, CheckCircle, AlertTriangle, FileUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAssistant } from '../contexts/AssistantContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ImportarCatalogo() {
  const navigate = useNavigate();
  const { reportProgress } = useAssistant();
  const [file, setFile] = useState(null);
  const [csvColumns, setCsvColumns] = useState([]);
  const [step, setStep] = useState(1); // 1: Carga, 2: Mapeo, 3: Resultados
  
  // Mapping state
  const [mapping, setMapping] = useState({}); // { codigo: 'colName', nombre: 'colName' }
  const [activeSource, setActiveSource] = useState(null); // 'codigo' or 'nombre'
  
  // SVG Lines state
  const containerRef = useRef(null);
  const boxElementsRef = useRef({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Results state
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  // Handle File Upload
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    // Leer primera lnea para sacar encabezados
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      const firstLine = content.split('\n')[0].replace(/\r/g, '');
      let cols = firstLine.split(';');
      if (cols.length < 2) {
        cols = firstLine.split(',');
      }
      setCsvColumns(cols.map(c => c.trim()).filter(c => c));
      setStep(2);
      setMapping({});
      setActiveSource(null);
      reportProgress('FILE_SELECTED');
    };
    reader.readAsText(selectedFile);
  };

  // Tracking element positions for SVG lines
  const getBoxCenter = (id) => {
    const el = boxElementsRef.current[id];
    if (el && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2
      };
    }
    return null;
  };

  const handleMouseMove = (e) => {
    if (activeSource && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top
      });
    }
  };

  const handleSystemBoxClick = (id) => {
    // Start drawing line
    setActiveSource(id);
    // Remove existing mapping for this source if any
    if (mapping[id]) {
      const newMap = { ...mapping };
      delete newMap[id];
      setMapping(newMap);
    }
  };

  const handleCsvBoxClick = (colName) => {
    if (activeSource) {
      // Create mapping
      setMapping(prev => {
        const nextMap = {
          ...prev,
          [activeSource]: colName
        };
        // Report mapping progress
        if (Object.keys(nextMap).length === 1 && nextMap['codigo']) {
           setTimeout(() => reportProgress('FIRST_MAPPED'), 0);
        }
        return nextMap;
      });
      setActiveSource(null);
    }
  };

  const isMappingComplete = mapping['codigo'] && mapping['nombre'];

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('mapeo', JSON.stringify(mapping));
    
    const token = localStorage.getItem('token');
    const empresaId = localStorage.getItem('empresa_activa');
    const anio = localStorage.getItem('anio_activo');

    if (!empresaId || !anio) {
      setError('Debes seleccionar una empresa y un ao en el panel principal.');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/v1/catalogo/importar?empresa_id=${empresaId}&anio=${anio}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
          // No enviar Content-Type manual para que axios ponga el boundary multipart
        }
      });
      
      setResults(res.data);
      setStep(3);
      if (res.data.errores && res.data.errores.length > 0) {
        reportProgress('IMPORT_ERROR');
      } else {
        reportProgress('IMPORT_SUCCESS');
      }
    } catch (err) {
      let errText = err.response?.data?.detail || 'Error al procesar el archivo.';
      if (typeof errText === 'object') {
        errText = JSON.stringify(errText);
      }
      setError(errText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Asistente de Importacin</h1>
          <p className="text-slate-500 mt-1">Carga tu catlogo de cuentas de forma inteligente conectando las columnas.</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/catalogo')}
          className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Catlogo
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-100 flex items-start">
          <AlertTriangle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Upload className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Sube tu archivo Excel / CSV</h2>
          <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">
            El archivo debe estar en formato CSV y contener al menos las columnas para el cdigo y nombre de la cuenta.
          </p>
          
          <div className="relative">
            <input 
              id="input-file-import"
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <button className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-8 py-3 rounded-xl transition-all shadow-md flex items-center justify-center mx-auto gap-2">
              <FileUp className="w-5 h-5" />
              Seleccionar Archivo
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SVG MAPPING */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-blue-50 border-b border-blue-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                <Link className="w-5 h-5" /> Mapeo Visual Inteligente
              </h2>
              <p className="text-blue-700 text-sm mt-1">
                Haz clic en la caja de arriba y luego arrastra la lnea hacia la columna correspondiente del archivo.
              </p>
            </div>
            <button 
              onClick={() => setStep(1)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Cambiar Archivo
            </button>
          </div>

          <div 
            className="p-8 relative min-h-[400px] bg-slate-50"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            // If click outside, cancel drawing
            onClick={(e) => {
              if (e.target.tagName !== 'DIV' || !e.target.classList.contains('field-box')) {
                setActiveSource(null);
              }
            }}
          >
            {/* SVG CANVAS */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <defs>
                <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                </marker>
                <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
                </marker>
              </defs>
              
              {/* Draw established mappings */}
              {Object.entries(mapping).map(([sysId, csvCol]) => {
                const start = getBoxCenter(`sys-${sysId}`);
                const end = getBoxCenter(`csv-${csvCol}`);
                if (!start || !end) return null;
                return (
                  <line 
                    key={`${sysId}-${csvCol}`}
                    x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                    stroke="#10b981" strokeWidth="4" 
                    markerEnd="url(#arrowhead-green)"
                  />
                );
              })}

              {/* Draw active line */}
              {activeSource && getBoxCenter(`sys-${activeSource}`) && (
                <line 
                  x1={getBoxCenter(`sys-${activeSource}`).x} 
                  y1={getBoxCenter(`sys-${activeSource}`).y} 
                  x2={mousePos.x} 
                  y2={mousePos.y}
                  stroke="#3b82f6" strokeWidth="4" strokeDasharray="6,6"
                  markerEnd="url(#arrowhead-blue)"
                />
              )}
            </svg>

            {/* SYSTEM ROW */}
            <div className="flex justify-center gap-12 mb-20 relative z-20">
              {['codigo', 'nombre'].map(sysId => {
                const isMapped = !!mapping[sysId];
                const isActive = activeSource === sysId;
                
                let boxStyles = "bg-white border-2 border-slate-300 text-slate-700 shadow-sm";
                if (isActive) boxStyles = "bg-blue-50 border-2 border-blue-500 text-blue-700 shadow-lg shadow-blue-500/20 scale-105";
                else if (isMapped) boxStyles = "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 shadow-md";

                return (
                  <div 
                    key={sysId}
                    id={sysId === 'codigo' ? 'select-codigo-cuenta' : `select-${sysId}-cuenta`}
                    ref={el => boxElementsRef.current[`sys-${sysId}`] = el}
                    onClick={(e) => { e.stopPropagation(); handleSystemBoxClick(sysId); }}
                    className={`field-box px-6 py-4 rounded-xl font-bold cursor-pointer transition-all select-none ${boxStyles}`}
                  >
                    {sysId === 'codigo' ? 'Cdigo de Cuenta (Sistema)' : 'Nombre de Cuenta (Sistema)'}
                  </div>
                );
              })}
            </div>

            {/* ARROWS DOWN INDICATOR */}
            <div className="flex justify-center mb-20 text-slate-300">
              <ArrowLeft className="w-8 h-8 -rotate-90 animate-bounce" />
            </div>

            {/* CSV ROW */}
            <div className="flex flex-wrap justify-center gap-6 relative z-20">
              {csvColumns.map(col => {
                const isMappedTo = Object.keys(mapping).find(k => mapping[k] === col);
                let boxStyles = "bg-white border border-slate-200 text-slate-600 shadow-sm hover:border-blue-400 hover:shadow-md";
                if (isMappedTo) boxStyles = "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-medium shadow-md";

                return (
                  <div 
                    key={col}
                    ref={el => boxElementsRef.current[`csv-${col}`] = el}
                    onClick={(e) => { e.stopPropagation(); handleCsvBoxClick(col); }}
                    className={`field-box px-4 py-3 rounded-lg cursor-pointer transition-all select-none ${boxStyles}`}
                  >
                    {col}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-end">
            <button
              id="btn-importar-action"
              onClick={handleSubmit}
              disabled={!isMappingComplete || loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? 'Procesando archivo...' : (
                <><CheckCircle className="w-5 h-5 mr-2" /> Validar e Importar Datos</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RESULTS */}
      {step === 3 && results && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-emerald-700 flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <CheckCircle className="w-5 h-5" />
              Cuentas Importadas / Autogeneradas ({results.importadas?.length || 0})
            </h2>
            
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">Cdigo</th>
                    <th className="px-4 py-3 font-medium">Nombre de Cuenta</th>
                    <th className="px-4 py-3 font-medium text-center">Nivel</th>
                    <th className="px-4 py-3 font-medium rounded-tr-lg">Padre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.importadas?.map((cta, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{cta.codigo}</td>
                      <td className="px-4 py-3 text-slate-800">{cta.nombre}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{cta.nivel}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{cta.cuenta_padre || '-'}</td>
                    </tr>
                  ))}
                  {(!results.importadas || results.importadas.length === 0) && (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                        Ninguna cuenta fue importada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-rose-700 flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <AlertTriangle className="w-5 h-5" />
              Registros Rechazados ({results.no_importadas?.length || 0})
            </h2>
            
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg w-20">Fila CSV</th>
                    <th className="px-4 py-3 font-medium w-32">Cdigo</th>
                    <th className="px-4 py-3 font-medium rounded-tr-lg">Motivo del Rechazo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.no_importadas?.map((err, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-center text-slate-500">{err.fila}</td>
                      <td className="px-4 py-3 font-mono font-bold text-rose-600">{err.codigo || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-700">{err.motivo}</td>
                    </tr>
                  ))}
                  {(!results.no_importadas || results.no_importadas.length === 0) && (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-emerald-600 font-medium">
                        Todas las filas fueron procesadas sin errores.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
