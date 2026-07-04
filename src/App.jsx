import { useState, useEffect } from 'react';
import FlyerPreview from './components/FlyerPreview';
import html2canvas from 'html2canvas';
import { Download, RefreshCw } from 'lucide-react';
import './index.css';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ferryOperational, setFerryOperational] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  
  // Estados para modo manual
  const [manualData, setManualData] = useState({
    currentHeight: '8.50',
    currentDate: '04/JUL/26',
    currentTime: '1200',
    prevHeight: '9.00',
    prevDate: '04/JUL/26',
    prevTime: '0600'
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = 'https://corsproxy.io/?url=https://contenidosweb.prefecturanaval.gob.ar/alturas/?page=historico&tiempo=7&id=532';
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error de conexión.');
      }
      
      const html = await response.text();
      
      const currentMatch = html.match(/ltimo registro: <\/b>([0-9.]+) Mts el (.*?) - ([0-9]+)/);
      const previousMatch = html.match(/Registro anterior: <\/b>([0-9.]+) Mts el (.*?) - ([0-9]+)/);

      if (!currentMatch || !previousMatch) {
        throw new Error('No se pudo leer el formato.');
      }
      
      setData({
        current: {
          height: currentMatch[1],
          date: currentMatch[2],
          time: currentMatch[3]
        },
        previous: {
          height: previousMatch[1],
          date: previousMatch[2],
          time: previousMatch[3]
        },
        fetchedAt: new Date().toISOString(),
        isFallbackData: false
      });
    } catch (err) {
      console.warn(err);
      setError('El servidor de Prefectura bloqueó la conexión automática.');
      setManualMode(true); // Activar modo manual automáticamente si falla
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownload = async () => {
    const flyerElement = document.getElementById('flyer-capture');
    if (!flyerElement) return;

    try {
      const canvas = await html2canvas(flyerElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#002855'
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `estado-rio-uruguay-${new Date().getTime()}.png`;
      link.click();
    } catch (err) {
      console.error('Error al generar imagen:', err);
      alert('Hubo un error al generar la imagen.');
    }
  };

  // Determinar qué datos enviar al flyer
  const flyerData = manualMode ? {
    current: { height: manualData.currentHeight, date: manualData.currentDate, time: manualData.currentTime },
    previous: { height: manualData.prevHeight, date: manualData.prevDate, time: manualData.prevTime },
    fetchedAt: new Date().toISOString(),
    isFallbackData: false
  } : data;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Generador de Flyer - Río Uruguay</h1>
        <p>Alba Posse, Misiones</p>
      </header>

      <main className="app-main">
        <div className="controls-panel">
          
          <div className="control-group">
            <h3>Estado de las Balsas</h3>
            <div className="toggle-container">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={ferryOperational}
                  onChange={(e) => setFerryOperational(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
              <span className="toggle-label">
                {ferryOperational ? 'Operativo (Habilitado)' : 'Sin Operatividad (Suspendido)'}
              </span>
            </div>
          </div>

          <div className="control-group" style={{marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h3 style={{margin: 0}}>Ingreso Manual</h3>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={manualMode}
                  onChange={(e) => setManualMode(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
            
            {manualMode && (
              <div className="manual-inputs" style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '8px'}}>
                  <h4 style={{margin: '0 0 10px 0', color: '#002855'}}>Último Registro (Actual)</h4>
                  <input type="text" placeholder="Altura (ej: 8.50)" value={manualData.currentHeight} onChange={e => setManualData({...manualData, currentHeight: e.target.value})} style={{width: '100%', padding: '8px', marginBottom: '8px'}} />
                  <div style={{display: 'flex', gap: '8px'}}>
                    <input type="text" placeholder="Día/Mes (ej: 04/JUL)" value={manualData.currentDate} onChange={e => setManualData({...manualData, currentDate: e.target.value})} style={{width: '50%', padding: '8px'}} />
                    <input type="text" placeholder="Hora (ej: 1200)" value={manualData.currentTime} onChange={e => setManualData({...manualData, currentTime: e.target.value})} style={{width: '50%', padding: '8px'}} />
                  </div>
                </div>

                <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '8px'}}>
                  <h4 style={{margin: '0 0 10px 0', color: '#002855'}}>Registro Anterior</h4>
                  <input type="text" placeholder="Altura (ej: 9.00)" value={manualData.prevHeight} onChange={e => setManualData({...manualData, prevHeight: e.target.value})} style={{width: '100%', padding: '8px', marginBottom: '8px'}} />
                  <div style={{display: 'flex', gap: '8px'}}>
                    <input type="text" placeholder="Día/Mes (ej: 04/JUL)" value={manualData.prevDate} onChange={e => setManualData({...manualData, prevDate: e.target.value})} style={{width: '50%', padding: '8px'}} />
                    <input type="text" placeholder="Hora (ej: 0600)" value={manualData.prevTime} onChange={e => setManualData({...manualData, prevTime: e.target.value})} style={{width: '50%', padding: '8px'}} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="actions">
            {!manualMode && (
              <button onClick={fetchData} disabled={loading} className="btn btn-secondary">
                <RefreshCw size={18} className={loading ? 'spin' : ''} />
                {loading ? 'Actualizando...' : 'Auto-Actualizar'}
              </button>
            )}
            
            <button onClick={handleDownload} disabled={loading || (!data && !manualMode) || (error && !manualMode)} className="btn btn-primary">
              <Download size={18} />
              Descargar Flyer
            </button>
          </div>

          {error && !manualMode && <div className="error-message">{error}</div>}
        </div>

        <div className="preview-panel">
          <h2>Vista Previa del Flyer</h2>
          <div className="preview-container">
            {loading && !data && !manualMode ? (
              <div className="loading-state">Cargando datos del río...</div>
            ) : (
              <FlyerPreview data={flyerData} ferryOperational={ferryOperational} />
            )}
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="dash-footer">
        <a
          href="https://www.fullpc.com.ar"
          target="_blank"
          rel="noopener noreferrer"
          className="dash-footer__link"
        >
          <span>Powered by</span>
          <img
            src="https://www.fullpc.com.ar/favicom.png"
            alt="FullPC"
            className="dash-footer__logo"
            onError={(e) => { e.target.src = 'https://www.fullpc.com.ar/favicon.png'; e.target.onerror = null; }}
          />
        </a>
      </footer>
    </div>
  );
}

export default App;
