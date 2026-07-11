import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiBook, FiUserCheck, FiClock, FiChevronRight } from 'react-icons/fi';

export default function UpcomingEvents({ trainings, employees, loading }) {
  const navigate = useNavigate();

  if (loading) return <UpcomingEventsSkeleton />;

  const events = [];

  (trainings || [])
    .filter(t => t.status === 'upcoming' || t.status === 'ongoing')
    .slice(0, 3)
    .forEach(t => {
      events.push({
        id: `training-${t.id}`,
        title: t.title,
        date: t.start_date ? new Date(t.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—',
        icon: <FiBook />,
        color: '#635BFF',
        bg: 'rgba(99,91,255,0.08)',
        path: '/training',
        tag: 'Training',
      });
    });

  (employees || [])
    .filter(e => e.status === 'contract' && e.contract_end)
    .forEach(e => {
      const daysLeft = Math.ceil((new Date(e.contract_end) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0 && daysLeft <= 30) {
        events.push({
          id: `contract-${e.id}`,
          title: `Contract: ${e.name}`,
          date: `${daysLeft} hari lagi`,
          icon: <FiUserCheck />,
          color: '#EF4444',
          bg: 'rgba(239,68,68,0.08)',
          path: '/employees',
          tag: 'Kontrak',
        });
      }
    });

  if (events.length === 0) {
    events.push({
      id: 'no-events',
      title: 'Tidak ada acara mendatang',
      date: 'Semua aman',
      icon: <FiCalendar />,
      color: '#9CA3AF',
      bg: 'rgba(156,163,175,0.08)',
      path: null,
      tag: null,
    });
  }

  return (
    <div className="dash-card dash-events-card" style={{ marginTop: 16 }}>
      <div className="dash-chart-header">
        <span className="dash-chart-title">Upcoming Events</span>
        <FiClock size={14} style={{ color: 'var(--dash-text-muted)' }} />
      </div>
      {events.slice(0, 5).map(ev => (
        <div
          key={ev.id}
          className="dash-event-item"
          onClick={() => ev.path && navigate(ev.path)}
          style={{ cursor: ev.path ? 'pointer' : 'default', borderRadius: 8, transition: 'background 0.15s' }}
          onMouseEnter={e => { if (ev.path) e.currentTarget.style.background = 'var(--dash-card-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; }}
          role={ev.path ? 'button' : undefined}
          tabIndex={ev.path ? 0 : undefined}
          onKeyDown={ev.path ? e => e.key === 'Enter' && navigate(ev.path) : undefined}
        >
          <div className="dash-event-icon" style={{ background: ev.bg, color: ev.color }}>
            {ev.icon}
          </div>
          <div className="dash-event-info" style={{ flex: 1 }}>
            <div className="dash-event-title">{ev.title}</div>
            <div className="dash-event-date" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {ev.tag && (
                <span style={{ fontSize: 10, background: ev.bg, color: ev.color, borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>
                  {ev.tag}
                </span>
              )}
              {ev.date}
            </div>
          </div>
          {ev.path && <FiChevronRight size={14} style={{ color: 'var(--dash-text-muted)', flexShrink: 0 }} />}
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
