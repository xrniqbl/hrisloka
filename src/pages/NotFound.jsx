import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/admin.css';

export default function NotFound() {
  const location = useLocation();
  const { user } = useAuth();
  const isPWA = location.pathname.startsWith('/app');
  // Logged-out users have no guards to bounce through — send them to a
  // useful public entry instead of a dead-end guarded route.
  const homeHref = isPWA ? (user ? '/app/home' : '/app/welcome') : (user ? '/dashboard' : '/');
  const homeLabel = isPWA ? (user ? 'Home' : 'Masuk PWA') : (user ? 'Dashboard' : 'Beranda');

  return (
    <div className="ep-loading-wrap">
      <div className="ep-empty-wrap notfound-inner">
        <div className="notfound-icon">
          <div className="notfound-icon-border" />
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#635BFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>

        <div className="notfound-code">404</div>

        <h1 className="ep-empty-title">Halaman Tidak Ditemukan</h1>

        <p className="ep-empty-desc">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan. Silakan kembali ke halaman utama.
        </p>

        <div className="btn-icon-row notfound-btns">
          <Link to={homeHref} className="btn-primary" style={{ textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Kembali ke {homeLabel}
          </Link>
          <button onClick={() => window.history.back()} className="btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Halaman Sebelumnya
          </button>
        </div>

        <div className="notfound-url td-muted-sm">
          URL: {location.pathname}
        </div>
      </div>
    </div>
  );
}
