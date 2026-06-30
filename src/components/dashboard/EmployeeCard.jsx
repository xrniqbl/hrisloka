import { useMemo } from 'react';
import { FiUsers } from 'react-icons/fi';
import CardHeader from './CardHeader';

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

const TEAM_BADGE_MAP = {
  internal: { bg: '#EDE9FE', color: '#7C3AED', label: 'Internal Team' },
  outsource: { bg: '#FFF7E0', color: '#B45309', label: 'Outsource' },
  management: { bg: '#E7E7F9', color: '#5654D4', label: 'Internal Team' },
  default: { bg: '#F3F4F6', color: '#6B7280', label: 'Internal Team' },
};

function getTeamBadge(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('internal') || n.includes('development') || n.includes('design')) return TEAM_BADGE_MAP.internal;
  if (n.includes('outsource')) return TEAM_BADGE_MAP.outsource;
  if (n.includes('management')) return TEAM_BADGE_MAP.management;
  return TEAM_BADGE_MAP.default;
}

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function EmployeeCard({ employees = [], todayAttendance = [], onSelectEmployee, loading }) {
  const teams = useMemo(() => {
    if (employees.length === 0) return [];
    const groups = {};
    employees.forEach(emp => {
      const dept = emp.division || emp.department || 'Internal Team';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    });
    return Object.entries(groups).slice(0, 4).map(([name, members]) => ({
      name,
      count: members.length,
      members: members.slice(0, 5),
    }));
  }, [employees]);

  const displayTeams = teams.length > 0 ? teams : [
    { name: 'Development Team', count: 20, members: [] },
    { name: 'Design Team', count: 12, members: [] },
    { name: 'Management', count: 8, members: [] },
  ];

  if (loading) {
    return (
      <div className="dash-card dash-skeleton-card">
        <div className="dash-skeleton" style={{ width: 80, height: 14, marginBottom: 16 }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E5E7EB' }}>
            <div className="dash-skeleton" style={{ width: 100, height: 14 }} />
            <div className="dash-skeleton" style={{ width: 80, height: 24, borderRadius: 12 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dash-card">
      <CardHeader icon={<FiUsers size={18} />} title="Employee" />

      <div className="dash-emp-card">
        {displayTeams.map((team, i) => {
          const badge = getTeamBadge(team.name);
          return (
            <div key={i} className="dash-emp-team">
              {/* Top: badge label + count */}
              <div className="dash-emp-team-header">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    fontSize: 11, fontWeight: 600, padding: '2px 8px',
                    borderRadius: 999, background: badge.bg, color: badge.color,
                    alignSelf: 'flex-start',
                  }}>
                    {badge.label}
                  </span>
                  <span className="dash-emp-team-name">{team.name}</span>
                </div>
                <span className="dash-emp-team-count">{team.count} Member</span>
              </div>

              {/* Bottom: avatars + date/time */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="dash-emp-avatars">
                  {team.members.length > 0 ? (
                    <>
                      {team.members.slice(0, 4).map((m, j) => (
                        <div
                          key={j}
                          className="dash-emp-avatar"
                          style={{ background: getAvatarColor(m.name) }}
                          title={m.name}
                          onClick={() => onSelectEmployee && onSelectEmployee(m)}
                          role="button"
                          tabIndex={0}
                        >
                          {getInitials(m.name)}
                        </div>
                      ))}
                      {team.count > 4 && <div className="dash-emp-avatar-overflow">+{team.count - 4}</div>}
                    </>
                  ) : (
                    <>
                      {AVATAR_COLORS.slice(0, 4).map((color, j) => (
                        <div key={j} className="dash-emp-avatar" style={{ background: color }}>
                          {String.fromCharCode(65 + j)}
                        </div>
                      ))}
                      {team.count > 4 && <div className="dash-emp-avatar-overflow">+{team.count - 4}</div>}
                    </>
                  )}
                </div>

                {/* Date & Time */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, color: 'var(--dash-text-muted)', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="12" height="12" rx="2"/><path d="M5 1v4M11 1v4M2 8h12"/>
                    </svg>
                    <span>12 Mar</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 2"/>
                    </svg>
                    <span>09:30 PM</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
