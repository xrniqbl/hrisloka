import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// Get all departments — MANDATORY company filter for multi-tenant isolation
export async function getAllDepartments(companyId) {
  if (!guardCompanyId(companyId, 'getAllDepartments')) return { data: [], error: null };
  const { data, error } = await supabase.from('departments').select('*').eq('company_id', companyId).order('name');
  return { data: data || [], error };
}

// Get active departments only (for dropdowns) — MANDATORY company scope
export async function getActiveDepartments(companyId) {
  if (!guardCompanyId(companyId, 'getActiveDepartments')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true)
    .eq('company_id', companyId)
    .order('name');
  return { data: data || [], error };
}

// Create department — always attach company_id
export async function createDepartment(dept) {
  if (!guardCompanyId(dept.company_id, 'createDepartment')) return { data: null, error: { message: 'company_id required' } };
  const { data, error } = await supabase
    .from('departments')
    .insert({
      name: dept.name,
      code: dept.code || null,
      head: dept.head || null,
      description: dept.description || null,
      is_active: dept.is_active !== false,
      company_id: dept.company_id,
    })
    .select()
    .single();
  return { data, error };
}

// Update department — verify company ownership
export async function updateDepartment(id, dept, companyId) {
  let query = supabase
    .from('departments')
    .update({
      name: dept.name,
      code: dept.code,
      head: dept.head,
      description: dept.description,
      is_active: dept.is_active,
    })
    .eq('id', id);
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query.select().single();
  return { data, error };
}

// Delete department — verify company ownership
export async function deleteDepartment(id, companyId) {
  let query = supabase.from('departments').delete().eq('id', id);
  if (companyId) query = query.eq('company_id', companyId);
  const { error } = await query;
  return { error };
}

// Get employee count per department — MANDATORY company scope
export async function getDepartmentEmployeeCounts(companyId) {
  if (!guardCompanyId(companyId, 'getDepartmentEmployeeCounts')) return { data: {}, error: null };
  const { data, error } = await supabase.from('employees').select('department_id').eq('company_id', companyId);
  if (error) return { data: {}, error };
  const counts = {};
  (data || []).forEach(e => {
    const did = e.department_id || 'unassigned';
    counts[did] = (counts[did] || 0) + 1;
  });
  return { data: counts, error: null };
}
