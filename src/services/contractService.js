import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// ─── Contract Templates ───────────────────────────────────────────────────────

export async function getContractTemplates(companyId) {
  let query = supabase
    .from('contract_templates')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  // Show default templates + company-specific ones
  if (companyId) {
    query = query.or(`is_default.eq.true,company_id.eq.${companyId}`);
  }
  const { data, error } = await query;
  return { data: data || [], error };
}

export async function getTemplateById(id) {
  return await supabase.from('contract_templates').select('*').eq('id', id).single();
}

// Create template — MANDATORY company_id
export async function createTemplate(template) {
  if (!guardCompanyId(template.company_id, 'createTemplate')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  return await supabase.from('contract_templates').insert(template).select().single();
}

// Update template — MANDATORY company ownership
export async function updateTemplate(id, updates, companyId) {
  if (!guardCompanyId(companyId, 'updateTemplate')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  return await supabase
    .from('contract_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single();
}

// Delete template — MANDATORY company ownership
export async function deleteTemplate(id, companyId) {
  if (!guardCompanyId(companyId, 'deleteTemplate')) {
    return { error: { message: 'company_id required' } };
  }
  return await supabase.from('contract_templates').delete().eq('id', id).eq('company_id', companyId);
}

// ─── Employee Contracts ───────────────────────────────────────────────────────

export async function getAllContracts(companyId) {
  if (!guardCompanyId(companyId, 'getAllContracts')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('employee_contracts')
    .select('*, employees!inner(id, name, position, division, employee_id, company_id)')
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function getContractById(id) {
  return await supabase
    .from('employee_contracts')
    .select('*, employees(*), contract_templates(name, type)')
    .eq('id', id)
    .single();
}

export async function getContractsByEmployee(employeeId) {
  return await supabase
    .from('employee_contracts')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
}

// Create contract — verify employee belongs to the company
export async function createContract(contract, companyId) {
  if (companyId) {
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('id', contract.employee_id)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!emp) return { data: null, error: { message: 'Employee not found in your company' } };
  }
  return await supabase.from('employee_contracts').insert(contract).select().single();
}

// Update contract — verify ownership via employee join
export async function updateContract(id, updates, companyId) {
  let query = supabase
    .from('employee_contracts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (companyId) {
    const { data: contract } = await supabase
      .from('employee_contracts')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!contract) return { data: null, error: { message: 'Contract not found in your company' } };
  }
  return await query.select().single();
}

// Delete contract — verify ownership via employee join
export async function deleteContract(id, companyId) {
  if (companyId) {
    const { data: contract } = await supabase
      .from('employee_contracts')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!contract) return { error: { message: 'Contract not found in your company' } };
  }
  return await supabase.from('employee_contracts').delete().eq('id', id);
}

// Sign contract — verify ownership via employee join
export async function signContract(id, signatureData, signedBy = 'employee', companyId) {
  if (companyId) {
    const { data: contract } = await supabase
      .from('employee_contracts')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!contract) return { data: null, error: { message: 'Contract not found in your company' } };
  }
  const updates = {
    status: 'signed',
    signed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (signedBy === 'employee') {
    updates.employee_signature = signatureData;
  } else {
    updates.company_signature = signatureData;
  }
  return await supabase
    .from('employee_contracts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Auto-generate contract number: 001/PKWT/HRL/IV/2026 */
export function generateContractNumber(type, index = 1) {
  const typeCode = {
    pkwt: 'PKWT',
    pkwtt: 'PKWTT',
    offering_letter: 'OL',
    addendum: 'ADD',
    appointment: 'SK',
  }[type] || 'PKT';

  const romanMonth = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  const now = new Date();
  const month = romanMonth[now.getMonth()];
  const year = now.getFullYear();
  const num = String(index).padStart(3, '0');

  return `${num}/${typeCode}/HRL/${month}/${year}`;
}

/** Replace template {{variables}} with actual employee data */
export function fillTemplateVariables(htmlContent, employee, company = {}, extra = {}) {
  const formatDate = (d) => {
    if (!d) return '.....................';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const formatCurrency = (n) => {
    if (!n) return 'Rp ......................';
    return `Rp ${Number(n).toLocaleString('id-ID')}`;
  };

  const vars = {
    '{{company_name}}': company.name || 'PT. .......................',
    '{{company_address}}': company.address || '.......................',
    '{{company_npwp}}': company.npwp || '.......................',
    '{{company_director}}': company.director || '.......................',
    '{{company_city}}': company.city || 'Bandung',
    '{{company_phone}}': company.phone || '.......................',
    '{{employee_name}}': employee?.name || '.......................',
    '{{employee_nik}}': employee?.nik || '.......................',
    '{{employee_nip}}': employee?.employee_id || employee?.nip || '.......................',
    '{{employee_address}}': employee?.address || '.......................',
    '{{employee_position}}': employee?.position || '.......................',
    '{{employee_division}}': employee?.division || '.......................',
    '{{employee_birth}}': employee?.birth_date ? formatDate(employee.birth_date) : '.......................',
    '{{base_salary}}': formatCurrency(employee?.base_salary || employee?.baseSalary),
    '{{allowance}}': formatCurrency(employee?.allowance),
    '{{total_salary}}': formatCurrency((employee?.base_salary || 0) + (employee?.allowance || 0)),
    '{{contract_start}}': formatDate(employee?.contract_start || employee?.join_date),
    '{{contract_end}}': formatDate(employee?.contract_end),
    '{{join_date}}': formatDate(employee?.join_date),
    '{{contract_date}}': formatDate(new Date()),
    '{{contract_number}}': extra.contractNumber || '....../......./HRL/..../......',
    '{{city}}': company.city || 'Bandung',
    '{{today}}': formatDate(new Date()),
  };

  let result = htmlContent;
  Object.entries(vars).forEach(([key, val]) => {
    result = result.replaceAll(key, val || '.......................');
  });
  return result;
}
