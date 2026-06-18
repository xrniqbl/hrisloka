/**
 * Email Notification Service
 *
 * Calls the /api/send-email Vercel serverless function — API key stays on the server.
 * Fallback: direct Resend call (dev mode only, VITE_RESEND_API_KEY must be set).
 */

const IS_DEV = import.meta.env.DEV;
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY; // Used only in dev as fallback
const FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL || 'noreply@hrisloka.id';

/**
 * Core send — routes through /api/send-email in production, direct Resend in dev.
 */
async function sendViaServer(type, to, payload) {
  try {
    // Production: call our serverless function (API key stays on server)
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server email error');
    return { success: true, id: data.id };
  } catch (err) {
    // Dev fallback: call Resend directly (only if VITE_RESEND_API_KEY is set)
    if (IS_DEV && RESEND_API_KEY) {
      console.warn('[EmailService] Using dev fallback (direct Resend)');
      return sendDirectResend(type, to, payload);
    }
    console.error('[EmailService] Send failed:', err);
    return { success: false, error: err.message };
  }
}

async function sendDirectResend(type, to, payload) {
  if (!RESEND_API_KEY) {
    console.warn('[EmailService] No RESEND_API_KEY — email skipped');
    return { success: false, error: 'API key not configured' };
  }

  let subject, html, text;

  if (type === 'leave_approval') {
    const { employeeName, status, leaveType, startDate, endDate, notes } = payload;
    const statusLabel = status === 'approved' ? 'Disetujui ✅' : 'Ditolak ❌';
    const statusColor = status === 'approved' ? '#16A34A' : '#DC2626';
    subject = `[HRIS Loka] Pengajuan Cuti ${statusLabel}`;
    html = `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:linear-gradient(135deg,#0047AB,#2563eb);padding:24px;border-radius:16px 16px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">HRIS Loka</h1>
      </div>
      <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;padding:24px">
        <p>Halo, <strong>${employeeName}</strong>,</p>
        <p>Pengajuan cuti kamu telah diproses:</p>
        <div style="background:#F9FAFB;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid ${statusColor}">
          <div style="font-size:18px;font-weight:700;color:${statusColor};margin-bottom:12px">${statusLabel}</div>
          <table style="width:100%;font-size:13px;color:#374151">
            <tr><td style="padding:4px 0;color:#6B7280">Jenis Cuti</td><td style="font-weight:600">${leaveType}</td></tr>
            <tr><td style="padding:4px 0;color:#6B7280">Tanggal Mulai</td><td style="font-weight:600">${startDate}</td></tr>
            <tr><td style="padding:4px 0;color:#6B7280">Tanggal Selesai</td><td style="font-weight:600">${endDate}</td></tr>
            ${notes ? `<tr><td style="padding:4px 0;color:#6B7280">Catatan</td><td style="font-weight:600">${notes}</td></tr>` : ''}
          </table>
        </div>
        <p style="font-size:12px;color:#9CA3AF;margin-top:24px">Email otomatis dari HRIS Loka.</p>
      </div>
    </div>`;
    text = `Halo ${employeeName}, cuti kamu ${statusLabel}. ${leaveType}: ${startDate} — ${endDate}.`;
  } else if (type === 'payslip') {
    const { employeeName, month, year, netSalary } = payload;
    subject = `[HRIS Loka] Slip Gaji ${month} ${year} Tersedia`;
    html = `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <p>Halo, <strong>${employeeName}</strong>, slip gaji ${month} ${year} sudah tersedia. Total: <strong>Rp ${Number(netSalary).toLocaleString('id-ID')}</strong></p>
    </div>`;
    text = `Halo ${employeeName}, slip gaji ${month} ${year} sudah tersedia. Total: Rp ${Number(netSalary).toLocaleString('id-ID')}.`;
  } else if (type === 'reimbursement') {
    const { employeeName, status, amount, category } = payload;
    const statusLabel = status === 'approved' ? 'Disetujui ✅' : status === 'paid' ? 'Dibayarkan ✅' : 'Ditolak ❌';
    subject = `[HRIS Loka] Reimbursement ${statusLabel}`;
    html = `<p>Reimbursement ${category} Rp ${Number(amount).toLocaleString('id-ID')} kamu: ${statusLabel}</p>`;
    text = `Reimbursement ${category} Rp ${Number(amount).toLocaleString('id-ID')} kamu: ${statusLabel}`;
  } else {
    return { success: false, error: `Unknown type: ${type}` };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: Array.isArray(to) ? to : [to], subject, html, text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Resend error');
    return { success: true, id: data.id };
  } catch (err) {
    console.error('[EmailService] Direct Resend failed:', err);
    return { success: false, error: err.message };
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function sendLeaveApprovalEmail({ employeeName, employeeEmail, status, leaveType, startDate, endDate, notes }) {
  return sendViaServer('leave_approval', employeeEmail, { employeeName, status, leaveType, startDate, endDate, notes });
}

export async function sendPayslipEmail({ employeeName, employeeEmail, month, year, netSalary }) {
  return sendViaServer('payslip', employeeEmail, { employeeName, month, year, netSalary });
}

export async function sendReimbursementEmail({ employeeName, employeeEmail, status, amount, category }) {
  return sendViaServer('reimbursement', employeeEmail, { employeeName, status, amount, category });
}

/**
 * Check if email service is configured.
 */
export function isEmailConfigured() {
  // In production, always configured if serverless route exists.
  // In dev, check for direct key.
  return !IS_DEV || !!RESEND_API_KEY;
}
