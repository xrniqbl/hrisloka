import { useState, useEffect, useCallback } from 'react';
import {
  HiBell,
  HiBolt,
  HiCheckCircle,
  HiClock,
  HiExclamationTriangle,
  HiInformationCircle
} from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { subscribeToAnnouncements } from '../../services/broadcastService';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

const PRIORITY_CONFIG = {
  urgent: { label: 'Mendesak', color: '#DC2626', bg: 'rgba(220,38,38,0.08)', icon: <HiExclamationTriangle size={12} /> },
  high:   { label: 'Penting',   color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: <HiBolt size={12} /> },
  normal: { label: 'Info',      color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', icon: <HiInformationCircle size={12} /> },
};

const READ_KEY = 'hrisync_read_ann';

function getReadSet() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); } catch { return new Set(); }
}
function markRead(id) {
  const s = getReadSet(); s.add(String(id));
  localStorage.setItem(READ_KEY, JSON.stringify([...s]));
}

function getRelativeTime(d, locale) {
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  if (locale === 'en') {
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (diff < 60000) return 'Baru saja';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EmpAnnouncements() {
  const { locale } = useTranslation();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState(() => getReadSet());
  const [activeFilter, setActiveFilter] = useState('all');

  const PRIORITY_CONFIG = {
    urgent: { label: locale === 'en' ? 'Urgent' : 'Mendesak', color: '#DC2626', bg: 'rgba(220,38,38,0.08)', icon: <HiExclamationTriangle size={12} /> },
    high:   { label: locale === 'en' ? 'Important' : 'Penting', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: <HiBolt size={12} /> },
    normal: { label: 'Info', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', icon: <HiInformationCircle size={12} /> },
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setAnnouncements(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const channel = subscribeToAnnouncements((payload) => {
      setAnnouncements(prev => [{ ...payload, id: Date.now(), created_at: new Date().toISOString() }, ...prev]);
    });
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  // Pull-to-refresh
  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  const handleRead = (id) => {
    markRead(id);
    setReadIds(new Set(getReadSet()));
  };

  const filtered = announcements.filter(a => {
    if (activeFilter === 'unread') return !readIds.has(String(a.id));
    if (activeFilter === 'urgent') return a.priority === 'urgent' || a.priority === 'high';
    return true;
  });

  const unreadCount = announcements.filter(a => !readIds.has(String(a.id))).length;

  if (loading) return (
    <div style={{ animation: "fadeInUp 0.3s ease" }}>
      <div style={{ marginBottom: 16 }}>
        <div className="skeleton skeleton-text" style={{ width: 140, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 220 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[70, 130, 80].map((w, i) => <div key={i} className="skeleton" style={{ width: w, height: 30, borderRadius: 99 }} />)}
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="emp-card" style={{ animation: `fadeInUp 0.4s ease ${i * 0.08}s both` }}>
            <div className="skeleton" style={{ width: 70, height: 20, borderRadius: 20, marginBottom: 10 }} />
            <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 8 }} />
            <div className="skeleton skeleton-text-sm" style={{ marginBottom: 6 }} />
            <div className="skeleton skeleton-text-sm" style={{ width: '90%', marginBottom: 6 }} />
            <div className="skeleton skeleton-text-sm" style={{ width: '40%' }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ animation: "fadeInUp 0.3s ease" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 className="emp-page-title">{locale === 'en' ? 'Announcements' : 'Pengumuman'}</h1>
          {unreadCount > 0 && (
            <span style={{ padding: '2px 8px', borderRadius: 20, background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 700 }}>
              {unreadCount} baru
            </span>
          )}
        </div>
        <p className="emp-page-subtitle">Informasi terbaru dari perusahaan</p>
      </div>

      {/* Filter chips */}
      <div className="emp-chips">
        {[
          { key: 'all',    label: locale === 'en' ? 'All' : 'Semua' },
          { key: 'unread', label: locale === 'en' ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` : `Belum Dibaca${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          { key: 'urgent', label: locale === 'en' ? 'Important' : 'Penting' },
        ].map(f => (
          <button key={f.key} onClick={() => setActiveFilter(f.key)} className={`emp-chip ${activeFilter === f.key ? 'active' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="emp-card emp-empty">
          <div className="emp-empty-icon"><HiBell size={24} /></div>
          <div className="emp-empty-title">
            {activeFilter === 'unread'
              ? (locale === 'en' ? 'All caught up!' : 'Semua sudah dibaca!')
              : (locale === 'en' ? 'No announcements yet' : 'Belum ada pengumuman')}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map((a, i) => {
            const isUnread = !readIds.has(String(a.id));
            const priority = a.priority || 'normal';
            const pConf = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
            return (
              <div
                key={a.id || i}
                className={`emp-card emp-card-interactive emp-card-stagger`}
                style={{ position: 'relative', overflow: 'hidden', borderLeft: `4px solid ${pConf.color}`, opacity: isUnread ? 1 : 0.85 }}
                onClick={() => handleRead(a.id)}
              >
                {isUnread && (
                  <div style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: '50%', background: '#DC2626', animation: 'pulseDot 1.8s ease-in-out infinite' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: pConf.color, background: pConf.bg }}>
                    {pConf.icon} {pConf.label}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: isUnread ? 800 : 700, marginBottom: 6, paddingRight: 20 }}>{a.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{a.message}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                  <HiClock size={12} />
                  {getRelativeTime(a.created_at, locale)}
                  {isUnread && <span style={{ color: '#3B82F6', fontWeight: 600 }}>� {locale === 'en' ? 'Click to mark as read' : 'Klik untuk tandai dibaca'}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
