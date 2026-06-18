/**
 * /api/send-email.js — Vercel Serverless Function
 *
 * Mengirim email via Resend API dari sisi server (API key tidak terekspos ke browser).
 * Frontend memanggil POST /api/send-email dengan body { type, ...payload }
 *
 * type: 'leave_approval' | 'payslip' | 'reimbursement'
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY; // Server-side env (no VITE_ prefix)
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@hrisloka.id';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_ORIGINS = [
  'https://hrisloka.id',
  'https://www.hrisloka.id',
  'https://hrisloka.com',
  'https://www.hrisloka.com',
];

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

// Verify Supabase JWT token
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  if (!SUPABASE_URL) return true; // Skip if not configured (dev mode)
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_SERVICE_KEY || token },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Simple email format validation
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

// Sanitize string: strip tags, limit length
function sanitizeStr(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  return val.replace(/<[^>]*>/g, '').slice(0, maxLen);
}

async function sendViaResend({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.error('[send-email] RESEND_API_KEY not set on server');
    return { success: false, error: 'Server email not configured' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Resend error');
  return { success: true, id: data.id };
}

function buildLeaveEmail({ employeeName, status, leaveType, startDate, endDate, notes }) {
  const statusLabel = status === 'approved' ? 'Disetujui ✅' : 'Ditolak ❌';
  const statusColor = status === 'approved' ? '#16A34A' : '#DC2626';
  return {
    subject: `[HRIS Loka] Pengajuan Cuti ${statusLabel}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <div style="background:linear-gradient(135deg,#0047AB,#2563eb);padding:24px;border-radius:16px 16px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">HRIS Loka</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Human Resource Information System</p>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:24px">
          <p style="margin:0 0 16px">Halo, <strong>${employeeName}</strong>,</p>
          <p>Pengajuan cuti kamu telah diproses:</p>
          <div style="background:#F9FAFB;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid ${statusColor}">
            <div style="font-size:18px;font-weight:700;color:${statusColor};margin-bottom:12px">${statusLabel}</div>
            <table style="width:100%;font-size:13px;color:#374151">
              <tr><td style="padding:4px 0;color:#6B7280">Jenis Cuti</td><td style="font-weight:600">${leaveType}</td></tr>
              <tr><td style="padding:4px 0;color:#6B7280">Tanggal Mulai</td><td style="font-weight:600">${startDate}</td></tr>
              <tr><td style="padding:4px 0;color:#6B7280">Tanggal Selesai</td><td style="font-weight:600">${endDate}</td></tr>
              ${notes ? `<tr><td style="padding:4px 0;color:#6B7280;vertical-align:top">Catatan</td><td style="font-weight:600">${notes}</td></tr>` : ''}
            </table>
          </div>
          <p style="font-size:12px;color:#9CA3AF;margin-top:24px">Email ini dikirim otomatis oleh HRIS Loka. Jangan balas email ini.</p>
        </div>
      </div>
    `,
    text: `Halo ${employeeName}, pengajuan cuti kamu ${statusLabel}. Jenis: ${leaveType}, ${startDate} — ${endDate}.`,
  };
}

function buildPayslipEmail({ employeeName, month, year, netSalary }) {
  return {
    subject: `[HRIS Loka] Slip Gaji ${month} ${year} Tersedia`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <div style="background:linear-gradient(135deg,#0047AB,#2563eb);padding:24px;border-radius:16px 16px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">HRIS Loka</h1>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:24px">
          <p>Halo, <strong>${employeeName}</strong>,</p>
          <p>Slip gaji kamu untuk periode <strong>${month} ${year}</strong> sudah tersedia.</p>
          <div style="background:#EFF6FF;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
            <div style="font-size:12px;color:#2563EB;font-weight:600;text-transform:uppercase;letter-spacing:1px">Total Diterima</div>
            <div style="font-size:28px;font-weight:800;color:#0047AB">Rp ${Number(netSalary).toLocaleString('id-ID')}</div>
          </div>
          <p>Buka aplikasi HRIS Loka untuk melihat rincian dan download slip gaji.</p>
          <p style="font-size:12px;color:#9CA3AF;margin-top:24px">Email ini dikirim otomatis oleh HRIS Loka.</p>
        </div>
      </div>
    `,
    text: `Halo ${employeeName}, slip gaji ${month} ${year} sudah tersedia. Total: Rp ${Number(netSalary).toLocaleString('id-ID')}.`,
  };
}

function buildReimbursementEmail({ employeeName, status, amount, category }) {
  const statusLabel = status === 'approved' ? 'Disetujui ✅' : status === 'paid' ? 'Dibayarkan ✅' : 'Ditolak ❌';
  return {
    subject: `[HRIS Loka] Reimbursement ${statusLabel}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <div style="background:linear-gradient(135deg,#0047AB,#2563eb);padding:24px;border-radius:16px 16px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">HRIS Loka</h1>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:24px">
          <p>Halo, <strong>${employeeName}</strong>,</p>
          <p>Pengajuan reimbursement kamu untuk <strong>${category}</strong> sebesar <strong>Rp ${Number(amount).toLocaleString('id-ID')}</strong> telah: <strong>${statusLabel}</strong></p>
          <p style="font-size:12px;color:#9CA3AF;margin-top:24px">Email ini dikirim otomatis oleh HRIS Loka.</p>
        </div>
      </div>
    `,
    text: `Reimbursement ${category} Rp ${Number(amount).toLocaleString('id-ID')} kamu: ${statusLabel}`,
  };
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Authentication check — verify Supabase JWT
  const isAuthed = await verifyAuth(req);
  if (!isAuthed) {
    return res.status(401).json({ error: 'Unauthorized — valid session required' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { type, to, ...payload } = req.body || {};

  // Input validation
  const VALID_TYPES = ['leave_approval', 'payslip', 'reimbursement'];
  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid or missing email type' });
  }
  if (!to || !isValidEmail(to)) {
    return res.status(400).json({ error: 'Invalid or missing recipient email' });
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

    const result = await sendViaResend({ to, ...emailContent });
    res.status(200).json(result);
  } catch (err) {
    console.error('[send-email] Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
}
