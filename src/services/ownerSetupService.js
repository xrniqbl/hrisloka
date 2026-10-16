/**
 * Owner post-subscription setup wizard.
 * Creates company if missing, links employee, department seed, marks complete.
 */
import { supabase } from '../lib/supabase';
import { guardCompanyId, resolveMyEmployee } from '../lib/tenantGuard';

const SETUP_KEY = 'owner_setup';

function genCompanyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'HRSLK-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * Load setup progress for current tenant.
 * @returns {{ complete: boolean, company: object|null, step: string, companyCode: string|null }}
 */
export async function getOwnerSetupState() {
  const me = await resolveMyEmployee();
  if (!me) {
    return { complete: false, company: null, step: 'auth', companyCode: null, employee: null };
  }

  let company = null;
  if (me.company_id) {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', me.company_id)
      .maybeSingle();
    company = data;
  }

  // company_settings key/value or wide row
  let setupMeta = null;
  if (me.company_id) {
    try {
      const { data: kv } = await supabase
        .from('company_settings')
        .select('value')
        .eq('company_id', me.company_id)
        .eq('key', SETUP_KEY)
        .maybeSingle();
      if (kv?.value) {
        setupMeta = typeof kv.value === 'string' ? JSON.parse(kv.value) : kv.value;
      }
    } catch { /* ignore */ }
  }

  const complete = Boolean(
    setupMeta?.completed_at ||
      company?.setup_completed_at ||
      (me.company_id && setupMeta?.complete === true),
  );

  return {
    complete,
    company,
    companyCode: company?.company_code || null,
    employee: me,
    step: complete ? 'done' : me.company_id ? 'details' : 'company',
    setupMeta,
  };
}

/**
 * Create or update company for the owner and link employee.company_id.
 */
export async function ensureOwnerCompany({
  name,
  industry = null,
  phone = null,
  address = null,
  website = null,
}) {
  const me = await resolveMyEmployee();
  if (!me?.id) return { data: null, error: { message: 'Employee record required' } };

  const companyName = String(name || '').trim();
  if (companyName.length < 2) {
    return { data: null, error: { message: 'Nama perusahaan wajib diisi' } };
  }

  // Update existing company
  if (me.company_id) {
    // Defense-in-depth (client-side only): RLS policy companies_update_admin
    // is the real enforcement. Block non-owner/HR early for clearer UX.
    if (!['super_admin', 'hr_admin'].includes(me.role)) {
      return { data: null, error: { message: 'Hanya owner/HR yang dapat mengubah data perusahaan' } };
    }
    const { data, error } = await supabase
      .from('companies')
      .update({
        name: companyName,
        industry: industry || null,
        phone: phone || null,
        address: address || null,
        website: website || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', me.company_id)
      .select()
      .single();
    return { data, error };
  }

  // Create company + code
  let code = genCompanyCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        industry: industry || null,
        phone: phone || null,
        address: address || null,
        website: website || null,
        company_code: code,
        is_active: true,
      })
      .select()
      .single();

    if (!error && company) {
      // Link employee
      await supabase
        .from('employees')
        .update({
          company_id: company.id,
          role: 'super_admin',
          name: me.name || companyName,
        })
        .eq('id', me.id);

      // Attach subscription company_id if user-scoped row exists
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase
            .from('subscriptions')
            .update({ company_id: company.id })
            .eq('user_id', user.id);
        }
      } catch { /* optional */ }

      return { data: company, error: null };
    }

    // Duplicate code — retry
    if (error && /company_code|unique|duplicate/i.test(error.message || '')) {
      code = genCompanyCode();
      continue;
    }
    return { data: null, error };
  }

  return { data: null, error: { message: 'Gagal generate company code' } };
}

/**
 * Seed first department for the company.
 */
export async function seedFirstDepartment(companyId, { name = 'General Affairs', code = 'GA' } = {}) {
  if (!guardCompanyId(companyId, 'seedFirstDepartment')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const { data: existing } = await supabase
    .from('departments')
    .select('id')
    .eq('company_id', companyId)
    .limit(1)
    .maybeSingle();
  if (existing) return { data: existing, error: null };

  const { data, error } = await supabase
    .from('departments')
    .insert({
      name,
      code,
      is_active: true,
      company_id: companyId,
    })
    .select()
    .single();
  return { data, error };
}

/**
 * Ensure company_code exists (generate if missing).
 */
export async function ensureCompanyCode(companyId) {
  if (!guardCompanyId(companyId, 'ensureCompanyCode')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const { data: co } = await supabase
    .from('companies')
    .select('id, company_code')
    .eq('id', companyId)
    .maybeSingle();
  if (!co) return { data: null, error: { message: 'Company not found' } };
  if (co.company_code) return { data: co, error: null };

  let code = genCompanyCode();
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from('companies')
      .update({ company_code: code })
      .eq('id', companyId)
      .select()
      .single();
    if (!error) return { data, error: null };
    code = genCompanyCode();
  }
  return { data: null, error: { message: 'Failed to set company_code' } };
}

/**
 * Mark owner setup finished (persist in company_settings).
 */
export async function completeOwnerSetup(companyId, extra = {}) {
  if (!guardCompanyId(companyId, 'completeOwnerSetup')) {
    return { data: null, error: { message: 'company_id required' } };
  }

  const payload = {
    complete: true,
    completed_at: new Date().toISOString(),
    ...extra,
  };

  // Prefer key/value schema
  let { error } = await supabase.from('company_settings').upsert(
    {
      company_id: companyId,
      key: SETUP_KEY,
      value: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,key' },
  );

  if (error) {
    // Fallback: store as JSON column on company_settings wide row
    const wide = await supabase.from('company_settings').upsert(
      {
        company_id: companyId,
        owner_setup: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id' },
    );
    error = wide.error;
  }

  // Best-effort column on companies
  try {
    await supabase
      .from('companies')
      .update({ setup_completed_at: payload.completed_at })
      .eq('id', companyId);
  } catch { /* column may not exist */ }

  // local mirror for fast gate (also clear the pre-rebrand key)
  try {
    localStorage.setItem(`kinikerja_setup_${companyId}`, '1');
    localStorage.removeItem(`hrisloka_setup_${companyId}`);
  } catch { /* ignore */ }

  return { data: payload, error };
}

/**
 * Fast check used by layout gate (async, with local cache).
 * Legacy tenants (already have company + code) are auto-marked complete
 * so existing owners are not locked out after deploy.
 */
export async function needsOwnerSetup() {
  const me = await resolveMyEmployee();
  if (!me) return false;
  if (!['super_admin', 'hr_admin'].includes(me.role)) return false;

  if (me.company_id) {
    try {
      // Legacy pre-rebrand key still honoured once, then migrated.
      if (localStorage.getItem(`kinikerja_setup_${me.company_id}`) === '1') return false;
      if (localStorage.getItem(`hrisloka_setup_${me.company_id}`) === '1') {
        try { localStorage.setItem(`kinikerja_setup_${me.company_id}`, '1'); } catch { /* ignore */ }
        return false;
      }
    } catch { /* ignore */ }
  }

  const state = await getOwnerSetupState();
  if (state.complete) return false;

  // Existing production tenant: company already provisioned → don't force wizard
  if (state.company?.id && state.company?.company_code && state.company?.name) {
    await completeOwnerSetup(state.company.id, { legacy_auto: true });
    return false;
  }

  // New owner: no company or incomplete shell → force /setup
  return true;
}
