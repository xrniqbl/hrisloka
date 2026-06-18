import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HiArrowPath,
  HiBookOpen,
  HiCalendarDays,
  HiChevronLeft,
  HiChevronRight,
  HiClock,
  HiStar,
  HiViewfinderCircle
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import * as holidayService from '../../services/holidayService';
import { getMyLeaves } from '../../services/leaveService';
import { getShiftAssignments } from '../../services/shiftService';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_COLORS = {
 holiday: '#DC2626',
 leave: '#10B981',
 shift: '#3B82F6',
 training: '#8B5CF6',
};

export default function EmpCalendar() {
  const { user } = useAuth();
  const { locale } = useTranslation();

  const MONTHS = locale === 'en' ? MONTHS_EN : MONTHS_ID;
  const DAYS = locale === 'en' ? DAYS_EN : DAYS_ID;
  const EVENT_TYPE_LABELS = locale === 'en'
    ? { holiday: 'Holiday', leave: 'Leave', shift: 'Shift', training: 'Training' }
    : { holiday: 'Hari Libur', leave: 'Cuti', shift: 'Shift', training: 'Training' };
  const [emp, setEmp] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [holidays, setHolidays] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'agenda'

  const loadData = useCallback(async () => {
 setLoading(true);
 const email = user?.email || user?.user_metadata?.email;
 const { data: empData } = await getEmployeeByEmail(email);
 setEmp(empData);

 const [hRes, lRes, sRes, tRes] = await Promise.all([
 holidayService.getAllHolidays(year),
 empData ? getMyLeaves(empData.id) : { data: [] },
 getShiftAssignments(),
 supabase.from('trainings')
 .select('*, training_participants(employee_id)')
 .order('start_date', { ascending: true }),
 ]);

 setHolidays(hRes.data || []);
 setLeaves((lRes.data || []).filter(l => l.status === 'approved'));

 if (empData) {
 const myShifts = (sRes.data || []).filter(s => s.employee_id === empData.id);
 setShifts(myShifts);
 const myTrainings = (tRes.data || []).filter(t =>
 (t.training_participants || []).some(p => p.employee_id === empData.id) &&
 (t.status === 'upcoming' || t.status === 'ongoing')
 );
 setTrainings(myTrainings);
 }
 setLoading(false);
 }, [user, year]);

 const today = new Date();
 const isToday = (d) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

 const daysInMonth = new Date(year, month + 1, 0).getDate();
 const firstDay = new Date(year, month, 1).getDay();

 const calendarDays = useMemo(() => {
 const days = [];
 for (let i = 0; i < firstDay; i++) days.push(null);
 for (let d = 1; d <= daysInMonth; d++) days.push(d);
 return days;
 }, [month, year, daysInMonth, firstDay]);

 const getDateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

 const getDateEvents = (d) => {
 if (!d) return [];
 const ds = getDateStr(d);
 const dayOfWeek = new Date(year, month, d).getDay();
 const mondayIdx = (dayOfWeek + 6) % 7;
 const events = [];

 // Holidays
 holidays.filter(h => h.date === ds).forEach(h =>
 events.push({ type: 'holiday', label: h.name, color: EVENT_COLORS.holiday })
 );

 // Approved leaves
 leaves.filter(l => l.start_date <= ds && l.end_date >= ds).forEach(l =>
  events.push({ type: 'leave', label: locale === 'en' ? `Leave: ${l.type}` : `Cuti: ${l.type}`, color: EVENT_COLORS.leave })
 );

 // Shifts
 shifts.filter(s => s.day_of_week === mondayIdx).forEach(s =>
 events.push({ type: 'shift', label: `${s.shifts?.name || 'Shift'} ${s.shifts?.start_time?.slice(0, 5) || ''}-${s.shifts?.end_time?.slice(0, 5) || ''}`, color: EVENT_COLORS.shift })
 );

 // Trainings
 trainings.filter(t => {
 if (!t.start_date) return false;
 const start = t.start_date;
 const end = t.end_date || t.start_date;
 return start <= ds && end >= ds;
 }).forEach(t =>
 events.push({ type: 'training', label: t.title, color: EVENT_COLORS.training })
 );

 return events;
 };

 const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelectedDate(null); };
 const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelectedDate(null); };

 const selectedEvents = selectedDate ? getDateEvents(selectedDate) : [];
 const todayStr = today.toISOString().split('T')[0];
 const upcomingHolidays = holidays.filter(h => h.date >= todayStr).slice(0, 5);

  if (loading) {
    return (
      <div style={{ animation: "fadeInUp 0.3s ease" }}>
        <div style={{ marginBottom: 16 }}>
          <div className="skeleton skeleton-text" style={{ width: 100, height: 22, marginBottom: 8 }} />
          <div className="skeleton skeleton-text-sm" style={{ width: 200 }} />
        </div>
        <div className="emp-card" style={{ height: 340, marginBottom: 16 }}>
          <div className="skeleton" style={{ height: '100%', borderRadius: 8 }} />
        </div>
        {[1,2,3].map(i => <div key={i} className="emp-card" style={{ height: 56, marginBottom: 8 }}><div className="skeleton" style={{ height: '100%', borderRadius: 8 }} /></div>)}
      </div>
    );
  }

  // Build agenda: all events for the whole month, sorted
  const agendaEvents = useMemo(() => {
    const result = [];
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      const evts = getDateEvents(d);
      if (evts.length > 0) {
        result.push({ day: d, date: getDateStr(d), events: evts });
      }
    }
    return result;
  }, [month, year, holidays, leaves, shifts, trainings]);

  return (
    <div style={{ paddingBottom: 16, animation: 'fadeInUp 0.35s ease' }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="emp-page-title">{locale === 'en' ? 'Calendar' : 'Kalender'}</h1>
          <p className="emp-page-subtitle">
            {locale === 'en' ? 'Shifts, holidays, leaves & training' : 'Jadwal shift, libur, cuti, dan training'}
          </p>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{ padding: '5px 10px', borderRadius: 7, border: 'none', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'grid' ? '#fff' : 'var(--muted)' }}
          >
            {locale === 'en' ? 'Grid' : 'Grid'}
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            style={{ padding: '5px 10px', borderRadius: 7, border: 'none', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: viewMode === 'agenda' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'agenda' ? '#fff' : 'var(--muted)' }}
          >
            {locale === 'en' ? 'Agenda' : 'Agenda'}
          </button>
        </div>
      </div>


      {/* Calendar Card (Grid mode) */}
      {viewMode === 'grid' && (
      <div className="emp-card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        {/* Month Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--primary), #1D4ED8)' }}>
          <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><HiChevronLeft size={18} /></button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{MONTHS[month]} {year}</div>
            {(year !== today.getFullYear() || month !== today.getMonth()) && (
              <button
                onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDate(today.getDate()); }}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 10px', cursor: 'pointer', marginTop: 4, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, margin: '4px auto 0' }}
              >
                <HiViewfinderCircle size={10} /> {locale === 'en' ? 'Today' : 'Hari Ini'}
              </button>
            )}
          </div>
          <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><HiChevronRight size={18} /></button>
        </div>

        {/* Day Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, fontWeight: 700, color: (d === 'Min' || d === 'Sun') ? '#DC2626' : 'var(--muted)' }}>{d}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calendarDays.map((d, i) => {
            const events = d ? getDateEvents(d) : [];
            const isSunday = i % 7 === 0;
            const hasHoliday = events.some(e => e.type === 'holiday');
            const hasLeave = events.some(e => e.type === 'leave');
            const isSelected = selectedDate === d;
            return (
              <div
                key={i}
                onClick={() => d && setSelectedDate(isSelected ? null : d)}
                style={{
                  minHeight: 48, padding: '4px 2px', textAlign: 'center',
                  cursor: d ? 'pointer' : 'default',
                  background: isSelected ? 'rgba(0,71,171,0.08)' : hasHoliday ? 'rgba(220,38,38,0.04)' : hasLeave ? 'rgba(16,185,129,0.04)' : 'transparent',
                  borderBottom: '1px solid var(--border-light, rgba(0,0,0,0.04))',
                  borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border-light, rgba(0,0,0,0.04))' : 'none',
                  transition: 'background 0.15s',
                }}
              >
                {d && (
                  <>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: isToday(d) ? 800 : 500,
                      color: isToday(d) ? '#fff' : isSunday || hasHoliday ? '#DC2626' : 'var(--text)',
                      background: isToday(d) ? 'var(--primary)' : 'transparent' }}>
                      {d}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                      {[...new Set(events.map(e => e.color))].slice(0, 3).map((color, j) => (
                        <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Agenda View */}
      {viewMode === 'agenda' && (
        <div style={{ marginBottom: 16 }}>
          {/* Month nav for agenda too */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '10px 14px', background: 'linear-gradient(135deg, var(--primary), #1D4ED8)', borderRadius: 'var(--radius-md)', color: '#fff' }}>
            <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><HiChevronLeft size={16} /></button>
            <span style={{ fontWeight: 800, fontSize: 15 }}>{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><HiChevronRight size={16} /></button>
          </div>
          {agendaEvents.length === 0 ? (
            <div className="emp-card emp-empty">
              <div className="emp-empty-icon"><HiCalendarDays size={24} /></div>
              <div className="emp-empty-title">{locale === 'en' ? 'No events this month' : 'Tidak ada event bulan ini'}</div>
            </div>
          ) : agendaEvents.map(({ day, date, events: evts }) => (
            <div key={date} className="emp-card emp-card-stagger" style={{ marginBottom: 8, padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: evts.length ? '1px solid var(--border)' : 'none', background: isToday(day) ? 'var(--primary)' : 'transparent' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: isToday(day) ? 'rgba(255,255,255,0.2)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: isToday(day) ? '#fff' : 'var(--primary)' }}>{day}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: isToday(day) ? '#fff' : 'var(--muted)', textTransform: 'uppercase' }}>
                  {new Date(date).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { weekday: 'long' })}
                </span>
                {isToday(day) && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: 99 }}>{locale === 'en' ? 'TODAY' : 'HARI INI'}</span>}
              </div>
              <div style={{ padding: '8px 14px', display: 'grid', gap: 6 }}>
                {evts.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: `${ev.color}08`, borderRadius: 8, borderLeft: `3px solid ${ev.color}` }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: ev.color, textTransform: 'uppercase', marginBottom: 1 }}>{EVENT_TYPE_LABELS[ev.type]}</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{ev.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      {viewMode === 'grid' && (
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { color: EVENT_COLORS.holiday, label: locale === 'en' ? 'Holiday' : 'Libur' },
          { color: EVENT_COLORS.leave, label: locale === 'en' ? 'Leave' : 'Cuti' },
          { color: EVENT_COLORS.shift, label: 'Shift' },
          { color: EVENT_COLORS.training, label: 'Training' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
      )}

      {/* Selected Date Events (grid mode only) */}
      {viewMode === 'grid' && selectedDate && (
        <div className="emp-card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
            {selectedDate} {MONTHS[month]} {year}
          </div>
          {selectedEvents.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{locale === 'en' ? 'No events on this date.' : 'Tidak ada event pada tanggal ini.'}</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {selectedEvents.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: `${ev.color}08`, borderRadius: 8, borderLeft: `3px solid ${ev.color}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: ev.color, textTransform: 'uppercase', marginBottom: 2 }}>
                      {EVENT_TYPE_LABELS[ev.type]}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Holidays */}
      <div className="emp-card">
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626' }}>
          <HiStar size={14} /> {locale === 'en' ? 'Upcoming Holidays' : 'Hari Libur Mendatang'}
        </div>
        {upcomingHolidays.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{locale === 'en' ? 'No upcoming holidays.' : 'Tidak ada hari libur mendatang.'}</div>
        ) : upcomingHolidays.map(h => (
          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light, rgba(0,0,0,0.04))' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#DC2626', color: '#fff', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, lineHeight: 1.1 }}>
              {new Date(h.date).getDate()}
              <span style={{ fontSize: 8, fontWeight: 600, opacity: 0.8 }}>{MONTHS[new Date(h.date).getMonth()]?.slice(0, 3)}</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{h.name}</div>
              {h.description && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{h.description}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
