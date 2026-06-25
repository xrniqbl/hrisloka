import { FiUserPlus, FiDollarSign, FiCalendar, FiClock, FiAward, FiBriefcase } from 'react-icons/fi';

const actions = [
  { label: 'Add Employee', icon: <FiUserPlus />, path: '/employees', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { label: 'Create Payroll', icon: <FiDollarSign />, path: '/payroll', color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
  { label: 'Leave Request', icon: <FiCalendar />, path: '/leave-management', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  { label: 'Attendance', icon: <FiClock />, path: '/attendance', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { label: 'Performance', icon: <FiAward />, path: '/appraisal', color: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
  { label: 'Recruitment', icon: <FiBriefcase />, path: '/job-posting', color: '#14B8A6', bg: 'rgba(20,184,166,0.08)' },
];

export default function QuickActions({ onNavigate }) {
  return (
    <div className="dash-section">
      <div className="dash-grid-6">
        {actions.map(a => (
          <button key={a.label} className="dash-quick-card" onClick={() => onNavigate(a.path)}>
            <div className="dash-quick-icon" style={{ background: a.bg, color: a.color }}>
              {a.icon}
            </div>
            <span className="dash-quick-label">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuickActionsSkeleton() {
  return (
    <div className="dash-section">
      <div className="dash-grid-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dash-skeleton-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 12px' }}>
            <div className="dash-skeleton dash-skeleton-circle" style={{ width: 44, height: 44 }} />
            <div className="dash-skeleton dash-skeleton-text-sm" style={{ width: 60 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
