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
