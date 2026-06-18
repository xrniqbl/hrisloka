import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { updateSEOTags, injectSchema } from '../lib/seo';
import './LandingPage.css';
import './InstallGuide.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = (d = 0.1) => ({ hidden: {}, show: { transition: { staggerChildren: d } } });

/* ─── Step Cards ─── */
const ANDROID_STEPS = [
  {
    num: '01',
    title: 'Buka Browser Chrome',
    desc: 'Pastikan kamu membuka HRIS Loka di browser Google Chrome di HP Android kamu. Kunjungi link yang diberikan oleh HR perusahaan.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3"/>
        <path d="M12 8 Q16 8 18 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 8 Q8 8 6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Login ke Akun Kamu',
    desc: 'Masuk menggunakan email dan password yang diberikan oleh tim HR. Jika belum punya akun, hubungi admin perusahaan kamu.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Ketuk Menu Titik Tiga (⋮)',
    desc: 'Di pojok kanan atas browser Chrome, ketuk ikon tiga titik vertikal (⋮) untuk membuka menu pilihan.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Pilih "Tambahkan ke Layar Utama"',
    desc: 'Gulir ke bawah di menu dan cari opsi "Tambahkan ke layar utama" atau "Add to Home screen". Ketuk opsi tersebut.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18" strokeWidth="3"/>
      </svg>
    ),
  },
  {
    num: '05',
    title: 'Konfirmasi & Install',
    desc: 'Akan muncul dialog konfirmasi. Ketuk "Tambahkan" atau "Install" untuk menambahkan aplikasi ke layar utama HP kamu.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
];

const IOS_STEPS = [
  {
    num: '01',
    title: 'Buka Safari di iPhone/iPad',
    desc: 'Pastikan kamu menggunakan browser Safari bawaan Apple. Browser lain seperti Chrome di iOS tidak mendukung fitur install PWA.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8l4.9 4.9-4.9 4.9-4.9-4.9 4.9-4.9z" fill="currentColor" opacity="0.2"/>
        <line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Login ke Akun Kamu',
    desc: 'Masuk menggunakan email dan password yang diberikan oleh tim HR perusahaan kamu.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Ketuk Ikon Share (Bagikan)',
    desc: 'Di bagian bawah Safari, ketuk ikon Share yang berbentuk kotak dengan panah ke atas (↑). Ikon ini berwarna biru.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Pilih "Add to Home Screen"',
    desc: 'Di menu share yang muncul, gulir ke bawah dan cari "Add to Home Screen" (Tambah ke Layar Utama). Ketuk opsi ini.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
  },
  {
    num: '05',
    title: 'Tap "Tambahkan" di Pojok Kanan',
    desc: 'Akan muncul konfirmasi nama aplikasi. Ketuk "Tambahkan" di pojok kanan atas untuk menyelesaikan instalasi.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
];

const BENEFITS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    title: 'Akses Super Cepat',
    desc: 'Buka langsung dari layar utama tanpa buka browser. Tidak perlu ingat URL.',
    color: '#F59E0B',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/>
        <line x1="12" y1="18" x2="12" y2="18" strokeWidth="3"/>
      </svg>
    ),
    title: 'Tampilan Fullscreen',
    desc: 'Tampil seperti aplikasi native tanpa address bar, lebih nyaman digunakan.',
    color: '#3B82F6',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    title: 'Notifikasi Realtime',
    desc: 'Terima pengumuman, approval cuti, dan slip gaji langsung di notifikasi HP.',
    color: '#10B981',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3"/>
      </svg>
    ),
    title: 'Mode Offline (Terbatas)',
    desc: 'Beberapa fitur tetap bisa diakses meski koneksi internet tidak stabil.',
    color: '#8B5CF6',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'Tidak Perlu Download',
    desc: 'Tidak perlu Play Store atau App Store. Langsung install dari browser, gratis.',
    color: '#EC4899',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
    title: 'Selalu Update Otomatis',
    desc: 'Tidak perlu update manual. Fitur terbaru otomatis tersedia setiap kali dibuka.',
    color: '#0047AB',
  },
];

