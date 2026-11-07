import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Ship,
  Waves,
  LifeBuoy,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Share2,
  Phone,
  ChevronRight,
  WifiOff,
  Clock,
  ExternalLink,
  Download,
  Anchor,
  Info
} from 'lucide-react';
import './RiverPwaApp.css';

/* ============================================================
   CONFIGURACIÓN
   ============================================================ */
const CACHE_KEY = 'rio-albaposse:last-data';
const MAX_LEVEL = 12;          // Tope visual del medidor (metros)
const FERRY_LIMIT = 8;         // Cota a partir de la cual la balsa posiblemente se suspende
const WARNING_LEVEL = 7.6;     // Zona de precaución previa a la cota
const AUTO_REFRESH_MS = 10 * 60 * 1000;
const PREFECTURA_URL = 'https://contenidosweb.prefecturanaval.gob.ar/alturas/?page=historico&tiempo=7&id=532';

/* ============================================================
   HELPERS
   ============================================================ */
const parsePrefecturaHtml = (html) => {
  const current = html.match(/ltimo registro: <\/b>([0-9.]+) Mts el (.*?) - ([0-9]+)/);
  const previous = html.match(/Registro anterior: <\/b>([0-9.]+) Mts el (.*?) - ([0-9]+)/);
  if (!current || !previous) return null;
  return {
    current: { height: current[1], date: current[2], time: current[3] },
    previous: { height: previous[1], date: previous[2], time: previous[3] }
  };
};

const fetchRiverData = async () => {
  // 1. Proxy (Vite en desarrollo / redirect de Netlify en producción)
  try {
    const res = await fetch('/api/prefectura', {
      headers: { Accept: 'text/html,application/xhtml+xml,application/xml' }
    });
    if (res.ok) {
      const parsed = parsePrefecturaHtml(await res.text());
      if (parsed) return parsed;
    }
  } catch (err) {
    console.warn('Fallo en proxy /api/prefectura:', err);
  }

  // 2. Respaldo: función Netlify
  try {
    const res = await fetch('/.netlify/functions/getRiverData');
    if (res.ok) {
      const json = await res.json();
      if (json?.current && json?.previous) {
        return { current: json.current, previous: json.previous };
      }
    }
  } catch (err) {
    console.warn('Fallo en función Netlify:', err);
  }

  throw new Error('No se pudo obtener la información de Prefectura.');
};

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCache = (payload) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
};

const fmtNum = (n) => (Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '--');
const fmtTime = (t = '') => (t.length >= 4 ? `${t.slice(0, 2)}:${t.slice(2, 4)}` : t);
const fmtDate = (d = '') => d.slice(0, 6);

const fmtRelative = (iso, now) => {
  if (!iso) return '';
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
};

const getTrend = (current, previous) => {
  if (current > previous) return { key: 'up', label: 'Creciendo', Icon: TrendingUp, color: '#f87171' };
  if (current < previous) return { key: 'down', label: 'Bajando', Icon: TrendingDown, color: '#4ade80' };
  return { key: 'flat', label: 'Estacionario', Icon: Minus, color: '#fbbf24' };
};

// Regla: < 8 m habilitada; acercándose a 8 m precaución; ≥ 8 m POSIBLE suspensión (no se asegura).
const getFerryStatus = (h) => {
  if (h >= FERRY_LIMIT) {
    return {
      key: 'stop',
      label: 'Posible suspensión',
      title: 'Posible suspensión',
      short: `El río superó los ${FERRY_LIMIT} m`,
      description: `Con el río por encima de los ${FERRY_LIMIT} metros, el servicio de balsa posiblemente se encuentre suspendido. Confirmá el estado con Prefectura Naval antes de trasladarte.`,
      color: '#f87171',
      Icon: ShieldAlert
    };
  }
  if (h >= WARNING_LEVEL) {
    return {
      key: 'warn',
      label: 'Habilitada · Precaución',
      title: 'Habilitada con precaución',
      short: `El río se acerca a los ${FERRY_LIMIT} m`,
      description: `El nivel se está acercando a los ${FERRY_LIMIT} metros. Si continúa creciendo, el servicio de balsa podría suspenderse. Recomendamos consultar antes de viajar.`,
      color: '#fbbf24',
      Icon: AlertTriangle
    };
  }
  return {
    key: 'ok',
    label: 'Habilitada',
    title: 'Balsa habilitada',
    short: 'Opera con normalidad',
    description: `El río se encuentra por debajo de los ${FERRY_LIMIT} metros. En estas condiciones la balsa Alba Posse – Porto Mauá habitualmente opera con normalidad.`,
    color: '#4ade80',
    Icon: CheckCircle2
  };
};

