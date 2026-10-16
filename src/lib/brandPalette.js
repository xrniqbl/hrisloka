/**
 * Brand-monochrome palette — UI accents stay in the primary (cobalt) family.
 * True semantic status (success/danger) only for approve/reject/error states.
 */

export const BRAND = {
  primary: '#5654D4',
  primaryDark: '#4543C0',
  primaryHover: '#4A48C4',
  primarySoft: '#F4F3FB',
  primaryMid: '#E8E6F5',
  /** Decorative tints of primary (charts, avatars, KPI steps) */
  scale: [
    '#3730A3',
    '#4543C0',
    '#5654D4',
    '#7C75FF',
    '#A5A0FF',
    '#C4C0FF',
    '#E0DEFF',
    '#F4F3FB',
  ],
  /** Soft fills matching scale */
  soft: [
    'rgba(55,48,163,0.10)',
    'rgba(69,67,192,0.10)',
    'rgba(86,84,212,0.10)',
    'rgba(124,117,255,0.12)',
    'rgba(165,160,255,0.14)',
    'rgba(196,192,255,0.16)',
    'rgba(224,222,255,0.40)',
    'rgba(244,243,251,0.90)',
  ],
  success: '#16A34A',
  successSoft: 'rgba(22,163,74,0.10)',
  danger: '#DC2626',
  dangerSoft: 'rgba(220,38,38,0.10)',
  warning: '#D97706',
  warningSoft: 'rgba(217,119,6,0.10)',
  muted: '#6B7280',
  text: '#111827',
};

/** Avatar / list accent — always brand-adjacent, never rainbow */
export function brandAvatarColor(seed = '') {
  const s = String(seed || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % 5; // first 5 of scale (stronger colors)
  return BRAND.scale[idx];
}

export function brandAvatarSoft(seed = '') {
  const s = String(seed || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % 5;
  return BRAND.soft[idx];
}

/** Chart.js / pie colors — primary family only */
export function brandChartColors(n = 6) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(BRAND.scale[i % BRAND.scale.length]);
  return out;
}

/** KPI step tint by index (0..n) — monochrome primary */
export function brandKpiTone(index = 0) {
  const tones = [
    { key: 'p1', color: BRAND.primary, soft: BRAND.soft[2] },
    { key: 'p2', color: BRAND.primaryDark, soft: BRAND.soft[1] },
    { key: 'p3', color: BRAND.scale[3], soft: BRAND.soft[3] },
    { key: 'p4', color: BRAND.scale[0], soft: BRAND.soft[0] },
    { key: 'p5', color: BRAND.scale[4], soft: BRAND.soft[4] },
    { key: 'p6', color: BRAND.scale[2], soft: BRAND.soft[2] },
  ];
  return tones[index % tones.length];
}
