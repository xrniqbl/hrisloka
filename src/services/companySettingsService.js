import { supabase } from '../lib/supabase';
import {
  guardCompanyId,
  assertSameCompany,
  resolveMyCompanyId,
  resolveMyEmployee,
} from '../lib/tenantGuard';

// ── Company Settings ────────────────────────────────────────────────────────

/**
 * Resolve company_code → company row, then ensure caller belongs to that company.
 */
async function resolveCompanyByCodeForCaller(companyCode) {
  if (!companyCode) return { company: null, error: { message: 'company_code required' } };

  const code = String(companyCode).trim().toUpperCase();
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name, company_code, is_active')
    .eq('company_code', code)
    .maybeSingle();

  if (error) return { company: null, error };
  if (!company) return { company: null, error: { message: 'Perusahaan tidak ditemukan' } };

  const allowed = await assertSameCompany(company.id, 'companySettings');
  if (!allowed) {
    return { company: null, error: { message: 'tenant isolation: company_code bukan milik perusahaan Anda' } };
  }

  return { company, error: null };
}

/**
 * Get settings by company_id (preferred) or company_code (verified against caller).
 */
export async function getCompanySettings(companyCodeOrId, opts = {}) {
  const byId = opts.byId === true || typeof companyCodeOrId === 'number';

  try {
    if (byId) {
      const companyId = companyCodeOrId;
      if (!guardCompanyId(companyId, 'getCompanySettings')) {
        return { data: null, error: { message: 'company_id required' } };
      }
      const allowed = await assertSameCompany(companyId, 'getCompanySettings');
      if (!allowed) return { data: null, error: { message: 'tenant isolation' } };

      // Prefer company_id column if present; fallback company_code
      let q = supabase.from('company_settings').select('*');
      const { data: byCompanyId, error: e1 } = await q.eq('company_id', companyId).maybeSingle();
      if (!e1 && byCompanyId) return { data: byCompanyId, error: null };

      // Fallback: lookup company_code then settings
      const { data: co } = await supabase.from('companies').select('company_code').eq('id', companyId).maybeSingle();
      if (co?.company_code) {
        const { data, error } = await supabase
          .from('company_settings')
          .select('*')
          .eq('company_code', co.company_code)
          .maybeSingle();
        if (error) throw error;
        return { data, error: null };
      }
      return { data: null, error: null };
    }

    const { company, error: cErr } = await resolveCompanyByCodeForCaller(companyCodeOrId);
    if (cErr || !company) return { data: null, error: cErr };

    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_code', company.company_code)
      .maybeSingle();
    if (error) throw error;
    return { data, error: null };
  } catch {
    return { data: null, error: null };
  }
}

/**
 * Upsert company settings — only for caller's company.
 */
export async function saveCompanySettings(companyCode, settings) {
  if (!companyCode) return { data: null, error: { message: 'company_code required' } };

  const { company, error: cErr } = await resolveCompanyByCodeForCaller(companyCode);
  if (cErr || !company) return { data: null, error: cErr || { message: 'tenant isolation' } };

  const me = await resolveMyEmployee();
  if (!me || !['super_admin', 'hr_admin'].includes(me.role)) {
    return { data: null, error: { message: 'Hanya HR/Admin yang boleh mengubah pengaturan perusahaan' } };
  }

  try {
    const payload = {
      company_code: company.company_code,
      company_id: company.id,
      ...settings,
      updated_at: new Date().toISOString(),
    };
    // Remove undefined keys that could overwrite incorrectly
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const { data, error } = await supabase
      .from('company_settings')
      .upsert(payload, { onConflict: 'company_code' })
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ── Notification Preferences (user-scoped — still verify auth user) ──────────

/** UI keys used by Settings */
export const DEFAULT_NOTIFICATION_PREFS = {
  emailLeave: true,
  emailPayroll: true,
  emailReimbursement: true,
  pushAttendance: true,
  pushApproval: true,
  pushAnnouncement: true,
};

/** Map UI camelCase ↔ DB snake_case columns */
const PREF_UI_TO_DB = {
  emailLeave: 'email_leave',
  emailPayroll: 'email_payroll',
  emailReimbursement: 'email_reimbursement',
  pushAttendance: 'push_attendance',
  pushApproval: 'push_approval',
  pushAnnouncement: 'push_announcement',
};

const PREF_DB_TO_UI = Object.fromEntries(
  Object.entries(PREF_UI_TO_DB).map(([ui, db]) => [db, ui]),
);

export function prefsFromDb(row) {
  if (!row || typeof row !== 'object') return { ...DEFAULT_NOTIFICATION_PREFS };
  const out = { ...DEFAULT_NOTIFICATION_PREFS };
  // Prefer explicit UI keys if already stored as JSON blob
  if (row.prefs && typeof row.prefs === 'object') {
    return { ...out, ...row.prefs };
  }
  Object.entries(PREF_DB_TO_UI).forEach(([dbKey, uiKey]) => {
    if (row[dbKey] !== undefined && row[dbKey] !== null) out[uiKey] = Boolean(row[dbKey]);
  });
  // Also accept camelCase columns
  Object.keys(DEFAULT_NOTIFICATION_PREFS).forEach((k) => {
    if (row[k] !== undefined && row[k] !== null) out[k] = Boolean(row[k]);
  });
  return out;
}

export function prefsToDb(prefs) {
  const p = { ...DEFAULT_NOTIFICATION_PREFS, ...(prefs || {}) };
  const row = { prefs: p };
  Object.entries(PREF_UI_TO_DB).forEach(([ui, db]) => {
    row[db] = Boolean(p[ui]);
  });
  return row;
}

export async function getNotificationPrefs(userId) {
  if (!userId) return { data: { ...DEFAULT_NOTIFICATION_PREFS }, error: null };

  // Only allow reading own prefs
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { data: null, error: { message: 'tenant isolation: hanya preferensi sendiri' } };
  }

  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return { data: prefsFromDb(data), error: null };
  } catch {
    // Fallback: employees.notification_prefs jsonb if dedicated table missing
    try {
      const me = await resolveMyEmployee();
      if (me?.id) {
        const { data: emp } = await supabase
          .from('employees')
          .select('notification_prefs')
          .eq('id', me.id)
          .maybeSingle();
        if (emp?.notification_prefs) {
          return { data: prefsFromDb(emp.notification_prefs), error: null };
        }
      }
    } catch { /* ignore */ }
    return { data: { ...DEFAULT_NOTIFICATION_PREFS }, error: null };
  }
}

