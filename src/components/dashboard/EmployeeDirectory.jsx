import { FiChevronRight } from 'react-icons/fi';

const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];
function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}
function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function EmployeeDirectory({ employees, todayAttendance, onSelectEmployee, onViewAll, loading }) {
  if (loading) return <EmployeeDirectorySkeleton />;

  const presentIds = new Set(todayAttendance.map(a => a.employee_id));
  const shown = employees.slice(0, 12);

  return (
    <div className="dash-card dash-directory-card">
      <div className="dash-chart-header">
        <span className="dash-chart-title">Team Members</span>
        <button onClick={onViewAll} style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--dash-font)' }}>
          View All <FiChevronRight size={14} />
        </button>
      </div>
      {shown.length === 0 ? (
        <div className="dash-empty"><div className="dash-empty-text">No employees found</div></div>
      ) : (
        <div className="dash-directory-grid">
          {shown.map(emp => {
            const color = getAvatarColor(emp.name);
            const isOnline = presentIds.has(emp.id);
            return (
              <div key={emp.id} className="dash-directory-item" onClick={() => onSelectEmployee(emp)}>
                <div className="dash-directory-avatar" style={{ background: `${color}15`, color }}>
                  {getInitials(emp.name)}
                  <span className={`dash-online-dot ${isOnline ? 'online' : 'offline'}`} />
                </div>
                <div className="dash-directory-name">{emp.name}</div>
                <div className="dash-directory-role">{emp.position || emp.division || '—'}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmployeeDirectorySkeleton() {
  return (
    <div className="dash-card dash-directory-card">
      <div className="dash-chart-header">
        <div className="dash-skeleton" style={{ width: 120, height: 16 }} />
      </div>
      <div className="dash-directory-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 4px' }}>
            <div className="dash-skeleton dash-skeleton-circle" style={{ width: 42, height: 42 }} />
            <div className="dash-skeleton" style={{ width: 50, height: 10 }} />
            <div className="dash-skeleton" style={{ width: 40, height: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
