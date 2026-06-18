import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateSEOTags, injectSchema } from '../lib/seo';

const PRICING_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'HRIS Loka -- Software HR Indonesia',
  description: 'Platform HRIS modern untuk perusahaan Indonesia.',
  url: 'https://hrisloka.com/harga',
  brand: { '@type': 'Brand', name: 'HRIS Loka' },
  offers: [
    { '@type': 'Offer', name: 'Paket Starter', price: '75000', priceCurrency: 'IDR', availability: 'https://schema.org/InStock', url: 'https://hrisloka.com/checkout' },
    { '@type': 'Offer', name: 'Paket Pro', price: '125000', priceCurrency: 'IDR', availability: 'https://schema.org/InStock', url: 'https://hrisloka.com/checkout' },
    { '@type': 'Offer', name: 'Paket Enterprise', description: 'Harga custom.', availability: 'https://schema.org/InStock' },
  ],
};

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Berapa harga HRIS Loka per bulan?', acceptedAnswer: { '@type': 'Answer', text: 'Paket Starter Rp 75.000/bulan untuk hingga 50 karyawan. Paket Pro Rp 125.000/bulan untuk hingga 200 karyawan. Paket Enterprise dengan harga custom.' } },
    { '@type': 'Question', name: 'Apakah ada diskon berlangganan tahunan?', acceptedAnswer: { '@type': 'Answer', text: 'Ya! Berlangganan tahunan mendapatkan diskon 15% dibanding harga bulanan.' } },
    { '@type': 'Question', name: 'Apakah ada biaya setup atau implementasi?', acceptedAnswer: { '@type': 'Answer', text: 'Tidak ada biaya setup. HRIS Loka bisa digunakan dalam hitungan menit tanpa instalasi server.' } },
    { '@type': 'Question', name: 'Apakah bisa upgrade atau downgrade paket?', acceptedAnswer: { '@type': 'Answer', text: 'Ya, Anda bisa upgrade atau downgrade paket kapan saja.' } },
    { '@type': 'Question', name: 'Apakah data aman jika saya berhenti berlangganan?', acceptedAnswer: { '@type': 'Answer', text: 'Data Anda tetap aman selama periode grace 30 hari setelah berlangganan berakhir.' } },
  ],
};

const DISC = 0.15;
const PLANS = [
  {
    name: 'Starter', monthly: 75000, highlight: false, color: '#3B82F6',
    desc: 'Ideal untuk bisnis yang mulai berkembang.',
    limit: 'Hingga 50 karyawan',
    features: ['Manajemen karyawan', 'Absensi & Cuti digital', 'Payroll dasar', 'PWA Karyawan', 'Email support'],
    cta: 'Mulai Sekarang', ctaLink: '/checkout',
  },
  {
    name: 'Pro', monthly: 125000, highlight: true, color: '#7C3AED',
    badge: 'Paling Populer',
    desc: 'Untuk tim yang butuh fitur HR lengkap dan otomasi end-to-end.',
    limit: 'Hingga 200 karyawan',
    features: ['Semua fitur Starter', 'GPS Geofence Attendance', 'KPI & 360 Review', 'Rekrutmen & Onboarding', 'AI Expense OCR', 'Laporan lanjutan', 'Priority support'],
    cta: 'Pilih Pro', ctaLink: '/checkout',
  },
  {
    name: 'Enterprise', monthly: null, highlight: false, color: '#D97706',
    desc: 'Solusi skala besar dengan integrasi custom dan dedicated support.',
    limit: 'Karyawan tidak terbatas',
    features: ['Semua fitur Pro', 'Custom API integration', 'Dedicated account manager', 'SLA 99.9% uptime', 'On-boarding tim langsung'],
    cta: 'Hubungi Sales via WhatsApp',
    ctaLink: 'https://wa.me/6289512114437?text=Halo%2C+saya+tertarik+paket+Enterprise+HRIS+Loka.',
    isExternal: true,
  },
];

