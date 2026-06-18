import { supabase } from '../lib/supabase';
import { guardCompanyId, sanitizeFilterInput } from '../lib/tenantGuard';

// Get all policies — MANDATORY company scope
export async function getAllPolicies(companyId = null, category = null) {
  if (!guardCompanyId(companyId, 'getAllPolicies')) return { data: [], error: null };
  let query = supabase
    .from('company_policies')
    .select('*')
    .eq('company_id', companyId)
    .order('category', { ascending: true })
    .order('title', { ascending: true });

  if (category && category !== 'all') query = query.eq('category', category);

  return query;
}

// Search policies — sanitized input to prevent PostgREST filter injection
export async function searchPolicies(search, companyId = null) {
  if (!guardCompanyId(companyId, 'searchPolicies')) return { data: [], error: null };
  const safe = sanitizeFilterInput(search);
  if (!safe) return { data: [], error: null };
  let query = supabase
    .from('company_policies')
    .select('*')
    .eq('company_id', companyId)
    .or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
    .order('title', { ascending: true });

  return query;
}

export async function createPolicy(policy) {
  return supabase.from('company_policies').insert([policy]).select().single();
}

// Update policy — verify company ownership
export async function updatePolicy(id, updates, companyId) {
  let query = supabase.from('company_policies').update(updates).eq('id', id);
  if (companyId) query = query.eq('company_id', companyId);
  return query.select().single();
}

// Delete policy — verify company ownership
export async function deletePolicy(id, companyId) {
  let query = supabase.from('company_policies').delete().eq('id', id);
  if (companyId) query = query.eq('company_id', companyId);
  return query;
}
