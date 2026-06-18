import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateSEOTags, injectSchema } from '../lib/seo';

const ARTICLES = [
  {
    slug: 'apa-itu-hris',
    title: 'Apa itu HRIS? Panduan Lengkap untuk Perusahaan Indonesia 2026',
    excerpt: 'HRIS (Human Resource Information System) adalah sistem digital yang mengintegrasikan seluruh proses HR. Pelajari manfaat, fitur, dan cara memilih HRIS yang tepat.',
    category: 'Panduan',
    readTime: '8 menit',
    date: '2026-05-20',
    keywords: ['apa itu HRIS', 'HRIS adalah', 'sistem HR digital'],
    content: `
      <h2>Apa itu HRIS?</h2>
      <p>HRIS (Human Resource Information System) atau Sistem Informasi Sumber Daya Manusia adalah platform perangkat lunak yang mengintegrasikan seluruh proses manajemen HR dalam satu sistem terpusat. Dengan HRIS, perusahaan dapat mengelola data karyawan, absensi, penggajian, rekrutmen, dan penilaian kinerja secara digital dan efisien.</p>

      <h2>Mengapa Perusahaan Indonesia Butuh HRIS?</h2>
      <p>Di era digital ini, pengelolaan HR secara manual dengan spreadsheet Excel sangat tidak efisien dan rentan kesalahan. HRIS modern seperti HRIS Loka hadir untuk membantu perusahaan Indonesia naik kelas dengan:</p>
      <ul>
        <li><strong>Hemat waktu:</strong> Proses penggajian yang butuh berhari-hari jadi hanya 1 klik</li>
        <li><strong>Minim error:</strong> Perhitungan otomatis BPJS, PPh 21, lembur</li>
        <li><strong>Real-time:</strong> Absensi GPS langsung terdata tanpa perlu rekap manual</li>
        <li><strong>Compliance:</strong> Otomatis sesuai regulasi ketenagakerjaan Indonesia</li>
      </ul>

      <h2>Fitur Utama HRIS Modern</h2>
      <p>Platform HRIS terbaik untuk perusahaan Indonesia wajib memiliki:</p>
      <ul>
        <li>Manajemen data karyawan terpusat</li>
        <li>Absensi GPS real-time dengan geofencing</li>
        <li>Penggajian otomatis dengan kalkulasi BPJS & PPh 21</li>
        <li>Manajemen cuti & izin digital</li>
        <li>Rekrutmen & onboarding end-to-end</li>
        <li>Penilaian kinerja KPI & 360 derajat</li>
        <li>Laporan HR real-time</li>
      </ul>

      <h2>Berapa Biaya HRIS untuk Perusahaan Indonesia?</h2>
      <p>HRIS Loka menawarkan harga yang sangat terjangkau mulai dari <strong>Rp 75.000/bulan</strong> untuk paket Starter (hingga 50 karyawan) dan <strong>Rp 125.000/bulan</strong> untuk paket Pro (hingga 200 karyawan). Berlangganan tahunan mendapat diskon 15%.</p>
    `,
  },
  {
    slug: 'absensi-karyawan-digital',
    title: 'Sistem Absensi Karyawan Digital: Manfaat & Cara Implementasi 2026',
    excerpt: 'Absensi karyawan digital dengan GPS geofencing membantu perusahaan menghilangkan fraud absensi dan meningkatkan akurasi payroll hingga 100%.',
    category: 'Tips HR',
    readTime: '6 menit',
    date: '2026-05-22',
    keywords: ['absensi karyawan digital', 'sistem absensi online', 'absensi GPS'],
    content: `
      <h2>Masalah Absensi Manual yang Sering Terjadi</h2>
      <p>Sistem absensi manual menghadapi berbagai masalah: titip absen, rekap yang lambat, data tidak akurat, hingga kesulitan memantau karyawan WFH atau lapangan. Inilah mengapa sistem absensi digital menjadi kebutuhan wajib perusahaan modern Indonesia.</p>

      <h2>Keunggulan Absensi GPS dengan Geofencing</h2>
      <p>Absensi GPS real-time seperti yang ada di HRIS Loka memiliki keunggulan:</p>
      <ul>
        <li>Verifikasi lokasi otomatis — karyawan hanya bisa absen di dalam radius yang ditentukan</li>
        <li>Anti fraud — tidak bisa titip absen karena pakai GPS + selfie</li>
        <li>Real-time dashboard — HRD langsung lihat siapa yang belum absen</li>
        <li>Otomatis terhubung ke payroll — potongan terlambat/alpha dihitung otomatis</li>
      </ul>

      <h2>Cara Implementasi Absensi Digital di Perusahaan</h2>
      <p>Implementasi HRIS Loka untuk absensi digital hanya butuh 3 langkah: (1) Daftar dan setup profil perusahaan, (2) Import data karyawan, (3) Karyawan install PWA di smartphone. Selesai dalam 5 menit!</p>
    `,
  },
  {
    slug: 'penggajian-otomatis-bpjs',
    title: 'Cara Hitung Gaji Karyawan Otomatis dengan Potongan BPJS & PPh 21',
    excerpt: 'Panduan lengkap menghitung gaji karyawan di Indonesia termasuk BPJS Ketenagakerjaan, BPJS Kesehatan, PPh 21, dan lembur — semuanya bisa otomatis dengan HRIS.',
    category: 'Payroll',
    readTime: '10 menit',
    date: '2026-05-24',
    keywords: ['penggajian otomatis', 'hitung gaji BPJS PPh21', 'payroll Indonesia'],
    content: `
      <h2>Komponen Gaji Karyawan di Indonesia</h2>
      <p>Penggajian karyawan di Indonesia melibatkan banyak komponen yang harus dihitung dengan akurat:</p>
      <ul>
        <li>Gaji pokok</li>
        <li>Tunjangan tetap (transport, makan, jabatan)</li>
        <li>Uang lembur sesuai aturan Kemnaker</li>
        <li>BPJS Ketenagakerjaan (JHT 2%, JP 1%, JKK 0.24%, JKM 0.3%)</li>
        <li>BPJS Kesehatan (1% ditanggung karyawan)</li>
        <li>PPh 21 (progressive sesuai PTKP)</li>
      </ul>

      <h2>Mengapa Penggajian Manual Berisiko?</h2>
      <p>Kesalahan hitung penggajian bisa berakibat fatal: sanksi dari BPJS, protes karyawan, hingga masalah hukum. Dengan HRIS Loka, semua perhitungan dilakukan otomatis dan akurat sesuai regulasi terbaru.</p>

      <h2>Fitur Payroll HRIS Loka</h2>
      <p>Modul payroll HRIS Loka mengkalkulasi seluruh komponen gaji secara otomatis, menghasilkan slip gaji digital, dan bisa langsung transfer ke rekening karyawan. Hemat waktu tim HR hingga 80%.</p>
    `,
  },
  {
    slug: 'software-hr-terbaik-indonesia',
    title: '5 Software HR Terbaik untuk Perusahaan Indonesia 2026',
    excerpt: 'Perbandingan software HR Indonesia terbaik: fitur, harga, dan keunggulan. Temukan mana yang paling sesuai untuk kebutuhan perusahaan Anda.',
    category: 'Review',
    readTime: '12 menit',
    date: '2026-05-26',
    keywords: ['software HR terbaik Indonesia', 'aplikasi HR perusahaan', 'HRIS terbaik'],
    content: `
      <h2>Kriteria Memilih Software HR Terbaik</h2>
      <p>Dalam memilih software HR untuk perusahaan Indonesia, perhatikan: (1) Lengkap fiturnya, (2) Harga terjangkau, (3) Mudah digunakan, (4) Support bahasa Indonesia, (5) Comply dengan regulasi Indonesia.</p>

      <h2>Kenapa HRIS Loka Unggul?</h2>
      <p>HRIS Loka dirancang khusus untuk perusahaan Indonesia dengan mempertimbangkan regulasi lokal, bahasa Indonesia, dan kebutuhan spesifik HR di Indonesia seperti BPJS, PPh 21, dan aturan Kemnaker.</p>
      <ul>
        <li>✅ Harga mulai Rp 75.000/bulan — paling terjangkau</li>
        <li>✅ Bahasa Indonesia penuh</li>
        <li>✅ Absensi GPS geofencing anti fraud</li>
        <li>✅ Payroll otomatis BPJS & PPh 21</li>
        <li>✅ PWA — bisa diinstall di HP tanpa app store</li>
        <li>✅ Support WhatsApp langsung</li>
      </ul>
    `,
  },
];

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Blog HRIS Loka — Tips & Panduan HR Indonesia',
  description: 'Artikel, panduan, dan tips seputar manajemen SDM, absensi digital, payroll, dan software HR untuk perusahaan Indonesia.',
  url: 'https://hrisloka.com/blog',
  publisher: {
    '@type': 'Organization',
    name: 'HRIS Loka',
    logo: { '@type': 'ImageObject', url: 'https://hrisloka.com/landing/hrislokabluepanjang.png' },
  },
  blogPost: ARTICLES.map(a => ({
    '@type': 'BlogPosting',
    headline: a.title,
    description: a.excerpt,
    url: `https://hrisloka.com/blog/${a.slug}`,
    datePublished: a.date,
    author: { '@type': 'Organization', name: 'HRIS Loka' },
    keywords: a.keywords.join(', '),
  })),
};

