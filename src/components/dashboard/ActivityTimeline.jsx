export default function ActivityTimeline({ employees, todayAttendance, loading }) {
  if (loading) return <ActivityTimelineSkeleton />;

  // Group employees by division
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
          <div className="dash-empty">
            <div className="dash-empty-text">No employee data available</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-section">
      <div className="dash-card dash-timeline-card">
        <div className="dash-chart-header">
          <span className="dash-chart-title">Activity Today</span>
          <span className="dash-chart-badge">{employees.length} employees</span>
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
                  <span className="dash-timeline-dot" style={{ background: 'var(--dash-success)' }} />
                  {data.present}
                </span>
                <span className="dash-timeline-stat">
                  <span className="dash-timeline-dot" style={{ background: 'var(--dash-warning)' }} />
                  {data.late}
                </span>
                <span className="dash-timeline-stat">
                  <span className="dash-timeline-dot" style={{ background: 'var(--dash-danger)' }} />
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
