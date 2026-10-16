import { supabase } from '../lib/supabase';
import { guardCompanyId, resolveMyEmployee } from '../lib/tenantGuard';

async function resolveSelfEmployeeId(employeeId, context) {
  const me = await resolveMyEmployee();
  if (!me?.id) {
    return { data: null, error: { message: `${context}: employee identity unavailable`, code: 'IDENTITY_UNAVAILABLE' } };
  }
  if (employeeId && String(me.id) !== String(employeeId)) {
    return { data: null, error: { message: `${context}: employee identity mismatch`, code: 'IDENTITY_MISMATCH' } };
  }
  return { employeeId: me.id };
}

// Clock in — with face & trust score support
export async function clockIn(employeeId, data = {}) {
  if (!employeeId) return { data: null, error: { message: 'employeeId required' } };
  const identity = await resolveSelfEmployeeId(employeeId, 'clockIn');
  if (identity.error) return identity;
  const resolvedEmployeeId = identity.employeeId;

  // Avoid duplicate clock-in for the same day
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('attendance')
    .select('id, clock_in, clock_out')
    .eq('employee_id', resolvedEmployeeId)
    .eq('date', today)
    .maybeSingle();

  if (existing?.clock_in && !existing?.clock_out) {
    return { data: existing, error: { message: 'Sudah clock-in hari ini. Lakukan clock-out.' } };
  }
  if (existing?.clock_in && existing?.clock_out) {
    return { data: existing, error: { message: 'Absensi hari ini sudah selesai.' } };
  }

  const clockInTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  const row = {
    employee_id: resolvedEmployeeId,
    date: today,
    clock_in: clockInTime,
    status: 'present',
    latitude: data.latitude,
    longitude: data.longitude,
    in_radius: data.inRadius ?? false,
    selfie_url: data.selfieUrl || null,
    selfie_verified: data.selfieVerified || false,
    // location_id may be UUID or int depending on schema — only send if real
    ...(data.locationId && data.locationId !== 1 && data.locationId !== 'demo-office'
      ? { location_id: data.locationId }
      : {}),
    location: data.inRadius ? 'Office' : 'Remote',
    face_verified: data.faceVerified || false,
    face_distance: data.faceDistance ?? null,
    face_confidence: data.faceConfidence ?? null,
    trust_score: data.trustScore ?? 100,
    trust_level: data.trustLevel || 'trusted',
    anti_spoof_flags: data.antiSpoofFlags || [],
  };

  // Existing shell row without clock_in → update instead of insert
  if (existing?.id && !existing.clock_in) {
    const { data: result, error } = await supabase
      .from('attendance')
      .update(row)
      .eq('id', existing.id)
      .eq('employee_id', resolvedEmployeeId)
      .select()
      .single();
    return { data: result, error };
  }

  const { data: result, error } = await supabase
    .from('attendance')
    .insert(row)
    .select()
    .single();
  return { data: result, error };
}

// Get registered face descriptors for an employee
export async function getEmployeeFaceDescriptors(employeeId) {
  if (!employeeId) return { data: [], error: null };
  let { data, error } = await supabase
    .from('employee_faces')
    .select('descriptor, label, quality_score')
    .eq('employee_id', employeeId)
    .eq('is_active', true);
  // Fallback if is_active filter fails or returns empty on legacy rows
  if (error || !data?.length) {
    const fallback = await supabase
      .from('employee_faces')
      .select('descriptor, label, quality_score')
      .eq('employee_id', employeeId);
    if (!fallback.error && fallback.data?.length) {
      data = fallback.data;
      error = null;
    }
  }
  return { data: data || [], error };
}

// Check if employee has registered face
export async function hasRegisteredFace(employeeId) {
  if (!employeeId) return { hasface: false, error: null };
  // Prefer active rows; fall back without is_active filter (older schemas)
  let { data, error } = await supabase
    .from('employee_faces')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .limit(1);
  if (error || !data?.length) {
    const fallback = await supabase
      .from('employee_faces')
      .select('id')
      .eq('employee_id', employeeId)
      .limit(1);
    data = fallback.data;
    error = fallback.error;
  }
  return { hasface: (data || []).length > 0, error };
}

// Save anti-spoofing trust log
export async function saveTrustLog(attendanceId, trustData) {
  const { data, error } = await supabase
    .from('attendance_trust_logs')
    .insert({
      attendance_id: attendanceId,
      trust_score: trustData.trustScore,
      trust_level: trustData.level,
      gps_accuracy: trustData.details?.accuracyResult?.accuracy,
      gps_samples: trustData.allSamples,
      ip_location: trustData.ipLocation,
      ip_gps_distance_km: trustData.details?.ipResult?.distanceKm,
      face_verified: trustData.faceVerified,
      face_distance: trustData.faceDistance,
      face_confidence: trustData.faceConfidence,
      liveness_passed: trustData.livenessResult?.passed,
      liveness_challenges: trustData.livenessResult?.challenges,
      device_info: {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        platform: navigator.platform,
      },
      flags: trustData.flags,
      flag_count: (trustData.flags || []).length,
    });
  return { data, error };
}

