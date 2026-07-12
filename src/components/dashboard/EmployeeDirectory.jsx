import { ChevronRight, Users } from 'lucide-react';
import { Icon } from '@astryxdesign/core/Icon';
import DashEmpty from './DashEmpty';
import { brandAvatarColor } from '../../lib/brandPalette';

function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function EmployeeDirectory({ employees = [], todayAttendance = [], onSelectEmployee, onViewAll, loading }) {
  if (loading) return <EmployeeDirectorySkeleton />;

  const presentIds = new Set(todayAttendance.map(a => a.employee_id));
  const shown = employees.slice(0, 12);

  return (
    <div className="dash-card dash-directory-card">
      <div className="dash-chart-header">
        <span className="dash-chart-title">Team Members</span>
        <button type="button" onClick={onViewAll} style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--dash-font)' }}>
          View All <Icon icon={ChevronRight} size="sm" color="inherit" />
        </button>
      </div>
      {shown.length === 0 ? (
        <DashEmpty
          icon={<Icon icon={Users} size="md" color="inherit" />}
          title="Belum ada anggota tim"
          description="Karyawan aktif akan muncul di daftar ini."
          ctaLabel="Kelola karyawan"
          onCta={onViewAll}
        />
      ) : (
        <div className="dash-directory-grid">
          {shown.map(emp => {
            const color = brandAvatarColor(emp.name);
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
