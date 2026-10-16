/**
 * api/_shared/tenantAuth.js — Tenant-scoped caller resolution + user rate limit.
 *
 * H1 mitigation: endpoints that spend provider quota (Fonnte/Brevo/Gemini)
 * must not trust "any confirmed user". They must resolve the caller's
 * employee row and enforce same-tenant recipients server-side.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Resolve the tenant caller from the Bearer Supabase JWT.
 * FAIL-CLOSED: missing env, missing/invalid token, or lookup failure
 * all reject — never allow.
 *
 * @returns {Promise<{user, employee:{id,company_id,role}}|{error:'unauthorized'|'no_employee'}>}
 */
export async function resolveTenantCaller(req) {
  const authHeader = req?.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'unauthorized' };
  }
  const token = authHeader.split(' ')[1];
  if (!token) return { error: 'unauthorized' };
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return { error: 'unauthorized' };

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_SERVICE_KEY },
    });
    if (!res.ok) return { error: 'unauthorized' };
    const user = await res.json();
    const uid = user?.id || user?.sub;
    if (!uid) return { error: 'unauthorized' };

    const empRes = await fetch(
      `${SUPABASE_URL}/rest/v1/employees?auth_user_id=eq.${encodeURIComponent(uid)}&select=id,company_id,role,email`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      },
    );
    if (!empRes.ok) return { error: 'unauthorized' };
    const rows = await empRes.json().catch(() => []);
    const employee = Array.isArray(rows) ? rows[0] : null;
    if (!employee?.id) return { error: 'no_employee' };

    return {
      user,
      employee: { id: employee.id, company_id: employee.company_id ?? null, role: employee.role ?? 'employee' },
    };
  } catch {
    return { error: 'unauthorized' };
  }
}

// NOTE: lapisan mitigasi per-instance (in-memory Map). Di serverless tiap
// instance punya map sendiri sehingga ini BUKAN batas keras global —
// jangan diandalkan sebagai satu-satunya kuota; melainkan untuk menaikkan
// biaya serangan spam/phishing dari satu akun yang bocor.
const userRateLimitMap = new Map();

/**
 * Generic per-key rate limit. Returns true when the call may proceed.
 */
export function checkUserRateLimit(key, max, windowMs) {
  const now = Date.now();
  const entry = userRateLimitMap.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    userRateLimitMap.set(key, { count: 1, start: now });
    return true;
  }
  entry.count += 1;
  userRateLimitMap.set(key, entry);
  return entry.count <= max;
}

/**
 * Normalisasi telepon Indonesia (disalin dari send-whatsapp.js agar
 * perbandingan recipient konsisten): strip spasi/dash/kurung, 0xxx -> 62xxx.
 */
export function normalizePhone(phone) {
  if (typeof phone !== 'string') return '';
  return phone
    .replace(/[\s\-()]/g, '')
    .replace(/^0/, '62')
    .replace(/^\+/, '');
}