const s = {
  nav: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', background: '#fff', position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', gap: 8 },
  logo: { fontSize: 20, fontWeight: 900, color: '#0047AB', textDecoration: 'none' },
  hero: { background: 'linear-gradient(135deg, #EFF6FF 0%, #fff 60%)', padding: '60px 20px 48px', textAlign: 'center' },
  h1: { fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: '#0F172A', marginBottom: 12, lineHeight: 1.2 },
  sub: { fontSize: 17, color: '#475569', maxWidth: 580, margin: '0 auto', lineHeight: 1.6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24, maxWidth: 1100, margin: '0 auto', padding: '48px 20px 80px' },
  card: { background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', cursor: 'pointer' },
  cardImg: { height: 8, background: 'linear-gradient(135deg, #0047AB, #3B82F6)' },
  cardBody: { padding: 24, flex: 1, display: 'flex', flexDirection: 'column' },
  category: { fontSize: 11, fontWeight: 800, color: '#0047AB', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: 800, color: '#0F172A', marginBottom: 10, lineHeight: 1.4 },
  cardExcerpt: { fontSize: 14, color: '#64748B', lineHeight: 1.6, flex: 1 },
  meta: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, fontSize: 12, color: '#94A3B8' },
  readMore: { display: 'inline-block', marginTop: 16, color: '#0047AB', fontWeight: 700, fontSize: 14, textDecoration: 'none' },
  cta: { background: 'linear-gradient(135deg, #0047AB, #1D6AE5)', padding: '56px 24px', textAlign: 'center' },
};