/* ============================================================
   MEDIDOR CIRCULAR
   ============================================================ */
const RiverGauge = ({ level, color }) => {
  const cx = 120;
  const cy = 120;
  const r = 94;
  const stroke = 15;
  const C = 2 * Math.PI * r;
  const arc = C * 0.75; // arco de 270°
  const pct = Math.min(Math.max(level / MAX_LEVEL, 0), 1);

  const polar = (radius, deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const limitDeg = 135 + 270 * (FERRY_LIMIT / MAX_LEVEL);
  const tickIn = polar(r - stroke / 2 - 5, limitDeg);
  const tickOut = polar(r + stroke / 2 + 5, limitDeg);
  const tickLabel = polar(r + 22, limitDeg);

  return (
    <svg viewBox="0 0 240 226" className="pwa-gauge" aria-hidden="true">
      <defs>
        <linearGradient id="pwaGaugeGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${arc} ${C}`}
        transform={`rotate(135 ${cx} ${cy})`}
      />
      <circle
        className="pwa-gauge__fill"
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="url(#pwaGaugeGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${arc * pct} ${C}`}
        transform={`rotate(135 ${cx} ${cy})`}
      />
      <line
        x1={tickIn.x} y1={tickIn.y} x2={tickOut.x} y2={tickOut.y}
        stroke="#ffffff" strokeWidth="3" strokeLinecap="round"
      />
      <text x={tickLabel.x} y={tickLabel.y + 4} textAnchor="middle" className="pwa-gauge__tick">
        {FERRY_LIMIT} m
      </text>
      <text x="54" y="210" textAnchor="middle" className="pwa-gauge__scale">0</text>
      <text x="186" y="210" textAnchor="middle" className="pwa-gauge__scale">{MAX_LEVEL} m</text>
    </svg>
  );
};

/* ============================================================
   APP (SIN SCROLL — 100dvh)
   ============================================================ */
const RiverPwaApp = () => {
  const cached = readCache();
  const [data, setData] = useState(cached);
  const [fromCache, setFromCache] = useState(Boolean(cached));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['rio', 'balsa', 'info'].includes(hash) ? hash : 'rio';
  });
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [installEvent, setInstallEvent] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchRiverData();
      const payload = { ...fresh, syncedAt: new Date().toISOString() };
      setData(payload);
      setFromCache(false);
      writeCache(payload);
    } catch (err) {
      console.warn(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial + refresco automático
  useEffect(() => {
    loadData();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') loadData();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadData]);

  // Reloj para los textos relativos ("hace X min")
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Instalación PWA (Chrome / Android)
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Reflejar pestaña activa en la URL (/app#balsa)
  useEffect(() => {
    window.history.replaceState(null, '', tab === 'rio' ? window.location.pathname : `#${tab}`);
  }, [tab]);

  const currentHeight = data ? parseFloat(data.current.height) : NaN;
  const previousHeight = data ? parseFloat(data.previous.height) : NaN;
  const diff = currentHeight - previousHeight;
  const margin = currentHeight - FERRY_LIMIT;
  const trend = getTrend(currentHeight, previousHeight);
  const ferry = getFerryStatus(currentHeight);
  const TrendIcon = trend.Icon;
  const FerryIcon = ferry.Icon;
  const markerPct = Math.min(Math.max(currentHeight / MAX_LEVEL, 0), 1) * 100;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;

  const handleShare = async () => {
    if (!data) return;
    const text =
      `🌊 Río Uruguay – Puerto Alba Posse\n` +
      `Nivel: ${fmtNum(currentHeight)} m (${trend.label.toLowerCase()})\n` +
      `Balsa: ${ferry.label}\n` +
      `Registro: ${fmtTime(data.current.time)} hs · ${fmtDate(data.current.date)}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Estado del Río Uruguay', text, url: window.location.href });
      } catch {
        /* compartir cancelado */
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
        showToast('Copiado para compartir');
      } catch {
        showToast('No se pudo copiar');
      }
    }
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const syncLabel = loading
    ? 'Actualizando…'
    : error
      ? `Sin conexión${data ? ` · ${fmtRelative(data.syncedAt, now)}` : ''}`
      : data
        ? `${fromCache ? 'Guardado' : 'Actualizado'} ${fmtRelative(data.syncedAt, now)}`
        : 'Conectando…';

  /* ---------- Vistas (ajustadas al alto disponible sin scroll) ---------- */

  const renderSkeleton = () => (
    <div className="pwa-view">
      <div className="pwa-skel pwa-skel--hero" />
      <div className="pwa-skel pwa-skel--card" />
      <div className="pwa-grid-3">
        <div className="pwa-skel pwa-skel--tile" />
        <div className="pwa-skel pwa-skel--tile" />
        <div className="pwa-skel pwa-skel--tile" />
      </div>
    </div>
  );

  const renderError = () => (
    <div className="pwa-view pwa-view--center">
      <div className="pwa-empty">
        <div className="pwa-empty__icon"><WifiOff size={28} /></div>
        <h2>Sin datos disponibles</h2>
        <p>No pudimos conectar con Prefectura Naval. Revisá tu conexión e intentá nuevamente.</p>
        <button className="pwa-btn pwa-btn--primary" onClick={loadData} disabled={loading}>
          <RefreshCw size={17} className={loading ? 'pwa-spin' : ''} />
          Reintentar
        </button>
      </div>
    </div>
  );

  const renderRio = () => (
    <div className="pwa-view">
      {/* HERO FLEXIBLE: se adapta a cualquier alto de pantalla */}
      <section className="pwa-hero" style={{ '--status': ferry.color }}>
        <div className="pwa-hero__meta">
          <span className="pwa-chip">
            <Clock size={12} />
            {fmtTime(data.current.time)} hs · {fmtDate(data.current.date)}
          </span>
          <span className="pwa-hero__source">Prefectura Naval</span>
        </div>

        <div className="pwa-hero__gauge">
          <RiverGauge level={currentHeight} color={ferry.color} />
          <div className="pwa-hero__reading">
            <span className="pwa-hero__label">Altura actual</span>
            <span className="pwa-hero__value">{fmtNum(currentHeight)}</span>
            <span className="pwa-hero__unit">metros</span>
          </div>
        </div>

        <div className="pwa-hero__bottom">
          <div className="pwa-trend" style={{ '--trend': trend.color }}>
            <TrendIcon size={16} />
            <span>{trend.label}</span>
            <span className="pwa-trend__diff">
              {diff > 0 ? '+' : ''}{fmtNum(diff)} m
            </span>
          </div>
          <p className="pwa-hero__note">Al momento de la actualización</p>
        </div>
      </section>

      {/* RESUMEN BALSA */}
      <button
        className="pwa-card pwa-ferry-summary"
        style={{ '--status': ferry.color }}
        onClick={() => setTab('balsa')}
      >
        <div className="pwa-ferry-summary__icon">
          <Ship size={20} />
        </div>
        <div className="pwa-ferry-summary__text">
          <span className="pwa-overline">Estado de la balsa</span>
          <span className="pwa-ferry-summary__title">
            <span className="pwa-dot" />
            {ferry.label}
          </span>
          <span className="pwa-ferry-summary__sub">{ferry.short}</span>
        </div>
        <ChevronRight size={18} className="pwa-ferry-summary__chev" />
      </button>

      {/* 3 MÉTRICAS COMPACTAS EN UNA SOLA FILA */}
      <div className="pwa-grid-3">
        <div className="pwa-card pwa-tile">
          <span className="pwa-overline">Anterior</span>
          <span className="pwa-tile__value">{fmtNum(previousHeight)}<small> m</small></span>
          <span className="pwa-tile__sub">{fmtTime(data.previous.time)} · {fmtDate(data.previous.date)}</span>
        </div>
        <div className="pwa-card pwa-tile">
          <span className="pwa-overline">Variación</span>
          <span className="pwa-tile__value" style={{ color: trend.color }}>
            {diff > 0 ? '+' : ''}{fmtNum(diff)}<small> m</small>
          </span>
          <span className="pwa-tile__sub">Entre lecturas</span>
        </div>
        <div className="pwa-card pwa-tile">
          <span className="pwa-overline">Cota {FERRY_LIMIT} m</span>
          <span className="pwa-tile__value" style={{ color: ferry.color }}>
            {margin >= 0 ? `+${fmtNum(margin)}` : fmtNum(Math.abs(margin))}<small> m</small>
          </span>
          <span className="pwa-tile__sub">{margin >= 0 ? 'Sobre cota' : 'Bajo cota'}</span>
        </div>
      </div>
    </div>
  );

  const renderBalsa = () => (
    <div className="pwa-view">
      <section className="pwa-card pwa-ferry" style={{ '--status': ferry.color }}>
        <div className="pwa-ferry__icon">
          <FerryIcon size={26} />
        </div>
        <span className="pwa-ferry__badge">{ferry.label}</span>
        <h2 className="pwa-ferry__title">{ferry.title}</h2>
        <p className="pwa-ferry__desc">{ferry.description}</p>
      </section>

      {/* ESCALA DE UMBRALES */}
      <section className="pwa-card pwa-card--compact">
        <div className="pwa-section-head">
          <span className="pwa-overline">Nivel respecto a la cota</span>
          <strong>{fmtNum(currentHeight)} m</strong>
        </div>
        <div className="pwa-scale">
          <div className="pwa-scale__track">
            <div className="pwa-scale__seg pwa-scale__seg--ok" style={{ width: `${(WARNING_LEVEL / MAX_LEVEL) * 100}%` }} />
            <div className="pwa-scale__seg pwa-scale__seg--warn" style={{ width: `${((FERRY_LIMIT - WARNING_LEVEL) / MAX_LEVEL) * 100}%` }} />
            <div className="pwa-scale__seg pwa-scale__seg--stop" style={{ flex: 1 }} />
          </div>
          <div className="pwa-scale__marker" style={{ left: `${markerPct}%` }}>
            <span />
          </div>
          <div className="pwa-scale__labels">
            <span>0 m</span>
            <span style={{ left: `${(FERRY_LIMIT / MAX_LEVEL) * 100}%` }} className="pwa-scale__limit">
              {FERRY_LIMIT} m
            </span>
            <span>{MAX_LEVEL} m</span>
          </div>
        </div>
        <ul className="pwa-legend">
          <li><i style={{ background: '#4ade80' }} />&lt; {fmtNum(WARNING_LEVEL)} m · Habilitada</li>
          <li><i style={{ background: '#fbbf24' }} />{fmtNum(WARNING_LEVEL)}–{FERRY_LIMIT} m · Precaución</li>
          <li><i style={{ background: '#f87171' }} />≥ {FERRY_LIMIT} m · Posible corte</li>
        </ul>
      </section>

      <section className="pwa-card pwa-card--compact pwa-route-block">
        <div className="pwa-route">
          <div className="pwa-route__point">
            <MapPin size={15} />
            <div>
              <strong>Puerto Alba Posse</strong>
              <span>Misiones · AR</span>
            </div>
          </div>
          <div className="pwa-route__line"><Ship size={15} /></div>
          <div className="pwa-route__point">
            <MapPin size={15} />
            <div>
              <strong>Porto Mauá</strong>
              <span>RS · Brasil</span>
            </div>
          </div>
        </div>
        <p className="pwa-disclaimer">
          <Info size={13} />
          <span>Orientativo según altura. Confirmación oficial: Prefectura Naval.</span>
        </p>
      </section>
    </div>
  );

  const renderInfo = () => (
    <div className="pwa-view">
      <section className="pwa-card pwa-card--compact">
        <span className="pwa-overline">Contactos de guardia</span>
        <div className="pwa-contacts">
          <a href="tel:106" className="pwa-contact">
            <div className="pwa-contact__icon pwa-contact__icon--blue"><Anchor size={19} /></div>
            <div className="pwa-contact__text">
              <strong>Prefectura Naval</strong>
              <span>Emergencias náuticas</span>
            </div>
            <span className="pwa-contact__call"><Phone size={15} />106</span>
          </a>
          <a href="tel:103" className="pwa-contact">
            <div className="pwa-contact__icon pwa-contact__icon--orange"><LifeBuoy size={19} /></div>
            <div className="pwa-contact__text">
              <strong>Protección Civil</strong>
              <span>Emergencias y riesgo</span>
            </div>
            <span className="pwa-contact__call"><Phone size={15} />103</span>
          </a>
        </div>
      </section>

      {!isStandalone && (installEvent || isIos) && (
        <section className="pwa-card pwa-card--compact pwa-install">
          <div className="pwa-install__icon"><Download size={20} /></div>
          <div className="pwa-install__text">
            <strong>Instalá la app</strong>
            <span>
              {installEvent
                ? 'Acceso directo en tu inicio.'
                : 'Compartir → "Agregar a inicio".'}
            </span>
          </div>
          {installEvent && (
            <button className="pwa-btn pwa-btn--primary pwa-btn--sm" onClick={handleInstall}>
              Instalar
            </button>
          )}
        </section>
      )}

      <section className="pwa-card pwa-card--compact">
        <span className="pwa-overline">Fuente oficial</span>
        <p className="pwa-text">
          Alturas publicadas por Prefectura Naval Argentina (estación Alba Posse).
          Actualización automática cada 10 minutos.
        </p>
        <a href={PREFECTURA_URL} target="_blank" rel="noopener noreferrer" className="pwa-link">
          Ver publicación de Prefectura <ExternalLink size={14} />
        </a>
      </section>

      <div className="pwa-brand-wrap">
        <div className="pwa-brand">
          <img src="/logo-proteccion-final.png" alt="Protección Civil Alba Posse" />
          <img src="/logo-municipio-final.png" alt="Municipio de Alba Posse" />
        </div>
        <p className="pwa-brand__caption">Junta Municipal de Protección Civil · Alba Posse</p>
      </div>
    </div>
  );

  const renderContent = () => {
    if (!data) return loading || !error ? renderSkeleton() : renderError();
    if (tab === 'balsa') return renderBalsa();
    if (tab === 'info') return renderInfo();
    return renderRio();
  };

  const tabs = [
    { id: 'rio', label: 'Río', Icon: Waves },
    { id: 'balsa', label: 'Balsa', Icon: Ship },
    { id: 'info', label: 'Ayuda', Icon: LifeBuoy }
  ];

  return (
    <div className="pwa-app">
      {/* ── TOP BAR ── */}
      <header className="pwa-topbar">
        <div className="pwa-topbar__brand">
          <img src="/logo-proteccion-final.png" alt="" className="pwa-topbar__logo" />
          <div className="pwa-topbar__titles">
            <span className="pwa-topbar__title">Río Uruguay</span>
            <span className={`pwa-topbar__sub ${error ? 'is-error' : ''}`}>
              <MapPin size={10} /> Alba Posse ·{' '}
              {error ? <WifiOff size={10} /> : <i className={`pwa-sync-dot ${loading ? 'is-loading' : ''}`} />}
              <span>{syncLabel}</span>
            </span>
          </div>
        </div>

        <div className="pwa-topbar__actions">
          {data && (
            <button
              className="pwa-icon-btn"
              onClick={handleShare}
              aria-label="Compartir estado"
              title="Compartir estado"
            >
              <Share2 size={17} />
            </button>
          )}
          <button
            className="pwa-icon-btn"
            onClick={loadData}
            disabled={loading}
            aria-label="Actualizar datos"
            title="Actualizar datos"
          >
            <RefreshCw size={17} className={loading ? 'pwa-spin' : ''} />
          </button>
        </div>
      </header>

      {/* ── CONTENIDO SIN SCROLL ── */}
      <main className="pwa-main" key={tab}>
        {renderContent()}
      </main>

      {/* ── FOOTER + TAB BAR FIJOS ── */}
      <div className="pwa-bottom">
        <footer className="pwa-footer">
          <a
            href="https://www.fullpc.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="pwa-footer__link"
          >
            <span>Powered by</span>
            <img
              src="https://www.fullpc.com.ar/favicom.png"
              alt="FullPC"
              className="pwa-footer__logo"
              onError={(e) => { e.target.src = 'https://www.fullpc.com.ar/favicon.png'; e.target.onerror = null; }}
            />
          </a>
        </footer>

        <nav className="pwa-tabbar" aria-label="Secciones">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`pwa-tab ${tab === id ? 'is-active' : ''}`}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
            >
              <span className="pwa-tab__icon"><Icon size={20} /></span>
              <span className="pwa-tab__label">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {toast && <div className="pwa-toast">{toast}</div>}
    </div>
  );
};

export default RiverPwaApp;
