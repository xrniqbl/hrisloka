/**
 * /api/send-email.js — VPS API handler (server/index.js)
 *
 * Mengirim email via Brevo (Sendinblue) Transactional API.
 * API key hanya di server. Frontend: POST /api/send-email { type, to, ... }
 *
 * type: 'leave_approval' | 'payslip' | 'reimbursement'
 *
 * Env: BREVO_API_KEY, FROM_EMAIL, FROM_NAME (optional)
 */
import { applyCors } from './_shared/cors.js';
import { enforceJsonBodyLimit } from './_shared/securityHeaders.js';
import { resolveTenantCaller, checkUserRateLimit } from './_shared/tenantAuth.js';

const BREVO_API_KEY =
  process.env.BREVO_API_KEY ||
  process.env.BREVO_SMTP_KEY ||
  process.env.RESEND_API_KEY; // migration alias (optional)
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.BREVO_SENDER_EMAIL || 'noreply@kinikerja.id';
const FROM_NAME = process.env.FROM_NAME || process.env.BREVO_SENDER_NAME || 'KiniKerja';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Roles allowed to trigger transactional email (all email types —
// leave/payslip/reimbursement — go to employees and are HR/manager
// initiated). Deliberately no super_admin-only arbitrary exception:
// there is no legitimate "send test email anywhere" flow (the
// IntegrationHub email check is a non-sending probe).
const ALLOWED_ROLES = new Set(['super_admin', 'hr_admin', 'admin', 'hr', 'manager', 'finance']);

/** Parse "Name <email@x.com>" or plain email into Brevo sender object */
function resolveSender() {
  const raw = String(FROM_EMAIL || '').trim();
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: (match[1] || FROM_NAME).trim() || FROM_NAME,
      email: match[2].trim(),
    };
  }
  return { name: FROM_NAME, email: raw };
}

// Rate limit: max 10 email requests per IP per minute
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const window = 60_000;
  const max = 10;
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > window) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count <= max;
}

// Caller auth via resolveTenantCaller from _shared/tenantAuth.js
// (tenant-bound employee row + role check, fail-closed).

// Simple email format validation
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

// Sanitize string: strip tags, limit length
function sanitizeStr(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  // Loop until stable: single-pass strip is bypassable with nested payloads
  // (e.g. <<script>script> leaves a tag after one pass).
  let out = val;
  for (let i = 0; i < 5; i++) {
    const next = out.replace(/<[^>]*>/g, '');
    if (next === out) break;
    out = next;
  }
  return esc(out.slice(0, maxLen));
}

