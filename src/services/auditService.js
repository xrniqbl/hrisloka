import { supabase } from '../lib/supabase';

/**
 * Log an action to the audit_trails table
 * @param {Object} logData - The log entry data
 */
export async function logAction({ action, targetTable, targetId, oldValue, newValue }) {
    const { data: { user } } = await supabase.auth.getUser();

    return await supabase
        .from('audit_trails')
        .insert({
            user_id: user?.id,
            action,
            target_table: targetTable,
            target_id: String(targetId),
            old_value: oldValue,
            new_value: newValue
        });
}

/**
 * Get all audit logs (Admin view)
 */
export async function getAuditLogs() {
    return await supabase
        .from('audit_trails')
        .select(`
            *,
            employees:user_id (
                name
            )
        `)
        .order('created_at', { ascending: false });
}
