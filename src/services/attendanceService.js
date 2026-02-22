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

// Get all attendance for a date (admin)
export async function getAttendanceByDate(date) {
    const { data, error } = await supabase
        .from('attendance')
        .select('*, employees(name, division, position)')
        .eq('date', date)
        .order('clock_in');
    return { data: data || [], error };
}

// Get all attendance today (admin)
export async function getAllAttendanceToday() {
    const today = new Date().toISOString().split('T')[0];
    return getAttendanceByDate(today);
}

// Get all attendance records (admin, with limit)
export async function getAllAttendance(limit = 500) {
    const { data, error } = await supabase
        .from('attendance')
        .select('*, employees(name, division, position)')
        .order('date', { ascending: false })
        .limit(limit);
    return { data: data || [], error };
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
