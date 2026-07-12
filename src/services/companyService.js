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
  marital_status,
  address,
  division,
  position,
  join_date,
  photoFile,
}) {
  if (!companyId) {
    return { data: null, error: { message: 'Perusahaan tidak valid. Ulangi verifikasi kode perusahaan.' } };
  }
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !password || !name) {
    return { data: null, error: { message: 'Email, password, dan nama wajib diisi.' } };
  }

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: { full_name: name, role: 'employee' },
      emailRedirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/app/login`
        : undefined,
    },
  });
  if (authError) return { data: null, error: authError };

  const authUserId = authData.user?.id;
  if (!authUserId) {
    return {
      data: null,
      error: {
        message:
          'Pendaftaran hampir selesai. Cek email untuk verifikasi akun, lalu login. ' +
          'Jika tidak menerima email, hubungi HR.',
      },
    };
  }

  // 2. Upload photo if provided (non-blocking for registration success)
  let photo_url = null;
  if (photoFile && authUserId) {
    try {
      const ext = (photoFile.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${authUserId}/avatar_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('profile_photos')
        .upload(path, photoFile, { upsert: true, contentType: photoFile.type || `image/${ext}` });
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage
          .from('profile_photos')
          .getPublicUrl(path);
        photo_url = publicUrl;
      } else {
        console.warn('[companyService] photo upload failed:', uploadErr.message);
      }
    } catch (photoErr) {
      console.warn('[companyService] photo upload exception:', photoErr?.message);
    }
  }

  // Prefer NIK as NIP when valid; otherwise generate
  const nip =
    nik && String(nik).replace(/\D/g, '').length >= 8
      ? String(nik).replace(/\D/g, '').slice(0, 20)
      : `EMP-${Date.now().toString().slice(-8)}`;

  // 3. Create employee record (pending HR verification)
  const payload = {
    company_id: companyId,
    auth_user_id: authUserId,
    email: cleanEmail,
    name: String(name).trim(),
    nip,
    phone: phone || null,
    whatsapp: phone || null,
    birth_date: birth_date || null,
    gender: gender || null,
    address: address || null,
    division: division || null,
    position: position || null,
    join_date: join_date || null,
    photo_url,
    account_status: 'pending_verification',
    registered_at: new Date().toISOString(),
    role: 'employee',
    status: 'contract',
    leave_quota: 12,
    leave_used: 0,
    base_salary: 0,
    allowance: 0,
    profile_setup_done: true, // form already collected core fields
  };
  // Optional columns (older DBs may lack these)
  if (nik) payload.nik = String(nik).replace(/\D/g, '').slice(0, 20);
  if (marital_status) payload.marital_status = marital_status;

  const { data: emp, error: empError } = await supabase
    .from('employees')
    .insert(payload)
    .select()
    .single();

  if (empError) {
    // Retry without optional columns if schema is older
    const msg = empError.message || '';
    if (/marital_status|nik|column|schema/i.test(msg)) {
      const slim = { ...payload };
      delete slim.marital_status;
      if (/nik/i.test(msg)) delete slim.nik;
      const retry = await supabase.from('employees').insert(slim).select().single();
      if (!retry.error) return { data: retry.data, error: null };
    }

    // Auth user exists but employee row failed — surface actionable error
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
  return { data: emp, error: null, needsEmailConfirm: !authData.session };
}

// ── Admin: Verify / Reject ────────────────────────────────────────────────────

/** Seed default onboarding checklist after HR accepts registration */
async function seedOnboardingTasks(employeeId) {
  if (!employeeId) return;
  try {
    const defaults = [
      { title: 'Lengkapi data profil & kontak darurat', sort_order: 1 },
      { title: 'Upload dokumen KTP / NPWP', sort_order: 2 },
      { title: 'Daftarkan Face ID untuk absensi', sort_order: 3 },
      { title: 'Baca kebijakan & SOP perusahaan', sort_order: 4 },
    ].map((t) => ({
      employee_id: employeeId,
      title: t.title,
      status: 'pending',
      sort_order: t.sort_order,
    }));
    // Ignore if table missing or already seeded
    const { data: existing } = await supabase
      .from('onboarding_tasks')
      .select('id')
      .eq('employee_id', employeeId)
      .limit(1);
    if (existing?.length) return;
    await supabase.from('onboarding_tasks').insert(defaults);
  } catch (e) {
    console.warn('[companyService] seedOnboardingTasks:', e?.message);
  }
}

/** Accept a pending employee registration — MANDATORY company ownership */
export async function acceptEmployeeRegistration(employeeId, verifiedById, assignRole = 'employee', companyId) {
  if (!guardCompanyId(companyId, 'acceptEmployeeRegistration')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const { data, error } = await supabase
    .from('employees')
    .update({
      account_status: 'active',
      role: assignRole || 'employee',
      verified_by: verifiedById,
      verified_at: new Date().toISOString(),
      rejection_reason: null,
      profile_setup_done: true,
    })
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .eq('account_status', 'pending_verification')
    .select('id, name, email, phone, auth_user_id, company_id')
    .maybeSingle();

  if (error) return { data: null, error };
  if (!data) {
    return { data: null, error: { message: 'Pendaftaran tidak ditemukan atau sudah diproses' } };
  }

  // Side-effects: onboarding + notify employee (non-blocking)
  seedOnboardingTasks(data.id).catch(() => {});
  try {
    const { createNotification } = await import('./notificationService');
    createNotification({
      employeeId: data.id,
      companyId,
      type: 'system',
      title: 'Akun Anda telah diaktifkan',
      body: 'HR telah menyetujui pendaftaran. Anda dapat menggunakan absensi dan fitur karyawan.',
      data: { path: '/app/home' },
    }).catch(() => {});
  } catch { /* optional */ }
  try {
    const { sendPushToEmployee } = await import('./pushService');
    if (data.auth_user_id || data.id) {
      sendPushToEmployee(
        data.id,
        'Akun Diaktifkan',
        'Pendaftaran Anda disetujui HR. Silakan buka HRIS Loka.',
        '/app/home',
        companyId,
      ).catch(() => {});
    }
  } catch { /* optional */ }
  try {
    if (data.phone) {
      const { sendWhatsApp } = await import('./whatsappService');
      sendWhatsApp(
        data.phone,
        `🏢 *HRIS Loka*\n\nHalo, *${data.name}*!\n\nAkun Anda telah *DISETUJUI* oleh HR. Silakan login di aplikasi karyawan.\n\n_HRIS Loka_`,
      ).catch(() => {});
    }
  } catch { /* optional */ }

  return { data, error: null };
}

/** Reject a pending employee registration — MANDATORY company ownership */
export async function rejectEmployeeRegistration(employeeId, verifiedById, reason, companyId) {
  if (!guardCompanyId(companyId, 'rejectEmployeeRegistration')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  const rejectReason = reason || 'Tidak memenuhi syarat.';
  const { data, error } = await supabase
    .from('employees')
    .update({
      account_status: 'rejected',
      verified_by: verifiedById,
      verified_at: new Date().toISOString(),
      rejection_reason: rejectReason,
    })
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .eq('account_status', 'pending_verification')
    .select('id, name, email, phone, auth_user_id, company_id')
    .maybeSingle();

  if (error) return { data: null, error };
  if (!data) {
    return { data: null, error: { message: 'Pendaftaran tidak ditemukan atau sudah diproses' } };
  }

  try {
    const { createNotification } = await import('./notificationService');
    createNotification({
      employeeId: data.id,
      companyId,
      type: 'system',
      title: 'Pendaftaran ditolak',
      body: rejectReason,
      data: { path: '/app/rejected' },
    }).catch(() => {});
  } catch { /* optional */ }
  try {
    if (data.phone) {
      const { sendWhatsApp } = await import('./whatsappService');
      sendWhatsApp(
        data.phone,
        `🏢 *HRIS Loka*\n\nHalo, *${data.name}*!\n\nMaaf, pendaftaran Anda *DITOLAK*.\nAlasan: ${rejectReason}\n\n_HRIS Loka_`,
      ).catch(() => {});
    }
  } catch { /* optional */ }

  return { data, error: null };
}

/** Get all pending registrations for admin — MANDATORY company scope */
export async function getPendingRegistrations(companyId) {
  if (!guardCompanyId(companyId, 'getPendingRegistrations')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('employees')
    .select('*, companies:company_id(name, company_code)')
    .eq('account_status', 'pending_verification')
    .eq('company_id', companyId)
    .order('registered_at', { ascending: false });

  // Flatten company fields for UI
  const rows = (data || []).map((row) => ({
    ...row,
    company_name: row.companies?.name || row.company_name,
    company_code: row.companies?.company_code || row.company_code,
  }));
  return { data: rows, error };
}
