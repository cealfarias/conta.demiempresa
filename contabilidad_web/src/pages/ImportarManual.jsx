import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Upload, Link, CheckCircle, AlertTriangle, FileUp, Book } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CAMPOS_SISTEMA = [
  { id: 'cuenta_codigo', label: 'Código Cuenta' },
  { id: 'descripcion_rubro', label: 'Descripción Concepto' },
  { id: 'se_carga_por', label: 'Se Carga Por' },
  { id: 'se_abona_por', label: 'Se Abona Por' },
  { id: 'significado_saldo', label: 'Significado Saldo' }
];

export default function ImportarManual() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState(''); // Store the entire CSV content
  const [csvColumns, setCsvColumns] = useState([]);
  const [step, setStep] = useState(1); // 1: Carga, 2: Mapeo, 3: Resultados
  
  // Mapping state
  const [mapping, setMapping] = useState({}); // { sys_id: 'colName' }
  const [activeSource, setActiveSource] = useState(null); 
  
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
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      setFileContent(content);
      const firstLine = content.split('\n')[0].replace(/\r/g, '');
      let cols = firstLine.split(';');
      if (cols.length < 2 && firstLine.includes(',')) {
        cols = firstLine.split(',');
      }
      setCsvColumns(cols.map(c => c.trim()).filter(c => c));
      setStep(2);
      setMapping({});
      setActiveSource(null);
    };
    reader.readAsText(selectedFile, "UTF-8");
  };

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
    setActiveSource(id);
    if (mapping[id]) {
      const newMap = { ...mapping };
      delete newMap[id];
      setMapping(newMap);
    }
  };

  const handleCsvBoxClick = (colName) => {
    if (activeSource) {
      setMapping(prev => ({
        ...prev,
        [activeSource]: colName
      }));
      setActiveSource(null);
    }
  };

  const isMappingComplete = CAMPOS_SISTEMA.every(campo => mapping[campo.id]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    const token = localStorage.getItem('token');
    const empresaId = localStorage.getItem('empresa_activa');
    const anio = parseInt(localStorage.getItem('anio_activo') || '0', 10);

    if (!empresaId || !anio) {
      setError('Debes seleccionar una empresa y un año en el panel principal.');
      setLoading(false);
      return;
    }

    try {
      // Manual client-side CSV parsing
      const lines = fileContent.split('\n');
      const headerLine = lines[0].replace(/\r/g, '');
      const separador = (headerLine.split(';').length < 2 && headerLine.includes(',')) ? ',' : ';';
      const fileHeaders = headerLine.split(separador).map(c => c.trim());

      const idxCodigo = fileHeaders.indexOf(mapping['cuenta_codigo']);
      const idxDesc = fileHeaders.indexOf(mapping['descripcion_rubro']);
      const idxCarga = fileHeaders.indexOf(mapping['se_carga_por']);
      const idxAbona = fileHeaders.indexOf(mapping['se_abona_por']);
      const idxSaldo = fileHeaders.indexOf(mapping['significado_saldo']);

      const lineasPayload = [];
      
      // Parse starting from row 1 (skipping header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].replace(/\r/g, '');
        if (!line.trim()) continue;
        
        const columnas = line.split(separador);
        
        const codigo = columnas[idxCodigo] ? columnas[idxCodigo].trim() : "";
        if (!codigo) continue; // Skip if no code

        lineasPayload.push({
          cuenta_codigo: codigo,
          descripcion_rubro: columnas[idxDesc] ? columnas[idxDesc].trim() : "",
          se_carga_por: columnas[idxCarga] ? columnas[idxCarga].trim() : "",
          se_abona_por: columnas[idxAbona] ? columnas[idxAbona].trim() : "",
          significado_saldo: columnas[idxSaldo] ? columnas[idxSaldo].trim() : ""
        });
      }

      if (lineasPayload.length === 0) {
         setError('No se encontraron líneas válidas para importar en el CSV.');
         setLoading(false);
         return;
      }

      const payload = {
        lineas: lineasPayload,
        terminal_ip: "127.0.0.1",
        usuario_creacion: "sistema",
        empresa_id: empresaId,
        anio: anio
      };

      const res = await axios.post(`${API_URL}/api/v1/manual/importar-masivo`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setResults(res.data);
      setStep(3);
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
    <div className="p-4 md:p-8 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Book className="w-8 h-8 text-sky-600" />
            Asistente de Importación: Manual Contable
          </h1>
          <p className="text-slate-500 mt-1">Carga las explicaciones y dinámicas (cargos/abonos) de tus cuentas contables.</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/catalogo')}
          className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Catálogo
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-100 flex items-start animate-in fade-in">
          <AlertTriangle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Upload className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Sube el archivo de tu Manual Contable</h2>
          <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">
            El archivo debe estar en formato CSV y contener las columnas explicativas de las cuentas (Código, Descripción, Cargos, Abonos, Saldo).
          </p>
          
          <div className="relative">
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <button className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-8 py-3 rounded-xl transition-all shadow-md flex items-center justify-center mx-auto gap-2">
              <FileUp className="w-5 h-5" />
              Seleccionar Archivo CSV
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SVG MAPPING */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-sky-50 border-b border-sky-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-sky-900 flex items-center gap-2">
                <Link className="w-5 h-5" /> Mapeo Visual Inteligente
              </h2>
              <p className="text-sky-700 text-sm mt-1">
                Haz clic en cada caja del sistema (arriba) y conéctala con la columna correspondiente de tu archivo (abajo).
              </p>
            </div>
            <button 
              onClick={() => setStep(1)}
              className="text-sm text-sky-600 hover:text-sky-800 font-medium bg-white px-4 py-2 rounded-lg shadow-sm border border-sky-200"
            >
              Cambiar Archivo
            </button>
          </div>

          <div 
            className="p-8 relative min-h-[400px] bg-slate-50"
            ref={containerRef}
            onMouseMove={handleMouseMove}
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
                  <polygon points="0 0, 10 3.5, 0 7" fill="#0284c7" />
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
                  stroke="#0284c7" strokeWidth="4" strokeDasharray="6,6"
                  markerEnd="url(#arrowhead-blue)"
                />
              )}
            </svg>

            {/* SYSTEM ROW */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-24 relative z-20">
              {CAMPOS_SISTEMA.map(campo => {
                const isMapped = !!mapping[campo.id];
                const isActive = activeSource === campo.id;
                
                let boxStyles = "bg-white border-2 border-slate-300 text-slate-700 shadow-sm";
                if (isActive) boxStyles = "bg-sky-50 border-2 border-sky-500 text-sky-700 shadow-lg shadow-sky-500/30 scale-105";
                else if (isMapped) boxStyles = "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 shadow-md";

                return (
                  <div 
                    key={campo.id}
                    ref={el => boxElementsRef.current[`sys-${campo.id}`] = el}
                    onClick={(e) => { e.stopPropagation(); handleSystemBoxClick(campo.id); }}
                    className={`field-box px-4 py-3 md:px-6 md:py-4 rounded-xl text-xs md:text-sm font-bold cursor-pointer transition-all select-none ${boxStyles}`}
                  >
                    {campo.label}
                  </div>
                );
              })}
            </div>

            {/* CSV ROW */}
            <div className="flex flex-wrap justify-center gap-4 relative z-20">
              {csvColumns.map(col => {
                const isMappedTo = Object.keys(mapping).find(k => mapping[k] === col);
                let boxStyles = "bg-white border border-slate-200 text-slate-600 shadow-sm hover:border-sky-400 hover:shadow-md";
                if (isMappedTo) boxStyles = "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-medium shadow-md";

                return (
                  <div 
                    key={col}
                    ref={el => boxElementsRef.current[`csv-${col}`] = el}
                    onClick={(e) => { e.stopPropagation(); handleCsvBoxClick(col); }}
                    className={`field-box px-4 py-2 md:px-5 md:py-3 rounded-lg text-xs md:text-sm cursor-pointer transition-all select-none ${boxStyles}`}
                  >
                    {col}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!isMappingComplete || loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? 'Procesando archivo...' : (
                <><CheckCircle className="w-5 h-5 mr-2" /> Procesar Importación Masiva</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RESULTS */}
      {step === 3 && results && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center animate-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Importación Finalizada</h2>
          <p className="text-slate-600 mb-8 max-w-md mx-auto font-medium">
            {results.mensaje || 'Los registros del manual se han importado correctamente.'}
          </p>

          <button
            onClick={() => navigate('/dashboard/catalogo')}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all"
          >
            Ir al Catálogo de Cuentas
          </button>
        </div>
      )}
    </div>
  );
}
