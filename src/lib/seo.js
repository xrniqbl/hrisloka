/**
 * SEOHead — Dynamic meta tag manager untuk React SPA
 * 
 * Gunakan di setiap halaman publik (Landing, Install, Login)
 * untuk memberikan meta tag yang unik per-route.
 * 
 * Cara pakai:
 *   import { SEOHead } from '../lib/seo';
 *   <SEOHead page="landing" />
 * 
 * atau custom:
 *   <SEOHead
 *     title="Judul Halaman"
 *     description="Deskripsi halaman..."
 *     canonical="https://hrisloka.com/halaman"
 *   />
 */

const BASE_URL = 'https://hrisloka.com';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

// ─── Page-level SEO presets ──────────────────────────────────────────────────
const PAGE_SEO = {
  landing: {
    title: 'HRIS Loka — Software HR Modern untuk Perusahaan Indonesia',
    description: 'HRIS Loka adalah platform manajemen SDM (HRIS) terlengkap untuk perusahaan Indonesia. Absensi GPS real-time, penggajian otomatis, penilaian KPI, dan rekrutmen end-to-end. Starter Rp 75K/bln, Pro Rp 125K/bln.',
    canonical: `${BASE_URL}/`,
    ogType: 'website',
  },
  install: {
    title: 'Cara Install Aplikasi HRIS Loka di HP — Panduan Lengkap PWA',
    description: 'Panduan lengkap cara menginstal aplikasi HRIS Loka di Android dan iPhone (iOS) sebagai Progressive Web App. Tidak perlu Play Store — langsung dari browser, gratis.',
    canonical: `${BASE_URL}/install`,
    ogType: 'article',
    keywords: 'cara install HRIS, download aplikasi HR, HRIS mobile Android, HRIS iOS, install PWA HRIS',
  },
  login: {
    title: 'Masuk ke HRIS Loka — Login Portal HR & Karyawan',
    description: 'Masuk ke akun HRIS Loka Anda. Portal login untuk admin HR, manajer, dan karyawan. Akses dashboard manajemen SDM kapan saja, di mana saja.',
    canonical: `${BASE_URL}/login`,
    ogType: 'website',
    noindex: false, // biarkan terindex — brand searches
  },
  checkout: {
    title: 'Berlangganan HRIS Loka — Pilih Paket HR Terbaik untuk Tim Anda',
    description: 'Pilih paket HRIS Loka yang sesuai kebutuhan perusahaan Anda. Starter Rp 75.000/bulan, Pro Rp 125.000/bulan, Enterprise custom. Diskon 15% untuk langganan tahunan.',
    canonical: `${BASE_URL}/checkout`,
    ogType: 'website',
    keywords: 'harga HRIS Loka, paket HRIS, beli software HR, berlangganan HRIS Indonesia',
  },
};

/**
 * Update document head tags untuk SEO
 * Dipanggil dari komponen React dengan useEffect
 */
