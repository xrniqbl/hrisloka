import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import { Video, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import CardHeader from './CardHeader';
import DashEmpty from './DashEmpty';

/**
 * Meetings / upcoming events card.
 * Uses real trainings (and optional events) — no hard-coded demo rows.
 */
export default function MeetingsCard({ trainings = [], events = [], loading }) {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => today.getDate());

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
        date: d.getDate(),
        full: d,
        isToday: d.toDateString() === today.toDateString(),
      };
    });
  }, [weekOffset, today]);

  const monthLabel = useMemo(() => {
    const mid = weekDays[3]?.full || today;
    return mid.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [weekDays, today]);

  const meetings = useMemo(() => {
    const items = [];
    const cutoff = today.getTime() - 24 * 60 * 60 * 1000;

    trainings.forEach((t) => {
      const raw = t.start_date || t.date || t.scheduled_at || t.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      if (d.getTime() < cutoff) return;
      items.push({
        id: t.id,
        title: t.title || t.name || 'Training',
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        sort: d.getTime(),
        path: '/training',
        badge: 'Upcoming Meeting',
      });
    });

    events.forEach((e) => {
      const raw = e.date || e.start_date || e.scheduled_at;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      items.push({
        id: e.id,
        title: e.title || e.name || 'Event',
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        sort: d.getTime(),
        path: e.path || '/calendar',
        badge: e.badge || 'Event',
      });
    });

    return items.sort((a, b) => a.sort - b.sort).slice(0, 4);
  }, [trainings, events, today]);

  if (loading) {
    return (
      <div className="dash-card dash-skeleton-card">
        <div className="dash-skeleton" style={{ width: 100, height: 14, marginBottom: 16 }} />
        <div className="dash-skeleton" style={{ width: '100%', height: 48, marginBottom: 16 }} />
        <div className="dash-skeleton" style={{ width: '100%', height: 60 }} />
      </div>
    );
  }

  return (
    <div className="dash-card">
      <CardHeader
        icon={<Icon icon={Video} size="sm" color="inherit" />}
        title="Meetings"
      />

      <div className="dash-meetings">
        <div className="dash-mini-calendar">
          <div className="dash-mini-cal-header">
            <button
              type="button"
              className="dash-mini-cal-btn"
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label="Minggu sebelumnya"
            >
              <Icon icon={ChevronLeft} size="sm" color="inherit" />
            </button>
            <span className="dash-mini-cal-title">{monthLabel}</span>
            <button
              type="button"
              className="dash-mini-cal-btn"
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Minggu berikutnya"
            >
              <Icon icon={ChevronRight} size="sm" color="inherit" />
            </button>
          </div>
          <div className="dash-mini-cal-dates">
            {weekDays.map((d) => (
              <button
                type="button"
                key={`${d.date}-${d.day}`}
                className={`dash-mini-cal-date${d.date === selectedDate ? ' active' : ''}${d.isToday ? ' today' : ''}`}
                onClick={() => setSelectedDate(d.date)}
              >
                <span>{d.date}</span>
                <span className="dash-mini-cal-date-label">{d.day}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dash-meeting-list">
          {meetings.length === 0 ? (
            <DashEmpty
              icon={<Icon icon={Calendar} size="md" color="inherit" />}
              title="Tidak ada meeting mendatang"
              description="Training & event terjadwal akan muncul di sini."
              ctaLabel="Buka kalender"
              onCta={() => navigate('/calendar')}
            />
          ) : (
            meetings.map((m) => (
              <div
                key={m.id}
                className="dash-meeting-item"
                onClick={() => navigate(m.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(m.path)}
              >
                <div className="dash-meeting-info">
                  <span className="dash-meeting-badge dash-meeting-badge--green">{m.badge}</span>
                  <div className="dash-meeting-title">{m.title}</div>
                  <div className="dash-meeting-datetime">
                    <Icon icon={Calendar} size="sm" color="inherit" />
                    {m.date}
                    <span style={{ margin: '0 4px' }}>·</span>
                    {m.time}
                  </div>
                  <button
                    type="button"
                    className="dash-meeting-details-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(m.path);
                    }}
                  >
                    Meeting Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
