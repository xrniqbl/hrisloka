import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// Get employee by auth user ID
export async function getMyProfile(authUserId) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();
  return { data, error };
}

/**
 * Resolve employee for the current session (production-safe).
 * Prefer email match (normalized), then auth_user_id fallback.
 */
export async function getEmployeeByEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return { data: null, error: null };

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('email', clean)
    .maybeSingle();

  if (data || error) return { data, error };

  // Fallback: auth_user_id (covers email alias / case edge cases after register)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const byAuth = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      return { data: byAuth.data, error: byAuth.error };
    }
  } catch { /* ignore */ }

  return { data: null, error: null };
}

// Get employee by ID — companyId MANDATORY for tenant-scoped admin lookups
export async function getEmployeeById(id, companyId) {
  if (!guardCompanyId(companyId, 'getEmployeeById')) return { data: null, error: new Error('company_id required') };
  const { data, error } = await supabase.from('employees').select('*').eq('id', id).eq('company_id', companyId).single();
  return { data, error };
}

// Get all employees — MANDATORY company_id filter for multi-tenant isolation
export async function getAllEmployees(branchId, companyId) {
  if (!guardCompanyId(companyId, 'getAllEmployees')) return { data: [], error: null };
  let query = supabase
    .from('employees')
    .select('*, branches(name, code)')
    .eq('company_id', companyId)
    .order('id');
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }
  const { data, error } = await query;
  return { data: data || [], error };
}

// Get employees by branch (within a company) — MANDATORY company_id for tenant isolation
export async function getEmployeesByBranch(branchId, companyId) {
  if (!guardCompanyId(companyId, 'getEmployeesByBranch')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('employees')
    .select('*, branches(name, code)')
    .eq('branch_id', branchId)
    .eq('company_id', companyId)
    .order('id');
  return { data: data || [], error };
}

// Update employee — verify company ownership (MANDATORY)
export async function updateEmployee(id, updates, companyId) {
  if (!guardCompanyId(companyId, 'updateEmployee')) return { data: null, error: new Error('company_id required') };
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single();
  return { data, error };
}

// Delete employee — verify company ownership (MANDATORY)
export async function deleteEmployee(id, companyId) {
  if (!guardCompanyId(companyId, 'deleteEmployee')) return { error: new Error('company_id required') };
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId);
  return { error };
}

// Create employee — auto-assigns a gender-appropriate avatar if no photo_url provided
// MANDATORY company_id for tenant isolation
export async function createEmployee(employeeData) {
  if (!guardCompanyId(employeeData.company_id, 'createEmployee')) {
    return { data: null, error: { message: 'company_id required' } };
  }
  // Auto-assign avatar based on gender if no photo set
  const data_with_avatar = { ...employeeData };
  if (!data_with_avatar.photo_url) {
    const { getDefaultAvatar } = await import('../lib/avatarConfig.js');
    data_with_avatar.photo_url = getDefaultAvatar(employeeData.gender);
  }

  const { data, error } = await supabase
    .from('employees')
    .insert(data_with_avatar)
    .select()
    .single();
  return { data, error };
}

// Extend contract — MANDATORY company_id for tenant isolation
export async function extendContract(id, newEndDate, companyId) {
  if (!guardCompanyId(companyId, 'extendContract')) return { data: null, error: new Error('company_id required') };
  const { data, error } = await supabase
    .from('employees')
    .update({ contract_end: newEndDate })
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single();
  return { data, error };
}

// Get distinct divisions (within a company) — MANDATORY company_id
export async function getDivisions(companyId) {
  if (!guardCompanyId(companyId, 'getDivisions')) return { data: [], error: null };
  let query = supabase.from('employees').select('division').eq('company_id', companyId).order('division');
  const { data, error } = await query;
  const divisions = [...new Set((data || []).map(d => d.division).filter(Boolean))];
  return { data: divisions, error };
}

// Update freely-editable profile fields (no HR approval needed)
// authUserId MANDATORY — employee can only update their own profile
export async function updateEmployeeDirectFields(id, fields, authUserId) {
  if (!authUserId) {
    console.warn('[TENANT GUARD] updateEmployeeDirectFields: authUserId required');
    return { data: null, error: new Error('authUserId required') };
  }
  const allowed = ['photo_url', 'address', 'phone', 'whatsapp', 'personal_email'];
  const safe = {};
  for (const key of Object.keys(fields)) {
    if (allowed.includes(key)) safe[key] = fields[key];
  }
  let query = supabase
    .from('employees')
    .update(safe)
    .eq('id', id);
  // If authUserId is provided, verify ownership (employee can only edit own profile)
  if (authUserId) query = query.eq('auth_user_id', authUserId);
  const { data, error } = await query.select().single();
  return { data, error };
}

// Upload profile photo to Supabase Storage
export async function uploadProfilePhoto(employeeId, file) {
  const fileExt = file.name.split('.').pop();
  const filePath = `${employeeId}/avatar_${Date.now()}.${fileExt}`;

  const { error: uploadErr } = await supabase.storage
    .from('profile_photos')
    .upload(filePath, file, { upsert: true });
  if (uploadErr) return { error: uploadErr };

  const { data: { publicUrl } } = supabase.storage
    .from('profile_photos')
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from('employees')
    .update({ photo_url: publicUrl })
    .eq('id', employeeId)
    .select()
    .single();
  return { data, error, url: publicUrl };
}

// Update employee role (Super Admin only) — MANDATORY company_id for tenant isolation
export async function updateEmployeeRole(id, role, companyId) {
  const validRoles = ['employee', 'hr_admin', 'manager', 'super_admin'];
  if (!validRoles.includes(role)) {
    return { error: { message: `Invalid role: ${role}` } };
  }
  if (!guardCompanyId(companyId, 'updateEmployeeRole')) return { data: null, error: new Error('company_id required') };
  const { data, error } = await supabase
    .from('employees')
    .update({ role })
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single();
  return { data, error };
}