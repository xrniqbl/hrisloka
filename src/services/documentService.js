import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

const BUCKET_NAME = 'employee_docs';

/**
 * Upload a document to Supabase Storage and save metadata to PostgreSQL
 * @param {File} file - The file object to upload
 * @param {number} employeeId - ID of the employee
 * @param {string} type - Document type (e.g., 'KTP', 'Sick Note')
 */
export async function uploadDocument(file, employeeId, type) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${employeeId}/${type}_${Date.now()}.${fileExt}`;
  const filePath = fileName;

  // 1. Upload to Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (uploadError) return { error: uploadError };

  // 2. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  // 3. Save to Metadata Table
  const { data, error } = await supabase
    .from('documents')
    .insert({
      employee_id: employeeId,
      type: type,
      name: file.name,
      url: publicUrl,
      status: 'pending'
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Get all documents (Admin/HR view) — scoped by company for multi-tenant isolation
 */
export async function getAllDocuments(companyId) {
  if (!guardCompanyId(companyId, 'getAllDocuments')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      employees!inner(
        name,
        nip,
        division,
        company_id
      )
    `)
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

/**
 * Get documents for a specific employee
 */
export async function getEmployeeDocuments(employeeId) {
  return await supabase
    .from('documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
}

/**
 * Update document status (Approve/Reject)
 */
export async function updateDocumentStatus(id, status) {
  return await supabase
    .from('documents')
    .update({ status })
    .eq('id', id);
}

/**
 * Real-time subscription for new documents
 */
export function subscribeToDocuments(callback) {
  return supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'documents'
      },
      (payload) => callback(payload)
    )
    .subscribe();
}