export async function saveNotificationPrefs(userId, prefs) {
  if (!userId) return { data: null, error: { message: 'user_id required' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { data: null, error: { message: 'tenant isolation: hanya preferensi sendiri' } };
  }

  const normalized = prefsToDb(prefs);

  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: userId, ...normalized, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select()
      .single();
    if (!error) return { data: prefsFromDb(data), error: null };
  } catch { /* fall through */ }

  // Fallback store on employee row
  try {
    const me = await resolveMyEmployee();
    if (me?.id) {
      const { data, error } = await supabase
        .from('employees')
        .update({ notification_prefs: prefsFromDb(prefs) })
        .eq('id', me.id)
        .select('notification_prefs')
        .single();
      if (!error) return { data: prefsFromDb(data?.notification_prefs), error: null };
      return { data: null, error };
    }
  } catch (err) {
    return { data: null, error: err };
  }

  // Last resort: localStorage so UI still "saves"
  try {
    localStorage.setItem('hrisync_notifications', JSON.stringify(prefsFromDb(prefs)));
  } catch { /* ignore */ }
  return { data: prefsFromDb(prefs), error: null };
}

/**
 * Check if a recipient (by auth user_id or employee row) allows a channel.
 * channel: 'emailLeave' | 'emailPayroll' | 'emailReimbursement' | 'pushAttendance' | ...
 * Defaults to true when prefs missing (safe: don't block delivery).
 */
export async function shouldNotify(authUserId, channel) {
  if (!channel) return true;
  if (!authUserId) return true;
  try {
    const { data } = await getNotificationPrefs(authUserId);
    if (!data) return true;
    if (data[channel] === undefined) return true;
    return data[channel] !== false;
  } catch {
    return true;
  }
}

/** Convenience: resolve employee.auth_user_id then check channel */
export async function shouldNotifyEmployee(employeeId, channel) {
  if (!employeeId) return true;
  try {
    const { data: emp } = await supabase
      .from('employees')
      .select('auth_user_id, notification_prefs')
      .eq('id', employeeId)
      .maybeSingle();
    if (emp?.notification_prefs && typeof emp.notification_prefs === 'object') {
      const p = prefsFromDb(emp.notification_prefs);
      if (p[channel] === false) return false;
    }
    if (emp?.auth_user_id) return shouldNotify(emp.auth_user_id, channel);
  } catch { /* ignore */ }
  return true;
}

// ── Payroll Config ────────────────────────────────────────────────────────────

export async function getPayrollConfig(companyCode) {
  if (!companyCode) return { data: null, error: null };

  const { company, error: cErr } = await resolveCompanyByCodeForCaller(companyCode);
  if (cErr || !company) return { data: null, error: cErr };

  try {
    const { data, error } = await supabase
      .from('payroll_config')
      .select('config')
      .eq('company_code', company.company_code)
      .maybeSingle();
    if (error) throw error;
    return { data: data?.config || null, error: null };
  } catch {
    return { data: null, error: null };
  }
}

export async function savePayrollConfigDB(companyCode, config) {
  if (!companyCode) return { data: null, error: { message: 'company_code required' } };

  const { company, error: cErr } = await resolveCompanyByCodeForCaller(companyCode);
  if (cErr || !company) return { data: null, error: cErr || { message: 'tenant isolation' } };

  const me = await resolveMyEmployee();
  if (!me || !['super_admin', 'hr_admin'].includes(me.role)) {
    return { data: null, error: { message: 'Hanya HR/Admin yang boleh mengubah konfigurasi payroll' } };
  }

  try {
    const { data, error } = await supabase
      .from('payroll_config')
      .upsert(
        {
          company_code: company.company_code,
          company_id: company.id,
          config,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_code' },
      )
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Convenience: load payroll config by company_id of current user.
 */
export async function getMyPayrollConfig() {
  const companyId = await resolveMyCompanyId();
  if (!companyId) return { data: null, error: null };
  const { data: co } = await supabase
    .from('companies')
    .select('company_code')
    .eq('id', companyId)
    .maybeSingle();
  if (!co?.company_code) return { data: null, error: null };
  return getPayrollConfig(co.company_code);
}