const s = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '0 20px 80px' },
  hero: { textAlign: 'center', padding: '72px 20px 48px', background: 'linear-gradient(135deg, #f0f4ff 0%, #fff 60%)' },
  h1: { fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 900, color: '#0047AB', marginBottom: 16, lineHeight: 1.2 },
  sub: { fontSize: 18, color: '#475569', maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 32 },
  card: (highlight, color) => ({
    borderRadius: 20, border: highlight ? `2.5px solid ${color}` : '1.5px solid #E2E8F0',
    padding: 32, background: highlight ? '#fff' : '#FAFAFA',
    boxShadow: highlight ? `0 8px 40px ${color}22` : '0 2px 8px rgba(0,0,0,0.04)',
    position: 'relative', display: 'flex', flexDirection: 'column',
  }),
  badge: (color) => ({ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: color, color: '#fff', padding: '4px 16px', borderRadius: 20, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }),
  name: { fontSize: 22, fontWeight: 800, marginBottom: 4 },
  price: (color) => ({ fontSize: 36, fontWeight: 900, color, lineHeight: 1 }),
  priceSub: { fontSize: 14, color: '#94A3B8', fontWeight: 500 },
  desc: { fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 1.5 },
  limit: (color) => ({ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: `${color}12`, color, display: 'inline-block', marginBottom: 16 }),
  featureList: { listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 },
  featureItem: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', fontSize: 14, color: '#374151' },
  check: (color) => ({ width: 18, height: 18, borderRadius: '50%', background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 800, marginTop: 1 }),
  cta: (highlight, color) => ({
    display: 'block', textAlign: 'center', padding: '14px 24px', borderRadius: 12, fontWeight: 800, fontSize: 15,
    background: highlight ? color : 'transparent', color: highlight ? '#fff' : color,
    border: `2px solid ${color}`, textDecoration: 'none', transition: 'all 0.2s',
    cursor: 'pointer', fontFamily: 'inherit',
  }),
  toggle: { display: 'flex', justifyContent: 'center', margin: '32px 0 0' },
  toggleWrap: { display: 'flex', background: '#F1F5F9', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: 4 },
  toggleBtn: (active) => ({
    padding: '10px 24px', borderRadius: 9, border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: 14, fontFamily: 'inherit', transition: 'all 0.2s',
    background: active ? '#0047AB' : 'transparent', color: active ? '#fff' : '#64748B',
    display: 'flex', alignItems: 'center', gap: 8,
  }),
  nav: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', background: '#fff', position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', gap: 8 },
  logo: { fontSize: 20, fontWeight: 900, color: '#0047AB', textDecoration: 'none' },
  faq: { marginTop: 80 },
  faqTitle: { fontSize: 28, fontWeight: 800, marginBottom: 32, textAlign: 'center' },
  faqItem: { padding: '20px 0', borderBottom: '1px solid #E2E8F0' },
  faqQ: { fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#1E293B' },
  faqA: { fontSize: 14, color: '#64748B', lineHeight: 1.7 },
  trust: { display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginTop: 16, fontSize: 13, color: '#64748B' },
};

