import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

/** Preferred private bucket names (first match wins) */
const BUCKET_CANDIDATES = ['employee_docs', 'employee-documents', 'documents'];

/**
 * Resolve a stored document reference into a viewable URL.
 *
 * Prefer STORAGE PATH + signed URL (private). Legacy absolute https URLs
 * are returned as-is so old public uploads still open.
 *
 * @param {string} ref - storage path or legacy https URL
 * @param {number} expiresIn - seconds (default 1 hour)
 */
export async function getDocumentUrl(ref, expiresIn = 3600) {
  if (!ref) return null;
  if (/^https?:\/\//i.test(ref)) return ref;
  if (ref === '#' || ref.startsWith('data:')) return null;

  for (const bucket of BUCKET_CANDIDATES) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(ref, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  console.error('[documentService] createSignedUrl failed for all buckets');
  return null;
}

/**
 * Upload file to private storage and insert employee_documents (or documents).
 * Stores PATH not public URL — open later via getDocumentUrl / DocLink.
 *
 * @param {File} file
 * @param {string|number} employeeId
 * @param {string} type - document type code
 * @param {{ companyId?: string|number }} [opts]
 */
export async function uploadDocument(file, employeeId, type, _opts = {}) {
  if (!file) return { data: null, error: { message: 'File wajib diisi' } };
  if (!employeeId) return { data: null, error: { message: 'employeeId required' } };
  if (!type) return { data: null, error: { message: 'Jenis dokumen wajib' } };

  // Size & type guards (identity docs)
  if (file.size > 10 * 1024 * 1024) {
    return { data: null, error: { message: 'Ukuran file maksimal 10MB' } };
  }
  const allowed = /^(application\/pdf|image\/(jpeg|jpg|png|webp))$/i;
  if (file.type && !allowed.test(file.type)) {
    return { data: null, error: { message: 'Format harus PDF, JPG, atau PNG' } };
  }

  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const storagePath = `${employeeId}/${type}_${Date.now()}.${ext}`;

  let uploadedBucket = null;
  let lastUploadErr = null;
  for (const bucket of BUCKET_CANDIDATES) {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
    if (!uploadError) {
      uploadedBucket = bucket;
      break;
    }
    lastUploadErr = uploadError;
  }

  if (!uploadedBucket) {
    return {
      data: null,
      error: lastUploadErr || {
        message:
          'Gagal upload. Buat bucket Storage privat: employee_docs (disarankan) di Supabase.',
      },
    };
  }

  // Prefer employee_documents (PWA schema)
  const empDocRow = {
    employee_id: employeeId,
    document_type: type,
    file_name: file.name,
    // store PATH only — never public URL for identity docs
    file_url: storagePath,
    status: 'pending',
  };

  let { data, error } = await supabase
    .from('employee_documents')
    .insert(empDocRow)
    .select()
    .single();

  // Fallback legacy `documents` table
  if (error && /relation|does not exist|schema cache/i.test(error.message || '')) {
    const legacy = await supabase
      .from('documents')
      .insert({
        employee_id: employeeId,
        type,
        name: file.name,
        url: storagePath,
        status: 'pending',
      })
      .select()
      .single();
    data = legacy.data;
    error = legacy.error;
  }

  if (error) {
    // Best-effort cleanup of orphaned storage object
    try {
      await supabase.storage.from(uploadedBucket).remove([storagePath]);
    } catch { /* ignore */ }
    return { data: null, error };
  }

  return { data, error: null, path: storagePath, bucket: uploadedBucket };
}

/**
 * Get all documents (Admin/HR) — company scoped
 */
export async function getAllDocuments(companyId) {
  if (!guardCompanyId(companyId, 'getAllDocuments')) return { data: [], error: null };

  const empDocs = await supabase
    .from('employee_documents')
    .select(`
      *,
      employees!inner(name, nip, division, company_id)
    `)
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });

  if (!empDocs.error) {
    // Normalize field names for admin UI (type / name / url)
    const normalized = (empDocs.data || []).map((d) => ({
      ...d,
      type: d.document_type || d.type,
      name: d.file_name || d.name,
      url: d.file_url || d.url,
    }));
    if (normalized.length > 0 || !empDocs.error) {
      // Still try merge with legacy if empty? Prefer employee_documents as source of truth
      if (normalized.length > 0) return { data: normalized, error: null };
    }
  }

  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      employees!inner(name, nip, division, company_id)
    `)
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });

  if (error && !empDocs.error) return { data: [], error: null };
  return { data: data || [], error };
}

/**
 * Get documents for one employee (PWA)
 */
export async function getEmployeeDocuments(employeeId) {
  if (!employeeId) return { data: [], error: null };
  const primary = await supabase
    .from('employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (!primary.error) return { data: primary.data || [], error: null };
  const legacy = await supabase
    .from('documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  return { data: legacy.data || [], error: legacy.error };
}

/**
 * Update document status (Approve/Reject) — optional company ownership
 */
export async function updateDocumentStatus(id, status, companyId = null) {
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
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    }
  }

  const empUpd = await supabase
    .from('employee_documents')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (empUpd.data && !empUpd.error) return empUpd;

  return supabase.from('documents').update({ status }).eq('id', id).select().single();
}

/**
 * Real-time subscription for new documents
 */
export function subscribeToDocuments(callback) {
  const channel = supabase
    .channel('docs-rt')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'employee_documents' },
      (payload) => callback(payload),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'documents' },
      (payload) => callback(payload),
    )
    .subscribe();
  return channel;
}
