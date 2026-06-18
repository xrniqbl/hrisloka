import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateSEOTags, injectSchema } from '../lib/seo';

const FEATURES_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Fitur Lengkap HRIS Loka — Software HR Indonesia',
  description: 'Daftar fitur lengkap platform manajemen SDM HRIS Loka untuk perusahaan Indonesia',
  url: 'https://hrisloka.com/fitur',
  numberOfItems: 12,
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Absensi GPS Real-time', description: 'Absensi karyawan berbasis GPS dengan geofencing, anti-spoofing, face recognition, dan laporan kehadiran otomatis.', url: 'https://hrisloka.com/fitur#absensi' },
    { '@type': 'ListItem', position: 2, name: 'Penggajian Otomatis', description: 'Kalkulasi gaji, tunjangan, lembur, potongan BPJS, PPh 21 otomatis dengan slip gaji digital.', url: 'https://hrisloka.com/fitur#penggajian' },
    { '@type': 'ListItem', position: 3, name: 'Manajemen Karyawan', description: 'Database karyawan terpusat dengan profil lengkap, kontrak digital, struktur organisasi, dan riwayat employment.', url: 'https://hrisloka.com/fitur#karyawan' },
    { '@type': 'ListItem', position: 4, name: 'Penilaian Kinerja KPI', description: 'Sistem evaluasi 360 derajat, OKR tracking, dan laporan performa karyawan berbasis data.', url: 'https://hrisloka.com/fitur#kpi' },
    { '@type': 'ListItem', position: 5, name: 'Rekrutmen & Onboarding', description: 'Pipeline rekrutmen end-to-end: job posting, screening, wawancara, hingga onboarding karyawan baru.', url: 'https://hrisloka.com/fitur#rekrutmen' },
    { '@type': 'ListItem', position: 6, name: 'AI Capability Mapping', description: 'Pemetaan kompetensi karyawan berbasis Artificial Intelligence untuk perencanaan talent yang lebih strategis.', url: 'https://hrisloka.com/fitur#ai' },
    { '@type': 'ListItem', position: 7, name: 'Analitik HR Real-time', description: 'Dashboard analytics dengan visualisasi data kehadiran, produktivitas, turnover, dan biaya SDM.', url: 'https://hrisloka.com/fitur#analitik' },
    { '@type': 'ListItem', position: 8, name: 'Manajemen Cuti Digital', description: 'Pengajuan dan approval cuti online dengan kalender tim, saldo cuti otomatis, dan notifikasi real-time.', url: 'https://hrisloka.com/fitur#cuti' },
    { '@type': 'ListItem', position: 9, name: 'Reimbursement & Lembur', description: 'Pengajuan reimburse dengan foto struk OCR otomatis dan perhitungan lembur sesuai regulasi Ketenagakerjaan.', url: 'https://hrisloka.com/fitur#reimbursement' },
    { '@type': 'ListItem', position: 10, name: 'Helpdesk & Pengumuman', description: 'Sistem tiket helpdesk internal dan manajemen pengumuman untuk komunikasi perusahaan yang efisien.', url: 'https://hrisloka.com/fitur#helpdesk' },
    { '@type': 'ListItem', position: 11, name: 'Notifikasi WhatsApp & Email', description: 'Notifikasi otomatis via WhatsApp dan email untuk approval cuti, payslip, reminder, dan pemberitahuan HR.', url: 'https://hrisloka.com/fitur#notifikasi' },
    { '@type': 'ListItem', position: 12, name: 'Aplikasi Mobile PWA', description: 'Progressive Web App yang bisa diinstal di Android dan iOS tanpa Play Store. Akses semua fitur dari smartphone.', url: 'https://hrisloka.com/fitur#mobile' },
  ],
};

