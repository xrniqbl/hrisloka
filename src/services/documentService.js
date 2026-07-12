import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

const BUCKET_NAME = 'employee_docs';

/**
 * Resolve a stored document reference into a viewable URL.
 *
 * For privacy, employee documents (KTP, NPWP, sick notes) must NOT use
 * world-readable public URLs. We store the Storage PATH (not a public URL)
 * and mint a short-lived signed URL on demand. Legacy rows that still hold
 * an absolute https URL are returned as-is so existing data keeps working.
 *
 * @param {string} ref - storage path (e.g. "12/KTP_123.png") or legacy https URL
 * @param {number} expiresIn - signed URL lifetime in seconds (default 1h)
 * @returns {Promise<string|null>}
 */
export async function getDocumentUrl(ref, expiresIn = 3600) {
  if (!ref) return null;
  // Legacy absolute URL (public URL from old uploads) — return as-is.
  if (/^https?:\/\//i.test(ref)) return ref;
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(ref, expiresIn);
  if (error) {
    console.error('[documentService] createSignedUrl failed:', error.message);
    return null;
  }
  return data?.signedUrl || null;
}

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
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (uploadError) return { error: uploadError };

  // 2. Save the STORAGE PATH (not a public URL) so we can mint signed URLs.
  //    Bucket should be PRIVATE; getPublicUrl would expose identity documents.
  const { data, error } = await supabase
    .from('documents')
    .insert({
      employee_id: employeeId,
      type: type,
      name: file.name,
      url: filePath,
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

  // PWA uploads land in employee_documents; legacy may use documents
  const empDocs = await supabase
    .from('employee_documents')
    .select(`
      *,
      employees!inner(name, nip, division, company_id)
    `)
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });

  if (!empDocs.error && (empDocs.data?.length || 0) > 0) {
    return { data: empDocs.data || [], error: null };
  }

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

  // Prefer employee_documents empty list over documents error (table may not exist)
  if (error && !empDocs.error) return { data: empDocs.data || [], error: null };
  return { data: data || [], error };
}

/**
 * Get documents for a specific employee (PWA + legacy)
 */
export async function getEmployeeDocuments(employeeId) {
  if (!employeeId) return { data: [], error: null };
  const primary = await supabase
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (!primary.error) return { data: primary.data || [], error: null };
  return supabase
    .from('documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
}

/**
 * Update document status (Approve/Reject)
 */
export async function updateDocumentStatus(id, status, companyId = null) {
  // Prefer employee_documents (PWA uploads); fall back to documents
  if (companyId) {
    const { data: owned } = await supabase
      .from('employee_documents')
      .select('id, employees!inner(company_id)')
      .eq('id', id)
      .eq('employees.company_id', companyId)
      .maybeSingle();
    if (owned) {
      return supabase
        .from('employee_documents')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
    }
  }
  let query = supabase.from('documents').update({ status }).eq('id', id);
  const result = await query.select().maybeSingle();
  if (result.error || !result.data) {
    // Try employee_documents without join (RLS may already scope)
    return supabase.from('employee_documents').update({ status }).eq('id', id).select().single();
  }
  return result;
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
