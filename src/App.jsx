import { useState, useEffect } from 'react';
import FlyerPreview from './components/FlyerPreview';
import html2canvas from 'html2canvas';
import { Download, RefreshCw } from 'lucide-react';
import './index.css';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ferryOperational, setFerryOperational] = useState(false); // default to false as in the example

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Usaremos la funcion de netlify en produccion. En dev, puede que necesitemos usar un prefijo si usamos netlify dev.
      // Pero como estamos construyendo esto para netlify, llamaremos directamente a la ruta.
      const response = await fetch('/.netlify/functions/getRiverData');
      
      if (!response.ok) {
        throw new Error('Error al obtener datos reales. Usando datos de prueba.');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.warn(err);
      // Fallback para desarrollo local donde no corre la función Netlify
      setData({
        current: { height: '8.95', date: '04/JUL/26', time: '0800' },
        previous: { height: '9.30', date: '03/JUL/26', time: '1800' },
        fetchedAt: new Date().toISOString(),
        isFallbackData: true
      });
      setError('Aviso: Mostrando datos de prueba porque no se pudo conectar con Prefectura.');
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
      // Ocultar botones o cosas que no queremos en el canvas (si las hubiera dentro del componente)
      const canvas = await html2canvas(flyerElement, {
        scale: 2, // Mejor resolución
        useCORS: true,
        backgroundColor: '#002855' // Color de fondo base por las dudas
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `estado-rio-uruguay-${dateStr}.png`;
      link.click();
    } catch (err) {
      console.error('Error al generar la imagen', err);
      alert('Hubo un error al generar la imagen.');
    }
  };

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
                {ferryOperational ? 'Operativas (Servicio Normal)' : 'Sin Operatividad (Suspendido)'}
              </span>
            </div>
          </div>

          <div className="actions">
            <button onClick={fetchData} disabled={loading} className="btn btn-secondary">
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
              {loading ? 'Actualizando...' : 'Actualizar Datos'}
            </button>
            
            <button onClick={handleDownload} disabled={loading || !data || error} className="btn btn-primary">
              <Download size={18} />
              Descargar Flyer
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          
          <div className="last-sync">
            {data && <p>Última vez leída la info: {new Date(data.fetchedAt).toLocaleString()}</p>}
          </div>
        </div>

        <div className="preview-panel">
          <h2>Vista Previa del Flyer</h2>
          <div className="preview-container">
            {loading && !data ? (
              <div className="loading-state">Cargando datos del río...</div>
            ) : (
              <FlyerPreview data={data} ferryOperational={ferryOperational} />
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
