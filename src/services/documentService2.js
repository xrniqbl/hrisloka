import { supabase } from '../lib/supabase';

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

export async function reviewDocument(id, { status, notes, reviewerId }) {
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

// Get all pending documents (admin view)
export async function getPendingDocuments(companyId = null) {
  let q = supabase
    .from('employee_documents')
    .select('*, employees(name, nip, division, company_id)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (companyId) q = q.eq('employees.company_id', companyId);
  return q;
}
