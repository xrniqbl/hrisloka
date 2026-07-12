/**
 * pushService.js — Client helper for /api/send-push
 * Always scopes by company (no global broadcast).
 */
import { supabase } from '../lib/supabase';
import { resolveMyEmployee } from '../lib/tenantGuard';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

/**
 * Send push to one employee (must be same company as caller, or self).
 */
export async function sendPushToEmployee(employeeId, title, body, url, companyId = null) {
  if (!employeeId || !title || !body) return { success: false, error: 'Missing fields' };

  let cid = companyId;
  if (!cid) {
    const me = await resolveMyEmployee();
    cid = me?.company_id ?? null;
  }

  try {
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ employeeId, companyId: cid, title, body, url }),
    });
    return await res.json();
  } catch (err) {
    console.warn('[pushService] sendPushToEmployee error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Broadcast push to all employees in *one* company only.
 * companyId required (defaults to caller's company).
 */
export async function sendPushBroadcast(title, body, url, companyId = null) {
  if (!title || !body) return { success: false, error: 'Missing fields' };

  let cid = companyId;
  if (!cid) {
    const me = await resolveMyEmployee();
    cid = me?.company_id ?? null;
  }
  if (!cid) {
    return { success: false, error: 'companyId required for broadcast' };
  }

  try {
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ broadcast: true, companyId: cid, title, body, url }),
    });
    return await res.json();
  } catch (err) {
    console.warn('[pushService] sendPushBroadcast error:', err);
    return { success: false, error: err.message };
  }
}

// ── Domain helpers (used by HR pages & employee PWA) ───────────────────────

/** Broadcast a new company announcement to all employees in the caller's company. */
export async function sendAnnouncementPush(title, message) {
  const body = (message || '').trim() || 'Ada pengumuman baru dari perusahaan.';
  const short = body.length > 120 ? `${body.slice(0, 117)}...` : body;
  return sendPushBroadcast(
    title?.trim() || 'Pengumuman Baru',
    short,
    '/app/announcements'
  );
}

/** Notify employee about leave approve/reject. */
export async function sendLeavePush(employeeId, status, leaveType) {
  const approved = status === 'approved';
  const typeLabel = leaveType || 'Cuti';
  return sendPushToEmployee(
    employeeId,
    approved ? 'Pengajuan Cuti Disetujui' : 'Pengajuan Cuti Ditolak',
    approved
      ? `Pengajuan ${typeLabel} Anda telah disetujui.`
      : `Pengajuan ${typeLabel} Anda ditolak. Hubungi HR untuk info lebih lanjut.`,
    '/app/submissions'
  );
}

/** Notify employee that their payslip for a period is ready. */
export async function sendPayslipPush(employeeId, month, year) {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const m = Number(month);
  const monthLabel = (m >= 1 && m <= 12) ? monthNames[m - 1] : String(month ?? '');
  const period = [monthLabel, year].filter(Boolean).join(' ');
  return sendPushToEmployee(
    employeeId,
    'Slip Gaji Tersedia',
    period
      ? `Slip gaji ${period} sudah dapat dilihat di aplikasi.`
      : 'Slip gaji periode terbaru sudah dapat dilihat di aplikasi.',
    '/app/payslip'
  );
}

/** Notify employee about reimbursement approve/reject. */
export async function sendReimbursementPush(employeeId, status, amount) {
  const approved = status === 'approved';
  const amountLabel = amount != null && amount !== ''
    ? ` sebesar Rp ${Number(amount).toLocaleString('id-ID')}`
    : '';
  return sendPushToEmployee(
    employeeId,
    approved ? 'Reimburse Disetujui' : 'Reimburse Ditolak',
    approved
      ? `Pengajuan reimburse Anda${amountLabel} telah disetujui.`
      : `Pengajuan reimburse Anda${amountLabel} ditolak. Hubungi HR untuk info lebih lanjut.`,
    '/app/reimbursement'
  );
}

/**
 * Confirm self-assessment submission to the employee.
 * (HR reviews the record in the web Appraisal module.)
 */
export async function sendAppraisalPush(employeeId, employeeName) {
  const name = employeeName || 'Anda';
  return sendPushToEmployee(
    employeeId,
    'Self-Assessment Terkirim',
    `Penilaian mandiri ${name} berhasil dikirim dan menunggu review.`,
    '/app/appraisal'
  );
}