const FEATURES = [
  { id: 'absensi', icon: '📍', color: '#0047AB', title: 'Absensi GPS Real-time', sub: 'Anti-fraud · Face Recognition · Geofencing', desc: 'Sistem absensi karyawan paling canggih di Indonesia. Karyawan clock-in/out dari HP menggunakan GPS real-time, verifikasi wajah (face recognition), dan analisis anti-spoofing berlapis. Admin bisa pantau siapa hadir, di mana, dan kapan — secara real-time.', points: ['GPS geofencing dengan radius custom per lokasi', 'Face recognition & liveness detection', 'Deteksi spoofing GPS (fake location)', 'Riwayat kehadiran dan laporan otomatis', 'Mode offline dengan sinkronisasi otomatis', 'Foto selfie saat clock-in sebagai bukti'] },
  { id: 'penggajian', icon: '💰', color: '#16A34A', title: 'Penggajian Otomatis', sub: 'BPJS · PPh 21 · Slip Gaji Digital', desc: 'Hitung gaji karyawan secara otomatis setiap bulan — termasuk gaji pokok, tunjangan, lembur, potongan BPJS Ketenagakerjaan, BPJS Kesehatan, dan PPh 21 sesuai regulasi Indonesia. Slip gaji digital langsung terkirim ke karyawan.', points: ['Kalkulasi otomatis BPJS TK, BPJS Kesehatan, PPh 21', 'Slip gaji digital PDF + notifikasi otomatis', 'Rekap payroll Excel & PDF untuk accounting', 'Riwayat payroll per karyawan', 'Formula gaji fleksibel per karyawan', 'Integrasi data kehadiran & lembur'] },
  { id: 'karyawan', icon: '👥', color: '#7C3AED', title: 'Manajemen Karyawan', sub: 'Profil · Kontrak · Struktur Organisasi', desc: 'Kelola seluruh data karyawan dalam satu database terpusat. Dari profil personal, riwayat pekerjaan, kontrak digital, hingga struktur organisasi — semua tersedia dalam satu platform.', points: ['Database karyawan lengkap (2000+ field)', 'Generator kontrak kerja digital (PKWT/PKWTT)', 'Struktur organisasi & hierarki jabatan', 'Dokumen karyawan (sertifikat, SIM, KTP)', 'Import massal via Excel', 'Audit trail lengkap setiap perubahan'] },
  { id: 'kpi', icon: '📊', color: '#F59E0B', title: 'Penilaian Kinerja KPI', sub: 'OKR · 360° Review · Performance Report', desc: 'Sistem penilaian kinerja berbasis KPI yang terstruktur dan objektif. Evaluasi performa karyawan secara berkala dengan metode 360 derajat, OKR tracking, dan laporan performa berbasis data.', points: ['Template KPI siap pakai per divisi', 'Evaluasi 360° (atasan, rekan, bawahan)', 'OKR tracking bulanan/kuartalan', 'Self-assessment karyawan', 'Laporan performa otomatis', 'Integrasi dengan rencana pengembangan'] },
  { id: 'rekrutmen', icon: '🎯', color: '#EC4899', title: 'Rekrutmen & Onboarding', sub: 'Job Posting · Screening · Onboarding Digital', desc: 'Pipeline rekrutmen end-to-end dalam satu platform. Dari membuat lowongan kerja, screening kandidat, penjadwalan wawancara, hingga onboarding karyawan baru yang mulus.', points: ['Manajemen lowongan kerja internal', 'Pipeline kandidat dengan kanban board', 'Penilaian & scoring kandidat', 'Penjadwalan wawancara terintegrasi', 'Checklist onboarding digital', 'Welcome kit & tugas onboarding karyawan baru'] },
  { id: 'ai', icon: '🤖', color: '#06B6D4', title: 'AI Capability Mapping', sub: 'Skill Gap Analysis · Talent Planning · AI Review', desc: 'Fitur unggulan berbasis kecerdasan buatan yang memetakan kompetensi dan potensi setiap karyawan. Identifikasi skill gap, rencanakan pengembangan, dan buat keputusan talent yang lebih cerdas.', points: ['Pemetaan kompetensi otomatis berbasis AI', 'Identifikasi skill gap per individu & tim', 'Rekomendasi pengembangan personalized', 'AI-generated performance review', 'Analisis potensi karyawan', 'Talent succession planning'] },
];

