/**
 * Canonical subscription plans — single source of truth for UI + fallbacks.
 * DB `subscription_plans` overrides when available; keep these in sync.
 *
 * Yearly = monthly × 12 × (1 − YEARLY_DISCOUNT).
 */
export const YEARLY_DISCOUNT_PERCENT = 15;

export const PLAN_SLUGS = {
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

/** Official list (IDR). Enterprise = custom / contact sales. */
export const CANONICAL_PLANS = [
  {
    id: 'starter',
    slug: 'starter',
    name: 'Starter',
    is_active: true,
    sort_order: 1,
    price_monthly: 149000,
    price_yearly: Math.round(149000 * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100)),
    max_employees: 25,
    description: 'Ideal untuk bisnis yang mulai berkembang.',
    features: [
      'Hingga 25 karyawan',
      'Absensi & Cuti digital',
      'Payroll dasar',
      'PWA Karyawan',
      'Email support',
    ],
    badge: null,
    color: '#635BFF',
    duration_days_monthly: 30,
    duration_days_yearly: 365,
  },
  {
    id: 'pro',
    slug: 'pro',
    name: 'Pro',
    is_active: true,
    sort_order: 2,
    price_monthly: 299000,
    price_yearly: Math.round(299000 * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100)),
    max_employees: 100,
    description: 'Solusi lengkap untuk perusahaan dengan kebutuhan HR profesional.',
    features: [
      'Hingga 100 karyawan',
      'Semua fitur Starter',
      'Perekrutan & KPI',
      'Geofence Attendance',
      'AI Expense OCR',
      'Laporan lanjutan',
      'Priority support',
    ],
    badge: 'Paling Populer',
    color: '#4F46E5',
    duration_days_monthly: 30,
    duration_days_yearly: 365,
  },
  {
    id: 'enterprise',
    slug: 'enterprise',
    name: 'Enterprise',
    is_active: true,
    sort_order: 3,
    price_monthly: null,
    price_yearly: null,
    max_employees: 9999,
    description: 'Solusi skala enterprise dengan kustomisasi penuh dan dedicated support.',
    features: [
      'Karyawan unlimited',
      'Semua fitur Pro',
      'Custom integration',
      'Dedicated support',
      'SLA 99.9%',
      'On-premise option',
    ],
    badge: 'Hubungi Sales',
    color: '#1a1a2e',
    duration_days_monthly: 30,
    duration_days_yearly: 365,
  },
];

export function getYearlyPrice(priceMonthly) {
  if (priceMonthly === null || priceMonthly === undefined) return null;
  return Math.round(Number(priceMonthly) * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100));
}

export function getPlanPrice(plan, billingCycle = 'monthly') {
  if (!plan || plan.price_monthly === null || plan.price_monthly === undefined) return null;
  if (billingCycle === 'yearly') return getYearlyPrice(plan.price_monthly);
  return plan.price_monthly;
}

export function formatPlanIDR(amount) {
  if (amount === null || amount === undefined) return 'Custom';
  if (amount === 0) return 'Gratis';
  return `Rp ${Number(amount).toLocaleString('id-ID')}`;
}

/** Short marketing label e.g. "Rp 149K" */
export function formatPlanIDRShort(amount) {
  if (amount === null || amount === undefined) return 'Custom';
  if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)}K`;
  return formatPlanIDR(amount);
}

export function getPlanBySlug(slug) {
  return CANONICAL_PLANS.find((p) => p.slug === slug) || null;
}