// Clock out — resolves the caller identity when legacy call sites omit employeeId.
// Verification evidence (face/GPS/trust) is recorded on the same row so
// clock-out carries the same anti-fraud proof as clock-in.
export async function clockOut(attendanceId, employeeId, evidence = {}) {
  if (!attendanceId) return { data: null, error: { message: 'attendanceId required' } };
  const identity = await resolveSelfEmployeeId(employeeId, 'clockOut');
  if (identity.error) return identity;

  const patch = {
    clock_out: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
  if (evidence && typeof evidence === 'object') {
    if (typeof evidence.latitude === 'number' && Number.isFinite(evidence.latitude)) {
      patch.clock_out_latitude = evidence.latitude;
    }
    if (typeof evidence.longitude === 'number' && Number.isFinite(evidence.longitude)) {
      patch.clock_out_longitude = evidence.longitude;
    }
    if (typeof evidence.inRadius === 'boolean') patch.clock_out_in_radius = evidence.inRadius;
    if (typeof evidence.faceVerified === 'boolean') patch.clock_out_face_verified = evidence.faceVerified;
    if (typeof evidence.faceDistance === 'number' && Number.isFinite(evidence.faceDistance)) {
      patch.clock_out_face_distance = evidence.faceDistance;
    }
    if (typeof evidence.faceConfidence === 'number' && Number.isFinite(evidence.faceConfidence)) {
      patch.clock_out_face_confidence = evidence.faceConfidence;
    }
    if (typeof evidence.trustScore === 'number' && Number.isFinite(evidence.trustScore)) {
      patch.clock_out_trust_score = Math.max(0, Math.min(100, evidence.trustScore));
    }
    if (['trusted', 'warning', 'rejected'].includes(evidence.trustLevel)) {
      patch.clock_out_trust_level = evidence.trustLevel;
    }
  }

  const { data, error } = await supabase
    .from('attendance')
    .update(patch)
    .eq('id', attendanceId)
    .eq('employee_id', identity.employeeId)
    .select()
    .single();
  return { data, error };
}

// Get today's attendance for employee
export async function getTodayAttendance(employeeId) {
  if (!employeeId) return { data: null, error: null };
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .maybeSingle(); // no row = null, not an error
  return { data, error };
}

// Get attendance history
export async function getAttendanceHistory(employeeId, limit = 30) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
}

// Get office locations — MANDATORY company scope
export async function getOfficeLocations(companyId) {
  if (!guardCompanyId(companyId, 'getOfficeLocations')) return { data: [], error: null };
  const { data, error } = await supabase.from('office_locations').select('*').eq('company_id', companyId);
  return { data: data || [], error };
}

// Get all attendance for a date (admin) — MANDATORY company scope
export async function getAttendanceByDate(date, branchId, companyId) {
  if (!guardCompanyId(companyId, 'getAttendanceByDate')) return { data: [], error: null };
  let query = supabase
    .from('attendance')
    .select('*, employees!inner(name, division, position, branch_id, company_id)')
    .eq('date', date)
    .eq('employees.company_id', companyId);
  if (branchId) query = query.eq('employees.branch_id', branchId);
  const { data, error } = await query.order('clock_in');
  return { data: data || [], error };
}

// Get all attendance today (admin) — MANDATORY company scope
export async function getAllAttendanceToday(branchId, companyId) {
  const today = new Date().toISOString().split('T')[0];
  return getAttendanceByDate(today, branchId, companyId);
}

// Get all attendance records (admin, with limit) — MANDATORY company scope
export async function getAllAttendance(limit = 500, branchId, companyId) {
  if (!guardCompanyId(companyId, 'getAllAttendance')) return { data: [], error: null };
  let query = supabase
    .from('attendance')
    .select('*, employees!inner(name, division, position, branch_id, company_id)')
    .eq('employees.company_id', companyId)
    .order('date', { ascending: false })
    .limit(limit);
  if (branchId) query = query.eq('employees.branch_id', branchId);
  const { data, error } = await query;
  return { data: data || [], error };
}

// Get 30-day attendance summary (real data for charts) — MANDATORY company scope
export async function getAttendanceSummary30Days(companyId, branchId) {
  if (!guardCompanyId(companyId, 'getAttendanceSummary30Days')) return { data: [], error: null };
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  let query = supabase
    .from('attendance')
    .select('date, status, employees!inner(company_id, branch_id)')
    .eq('employees.company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate);
  if (branchId) query = query.eq('employees.branch_id', branchId);
  const { data, error } = await query;
  if (error) return { data: [], error };
  // Group by date
  const byDate = {};
  (data || []).forEach(row => {
    if (!byDate[row.date]) byDate[row.date] = { present: 0, late: 0, absent: 0 };
    if (row.status === 'present') byDate[row.date].present++;
    else if (row.status === 'late') byDate[row.date].late++;
    else byDate[row.date].absent++;
  });
  return { data: byDate, error: null };
}

// Get attendance summary by month (employee)
export async function getMonthlyAttendance(employeeId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');
  return { data: data || [], error };
}
