import { useNavigate } from 'react-router-dom';

/**
 * EmpEmptyState — reusable empty/error state for Employee PWA pages.
 * Shows an SVG illustration, title, subtitle, and optional CTA button.
 */
export default function EmpEmptyState({
  type = 'nodata',        // 'nodata' | 'noemp' | 'error' | 'loading'
  title,
  subtitle,
  cta,
  ctaHref,
  ctaAction,
  icon,
}) {
  const navigate = useNavigate();

  const defaults = {
    noemp: {
      title: 'Data karyawan tidak ditemukan',
      subtitle: 'Akun Anda belum terhubung sebagai karyawan. Hubungi tim HR untuk verifikasi.',
      cta: 'Hubungi HR',
      ctaHref: '/app/announcements',
    },
    nodata: {
      title: 'Belum ada data',
      subtitle: 'Data belum tersedia sementara ini.',
      cta: null,
    },
    error: {
      title: 'Gagal memuat data',
      subtitle: 'Terjadi kesalahan. Coba lagi atau periksa koneksi internet Anda.',
      cta: 'Coba Lagi',
    },
  };

  const cfg = defaults[type] || defaults.nodata;
  const finalTitle = title || cfg.title;
  const finalSubtitle = subtitle || cfg.subtitle;
  const finalCta = cta || cfg.cta;

  const illustrations = {
    noemp: (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" fill="#EFF6FF" />
        <circle cx="60" cy="46" r="18" fill="#BFDBFE" />
        <path d="M28 96c0-17.673 14.327-32 32-32s32 14.327 32 32" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <circle cx="88" cy="36" r="12" fill="#FEE2E2" />
        <path d="M83 36h10M88 31v10" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    nodata: (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" fill="#F0FDF4" />
        <rect x="30" y="35" width="60" height="50" rx="6" fill="#BBF7D0" />
        <rect x="38" y="48" width="22" height="3" rx="1.5" fill="#4ADE80" />
        <rect x="38" y="56" width="44" height="3" rx="1.5" fill="#4ADE80" />
        <rect x="38" y="64" width="36" height="3" rx="1.5" fill="#4ADE80" />
        <rect x="38" y="72" width="28" height="3" rx="1.5" fill="#D1FAE5" />
        <circle cx="80" cy="36" r="12" fill="#FEF9C3" stroke="#FDE047" strokeWidth="1.5"/>
        <path d="M80 30v8" stroke="#EAB308" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="80" cy="41" r="1.5" fill="#EAB308"/>
      </svg>
    ),
    error: (
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" fill="#FFF7ED" />
        <circle cx="60" cy="60" r="30" fill="#FED7AA" />
        <path d="M60 44v20" stroke="#EA580C" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="60" cy="71" r="2.5" fill="#EA580C"/>
      </svg>
    ),
  };

  const illustration = icon || illustrations[type] || illustrations.nodata;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      animation: 'fadeInUp 0.35s ease',
    }}>
      <div style={{ marginBottom: 20 }}>{illustration}</div>
      <div style={{
        fontSize: 17,
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: 8,
        lineHeight: 1.4,
        maxWidth: 280,
      }}>
        {finalTitle}
      </div>
      <div style={{
        fontSize: 13,
        color: 'var(--muted)',
        lineHeight: 1.6,
        maxWidth: 260,
        marginBottom: finalCta ? 24 : 0,
      }}>
        {finalSubtitle}
      </div>
      {finalCta && (
        <button
          onClick={() => {
            if (ctaAction) { ctaAction(); return; }
            if (ctaHref || cfg.ctaHref) navigate(ctaHref || cfg.ctaHref);
          }}
          style={{
            padding: '12px 28px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(0,71,171,0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          {finalCta}
        </button>
      )}
    </div>
  );
}