export default function InstallGuide() {
  const [activeTab, setActiveTab] = useState('android');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installState, setInstallState] = useState('idle'); // 'idle' | 'installing' | 'installed'
  const [showManualModal, setShowManualModal] = useState(false);
  const [promptReady, setPromptReady] = useState(false);
  const isAlreadyInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;

  // ── SEO: update meta per page ───────────────────────────────
  useEffect(() => {
    updateSEOTags({ page: 'install' });
    // HowTo schema khusus untuk panduan install PWA
    injectSchema('installHowTo', {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      'name': 'Cara Install Aplikasi HRIS Loka di HP (Android & iPhone)',
      'description': 'Panduan lengkap menginstal aplikasi HRIS Loka sebagai Progressive Web App (PWA) di Android menggunakan Chrome dan iPhone menggunakan Safari.',
      'image': 'https://hrisloka.com/og-image.png',
      'totalTime': 'PT1M',
      'step': [
        {
          '@type': 'HowToStep',
          'position': 1,
          'name': 'Buka Browser di HP',
          'text': 'Android: Buka Google Chrome. iPhone: Buka Safari (wajib, Chrome iOS tidak mendukung install PWA).',
        },
        {
          '@type': 'HowToStep',
          'position': 2,
          'name': 'Login ke Akun HRIS Loka',
          'text': 'Masuk menggunakan email dan password yang diberikan oleh tim HR perusahaan.',
          'url': 'https://hrisloka.com/login',
        },
        {
          '@type': 'HowToStep',
          'position': 3,
          'name': 'Buka Menu Browser',
          'text': 'Android: Ketuk ikon tiga titik (⋮) di pojok kanan atas. iPhone: Ketuk ikon Share (kotak dengan panah ke atas) di bagian bawah Safari.',
        },
        {
          '@type': 'HowToStep',
          'position': 4,
          'name': 'Pilih "Tambahkan ke Layar Utama"',
          'text': 'Pilih opsi "Tambahkan ke layar utama" (Android) atau "Add to Home Screen" (iPhone) dari menu yang muncul.',
        },
        {
          '@type': 'HowToStep',
          'position': 5,
          'name': 'Konfirmasi Install',
          'text': 'Ketuk "Tambahkan" atau "Install" di dialog konfirmasi. Aplikasi HRIS Loka siap digunakan dari layar utama HP.',
        },
      ],
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPromptReady(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstallState('installed');
      setDeferredPrompt(null);
      setPromptReady(false);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstallState('installing');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallState('installed');
      } else {
        setInstallState('idle');
      }
      setDeferredPrompt(null);
    } else {
      // Show manual instructions in modal
      setShowManualModal(true);
    }
  };

  const steps = activeTab === 'android' ? ANDROID_STEPS : IOS_STEPS;

  // Detect mobile OS for modal default tab
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  const defaultOS = /iPhone|iPad/i.test(navigator.userAgent) ? 'ios' : 'android';

  return (
    <div className="lp" lang="id">
      {/* Simple navbar */}
      <nav className="lp-nav scrolled" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
        <div className="lp-nav-inner lp-container">
          <Link to="/landing" className="lp-logo">
            <img src="/landing/hrislokabluepanjang.png" alt="HRIS Loka" className="lp-logo-img" />
          </Link>
          <div className="lp-nav-right">
            <Link to="/landing" className="lp-nav-login">Beranda</Link>
            <Link to="/login" className="lp-nav-cta">
              Masuk ke Akun
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* ─── HERO ─── */}
        <section className="ig-hero">
          <div className="ig-hero-bg">
            <div className="ig-hero-orb ig-orb1" />
            <div className="ig-hero-orb ig-orb2" />
          </div>
          <motion.div
            className="lp-container ig-hero-inner"
            variants={stagger(0.12)}
            initial="hidden"
            animate="show"
          >
            {/* Badge */}
            <motion.div className="ig-badge" variants={fadeUp}>
              <span className="badge-dot" />
              Khusus Karyawan
            </motion.div>

            <motion.h1 className="ig-hero-title" variants={fadeUp}>
              Install Aplikasi<br />
              <span className="lp-hero-gradient">HRIS Loka</span> di HP Kamu
            </motion.h1>

            <motion.p className="ig-hero-sub" variants={fadeUp}>
              Akses slip gaji, absensi, pengajuan cuti, dan semua fitur HR kapan saja<br />
              langsung dari layar utama HP — tanpa perlu download dari toko aplikasi.
            </motion.p>

            {/* Phone mockup preview */}
            <motion.div className="ig-phone-preview" variants={fadeUp}>
              <div className="ig-phone-frame">
                <div className="ig-phone-notch" />
                <div className="ig-phone-screen">
                  <div className="ig-phone-header">
                    <div className="ig-phone-avatar">HR</div>
                    <div>
                      <div className="ig-phone-name">Selamat Pagi!</div>
                      <div className="ig-phone-role">HRIS Loka Employee</div>
                    </div>
                  </div>
                  <div className="ig-phone-card">
                    <div className="ig-phone-card-label">Absen Hari Ini</div>
                    <div className="ig-phone-card-btn">Masuk Sekarang</div>
                  </div>
                  <div className="ig-phone-grid">
                    {['Slip Gaji', 'Cuti', 'Lembur', 'KPI'].map(l => (
                      <div key={l} className="ig-phone-grid-item">{l}</div>
                    ))}
                  </div>
                </div>
                <div className="ig-phone-home" />
              </div>
              {/* Install badge on phone */}
              <div className="ig-install-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {isAlreadyInstalled ? 'Sudah Terinstall! ✓' : 'Siap Diinstall'}
              </div>
            </motion.div>

            {/* ── INSTALL BUTTON — always visible ── */}
            {!isAlreadyInstalled && (
              <motion.div variants={fadeUp} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                {installState === 'installed' ? (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    padding: '16px 36px', borderRadius: 100,
                    background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                    color: '#fff', fontWeight: 800, fontSize: 16,
                    boxShadow: '0 8px 32px rgba(34,197,94,0.4)',
                  }}>
                    Aplikasi Berhasil Terinstall!
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleInstall}
                      disabled={installState === 'installing'}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 12,
                        padding: '18px 44px', borderRadius: 100,
                        background: installState === 'installing'
                          ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
                          : 'linear-gradient(135deg,#0047AB,#2563eb)',
                        color: '#fff', border: 'none', cursor: installState === 'installing' ? 'not-allowed' : 'pointer',
                        fontWeight: 800, fontSize: 17, fontFamily: 'inherit',
                        boxShadow: promptReady
                          ? '0 8px 32px rgba(0,71,171,0.5), 0 0 0 6px rgba(0,71,171,0.12)'
                          : '0 8px 32px rgba(0,71,171,0.35)',
                        transition: 'all 0.3s ease',
                        animation: promptReady ? 'pulseBtn 2s ease-in-out infinite' : 'none',
                      }}
                    >
                      {installState === 'installing' ? (
                        <><span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Menginstall...</>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          {promptReady ? 'Install Aplikasi Sekarang' : 'Cara Install di HP'}
                        </>
                      )}
                    </button>

                    {promptReady ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e', animation: 'blink 1.2s ease-in-out infinite' }} />
                        Siap diinstall — klik tombol di atas
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.5 }}>
                        Buka halaman ini di browser HP untuk install otomatis
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {isAlreadyInstalled && (
              <motion.div variants={fadeUp}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '14px 28px', borderRadius: 100,
                  background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                  color: '#fff', fontWeight: 800, fontSize: 15,
                  boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
                }}>
                  Aplikasi Sudah Terinstall di HP Kamu!
                </div>
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* ── MANUAL INSTALL MODAL ── */}
        {showManualModal && (
          <div
            onClick={e => { if (e.target === e.currentTarget) setShowManualModal(false); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }}
          >
            <div style={{
              background: '#fff', borderRadius: '24px 24px 0 0',
              padding: '28px 24px 40px', width: '100%', maxWidth: 520,
              boxShadow: '0 -20px 60px rgba(0,0,0,0.2)',
              animation: 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1)',
            }}>
              <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 4, margin: '0 auto 24px' }} />
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 6, textAlign: 'center' }}>Install di HP Kamu</h3>
              <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
                Buka halaman ini di browser HP kamu, lalu ikuti langkah berikut:
              </p>

              {/* OS Toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#f1f5f9', borderRadius: 12, padding: 4 }}>
                <button
                  onClick={() => setActiveTab('android')}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, background: activeTab === 'android' ? '#0047AB' : 'transparent', color: activeTab === 'android' ? '#fff' : '#64748b', transition: 'all 0.2s' }}
                >Android (Chrome)</button>
                <button
                  onClick={() => setActiveTab('ios')}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, background: activeTab === 'ios' ? '#0047AB' : 'transparent', color: activeTab === 'ios' ? '#fff' : '#64748b', transition: 'all 0.2s' }}
                >iPhone (Safari)</button>
              </div>

              {(activeTab === 'android' ? ANDROID_STEPS : IOS_STEPS).slice(2).map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0047AB,#2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{i + 3}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 2 }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setShowManualModal(false)}
                style={{ width: '100%', marginTop: 20, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#0047AB,#2563eb)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}
              >
                Mengerti
              </button>
            </div>
          </div>
        )}

        {/* ─── BENEFITS ─── */}
        <section className="ig-benefits lp-section" id="benefits">
          <div className="lp-container">
            <div className="lp-section-head" style={{ textAlign: 'center', marginBottom: 48 }}>
              <div className="lp-overline">Kenapa Harus Install?</div>
              <h2 className="lp-section-title">Pengalaman Lebih Baik<br /><span style={{ color: 'var(--primary, #0047AB)' }}>Seperti Aplikasi Asli</span></h2>
              <p className="lp-section-desc">Nikmati fitur yang sama persis dengan aplikasi mobile asli, tanpa harus pergi ke Play Store atau App Store.</p>
            </div>
            <motion.div
              className="ig-benefits-grid"
              variants={stagger(0.08)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
            >
              {BENEFITS.map((b, i) => (
                <motion.div key={i} className="ig-benefit-card" variants={fadeUp}>
                  <div className="ig-benefit-icon" style={{ color: b.color, background: `${b.color}15` }}>
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="ig-benefit-title">{b.title}</h3>
                    <p className="ig-benefit-desc">{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── INSTALL GUIDE ─── */}
        <section className="ig-guide lp-section" id="cara-install">
          <div className="lp-container">
            <div className="lp-section-head" style={{ textAlign: 'center', marginBottom: 40 }}>
              <div className="lp-overline">Panduan Instalasi</div>
              <h2 className="lp-section-title">Cara Install di HP Kamu</h2>
            </div>

            {/* OS Tabs */}
            <div className="ig-tabs">
              <button
                className={`ig-tab ${activeTab === 'android' ? 'active' : ''}`}
                onClick={() => setActiveTab('android')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zm-2.5-1C2.67 17 2 17.67 2 18.5v-9C2 8.67 2.67 8 3.5 8S5 8.67 5 9.5v9c0 .83-.67 1.5-1.5 1.5zm17 0c-.83 0-1.5-.67-1.5-1.5v-9c0-.83.67-1.5 1.5-1.5S22 8.67 22 9.5v9c0 .83-.67 1.5-1.5 1.5zM15.53 2.16l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0 0 12 1c-.71 0-1.39.13-2.02.36L8.5.1c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.27 1.27C7.91 3.12 7 4.95 7 7h10c0-2.08-.96-3.93-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
                </svg>
                Android (Chrome)
              </button>
              <button
                className={`ig-tab ${activeTab === 'ios' ? 'active' : ''}`}
                onClick={() => setActiveTab('ios')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                iPhone / iPad (Safari)
              </button>
            </div>

            {/* Steps */}
            <motion.div
              className="ig-steps"
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {steps.map((step, i) => (
                <div key={i} className="ig-step">
                  <div className="ig-step-num">{step.num}</div>
                  <div className="ig-step-connector" />
                  <div className="ig-step-card">
                    <div className="ig-step-icon">{step.icon}</div>
                    <div className="ig-step-content">
                      <h3 className="ig-step-title">{step.title}</h3>
                      <p className="ig-step-desc">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Note box */}
            <div className="ig-note">
              <div className="ig-note-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/>
                </svg>
              </div>
              <div>
                <strong>Catatan untuk Admin:</strong> Fitur ini eksklusif untuk karyawan yang sudah terdaftar di sistem HRIS Loka. Jika belum punya akun, hubungi tim HR atau admin perusahaan kamu untuk mendapatkan akses.
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="ig-faq lp-section" id="faq">
          <div className="lp-container" style={{ maxWidth: 760 }}>
            <div className="lp-section-head" style={{ textAlign: 'center', marginBottom: 40 }}>
              <div className="lp-overline">FAQ</div>
              <h2 className="lp-section-title">Pertanyaan Umum</h2>
            </div>
            {[
              {
                q: 'Apakah saya perlu mengunduh dari App Store atau Play Store?',
                a: 'Tidak perlu! HRIS Loka adalah aplikasi web progresif (PWA). Kamu bisa install langsung dari browser tanpa perlu ke toko aplikasi.',
              },
              {
                q: 'Apakah gratis untuk menginstall?',
                a: 'Ya, sepenuhnya gratis! Biaya hanya dibayarkan oleh perusahaan tempat kamu bekerja, bukan oleh karyawan.',
              },
              {
                q: 'Apakah data saya aman di PWA?',
                a: 'Sangat aman. HRIS Loka menggunakan enkripsi end-to-end. Semua data tersimpan di server aman, bukan di HP kamu.',
              },
              {
                q: 'Mengapa saya tidak menemukan opsi "Add to Home Screen" di Safari?',
                a: 'Pastikan kamu menggunakan Safari versi terbaru di iOS 16.4+. Buka pengaturan iPhone, pergi ke Safari, dan pastikan browser terupdate.',
              },
              {
                q: 'Bagaimana cara menguninstall jika tidak ingin menggunakannya lagi?',
                a: 'Sama seperti menghapus aplikasi biasa: tekan dan tahan ikon di layar utama, lalu pilih "Hapus" atau "Delete App".',
              },
            ].map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="ig-cta">
          <div className="ig-cta-bg">
            <div className="ig-cta-orb" />
          </div>
          <motion.div
            className="lp-container ig-cta-inner"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="ig-cta-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <h2 className="ig-cta-title">Siap Install Sekarang?</h2>
            <p className="ig-cta-desc">Buka website HRIS Loka di browser HP kamu dan ikuti langkah di atas. Selesai dalam 30 detik!</p>
            <div className="ig-cta-actions">
              <button
                onClick={handleInstall}
                className="lp-btn-primary"
                disabled={installState === 'installing'}
                style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                {installState === 'installing' ? (
                  <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Menginstall...</>
                ) : installState === 'installed' ? (
                  'Terinstall!'
                ) : (
                  <>{promptReady ? 'Install Sekarang' : 'Cara Install di HP'}</>
                )}
              </button>
              <a href="#cara-install" className="lp-btn-outline-dark">
                Baca Panduan Lagi
              </a>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── STICKY FLOATING INSTALL BAR ── */}
      {!isAlreadyInstalled && installState !== 'installed' && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
          padding: '16px 20px 24px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,71,171,0.1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'slideUpBar 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,#0047AB,#2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', lineHeight: 1.2 }}>Install HRIS Loka</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
              {promptReady ? 'Klik untuk install langsung — siap dipasang!' : 'Tambahkan ke layar utama HP kamu'}
            </div>
          </div>
          <button
            onClick={handleInstall}
            disabled={installState === 'installing'}
            style={{
              padding: '12px 22px', borderRadius: 100, border: 'none',
              background: promptReady
                ? 'linear-gradient(135deg,#0047AB,#2563eb)'
                : 'linear-gradient(135deg,#0047AB,#2563eb)',
              color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
              cursor: installState === 'installing' ? 'not-allowed' : 'pointer',
              boxShadow: promptReady ? '0 4px 16px rgba(0,71,171,0.4)' : '0 4px 12px rgba(0,71,171,0.3)',
              whiteSpace: 'nowrap', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}
          >
            {installState === 'installing' ? (
              <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Proses...</>
            ) : (
              <>{promptReady ? 'Install Sekarang' : 'Cara Install'}</>
            )}
          </button>
        </div>
      )}

      {/* Simple footer */}
      <div className="ig-footer">
        <div className="lp-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span>© 2026 HRIS Loka. Dibuat dengan ❤ di Bandung.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/landing">Beranda</Link>
            <Link to="/login">Masuk</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`ig-faq-item ${open ? 'open' : ''}`}>
      <button className="ig-faq-q" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <div className={`ig-faq-arrow ${open ? 'open' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>
      {open && (
        <div className="ig-faq-a">{a}</div>
      )}
    </div>
  );
}
