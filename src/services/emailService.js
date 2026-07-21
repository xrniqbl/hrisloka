/**
 * Email Notification Service
 *
 * Calls /api/send-email — server sends via Brevo (BREVO_API_KEY).
 * API key never leaves the server.
 */

import { supabase } from '../lib/supabase';

/** Get the current user's access token (for authenticating serverless calls). */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

/**
 * Core send — routes through /api/send-email (BREVO_API_KEY on server only).
 */
async function sendViaServer(type, to, payload) {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ type, to, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Server email error');
    return { success: true, id: data.id, provider: data.provider || 'brevo' };
  } catch (err) {
    console.error('[EmailService] Send failed:', err);
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
 * Probe email backend.
 * - OPTIONS success → route is mounted
 * - Authenticated POST with invalid type → 400 means route live + auth OK
 * - 503 with "not configured" → route live but BREVO_API_KEY missing
 * Does not send a real email.
 */
export async function isEmailConfigured() {
  try {
    const opt = await fetch('/api/send-email', { method: 'OPTIONS' });
    if (opt.status >= 500) return false;

    const headers = await getAuthHeaders();
    // No session → cannot prove Brevo; still report route as reachable
    if (!headers.Authorization) return opt.status < 500;

    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: '__probe__', to: 'probe@invalid.local' }),
    });
    // 400 = validation (route + auth OK); 401 = not authed; 503 = missing BREVO
    if (res.status === 503) {
      const data = await res.json().catch(() => ({}));
      if (/not configured|BREVO/i.test(data.error || '')) return false;
    }
    if (res.status === 401) return false;
    return res.status < 500;
  } catch {
    return false;
  }
}

