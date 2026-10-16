import { useState, useEffect, useRef } from 'react';
import {
  HiBell,
  HiBellAlert,
  HiCalendarDays,
  HiCheck,
  HiCheckCircle,
  HiCog6Tooth,
  HiCurrencyDollar,
  HiUsers,
  HiXMark
} from 'react-icons/hi2';
import { supabase } from '../lib/supabase';
import { sanitizeAppPath } from '../lib/safePath';
import { useAuth } from '../context/AuthContext';
import './NotificationCenter.css';

const typeIcons = {
 leave: <HiCalendarDays />, approval: <HiCheckCircle />, announcement: <HiBell />,
 birthday: <HiUsers />, contract: <HiBellAlert />, system: <HiCog6Tooth />,
 payroll: <HiCurrencyDollar />, platform: <HiBellAlert />,
};
const typeColors = {
 leave: '#5654D4', approval: '#16A34A', announcement: '#F59E0B',
 birthday: '#EC4899', contract: '#DC2626', system: '#6D8196', payroll: '#8B5CF6',
 platform: '#5654D4',
};

export default function NotificationCenter() {
 const { employee } = useAuth();
 const [notifications, setNotifications] = useState([]);
 const [open, setOpen] = useState(false);
 const [loading, setLoading] = useState(false);
 const ref = useRef(null);

 const fetchNotifications = async () => {
 if (!employee?.id) return;
 setLoading(true);
 // Always scope to own employee_id (RLS + app filter)
 const { data } = await supabase.from('notifications').select('*')
 .eq('employee_id', employee.id)
 .order('created_at', { ascending: false })
 .limit(30);
 setNotifications(data || []);
 setLoading(false);
 };

 useEffect(() => {
 if (!employee?.id) return;
 fetchNotifications();

 // Realtime channel scoped per employee to reduce cross-tenant noise
 const channel = supabase.channel(`notifications-emp-${employee.id}`)
 .on('postgres_changes', {
 event: 'INSERT',
 schema: 'public',
 table: 'notifications',
 filter: `employee_id=eq.${employee.id}`,
 }, (payload) => {
 if (payload.new.employee_id === employee.id) {
 setNotifications(prev => [payload.new, ...prev]);
 }
 })
 .subscribe();

 return () => { supabase.removeChannel(channel); };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [employee?.id]);

 // Close on outside click
 useEffect(() => {
 const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
 document.addEventListener('mousedown', handler);
 return () => document.removeEventListener('mousedown', handler);
 }, []);

 const unreadCount = notifications.filter(n => !n.read).length;

 const markRead = async (id) => {
 if (!employee?.id) return;
 await supabase.from('notifications').update({ read: true })
 .eq('id', id)
 .eq('employee_id', employee.id);
 setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
 };

 const markAllRead = async () => {
 if (!employee?.id) return;
 const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
 if (unreadIds.length === 0) return;
 await supabase.from('notifications').update({ read: true })
 .eq('employee_id', employee.id)
 .eq('read', false);
 setNotifications(prev => prev.map(n => ({ ...n, read: true })));
 };

 const timeAgo = (date) => {
 const now = Date.now();
 const diff = now - new Date(date).getTime();
 const mins = Math.floor(diff / 60000);
 if (mins < 1) return 'Baru saja';
 if (mins < 60) return `${mins}m lalu`;
 const hours = Math.floor(mins / 60);
 if (hours < 24) return `${hours}j lalu`;
 const days = Math.floor(hours / 24);
 return `${days}h lalu`;
 };

 return (
 <div className="notification-center" ref={ref}>
 <button className="nc-bell" onClick={() => setOpen(!open)} title="Notifikasi">
 <HiBell />
 {unreadCount > 0 && <span className="nc-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
 </button>

 {open && (
 <div className="nc-dropdown">
 <div className="nc-header">
 <span className="nc-title">Notifikasi</span>
 {unreadCount > 0 && (
 <button className="nc-mark-all" onClick={markAllRead}>
 <HiCheck /> Tandai Semua Dibaca
 </button>
 )}
 </div>

 <div className="nc-list">
 {loading ? (
 <div className="nc-empty">Memuat...</div>
 ) : notifications.length === 0 ? (
 <div className="nc-empty">
 <HiBell style={{ fontSize: 24, opacity: 0.3, marginBottom: 8 }} />
 <div>Tidak ada notifikasi</div>
 </div>
 ) : notifications.map(n => (
 <div
 key={n.id}
 className={`nc-item ${!n.read ? 'unread' : ''}`}
 onClick={() => {
   markRead(n.id);
   let data = n.data;
   if (typeof data === 'string') {
     try { data = JSON.parse(data); } catch { data = {}; }
   }
   const actionUrl = n.link || data?.action_url;
   if (actionUrl) {
     const raw = String(actionUrl).trim();
     // Reject protocol-relative URLs (//evil.com) outright
     if (raw.startsWith('//')) {
       // ignore — invalid URL, stay (already marked read)
     } else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) && !/^https?:\/\//i.test(raw)) {
       // Reject javascript:, data:, vbscript:, etc. — anything with a
       // scheme colon that is not http(s). Stops scheme bypasses where
       // ':' appears before the first '/'.
     } else if (/^https?:\/\//i.test(raw)) {
       // Absolute http(s): only allow same-origin
       try {
         if (new URL(raw, window.location.origin).origin === window.location.origin) {
           window.location.href = new URL(raw, window.location.origin).pathname
             + new URL(raw, window.location.origin).search
             + new URL(raw, window.location.origin).hash;
         }
         // else: cross-origin → ignore (do not open)
       } catch {
         // unparsable → ignore
       }
     } else if (raw.startsWith('/')) {
       // Internal relative path: must not be // and must not contain
       // ':' before the first '/' (catches /\/evil, /javascript: etc.)
       const firstSlash = raw.indexOf('/', 1);
       const head = firstSlash === -1 ? raw : raw.slice(0, firstSlash);
       if (!head.includes(':')) {
         const safe = sanitizeAppPath(raw, '');
         if (safe) window.location.href = safe;
       }
       // else: ignore
     }
     // else: bare relative / scheme-less junk → ignore
   } else if (n.type === 'platform') {
     window.location.href = '/settings';
   }
 }}
 >
 <div className="nc-item-icon" style={{ background: `${typeColors[n.type] || '#6D8196'}15`, color: typeColors[n.type] || '#6D8196' }}>
 {typeIcons[n.type] || <HiBell />}
 </div>
 <div className="nc-item-content">
 <div className="nc-item-title">{n.title}</div>
 {n.message && <div className="nc-item-message">{n.message}</div>}
 <div className="nc-item-time">{timeAgo(n.created_at)}</div>
 </div>
 {!n.read && <div className="nc-unread-dot" />}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}
