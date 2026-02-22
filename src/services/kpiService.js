import { supabase } from '../lib/supabase';

// Get all KPI records (admin)
export async function getAllKPI() {
    const { data, error } = await supabase
        .from('kpi_records')
        .select('*, employees(name, division, position), kpi_metrics(*)')
        .order('period', { ascending: false });
    return { data: data || [], error };
}

// Get KPI for specific employee
export async function getEmployeeKPI(employeeId) {
    const { data, error } = await supabase
        .from('kpi_records')
        .select('*, kpi_metrics(*)')
        .eq('employee_id', employeeId)
        .order('period', { ascending: false });
    return { data: data || [], error };
}

// Create KPI record with metrics
export async function createKPI(employeeId, period, overallScore, metrics) {
    // Insert record
    const { data: record, error: recordError } = await supabase
        .from('kpi_records')
        .insert({ employee_id: employeeId, period, overall_score: overallScore })
        .select()
        .single();
    if (recordError) return { error: recordError };

    // Insert metrics
    if (metrics && metrics.length > 0) {
        const metricsData = metrics.map(m => ({
            kpi_record_id: record.id,
            name: m.name,
            target: m.target,
            actual: m.actual,
            score: m.score,
        }));
        const { error: metricsError } = await supabase
            .from('kpi_metrics')
            .insert(metricsData);
        if (metricsError) return { data: record, error: metricsError };
    }

    return { data: record, error: null };
}

// Update KPI record
export async function updateKPI(id, updates) {
    const { data, error } = await supabase
        .from('kpi_records')
        .update({ overall_score: updates.overallScore })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

// Delete KPI record (cascades metrics)
export async function deleteKPI(id) {
    const { error } = await supabase.from('kpi_records').delete().eq('id', id);
    return { error };
}