export default function Blog() {
  useEffect(() => {
    updateSEOTags({
      title: 'Blog HR Indonesia — Tips Manajemen SDM, Payroll & Absensi | HRIS Loka',
      description: 'Artikel & panduan HR terlengkap untuk perusahaan Indonesia: cara hitung gaji BPJS PPh21, sistem absensi digital, software HR terbaik, implementasi HRIS. Gratis dibaca!',
      canonical: 'https://hrisloka.com/blog',
      keywords: 'blog HR Indonesia, panduan HRIS, tips manajemen SDM, cara hitung gaji BPJS, software HR Indonesia',
    });
    injectSchema('blog-page', SCHEMA);
  }, []);

  return (
    <>
      <nav style={s.nav}>
        <Link to="/" style={s.logo}>HRIS Loka</Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/harga" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>Harga</Link>
          <Link to="/blog" style={{ fontSize: 14, color: '#0047AB', textDecoration: 'none', fontWeight: 700, borderBottom: '2px solid #0047AB', paddingBottom: 2 }}>Blog</Link>
          <Link to="/checkout" style={{ padding: '8px 20px', background: '#0047AB', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Mulai Sekarang</Link>
        </div>
      </nav>

      <header style={s.hero}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#0047AB', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Blog & Sumber Daya HR</div>
        <h1 style={s.h1}>Tips & Panduan HR untuk Perusahaan Indonesia</h1>
        <p style={s.sub}>Artikel praktis seputar manajemen SDM, penggajian, absensi digital, dan software HR — ditulis khusus untuk konteks bisnis Indonesia.</p>
      </header>

      <main>
        <div style={s.grid}>
          {ARTICLES.map((article, i) => (
            <article key={i} style={s.card}>
              <div style={{ ...s.cardImg, background: i % 2 === 0 ? 'linear-gradient(135deg, #0047AB, #3B82F6)' : 'linear-gradient(135deg, #7C3AED, #A855F7)' }} />
              <div style={s.cardBody}>
                <div style={s.category}>{article.category} · {article.readTime} baca</div>
                <h2 style={s.cardTitle}>{article.title}</h2>
                <p style={s.cardExcerpt}>{article.excerpt}</p>
                <div style={s.meta}>
                  <span>📅 {new Date(article.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <Link to={`/blog/${article.slug}`} style={s.readMore}>Baca selengkapnya →</Link>
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div style={s.cta}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 12 }}>Siap Digitalisasi HR Perusahaan Anda?</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 28, fontSize: 16 }}>Mulai dengan paket Starter hanya Rp 75.000/bulan. Tanpa kontrak, batalkan kapan saja.</p>
          <Link to="/checkout" style={{ display: 'inline-block', padding: '14px 36px', background: '#fff', color: '#0047AB', borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>
            Coba HRIS Loka Sekarang →
          </Link>
        </div>
      </main>
    </>
  );
}

// Export article data for use in BlogPost page
export { ARTICLES };
