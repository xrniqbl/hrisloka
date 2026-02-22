import { supabase } from '../lib/supabase';

// Clock in
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
        })
        .select()
        .single();
    return { data: result, error };
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

// Get office locations
export async function getOfficeLocations() {
    const { data, error } = await supabase
        .from('office_locations')
        .select('*');
    return { data: data || [], error };
}

// Get all attendance for a date (admin, optionally filtered by branch)
export async function getAttendanceByDate(date, branchId) {
    let query = supabase
        .from('attendance')
        .select('*, employees(name, division, position, branch_id)')
        .eq('date', date);
    if (branchId) {
        query = query.eq('employees.branch_id', branchId);
    }
    const { data, error } = await query.order('clock_in');
    // If branch filter, remove rows where employee join returned null
    const filtered = branchId ? (data || []).filter(r => r.employees) : (data || []);
    return { data: filtered, error };
}

// Get all attendance today (admin)
export async function getAllAttendanceToday(branchId) {
    const today = new Date().toISOString().split('T')[0];
    return getAttendanceByDate(today, branchId);
}

// Get all attendance records (admin, with limit)
export async function getAllAttendance(limit = 500, branchId) {
    let query = supabase
        .from('attendance')
        .select('*, employees(name, division, position, branch_id)')
        .order('date', { ascending: false })
        .limit(limit);
    if (branchId) {
        query = query.eq('employees.branch_id', branchId);
    }
    const { data, error } = await query;
    const filtered = branchId ? (data || []).filter(r => r.employees) : (data || []);
    return { data: filtered, error };
}

// Get attendance summary by month (admin)
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
