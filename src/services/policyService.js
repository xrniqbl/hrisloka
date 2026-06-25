import { supabase } from '../lib/supabase';
import { guardCompanyId, sanitizeFilterInput } from '../lib/tenantGuard';

// Get all policies — MANDATORY company scope (returns destructured { data, error })
export async function getAllPolicies(companyId = null, category = null) {
  if (!guardCompanyId(companyId, 'getAllPolicies')) return { data: [], error: null };
  let query = supabase
    .from('company_policies')
    .select('*')
    .eq('company_id', companyId)
    .order('category', { ascending: true })
    .order('title', { ascending: true });

  if (category && category !== 'all') query = query.eq('category', category);

  const { data, error } = await query;
  return { data: data || [], error };
}

// Search policies — sanitized input to prevent PostgREST filter injection (returns destructured { data, error })
export async function searchPolicies(search, companyId = null) {
  if (!guardCompanyId(companyId, 'searchPolicies')) return { data: [], error: null };
  const safe = sanitizeFilterInput(search);
  if (!safe) return { data: [], error: null };
  const { data, error } = await supabase
    .from('company_policies')
    .select('*')
    .eq('company_id', companyId)
    .or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
    .order('title', { ascending: true });

  return { data: data || [], error };
}

// Create policy — MANDATORY company_id
export async function createPolicy(policy) {
  if (!guardCompanyId(policy.company_id, 'createPolicy')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  return supabase.from('company_policies').insert([policy]).select().single();
}

// Update policy — MANDATORY company ownership
export async function updatePolicy(id, updates, companyId) {
  if (!guardCompanyId(companyId, 'updatePolicy')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  return supabase.from('company_policies').update(updates).eq('id', id).eq('company_id', companyId).select().single();
}

// Delete policy — MANDATORY company ownership
export async function deletePolicy(id, companyId) {
  if (!guardCompanyId(companyId, 'deletePolicy')) {
    return { error: { message: 'company_id required' } };
  }
  return supabase.from('company_policies').delete().eq('id', id).eq('company_id', companyId);
}
