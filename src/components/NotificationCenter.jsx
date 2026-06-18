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
import { useAuth } from '../context/AuthContext';
import './NotificationCenter.css';

const typeIcons = {
 leave: <HiCalendarDays />, approval: <HiCheckCircle />, announcement: <HiBell />,
 birthday: <HiUsers />, contract: <HiBellAlert />, system: <HiCog6Tooth />,
 payroll: <HiCurrencyDollar />,
};
const typeColors = {
 leave: '#3B82F6', approval: '#16A34A', announcement: '#F59E0B',
 birthday: '#EC4899', contract: '#DC2626', system: '#6D8196', payroll: '#8B5CF6',
};

export default function NotificationCenter() {
 const { employee } = useAuth();
 const [notifications, setNotifications] = useState([]);
 const [open, setOpen] = useState(false);
 const [loading, setLoading] = useState(false);
 const ref = useRef(null);

 useEffect(() => {
 if (employee?.id) fetchNotifications();

 // Subscribe to realtime
 const channel = supabase.channel('notifications')
 .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
 if (payload.new.employee_id === employee?.id) {
 setNotifications(prev => [payload.new, ...prev]);
 }
 })
 .subscribe();

 return () => { supabase.removeChannel(channel); };
 }, [employee?.id]);

 // Close on outside click
 useEffect(() => {
 const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
 document.addEventListener('mousedown', handler);
 return () => document.removeEventListener('mousedown', handler);
 }, []);

 const fetchNotifications = async () => {
 setLoading(true);
 const { data } = await supabase.from('notifications').select('*')
 .eq('employee_id', employee?.id)
 .order('created_at', { ascending: false })
 .limit(30);
 setNotifications(data || []);
 setLoading(false);
 };

 const unreadCount = notifications.filter(n => !n.read).length;

 const markRead = async (id) => {
 await supabase.from('notifications').update({ read: true }).eq('id', id);
 setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
 };

 const markAllRead = async () => {
 const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
 if (unreadIds.length === 0) return;
 await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
 setNotifications(prev => prev.map(n => ({ ...n, read: true })));
 };

 const timeAgo = (date) => {
 const diff = Date.now() - new Date(date).getTime();
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
 onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; }}
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
