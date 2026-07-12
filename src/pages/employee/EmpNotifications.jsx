import { useState, useEffect, useCallback } from 'react';
import {
  HiBell,
  HiBellAlert,
  HiCalendarDays,
  HiCheck,
  HiCheckCircle,
  HiClock,
  HiCurrencyDollar,
  HiPaperAirplane
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { isDemoMode, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import '../../styles/shared.css';

const READ_KEY = 'hrisync_notif_read';

const NOTIF_ICONS = {
  announcement: <HiBell size={16} />,
  approval: <HiCheck size={16} />,
  payslip: <HiCurrencyDollar size={16} />,
  leave: <HiCalendarDays size={16} />,
  submission: <HiPaperAirplane size={16} />,
  system: <HiBellAlert size={16} />,
};

const NOTIF_COLORS = {
  announcement: '#F59E0B',
  approval: '#10B981',
  payslip: '#16A34A',
  leave: '#635BFF',
  submission: '#8B5CF6',
  system: '#6B7280',
};

function formatRelativeDate(d, locale) {
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

function getReadSet() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); }
  catch { return new Set(); }
}

function markRead(id) {
  const s = getReadSet();
  s.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify([...s]));
}

function markAllRead(ids) {
  const s = getReadSet();
  ids.forEach(id => s.add(id));
  localStorage.setItem(READ_KEY, JSON.stringify([...s]));
}

