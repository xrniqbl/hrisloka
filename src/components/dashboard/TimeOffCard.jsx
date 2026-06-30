import { useMemo } from 'react';
import { FiCalendar, FiTrendingUp } from 'react-icons/fi';
import CardHeader from './CardHeader';

export default function TimeOffCard({ leaves = [], loading }) {
  const stats = useMemo(() => {
    const approved = leaves.filter(l => l.status === 'approved');
    const pending = leaves.filter(l => l.status === 'pending');
    const rejected = leaves.filter(l => l.status === 'rejected');
    const sick = approved.filter(l => (l.type || '').toLowerCase().includes('sakit') || (l.type || '').toLowerCase().includes('sick')).length;
    const annual = approved.filter(l => (l.type || '').toLowerCase().includes('tahunan') || (l.type || '').toLowerCase().includes('annual') || (l.type || '').toLowerCase().includes('cuti')).length;
    const casual = approved.filter(l => !['sakit', 'sick', 'tahunan', 'annual', 'cuti'].some(k => (l.type || '').toLowerCase().includes(k))).length;
    return { total: approved.length, sick, annual, casual, pending: pending.length, confirmed: approved.length, rejected: rejected.length };
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

  const total = stats.sick + stats.annual + stats.casual || 1;
  const sickPct = (stats.sick / total) * 100;
  const annualPct = (stats.annual / total) * 100;

  return (
    <div className="dash-card">
      <CardHeader icon={<FiCalendar size={18} />} title="Time Off" badge="Confirmed" badgeColor="green" />
      <div className="dash-timeoff">
        <div className="dash-timeoff-stats">
          <div>
            <div className="dash-timeoff-big-number">{stats.total}</div>
            <div className="dash-timeoff-trend up">
              <FiTrendingUp size={16} /> +{stats.total > 0 ? Math.round((stats.total / Math.max(stats.total + stats.pending, 1)) * 100) : 0}% from last month
            </div>
          </div>
        </div>

        <div className="dash-timeoff-gauge">
          <div className="dash-gauge-visual">
            <svg viewBox="0 0 120 60" width="120" height="60">
              <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#E5E7EB" strokeWidth="10" strokeLinecap="round" />
              <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#5654D4" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(sickPct / 100) * 157} 157`} />
              <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#9695E4" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(annualPct / 100) * 157} 157`}
                strokeDashoffset={`${-(sickPct / 100) * 157}`} />
              <text x="60" y="48" textAnchor="middle" fontSize="16" fontWeight="800" fill="currentColor" style={{ fontFamily: 'Inter Tight' }}>{stats.total}</text>
            </svg>
          </div>
          <div className="dash-gauge-legend">
            <div className="dash-gauge-legend-item">
              <span className="dash-gauge-dot" style={{ background: '#5654D4' }} />
              <span>Sick ({stats.sick})</span>
            </div>
            <div className="dash-gauge-legend-item">
              <span className="dash-gauge-dot" style={{ background: '#9695E4' }} />
              <span>Annual ({stats.annual})</span>
            </div>
            <div className="dash-gauge-legend-item">
              <span className="dash-gauge-dot" style={{ background: '#D7D6F5' }} />
              <span>Casual ({stats.casual})</span>
            </div>
          </div>
        </div>

        <div className="dash-timeoff-status">
          <div className="dash-timeoff-status-row">
            <span className="dash-timeoff-status-label">
              <span className="dash-status-dot" style={{ background: '#F59E0B' }} />
              Pending
            </span>
            <span className="dash-timeoff-status-count">{stats.pending}</span>
          </div>
          <div className="dash-timeoff-status-row">
            <span className="dash-timeoff-status-label">
              <span className="dash-status-dot" style={{ background: '#22C55E' }} />
              Confirmed
            </span>
            <span className="dash-timeoff-status-count">{stats.confirmed}</span>
          </div>
          <div className="dash-timeoff-status-row">
            <span className="dash-timeoff-status-label">
              <span className="dash-status-dot" style={{ background: '#EF4444' }} />
              Rejected
            </span>
            <span className="dash-timeoff-status-count">{stats.rejected}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
