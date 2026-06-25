import { FiCalendar, FiBook, FiUserCheck, FiClock } from 'react-icons/fi';

export default function UpcomingEvents({ trainings, employees, loading }) {
  if (loading) return <UpcomingEventsSkeleton />;

  const events = [];

  // Upcoming trainings
  (trainings || [])
    .filter(t => t.status === 'upcoming' || t.status === 'ongoing')
    .slice(0, 3)
    .forEach(t => {
      events.push({
        id: `training-${t.id}`,
        title: t.title,
        date: t.start_date ? new Date(t.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—',
        icon: <FiBook />,
        color: '#3B82F6',
        bg: 'rgba(59,130,246,0.08)',
      });
    });

  // Expiring contracts (within 30 days)
  (employees || [])
    .filter(e => e.status === 'contract' && e.contract_end)
    .forEach(e => {
      const daysLeft = Math.ceil((new Date(e.contract_end) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0 && daysLeft <= 30) {
        events.push({
          id: `contract-${e.id}`,
          title: `Contract: ${e.name}`,
          date: `${daysLeft} days left`,
          icon: <FiUserCheck />,
          color: '#EF4444',
          bg: 'rgba(239,68,68,0.08)',
        });
      }
    });

  // If no events, add placeholder
  if (events.length === 0) {
    events.push({
      id: 'no-events',
      title: 'No upcoming events',
      date: 'All clear',
      icon: <FiCalendar />,
      color: '#9CA3AF',
      bg: 'rgba(156,163,175,0.08)',
    });
  }

  return (
    <div className="dash-card dash-events-card" style={{ marginTop: 16 }}>
      <div className="dash-chart-header">
        <span className="dash-chart-title">Upcoming Events</span>
        <FiClock size={14} style={{ color: 'var(--dash-text-muted)' }} />
      </div>
      {events.slice(0, 5).map(ev => (
        <div key={ev.id} className="dash-event-item">
          <div className="dash-event-icon" style={{ background: ev.bg, color: ev.color }}>
            {ev.icon}
          </div>
          <div className="dash-event-info">
            <div className="dash-event-title">{ev.title}</div>
            <div className="dash-event-date">{ev.date}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UpcomingEventsSkeleton() {
  return (
    <div className="dash-card dash-events-card" style={{ marginTop: 16 }}>
      <div className="dash-chart-header">
        <div className="dash-skeleton" style={{ width: 120, height: 16 }} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="dash-event-item">
          <div className="dash-skeleton dash-skeleton-circle" style={{ width: 34, height: 34 }} />
          <div style={{ flex: 1 }}>
            <div className="dash-skeleton" style={{ width: 120, height: 13, marginBottom: 4 }} />
            <div className="dash-skeleton" style={{ width: 60, height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
