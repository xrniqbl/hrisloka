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

export async function getNotificationPrefs(userId) {
  if (!userId) return { data: null, error: null };

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
    return { data, error: null };
  } catch {
    return { data: null, error: null };
  }
}

export async function saveNotificationPrefs(userId, prefs) {
  if (!userId) return { data: null, error: { message: 'user_id required' } };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { data: null, error: { message: 'tenant isolation: hanya preferensi sendiri' } };
  }

  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
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
