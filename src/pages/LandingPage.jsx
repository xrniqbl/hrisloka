import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { updateSEOTags } from '../lib/seo';
import './LandingPage.css';

/* Lightweight scroll-reveal —” pure CSS + IntersectionObserver, no framer-motion */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* â”€â”€ Navbar â”€â”€ */
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const links = [
    { href: '#home', label: 'Beranda' },
    { href: '#fitur', label: 'Fitur' },
    { href: '#solusi', label: 'Solusi' },
    { href: '#harga', label: 'Harga' },
    { href: '#faq', label: 'FAQ' },
    { href: '#kontak', label: 'Kontak' },
  ];
  return (
    <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="lp-nav-inner lp-container">
        <Link to="/landing" className="lp-logo">
          <img src="/landing/hrislokabluepanjang.png" alt="HRIS Loka" className="lp-logo-img" />
        </Link>
        <div className={`lp-nav-links ${open ? 'open' : ''}`}>
          {links.map(l => <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>)}
        </div>
        <div className="lp-nav-right">
          <Link to="/login" className="lp-nav-login">Masuk</Link>
          <Link to="/checkout" className="lp-nav-cta">Mulai Sekarang</Link>
        </div>
        <button className="lp-hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>}
        </button>
      </div>
      {open && (
        <div className="lp-mobile-menu">
          {links.map(l => <a key={l.href} href={l.href} className="lp-mobile-nav-item" onClick={() => setOpen(false)}>{l.label}</a>)}
          <div className="lp-mobile-actions">
            <Link to="/login" className="lp-mobile-login" onClick={() => setOpen(false)}>Masuk</Link>
            <Link to="/checkout" className="lp-mobile-cta" onClick={() => setOpen(false)}>Mulai Sekarang</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* â”€â”€ Hero â”€â”€ */
function Hero() {
  return (
    <section className="lp2-hero" id="home">
      <div className="lp-container lp2-hero-inner">
        <div className="lp2-hero-text">
          <h1>Kelola Absensi, Cuti,<br />Payroll, dan Karyawan<br />dalam <span className="lp2-blue">Satu Platform</span></h1>
          <p>HRIS Loka membantu perusahaan mengotomasi proses HR secara end-to-end —” mulai dari absensi, cuti, penggajian, hingga laporan karyawan yang akurat dan terpercaya.</p>
          <div className="lp2-hero-btns">
            <Link to="/checkout" className="lp-btn-primary">Mulai Sekarang</Link>
            <Link to="/login" className="lp-btn-outline">Lihat Demo</Link>
          </div>
          <div className="lp2-trust">
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Setup cepat</span>
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Aman & Terpercaya</span>
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Support 24/7</span>
          </div>
        </div>
        <div className="lp2-hero-phones">
          <div className="lp2-phone lp2-phone-left">
            <img src="/landing/gambar1.png" alt="HRIS Loka App Absensi" />
          </div>
          <div className="lp2-phone lp2-phone-center">
            <img src="/landing/gambar2.png" alt="HRIS Loka Dashboard" />
          </div>
          <div className="lp2-phone lp2-phone-right">
            <img src="/landing/gambar3.png" alt="HRIS Loka Pengajuan" />
          </div>
        </div>
      </div>
    </section>
  );
}

const IcoUsers = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoTarget = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IcoClock = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoCloud = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>;

/* â”€â”€ Stats Bar â”€â”€ */
function Stats() {
  const items = [
    { icon: <IcoUsers />, num: '500+', label: 'Karyawan Terkelola' },
    { icon: <IcoTarget />, num: '98%', label: 'Akurasi Absensi' },
    { icon: <IcoClock />, num: '24/7', label: 'Monitoring Data' },
    { icon: <IcoCloud />, num: '100%', label: 'Cloud Based' },
  ];
  return (
    <section className="lp2-stats">
      <div className="lp-container lp2-stats-grid">
        {items.map((s, i) => (
          <div key={i} className="lp2-stat">
            <div className="lp2-stat-icon">{s.icon}</div>
            <div className="lp2-stat-num">{s.num}</div>
            <div className="lp2-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* â”€â”€ Problems â”€â”€ */
function Problems() {
  const items = [
    { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, title: 'Proses Manual dan Berulang', desc: 'Pekerjaan manual memakan waktu dan rentan kesalahan.' },
    { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>, title: 'Data Tidak Terpusat', desc: 'Data tersebar di banyak file dan sulit dilacak.' },
    { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>, title: 'Payroll Rumit dan Lama', desc: 'Perhitungan gaji manual memakan waktu lama.' },
    { icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, title: 'Laporan Sulit & Tidak Real-time', desc: 'Laporan terlambat dan tidak akurat untuk diakses.' },
  ];
  return (
    <section className="lp2-problems" id="solusi">
      <div className="lp-container">
        <div className="lp2-section-head lp-reveal">
          <h2>Masih Hadapi Proses HR yang Merepotkan?</h2>
          <p>Kenali 4 masalah umum yang sering dihadapi tim HR dan cara HRIS Loka mengatasinya.</p>
        </div>
        <div className="lp2-problems-grid">
          {items.map((p, i) => (
            <div key={i} className="lp2-problem-card">
              <div className="lp2-problem-icon">{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Dashboard Split ── */
const hrFeatures = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Data Karyawan',
    desc: 'Direktori lengkap profil, kontrak & dokumen karyawan.',
    color: '#0047AB',
    bg: 'rgba(0,71,171,0.08)',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: 'Absensi & GPS',
    desc: 'Check-in biometrik + geofence real-time dari ponsel.',
    color: '#0284c7',
    bg: 'rgba(2,132,199,0.08)',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    title: 'Manajemen Cuti',
    desc: 'Pengajuan & approval cuti otomatis dengan notifikasi.',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
        <line x1="7" y1="15" x2="10" y2="15"/>
      </svg>
    ),
    title: 'Payroll Otomatis',
    desc: 'Hitung gaji, potongan & PPh21 secara akurat & cepat.',
    color: '#059669',
    bg: 'rgba(5,150,105,0.08)',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: 'Laporan Real-time',
    desc: 'Dashboard analitik & laporan HR yang dapat diekspor.',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 19-7z"/>
      </svg>
    ),
    title: 'Pengajuan Karyawan',
    desc: 'Lembur, reimbursement & dokumen dalam satu alur.',
    color: '#db2777',
    bg: 'rgba(219,39,119,0.08)',
  },
];

function DashboardSection() {
  return (
    <section className="lp2-dashboard" id="fitur">
      <div className="lp-container">
        <div className="lp2-dashboard-head lp-reveal">
          <h2>Semua Proses HR dalam Satu Dashboard</h2>
          <p>Kelola absensi, cuti, payroll, hingga laporan karyawan dalam satu sistem yang terintegrasi dan mudah digunakan.</p>
        </div>
        <div className="lp2-hr-features-grid">
          {hrFeatures.map((f, i) => (
            <div
              key={i}
              className="lp2-hr-feature-card lp-reveal"
              style={{ '--card-color': f.color, '--card-bg': f.bg }}
            >
              <div className="lp2-hr-feature-icon">
                <span style={{ color: f.color }}>{f.icon}</span>
              </div>
              <h3 className="lp2-hr-feature-title">{f.title}</h3>
              <p className="lp2-hr-feature-desc">{f.desc}</p>
              <div className="lp2-hr-feature-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
        <div className="lp2-dashboard-cta lp-reveal">
          <Link to="/login" className="lp-btn-primary">Lihat Dashboard</Link>
        </div>
      </div>
    </section>
  );
}


/* â”€â”€ Feature Chips â”€â”€ */
function FeatureChips() {
  const chips = [
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>, label: 'Absensi Biometrik & GPS' },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label: 'Manajemen Cuti' },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>, label: 'Payroll & Slip Gaji' },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 19-7z"/></svg>, label: 'Pengajuan Karyawan' },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label: 'Direktori Karyawan' },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, label: 'Laporan Real-time' },
  ];
  return (
    <section className="lp2-chips-section">
      <div className="lp-container">
        <div className="lp2-section-head lp-reveal">
          <h2>Fitur Unggulan HRIS Loka</h2>
        </div>
        <div className="lp2-chips-grid">
          {chips.map((c, i) => (
            <div key={i} className="lp2-chip-card">
              <div className="lp2-chip-icon">{c.icon}</div>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* â”€â”€ Attendance Flow â”€â”€ */
function AttendanceFlow() {
  const steps = [
    {
      num: '1',
      title: 'Deteksi GPS',
      desc: 'Verifikasi lokasi agar absensi sesuai titik kerja',
      badge: 'Akurat',
      icon: (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
      ),
    },
    {
      num: '2',
      title: 'Face AI & Liveness',
      desc: 'Verifikasi wajah & liveness untuk keamanan',
      badge: 'Real-time',
      icon: (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3H5a2 2 0 0 0-2 2v4"/>
          <path d="M15 3h4a2 2 0 0 1 2 2v4"/>
          <path d="M9 21H5a2 2 0 0 1-2-2v-4"/>
          <path d="M15 21h4a2 2 0 0 0 2-2v-4"/>
          <circle cx="12" cy="10" r="3"/>
          <path d="M8.5 16c1-1.5 6-1.5 7 0"/>
        </svg>
      ),
    },
    {
      num: '3',
      title: 'Konfirmasi Absensi',
      desc: 'Absensi tercatat otomatis dengan validasi sistem',
      badge: 'Otomatis',
      icon: (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
    },
  ];
  return (
    <section className="lp2-flow">
      <div className="lp-container">
        <div className="lp2-section-head lp-reveal">
          <h2>Alur Absensi Cerdas & Aman</h2>
        </div>
        <div className="lp2-flow-grid">
          {steps.map((s, i) => (
            <div key={i} className="lp2-flow-step">
              <div className="lp2-flow-num">{s.num}</div>
              <div className="lp2-flow-icon-wrap">
                {s.icon}
                <span className="lp2-flow-badge">{s.badge}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* â”€â”€ Roles â”€â”€ */
function RoleAccess() {
  const roles = [
    { icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: 'Admin HR', desc: 'Kelola data karyawan, absensi, payroll, dan pengaturan sistem.' },
    { icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>, title: 'Manager', desc: 'Lihat jadwal, approval pengajuan, dan pantau performa.' },
    { icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, title: 'Karyawan', desc: 'Akses slip gaji, cuti, lembur, & update profil pribadi.' },
  ];
  return (
    <section className="lp2-roles">
      <div className="lp-container">
        <div className="lp2-section-head lp-reveal">
          <h2>Akses Sesuai Peran</h2>
        </div>
        <div className="lp2-roles-grid">
          {roles.map((r, i) => (
            <div key={i} className="lp2-role-card">
              <div className="lp2-role-icon">{r.icon}</div>
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* â”€â”€ Analytics â”€â”€ */
function Analytics() {
  const stats = [
    { label: 'Kepatuhan Data', value: '98%', sub: 'Distribusi Karyawan', chart: true },
    { label: 'Kehadiran Bulanan', value: 'Apr 2026', chart: true },
    { label: 'Laporan Lembur', value: 'Mar 2026', chart: true },
    { label: 'Total Payroll', value: 'Rp 1,24 M', sub: 'Mar 2026', chart: false },
  ];
  return (
    <section className="lp2-analytics">
      <div className="lp-container">
        <div className="lp2-section-head lp-reveal" style={{ color: '#fff' }}>
          <h2 style={{ color: '#fff' }}>Kepatuhan Data,<br />Lebih Cepat & Akurat</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>Pantau data karyawan dan laporan real-time dari data yang anda inginkan.</p>
        </div>
        <div className="lp2-analytics-grid">
          {stats.map((s, i) => (
            <div key={i} className="lp2-analytics-card">
              <div className="lp2-analytics-label">{s.label}</div>
              <div className="lp2-analytics-val">{s.value}</div>
              {s.sub && <div className="lp2-analytics-sub">{s.sub}</div>}
              <div className="lp2-analytics-bar">
                <div className="lp2-analytics-bar-fill" style={{ width: `${60 + i * 10}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* â”€â”€ Security â”€â”€ */
function Security() {
  const items = [
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, title: 'Enkripsi Data', desc: 'Data terenkripsi end-to-end dengan standar bank.' },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, title: 'Role-Based Access', desc: 'Setiap akun hanya akses yang dibutuhkan.' },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>, title: 'Audit Log', desc: 'Semua aktivitas tercatat dan dapat diaudit.' },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>, title: 'Backup Berkala', desc: 'Data dibackup rutin dan dapat dipulihkan.' },
    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: 'Verifikasi Biometrik', desc: 'Absensi dengan verifikasi wajah AI teknologi modern.' },
  ];
  return (
    <section className="lp2-security">
      <div className="lp-container">
        <div className="lp2-section-head lp-reveal">
          <h2 style={{ color: '#fff' }}>Keamanan Data<br />Adalah Prioritas Kami</h2>
          <p style={{ color: 'rgba(255,255,255,0.65)' }}>Perlindungan data karyawan dari berbagai ancaman dan kepatuhan regulasi, sehingga data Anda tetap aman dan terlindungi.</p>
        </div>
        <div className="lp2-security-grid">
          {items.map((s, i) => (
            <div key={i} className="lp2-security-card">
              <div className="lp2-security-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* â”€â”€ Integrations â”€â”€ */
function Integrations() {
  const tools = [
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>, label: 'Google Workspace' },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: 'WhatsApp' },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, label: 'Email' },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>, label: 'Spreadsheet Export' },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 19-7z"/></svg>, label: 'Telegram' },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, label: 'API' },
  ];
  return (
    <section className="lp2-integ">
      <div className="lp-container">
        <div className="lp2-section-head lp-reveal">
          <h2>Terintegrasi dengan Mudah</h2>
        </div>
        <div className="lp2-integ-grid">
          {tools.map((t, i) => (
            <div key={i} className="lp2-integ-tag">
              <span className="lp2-integ-icon">{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -- Pricing -- */
function Pricing() {
  const [cycle, setCycle] = useState('monthly');
  const DISC = 0.15;
  const plans = [
    {
      name: 'Starter', featured: false, badge: null, monthly: 75000,
      features: ['Hingga 50 karyawan', 'Absensi & Cuti digital', 'Payroll dasar', 'PWA Karyawan', 'Email support'],
      cta: 'Mulai Sekarang', ctaLink: '/checkout',
    },
    {
      name: 'Pro', featured: true, badge: 'Paling Populer', monthly: 125000,
      features: ['Hingga 200 karyawan', 'Semua fitur Starter', 'GPS Geofence Attendance', 'KPI & Penilaian Kinerja', 'AI Expense OCR', 'Laporan lanjutan', 'Priority support'],
      cta: 'Pilih Pro', ctaLink: '/checkout',
    },
    {
      name: 'Enterprise', featured: false, badge: null, monthly: null,
      features: ['Karyawan tidak terbatas', 'Semua fitur Pro', 'Custom integrasi API', 'Dedicated account manager', 'SLA 99.9% uptime'],
      cta: 'Hubungi via WhatsApp',
      ctaLink: 'https://wa.me/6289512114437?text=Halo%2C+saya+tertarik+paket+Enterprise+HRIS+Loka.',
      isExternal: true,
    },
  ];
  return (
    <section className="lp2-pricing" id="harga">
      <div className="lp-container">
        <div className="lp2-section-head lp-reveal">
          <h2>Pilih Paket yang Sesuai Kebutuhan Anda</h2>
          <p>Harga transparan, tidak ada biaya tersembunyi.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', background: '#F1F5F9', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: 4 }}>
            {['monthly', 'yearly'].map(c => (
              <button key={c} onClick={() => setCycle(c)} style={{
                padding: '9px 22px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, fontFamily: 'inherit', transition: 'all 0.2s',
                background: cycle === c ? '#0047AB' : 'transparent',
                color: cycle === c ? '#fff' : '#64748B',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {c === 'monthly' ? 'Bulanan' : 'Tahunan'}
                {c === 'yearly' && (
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 20,
                    background: cycle === 'yearly' ? 'rgba(255,255,255,0.25)' : 'rgba(16,185,129,0.15)',
                    color: cycle === 'yearly' ? '#fff' : '#16A34A' }}>
                    Hemat 15%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="lp2-pricing-grid">
          {plans.map((p, i) => {
            const yearly = p.monthly ? Math.round(p.monthly * 12 * (1 - DISC)) : null;
            const price  = cycle === 'yearly' ? yearly : p.monthly;
            const perMo  = yearly ? Math.round(yearly / 12) : null;
            return (
              <div key={i} className={`lp2-pricing-card ${p.featured ? 'featured' : ''}`}>
                {p.badge && <div className="lp2-pricing-badge">{p.badge}</div>}
                <h3>{p.name}</h3>
                <div className="lp2-pricing-price">
                  {price === null
                    ? <span className="lp2-price-num">Custom</span>
                    : <>
                        <span className="lp2-price-num">Rp {(price / 1000).toFixed(0)}K</span>
                        <span className="lp2-price-period">/{cycle === 'yearly' ? 'tahun' : 'bulan'}</span>
                      </>
                  }
                </div>
                {cycle === 'yearly' && perMo && (
                  <p style={{ fontSize: 12, color: p.featured ? 'rgba(255,255,255,0.7)' : '#64748B', margin: '0 0 12px' }}>
                    Rp {(perMo / 1000).toFixed(0)}K/bln · <span style={{ color: p.featured ? '#86EFAC' : '#16A34A', fontWeight: 700 }}>Hemat Rp {((p.monthly * 12 - yearly) / 1000).toFixed(0)}K</span>
                  </p>
                )}
                <ul>
                  {p.features.map((f, j) => (
                    <li key={j}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {p.isExternal
                  ? <a href={p.ctaLink} target="_blank" rel="noopener noreferrer"
                      className={p.featured ? 'lp-btn-primary pricing-cta' : 'lp-btn-outline pricing-cta'}
                      style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                      {p.cta}
                    </a>
                  : <Link to={p.ctaLink} className={p.featured ? 'lp-btn-primary pricing-cta' : 'lp-btn-outline pricing-cta'}>{p.cta}</Link>
                }
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* â”€â”€ Testimonials â”€â”€ */
function Testimonials() {
  const items = [
    { name: 'Budd Luwena', role: 'HR Manager, PT Soltan Pilau', text: '"HRIS Loka sangat membantu kami dalam hal HR dari rekrutan karyawan hingga penggajian karyawan."', stars: 5 },
    { name: 'Dewi Kartika', role: 'CEO, PT Rosari Indonesia', text: '"Fitur pengajuan cuti dan approval sangat mudah. Karyawan kami sangat senang dengan tampilan yang user friendly."', stars: 5 },
    { name: 'Agus Sakhono', role: 'IT Director, PT Nusantara Dinan', text: '"Implementasi berjalan lancar, tim support sangat responsif. Sangat direkomendasikan untuk perusahaan skala menengah."', stars: 5 },
  ];
  return (
    <section className="lp2-testi">
      <div className="lp-container">
        <div className="lp2-section-head lp-reveal">
          <h2>Dipercaya oleh Perusahaan di Seluruh Indonesia</h2>
        </div>
        <div className="lp2-testi-grid">
          {items.map((t, i) => (
            <div key={i} className="lp2-testi-card">
              <p className="lp2-testi-text">{t.text}</p>
              <div className="lp2-testi-stars">
                {[...Array(t.stars)].map((_, j) => (
                  <svg key={j} width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="0.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ))}
              </div>
              <div className="lp2-testi-author">
                <div className="lp2-testi-avatar">{t.name[0]}</div>
                <div>
                  <div className="lp2-testi-name">{t.name}</div>
                  <div className="lp2-testi-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* â”€â”€ FAQ â”€â”€ */
function FAQ() {
  const [open, setOpen] = useState(null);
  const faqs = [
    { q: 'Apakah HRIS Loka cocok untuk perusahaan kecil?', a: 'Ya! Paket Starter HRIS Loka mulai Rp 75.000/bulan untuk hingga 50 karyawan — sangat ideal untuk startup dan UKM yang ingin memulai digitalisasi HR. Setup hanya 5 menit tanpa keahlian teknis.' },
    { q: 'Berapa lama proses implementasi?', a: 'Implementasi HRIS Loka sangat cepat. Anda bisa mulai menggunakan dalam 5-10 menit setelah mendaftar. Tidak diperlukan instalasi atau konfigurasi teknis yang rumit.' },
    { q: 'Apakah data karyawan aman di HRIS Loka?', a: 'Sangat aman. Kami menggunakan enkripsi end-to-end, backup berkala, role-based access control, dan audit log untuk memastikan keamanan data Anda setiap saat.' },
    { q: 'Apakah tersedia aplikasi mobile untuk karyawan?', a: 'Ya, tersedia PWA (Progressive Web App) yang dapat diinstall di smartphone Android maupun iOS. Karyawan bisa absensi GPS, pengajuan cuti, dan cek slip gaji langsung dari ponsel.' },
    { q: 'Bagaimana jika saya ingin upgrade atau downgrade paket?', a: 'Anda bisa upgrade atau downgrade paket kapan saja melalui menu pengaturan akun. Perubahan akan berlaku di siklus billing berikutnya tanpa biaya penalti.' },
    { q: 'Apakah ada dukungan teknis jika ada masalah?', a: 'Kami menyediakan dukungan teknis 24/7 via email dan WhatsApp. Tim support kami siap membantu Anda menyelesaikan masalah dengan cepat dan profesional.' },
  ];
  return (
    <section className="lp2-faq" id="faq">
      <div className="lp-container">
        <div className="lp2-section-head lp-reveal">
          <h2>Pertanyaan yang Sering Diajukan</h2>
          <p>Temukan jawaban atas pertanyaan umum seputar HRIS Loka.</p>
        </div>
        <div className="lp2-faq-list">
          {faqs.map((f, i) => (
            <div key={i} className={`lp2-faq-item ${open === i ? 'open' : ''}`}>
              <button className="lp2-faq-q" onClick={() => setOpen(open === i ? null : i)}>
                <span>{f.q}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {open === i && <div className="lp2-faq-a">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* â”€â”€ CTA Banner â”€â”€ */
function CTABanner() {
  return (
    <section className="lp2-cta-banner">
      <div className="lp-container lp2-cta-inner">
        <div>
          <h2>Siap Transformasi HR Perusahaan Anda?</h2>
          <p>Bergabung bersama ratusan perusahaan Indonesia yang telah mempercayakan HR mereka kepada HRIS Loka.</p>
        </div>
        <div className="lp2-cta-btns">
          <Link to="/checkout" className="lp-btn-white">Mulai Berlangganan</Link>
          <Link to="/login" className="lp-btn-glass" style={{ color: '#fff' }}>Lihat Demo</Link>
        </div>
      </div>
    </section>
  );
}

/* â”€â”€ Footer â”€â”€ */
const IcoFb = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
const IcoIg = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>;
const IcoTw = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>;
const IcoYt = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="#070d1c" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>;

function Footer() {
  return (
    <footer className="lp2-footer" id="kontak">
      <div className="lp-container lp2-footer-inner">
        <div className="lp2-footer-brand">
          <img src="/landing/hrislokawhitepanjang.png" alt="HRIS Loka" style={{ height: 32, marginBottom: 14, filter: 'brightness(0) invert(1)' }} />
          <p>Platform HRIS modern untuk perusahaan Indonesia. Kelola SDM lebih efisien dan terukur.</p>
          <div className="lp2-footer-socials">
            <a href="https://facebook.com/hrisloka" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><IcoFb /></a>
            <a href="https://instagram.com/hrisloka" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IcoIg /></a>
            <a href="https://twitter.com/hrisloka" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><IcoTw /></a>
            <a href="https://youtube.com/@hrisloka" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><IcoYt /></a>
          </div>
        </div>
        <div className="lp2-footer-cols">
          <div>
            <h4>Produk</h4>
            <Link to="/landing">Beranda</Link>
            <Link to="/harga">Harga</Link>
            <Link to="/fitur">Fitur</Link>
            <Link to="/blog">Blog</Link>
          </div>
          <div>
            <h4>Perusahaan</h4>
            <a href="#kontak">Tentang Kami</a>
            <Link to="/blog">Blog</Link>
            <Link to="/privacy">Kebijakan Privasi</Link>
          </div>
          <div>
            <h4>Bantuan</h4>
            <a href="https://wa.me/6289512114437" target="_blank" rel="noopener noreferrer">WhatsApp Support</a>
            <Link to="/install">Panduan Install</Link>
            <Link to="/checkout">Mulai Berlangganan</Link>
          </div>
          <div>
            <h4>Kontak</h4>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 2 }}>
              Bandung, Indonesia<br />
              hrisloka@gmail.com<br />
              +62 895-1211-4437
            </p>
          </div>
        </div>
      </div>
      <div className="lp2-footer-bottom">
        <div className="lp-container lp2-footer-bottom-inner">
          <span>© {new Date().getFullYear()} HRIS Loka. All rights reserved.</span>
          <span><Link to="/privacy">Syarat & Ketentuan</Link> · <Link to="/privacy">Kebijakan Privasi</Link></span>
        </div>
      </div>
    </footer>
  );
}

/* â”€â”€ ROOT â”€â”€ */
export default function LandingPage() {
  useReveal();
  useEffect(() => { updateSEOTags({ page: 'landing' }); }, []);
  return (
    <div className="lp" lang="id">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Problems />
        <DashboardSection />
        <FeatureChips />
        <AttendanceFlow />
        <RoleAccess />
        <Analytics />
        <Security />
        <Integrations />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}


