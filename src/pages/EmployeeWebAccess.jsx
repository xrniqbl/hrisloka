import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// Smartphone icon SVG
function PhoneIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

export default function EmployeeWebAccess() {
  const navigate = useNavigate();
  const { signOut, employee } = useAuth();
  const [countdown, setCountdown] = useState(30);
  const [step, setStep] = useState(0); // animation step
  const intervalRef = useRef(null);

  useEffect(() => {
    // Stagger animation
    const t = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 400);
    const t3 = setTimeout(() => setStep(3), 700);
    return () => { clearTimeout(t); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    // Countdown to auto-logout
    intervalRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(intervalRef.current);
          handleLogout();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleLogout = async () => {
    clearInterval(intervalRef.current);
    await signOut();
    navigate('/', { replace: true });
  };

  const handleInstall = () => {
    clearInterval(intervalRef.current);
    window.location.href = '/install';
  };

  const installUrl = window.location.origin;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0C0F1A 0%, #111827 50%, #0D1B3E 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,71,171,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-5%',
        width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(13,148,136,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Main card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 28,
        padding: '48px 40px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        opacity: step >= 1 ? 1 : 0,
        transform: step >= 1 ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>

        {/* Phone icon with glow */}
        <div style={{
          width: 88, height: 88,
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(0,71,171,0.3) 0%, rgba(13,148,136,0.3) 100%)',
          border: '1.5px solid rgba(0,71,171,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          color: '#60A5FA',
          boxShadow: '0 0 40px rgba(0,71,171,0.3)',
          opacity: step >= 1 ? 1 : 0,
          transform: step >= 1 ? 'scale(1)' : 'scale(0.8)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
        }}>
          <PhoneIcon />
        </div>

        {/* Greeting */}
        {employee?.name && (
          <p style={{
            fontSize: 13, color: '#60A5FA', fontWeight: 600,
            marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
            opacity: step >= 2 ? 1 : 0,
            transition: 'opacity 0.4s ease 0.2s',
          }}>
            Halo, {employee.name.split(' ')[0]}
          </p>
        )}

        <h1 style={{
          fontSize: 26, fontWeight: 800,
          color: '#F1F5F9',
          marginBottom: 14,
          letterSpacing: '-0.5px',
          lineHeight: 1.25,
          opacity: step >= 2 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.25s',
        }}>
          Gunakan Aplikasi<br />di Smartphone Anda
        </h1>

        <p style={{
          fontSize: 14, color: '#94A3B8',
          lineHeight: 1.7, marginBottom: 32,
          opacity: step >= 2 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.3s',
        }}>
          Akun karyawan hanya dapat digunakan melalui{' '}
          <strong style={{ color: '#CBD5E1' }}>aplikasi HRIS Loka</strong> yang terinstall
          di HP. Ini memastikan keamanan absensi dengan Face ID dan GPS.
        </p>

        {/* Steps */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '20px 24px',
          marginBottom: 28, textAlign: 'left',
          opacity: step >= 3 ? 1 : 0,
          transform: step >= 3 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.4s ease 0.35s',
        }}>
          {[
            { num: '1', text: 'Buka browser di HP Anda' },
            { num: '2', text: `Kunjungi ${installUrl}` },
            { num: '3', text: 'Klik "Install" / "Tambahkan ke layar utama"' },
            { num: '4', text: 'Login dari aplikasi yang terinstall' },
          ].map(s => (
            <div key={s.num} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              marginBottom: s.num !== '4' ? 14 : 0,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #0047AB, #0D9488)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#fff', marginTop: 1,
              }}>{s.num}</div>
              <span style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.5 }}>{s.text}</span>
            </div>
          ))}
        </div>

        {/* Countdown bar */}
        <div style={{
          marginBottom: 24,
          opacity: step >= 3 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.4s',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 8,
          }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>Logout otomatis</span>
            <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>{countdown}s</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: 'linear-gradient(90deg, #0047AB, #0D9488)',
              width: `${(countdown / 30) * 100}%`,
              transition: 'width 1s linear',
            }} />
          </div>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          opacity: step >= 3 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.45s',
        }}>
          <button
            onClick={handleInstall}
            style={{
              padding: '14px 24px', borderRadius: 14,
              background: 'linear-gradient(135deg, #0047AB, #0052CC)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14,
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(0,71,171,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,71,171,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,71,171,0.4)'; }}
          >
            <DownloadIcon />
            Panduan Install Aplikasi
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: '12px 24px', borderRadius: 14,
              background: 'transparent',
              color: '#64748B',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <LogoutIcon />
            Keluar dari akun
          </button>
        </div>

        {/* Footer note */}
        <p style={{
          marginTop: 24, fontSize: 12, color: '#475569',
          opacity: step >= 3 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.5s',
        }}>
          Butuh bantuan? Hubungi HR Anda.
        </p>
      </div>
    </div>
  );
}
