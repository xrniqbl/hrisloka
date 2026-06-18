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
 const { enabled = true, event = '*', filter } = options;
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
 }, [table, enabled, event, filter]);
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

  useEffect(() => {
    callbackRefs.current = subscriptions.map(s => s.onRefresh);
  });

  useEffect(() => {
    if (!subscriptions.length) return;

    const channelName = `realtime-multi-${Date.now()}`;
    let channel = supabase.channel(channelName);

    subscriptions.forEach(({ table, event = '*', filter }, index) => {
      const config = { event, schema: 'public', table };
      if (filter) config.filter = filter;

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
    // subscriptions.length is stable; individual callbacks stay fresh via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions.length]);
}
