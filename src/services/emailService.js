/**
 * Email Notification Service
 *
 * Calls the /api/send-email Vercel serverless function — API key stays on the server.
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
 * Core send — routes through /api/send-email (RESEND_API_KEY on server only).
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
    return { success: true, id: data.id };
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
 * Probe email backend. Returns true only if /api/send-email responds (not 404/5xx network).
 * Used by Integration Hub "Test" — does not guarantee RESEND_API_KEY is set on server.
 */
export async function isEmailConfigured() {
  try {
    const res = await fetch('/api/send-email', {
      method: 'OPTIONS',
    });
    // Any HTTP response means the route exists
    return res.status < 500;
  } catch {
    return false;
  }
}

