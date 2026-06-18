import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// ── Company Settings ────────────────────────────────────────────────────────

/**
 * Get company settings by company_code.
 * Falls back gracefully if table doesn't exist yet.
 */
export async function getCompanySettings(companyCode) {
  if (!companyCode) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_code', companyCode)
      .maybeSingle();
    if (error) throw error;
    return { data, error: null };
  } catch {
    // Table may not exist yet — return null
    return { data: null, error: null };
  }
}

/**
 * Upsert company settings.
 */
export async function saveCompanySettings(companyCode, settings) {
  if (!companyCode) return { data: null, error: { message: 'company_code required' } };
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .upsert({ company_code: companyCode, ...settings }, { onConflict: 'company_code' })
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ── Notification Preferences ─────────────────────────────────────────────────

/**
 * Get notification preferences for the current user.
 */
export async function getNotificationPrefs(userId) {
  if (!userId) return { data: null, error: null };
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

/**
 * Upsert notification preferences for current user.
 */
export async function saveNotificationPrefs(userId, prefs) {
  if (!userId) return { data: null, error: { message: 'user_id required' } };
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ── Payroll Config ────────────────────────────────────────────────────────────

/**
 * Get payroll config for the company.
 */
export async function getPayrollConfig(companyCode) {
  if (!companyCode) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('payroll_config')
      .select('config')
      .eq('company_code', companyCode)
      .maybeSingle();
    if (error) throw error;
    return { data: data?.config || null, error: null };
  } catch {
    return { data: null, error: null };
  }
}

/**
 * Save payroll config for the company.
 */
export async function savePayrollConfigDB(companyCode, config) {
  if (!companyCode) return { data: null, error: { message: 'company_code required' } };
  try {
    const { data, error } = await supabase
      .from('payroll_config')
      .upsert({ company_code: companyCode, config, updated_at: new Date().toISOString() }, { onConflict: 'company_code' })
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}
