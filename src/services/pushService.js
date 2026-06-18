/**
 * pushService.js — Client-side helper to trigger server push notifications.
 * Calls /api/send-push serverless function.
 */

/**
 * Send a push notification to a specific employee.
 * @param {string} employeeId - Target employee ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} [url] - URL to open on click (default: /app/home)
 */
export async function sendPushToEmployee(employeeId, title, body, url) {
  if (!employeeId || !title || !body) return { success: false, error: 'Missing fields' };
  try {
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, title, body, url }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[pushService] sendPushToEmployee error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a broadcast push notification to ALL subscribed employees.
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} [url] - URL to open on click
 */
export async function sendPushBroadcast(title, body, url) {
  if (!title || !body) return { success: false, error: 'Missing fields' };
  try {
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcast: true, title, body, url }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[pushService] sendPushBroadcast error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Convenience: send leave approval/rejection push to employee.
 */
export function sendLeavePush(employeeId, status, leaveType) {
  const title = 'HRIS Loka — Pengajuan Cuti';
  const statusLabel = status === 'approved' ? 'Disetujui ✅' : 'Ditolak ❌';
  const body = `Pengajuan ${leaveType} kamu telah ${statusLabel}`;
  return sendPushToEmployee(employeeId, title, body, '/app/submissions');
}

/**
 * Convenience: send payslip available push to employee.
 */
export function sendPayslipPush(employeeId, month, year) {
  const title = 'HRIS Loka — Slip Gaji Tersedia';
  const body = `Slip gaji periode ${month} ${year} sudah tersedia. Buka untuk melihat.`;
  return sendPushToEmployee(employeeId, title, body, '/app/payslip');
}

/**
 * Convenience: send reimbursement status push to employee.
 */
export function sendReimbursementPush(employeeId, status, amount) {
  const title = 'HRIS Loka — Reimbursement';
  const statusLabel = status === 'approved' ? 'Disetujui ✅' : status === 'paid' ? 'Dibayarkan 💰' : 'Ditolak ❌';
  const body = `Reimbursement Rp ${Number(amount).toLocaleString('id-ID')} kamu telah ${statusLabel}`;
  return sendPushToEmployee(employeeId, title, body, '/app/reimbursement');
}

/**
 * Convenience: send announcement broadcast push.
 */
export function sendAnnouncementPush(title, preview) {
  return sendPushBroadcast(`📢 ${title}`, preview || 'Ada pengumuman baru dari HRD.', '/app/announcements');
}

/**
 * Convenience: notify HR/manager when employee submits self-assessment.
 */
export function sendAppraisalPush(employeeId, employeeName) {
  const title = 'HRIS Loka — Self-Assessment Baru';
  const body = `${employeeName || 'Karyawan'} telah mengirimkan self-assessment. Segera review.`;
  // Send to the employee's own notif channel (HR portal will also see it via Supabase realtime)
  return sendPushToEmployee(employeeId, title, body, '/appraisal');
}
