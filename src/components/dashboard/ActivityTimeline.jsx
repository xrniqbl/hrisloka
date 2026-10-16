import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Icon } from '@astryxdesign/core/Icon';
import DashEmpty from './DashEmpty';

export default function ActivityTimeline({ employees = [], todayAttendance = [], loading }) {
  const navigate = useNavigate();

  if (loading) return <ActivityTimelineSkeleton />;

  const divisions = {};
  employees.forEach(emp => {
    const div = emp.division || 'Lainnya';
    if (!divisions[div]) divisions[div] = { total: 0, present: 0, late: 0, absent: 0 };
    divisions[div].total++;
    const att = todayAttendance.find(a => a.employee_id === emp.id);
    if (att) {
      if (att.status === 'present') divisions[div].present++;
      else if (att.status === 'late') divisions[div].late++;
      else divisions[div].absent++;
    } else {
      divisions[div].absent++;
    }
  });

  const divEntries = Object.entries(divisions).sort((a, b) => b[1].total - a[1].total);

  if (divEntries.length === 0) {
    return (
      <div className="dash-section">
        <div className="dash-card dash-timeline-card">
          <div className="dash-chart-header">
            <span className="dash-chart-title">Activity Today</span>
          </div>
          <DashEmpty
            icon={<Icon icon={Users} size="md" color="inherit" />}
            title="Belum ada data karyawan"
            description="Tambah karyawan aktif agar aktivitas absensi tampil di sini."
            ctaLabel="Kelola karyawan"
            onCta={() => navigate('/employees')}
            secondaryLabel="Lihat absensi"
            onSecondary={() => navigate('/attendance')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="dash-section">
      <div
        className="dash-card dash-timeline-card dash-kpi-clickable"
        onClick={() => navigate('/attendance')}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && navigate('/attendance')}
        title="Lihat detail absensi"
        style={{ cursor: 'pointer' }}
      >
        <div className="dash-chart-header">
          <span className="dash-chart-title">Activity Today</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="dash-chart-badge">{employees.length} employees</span>
            <span style={{ fontSize: 11, color: 'var(--dash-text-muted)', fontWeight: 500 }}>Lihat semua →</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {[
            { label: 'Hadir', color: 'var(--primary)', count: todayAttendance.filter(a => a.status === 'present').length },
            { label: 'Terlambat', color: 'var(--primary-dark)', count: todayAttendance.filter(a => a.status === 'late').length },
            { label: 'Absen', color: 'var(--muted)', count: Math.max(0, employees.length - todayAttendance.length) },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--dash-card-hover)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 11, color: 'var(--dash-text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {divEntries.map(([name, data]) => {
          const total = data.total || 1;
          const presentPct = (data.present / total) * 100;
          const latePct = (data.late / total) * 100;
          const absentPct = (data.absent / total) * 100;

          return (
            <div key={name} className="dash-timeline-row">
              <div className="dash-timeline-div">{name}</div>
              <div className="dash-timeline-bar-wrap">
                <div className="dash-timeline-bar present" style={{ width: `${presentPct}%` }} />
                <div className="dash-timeline-bar late" style={{ width: `${latePct}%` }} />
                <div className="dash-timeline-bar absent" style={{ width: `${absentPct}%` }} />
              </div>
              <div className="dash-timeline-stats">
                <span className="dash-timeline-stat">
                  <span className="dash-timeline-dot" style={{ background: 'var(--primary)' }} />
                  {data.present}
                </span>
                <span className="dash-timeline-stat">
                  <span className="dash-timeline-dot" style={{ background: 'var(--primary-dark)' }} />
                  {data.late}
                </span>
                <span className="dash-timeline-stat">
                  <span className="dash-timeline-dot" style={{ background: 'var(--muted)' }} />
                  {data.absent}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityTimelineSkeleton() {
  return (
    <div className="dash-section">
      <div className="dash-card dash-timeline-card">
        <div className="dash-chart-header">
          <div className="dash-skeleton" style={{ width: 120, height: 16 }} />
          <div className="dash-skeleton" style={{ width: 80, height: 20, borderRadius: 20 }} />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-timeline-row">
            <div className="dash-skeleton" style={{ width: 100, height: 14 }} />
            <div className="dash-skeleton" style={{ flex: 1, height: 10, borderRadius: 5 }} />
            <div className="dash-skeleton" style={{ width: 100, height: 14 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
