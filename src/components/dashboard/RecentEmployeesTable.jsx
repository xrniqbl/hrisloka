import { useNavigate } from 'react-router-dom';

import { brandAvatarColor } from '../../lib/brandPalette';

function getAvatarColor(name) {
  return brandAvatarColor(name);
}
function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function RecentEmployeesTable({ recentEmployees, todayAttendance, onSelectEmployee }) {
  const navigate = useNavigate();

  if (!recentEmployees || recentEmployees.length === 0) return null;

  return (
    <div className="dash-section">
      <div className="dash-card dash-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--dash-card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="dash-chart-title">Recent Employees</span>
          <button
            onClick={() => navigate('/employees')}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--dash-font)' }}
          >
            Lihat Semua →
          </button>
        </div>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Position</th>
              <th>Division</th>
              <th>Status</th>
              <th>Attendance</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {recentEmployees.map(emp => {
              const att = todayAttendance.find(a => a.employee_id === emp.id);
              const color = getAvatarColor(emp.name);
              return (
                <tr
                  key={emp.id}
                  style={{ cursor: 'pointer' }}
                  className="dash-table-row-hover"
                  onClick={() => onSelectEmployee ? onSelectEmployee(emp) : navigate(`/employees`)}
                  title={`Lihat detail ${emp.name}`}
                >
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
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="dash-table-action-btn"
                        onClick={() => onSelectEmployee ? onSelectEmployee(emp) : navigate('/employees')}
                        title="Lihat detail"
                        style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--dash-card-border)', background: 'none', cursor: 'pointer', color: 'var(--dash-text-secondary)', fontFamily: 'var(--dash-font)' }}
                      >
                        Detail
                      </button>
                      <button
                        className="dash-table-action-btn"
                        onClick={() => navigate('/attendance')}
                        title="Lihat absensi"
                        style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--dash-card-border)', background: 'none', cursor: 'pointer', color: 'var(--dash-text-secondary)', fontFamily: 'var(--dash-font)' }}
                      >
                        Absensi
                      </button>
                    </div>
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
