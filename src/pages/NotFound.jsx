import { Link, useLocation } from 'react-router-dom';

export default function NotFound() {
  const location = useLocation();
  const isPWA = location.pathname.startsWith('/app');

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg, #F8F9FC)', padding: 24, fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ textAlign: 'center', maxWidth: 440, animation: 'fadeInUp 0.5s ease' }}>
        {/* Animated 404 illustration */}
        <div style={{
          width: 120, height: 120, borderRadius: 32, margin: '0 auto 28px',
          background: 'linear-gradient(135deg, rgba(0,71,171,0.08), rgba(0,71,171,0.03))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 32,
            border: '2px solid rgba(0,71,171,0.1)',
          }} />
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>

        <div style={{
          fontSize: 64, fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #0047AB, #3B82F6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 12,
        }}>
          404
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text, #1A1D21)', marginBottom: 10 }}>
          Halaman Tidak Ditemukan
        </h1>

        <p style={{
          fontSize: 14, color: 'var(--text-secondary, #6B7280)',
          lineHeight: 1.7, marginBottom: 32, maxWidth: 360, margin: '0 auto 32px',
        }}>
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan. Silakan kembali ke halaman utama.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to={isPWA ? '/app/home' : '/dashboard'}
            style={{
              padding: '12px 28px', borderRadius: 12,
              background: 'linear-gradient(135deg, #0047AB, #0052CC)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(0,71,171,0.25)',
              transition: 'all 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Kembali ke {isPWA ? 'Home' : 'Dashboard'}
          </Link>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 28px', borderRadius: 12,
              background: 'var(--surface, #fff)',
              color: 'var(--text, #1A1D21)', fontSize: 14, fontWeight: 600,
              border: '1.5px solid var(--border, #EAECF0)',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Halaman Sebelumnya
          </button>
        </div>

        <div style={{
          marginTop: 48, fontSize: 12, color: 'var(--text-tertiary, #9CA3AF)',
        }}>
          <span style={{ opacity: 0.6 }}>URL: {location.pathname}</span>
        </div>
      </div>
    </div>
  );
}
