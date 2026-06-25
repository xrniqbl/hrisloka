import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// Get all branches — MANDATORY company scope
export async function getAllBranches(companyId) {
  if (!guardCompanyId(companyId, 'getAllBranches')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('branches')
    .select('*, manager:employees!branches_manager_id_fkey(id, name, position, photo_url)')
    .eq('company_id', companyId)
    .order('name');
  return { data: data || [], error };
}

// Get active branches only — MANDATORY company scope
export async function getActiveBranches(companyId) {
  if (!guardCompanyId(companyId, 'getActiveBranches')) return { data: [], error: null };
  const { data, error } = await supabase.from('branches').select('*').eq('is_active', true).eq('company_id', companyId).order('name');
  return { data: data || [], error };
}

// Get branch by ID — MANDATORY company_id for tenant isolation
export async function getBranchById(id, companyId = null) {
  if (!guardCompanyId(companyId, 'getBranchById')) return { data: null, error: { message: 'company_id required' } };
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single();
  return { data, error };
}

// Create branch — company_id is REQUIRED
export async function createBranch(branch) {
  if (!guardCompanyId(branch.company_id, 'createBranch')) return { data: null, error: new Error('company_id required') };
  const { data, error } = await supabase
    .from('branches')
    .insert({
      name: branch.name,
      code: branch.code,
      address: branch.address || null,
      phone: branch.phone || null,
      latitude: branch.latitude,
      longitude: branch.longitude,
      radius_meters: branch.radius_meters || 100,
      timezone: branch.timezone || 'Asia/Jakarta',
      is_active: branch.is_active !== false,
      location_type: branch.location_type || 'branch_office',
      manager_id: branch.manager_id || null,
      company_id: branch.company_id,
    })
    .select()
    .single();
  return { data, error };
}

// Update branch — MANDATORY company_id for tenant isolation
export async function updateBranch(id, branch, companyId) {
  if (!guardCompanyId(companyId, 'updateBranch')) return { data: null, error: new Error('company_id required') };
  const { data, error } = await supabase
    .from('branches')
    .update({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      latitude: branch.latitude,
      longitude: branch.longitude,
      radius_meters: branch.radius_meters,
      timezone: branch.timezone,
      is_active: branch.is_active,
      location_type: branch.location_type,
      manager_id: branch.manager_id || null,
    })
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single();
  return { data, error };
}

// Delete branch — MANDATORY company_id for tenant isolation
export async function deleteBranch(id, companyId) {
  if (!guardCompanyId(companyId, 'deleteBranch')) return { error: new Error('company_id required') };
  const { error } = await supabase
    .from('branches')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  return { error };
}

// Get employee count per branch — MANDATORY company scope
export async function getBranchEmployeeCounts(companyId) {
  if (!guardCompanyId(companyId, 'getBranchEmployeeCounts')) return { data: {}, error: null };
  const { data, error } = await supabase.from('employees').select('branch_id').eq('company_id', companyId);
  if (error) return { data: {}, error };
  const counts = {};
  (data || []).forEach(e => {
    const bid = e.branch_id || 'unassigned';
    counts[bid] = (counts[bid] || 0) + 1;
  });
  return { data: counts, error: null };
}

// Get branch holidays — MANDATORY company ownership via branch
export async function getBranchHolidays(branchId, companyId) {
  if (!guardCompanyId(companyId, 'getBranchHolidays')) return { data: [], error: null };
  // Verify branch belongs to this company
  const { data: branch } = await supabase
    .from('branches')
    .select('id')
    .eq('id', branchId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (!branch) return { data: [], error: { message: 'Branch not found in your company' } };
  const { data, error } = await supabase
    .from('branch_holidays')
    .select('*, holidays(*)')
    .eq('branch_id', branchId);
  return { data: data || [], error };
}

// Assign holiday to branch — MANDATORY company ownership via branch
export async function assignHolidayToBranch(branchId, holidayId, companyId) {
  if (!guardCompanyId(companyId, 'assignHolidayToBranch')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const { data: branch } = await supabase
    .from('branches')
    .select('id')
    .eq('id', branchId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (!branch) return { data: null, error: { message: 'Branch not found in your company' } };
  const { data, error } = await supabase
    .from('branch_holidays')
    .upsert({ branch_id: branchId, holiday_id: holidayId }, { onConflict: 'branch_id,holiday_id' })
    .select()
    .single();
  return { data, error };
}

// Remove holiday from branch — MANDATORY company ownership via branch
export async function removeHolidayFromBranch(branchId, holidayId, companyId) {
  if (!guardCompanyId(companyId, 'removeHolidayFromBranch')) {
    return { error: { message: 'company_id required' } };
  }
  const { data: branch } = await supabase
    .from('branches')
    .select('id')
    .eq('id', branchId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (!branch) return { error: { message: 'Branch not found in your company' } };
  const { error } = await supabase
    .from('branch_holidays')
    .delete()
    .eq('branch_id', branchId)
    .eq('holiday_id', holidayId);
  return { error };
}
