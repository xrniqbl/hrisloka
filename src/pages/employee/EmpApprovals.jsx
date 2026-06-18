import { useState, useEffect, useCallback } from 'react';
import {
  HiCheck,
  HiXMark,
  HiCalendarDays,
  HiClock,
  HiCurrencyDollar,
  HiArrowPath,
  HiClipboardDocumentCheck,
  HiBellAlert,
  HiChevronDown,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

const TYPE_CONFIG = {
  leave:       { label: 'Cuti', labelEn: 'Leave',        color: '#0047AB', icon: <HiCalendarDays size={16} />, table: 'leave_requests' },
  overtime:    { label: 'Lembur', labelEn: 'Overtime',   color: '#EF4444', icon: <HiClock size={16} />,        table: 'overtime_requests' },
  reimbursement:{ label: 'Reimburse', labelEn: 'Reimbursement', color: '#16A34A', icon: <HiCurrencyDollar size={16} />, table: 'reimbursements' },
};

function ItemCard({ item, type, onApprove, onReject, loading, locale }) {
  const cfg = TYPE_CONFIG[type];
  const [expanded, setExpanded] = useState(false);
  const isProcessing = loading === item.id;

  return (
    <div className="emp-card emp-card-stagger" style={{ borderLeft: `4px solid ${cfg.color}`, overflow: 'hidden' }}>
      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: `${cfg.color}12`, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {cfg.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>{item.employees?.name || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {type === 'leave' && `${item.type} · ${item.start_date} – ${item.end_date} (${item.days} hari)`}
            {type === 'overtime' && `${item.date} · ${item.hours} jam`}
            {type === 'reimbursement' && `${item.category} · Rp ${(item.amount||0).toLocaleString('id-ID')}`}
          </div>
        </div>
        <HiChevronDown size={16} style={{ color: 'var(--muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          {item.reason && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10, marginBottom: 10, lineHeight: 1.5 }}>"{item.reason || item.notes}"</p>}
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
            {locale === 'en' ? 'Submitted' : 'Diajukan'}: {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => onReject(item.id, type)}
              disabled={isProcessing}
              style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)', color: '#DC2626', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {isProcessing === 'reject' ? <HiArrowPath size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <HiXMark size={14} />}
              {locale === 'en' ? 'Reject' : 'Tolak'}
            </button>
            <button
              onClick={() => onApprove(item.id, type)}
              disabled={isProcessing}
              style={{ flex: 2, padding: '10px', borderRadius: 12, border: 'none', background: cfg.color, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {isProcessing === 'approve' ? <HiArrowPath size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <HiCheck size={14} />}
              {locale === 'en' ? 'Approve' : 'Setujui'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmpApprovals() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const toast = useToast();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // itemId
  const [activeType, setActiveType] = useState('leave');
  const [items, setItems] = useState({ leave: [], overtime: [], reimbursement: [] });

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    const { data: e } = await getEmployeeByEmail(user.email);
    if (!e) { setLoading(false); return; }
    setEmp(e);

    // Fetch pending items for manager's company
    const [leaves, overtimes, reimbursements] = await Promise.all([
      supabase.from('leave_requests').select('*, employees(name, division, company_id)').eq('status', 'pending').eq('employees.company_id', e.company_id).order('created_at', { ascending: true }),
      supabase.from('overtime_requests').select('*, employees(name, division, company_id)').eq('status', 'pending').eq('employees.company_id', e.company_id).order('created_at', { ascending: true }),
      supabase.from('reimbursements').select('*, employees(name, division, company_id)').eq('status', 'pending').eq('employees.company_id', e.company_id).order('created_at', { ascending: true }),
    ]);

    setItems({
      leave:         (leaves.data || []).filter(i => i.employees?.company_id === e.company_id),
      overtime:      (overtimes.data || []).filter(i => i.employees?.company_id === e.company_id),
      reimbursement: (reimbursements.data || []).filter(i => i.employees?.company_id === e.company_id),
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id, type) => {
    // SECURITY: verify item belongs to manager's company (client-side guard)
    const isOwned = items[type]?.some(i => i.id === id);
    if (!isOwned || !emp?.id) {
      toast.error('Unauthorized action');
      return;
    }
    setActionLoading(id);
    const table = TYPE_CONFIG[type].table;
    const { error } = await supabase.from(table).update({
      status: 'approved',
      approved_by: emp.id,
      approved_at: new Date().toISOString(),
    }).eq('id', id).eq('status', 'pending'); // double-check still pending

    if (!error) {
      toast.success(locale === 'en' ? 'Approved!' : 'Berhasil disetujui!');
      setItems(prev => ({ ...prev, [type]: prev[type].filter(i => i.id !== id) }));
    } else {
      toast.error(locale === 'en' ? 'Failed to approve.' : 'Gagal menyetujui.');
    }
    setActionLoading(null);
  };

  const handleReject = async (id, type) => {
    // SECURITY: verify item belongs to manager's company (client-side guard)
    const isOwned = items[type]?.some(i => i.id === id);
    if (!isOwned || !emp?.id) {
      toast.error('Unauthorized action');
      return;
    }
    setActionLoading(id);
    const table = TYPE_CONFIG[type].table;
    const { error } = await supabase.from(table).update({
      status: 'rejected',
      approved_by: emp.id,
      approved_at: new Date().toISOString(),
    }).eq('id', id).eq('status', 'pending'); // double-check still pending

    if (!error) {
      toast.success(locale === 'en' ? 'Rejected.' : 'Pengajuan ditolak.');
      setItems(prev => ({ ...prev, [type]: prev[type].filter(i => i.id !== id) }));
    } else {
      toast.error(locale === 'en' ? 'Failed to reject.' : 'Gagal menolak.');
    }
    setActionLoading(null);
  };

  const totalPending = Object.values(items).reduce((a, b) => a + b.length, 0);

  if (loading) return (
    <div style={{ animation: 'fadeInUp 0.3s ease' }}>
      <div className="skeleton" style={{ height: 22, width: 160, borderRadius: 6, marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 14, width: 220, borderRadius: 4, marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 76, borderRadius: 14 }} />)}
      </div>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 68, borderRadius: 14, marginBottom: 10 }} />)}
    </div>
  );

  // Only visible to manager/hr_admin/super_admin/founder
  if (!emp || !['manager','hr_admin','super_admin','founder'].includes(emp.role)) {
    return (
      <div className="emp-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <HiClipboardDocumentCheck size={40} style={{ color: 'var(--border)', marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>
          {locale === 'en' ? 'Access Restricted' : 'Akses Dibatasi'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {locale === 'en' ? 'Only managers and HR can access approval dashboard.' : 'Hanya manajer dan HR yang bisa akses dashboard persetujuan.'}
        </div>
      </div>
    );
  }

  const currentItems = items[activeType] || [];

  return (
    <div className="emp-page">
      {/* Header */}
      <div className="emp-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="emp-page-title">
              {locale === 'en' ? 'Approvals' : 'Persetujuan'}
            </h1>
            {totalPending > 0 && (
              <span style={{
                background: '#EF4444',
                color: '#fff',
                padding: '2px 9px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {totalPending}
              </span>
            )}
          </div>
          <p className="emp-page-subtitle">
            {locale === 'en' ? 'Review and approve team requests' : 'Review dan setujui pengajuan tim'}
          </p>
        </div>
      </div>

      {/* Type Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const count = items[key]?.length || 0;
          const isActive = activeType === key;
          return (
            <button
              key={key}
              onClick={() => setActiveType(key)}
              style={{
                padding: '14px 8px',
                borderRadius: 14,
                border: isActive ? `2px solid ${cfg.color}` : '1.5px solid var(--border)',
                background: isActive ? `${cfg.color}0e` : 'var(--surface)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                transition: 'border-color 0.2s, background 0.2s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{
                color: isActive ? cfg.color : 'var(--muted)',
                width: 34,
                height: 34,
                borderRadius: 10,
                background: isActive ? `${cfg.color}15` : 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {cfg.icon}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? cfg.color : 'var(--text-secondary)' }}>
                {locale === 'en' ? cfg.labelEn : cfg.label}
              </div>
              <div style={{
                fontSize: 17,
                fontWeight: 900,
                lineHeight: 1,
                color: isActive ? cfg.color : count > 0 ? '#EF4444' : 'var(--muted)',
              }}>
                {count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Approvals List */}
      {currentItems.length === 0 ? (
        <div className="emp-card emp-empty">
          <div className="emp-empty-icon"><HiClipboardDocumentCheck size={22} /></div>
          <div className="emp-empty-title">
            {locale === 'en' ? 'No pending approvals' : 'Tidak ada pengajuan menunggu'}
          </div>
          <div className="emp-empty-desc">
            {locale === 'en' ? 'All requests have been processed' : 'Semua pengajuan sudah diproses'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {currentItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              type={activeType}
              onApprove={handleApprove}
              onReject={handleReject}
              loading={actionLoading}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
