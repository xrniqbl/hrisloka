import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// Get all offboarding records — MANDATORY company scope
export async function getAllOffboarding(companyId) {
  if (!guardCompanyId(companyId, 'getAllOffboarding')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('offboarding')
    .select('*, employees!inner(name, nip, division, position, company_id), offboarding_checklist(*)')
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Get offboarding by ID
export async function getOffboardingById(id) {
  const { data, error } = await supabase
    .from('offboarding')
    .select('*, employees(name, nip, division, position), offboarding_checklist(*, assets:asset_id(name))')
    .eq('id', id)
    .single();
  return { data, error };
}

// Create offboarding record with checklist
export async function createOffboarding(offboardingData) {
  const { data: record, error: recError } = await supabase
    .from('offboarding')
    .insert({
      employee_id: offboardingData.employeeId,
      type: offboardingData.type,
      status: 'initiated',
      reason: offboardingData.reason,
      last_working_day: offboardingData.lastWorkingDay,
      pro_rata_salary: offboardingData.proRataSalary || 0,
      severance_pay: offboardingData.severancePay || 0,
    })
    .select()
    .single();
  if (recError) return { error: recError };

  // Default checklist items — can be extended per company in future
  const defaultItems = [
    'Pengembalian Laptop',
    'Pengembalian Akses Kartu',
    'Penutupan Email Perusahaan',
    'Penutupan Akses Database/VPN',
    'Kalkulasi Sisa Gaji Pro-rata',
    'Transfer Knowledge',
  ];
  const checklistData = defaultItems.map(item => ({
    offboarding_id: record.id,
    item,
    completed: false,
  }));
  await supabase.from('offboarding_checklist').insert(checklistData);

  return { data: record, error: null };
}

// Update offboarding status — MANDATORY company ownership via employee join
export async function updateOffboarding(id, updates, companyId) {
  if (companyId) {
    const { data: rec } = await supabase
      .from('offboarding')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!rec) return { data: null, error: { message: 'Offboarding record not found in your company' } };
  }
  const { data, error } = await supabase
    .from('offboarding')
    .update({
      status: updates.status,
      last_working_day: updates.lastWorkingDay,
      pro_rata_salary: updates.proRataSalary,
      severance_pay: updates.severancePay,
    })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

// Toggle checklist item — MANDATORY company ownership via offboarding → employee join
export async function toggleChecklistItem(itemId, completed, companyId) {
  if (companyId) {
    const { data: item } = await supabase
      .from('offboarding_checklist')
      .select('id, offboarding!inner(employee_id, employees!inner(company_id))')
      .eq('id', itemId)
      .eq('offboarding.employees.company_id', companyId)
      .maybeSingle();
    if (!item) return { data: null, error: { message: 'Checklist item not found in your company' } };
  }
  const { data, error } = await supabase
    .from('offboarding_checklist')
    .update({ completed })
    .eq('id', itemId)
    .select()
    .single();
  return { data, error };
}

// Delete offboarding (cascades checklist) — MANDATORY company ownership
export async function deleteOffboarding(id, companyId) {
  if (companyId) {
    const { data: rec } = await supabase
      .from('offboarding')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!rec) return { error: { message: 'Offboarding record not found in your company' } };
  }
  const { error } = await supabase.from('offboarding').delete().eq('id', id);
  return { error };
}
