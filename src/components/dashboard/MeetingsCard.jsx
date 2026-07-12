import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiVideo, FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';
import CardHeader from './CardHeader';
import DashEmpty from './DashEmpty';

/**
 * Meetings / upcoming events card.
 * Uses real trainings (and optional events) — no hard-coded demo rows.
 */
export default function MeetingsCard({ trainings = [], events = [], loading }) {
  const navigate = useNavigate();
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today.getDate());

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
  }, [weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthLabel = useMemo(() => {
    const mid = weekDays[3]?.full || today;
    return mid.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [weekDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const meetings = useMemo(() => {
    const items = [];

    trainings.forEach(t => {
      const raw = t.start_date || t.date || t.scheduled_at || t.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      // show upcoming + recent (within past 1 day)
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      if (d.getTime() < cutoff) return;
      items.push({
        id: t.id,
        title: t.title || t.name || 'Training',
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        sort: d.getTime(),
        path: '/training',
        badge: 'Training',
      });
    });

    events.forEach(e => {
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

    return items.sort((a, b) => a.sort - b.sort).slice(0, 5);
  }, [trainings, events]);

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
      <CardHeader icon={<FiVideo size={18} />} title="Upcoming" />

      <div className="dash-meetings">
        <div className="dash-mini-calendar">
          <div className="dash-mini-cal-header">
            <span className="dash-mini-cal-title">{monthLabel}</span>
            <div className="dash-mini-cal-nav">
              <button type="button" className="dash-mini-cal-btn" onClick={() => setWeekOffset(w => w - 1)} aria-label="Minggu sebelumnya">
                <FiChevronLeft size={14} />
              </button>
              <button type="button" className="dash-mini-cal-btn" onClick={() => setWeekOffset(w => w + 1)} aria-label="Minggu berikutnya">
                <FiChevronRight size={14} />
              </button>
            </div>
          </div>
          <div className="dash-mini-cal-dates">
            {weekDays.map((d, i) => (
              <div
                key={i}
                className={`dash-mini-cal-date${d.date === selectedDate ? ' active' : ''}${d.isToday && d.date !== selectedDate ? ' today' : ''}`}
                onClick={() => setSelectedDate(d.date)}
                role="button"
                tabIndex={0}
              >
                <span className="dash-mini-cal-date-label">{d.day}</span>
                <span>{d.date}</span>
              </div>
            ))}
          </div>
        </div>

        {meetings.length === 0 ? (
          <DashEmpty
            icon={<FiCalendar size={18} />}
            title="Tidak ada agenda mendatang"
            description="Libur, cuti, dan event akan muncul di sini."
            ctaLabel="Buka kalender"
            onCta={() => navigate('/calendar')}
          />
        ) : meetings.map((m) => (
          <div
            key={m.id}
            className="dash-meeting-item"
            onClick={() => navigate(m.path)}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate(m.path)}
          >
            <div className="dash-meeting-info">
              <span className="dash-meeting-badge">{m.badge}</span>
              <div className="dash-meeting-title">{m.title}</div>
              <div className="dash-meeting-datetime">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="12" height="12" rx="2"/><path d="M5 1v4M11 1v4M2 8h12"/></svg>
                <span>{m.date}</span>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 2"/></svg>
                <span>{m.time}</span>
              </div>
            </div>
            <FiChevronRight size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
