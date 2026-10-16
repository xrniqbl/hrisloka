import { useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import { Inbox, UserX, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Clean empty / error CTA for Employee PWA.
 * Plain Lucide icon — no circle / border illustration box.
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
      icon: UserX,
    },
    nodata: {
      title: 'Belum ada data',
      subtitle: 'Data belum tersedia. Coba muat ulang atau kembali nanti.',
      cta: null,
      icon: Inbox,
    },
    error: {
      title: 'Gagal memuat data',
      subtitle: 'Terjadi kesalahan. Periksa koneksi lalu coba lagi.',
      cta: 'Coba Lagi',
      icon: AlertCircle,
    },
    success: {
      title: 'Semua selesai',
      subtitle: 'Tidak ada item yang menunggu saat ini.',
      cta: 'Muat Ulang',
      icon: CheckCircle2,
    },
  };

  const cfg = defaults[type] || defaults.nodata;
  const finalTitle = title || cfg.title;
  const finalSubtitle = subtitle || cfg.subtitle;
  const finalCta = cta !== undefined ? cta : cfg.cta;
  const finalCtaHref = ctaHref || cfg.ctaHref;
  const DefaultIcon = cfg.icon || Inbox;

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
      <div className="emp-empty-icon emp-empty-icon--plain" aria-hidden>
        {icon || <Icon icon={DefaultIcon} size="md" color="inherit" />}
      </div>
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
