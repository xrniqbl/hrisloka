import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

// Simple SVG icons (no emoji)
const IconX = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconClock = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconUnlock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>
);
const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

export default function PendingVerificationScreen() {
  const { signOut, employee } = useAuth();
  const navigate = useNavigate();
  const isRejected = employee?.account_status === 'rejected';
  const reason = employee?.rejection_reason;

  const handleLogout = async () => {
    await signOut();
    navigate('/app/login');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg, #f0f4ff)', padding: '32px 20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Background decoration */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: isRejected ? 'radial-gradient(circle,rgba(220,38,38,0.08),transparent)' : 'radial-gradient(circle,rgba(0,71,171,0.08),transparent)', top: -80, right: -60 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: isRejected ? 'radial-gradient(circle,rgba(220,38,38,0.06),transparent)' : 'radial-gradient(circle,rgba(34,197,94,0.08),transparent)', bottom: 60, left: -40 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <picture>
            <source media="(prefers-color-scheme: dark)" srcSet="/landing/hrislokawhitepanjang.png" />
            <img src="/landing/hrislokabluepanjang.png" alt="HRIS Loka" style={{ height: 30, objectFit: 'contain' }} />
          </picture>
        </div>

        {/* Icon */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%', margin: '0 auto 24px',
          background: isRejected
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          boxShadow: isRejected
            ? '0 12px 40px rgba(220,38,38,0.3)'
            : '0 12px 40px rgba(245,158,11,0.3)',
          animation: isRejected ? 'none' : 'pulse 2s ease-in-out infinite',
        }}>
          {isRejected ? <IconX /> : <IconClock />}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
          {isRejected ? 'Pendaftaran Ditolak' : 'Menunggu Verifikasi'}
        </h1>

        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
          {isRejected
            ? 'Maaf, pendaftaran akun Anda tidak disetujui oleh HR perusahaan.'
            : `Hai${employee?.name ? ', ' + employee.name.split(' ')[0] : ''}! Pendaftaran Anda sudah diterima dan sedang menunggu verifikasi dari HR perusahaan Anda.`}
        </p>

        {/* Rejection reason */}
        {isRejected && reason && (
          <div style={{
            padding: '14px 16px', borderRadius: 12, marginBottom: 20,
            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>Alasan Penolakan:</div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{reason}</div>
          </div>
        )}

        {/* Status card */}
        {!isRejected && (
          <div style={{
            background: 'var(--surface, #fff)', borderRadius: 20, padding: '24px 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid var(--border)',
            marginBottom: 24,
          }}>
            {[
              { icon: <IconCheck />, label: 'Pendaftaran diterima', done: true },
              { icon: <IconClock />, label: 'Verifikasi oleh HR', done: false, active: true },
              { icon: <IconUnlock />, label: 'Akun diaktifkan', done: false },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: s.done ? 'rgba(34,197,94,0.12)' : s.active ? 'rgba(245,158,11,0.12)' : 'var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.done ? '#16a34a' : s.active ? '#d97706' : 'var(--muted)',
                  border: s.active ? '2px solid rgba(245,158,11,0.4)' : s.done ? '2px solid rgba(34,197,94,0.4)' : '2px solid var(--border)',
                }}>
                  {s.icon}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: s.done ? '#16a34a' : s.active ? '#d97706' : 'var(--muted)' }}>
                    {s.label}
                  </div>
                  {s.active && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Proses biasanya 1x24 jam kerja</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        {!isRejected && (
          <div style={{
            padding: '12px 16px', borderRadius: 12, marginBottom: 24,
            background: 'rgba(0,71,171,0.05)', border: '1px solid rgba(0,71,171,0.12)',
            fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, textAlign: 'left',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ flexShrink: 0, marginTop: 1, color: '#0047AB' }}><IconMail /></span>
            <span>Anda akan mendapatkan notifikasi melalui <strong>email</strong> setelah akun diverifikasi.
            Jika sudah lebih dari 2 hari, hubungi HR perusahaan Anda.</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isRejected && (
            <Link to="/app/register" style={{
              display: 'block', padding: '14px', borderRadius: 12,
              background: 'linear-gradient(135deg,#0047AB,#2563eb)',
              color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(0,71,171,0.35)',
            }}>
              Daftar Ulang
            </Link>
          )}
          <button
            onClick={handleLogout}
            style={{
              padding: '13px', borderRadius: 12, border: '1.5px solid var(--border)',
              background: 'transparent', color: 'var(--muted)', fontFamily: 'inherit',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Keluar dari Akun
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 12px 40px rgba(245,158,11,0.3); }
          50% { transform: scale(1.05); box-shadow: 0 20px 60px rgba(245,158,11,0.4); }
        }
      `}</style>
    </div>
  );
}
