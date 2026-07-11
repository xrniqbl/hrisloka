import { useNavigate } from 'react-router-dom';
import { FiUsers, FiCheckCircle, FiCalendar, FiDollarSign, FiBriefcase, FiAlertTriangle, FiArrowRight } from 'react-icons/fi';

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

export default function KPICards({ employees = [], todayAttendance = [], leaves = [], payrollTotal, openJobs = 0, expiringContracts = 0, loading }) {
  const navigate = useNavigate();
  const presentCount = todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const leaveCount = leaves.filter(l => l.status === 'approved' && l.type !== 'overtime').length;

  const kpis = [
    { label: 'Total Employees', value: employees.length, icon: <FiUsers />, color: 'blue', path: '/employees', hint: 'Lihat semua karyawan' },
    { label: 'Present Today', value: presentCount, icon: <FiCheckCircle />, color: 'green', path: '/attendance', hint: 'Lihat absensi hari ini' },
    { label: 'On Leave', value: leaveCount, icon: <FiCalendar />, color: 'amber', path: '/leave', hint: 'Kelola cuti' },
    { label: 'Payroll This Month', value: payrollTotal ? formatCurrency(payrollTotal) : '—', icon: <FiDollarSign />, color: 'purple', isText: !!payrollTotal, path: '/payroll', hint: 'Lihat payroll' },
    { label: 'Open Positions', value: openJobs, icon: <FiBriefcase />, color: 'teal', path: '/jobs', hint: 'Lihat lowongan' },
    { label: 'Contract Expiring', value: expiringContracts, icon: <FiAlertTriangle />, color: 'red', path: '/employees', hint: 'Cek kontrak' },
  ];

  if (loading) return <KPICardsSkeleton />;

  return (
    <div className="dash-section">
      <div className="dash-grid-6">
        {kpis.map(k => (
          <div
            key={k.label}
            className="dash-kpi dash-kpi-clickable"
            data-color={k.color}
            onClick={() => navigate(k.path)}
            title={k.hint}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate(k.path)}
          >
            <div className="dash-kpi-header">
              <div className="dash-kpi-icon">{k.icon}</div>
              <FiArrowRight size={12} className="dash-kpi-arrow" />
            </div>
            <div className="dash-kpi-value" style={k.isText ? { fontSize: 18 } : {}}>{k.value}</div>
            <div className="dash-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KPICardsSkeleton() {
  return (
    <div className="dash-section">
      <div className="dash-grid-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dash-skeleton-card">
            <div className="dash-skeleton dash-skeleton-circle" style={{ width: 36, height: 36, marginBottom: 12 }} />
            <div className="dash-skeleton" style={{ width: 60, height: 28, marginBottom: 6 }} />
            <div className="dash-skeleton dash-skeleton-text-sm" style={{ width: 80 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
