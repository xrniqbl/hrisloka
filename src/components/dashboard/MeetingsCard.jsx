import { useState, useMemo } from 'react';
import { FiVideo, FiChevronLeft, FiChevronRight, FiMonitor, FiPhone } from 'react-icons/fi';
import CardHeader from './CardHeader';

export default function MeetingsCard({ loading }) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today.getDate());

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
        date: d.getDate(),
        isToday: d.toDateString() === today.toDateString(),
      };
    });
  }, []);

  const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const meetings = [
    { title: 'Uploading New Items to Marketplace', date: '12 Mar', time: '09:30 PM' },
    { title: 'Uploading New Items to Marketplace', date: '12 Mar', time: '09:30 PM' },
  ];

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
      <CardHeader icon={<FiVideo size={18} />} title="Meetings" />

      <div className="dash-meetings">
        <div className="dash-mini-calendar">
          <div className="dash-mini-cal-header">
            <span className="dash-mini-cal-title">{monthLabel}</span>
            <div className="dash-mini-cal-nav">
              <button className="dash-mini-cal-btn"><FiChevronLeft size={14} /></button>
              <button className="dash-mini-cal-btn"><FiChevronRight size={14} /></button>
            </div>
          </div>
          <div className="dash-mini-cal-dates">
            {weekDays.map((d, i) => (
              <div
                key={i}
                className={`dash-mini-cal-date${d.date === currentDate ? ' active' : ''}${d.isToday && d.date !== currentDate ? ' today' : ''}`}
                onClick={() => setCurrentDate(d.date)}
              >
                <span className="dash-mini-cal-date-label">{d.day}</span>
                <span>{d.date}</span>
              </div>
            ))}
          </div>
        </div>

        {meetings.map((m, i) => (
          <div key={i} className="dash-meeting-item">
            <div className="dash-meeting-info">
              <span className="dash-meeting-badge">Upcoming Meeting</span>
              <div className="dash-meeting-title">{m.title}</div>
              <div className="dash-meeting-datetime">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="12" height="12" rx="2"/><path d="M5 1v4M11 1v4M2 8h12"/></svg>
                <span>{m.date}</span>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 2"/></svg>
                <span>{m.time}</span>
              </div>
              <div className="dash-meeting-details-link">Meeting Details</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" strokeWidth="2"><rect x="2" y="3" width="12" height="12" rx="2"/><path d="M5 1v4M11 1v4M2 8h12"/></svg>
          </div>
        ))}
      </div>
    </div>
  );
}
