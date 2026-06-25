const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}
function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function RecentEmployeesTable({ recentEmployees, todayAttendance }) {
  if (!recentEmployees || recentEmployees.length === 0) return null;

  return (
    <div className="dash-section">
      <div className="dash-card dash-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--dash-card-border)' }}>
          <span className="dash-chart-title">Recent Employees</span>
        </div>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Position</th>
              <th>Division</th>
              <th>Status</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {recentEmployees.map(emp => {
              const att = todayAttendance.find(a => a.employee_id === emp.id);
              const color = getAvatarColor(emp.name);
              return (
                <tr key={emp.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 9,
                        background: `${color}15`, color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {getInitials(emp.name)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{emp.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--dash-text-secondary)' }}>{emp.position || '—'}</td>
                  <td style={{ color: 'var(--dash-text-secondary)' }}>{emp.division || '—'}</td>
                  <td>
                    <span className={`dash-status ${emp.status === 'permanent' ? 'approved' : 'pending'}`}>
                      {emp.status || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`dash-status ${att?.status || 'absent'}`}>
                      {att?.status ? att.status.charAt(0).toUpperCase() + att.status.slice(1) : 'Absent'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