// HTML-escape for email builders (defense in depth: builders escape their own
// interpolations so safety never depends on callers pre-sanitizing).
function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Send transactional email via Brevo REST API.
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 */
async function sendViaBrevo({ to, subject, html, text }) {
  if (!BREVO_API_KEY) {
    console.error('[send-email] BREVO_API_KEY not set on server');
    return { success: false, error: 'Server email not configured (set BREVO_API_KEY)' };
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .filter(Boolean)
    .map((email) => ({ email: String(email).trim() }));

  if (recipients.length === 0) {
    return { success: false, error: 'No recipients' };
  }

  const sender = resolveSender();
  const body = {
    sender,
    to: recipients,
    subject,
    htmlContent: html || undefined,
    textContent: text || undefined,
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      (Array.isArray(data?.code) ? data.code.join(', ') : data?.code) ||
      `Brevo error HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  // Brevo returns { messageId: "<...>" }
  return { success: true, id: data.messageId || data.messageIds?.[0] || null, provider: 'brevo' };
}

function buildLeaveEmail({ employeeName, status, leaveType, startDate, endDate, notes }) {
  const statusLabel = status === 'approved' ? 'Disetujui ✅' : 'Ditolak ❌';
  const statusColor = status === 'approved' ? '#16A34A' : '#DC2626';
  return {
    subject: `[KiniKerja] Pengajuan Cuti ${statusLabel}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <div style="background:linear-gradient(135deg,#0047AB,#2563eb);padding:24px;border-radius:16px 16px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">KiniKerja</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Human Resource Information System</p>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:24px">
          <p style="margin:0 0 16px">Halo, <strong>${esc(employeeName)}</strong>,</p>
          <p>Pengajuan cuti kamu telah diproses:</p>
          <div style="background:#F9FAFB;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid ${statusColor}">
            <div style="font-size:18px;font-weight:700;color:${statusColor};margin-bottom:12px">${statusLabel}</div>
            <table style="width:100%;font-size:13px;color:#374151">
              <tr><td style="padding:4px 0;color:#6B7280">Jenis Cuti</td><td style="font-weight:600">${esc(leaveType)}</td></tr>
              <tr><td style="padding:4px 0;color:#6B7280">Tanggal Mulai</td><td style="font-weight:600">${esc(startDate)}</td></tr>
              <tr><td style="padding:4px 0;color:#6B7280">Tanggal Selesai</td><td style="font-weight:600">${esc(endDate)}</td></tr>
              ${notes ? `<tr><td style="padding:4px 0;color:#6B7280;vertical-align:top">Catatan</td><td style="font-weight:600">${esc(notes)}</td></tr>` : ''}
            </table>
          </div>
          <p style="font-size:12px;color:#9CA3AF;margin-top:24px">Email ini dikirim otomatis oleh KiniKerja. Jangan balas email ini.</p>
        </div>
      </div>
    `,
    text: `Halo ${esc(employeeName)}, pengajuan cuti kamu ${statusLabel}. Jenis: ${esc(leaveType)}, ${esc(startDate)} — ${esc(endDate)}.`,
  };
}

function buildPayslipEmail({ employeeName, month, year, netSalary }) {
  return {
    subject: `[KiniKerja] Slip Gaji ${esc(month)} ${esc(year)} Tersedia`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <div style="background:linear-gradient(135deg,#0047AB,#2563eb);padding:24px;border-radius:16px 16px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">KiniKerja</h1>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:24px">
          <p>Halo, <strong>${esc(employeeName)}</strong>,</p>
          <p>Slip gaji kamu untuk periode <strong>${esc(month)} ${esc(year)}</strong> sudah tersedia.</p>
          <div style="background:#EFF6FF;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
            <div style="font-size:12px;color:#2563EB;font-weight:600;text-transform:uppercase;letter-spacing:1px">Total Diterima</div>
            <div style="font-size:28px;font-weight:800;color:#0047AB">Rp ${Number(netSalary).toLocaleString('id-ID')}</div>
          </div>
          <p>Buka aplikasi KiniKerja untuk melihat rincian dan download slip gaji.</p>
          <p style="font-size:12px;color:#9CA3AF;margin-top:24px">Email ini dikirim otomatis oleh KiniKerja.</p>
        </div>
      </div>
    `,
    text: `Halo ${esc(employeeName)}, slip gaji ${esc(month)} ${esc(year)} sudah tersedia. Total: Rp ${Number(netSalary).toLocaleString('id-ID')}.`,
  };
}

function buildReimbursementEmail({ employeeName, status, amount, category }) {
  const statusLabel = status === 'approved' ? 'Disetujui ✅' : status === 'paid' ? 'Dibayarkan ✅' : 'Ditolak ❌';
  return {
    subject: `[KiniKerja] Reimbursement ${statusLabel}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <div style="background:linear-gradient(135deg,#0047AB,#2563eb);padding:24px;border-radius:16px 16px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">KiniKerja</h1>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:24px">
          <p>Halo, <strong>${esc(employeeName)}</strong>,</p>
          <p>Pengajuan reimbursement kamu untuk <strong>${esc(category)}</strong> sebesar <strong>Rp ${Number(amount).toLocaleString('id-ID')}</strong> telah: <strong>${statusLabel}</strong></p>
          <p style="font-size:12px;color:#9CA3AF;margin-top:24px">Email ini dikirim otomatis oleh KiniKerja.</p>
        </div>
      </div>
    `,
    text: `Reimbursement ${esc(category)} Rp ${Number(amount).toLocaleString('id-ID')} kamu: ${statusLabel}`,
  };
}

export default async function handler(req, res) {
  const originOk = applyCors(req, res, {
    methods: 'POST, OPTIONS',
    headers: 'Content-Type, Authorization',
  });

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Reject oversized JSON bodies before auth (matches express 1mb limit)
  if (!enforceJsonBodyLimit(req, res)) return;
  // Browser requests must come from allowlisted Origin
  if (req.headers.origin && !originOk) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Authentication + tenant authorization
  const caller = await resolveTenantCaller(req);
  if (caller.error === 'unauthorized') {
    return res.status(401).json({ error: 'Unauthorized — valid session required' });
  }
  if (caller.error === 'no_employee' || !caller.employee?.company_id) {
    return res.status(403).json({ error: 'Forbidden — no employee record for this tenant' });
  }
  if (!ALLOWED_ROLES.has(caller.employee.role)) {
    return res.status(403).json({ error: 'Forbidden — HR/admin/manager role required' });
  }

  // Rate limiting (IP shared quota + per-user quota).
  // Client IP uses the socket address — X-Forwarded-For is client-controlled
  // and must not be trusted as a rate-limit key (trivial bypass).
  // req.ip respects trust proxy (nginx X-Forwarded-For, single proxy). socket address would be 127.0.0.1 for all clients behind proxy_pass.
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
  if (!checkUserRateLimit(`email:${caller.user.id || caller.user.sub}`, 10, 60_000)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { type, to, ...payload } = req.body || {};

  // Non-sending backend probe (IntegrationHub). Auth + role already checked
  // above; return success without touching Brevo.
  if (type === '__probe__') {
    return res.status(200).json({ success: true, probe: true });
  }

  // Input validation
  const VALID_TYPES = ['leave_approval', 'payslip', 'reimbursement'];
  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid or missing email type' });
  }
  if (!to || !isValidEmail(to)) {
    return res.status(400).json({ error: 'Invalid or missing recipient email' });
  }

  // Recipient authorization: `to` must match an employee email in the
  // caller's company. No arbitrary-recipient exception — all three email
  // types legitimately go to employees only.
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ success: false, error: 'Recipient check unavailable' });
  }
  {
    // Case-insensitive exact match via ilike (single bounded query).
    const lookup = await fetch(
      `${SUPABASE_URL}/rest/v1/employees?company_id=eq.${encodeURIComponent(caller.employee.company_id)}&email=ilike.${encodeURIComponent(String(to).trim())}&select=id,email&limit=500`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      },
    );
    if (!lookup.ok) {
      return res.status(503).json({ success: false, error: 'Recipient check unavailable' });
    }
    const rows = await lookup.json().catch(() => []);
    const want = String(to).trim().toLowerCase();
    // ilike is case-insensitive but may match patterns — confirm exact
    // equality client-side on the bounded result set.
    const match = (Array.isArray(rows) ? rows : []).some(
      (r) => String(r?.email || '').trim().toLowerCase() === want,
    );
    if (!match) {
      return res.status(403).json({ error: 'Forbidden — recipient not in company' });
    }
  }

  // Sanitize all string payload fields
  const sanitized = {};
  for (const [k, v] of Object.entries(payload)) {
    sanitized[k] = typeof v === 'string' ? sanitizeStr(v) : v;
  }

  try {
    let emailContent;

    if (type === 'leave_approval') {
      emailContent = buildLeaveEmail(sanitized);
    } else if (type === 'payslip') {
      emailContent = buildPayslipEmail(sanitized);
    } else if (type === 'reimbursement') {
      emailContent = buildReimbursementEmail(sanitized);
    }

    const result = await sendViaBrevo({ to, ...emailContent });
    if (!result.success) {
      return res.status(503).json(result);
    }
    res.status(200).json(result);
  } catch (err) {
    console.error('[send-email] Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
}
