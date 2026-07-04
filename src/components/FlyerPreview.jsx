import React from 'react';
import { Calendar, Anchor, Info, TrendingUp, TrendingDown, Minus, MapPin } from 'lucide-react';
import './FlyerPreview.css'; // Estilos específicos para el flyer

const FlyerPreview = ({ data, ferryOperational }) => {
  // Datos por defecto para mostrar algo si no hay datos aún
  const defaultData = {
    current: { height: '0.00', date: 'DD/MM/YY', time: '0000' },
    previous: { height: '0.00', date: 'DD/MM/YY', time: '0000' }
  };

  const safeData = data || defaultData;
  const currentHeight = parseFloat(safeData.current.height);
  const previousHeight = parseFloat(safeData.previous.height);

  // Determinar tendencia
  let trend = 'ESTACIONARIO';
  let TrendIcon = Minus;
  let trendColor = '#f5b041'; // Amarillo/naranja para estacionario

  if (currentHeight > previousHeight) {
    trend = 'CRECIENDO';
    TrendIcon = TrendingUp;
    trendColor = '#e74c3c'; // Rojo para creciendo (peligro)
  } else if (currentHeight < previousHeight) {
    trend = 'BAJANDO';
    TrendIcon = TrendingDown;
    trendColor = '#2ecc71'; // Verde para bajando
  }

  // Formatear fechas (viene como DD/MMM/YY, ej 04/JUL/26)
  const formatDateTime = (dateStr, timeStr) => {
    // timeStr viene como "0600", lo pasamos a "06 HS"
    const hours = timeStr.substring(0, 2);
    // Extraemos hasta la 6ta posición para incluir 3 letras del mes (ej: 04/JUL)
    return `DÍA ${dateStr.substring(0, 6)} - ${hours} HS`;
  };

  return (
    <div className="flyer-wrapper" id="flyer-capture">
      {/* FALLBACK WARNING BANNER */}
      {safeData.isFallbackData && (
        <div className="fallback-banner">
          ⚠️ ATENCIÓN: NO FUE POSIBLE CONECTAR CON PREFECTURA. DATOS DE PRUEBA.
        </div>
      )}

      {/* HEADER */}
        <header className="flyer-header">
          <div className="header-content">
            <div className="logo-container left-logo">
              <img src="/logo-proteccion-final.png" alt="Protección Civil Alba Posse" className="header-logo logo-left" />
            </div>
            <div className="header-titles">
              <h2>ESTADO ACTUAL DEL</h2>
              <h1>RÍO URUGUAY</h1>
              
              <div className="location-badge">
                <MapPin size={16} color="#ffffff" fill="#e63946" style={{marginRight: '6px', flexShrink: 0}} />
                <span>PUERTO ALBA POSSE</span>
              </div>
            </div>
            <div className="logo-container right-logo">
              <img src="/logo-municipio-final.png" alt="Municipio Alba Posse" className="header-logo logo-right" />
            </div>
          </div>
          
          {/* Top Wave Divider */}
          <div className="wave-divider-top">
            <svg viewBox="0 0 500 50" preserveAspectRatio="none" className="divider-svg">
              <path d="M0,0 C150,60 300,10 500,50 L500,0 L0,0 Z" fill="#0077b6" />
              <path d="M0,0 C150,30 350,60 500,10 L500,0 L0,0 Z" fill="#001a36" />
            </svg>
          </div>
        </header>

        {/* CENTRAL IMAGE */}
        <div className="flyer-image-container">
          <div className="image-background"></div>
        </div>
        
        {/* DATA SECTION WITH BOTTOM WAVE */}
        <div className="flyer-data-section">
          {/* Bottom Wave Divider */}
          <div className="wave-divider-bottom">
            <svg viewBox="0 0 500 40" preserveAspectRatio="none" className="divider-svg">
              <path d="M0,40 C200,0 350,60 500,10 L500,40 L0,40 Z" fill="#001a36" />
            </svg>
          </div>
          
          <div className="data-cards-container">
          
          {/* LECTURA ANTERIOR */}
          <div className="data-card previous-card">
            <div className="card-header">
              <div className="calendar-icon">
                <Calendar size={28} />
              </div>
              <div className="header-text">
                <span className="subtitle">ÚLTIMA LECTURA PUBLICADA</span>
                <span className="date-text">{formatDateTime(safeData.previous.date, safeData.previous.time)}</span>
              </div>
            </div>
            <div className="height-value">
              <span className="number">{safeData.previous.height.replace('.', ',')}</span>
              <span className="unit">mts.</span>
            </div>
            {/* Como la lectura anterior no sabemos su tendencia, podemos no mostrarla o mostrarla neutra */}
            <div className="trend-status neutral">
              <span>REGISTRO ANTERIOR</span>
            </div>
          </div>

          {/* LECTURA ACTUAL */}
          <div className="data-card current-card">
            <div className="card-header">
              <div className="calendar-icon">
                <Calendar size={28} />
              </div>
              <div className="header-text">
                <span className="subtitle">ACTUALIZACIÓN</span>
                <span className="date-text">{formatDateTime(safeData.current.date, safeData.current.time)}</span>
              </div>
            </div>
            <div className="height-value">
              <span className="number" style={{color: '#f5b041'}}>{safeData.current.height.replace('.', ',')}</span>
              <span className="unit">mts.</span>
            </div>
            <div className="trend-status active" style={{color: trendColor}}>
              <span>{trend}</span>
              <TrendIcon size={24} />
            </div>
          </div>

        </div>

        {/* FERRY STATUS */}
        {!ferryOperational && (
          <div className="ferry-status-alert">
            <div className="alert-icon-container">
              <svg viewBox="0 0 100 100" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
                {/* Olas */}
                <path d="M 20 62 Q 27.5 55 35 62 T 50 62 T 65 62 T 80 62" fill="none" stroke="white" strokeWidth="3" />
                <path d="M 20 72 Q 27.5 65 35 72 T 50 72 T 65 72 T 80 72" fill="none" stroke="white" strokeWidth="3" />
                {/* Bote */}
                <path d="M 25 52 L 35 38 L 65 38 L 75 52 Z" fill="white" />
                <rect x="47" y="28" width="6" height="10" fill="white" />
                <line x1="50" y1="20" x2="50" y2="28" stroke="white" strokeWidth="2" />
                {/* Circulo de prohibido */}
                <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="8" />
                <line x1="20" y1="20" x2="80" y2="80" stroke="white" strokeWidth="8" />
              </svg>
            </div>
            <div className="alert-text">
              <span className="alert-subtitle">AÚN SE MANTIENE</span>
              <span className="alert-title">SIN OPERATIVIDAD</span>
              <span className="alert-subtitle">EL SERVICIO DE BALSAS</span>
            </div>
          </div>
        )}
        
        {ferryOperational && (
          <div className="ferry-status-alert operational">
            <div className="alert-text">
              <span className="alert-subtitle">SERVICIO DE BALSAS</span>
              <span className="alert-title" style={{color: 'white'}}>OPERATIVO</span>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="flyer-footer">
        <div className="footer-info">
          <Info size={32} color="#4ea8de" />
          <div className="info-text">
            <span>INFORMACIÓN OFICIAL</span>
            <span>Prefectura Naval Argentina</span>
            <span>Alba Posse y Junta Municipal</span>
            <span>de Protección Civil Alba Posse</span>
          </div>
        </div>
        <div className="footer-logo">
          <Anchor size={32} color="#4ea8de" />
          <div className="info-text right-align">
            <span>PREFECTURA</span>
            <span>NAVAL ARGENTINA</span>
            <span>ALBA POSSE</span>
          </div>
        </div>
      </footer>

      {/* TIMESTAMP FINAL */}
      <div className="timestamp-final">
        Actualización {safeData.current.time} hs. Día {safeData.current.date}/26
      </div>
    </div>
  );
};

export default FlyerPreview;
