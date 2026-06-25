import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateSEOTags } from '../lib/seo';
import './LandingPage.css';

/* ── Scroll Reveal ── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ── Navbar ── */
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const links = [
    { href: '#home', label: 'Home' },
    { href: '#features', label: 'Features' },
    { href: '#how', label: 'How it Works' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
  ];
  return (
    <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="lp-container lp-nav-inner">
        <Link to="/landing" className="lp-logo">
          <img src="/landing/hrislokabluepanjang.png" alt="HRIS Loka" className="lp-logo-img" />
        </Link>
        <div className="lp-nav-links-desktop">
          {links.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
        </div>
        <div className="lp-nav-actions">
          <Link to="/login" className="lp-nav-login">Sign in</Link>
          <Link to="/login" className="lp-nav-cta">Get Started</Link>
          <button className="lp-hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="lp-mobile-menu">
          {links.map(l => <a key={l.href} href={l.href} className="lp-mobile-link" onClick={() => setOpen(false)}>{l.label}</a>)}
          <div className="lp-mobile-btns">
            <Link to="/login" className="lp-nav-login" onClick={() => setOpen(false)}>Sign in</Link>
            <Link to="/login" className="lp-nav-cta" onClick={() => setOpen(false)}>Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <section className="lp-hero" id="home">
      <div className="lp-container lp-hero-inner">
        <div className="lp-hero-badge-wrap">
          <span className="lp-hero-badge">✦ Platform HRIS #1 Indonesia</span>
        </div>
        <h1 className="lp-hero-title">
          Revolutionizing<br />
          <span className="lp-hero-gradient">Workforce Management</span>
        </h1>
        <p className="lp-hero-sub">
          Streamline HR operations, track attendance, manage payroll, and boost employee performance — all in one powerful platform.
        </p>
        <div className="lp-hero-btns">
          <Link to="/login" className="lp-btn-primary">Get Started Free</Link>
          <Link to="/login" className="lp-btn-ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Watch Demo
          </Link>
        </div>
        <div className="lp-hero-trust">
          <span>✓ No credit card required</span>
          <span>·</span>
          <span>✓ 14-day free trial</span>
          <span>·</span>
          <span>✓ Setup in 5 minutes</span>
        </div>
        <div className="lp-hero-visual">
          <div className="lp-hero-img-wrap">
            <img src="/landing/hero-dashboard.png" alt="HRIS Loka Dashboard" className="lp-hero-img-main" />
            <div className="lp-hero-float lp-hero-float-tl">
              <div className="lp-float-dot" style={{ background: '#22c55e' }}></div>
              <span>500+ Active Employees</span>
            </div>
            <div className="lp-hero-float lp-hero-float-br">
              <div className="lp-float-dot" style={{ background: '#6366f1' }}></div>
              <span>98% Attendance Rate</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Logo Bar ── */
function LogoBar() {
  const logos = [
    { name: 'Be The First To Know', icon: '★' },
    { name: 'PT. Soltan Pilau', icon: '◆' },
    { name: 'NKRI', icon: '🇮🇩', isText: true },
    { name: 'FedEx', icon: null, isFedex: true },
    { name: 'Enterprise Co.', icon: '◉' },
  ];
  return (
    <section className="lp-logos">
      <div className="lp-container">
        <p className="lp-logos-label">Dipercaya ratusan perusahaan di seluruh Indonesia</p>
        <div className="lp-logos-row">
          {logos.map((l, i) => (
            <div key={i} className="lp-logo-item">
              {l.isFedex ? (
                <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: -1 }}>
                  <span style={{ color: '#4D148C' }}>Fed</span>
                  <span style={{ color: '#FF6600' }}>Ex</span>
                </span>
              ) : (
                <span>{l.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Features ── */
function Features() {
  const items = [
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      label: 'Employee Database',
      desc: 'Direktori lengkap data karyawan, kontrak & dokumen dengan akses berbasis peran.',
      color: '#6366f1',
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      label: 'Attendance Tracking',
      desc: 'Absensi biometrik & GPS real-time dengan verifikasi wajah AI yang akurat.',
      color: '#8b5cf6',
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
      label: 'Performance Analytics',
      desc: 'Dashboard analitik real-time untuk monitoring KPI dan laporan kinerja karyawan.',
      color: '#06b6d4',
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
      ),
      label: 'Payroll Automation',
      desc: 'Hitung gaji, PPh21, dan slip gaji secara otomatis — akurat tanpa kesalahan manual.',
      color: '#10b981',
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      label: 'Leave Management',
      desc: 'Pengajuan & approval cuti otomatis dengan notifikasi dan saldo yang selalu terupdate.',
      color: '#f59e0b',
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      label: 'Enterprise Security',
      desc: 'Enkripsi end-to-end, audit log, dan role-based access control tingkat enterprise.',
      color: '#ef4444',
    },
  ];
  return (
    <section className="lp-features" id="features">
      <div className="lp-container">
        <div className="lp-section-head lp-reveal">
          <span className="lp-eyebrow">Features</span>
          <h2>How it works in<br /><em>simple way</em></h2>
          <p>Semua yang dibutuhkan tim HR Anda dalam satu platform yang terintegrasi.</p>
        </div>
        <div className="lp-features-grid">
          {items.map((f, i) => (
            <div key={i} className="lp-feature-card lp-reveal" style={{ '--fc': f.color }}>
              <div className="lp-feature-icon-wrap">
                <span style={{ color: f.color }}>{f.icon}</span>
              </div>
              <h3>{f.label}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ── */
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Sign Up for Free Tool', desc: 'Daftar dalam 2 menit. Tidak perlu kartu kredit, tidak perlu instalasi.' },
    { num: '02', title: 'Configure Your HR Settings', desc: 'Atur struktur organisasi, jadwal kerja, dan kebijakan cuti sesuai perusahaan Anda.' },
    { num: '03', title: 'Start Optimizing Your HR Processes', desc: 'Kelola absensi, payroll, dan laporan secara real-time dari satu dashboard.' },
  ];
  return (
    <section className="lp-how" id="how">
      <div className="lp-container">
        <div className="lp-section-head lp-reveal">
          <span className="lp-eyebrow">How it works</span>
          <h2>Mulai dalam 3 langkah mudah</h2>
        </div>
        <div className="lp-how-grid">
          {steps.map((s, i) => (
            <div key={i} className="lp-how-card lp-reveal">
              <div className="lp-how-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Split: Efficiency ── */
function EfficiencySection() {
  const items = ['Kurangi waktu HR hingga 70%', 'Otomasi payroll & slip gaji', 'Laporan real-time kapan saja', 'Integrasi dengan sistem existing'];
  return (
    <section className="lp-split lp-split-light">
      <div className="lp-container lp-split-inner">
        <div className="lp-split-img lp-reveal">
          <img src="/landing/features-ui.png" alt="Efficiency Dashboard" />
        </div>
        <div className="lp-split-text lp-reveal">
          <span className="lp-eyebrow">Efficiency Boost</span>
          <h2>Transform Your HR<br />Operations</h2>
          <p>Platform HRIS Loka membantu tim HR Anda bekerja lebih efisien dengan otomasi proses yang sebelumnya memakan waktu berjam-jam.</p>
          <ul className="lp-check-list">
            {items.map((item, i) => (
              <li key={i}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                {item}
              </li>
            ))}
          </ul>
          <Link to="/login" className="lp-btn-primary" style={{ marginTop: 24 }}>Mulai Sekarang</Link>
        </div>
      </div>
    </section>
  );
}

/* ── Split: Mobile ── */
function MobileSection() {
  return (
    <section className="lp-split">
      <div className="lp-container lp-split-inner lp-split-reverse">
        <div className="lp-split-text lp-reveal">
          <span className="lp-eyebrow">Mobile First</span>
          <h2>Mobile Accessibility</h2>
          <p>Karyawan dapat melakukan absensi, pengajuan cuti, dan cek slip gaji langsung dari smartphone — kapan saja, di mana saja.</p>
          <div className="lp-mobile-chips">
            <span className="lp-chip">Android & iOS PWA</span>
            <span className="lp-chip">GPS Geofencing</span>
            <span className="lp-chip">Face Recognition</span>
            <span className="lp-chip">Offline Mode</span>
          </div>
        </div>
        <div className="lp-split-img lp-split-phone lp-reveal">
          <img src="/landing/feature-phone.png" alt="Mobile App" />
        </div>
      </div>
    </section>
  );
}

/* ── CTA Banner ── */
function CTABanner() {
  return (
    <section className="lp-cta-banner">
      <div className="lp-container lp-cta-inner">
        <div className="lp-cta-left">
          <h2>Ready to optimize your<br />HR operations?</h2>
          <p>Bergabung dengan ratusan perusahaan yang telah mempercayakan HR mereka kepada HRIS Loka.</p>
          <div className="lp-cta-btns">
            <Link to="/login" className="lp-btn-white">Get Started Free</Link>
            <a href="https://wa.me/6289512114437" target="_blank" rel="noopener noreferrer" className="lp-btn-glass">Contact Sales</a>
          </div>
        </div>
        <div className="lp-cta-price">
          <div className="lp-cta-price-badge">Mulai dari</div>
          <div className="lp-cta-price-num">Rp 75K<span>/month</span></div>
          <div className="lp-cta-price-sub">Per perusahaan · hingga 50 karyawan</div>
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ── */
function Pricing() {
  const [cycle, setCycle] = useState('monthly');
  const plans = [
    {
      name: 'Starter', price: 75000, featured: false,
      features: ['Hingga 50 karyawan', 'Absensi & Cuti digital', 'Payroll dasar', 'PWA Karyawan', 'Email support'],
      cta: 'Get Started', link: '/login',
    },
    {
      name: 'Pro', price: 125000, featured: true, badge: 'Most Popular',
      features: ['Hingga 200 karyawan', 'Semua fitur Starter', 'GPS Geofence', 'KPI & Kinerja', 'AI Expense OCR', 'Laporan lanjutan', 'Priority support'],
      cta: 'Choose Pro', link: '/login',
    },
    {
      name: 'Enterprise', price: null, featured: false,
      features: ['Karyawan tidak terbatas', 'Semua fitur Pro', 'Custom integrasi API', 'Dedicated manager', 'SLA 99.9%'],
      cta: 'Contact Us', link: 'https://wa.me/6289512114437',
    },
  ];
  return (
    <section className="lp-pricing" id="pricing">
      <div className="lp-container">
        <div className="lp-section-head lp-reveal">
          <span className="lp-eyebrow">Pricing plan</span>
          <h2>Pilih paket yang tepat<br />untuk bisnis Anda</h2>
          <p>Harga transparan, tanpa biaya tersembunyi.</p>
        </div>
        <div className="lp-pricing-toggle">
          {['monthly', 'yearly'].map(c => (
            <button key={c} className={`lp-toggle-btn ${cycle === c ? 'active' : ''}`} onClick={() => setCycle(c)}>
              {c === 'monthly' ? 'Bulanan' : 'Tahunan'}
              {c === 'yearly' && <span className="lp-toggle-save">Hemat 15%</span>}
            </button>
          ))}
        </div>
        <div className="lp-pricing-grid">
          {plans.map((p, i) => {
            const price = cycle === 'yearly' && p.price ? Math.round(p.price * 12 * 0.85) : p.price;
            const period = cycle === 'yearly' ? 'tahun' : 'bulan';
            return (
              <div key={i} className={`lp-pricing-card lp-reveal ${p.featured ? 'featured' : ''}`}>
                {p.badge && <div className="lp-pricing-badge">{p.badge}</div>}
                <div className="lp-pricing-name">{p.name}</div>
                <div className="lp-pricing-price">
                  {price ? <><span className="lp-price-num">Rp {(price / 1000).toFixed(0)}K</span><span className="lp-price-per">/{period}</span></> : <span className="lp-price-num">Custom</span>}
                </div>
                <ul className="lp-pricing-features">
                  {p.features.map((f, j) => (
                    <li key={j}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {p.link.startsWith('http')
                  ? <a href={p.link} target="_blank" rel="noopener noreferrer" className={p.featured ? 'lp-btn-primary pricing-cta' : 'lp-btn-outline pricing-cta'}>{p.cta}</a>
                  : <Link to={p.link} className={p.featured ? 'lp-btn-primary pricing-cta' : 'lp-btn-outline pricing-cta'}>{p.cta}</Link>
                }
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials ── */
function Testimonials() {
  const items = [
    { name: 'Budd Luwena', role: 'HR Manager, PT Soltan Pilau', avatar: 'B', text: '"HRIS Loka sangat membantu kami dalam proses HR dari rekrutan hingga penggajian karyawan."' },
    { name: 'Dewi Kartika', role: 'CEO, PT Rosari Indonesia', avatar: 'D', text: '"Fitur pengajuan cuti dan approval sangat mudah. Karyawan kami sangat puas dengan tampilannya."' },
    { name: 'Agus Sakhono', role: 'IT Director, PT Nusantara Dinan', avatar: 'A', text: '"Implementasi berjalan lancar, tim support sangat responsif. Direkomendasikan untuk perusahaan menengah."' },
  ];
  return (
    <section className="lp-testi">
      <div className="lp-container">
        <div className="lp-section-head lp-reveal">
          <span className="lp-eyebrow">Testimonials</span>
          <h2>Dipercaya perusahaan<br />di seluruh Indonesia</h2>
        </div>
        <div className="lp-testi-grid">
          {items.map((t, i) => (
            <div key={i} className="lp-testi-card lp-reveal">
              <div className="lp-testi-stars">{'★★★★★'}</div>
              <p className="lp-testi-text">{t.text}</p>
              <div className="lp-testi-author">
                <div className="lp-testi-avatar">{t.avatar}</div>
                <div>
                  <div className="lp-testi-name">{t.name}</div>
                  <div className="lp-testi-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="lp-testi-logos lp-reveal">
          {['PT. Soltan Pilau', 'PT. Rosari Indonesia', 'Ox The Slush & Base', 'PT. Nusantara Dinan'].map((name, i) => (
            <div key={i} className="lp-testi-logo-item">{name}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ── */
function FAQ() {
  const [open, setOpen] = useState(null);
  const faqs = [
    { q: 'Apakah HRIS Loka cocok untuk perusahaan kecil?', a: 'Ya! Paket Starter mulai Rp 75.000/bulan untuk hingga 50 karyawan — ideal untuk startup dan UKM yang ingin digitalisasi HR.' },
    { q: 'Berapa lama proses implementasi?', a: 'Setup hanya 5-10 menit setelah mendaftar. Tidak ada instalasi atau konfigurasi teknis yang rumit.' },
    { q: 'Apakah data karyawan aman?', a: 'Sangat aman. Kami menggunakan enkripsi end-to-end, backup berkala, role-based access control, dan audit log.' },
    { q: 'Apakah tersedia aplikasi mobile?', a: 'Ya, tersedia PWA yang dapat diinstall di Android dan iOS. Karyawan bisa absensi GPS, pengajuan cuti, dan cek slip gaji dari ponsel.' },
    { q: 'Bagaimana jika ingin upgrade atau downgrade?', a: 'Bisa kapan saja melalui menu pengaturan akun. Perubahan berlaku di siklus billing berikutnya.' },
    { q: 'Apakah ada dukungan teknis?', a: 'Support 24/7 via email dan WhatsApp. Tim kami siap membantu dengan cepat dan profesional.' },
  ];
  return (
    <section className="lp-faq" id="faq">
      <div className="lp-container lp-faq-inner">
        <div className="lp-faq-head lp-reveal">
          <span className="lp-eyebrow">FAQ</span>
          <h2>Frequently asked<br />questions</h2>
          <p>Tidak menemukan jawaban? <a href="https://wa.me/6289512114437" target="_blank" rel="noopener noreferrer">Hubungi kami</a></p>
        </div>
        <div className="lp-faq-list">
          {faqs.map((f, i) => (
            <div key={i} className={`lp-faq-item ${open === i ? 'open' : ''} lp-reveal`}>
              <button className="lp-faq-q" onClick={() => setOpen(open === i ? null : i)}>
                <span>{f.q}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {open === i && <div className="lp-faq-a">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="lp-footer" id="contact">
      <div className="lp-container lp-footer-inner">
        <div className="lp-footer-brand">
          <img src="/landing/hrislokawhitepanjang.png" alt="HRIS Loka" style={{ height: 30, marginBottom: 12, filter: 'brightness(0) invert(1)' }} />
          <p>Platform HRIS modern untuk perusahaan Indonesia. Kelola SDM lebih efisien dan terukur.</p>
        </div>
        <div className="lp-footer-cols">
          <div>
            <h4>Product</h4>
            <Link to="/landing">Home</Link>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <Link to="/blog">Blog</Link>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#contact">About Us</a>
            <Link to="/blog">Blog</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
          <div>
            <h4>Support</h4>
            <a href="https://wa.me/6289512114437" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <Link to="/install">Install Guide</Link>
            <Link to="/checkout">Subscribe</Link>
          </div>
          <div>
            <h4>Contact</h4>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 2 }}>
              Bandung, Indonesia<br />
              hrisloka@gmail.com<br />
              +62 895-1211-4437
            </p>
          </div>
        </div>
      </div>
      <div className="lp-footer-bottom">
        <div className="lp-container lp-footer-bottom-inner">
          <span>© {new Date().getFullYear()} HRIS Loka. All rights reserved.</span>
          <span><Link to="/privacy">Terms</Link> · <Link to="/privacy">Privacy</Link></span>
        </div>
      </div>
    </footer>
  );
}

/* ── ROOT ── */
export default function LandingPage() {
  useReveal();
  useEffect(() => {
    updateSEOTags({ page: 'landing' });
    // Remove any legacy overlays injected by old code/SW
    document.querySelectorAll('[class*="nkri"], [class*="NKRI"], [id*="nkri"]').forEach(el => el.remove());
    // Unregister stale service workers that may serve cached old pages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
      });
    }
  }, []);
  return (
    <div className="lp" lang="id">
      <Navbar />
      <main>
        <Hero />
        <LogoBar />
        <Features />
        <HowItWorks />
        <EfficiencySection />
        <MobileSection />
        <CTABanner />
        <Pricing />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
