import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Icon } from '@astryxdesign/core/Icon';
import CardHeader from './CardHeader';
import DashEmpty from './DashEmpty';
import { brandAvatarColor, BRAND } from '../../lib/brandPalette';

const TEAM_BADGE_MAP = {
  internal: { bg: BRAND.soft[2], color: BRAND.primary, label: 'Internal Team' },
  outsource: { bg: BRAND.soft[3], color: BRAND.primaryDark, label: 'Outsource' },
  management: { bg: BRAND.soft[1], color: BRAND.scale[0], label: 'Internal Team' },
  default: { bg: BRAND.soft[7], color: BRAND.muted, label: 'Team' },
};

function getTeamBadge(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('internal') || n.includes('development') || n.includes('design')) return TEAM_BADGE_MAP.internal;
  if (n.includes('outsource')) return TEAM_BADGE_MAP.outsource;
  if (n.includes('management')) return TEAM_BADGE_MAP.management;
  return TEAM_BADGE_MAP.default;
}

function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function EmployeeCard({ employees = [], todayAttendance: _todayAttendance = [], onSelectEmployee, loading }) {
  const navigate = useNavigate();
  const teams = useMemo(() => {
    if (employees.length === 0) return [];
    const groups = {};
    employees.forEach(emp => {
      const dept = emp.division || emp.department || 'Tim Lainnya';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    });
    return Object.entries(groups).slice(0, 4).map(([name, members]) => ({
      name,
      count: members.length,
      members: members.slice(0, 5),
    }));
  }, [employees]);

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
      <CardHeader icon={<Icon icon={Users} size="md" color="inherit" />} title="Employee" />

      <div className="dash-emp-card">
        {teams.length === 0 ? (
          <DashEmpty
            icon={<Icon icon={Users} size="md" color="inherit" />}
            title="Belum ada data karyawan"
            description="Tambah karyawan untuk melihat ringkasan per divisi."
            ctaLabel="Kelola karyawan"
            onCta={() => navigate('/employees')}
          />
        ) : teams.map((team, i) => {
          const badge = getTeamBadge(team.name);
          return (
            <div key={i} className="dash-emp-team">
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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="dash-emp-avatars">
                  {team.members.slice(0, 4).map((m, j) => (
                    <div
                      key={m.id || j}
                      className="dash-emp-avatar"
                      style={{ background: brandAvatarColor(m.name) }}
                      title={m.name}
                      onClick={() => onSelectEmployee && onSelectEmployee(m)}
                      role="button"
                      tabIndex={0}
                    >
                      {getInitials(m.name)}
                    </div>
                  ))}
                  {team.count > 4 && <div className="dash-emp-avatar-overflow">+{team.count - 4}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
