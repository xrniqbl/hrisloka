import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// ── Company Code Validation ──────────────────────────────────────────────────

/** Validate a company code and return company info if valid — also verifies company is active */
export async function validateCompanyCode(code) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, is_active')
    .eq('company_code', code.trim().toUpperCase())
    .maybeSingle();
  if (error) return { valid: false, company: null, error: error.message };
  if (!data) return { valid: false, company: null, error: 'Kode perusahaan tidak ditemukan. Pastikan kode sudah benar.' };
  if (!data.is_active) return { valid: false, company: null, error: 'Perusahaan ini tidak aktif. Hubungi HR atau admin perusahaan Anda.' };
  return { valid: true, company: data };
}

/** Get company by ID */
export async function getCompanyById(id) {
  if (!id) return { data: null, error: null };
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return { data, error };
}

/** Get all companies (admin) — This is founder-only; no company guard needed */
export async function getAllCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at');
  return { data: data || [], error };
}

/**
 * Get or create company_code for the *current user's company only*.
 * Never falls back to "first company in DB" (that leaks multi-tenant boundaries).
 */
export async function getOrCreateCompanyCode() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  // Resolve tenant from the logged-in employee row
  const { data: emp } = await supabase
    .from('employees')
    .select('company_id, companies:company_id(*)')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (emp?.companies) {
    const company = emp.companies;
    if (company.company_code) return { data: company, error: null };

    // Generate code for existing company that has none
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'HRSLK-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const { data, error } = await supabase
      .from('companies')
      .update({ company_code: code })
      .eq('id', company.id)
      .select()
      .single();
    return { data, error };
  }

  if (emp?.company_id) {
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', emp.company_id)
      .maybeSingle();
    if (error) return { data: null, error };
    if (company?.company_code) return { data: company, error: null };
  }

  return {
    data: null,
    error: new Error('Akun Anda belum terhubung ke perusahaan. Selesaikan onboarding/checkout dulu.'),
  };
}

// ── Employee Self-Registration ────────────────────────────────────────────────

/**
 * Register a new employee from PWA self-registration.
 * Creates a Supabase auth user AND an employees record with status = pending_verification.
 */
export async function selfRegisterEmployee({
  companyId,
  email,
  password,
  name,
  phone,
  nik,
  birth_date,
  gender,
  address,
  division,
  position,
  join_date,
  photoFile,
}) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, role: 'employee' } },
  });
  if (authError) return { data: null, error: authError };

  const authUserId = authData.user?.id;

  // 2. Upload photo if provided
  let photo_url = null;
  if (photoFile && authUserId) {
    const ext = photoFile.name.split('.').pop();
    const path = `${authUserId}/avatar_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('profile_photos')
      .upload(path, photoFile, { upsert: true });
    if (!uploadErr) {
      const { data: { publicUrl } } = supabase.storage
        .from('profile_photos')
        .getPublicUrl(path);
      photo_url = publicUrl;
    }
  }

  // Generate NIP from timestamp
  const nip = `EMP-${Date.now().toString().slice(-8)}`;

  // 3. Create employee record
  const { data: emp, error: empError } = await supabase
    .from('employees')
    .insert({
      company_id: companyId,
      auth_user_id: authUserId,
      email,
      name,
      nip,
      phone,
      nik,
      birth_date,
      gender,
      address,
      division,
      position,
      join_date,
      photo_url,
      account_status: 'pending_verification',
      registered_at: new Date().toISOString(),
      role: 'employee',
      status: 'contract',
      leave_quota: 12,
      leave_used: 0,
      base_salary: 0,
      allowance: 0,
    })
    .select()
    .single();

  if (empError) {
    // The Supabase auth user has already been created at step 1 but the
    // employee row failed (duplicate NIP, RLS, missing column, etc.). The
    // client cannot delete the auth account (needs service_role), so we
    // surface a clear, actionable error and log the orphaned user id for
    // admin cleanup. Without this, the user can never log in yet the auth
    // account lingers and consumes the auth-user quota.
    console.error(
      '[companyService] selfRegisterEmployee: auth user created but employee insert failed.',
      'Orphaned auth_user_id =', authUserId,
      'Error =', empError?.message,
    );
    return {
      data: null,
      error: {
        ...empError,
        message:
          'Pendaftaran gagal: data karyawan tidak tersimpan, tetapi akun login sudah dibuat. ' +
          'Tim HR akan memverifikasi. Hubungi admin dengan kode berikut: ' +
          (authUserId?.slice(0, 8) || 'UNKNOWN'),
      },
    };
  }
  return { data: emp, error: null };
}

// ── Admin: Verify / Reject ────────────────────────────────────────────────────

/** Accept a pending employee registration — MANDATORY company ownership */
export async function acceptEmployeeRegistration(employeeId, verifiedById, assignRole = 'employee', companyId) {
  if (!guardCompanyId(companyId, 'acceptEmployeeRegistration')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const { data, error } = await supabase
    .from('employees')
    .update({
      account_status: 'active',
      role: assignRole,
      verified_by: verifiedById,
      verified_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .select()
    .single();
  return { data, error };
}

/** Reject a pending employee registration — MANDATORY company ownership */
export async function rejectEmployeeRegistration(employeeId, verifiedById, reason, companyId) {
  if (!guardCompanyId(companyId, 'rejectEmployeeRegistration')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const { data, error } = await supabase
    .from('employees')
    .update({
      account_status: 'rejected',
      verified_by: verifiedById,
      verified_at: new Date().toISOString(),
      rejection_reason: reason || 'Tidak memenuhi syarat.',
    })
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .select()
    .single();
  return { data, error };
}

/** Get all pending registrations for admin — MANDATORY company scope */
export async function getPendingRegistrations(companyId) {
  if (!guardCompanyId(companyId, 'getPendingRegistrations')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('employees')
    .select('*, companies(name, company_code)')
    .eq('account_status', 'pending_verification')
    .eq('company_id', companyId)
    .order('registered_at', { ascending: false });
  return { data: data || [], error };
}