const s = {
  page: { fontFamily: 'Inter, system-ui, sans-serif' },
  nav: { padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', background: '#fff', position: 'sticky', top: 0, zIndex: 100 },
  hero: { textAlign: 'center', padding: '72px 24px 56px', background: 'linear-gradient(160deg, #EFF6FF 0%, #fff 60%)' },
  h1: { fontSize: 'clamp(28px,5vw,50px)', fontWeight: 900, color: '#0F172A', marginBottom: 16, lineHeight: 1.15 },
  lead: { fontSize: 18, color: '#64748B', maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.7 },
  pills: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 32 },
  pill: { padding: '6px 14px', borderRadius: 20, background: '#EFF6FF', color: '#0047AB', fontSize: 13, fontWeight: 600 },
  section: { maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' },
  featureSection: (_color) => ({ padding: '56px 0', borderBottom: '1px solid #F1F5F9' }),
  featureGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', maxWidth: 1000, margin: '0 auto' },
  featureIcon: (_color) => ({ width: 80, height: 80, borderRadius: 24, background: `${color}12`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 20 }),
  featureTitle: { fontSize: 28, fontWeight: 900, marginBottom: 6, color: '#0F172A' },
  featureSub: (_color) => ({ fontSize: 13, fontWeight: 700, color, marginBottom: 16 }),
  featureDesc: { fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 24 },
  featurePoints: { listStyle: 'none', padding: 0, margin: 0 },
  featurePoint: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', fontSize: 14, color: '#374151' },
  check: (_color) => ({ width: 20, height: 20, borderRadius: '50%', background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }),
  cta: { textAlign: 'center', margin: '72px 0 0', padding: '56px 24px', background: 'linear-gradient(135deg, #0047AB, #1D6AE5)', borderRadius: 24, maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' },
  ctaBtn: { display: 'inline-block', padding: '16px 40px', background: '#fff', color: '#0047AB', borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: 'none', marginTop: 16 },
};

export default function FiturPage() {
  useEffect(() => {
    updateSEOTags({
      title: 'Fitur HRIS Loka — Absensi GPS, Penggajian Otomatis, KPI, Rekrutmen',
      description: 'Fitur lengkap HRIS Loka: absensi GPS real-time dengan face recognition, penggajian otomatis BPJS & PPh 21, penilaian KPI, rekrutmen digital, AI Capability Mapping. Platform HR #1 Indonesia.',
      canonical: 'https://hrisloka.com/fitur',
      keywords: 'fitur HRIS Indonesia, absensi GPS karyawan, penggajian otomatis, penilaian KPI, rekrutmen digital, software HR lengkap, HRIS cloud Indonesia',
    });
    injectSchema('features-list', FEATURES_SCHEMA);
  }, []);

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link to="/" style={{ fontSize: 20, fontWeight: 900, color: '#0047AB', textDecoration: 'none' }}>HRIS Loka</Link>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link to="/fitur" style={{ fontSize: 14, color: '#0047AB', fontWeight: 700, textDecoration: 'none', borderBottom: '2px solid #0047AB', paddingBottom: 2 }}>Fitur</Link>
          <Link to="/harga" style={{ fontSize: 14, color: '#64748B', fontWeight: 600, textDecoration: 'none' }}>Harga</Link>
          <Link to="/login" style={{ padding: '8px 20px', background: '#0047AB', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Mulai Gratis</Link>
        </div>
      </nav>

      <header style={s.hero}>
        <h1 style={s.h1}>Semua Fitur HR dalam<br /><span style={{ color: '#0047AB' }}>Satu Platform</span></h1>
        <p style={s.lead}>HRIS Loka mengintegrasikan seluruh proses HR — dari absensi, penggajian, KPI, hingga rekrutmen — dalam satu sistem yang mudah digunakan oleh tim HR dan karyawan.</p>
        <div style={s.pills}>
          {['Absensi GPS Real-time', 'Penggajian Otomatis', 'Penilaian KPI', 'Rekrutmen Digital', 'AI Capability Mapping', 'Analitik HR'].map(p => (
            <span key={p} style={s.pill}>{p}</span>
          ))}
        </div>
        <Link to="/login" style={{ display: 'inline-block', padding: '14px 36px', background: '#0047AB', color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
          Coba Gratis 14 Hari →
        </Link>
      </header>

      <main style={s.section}>
        {FEATURES.map((feat, idx) => (
          <section key={feat.id} id={feat.id} style={s.featureSection(feat.color)} aria-label={feat.title}>
            <div style={{ ...s.featureGrid, direction: idx % 2 === 1 ? 'rtl' : 'ltr' }}>
              <div style={{ direction: 'ltr' }}>
                <div style={s.featureIcon(feat.color)}>{feat.icon}</div>
                <h2 style={s.featureTitle}>{feat.title}</h2>
                <p style={s.featureSub(feat.color)}>{feat.sub}</p>
                <p style={s.featureDesc}>{feat.desc}</p>
                <ul style={s.featurePoints}>
                  {feat.points.map(p => (
                    <li key={p} style={s.featurePoint}>
                      <div style={s.check(feat.color)}>✓</div>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ direction: 'ltr', background: `${feat.color}06`, borderRadius: 20, padding: 32, border: `1px solid ${feat.color}15`, minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: feat.color }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>{feat.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{feat.title}</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>{feat.sub}</div>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* CTA */}
        <div style={s.cta}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 12 }}>Mulai Gunakan HRIS Loka Hari Ini</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 8 }}>Gratis hingga 10 karyawan. Trial 14 hari untuk paket berbayar.</p>
          <Link to="/login" style={s.ctaBtn}>Daftar Gratis Sekarang →</Link>
          <div style={{ marginTop: 20 }}>
            <Link to="/harga" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecoration: 'underline' }}>Lihat semua paket harga</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
