/**
 * SEO utilities — dynamic meta + JSON-LD for SPA routes.
 *
 * Usage:
 *   import { updateSEOTags, injectSchema, markNoIndex } from '../lib/seo';
 *   updateSEOTags({ page: 'landing' });
 *   markNoIndex(); // private app shells
 */

import { CANONICAL_PLANS, formatPlanIDR } from './plans';

const BASE_URL = 'https://kinikerja.id';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.jpg`;
const BRAND = 'KiniKerja';

/** Prices from src/lib/plans.js CANONICAL_PLANS (single source of truth) */
const STARTER_PRICE = CANONICAL_PLANS.find((p) => p.slug === 'starter')?.price_monthly ?? 149000;
const PRO_PRICE = CANONICAL_PLANS.find((p) => p.slug === 'pro')?.price_monthly ?? 299000;
const PRICE_STARTER = String(STARTER_PRICE);
const PRICE_PRO = String(PRO_PRICE);
const PRICE_STARTER_LABEL = formatPlanIDR(STARTER_PRICE);
const PRICE_PRO_LABEL = formatPlanIDR(PRO_PRICE);

/** Centralized public contact links — use these instead of hardcoding wa.me URLs */
export const WA_NUMBER = '6289512114437';
export const waEnterpriseLink = (msg = 'Halo, saya tertarik dengan paket Enterprise KiniKerja.') =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

/** Canonical site URL — use this instead of hardcoding kinikerja.id */
export const SITE_URL = BASE_URL;

export const PAGE_SEO = {
  landing: {
    title: `${BRAND} — Software HR Modern untuk Perusahaan Indonesia | Mulai ${PRICE_STARTER_LABEL}/bulan`,
    description: `Platform HRIS terlengkap untuk perusahaan Indonesia. Absensi GPS, penggajian otomatis BPJS+PPh21, KPI, rekrutmen. Starter ${PRICE_STARTER_LABEL}/bln, Pro ${PRICE_PRO_LABEL}/bln. Setup 5 menit.`,
    canonical: `${BASE_URL}/`,
    ogType: 'website',
    keywords:
      'HRIS Indonesia, software HR, sistem HRD, absensi GPS, penggajian otomatis, payroll BPJS, KPI karyawan, rekrutmen digital',
  },
  install: {
    title: `Cara Install Aplikasi ${BRAND} di HP — Panduan PWA Android & iOS`,
    description: `Install ${BRAND} di Android dan iPhone tanpa Play Store. Progressive Web App untuk absensi GPS, slip gaji, dan cuti dari HP.`,
    canonical: `${BASE_URL}/install`,
    ogType: 'article',
    keywords: 'cara install HRIS, download aplikasi HR, HRIS mobile, install PWA',
  },
  login: {
    title: `Masuk ke ${BRAND} — Login Portal HR & Karyawan`,
    description: `Login portal ${BRAND} untuk admin HR, manajer, dan karyawan. Akses dashboard SDM kapan saja.`,
    canonical: `${BASE_URL}/login`,
    ogType: 'website',
    noindex: false,
  },
  checkout: {
    title: `Berlangganan ${BRAND} — Starter ${PRICE_STARTER_LABEL} · Pro ${PRICE_PRO_LABEL}`,
    description: `Pilih paket ${BRAND}: Starter ${PRICE_STARTER_LABEL}/bulan (25 karyawan), Pro ${PRICE_PRO_LABEL}/bulan (100 karyawan), Enterprise custom. Diskon 15% tahunan.`,
    canonical: `${BASE_URL}/checkout`,
    ogType: 'website',
    keywords: 'harga HRIS, paket software HR, berlangganan HRIS Indonesia',
  },
  harga: {
    title: `Harga ${BRAND} ${new Date().getFullYear()} — Paket Software HR Indonesia`,
    description: `Daftar harga ${BRAND}: Starter ${PRICE_STARTER_LABEL}/bln, Pro ${PRICE_PRO_LABEL}/bln, Enterprise custom. Bandingkan fitur absensi, payroll, KPI.`,
    canonical: `${BASE_URL}/harga`,
    ogType: 'website',
    keywords: 'harga HRIS Indonesia, biaya software HR, paket HRIS murah',
  },
  fitur: {
    title: `Fitur ${BRAND} — Absensi GPS, Payroll, KPI & Rekrutmen`,
    description: `Fitur lengkap ${BRAND}: manajemen karyawan, absensi GPS geofence, penggajian BPJS/PPh21, cuti, KPI, rekrutmen, PWA karyawan.`,
    canonical: `${BASE_URL}/fitur`,
    ogType: 'website',
    keywords: 'fitur HRIS, absensi GPS karyawan, software payroll Indonesia',
  },
  privacy: {
    title: `Kebijakan Privasi — ${BRAND}`,
    description: `Kebijakan privasi dan perlindungan data pengguna ${BRAND}. Multi-tenant isolation, enkripsi, dan kontrol akses berbasis peran.`,
    canonical: `${BASE_URL}/privacy`,
    ogType: 'website',
  },
  blog: {
    title: `Blog ${BRAND} — Tips HR, Payroll & Digitalisasi SDM`,
    description: `Artikel seputar manajemen SDM, absensi, payroll, dan digitalisasi HR untuk perusahaan Indonesia.`,
    canonical: `${BASE_URL}/blog`,
    ogType: 'website',
  },
};

function setMeta(selector, attr, content) {
  if (content == null || content === '') return;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    if (selector.includes('property=')) {
      const prop = selector.match(/property="([^"]+)"/)?.[1];
      if (prop) el.setAttribute('property', prop);
    } else {
      const name = selector.match(/name="([^"]+)"/)?.[1];
      if (name) el.setAttribute('name', name);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, content);
}

function setLink(rel, href, extra = {}) {
  if (!href) return;
  let el;
  if (extra.hreflang) {
    el = document.querySelector(`link[rel="${rel}"][hreflang="${extra.hreflang}"]`);
  } else if (rel === 'canonical') {
    el = document.querySelector('link[rel="canonical"]');
  } else {
    el = document.querySelector(`link[rel="${rel}"]`);
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (extra.hreflang) el.setAttribute('hreflang', extra.hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Update document head for public marketing / auth pages.
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
  jsonLd,
} = {}) {
  const preset = page ? PAGE_SEO[page] : null;
  const _title = title || preset?.title || `${BRAND} — Software HR Modern`;
  const _desc = description || preset?.description || '';
  const _canonical = canonical || preset?.canonical || `${BASE_URL}/`;
  const _ogType = ogType || preset?.ogType || 'website';
  const _keywords = keywords || preset?.keywords || '';
  const _noindex = noindex ?? preset?.noindex ?? false;

  document.title = _title;

  setMeta('meta[name="description"]', 'content', _desc);
  if (_keywords) setMeta('meta[name="keywords"]', 'content', _keywords);
  setMeta(
    'meta[name="robots"]',
    'content',
    _noindex
      ? 'noindex, nofollow, noarchive'
      : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
  );
  setMeta('meta[name="googlebot"]', 'content', _noindex ? 'noindex, nofollow' : 'index, follow');

  setLink('canonical', _canonical);
  setLink('alternate', _canonical, { hreflang: 'id' });
  setLink('alternate', _canonical, { hreflang: 'x-default' });

  setMeta('meta[property="og:title"]', 'content', _title);
  setMeta('meta[property="og:description"]', 'content', _desc);
  setMeta('meta[property="og:type"]', 'content', _ogType);
  setMeta('meta[property="og:url"]', 'content', _canonical);
  setMeta('meta[property="og:image"]', 'content', ogImage);
  setMeta('meta[property="og:image:alt"]', 'content', `${BRAND} — Software HR Indonesia`);
  setMeta('meta[property="og:locale"]', 'content', 'id_ID');
  setMeta('meta[property="og:site_name"]', 'content', BRAND);

  setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
  setMeta('meta[name="twitter:title"]', 'content', _title);
  setMeta('meta[name="twitter:description"]', 'content', _desc);
  setMeta('meta[name="twitter:image"]', 'content', ogImage);

  if (jsonLd) injectSchema('page-dynamic', jsonLd);
}

/** Force noindex for authenticated app shells (dashboard, founder, PWA). */
export function markNoIndex(title = `${BRAND} — App`) {
  document.title = title;
  setMeta('meta[name="robots"]', 'content', 'noindex, nofollow, noarchive');
  setMeta('meta[name="googlebot"]', 'content', 'noindex, nofollow');
}

export function injectSchema(id, schema) {
  if (!id || !schema) return;
  let el = document.querySelector(`script[data-schema="${id}"]`);
  if (!el) {
    el = document.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.setAttribute('data-schema', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(schema);
}

export const SCHEMAS = {
  pricing: {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: BRAND,
    description:
      'Platform manajemen SDM (HRIS) modern untuk perusahaan Indonesia: absensi GPS, penggajian otomatis, KPI, rekrutmen.',
    url: BASE_URL,
    brand: { '@type': 'Brand', name: BRAND },
    offers: [
      {
        '@type': 'Offer',
        name: 'Paket Starter',
        price: PRICE_STARTER,
        priceCurrency: 'IDR',
        description: `${PRICE_STARTER_LABEL}/bulan hingga 25 karyawan.`,
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        url: `${BASE_URL}/checkout`,
      },
      {
        '@type': 'Offer',
        name: 'Paket Pro',
        price: PRICE_PRO,
        priceCurrency: 'IDR',
        description: `${PRICE_PRO_LABEL}/bulan hingga 100 karyawan.`,
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        url: `${BASE_URL}/checkout`,
      },
    ],
  },
};

export default { updateSEOTags, injectSchema, markNoIndex, SCHEMAS, PAGE_SEO, BASE_URL, SITE_URL, WA_NUMBER, waEnterpriseLink };
