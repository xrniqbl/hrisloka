import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  HiCheck,
  HiXMark,
  HiCalendarDays,
  HiClock,
  HiCurrencyDollar,
  HiArrowPath,
  HiClipboardDocumentCheck,
  HiChevronDown,
  HiHome,
  HiPaperAirplane,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import { isDemoMode, DEMO_EMPLOYEE, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import '../../styles/shared.css';

const TYPE_CONFIG = {
  leave: {
    label: 'Cuti',
    labelEn: 'Leave',
    color: 'var(--primary, #635BFF)',
    icon: <HiCalendarDays size={16} />,
    table: 'leave_requests',
  },
  overtime: {
    label: 'Lembur',
    labelEn: 'Overtime',
    color: '#EF4444',
    icon: <HiClock size={16} />,
    table: 'overtime_requests',
  },
  reimbursement: {
    label: 'Reimburse',
    labelEn: 'Reimbursement',
    color: '#16A34A',
    icon: <HiCurrencyDollar size={16} />,
    table: 'reimbursements',
  },
};

const MANAGER_ROLES = ['manager', 'hr_admin', 'super_admin', 'founder'];

function ItemCard({ item, type, onApprove, onReject, loading, locale }) {
  const cfg = TYPE_CONFIG[type];
  const [expanded, setExpanded] = useState(false);
  const isProcessing = loading === item.id;

  return (
    <div
      className="emp-card emp-card-stagger"
      style={{ borderLeft: `4px solid ${cfg.color}`, overflow: 'hidden' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            flexShrink: 0,
            background: 'color-mix(in srgb, var(--primary, #635BFF) 10%, transparent)',
            color: cfg.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {cfg.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
            {item.employees?.name || '-'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {type === 'leave' &&
              `${item.type}  ${item.start_date} - ${item.end_date} (${item.days} hari)`}
            {type === 'overtime' && `${item.date}  ${item.hours} jam`}
            {type === 'reimbursement' &&
              `${item.category}  Rp ${(item.amount || 0).toLocaleString('id-ID')}`}
          </div>
        </div>
        <HiChevronDown
          size={16}
          style={{
            color: 'var(--muted)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        />
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          {item.reason && (
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginTop: 10,
                marginBottom: 10,
                lineHeight: 1.5,
              }}
            >
              &ldquo;{item.reason || item.notes}&rdquo;
            </p>
          )}
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
            {locale === 'en' ? 'Submitted' : 'Diajukan'}:{' '}
            {new Date(item.created_at).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => onReject(item.id, type)}
              disabled={isProcessing}
              className="btn-secondary"
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 12,
                border: '1.5px solid rgba(220,38,38,0.3)',
                background: 'rgba(220,38,38,0.06)',
                color: '#DC2626',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {isProcessing ? (
                <HiArrowPath size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <HiXMark size={14} />
              )}
              {locale === 'en' ? 'Reject' : 'Tolak'}
            </button>
            <button
              type="button"
              onClick={() => onApprove(item.id, type)}
              disabled={isProcessing}
              className="btn-primary"
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: 12,
                background: cfg.color === 'var(--primary, #635BFF)' ? undefined : cfg.color,
                fontSize: 13,
              }}
            >
              {isProcessing ? (
                <HiArrowPath size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <HiCheck size={14} />
              )}
              {locale === 'en' ? 'Approve' : 'Setujui'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyCta({ icon, title, desc, primaryLabel, primaryTo, onPrimary, secondaryLabel, secondaryTo, onSecondary }) {
  return (
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
        {icon}
      </div>
      <div className="emp-empty-title" style={{ color: 'var(--text)' }}>
        {title}
      </div>
      <div className="emp-empty-desc" style={{ marginBottom: 20, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
        {desc}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
        {(primaryLabel && (primaryTo || onPrimary)) && (
          primaryTo ? (
            <Link to={primaryTo} className="btn-primary" style={{ textDecoration: 'none', width: '100%' }}>
              {primaryLabel}
            </Link>
          ) : (
            <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={onPrimary}>
              {primaryLabel}
            </button>
          )
        )}
        {(secondaryLabel && (secondaryTo || onSecondary)) && (
          secondaryTo ? (
            <Link
              to={secondaryTo}
              className="btn-secondary"
              style={{ textDecoration: 'none', width: '100%' }}
            >
              {secondaryLabel}
            </Link>
          ) : (
            <button type="button" className="btn-secondary" style={{ width: '100%' }} onClick={onSecondary}>
              {secondaryLabel}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function EmpApprovals() {
  const { user, employee: authEmployee, loading: authLoading } = useAuth();
  const { locale } = useTranslation();
  const toast = useToast();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeType, setActiveType] = useState('leave');
  const [items, setItems] = useState({ leave: [], overtime: [], reimbursement: [] });
  const [loadError, setLoadError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    if (isDemoMode()) {
      setEmp({ ...DEMO_EMPLOYEE, role: 'manager', position: 'Team Lead' });
      const q = DEMO_PROFILE_DATA.approvalQueue || {};
      setItems({
        leave: [...(q.leave || [])],
        overtime: [...(q.overtime || [])],
        reimbursement: [...(q.reimbursement || [])],
      });
      setLoading(false);
      return;
    }

    // Wait for auth — do not flash empty/restricted while session is resolving
    if (authLoading) return;

    try {
      let e = authEmployee;
      if (!e?.id && user?.email) {
        const res = await getEmployeeByEmail(user.email);
        e = res.data;
      }

      if (!e?.company_id) {
        setEmp(e || null);
        setItems({ leave: [], overtime: [], reimbursement: [] });
        setLoading(false);
        return;
      }

      setEmp(e);

      const [leaves, overtimes, reimbursements] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('*, employees!inner(name, division, company_id)')
          .eq('status', 'pending')
          .eq('employees.company_id', e.company_id)
          .order('created_at', { ascending: true }),
        supabase
          .from('overtime_requests')
          .select('*, employees!inner(name, division, company_id)')
          .eq('status', 'pending')
          .eq('employees.company_id', e.company_id)
          .order('created_at', { ascending: true }),
        supabase
          .from('reimbursements')
          .select('*, employees!inner(name, division, company_id)')
          .eq('status', 'pending')
          .eq('employees.company_id', e.company_id)
          .order('created_at', { ascending: true }),
      ]);

      const err = leaves.error || overtimes.error || reimbursements.error;
      if (err) {
        console.warn('[EmpApprovals]', err.message);
        setLoadError(err.message);
      }

      setItems({
        leave: leaves.data || [],
        overtime: overtimes.data || [],
        reimbursement: reimbursements.data || [],
      });
    } catch (err) {
      console.warn('[EmpApprovals] load failed:', err?.message);
      setLoadError(err?.message || 'Gagal memuat data');
      setItems({ leave: [], overtime: [], reimbursement: [] });
    } finally {
      setLoading(false);
    }
  }, [user, authEmployee, authLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (id, type) => {
    const isOwned = items[type]?.some((i) => i.id === id);
    if (!isOwned || !emp?.id) {
      toast.error('Unauthorized action');
      return;
    }
    setActionLoading(id);

    if (isDemoMode()) {
      setItems((prev) => ({ ...prev, [type]: prev[type].filter((i) => i.id !== id) }));
      toast.success(locale === 'en' ? 'Demo approved!' : 'Demo disetujui!');
      setActionLoading(null);
      return;
    }

    let error = null;
    if (type === 'leave') {
      const { updateLeave } = await import('../../services/leaveService');
      ({ error } = await updateLeave(id, { status: 'approved', approved_by: emp.id }, emp.company_id));
    } else if (type === 'overtime') {
      const { approveOvertime } = await import('../../services/overtimeService');
      ({ error } = await approveOvertime(id, emp.id, emp.company_id));
    } else if (type === 'reimbursement') {
      const { updateReimbursement } = await import('../../services/reimbursementService');
      ({ error } = await updateReimbursement(id, { status: 'approved', approved_by: emp.id }, emp.company_id));
    }

    if (!error) {
      toast.success(locale === 'en' ? 'Approved!' : 'Berhasil disetujui!');
      setItems((prev) => ({ ...prev, [type]: prev[type].filter((i) => i.id !== id) }));
    } else {
      toast.error(error.message || (locale === 'en' ? 'Failed to approve.' : 'Gagal menyetujui.'));
    }
    setActionLoading(null);
  };

  const handleReject = async (id, type) => {
    const isOwned = items[type]?.some((i) => i.id === id);
    if (!isOwned || !emp?.id) {
      toast.error('Unauthorized action');
      return;
    }
    setActionLoading(id);

    if (isDemoMode()) {
      setItems((prev) => ({ ...prev, [type]: prev[type].filter((i) => i.id !== id) }));
      toast.success(locale === 'en' ? 'Demo rejected.' : 'Demo ditolak.');
      setActionLoading(null);
      return;
    }

    let error = null;
    if (type === 'leave') {
      const { updateLeave } = await import('../../services/leaveService');
      ({ error } = await updateLeave(id, { status: 'rejected', approved_by: emp.id }, emp.company_id));
    } else if (type === 'overtime') {
      const { rejectOvertime } = await import('../../services/overtimeService');
      ({ error } = await rejectOvertime(id, emp.company_id));
    } else if (type === 'reimbursement') {
      const { updateReimbursement } = await import('../../services/reimbursementService');
      ({ error } = await updateReimbursement(id, { status: 'rejected', approved_by: emp.id }, emp.company_id));
    }

    if (!error) {
      toast.success(locale === 'en' ? 'Rejected.' : 'Pengajuan ditolak.');
      setItems((prev) => ({ ...prev, [type]: prev[type].filter((i) => i.id !== id) }));
    } else {
      toast.error(error.message || (locale === 'en' ? 'Failed to reject.' : 'Gagal menolak.'));
    }
    setActionLoading(null);
  };

  const totalPending = Object.values(items).reduce((a, b) => a + b.length, 0);
  const isEn = locale === 'en';

  // Loading skeleton (auth + data) — never hang forever
  if (authLoading || loading) {
    return (
      <div style={{ animation: 'fadeInUp 0.3s ease' }}>
        <div className="skeleton" style={{ height: 22, width: 160, borderRadius: 6, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 14, width: 220, borderRadius: 4, marginBottom: 14 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 76, borderRadius: 14 }} />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 68, borderRadius: 14, marginBottom: 10 }} />
        ))}
      </div>
    );
  }

  // No company linked
  if (!emp?.company_id) {
    return (
      <div className="emp-page">
        <div className="emp-page-header">
          <h1 className="emp-page-title">{isEn ? 'Approvals' : 'Persetujuan'}</h1>
          <p className="emp-page-subtitle">
            {isEn ? 'Review and approve team requests' : 'Review dan setujui pengajuan tim'}
          </p>
        </div>
        <EmptyCta
          icon={<HiClipboardDocumentCheck size={24} />}
          title={isEn ? 'Company not linked' : 'Perusahaan belum terhubung'}
          desc={
            isEn
              ? 'Your account is not linked to a company yet. Contact HR to complete onboarding.'
              : 'Akun Anda belum terhubung ke perusahaan. Hubungi HR untuk menyelesaikan onboarding.'
          }
          primaryLabel={isEn ? 'Back to Home' : 'Kembali ke Beranda'}
          primaryTo="/app/home"
          secondaryLabel={isEn ? 'Refresh' : 'Muat Ulang'}
          onSecondary={loadData}
        />
      </div>
    );
  }

  // Role gate
  if (!MANAGER_ROLES.includes(emp.role)) {
    return (
      <div className="emp-page">
        <div className="emp-page-header">
          <h1 className="emp-page-title">{isEn ? 'Approvals' : 'Persetujuan'}</h1>
          <p className="emp-page-subtitle">
            {isEn ? 'Review and approve team requests' : 'Review dan setujui pengajuan tim'}
          </p>
        </div>
        <EmptyCta
          icon={<HiClipboardDocumentCheck size={24} />}
          title={isEn ? 'Access Restricted' : 'Akses Dibatasi'}
          desc={
            isEn
              ? 'Only managers and HR can access the approval dashboard.'
              : 'Hanya manajer dan HR yang bisa mengakses dashboard persetujuan.'
          }
          primaryLabel={isEn ? 'My Submissions' : 'Pengajuan Saya'}
          primaryTo="/app/submissions"
          secondaryLabel={
            <>
              <HiHome size={16} /> {isEn ? 'Home' : 'Beranda'}
            </>
          }
          secondaryTo="/app/home"
        />
      </div>
    );
  }

  const currentItems = items[activeType] || [];
  const cfgActive = TYPE_CONFIG[activeType];

  return (
    <div className="emp-page">
      {/* Header */}
      <div
        className="emp-page-header"
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="emp-page-title">{isEn ? 'Approvals' : 'Persetujuan'}</h1>
            {totalPending > 0 && (
              <span
                style={{
                  background: 'var(--primary, #635BFF)',
                  color: '#fff',
                  padding: '2px 9px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {totalPending}
              </span>
            )}
          </div>
          <p className="emp-page-subtitle">
            {isEn ? 'Review and approve team requests' : 'Review dan setujui pengajuan tim'}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={loadData}
          aria-label={isEn ? 'Refresh' : 'Muat ulang'}
          style={{ padding: '10px 12px', borderRadius: 12, flexShrink: 0 }}
        >
          <HiArrowPath size={16} />
        </button>
      </div>

      {loadError && (
        <div
          className="emp-card"
          style={{
            marginBottom: 14,
            padding: 14,
            border: '1px solid rgba(220,38,38,0.25)',
            background: 'rgba(220,38,38,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
            {isEn ? 'Failed to load some data' : 'Gagal memuat sebagian data'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{loadError}</div>
          <button type="button" className="btn-primary" style={{ alignSelf: 'flex-start' }} onClick={loadData}>
            <HiArrowPath size={14} /> {isEn ? 'Try again' : 'Coba lagi'}
          </button>
        </div>
      )}

      {/* Type Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const count = items[key]?.length || 0;
          const isActive = activeType === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveType(key)}
              style={{
                padding: '14px 8px',
                borderRadius: 14,
                border: isActive
                  ? '2px solid var(--primary, #635BFF)'
                  : '1.5px solid var(--border)',
                background: isActive
                  ? 'color-mix(in srgb, var(--primary, #635BFF) 8%, transparent)'
                  : 'var(--surface)',
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
              <div
                style={{
                  color: isActive ? 'var(--primary, #635BFF)' : 'var(--muted)',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: isActive
                    ? 'color-mix(in srgb, var(--primary, #635BFF) 12%, transparent)'
                    : 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {cfg.icon}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isActive ? 'var(--primary, #635BFF)' : 'var(--text-secondary)',
                }}
              >
                {isEn ? cfg.labelEn : cfg.label}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: isActive
                    ? 'var(--primary, #635BFF)'
                    : count > 0
                      ? '#EF4444'
                      : 'var(--muted)',
                }}
              >
                {count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Approvals List / Empty CTA */}
      {currentItems.length === 0 ? (
        <EmptyCta
          icon={<HiClipboardDocumentCheck size={24} />}
          title={
            isEn
              ? `No pending ${cfgActive.labelEn.toLowerCase()}`
              : `Tidak ada ${cfgActive.label.toLowerCase()} menunggu`
          }
          desc={
            totalPending === 0
              ? isEn
                ? 'All team requests have been processed. New submissions will appear here.'
                : 'Semua pengajuan tim sudah diproses. Pengajuan baru akan muncul di sini.'
              : isEn
                ? `No pending ${cfgActive.labelEn.toLowerCase()} right now. Check other tabs.`
                : `Tidak ada ${cfgActive.label.toLowerCase()} menunggu. Cek tab lain.`
          }
          primaryLabel={
            <>
              <HiArrowPath size={16} /> {isEn ? 'Refresh' : 'Muat Ulang'}
            </>
          }
          onPrimary={loadData}
          secondaryLabel={
            <>
              <HiPaperAirplane size={16} /> {isEn ? 'My Submissions' : 'Pengajuan Saya'}
            </>
          }
          secondaryTo="/app/submissions"
        />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {currentItems.map((item) => (
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
