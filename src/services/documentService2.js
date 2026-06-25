import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// ── Employee Documents ────────────────────────────────────────────
export async function getEmployeeDocuments(employeeId) {
  return supabase
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
}

export async function uploadEmployeeDocument({ employeeId, documentType, fileUrl, fileName }) {
  return supabase.from('employee_documents').insert({
    employee_id: employeeId,
    document_type: documentType,
    file_url: fileUrl,
    file_name: fileName,
    status: 'pending',
  }).select().single();
}

// Review document — MANDATORY company ownership via employee join
export async function reviewDocument(id, { status, notes, reviewerId }, companyId) {
  if (companyId) {
    const { data: doc } = await supabase
      .from('employee_documents')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (!doc) return { data: null, error: { message: 'Document not found in your company' } };
  }
  return supabase.from('employee_documents').update({
    status,
    notes,
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single();
}

export async function deleteEmployeeDocument(id) {
  return supabase.from('employee_documents').delete().eq('id', id);
}

// Get all pending documents (admin view) — MANDATORY company scope
export async function getPendingDocuments(companyId = null) {
  if (!guardCompanyId(companyId, 'getPendingDocuments')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('employee_documents')
    .select('*, employees!inner(name, nip, division, company_id)')
    .eq('status', 'pending')
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}