export function updateSEOTags({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  keywords,
  noindex = false,
  page,
}) {
  // Resolve preset jika `page` diberikan
  const preset = page ? PAGE_SEO[page] : null;
  const _title = title || preset?.title || 'HRIS Loka — Software HR Modern';
  const _desc = description || preset?.description || '';
  const _canonical = canonical || preset?.canonical || `${BASE_URL}/`;
  const _ogType = ogType || preset?.ogType || 'website';
  const _keywords = keywords || preset?.keywords || '';
  const _noindex = noindex ?? preset?.noindex ?? false;

  // ── Title ──────────────────────────────────────────────────────
  document.title = _title;

  // ── Helper: upsert meta tag ────────────────────────────────────
  const setMeta = (selector, attr, content) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      if (selector.includes('property')) {
        const prop = selector.match(/property="([^"]+)"/)?.[1];
        if (prop) el.setAttribute('property', prop);
      } else {
        const name = selector.match(/name="([^"]+)"/)?.[1];
        if (name) el.setAttribute('name', name);
      }
      document.head.appendChild(el);
    }
    el.setAttribute(attr, content);
  };

  // ── Helper: upsert link tag ────────────────────────────────────
  const setLink = (rel, href) => {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  };

  // ── Meta Basic ─────────────────────────────────────────────────
  setMeta('meta[name="description"]', 'content', _desc);
  if (_keywords) setMeta('meta[name="keywords"]', 'content', _keywords);
  setMeta('meta[name="robots"]', 'content',
    _noindex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
  );

  // ── Canonical ──────────────────────────────────────────────────
  setLink('canonical', _canonical);

  // ── Open Graph ─────────────────────────────────────────────────
  setMeta('meta[property="og:title"]', 'content', _title);
  setMeta('meta[property="og:description"]', 'content', _desc);
  setMeta('meta[property="og:type"]', 'content', _ogType);
  setMeta('meta[property="og:url"]', 'content', _canonical);
  setMeta('meta[property="og:image"]', 'content', ogImage);

  // ── Twitter Card ───────────────────────────────────────────────
  setMeta('meta[name="twitter:title"]', 'content', _title);
  setMeta('meta[name="twitter:description"]', 'content', _desc);
  setMeta('meta[name="twitter:image"]', 'content', ogImage);
}

/**
 * Inject JSON-LD schema ke dalam <head>
 * Aman dipanggil berulang — menggantikan script yang sudah ada
 */
