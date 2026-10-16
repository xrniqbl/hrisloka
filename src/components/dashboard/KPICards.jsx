import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  CalendarDays,
  Wallet,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import MetricStatCards from '../MetricStatCards';

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

export default function KPICards({
  employees = [],
  todayAttendance = [],
  leaves = [],
  payrollTotal,
  openJobs = 0,
  expiringContracts = 0,
  loading,
}) {
  const navigate = useNavigate();
  const presentCount = todayAttendance.filter(
    (a) => a.status === 'present' || a.status === 'late',
  ).length;
  const leaveCount = leaves.filter(
    (l) => l.status === 'approved' && l.type !== 'overtime',
  ).length;

  const items = [
    {
      key: 'employees',
      label: 'Total Employees',
      value: employees.length,
      icon: Users,
      path: '/employees',
    },
    {
      key: 'present',
      label: 'Present Today',
      value: presentCount,
      icon: CheckCircle2,
      path: '/attendance',
    },
    {
      key: 'leave',
      label: 'On Leave',
      value: leaveCount,
      icon: CalendarDays,
      path: '/leave',
    },
    {
      key: 'payroll',
      label: 'Payroll This Month',
      value: payrollTotal ? formatCurrency(payrollTotal) : '—',
      icon: Wallet,
      path: '/payroll',
    },
    {
      key: 'jobs',
      label: 'Open Positions',
      value: openJobs,
      icon: Briefcase,
      path: '/jobs',
    },
    {
      key: 'contracts',
      label: 'Contract Expiring',
      value: expiringContracts,
      icon: AlertTriangle,
      path: '/employees',
    },
  ];

  if (loading) return <KPICardsSkeleton />;

  return (
    <div className="dash-section dash-kpi-section">
      <MetricStatCards
        items={items}
        onSelect={(key) => {
          const item = items.find((i) => i.key === key);
          if (item?.path) navigate(item.path);
        }}
        className="dash-metric-stats"
      />
    </div>
  );
}

export function KPICardsSkeleton() {
  return (
    <div className="dash-section dash-kpi-section">
      <div className="metric-stat-grid dash-metric-stats">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="metric-stat-card dash-skeleton-card" style={{ minHeight: 44 }} />
        ))}
      </div>
    </div>
  );
}
