import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import CardHeader from './CardHeader';

export default function TimeOffCard({ leaves = [], loading }) {
  const navigate = useNavigate();

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

  const statusRows = [
    { label: 'Pending', count: stats.pending, color: '#F59E0B', path: '/leave?status=pending' },
    { label: 'Confirmed', count: stats.confirmed, color: '#22C55E', path: '/leave?status=approved' },
    { label: 'Rejected', count: stats.rejected, color: '#EF4444', path: '/leave?status=rejected' },
  ];

  return (
    <div
      className="dash-card dash-kpi-clickable"
      onClick={() => navigate('/leave')}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate('/leave')}
      title="Buka manajemen cuti"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CardHeader icon={<FiCalendar size={18} />} title="Time Off" badge="Confirmed" badgeColor="green" />
        <FiArrowRight size={14} style={{ color: 'var(--dash-text-muted)', flexShrink: 0 }} />
      </div>
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
              <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#5654D4"
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(sickPct / 100) * 157} 157`} />
              <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#22C55E"
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(annualPct / 100) * 157} 157`}
                strokeDashoffset={`-${(sickPct / 100) * 157}`} />
              <text x="60" y="52" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--dash-text-primary)">{stats.total}</text>
            </svg>
          </div>
          <div className="dash-gauge-legend">
            <span className="dash-gauge-legend-item"><span style={{ background: '#5654D4', width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginRight: 4 }} />Sick ({stats.sick})</span>
            <span className="dash-gauge-legend-item"><span style={{ background: '#22C55E', width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginRight: 4 }} />Annual ({stats.annual})</span>
            <span className="dash-gauge-legend-item"><span style={{ background: '#E5E7EB', width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginRight: 4 }} />Other ({stats.casual})</span>
          </div>
        </div>

        <div className="dash-timeoff-status">
          {statusRows.map(row => (
            <div
              key={row.label}
              className="dash-timeoff-status-row dash-kpi-clickable"
              onClick={e => { e.stopPropagation(); navigate(row.path); }}
              style={{ cursor: 'pointer', borderRadius: 6, padding: '2px 4px', margin: '0 -4px' }}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), navigate(row.path))}
            >
              <span className="dash-timeoff-status-label">
                <span className="dash-status-dot" style={{ background: row.color }} />
                {row.label}
              </span>
              <span className="dash-timeoff-status-count">{row.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
