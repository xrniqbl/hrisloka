import { FiCheck, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import { Check, CheckCircle2 } from 'lucide-react';
import DashEmpty from './DashEmpty';
import { brandAvatarColor, BRAND } from '../../lib/brandPalette';

const typeConfig = {
  leave: { label: 'Leave', bg: BRAND.soft[2], color: BRAND.primary },
  overtime: { label: 'Overtime', bg: BRAND.soft[1], color: BRAND.primaryDark },
  reimbursement: { label: 'Expense', bg: BRAND.soft[3], color: BRAND.scale[3] },
};

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PendingApprovals({
  leaves,
  overtimeRecords,
  reimbursements,
  onApprove,
  onReject,
  loading,
}) {
  const navigate = useNavigate();
  if (loading) return <PendingApprovalsSkeleton />;

  const pendingLeaves = (leaves || [])
    .filter((l) => l.status === 'pending')
    .map((l) => ({
      id: l.id,
      type: 'leave',
      name: l.employees?.name || 'Unknown',
      desc: `${l.type === 'cuti' ? 'Cuti' : l.type === 'sakit' ? 'Sakit' : 'Izin'} — ${l.days} hari`,
      date: l.start_date,
    }));
  const pendingOvertime = (overtimeRecords || [])
    .filter((o) => o.status === 'pending')
    .map((o) => ({
      id: o.id,
      type: 'overtime',
      name: o.employees?.name || 'Unknown',
      desc: `${o.hours} jam — ${o.reason || 'Lembur'}`,
      date: o.date,
    }));
  const pendingReimb = (reimbursements || [])
    .filter((r) => r.status === 'pending')
    .map((r) => ({
      id: r.id,
      type: 'reimbursement',
      name: r.employees?.name || 'Unknown',
      desc: `Rp ${(r.amount || 0).toLocaleString('id-ID')} — ${r.category || r.type || 'Expense'}`,
      date: r.created_at,
    }));

  const allPending = [...pendingLeaves, ...pendingOvertime, ...pendingReimb].slice(0, 8);

  return (
    <div className="dash-card dash-approval-card">
      <div className="dash-chart-header">
        <span className="dash-chart-title">Pending Approvals</span>
        {allPending.length > 0 && (
          <span className="dash-chart-badge">{allPending.length}</span>
        )}
      </div>
      {allPending.length === 0 ? (
        <DashEmpty
          icon={<Icon icon={CheckCircle2} size="md" color="inherit" />}
          title="Semua sudah diproses"
          description="Tidak ada pengajuan menunggu. Item baru dari PWA muncul di sini."
          ctaLabel="Pusat persetujuan"
          onCta={() => navigate('/approvals')}
          secondaryLabel="Lihat cuti"
          secondaryTo="/leave"
        />
      ) : (
        allPending.map((item) => {
          const cfg = typeConfig[item.type] || typeConfig.leave;
          const color = brandAvatarColor(item.name);
          return (
            <div key={`${item.type}-${item.id}`} className="dash-approval-item">
              <div
                className="dash-approval-avatar"
                style={{ background: `${color}18`, color }}
              >
                {getInitials(item.name)}
              </div>
              <div className="dash-approval-info">
                <div className="dash-approval-name">{item.name}</div>
                <div className="dash-approval-desc">{item.desc}</div>
              </div>
              <span
                className="dash-approval-type"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
              <div className="dash-approval-actions">
                <button
                  type="button"
                  className="dash-btn-approve"
                  onClick={() => onApprove(item.type, item.id)}
                  title="Approve"
                >
                  <Icon icon={Check} size="sm" color="inherit" />
                </button>
                <button
                  type="button"
                  className="dash-btn-reject"
                  onClick={() => onReject(item.type, item.id)}
                  title="Reject"
                >
                  <FiX size={14} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function PendingApprovalsSkeleton() {
  return (
    <div className="dash-card dash-approval-card">
      <div className="dash-chart-header">
        <div className="dash-skeleton" style={{ width: 140, height: 16 }} />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="dash-approval-item">
          <div className="dash-skeleton dash-skeleton-circle" style={{ width: 36, height: 36 }} />
          <div style={{ flex: 1 }}>
            <div className="dash-skeleton" style={{ width: 100, height: 13, marginBottom: 4 }} />
            <div className="dash-skeleton" style={{ width: 150, height: 10 }} />
          </div>
          <div className="dash-skeleton" style={{ width: 50, height: 20, borderRadius: 6 }} />
          <div className="dash-skeleton" style={{ width: 60, height: 30, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}
