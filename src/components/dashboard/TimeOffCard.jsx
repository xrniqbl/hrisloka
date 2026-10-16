import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import { Calendar, TrendingUp } from 'lucide-react';
import CardHeader from './CardHeader';

export default function TimeOffCard({ leaves = [], loading }) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const approved = leaves.filter((l) => l.status === 'approved');
    const pending = leaves.filter((l) => l.status === 'pending');
    const rejected = leaves.filter((l) => l.status === 'rejected');
    const sick = approved.filter((l) => {
      const t = (l.type || '').toLowerCase();
      return t.includes('sakit') || t.includes('sick');
    }).length;
    const annual = approved.filter((l) => {
      const t = (l.type || '').toLowerCase();
      return t.includes('tahunan') || t.includes('annual') || t.includes('cuti');
    }).length;
    const casual = approved.filter((l) => {
      const t = (l.type || '').toLowerCase();
      return !['sakit', 'sick', 'tahunan', 'annual', 'cuti'].some((k) => t.includes(k));
    }).length;
    return {
      total: approved.length,
      sick,
      annual,
      casual,
      pending: pending.length,
      confirmed: approved.length,
      rejected: rejected.length,
    };
  }, [leaves]);

  if (loading) {
    return (
      <div className="dash-card dash-skeleton-card">
        <div className="dash-skeleton" style={{ width: 100, height: 14, marginBottom: 14 }} />
        <div className="dash-skeleton" style={{ width: 50, height: 40, marginBottom: 14 }} />
        <div className="dash-skeleton" style={{ width: '100%', height: 60, marginBottom: 14 }} />
        <div className="dash-skeleton" style={{ width: '100%', height: 80 }} />
      </div>
    );
  }

  const fillPct = Math.min(100, Math.round((stats.confirmed / Math.max(stats.confirmed + stats.pending + stats.rejected, 1)) * 100));
  const arcLen = 157;
  const filled = (fillPct / 100) * arcLen;

  const typeRows = [
    { label: 'Sick', count: stats.sick },
    { label: 'Annual', count: stats.annual },
    { label: 'Casual', count: stats.casual },
  ];

  const statusRows = [
    { label: 'Pending', count: stats.pending, tone: 'pending', path: '/leave?status=pending' },
    { label: 'Confirmed', count: stats.confirmed, tone: 'confirmed', path: '/leave?status=approved' },
    { label: 'Rejected', count: stats.rejected, tone: 'rejected', path: '/leave?status=rejected' },
  ];

  return (
    <div
      className="dash-card dash-kpi-clickable"
      onClick={() => navigate('/leave')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/leave')}
      title="Buka manajemen cuti"
    >
      <CardHeader
        icon={<Icon icon={Calendar} size="sm" color="inherit" />}
        title="Time Off"
        badge="Confirmed"
        badgeColor="green"
      />
      <div className="dash-timeoff">
        <div className="dash-timeoff-center">
          <div className="dash-timeoff-big-number">{stats.total}</div>
          <div className="dash-timeoff-trend up">
            <Icon icon={TrendingUp} size="sm" color="inherit" />
            +
            {stats.total > 0
              ? Math.round((stats.total / Math.max(stats.total + stats.pending, 1)) * 100)
              : 0}
            % from last month
          </div>
        </div>

        <div className="dash-timeoff-gauge dash-timeoff-gauge--center">
          <svg viewBox="0 0 120 70" width="140" height="78" aria-hidden>
            <path
              d="M 10 55 A 50 50 0 0 1 110 55"
              fill="none"
              stroke="#E8E6F5"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M 10 55 A 50 50 0 0 1 110 55"
              fill="none"
              stroke="#5654D4"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${arcLen}`}
            />
            <text
              x="60"
              y="50"
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#9CA3AF"
            >
              {stats.total} People Time Off
            </text>
          </svg>
        </div>

        <div className="dash-timeoff-split">
          <div className="dash-timeoff-types">
            {typeRows.map((row) => (
              <div key={row.label} className="dash-timeoff-type-row">
                <span>{row.label}</span>
                <span className="dash-timeoff-type-count">{row.count}</span>
              </div>
            ))}
          </div>
          <div className="dash-timeoff-status">
            {statusRows.map((row) => (
              <button
                key={row.label}
                type="button"
                className={`dash-timeoff-pill dash-timeoff-pill--${row.tone}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(row.path);
                }}
              >
                {row.label}
                {row.count > 0 ? ` · ${row.count}` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