export default function EmpNotifications() {
  const { user, employee: authEmployee } = useAuth();
  const { locale } = useTranslation();
  const [announcements, setAnnouncements] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [readIds, setReadIds] = useState(() => getReadSet());

  const loadData = useCallback(async () => {
    setLoading(true);

    if (isDemoMode()) {
      const demo = DEMO_PROFILE_DATA.notifications || [];
      setAnnouncements(demo.filter((n) => n.type === 'announcement'));
      setSubmissions(demo.filter((n) => n.type !== 'announcement'));
      setLoading(false);
      return;
    }

    let empData = authEmployee;
    if (!empData?.id) {
      const email = user?.email || user?.user_metadata?.email;
      const res = await getEmployeeByEmail(email);
      empData = res.data;
    }

    // Company-scoped announcements only — never unscoped (cross-tenant risk)
    if (empData?.company_id) {
      const { data: annData } = await supabase
        .from('announcements')
        .select('*')
        .eq('company_id', empData.company_id)
        .order('created_at', { ascending: false })
        .limit(20);
      setAnnouncements((annData || []).map((a) => ({ ...a, type: 'announcement' })));
    } else {
      setAnnouncements([]);
    }

    if (empData) {
      const empId = empData.id;
      const [leaveRes, otRes, reimbRes, loanRes, apprRes, ticketRes, payRes, notifRes] = await Promise.all([
        supabase.from('leave_requests').select('*').eq('employee_id', empId).in('status', ['approved','rejected']).order('updated_at', { ascending: false }).limit(10),
        supabase.from('overtime_requests').select('*').eq('employee_id', empId).in('status', ['approved','rejected']).order('updated_at', { ascending: false }).limit(10),
        supabase.from('reimbursements').select('*').eq('employee_id', empId).in('status', ['approved','rejected','paid']).order('updated_at', { ascending: false }).limit(10),
        supabase.from('loans').select('*').eq('employee_id', empId).in('status', ['approved','rejected','active']).order('updated_at', { ascending: false }).limit(5),
        supabase.from('appraisals').select('*').eq('employee_id', empId).order('created_at', { ascending: false }).limit(5),
        supabase.from('tickets').select('*').eq('employee_id', empId).eq('status', 'resolved').order('updated_at', { ascending: false }).limit(5),
        supabase.from('payroll_records').select('*').eq('employee_id', empId).eq('status', 'paid').order('created_at', { ascending: false }).limit(3),
        // Explicit in-app notifications written by HR services (approve leave, activate account, etc.)
        supabase.from('notifications').select('*').eq('employee_id', empId).order('created_at', { ascending: false }).limit(30),
      ]);
      const en = locale === 'en';
      const fromTable = (notifRes.data || []).map((n) => ({
        id: `notif_${n.id}`,
        type: n.type || 'system',
        title: n.title,
        message: n.message || n.body || '',
        status: n.read ? 'read' : 'unread',
        created_at: n.created_at,
      }));
      const newSubs = [
        ...fromTable,
        ...(leaveRes.data||[]).map(s => ({ id:`leave_${s.id}`, type:'leave',
          title: en ? `Leave ${s.status==='approved'?'Approved':'Rejected'}` : `Cuti ${s.status==='approved'?'Disetujui':'Ditolak'}`,
          message: en ? `${s.type} leave (${s.start_date}->${s.end_date}) was ${s.status}.` : `Cuti ${s.type} (${s.start_date}->${s.end_date}) ${s.status==='approved'?'disetujui':'ditolak'}.`,
          status:s.status, created_at:s.updated_at||s.created_at })),
        ...(otRes.data||[]).map(s => ({ id:`ot_${s.id}`, type:'approval',
          title: en ? `Overtime ${s.status==='approved'?'Approved':'Rejected'}` : `Lembur ${s.status==='approved'?'Disetujui':'Ditolak'}`,
          message: en ? `Overtime on ${s.date} was ${s.status}.` : `Lembur ${s.date} ${s.status==='approved'?'disetujui':'ditolak'}.`,
          status:s.status, created_at:s.updated_at||s.created_at })),
        ...(reimbRes.data||[]).map(s => ({ id:`reimb_${s.id}`, type:'payslip',
          title: en ? `Reimbursement ${s.status==='paid'?'Paid':s.status==='approved'?'Approved':'Rejected'}` : `Reimbursement ${s.status==='paid'?'Dibayar':s.status==='approved'?'Disetujui':'Ditolak'}`,
          message: en ? `${s.category||s.type} claim Rp${Number(s.amount).toLocaleString()} was ${s.status}.` : `Klaim ${s.category||s.type} Rp${Number(s.amount).toLocaleString()} ${s.status==='paid'?'dibayar':s.status==='approved'?'disetujui':'ditolak'}.`,
          status:s.status, created_at:s.updated_at||s.created_at })),
        ...(loanRes.data||[]).map(s => ({ id:`loan_${s.id}`, type:'payslip',
          title: en ? `Loan ${s.status==='approved'||s.status==='active'?'Approved':'Rejected'}` : `Pinjaman ${s.status==='approved'||s.status==='active'?'Disetujui':'Ditolak'}`,
          message: en ? `Loan Rp${Number(s.amount).toLocaleString()} was ${s.status}.` : `Pinjaman Rp${Number(s.amount).toLocaleString()} status: ${s.status}.`,
          status:s.status, created_at:s.updated_at||s.created_at })),
        ...(apprRes.data||[]).map(s => ({ id:`ap_${s.id}`, type:'system',
          title: en ? 'Performance Review Available' : 'Penilaian Kinerja Tersedia',
          message: en ? `Your appraisal for ${s.period||'this period'} is ready.` : `Penilaian periode ${s.period||'ini'} sudah tersedia.`,
          status:'info', created_at:s.created_at })),
        ...(ticketRes.data||[]).map(s => ({ id:`ticket_${s.id}`, type:'submission',
          title: en ? 'Helpdesk Ticket Resolved' : 'Tiket Helpdesk Diselesaikan',
          message: en ? `"${s.subject||s.title||'Your ticket'}" has been resolved.` : `"${s.subject||s.title||'Tiket'}" telah diselesaikan.`,
          status:'resolved', created_at:s.updated_at||s.created_at })),
        ...(payRes.data||[]).map(s => ({ id:`pay_${s.id}`, type:'payslip',
          title: en ? 'Salary Transferred' : 'Gaji Sudah Ditransfer',
          message: en ? `Salary for ${s.month?new Date(s.month).toLocaleDateString('en-US',{month:'long',year:'numeric'}):'this month'} paid.` : `Gaji ${s.month?new Date(s.month).toLocaleDateString('id-ID',{month:'long',year:'numeric'}):'bulan ini'} sudah ditransfer.`,
          status:'paid', created_at:s.created_at })),
      ];
      // Dedupe by id, newest first
      const seen = new Set();
      const deduped = newSubs
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .filter((n) => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
      setSubmissions(deduped);
    }
    setLoading(false);
  }, [user, locale, authEmployee?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Pull-to-refresh support
  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  // Realtime subscription for new announcements (skip in demo)
  useEffect(() => {
    if (isDemoMode()) return undefined;
    const companyId = authEmployee?.company_id;
    const ch = supabase
      .channel('notif-rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements',
        ...(companyId ? { filter: `company_id=eq.${companyId}` } : {}),
      }, (payload) => {
        setAnnouncements(prev => [{ ...payload.new, type: 'announcement' }, ...prev]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [authEmployee?.company_id]);

  const FILTERS = [
    { key: 'all',          label: locale === 'en' ? 'All'           : 'Semua' },
    { key: 'announcement', label: locale === 'en' ? 'Announcements' : 'Pengumuman' },
    { key: 'approval',     label: locale === 'en' ? 'Approvals'     : 'Persetujuan' },
    { key: 'leave',        label: locale === 'en' ? 'Leave'         : 'Cuti' },
    { key: 'payslip',      label: locale === 'en' ? 'Finance'       : 'Keuangan' },
    { key: 'submission',   label: locale === 'en' ? 'Support'       : 'Bantuan' },
  ];

  const allNotifs = [...announcements, ...submissions];
  const filtered = activeFilter === 'all' ? allNotifs : allNotifs.filter(n => n.type === activeFilter);
  const unreadCount = allNotifs.filter(n => !readIds.has(String(n.id))).length;

  const handleMarkRead = (id) => {
    markRead(id);
    setReadIds(prev => { const s = new Set(prev); s.add(String(id)); return s; });
  };

  const handleMarkAllRead = () => {
    const ids = allNotifs.map(n => String(n.id));
    markAllRead(ids);
    setReadIds(prev => { const s = new Set(prev); ids.forEach(id => s.add(id)); return s; });
  };

  if (loading) return (
    <div className="ep-loading-wrap">
      <div style={{ marginBottom: 14 }}>
        <div className="skeleton skeleton-text" style={{ width: 120, height: 20, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 200 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[80, 120, 90].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: w, height: 30, borderRadius: 99 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-card emp-card-stagger" style={{ animation: `fadeInUp 0.4s ease ${i * 0.06}s both` }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="skeleton skeleton-circle" style={{ width: 36, height: 36 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '70%', marginBottom: 8 }} />
                <div className="skeleton skeleton-text-sm" style={{ width: '90%', marginBottom: 6 }} />
                <div className="skeleton skeleton-text-sm" style={{ width: '40%' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="emp-page">
      {/* Header */}
      <div className="emp-page-header">
        <div className="page-header-actions">
          <div className="btn-icon-row">
            <h1 className="emp-page-title">
              {locale === 'en' ? 'Notifications' : 'Notifikasi'}
            </h1>
            {unreadCount > 0 && (
              <span className="status-badge active">{unreadCount}</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button className="action-btn success" onClick={handleMarkAllRead}>
              <HiCheckCircle size={14} />
              {locale === 'en' ? 'Mark all read' : 'Tandai dibaca'}
            </button>
          )}
        </div>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'Notifications and latest updates' : 'Pemberitahuan dan pembaruan terbaru'}
        </p>
      </div>

      {/* Filter chips */}
      <div className="emp-chips">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setActiveFilter(f.key)} className={`emp-chip ${activeFilter === f.key ? 'active' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="emp-card emp-empty" style={{ padding: '48px 24px' }}>
          <div
            className="emp-empty-icon"
            style={{
              opacity: 1,
              background: 'color-mix(in srgb, var(--primary, #635BFF) 10%, transparent)',
              color: 'var(--primary, #635BFF)',
              border: '1.5px solid color-mix(in srgb, var(--primary, #635BFF) 18%, transparent)',
            }}
          >
            <HiBell size={24} />
          </div>
          <div className="emp-empty-title" style={{ color: 'var(--text)' }}>
            {locale === 'en' ? 'No notifications' : 'Tidak ada notifikasi'}
          </div>
          <div className="emp-empty-desc" style={{ marginBottom: 20, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
            {locale === 'en'
              ? 'You are all caught up. Approvals, payslips, and announcements will show up here.'
              : 'Semua sudah dibaca. Persetujuan, slip gaji, dan pengumuman akan muncul di sini.'}
          </div>
          <button type="button" className="btn-primary" onClick={loadData}>
            <HiCheckCircle size={16} /> {locale === 'en' ? 'Refresh' : 'Muat Ulang'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((n, i) => {
            const color = NOTIF_COLORS[n.type] || '#6B7280';
            const isRead = readIds.has(String(n.id));
            return (
              <div
                key={n.id || i}
                className="emp-card emp-card-interactive emp-card-stagger"
                style={{ padding: 14, borderLeft: `3px solid ${isRead ? 'var(--border)' : color}`, opacity: isRead ? 0.75 : 1, position: 'relative', cursor: 'pointer' }}
                onClick={() => handleMarkRead(n.id)}
              >
                {!isRead && (
                  <div style={{ position: 'absolute', top: 14, right: 14, width: 7, height: 7, borderRadius: '50%', background: color, animation: 'pulseDot 1.8s ease-in-out infinite' }} />
                )}
                <div className="btn-icon-row" style={{ alignItems: 'flex-start' }}>
                  <div className="emp-icon-badge" style={{ background: `${color}15`, color, borderRadius: 10, width: 36, height: 36 }}>
                    {NOTIF_ICONS[n.type] || <HiBell size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: isRead ? 600 : 700, marginBottom: 3, color: 'var(--text)' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
                      {n.message}
                    </div>
                    <div className="btn-icon-row" style={{ fontSize: 11, color: 'var(--muted)' }}>
                      <HiClock size={11} />
                      {formatRelativeDate(n.created_at, locale)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
