import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// Clock in — with face & trust score support
export async function clockIn(employeeId, data) {
  const { data: result, error } = await supabase
    .from('attendance')
    .insert({
      employee_id: employeeId,
      date: new Date().toISOString().split('T')[0],
      clock_in: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
      status: 'present',
      latitude: data.latitude,
      longitude: data.longitude,
      in_radius: data.inRadius,
      selfie_url: data.selfieUrl || null,
      selfie_verified: data.selfieVerified || false,
      location_id: data.locationId || 1,
      location: data.inRadius ? 'Office' : 'Remote',
      face_verified: data.faceVerified || false,
      face_distance: data.faceDistance || null,
      face_confidence: data.faceConfidence || null,
      trust_score: data.trustScore ?? 100,
      trust_level: data.trustLevel || 'trusted',
      anti_spoof_flags: data.antiSpoofFlags || [],
    })
    .select()
    .single();
  return { data: result, error };
}

// Get registered face descriptors for an employee
export async function getEmployeeFaceDescriptors(employeeId) {
  const { data, error } = await supabase
    .from('employee_faces')
    .select('descriptor, label, quality_score')
    .eq('employee_id', employeeId)
    .eq('is_active', true);
  return { data: data || [], error };
}

// Check if employee has registered face
export async function hasRegisteredFace(employeeId) {
  const { data, error } = await supabase
    .from('employee_faces')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .limit(1);
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

// Clock out
export async function clockOut(attendanceId) {
  const { data, error } = await supabase
    .from('attendance')
    .update({
      clock_out: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
    })
    .eq('id', attendanceId)
    .select()
    .single();
  return { data, error };
}

// Get today's attendance for employee
export async function getTodayAttendance(employeeId) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .single();
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
