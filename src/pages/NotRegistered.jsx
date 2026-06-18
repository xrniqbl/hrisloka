import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * NotRegistered — shown when a user signs in with Google OAuth
 * but their email is NOT found in the employees table.
 * They cannot proceed to any dashboard or PWA.
 */
export default function NotRegistered() {
  const { user, signOut } = useAuth();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 400);
    const t3 = setTimeout(() => setStep(3), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleLogout = async () => {
    await signOut();
    window.location.replace('/login');
  };

  const email = user?.email || '';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0C0F1A 0%, #111827 50%, #1A0D2E 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glows */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 28,
        padding: '48px 40px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(239,68,68,0.06)',
        opacity: step >= 1 ? 1 : 0,
        transform: step >= 1 ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>

        {/* Icon */}
        <div style={{
          width: 88, height: 88,
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(220,38,38,0.15) 100%)',
          border: '1.5px solid rgba(239,68,68,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          boxShadow: '0 0 40px rgba(239,68,68,0.2)',
          opacity: step >= 1 ? 1 : 0,
          transform: step >= 1 ? 'scale(1)' : 'scale(0.8)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
        }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/>
          </svg>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 24, fontWeight: 800,
          color: '#F1F5F9',
          marginBottom: 10,
          letterSpacing: '-0.5px',
          lineHeight: 1.3,
          opacity: step >= 2 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.25s',
        }}>
          Akun Belum Terdaftar
        </h1>

        <p style={{
          fontSize: 14, color: '#94A3B8',
          lineHeight: 1.7, marginBottom: 12,
          opacity: step >= 2 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.3s',
        }}>
          Alamat email{' '}
          <strong style={{ color: '#CBD5E1' }}>{email}</strong>
          {' '}tidak ditemukan dalam sistem HRIS Loka.
        </p>

        <p style={{
          fontSize: 14, color: '#94A3B8',
          lineHeight: 1.7, marginBottom: 32,
          opacity: step >= 2 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.33s',
        }}>
          Hanya akun yang sudah didaftarkan oleh perusahaan Anda yang dapat mengakses sistem ini.
        </p>

        {/* Info box */}
        <div style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 14, padding: '18px 20px',
          marginBottom: 28, textAlign: 'left',
          opacity: step >= 3 ? 1 : 0,
          transform: step >= 3 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.4s ease 0.35s',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#F87171', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Apa yang harus dilakukan?
          </p>
          {[
            'Pastikan Anda menggunakan email yang sama dengan yang didaftarkan HR perusahaan Anda',
            'Hubungi tim HR atau administrator perusahaan Anda',
            'Jika Anda HR Admin, daftarkan perusahaan terlebih dahulu melalui halaman pendaftaran',
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#F87171', marginTop: 1,
              }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          opacity: step >= 3 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.45s',
        }}>
          <button
            onClick={handleLogout}
            style={{
              padding: '14px 24px', borderRadius: 14,
              background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(220,38,38,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(220,38,38,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(220,38,38,0.35)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Keluar & Coba Akun Lain
          </button>

          <a
            href="/"
            style={{
              padding: '12px 24px', borderRadius: 14,
              background: 'transparent',
              color: '#64748B',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              textDecoration: 'none',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            Kembali ke Beranda
          </a>
        </div>

        {/* Footer note */}
        <p style={{
          marginTop: 24, fontSize: 12, color: '#475569',
          opacity: step >= 3 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.5s',
        }}>
          Butuh bantuan? Hubungi{' '}
          <a href="mailto:support@hrisloka.com" style={{ color: '#6366F1', textDecoration: 'none' }}>
            support@hrisloka.com
          </a>
        </p>
      </div>
    </div>
  );
}
