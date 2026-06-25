import { FiUsers, FiCheckCircle, FiCalendar, FiDollarSign, FiBriefcase, FiAlertTriangle } from 'react-icons/fi';

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

export default function KPICards({ employees, todayAttendance, leaves, payrollTotal, openJobs, expiringContracts, loading }) {
  const presentCount = todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const leaveCount = leaves.filter(l => l.status === 'approved' && l.type !== 'overtime').length;

  const kpis = [
    { label: 'Total Employees', value: employees.length, icon: <FiUsers />, color: 'blue' },
    { label: 'Present Today', value: presentCount, icon: <FiCheckCircle />, color: 'green' },
    { label: 'On Leave', value: leaveCount, icon: <FiCalendar />, color: 'amber' },
    { label: 'Payroll This Month', value: payrollTotal ? formatCurrency(payrollTotal) : '—', icon: <FiDollarSign />, color: 'purple', isText: !!payrollTotal },
    { label: 'Open Positions', value: openJobs, icon: <FiBriefcase />, color: 'teal' },
    { label: 'Contract Expiring', value: expiringContracts, icon: <FiAlertTriangle />, color: 'red' },
  ];

  if (loading) return <KPICardsSkeleton />;

  return (
    <div className="dash-section">
      <div className="dash-grid-6">
        {kpis.map(k => (
          <div key={k.label} className="dash-kpi" data-color={k.color}>
            <div className="dash-kpi-header">
              <div className="dash-kpi-icon">{k.icon}</div>
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
