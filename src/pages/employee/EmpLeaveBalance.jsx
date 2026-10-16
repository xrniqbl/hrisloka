import { useState, useEffect, useCallback } from 'react';
import {
  HiCalendarDays,
  HiCheck,
  HiChevronDown,
  HiChevronUp,
  HiClock
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getMyLeaves } from '../../services/leaveService';
import { useTranslation } from '../../lib/i18n';
import { isDemoMode, DEMO_EMPLOYEE, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import EmpEmptyState from '../../components/EmpEmptyState';
import '../../styles/shared.css';

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LEAVE_TYPES = {
  annual: { label: 'Cuti Tahunan', color: '#635BFF' },
  sick: { label: 'Cuti Sakit', color: '#EF4444' },
  maternity: { label: 'Cuti Melahirkan', color: '#EC4899' },
  paternity: { label: 'Cuti Ayah', color: '#8B5CF6' },
  emergency: { label: 'Cuti Darurat', color: '#F59E0B' },
  unpaid: { label: 'Cuti Tanpa Bayaran', color: '#6B7280' },
};

const STATUS_COLORS = { approved: '#16A34A', pending: '#F59E0B', rejected: '#DC2626' };
const STATUS_LABELS = { approved: 'Disetujui', pending: 'Menunggu', rejected: 'Ditolak' };

export default function EmpLeaveBalance() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedId, setExpandedId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (isDemoMode()) {
      setEmp({ ...DEMO_EMPLOYEE });
      const filtered = (DEMO_PROFILE_DATA.leaves || []).filter((l) => {
        const y = new Date(l.start_date).getFullYear();
        return y === selectedYear;
      });
      setLeaves(filtered);
      setLoading(false);
      return;
    }
    const email = user?.email || user?.user_metadata?.email;
    const { data: empData } = await getEmployeeByEmail(email);
    if (empData) {
      setEmp(empData);
      const { data: leaveData } = await getMyLeaves(empData.id);
      const filtered = (leaveData || []).filter(l => {
        const y = new Date(l.start_date).getFullYear();
        return y === selectedYear;
      });
      setLeaves(filtered);
    }
    setLoading(false);
  }, [user, selectedYear]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  if (loading) return (
    <div style={{ animation: "fadeInUp 0.3s ease" }}>
      <div style={{ marginBottom: 12 }}>
        <div className="skeleton skeleton-text" style={{ width: 120, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 180 }} />
      </div>
      <div className="emp-card emp-card-gradient" style={{ marginBottom: 12, padding: 20 }}>
        <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        {[1,2,3].map(i => <div key={i} className="emp-card" style={{ padding: 12, textAlign: 'center' }}><div className="skeleton" style={{ height: 40, borderRadius: 8 }} /></div>)}
      </div>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12, marginBottom: 8 }} />)}
    </div>
  );

  if (!emp) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Data tidak ditemukan.</div>
  );

  const leaveQuota = emp.leave_quota || 12;
  const leaveUsed = emp.leave_used || 0;
  const leaveBalance = leaveQuota - leaveUsed;
  const usedPct = Math.min(100, Math.round((leaveUsed / leaveQuota) * 100));

  // Group by month for the timeline
  const byMonth = {};
  leaves.filter(l => l.status === 'approved').forEach(l => {
    const m = new Date(l.start_date).getMonth();
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(l);
  });

  // Days used per type
  const daysByType = {};
  leaves.filter(l => l.status === 'approved').forEach(l => {
    const days = l.days || Math.max(1, Math.ceil((new Date(l.end_date) - new Date(l.start_date)) / 86400000) + 1);
    daysByType[l.type] = (daysByType[l.type] || 0) + days;
  });

  const approvedLeaves = leaves.filter(l => l.status === 'approved');
  const pendingLeaves = leaves.filter(l => l.status === 'pending');

  const leaveTypes = {
    annual: { label: locale === 'en' ? 'Annual Leave' : 'Cuti Tahunan', color: '#635BFF' },
    sick: { label: locale === 'en' ? 'Sick Leave' : 'Cuti Sakit', color: '#EF4444' },
    maternity: { label: locale === 'en' ? 'Maternity Leave' : 'Cuti Melahirkan', color: '#EC4899' },
    paternity: { label: locale === 'en' ? 'Paternity Leave' : 'Cuti Ayah', color: '#8B5CF6' },
    emergency: { label: locale === 'en' ? 'Emergency Leave' : 'Cuti Darurat', color: '#F59E0B' },
    unpaid: { label: locale === 'en' ? 'Unpaid Leave' : 'Cuti Tanpa Bayaran', color: '#6B7280' },
  };
  const statusLabels = {
    approved: locale === 'en' ? 'Approved' : 'Disetujui',
    pending: locale === 'en' ? 'Pending' : 'Menunggu',
    rejected: locale === 'en' ? 'Rejected' : 'Ditolak',
  };
  const STATUS_COLORS = { approved: '#16A34A', pending: '#F59E0B', rejected: '#DC2626' };

  return (
    <div style={{ paddingBottom: 24, animation: 'fadeInUp 0.35s ease' }}>
      <div style={{ marginBottom: 12 }}>
        <h1 className="emp-page-title">{locale === 'en' ? 'Leave Balance' : 'Saldo Cuti'}</h1>
        <p className="emp-page-subtitle">{locale === 'en' ? 'History and leave usage details' : 'Riwayat dan detail penggunaan cuti'}</p>
      </div>

      {/* Year selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[selectedYear - 1, selectedYear, selectedYear + 1 <= new Date().getFullYear() ? selectedYear + 1 : null]
          .filter(Boolean)
          .map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              style={{
                padding: '6px 14px', borderRadius: 99, border: 'none',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: selectedYear === y ? 'var(--primary)' : 'var(--surface)',
                color: selectedYear === y ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {y}
            </button>
          ))}
      </div>

      {/* Main balance card */}
      <div className="emp-card emp-card-gradient" style={{ marginBottom: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              {locale === 'en' ? 'Annual Leave Balance' : 'Sisa Cuti Tahunan'}
            </div>
            <div style={{ fontSize: 42, fontWeight: 600, lineHeight: 1 }}>{leaveBalance}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{locale === 'en' ? `of ${leaveQuota} days` : `dari ${leaveQuota} hari`}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>{locale === 'en' ? 'Used' : 'Terpakai'}</div>
            <div className="info-card-value">{leaveUsed}</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>{locale === 'en' ? 'days' : 'hari'}</div>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${usedPct}%`, borderRadius: 4, background: '#fff', transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 6 }}>{usedPct}% {locale === 'en' ? 'used' : 'terpakai'}</div>
      </div>

      {/* Summary grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: locale === 'en' ? 'Approved' : 'Disetujui', value: approvedLeaves.length, color: '#16A34A' },
          { label: locale === 'en' ? 'Pending' : 'Menunggu', value: pendingLeaves.length, color: '#F59E0B' },
          { label: locale === 'en' ? 'Total Days' : 'Total Hari', value: approvedLeaves.reduce((s, l) => s + (l.days || 1), 0), color: 'var(--primary)' },
        ].map(s => (
          <div key={s.label} className="emp-card" style={{ padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Usage by type */}
      {Object.keys(daysByType).length > 0 && (
        <div className="emp-card" style={{ marginBottom: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            {locale === 'en' ? 'Usage by Leave Type' : 'Penggunaan per Jenis Cuti'}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(daysByType).map(([type, days]) => {
              const conf = leaveTypes[type] || { label: type, color: '#6B7280' };
              return (
                <div key={type} className="btn-icon-row">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: conf.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13 }}>{conf.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{days} {locale === 'en' ? 'days' : 'hari'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leave history */}
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
        {locale === 'en' ? `Leave History ${selectedYear} (${leaves.length})` : `Riwayat Pengajuan ${selectedYear} (${leaves.length})`}
      </div>
      {leaves.length === 0 ? (
        <EmpEmptyState
          type="nodata"
          title={locale === 'en' ? `No leave in ${selectedYear}` : `Tidak ada cuti di ${selectedYear}`}
          subtitle={locale === 'en' ? 'Submit a leave request from Submissions when you need time off.' : 'Ajukan cuti dari menu Pengajuan saat membutuhkan libur.'}
          cta={locale === 'en' ? 'Request leave' : 'Ajukan cuti'}
          ctaHref="/app/submissions"
          secondaryCta={locale === 'en' ? 'Home' : 'Beranda'}
          secondaryHref="/app/home"
        />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {leaves.map(l => {
            const conf = leaveTypes[l.type] || { label: l.type, color: '#6B7280' };
            const days = l.days || Math.max(1, Math.ceil((new Date(l.end_date) - new Date(l.start_date)) / 86400000) + 1);
            const isExpanded = expandedId === l.id;
            return (
              <div
                key={l.id}
                className="emp-card emp-card-interactive emp-card-stagger"
                style={{ padding: 14, borderLeft: `4px solid ${conf.color}` }}
                onClick={() => setExpandedId(isExpanded ? null : l.id)}
              >
                <div className="chart-card-header">
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{conf.label}</div>
                    <div className="td-muted-sm">
                      {l.start_date} - {l.end_date} ({days} {locale === 'en' ? 'days' : 'hari'})
                    </div>
                  </div>
                  <div className="btn-icon-row">
                    <span className={`status-badge ${l.status}`}>{statusLabels[l.status] || l.status}</span>
                    {isExpanded ? <HiChevronUp size={14} style={{ color: 'var(--muted)' }} /> : <HiChevronDown size={14} style={{ color: 'var(--muted)' }} />}
                  </div>
                </div>
                {isExpanded && l.reason && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)' }}>
                    <span className="td-semibold">{locale === 'en' ? 'Reason' : 'Alasan'}: </span>{l.reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

