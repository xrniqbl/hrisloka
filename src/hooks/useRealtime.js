import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useRealtimeTable — Supabase Realtime subscription hook
 * Auto-refreshes data when INSERT, UPDATE, or DELETE happens on the specified table.
 *
 * @param {string} table - Supabase table name (e.g. 'employees')
 * @param {Function} onRefresh - Callback to re-fetch data (your load function)
 * @param {Object} options
 * @param {boolean} options.enabled - Whether subscription is active (default: true)
 * @param {string} options.event - Event type: 'INSERT' | 'UPDATE' | 'DELETE' | '*' (default: '*')
 * @param {string} options.filter - Optional Supabase filter string (e.g. 'employee_id=eq.5')
 *
 * Usage:
 * useRealtimeTable('employees', loadEmployees);
 * useRealtimeTable('attendance', loadAttendance, { filter: `employee_id=eq.${empId}` });
 */
export function useRealtimeTable(table, onRefresh, options = {}) {
 const { enabled = true, event = '*', filter, companyId } = options;
 const callbackRef = useRef(onRefresh);
 
 // Keep callback ref current without causing re-subscriptions
 useEffect(() => {
 callbackRef.current = onRefresh;
 }, [onRefresh]);

 useEffect(() => {
 if (!enabled || !table) return;

 const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`;
 
 let channelConfig = {
 event,
 schema: 'public',
 table,
 };
 
 if (filter) {
 channelConfig.filter = filter;
 }
 if (companyId) {
   channelConfig.filter = channelConfig.filter ? channelConfig.filter + ',company_id=eq.' + companyId : 'company_id=eq.' + companyId;
 }

 const channel = supabase
 .channel(channelName)
 .on('postgres_changes', channelConfig, (payload) => {
  // ⚠️ Dev only — never log payload in production (may contain sensitive employee data)
  if (import.meta.env.DEV) console.log(`[Realtime] ${table}:`, payload.eventType);
  callbackRef.current();
 })
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
 };
 }, [table, enabled, event, filter, companyId]);
}

/**
 * useRealtimeMultiple — Subscribe to multiple tables at once
 *
 * Uses a ref-per-subscription pattern to avoid stale closures —
 * each onRefresh callback is kept current without causing re-subscriptions.
 *
 * Usage:
 * useRealtimeMultiple([
 *   { table: 'employees', onRefresh: loadEmployees },
 *   { table: 'attendance', onRefresh: loadAttendance },
 * ]);
 */
export function useRealtimeMultiple(subscriptions = []) {
  // Keep stable refs for each callback so Realtime handlers always call the latest version
  const callbackRefs = useRef([]);
  // Kunci re-subscribe: tabel+event+filter+company (bukan hanya length) agar ganti
  // company/filter dengan jumlah sama tetap pindah channel (cegah dengar tenant lama).
  const subKey = JSON.stringify(
    (subscriptions || []).map((s) => [s.table, s.event || '*', s.filter || '', s.companyId || '']),
  );

  useEffect(() => {
    callbackRefs.current = subscriptions.map(s => s.onRefresh);
  });

  useEffect(() => {
    if (!subscriptions.length) return;

    const channelName = `realtime-multi-${Date.now()}`;
    let channel = supabase.channel(channelName);

    subscriptions.forEach(({ table, event = '*', filter, companyId }, index) => {
      const config = { event, schema: 'public', table };
      if (filter) config.filter = filter;
      if (companyId) config.filter = config.filter ? config.filter + ',company_id=eq.' + companyId : 'company_id=eq.' + companyId;

      channel = channel.on('postgres_changes', config, (payload) => {
        // ⚠️ Dev only — never log payload in production (may contain sensitive employee data)
        if (import.meta.env.DEV) console.log(`[Realtime] ${table}:`, payload.eventType);
        // Always call the latest version of the callback via ref
        callbackRefs.current[index]?.();
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // subKey mencakup semua dimensi langganan; callback tetap fresh via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subKey]);
}
