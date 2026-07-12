import { Icon } from '@astryxdesign/core/Icon';
import {
  UserPlus,
  Wallet,
  CalendarDays,
  Clock,
  Award,
  Briefcase,
} from 'lucide-react';
import { brandKpiTone } from '../../lib/brandPalette';

const actions = [
  { label: 'Add Employee', icon: UserPlus, path: '/employees' },
  { label: 'Create Payroll', icon: Wallet, path: '/payroll' },
  { label: 'Leave Request', icon: CalendarDays, path: '/leave' },
  { label: 'Attendance', icon: Clock, path: '/attendance' },
  { label: 'Performance', icon: Award, path: '/appraisal' },
  { label: 'Recruitment', icon: Briefcase, path: '/jobs' },
];

export default function QuickActions({ onNavigate }) {
  return (
    <div className="dash-section">
      <div className="dash-grid-6">
        {actions.map((a, i) => {
          const tone = brandKpiTone(i);
          return (
            <button
              key={a.label}
              type="button"
              className="dash-quick-card"
              onClick={() => onNavigate(a.path)}
            >
              <div
                className="dash-quick-icon"
                style={{ background: tone.soft, color: tone.color }}
              >
                <Icon icon={a.icon} size="md" color="inherit" />
              </div>
              <span className="dash-quick-label">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function QuickActionsSkeleton() {
  return (
    <div className="dash-section">
      <div className="dash-grid-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="dash-skeleton-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '20px 12px',
            }}
          >
            <div className="dash-skeleton dash-skeleton-circle" style={{ width: 44, height: 44 }} />
            <div className="dash-skeleton dash-skeleton-text-sm" style={{ width: 60 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