export function injectSchema(id, schema) {
  let el = document.querySelector(`script[data-schema="${id}"]`);
  if (!el) {
    el = document.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.setAttribute('data-schema', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(schema, null, 2);
}

/**
 * Schema preset untuk setiap halaman
 */
export const SCHEMAS = {
  /**
   * Schema untuk halaman pricing / checkout
   * Target: "harga HRIS", "biaya software HR", "HRIS gratis Indonesia"
   */
  pricing: {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'HRIS Loka',
    description: 'Platform manajemen SDM (HRIS) modern untuk perusahaan Indonesia dengan fitur absensi GPS, penggajian otomatis, penilaian KPI, dan rekrutmen end-to-end.',
    url: 'https://hrisloka.com',
    brand: {
      '@type': 'Brand',
      name: 'HRIS Loka',
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Paket Starter',
        price: '75000',
        priceCurrency: 'IDR',
        description: 'Rp 75.000/bulan untuk hingga 50 karyawan. Manajemen karyawan, absensi digital, cuti, payroll dasar, dan PWA karyawan.',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        url: 'https://hrisloka.com/checkout',
        seller: { '@type': 'Organization', name: 'HRIS Loka' },
      },
      {
        '@type': 'Offer',
        name: 'Paket Pro',
        price: '125000',
        priceCurrency: 'IDR',
        description: 'Rp 125.000/bulan untuk hingga 200 karyawan. Absensi GPS real-time, penggajian otomatis, KPI, rekrutmen, AI Expense OCR, dan laporan lanjutan.',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        url: 'https://hrisloka.com/checkout',
        seller: { '@type': 'Organization', name: 'HRIS Loka' },
      },
      {
        '@type': 'Offer',
        name: 'Paket Enterprise',
        description: 'Harga custom untuk perusahaan besar. Karyawan tidak terbatas, custom integrasi API, dan dedicated account manager.',
        availability: 'https://schema.org/InStock',
        url: 'https://hrisloka.com/checkout',
        seller: { '@type': 'Organization', name: 'HRIS Loka' },
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '87',
      bestRating: '5',
      worstRating: '1',
    },
  },

  /**
   * Schema LocalBusiness — meningkatkan visibilitas Google Maps/local search
   * Target: "software HR Bandung", "HRIS perusahaan Jawa Barat"
   */
  localBusiness: {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'SoftwareApplication'],
    name: 'HRIS Loka',
    description: 'Platform Software HR (HRIS) modern untuk perusahaan Indonesia. Berbasis di Bandung, Jawa Barat.',
    url: 'https://hrisloka.com',
    telephone: '+6289512114437',
    email: 'hrisloka@gmail.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bandung',
      addressRegion: 'Jawa Barat',
      postalCode: '40000',
      addressCountry: 'ID',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -6.9175,
      longitude: 107.6191,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '08:00',
      closes: '17:00',
    },
    priceRange: 'Rp 75.000 - Custom',
    servesCuisine: null,
    currenciesAccepted: 'IDR',
    paymentAccepted: 'Bank Transfer, QRIS',
    sameAs: [
      'https://www.linkedin.com/company/hrisloka',
      'https://instagram.com/hrisloka',
    ],
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS',
  },

  /**
   * Schema ItemList — daftar fitur untuk Rich Results
   * Target: "fitur HRIS", "apa saja fitur software HR"
   */
  featureList: {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Fitur HRIS Loka',
    description: 'Daftar lengkap fitur platform manajemen SDM HRIS Loka untuk perusahaan Indonesia',
    numberOfItems: 7,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Manajemen Karyawan Terpusat',
        description: 'Database karyawan terpusat dengan profil lengkap, kontrak digital, dan riwayat employment.',
        url: 'https://hrisloka.com/landing#features',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Absensi GPS Real-time',
        description: 'Absensi karyawan berbasis GPS dengan geofencing, anti-fraud, dan laporan real-time.',
        url: 'https://hrisloka.com/landing#features',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Penggajian Otomatis',
        description: 'Perhitungan gaji, tunjangan, potongan BPJS, PPh 21, dan slip gaji digital otomatis.',
        url: 'https://hrisloka.com/landing#features',
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: 'Penilaian Kinerja KPI',
        description: 'Evaluasi 360 derajat, OKR tracking, dan laporan performa karyawan secara berkala.',
        url: 'https://hrisloka.com/landing#features',
      },
      {
        '@type': 'ListItem',
        position: 5,
        name: 'Rekrutmen & Onboarding',
        description: 'Pipeline rekrutmen end-to-end dari job posting, screening, hingga onboarding karyawan baru.',
        url: 'https://hrisloka.com/landing#features',
      },
      {
        '@type': 'ListItem',
        position: 6,
        name: 'AI Capability Mapping',
        description: 'Pemetaan kompetensi karyawan berbasis AI untuk perencanaan talent yang lebih akurat.',
        url: 'https://hrisloka.com/landing#technology',
      },
      {
        '@type': 'ListItem',
        position: 7,
        name: 'Analitik & Laporan Real-time',
        description: 'Dashboard analytics HR dengan visualisasi data untuk pengambilan keputusan strategis.',
        url: 'https://hrisloka.com/landing#features',
      },
    ],
  },

  /**
   * Schema HowTo — cara kerja software
   * Target: "cara menggunakan HRIS", "implementasi HRIS", "onboarding HRIS"
   */
  howTo: {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Cara Menggunakan HRIS Loka untuk Perusahaan Anda',
    description: 'Panduan langkah demi langkah untuk mulai menggunakan platform HRIS Loka dalam hitungan menit.',
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'IDR',
      value: '75000',
    },
    totalTime: 'PT5M',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Daftar & Setup Profil',
        text: 'Buat akun perusahaan gratis dan konfigurasi struktur organisasi, departemen, dan kebijakan HR dalam hitungan menit.',
        url: 'https://hrisloka.com/login',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Import Data Karyawan',
        text: 'Upload data karyawan secara massal via Excel atau input manual. Sistem langsung siap digunakan.',
        url: 'https://hrisloka.com/landing#how-it-works',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Jalankan Operasional HR',
        text: 'Gunakan fitur absensi GPS, pengajuan cuti, penggajian otomatis, dan penilaian kinerja setiap hari.',
        url: 'https://hrisloka.com/install',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Analisis & Optimalkan',
        text: 'Pantau dashboard analytics, buat laporan HR, dan buat keputusan berbasis data real-time.',
        url: 'https://hrisloka.com/landing#how-it-works',
      },
    ],
  },
};

export default { updateSEOTags, injectSchema, SCHEMAS, PAGE_SEO };
