import { useNavigate } from 'react-router-dom';

/**
 * Clean empty / error CTA for Employee PWA.
 * Uses theme tokens (--primary, --surface, --border) — no raw hex layouts.
 *
 * @param {'nodata'|'noemp'|'error'|'success'} type
 * @param {string} [title]
 * @param {string} [subtitle]
 * @param {string|React.ReactNode} [cta] Primary label
 * @param {string} [ctaHref] Navigate path
 * @param {() => void} [ctaAction] Prefer over href when set
 * @param {string|React.ReactNode} [secondaryCta]
 * @param {string} [secondaryHref]
 * @param {() => void} [secondaryAction]
 * @param {React.ReactNode} [icon] Optional custom icon (replaces illustration)
 */
export default function EmpEmptyState({
  type = 'nodata',
  title,
  subtitle,
  cta,
  ctaHref,
  ctaAction,
  secondaryCta,
  secondaryHref,
  secondaryAction,
  icon,
}) {
  const navigate = useNavigate();

  const defaults = {
    noemp: {
      title: 'Profil belum terhubung',
      subtitle: 'Akun Anda belum terhubung sebagai karyawan. Hubungi HR untuk verifikasi.',
      cta: 'Kembali ke Beranda',
      ctaHref: '/app/home',
    },
    nodata: {
      title: 'Belum ada data',
      subtitle: 'Data belum tersedia. Coba muat ulang atau kembali nanti.',
      cta: null,
    },
    error: {
      title: 'Gagal memuat data',
      subtitle: 'Terjadi kesalahan. Periksa koneksi lalu coba lagi.',
      cta: 'Coba Lagi',
    },
    success: {
      title: 'Semua selesai',
      subtitle: 'Tidak ada item yang menunggu saat ini.',
      cta: 'Muat Ulang',
    },
  };

  const cfg = defaults[type] || defaults.nodata;
  const finalTitle = title || cfg.title;
  const finalSubtitle = subtitle || cfg.subtitle;
  const finalCta = cta !== undefined ? cta : cfg.cta;
  const finalCtaHref = ctaHref || cfg.ctaHref;

  const illustrations = {
    noemp: (
      <svg width="72" height="72" viewBox="0 0 120 120" fill="none" aria-hidden>
        <circle cx="60" cy="60" r="56" fill="color-mix(in srgb, var(--primary, #635BFF) 10%, transparent)" />
        <circle cx="60" cy="46" r="18" fill="color-mix(in srgb, var(--primary, #635BFF) 22%, transparent)" />
        <path d="M28 96c0-17.673 14.327-32 32-32s32 14.327 32 32" stroke="var(--primary, #635BFF)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.45" />
      </svg>
    ),
    nodata: (
      <svg width="72" height="72" viewBox="0 0 120 120" fill="none" aria-hidden>
        <circle cx="60" cy="60" r="56" fill="color-mix(in srgb, var(--primary, #635BFF) 8%, transparent)" />
        <rect x="32" y="38" width="56" height="44" rx="8" fill="color-mix(in srgb, var(--primary, #635BFF) 14%, transparent)" />
        <rect x="40" y="50" width="24" height="3" rx="1.5" fill="var(--primary, #635BFF)" opacity="0.45" />
        <rect x="40" y="58" width="40" height="3" rx="1.5" fill="var(--primary, #635BFF)" opacity="0.3" />
        <rect x="40" y="66" width="32" height="3" rx="1.5" fill="var(--primary, #635BFF)" opacity="0.2" />
      </svg>
    ),
    error: (
      <svg width="72" height="72" viewBox="0 0 120 120" fill="none" aria-hidden>
        <circle cx="60" cy="60" r="56" fill="rgba(220,38,38,0.06)" />
        <circle cx="60" cy="60" r="28" fill="rgba(220,38,38,0.1)" />
        <path d="M60 44v20" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="74" r="2.5" fill="#DC2626" />
      </svg>
    ),
    success: (
      <svg width="72" height="72" viewBox="0 0 120 120" fill="none" aria-hidden>
        <circle cx="60" cy="60" r="56" fill="rgba(22,163,74,0.08)" />
        <circle cx="60" cy="60" r="28" fill="rgba(22,163,74,0.12)" />
        <path d="M44 60l12 12 20-22" stroke="#16A34A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  };

  const illustration = icon || illustrations[type] || illustrations.nodata;

  const runPrimary = () => {
    if (ctaAction) {
      ctaAction();
      return;
    }
    if (finalCtaHref) navigate(finalCtaHref);
  };

  const runSecondary = () => {
    if (secondaryAction) {
      secondaryAction();
      return;
    }
    if (secondaryHref) navigate(secondaryHref);
  };

  return (
    <div className="emp-card emp-empty emp-empty--cta" role="status">
      <div className="emp-empty-icon emp-empty-icon--solid">{illustration}</div>
      <div className="emp-empty-title">{finalTitle}</div>
      {finalSubtitle && <div className="emp-empty-desc">{finalSubtitle}</div>}
      {(finalCta || secondaryCta) && (
        <div className="emp-empty-actions">
          {finalCta && (
            <button type="button" className="btn-primary" onClick={runPrimary}>
              {finalCta}
            </button>
          )}
          {secondaryCta && (
            <button type="button" className="btn-secondary" onClick={runSecondary}>
              {secondaryCta}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