export default function Harga() {
  const [cycle, setCycle] = useState('monthly');

  useEffect(() => {
    updateSEOTags({
      title: 'Harga HRIS Loka -- Paket Starter Rp 75K, Pro Rp 125K, Enterprise Custom',
      description: 'Harga HRIS Loka: Starter Rp 75.000/bulan (maks 50 karyawan), Pro Rp 125.000/bulan (maks 200 karyawan), Enterprise custom. Hemat 15% dengan langganan tahunan.',
      canonical: 'https://hrisloka.com/harga',
      keywords: 'harga HRIS Indonesia, biaya software HR, paket HR, harga aplikasi absensi, HRIS Loka harga',
    });
    injectSchema('pricing', PRICING_SCHEMA);
    injectSchema('faq-pricing', FAQ_SCHEMA);
  }, []);

  return (
    <>
      {/* Navbar */}
      <nav style={s.nav}>
        <Link to="/" style={s.logo}>HRIS Loka</Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/landing" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>Fitur</Link>
          <Link to="/harga" style={{ fontSize: 14, color: '#0047AB', textDecoration: 'none', fontWeight: 700, borderBottom: '2px solid #0047AB', paddingBottom: 2 }}>Harga</Link>
          <Link to="/login" style={{ padding: '8px 20px', background: '#0047AB', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Masuk</Link>
        </div>
      </nav>

      {/* Hero */}
      <header style={s.hero}>
        <h1 style={s.h1}>Harga Transparan,<br />Mulai dari <span style={{ color: '#3B82F6' }}>Rp 75.000</span>/bulan</h1>
        <p style={s.sub}>Tidak ada biaya tersembunyi. Tidak perlu kartu kredit. Upgrade atau downgrade kapan saja.</p>
        <div style={s.trust}>
          <span>Hemat 15% dengan langganan tahunan</span>
          <span>Batalkan kapan saja</span>
          <span>Setup 5 menit, tanpa IT</span>
        </div>

        {/* Billing toggle */}
        <div style={s.toggle}>
          <div style={s.toggleWrap}>
            {['monthly', 'yearly'].map(c => (
              <button key={c} style={s.toggleBtn(cycle === c)} onClick={() => setCycle(c)}>
                {c === 'monthly' ? 'Bulanan' : 'Tahunan'}
                {c === 'yearly' && (
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                    background: cycle === 'yearly' ? 'rgba(255,255,255,0.2)' : 'rgba(16,185,129,0.15)',
                    color: cycle === 'yearly' ? '#fff' : '#16A34A' }}>
                    Hemat 15%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main style={s.page}>
        {/* Pricing Cards */}
        <section aria-label="Paket harga HRIS Loka">
          <div style={s.grid}>
            {PLANS.map((plan) => {
              const yearlyTotal = plan.monthly ? Math.round(plan.monthly * 12 * (1 - DISC)) : null;
              const displayPrice = cycle === 'yearly' ? yearlyTotal : plan.monthly;
              const perMo = yearlyTotal ? Math.round(yearlyTotal / 12) : null;
              return (
                <article key={plan.name} style={s.card(plan.highlight, plan.color)}>
                  {plan.badge && <div style={s.badge(plan.color)}>{plan.badge}</div>}
                  <div style={{ marginBottom: 20, marginTop: plan.badge ? 12 : 0 }}>
                    <div style={s.name}>{plan.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                      {displayPrice === null
                        ? <span style={s.price(plan.color)}>Custom</span>
                        : <>
                            <span style={s.price(plan.color)}>Rp {(displayPrice / 1000).toFixed(0)}K</span>
                            <span style={s.priceSub}>/{cycle === 'yearly' ? 'tahun' : 'bulan'}</span>
                          </>
                      }
                    </div>
                    {cycle === 'yearly' && perMo && (
                      <div style={{ fontSize: 13, color: '#16A34A', fontWeight: 700, marginBottom: 4 }}>
                        Rp {(perMo / 1000).toFixed(0)}K/bln &middot; Hemat Rp {((plan.monthly * 12 - yearlyTotal) / 1000).toFixed(0)}K
                      </div>
                    )}
                    <span style={s.limit(plan.color)}>{plan.limit}</span>
                    <p style={s.desc}>{plan.desc}</p>
                  </div>
                  <ul style={s.featureList}>
                    {plan.features.map((f) => (
                      <li key={f} style={s.featureItem}>
                        <div style={s.check(plan.color)}>✓</div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.isExternal
                    ? <a href={plan.ctaLink} target="_blank" rel="noopener noreferrer" style={s.cta(plan.highlight, plan.color)}>{plan.cta}</a>
                    : <Link to={plan.ctaLink} style={s.cta(plan.highlight, plan.color)}>{plan.cta}</Link>
                  }
                </article>
              );
            })}
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', marginTop: 32 }}>Semua harga dalam IDR &middot; Harga dapat berubah sewaktu-waktu</p>
        </section>

        {/* FAQ */}
        <section style={s.faq} aria-label="Pertanyaan umum harga HRIS Loka">
          <h2 style={s.faqTitle}>Pertanyaan Seputar Harga</h2>
          {FAQ_SCHEMA.mainEntity.map((q, i) => (
            <div key={i} style={s.faqItem}>
              <div style={s.faqQ}>{q.name}</div>
              <div style={s.faqA}>{q.acceptedAnswer.text}</div>
            </div>
          ))}
        </section>

        {/* CTA Bottom */}
        <section style={{ textAlign: 'center', marginTop: 72, padding: '48px 24px', background: 'linear-gradient(135deg, #0047AB 0%, #1D6AE5 100%)', borderRadius: 24 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 12 }}>Siap Digitalisasi HR Perusahaan Anda?</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 28, fontSize: 16 }}>Bergabunglah dengan ratusan perusahaan Indonesia yang sudah menggunakan HRIS Loka.</p>
          <Link to="/checkout" style={{ display: 'inline-block', padding: '14px 36px', background: '#fff', color: '#0047AB', borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>
            Mulai Berlangganan Sekarang
          </Link>
        </section>
      </main>
    </>
  );
}