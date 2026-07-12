import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  HiArrowPath,
  HiBookOpen,
  HiCalendarDays,
  HiClock,
  HiStar
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import * as holidayService from '../../services/holidayService';
import { getMyLeaves } from '../../services/leaveService';
import { getMyShiftAssignments } from '../../services/shiftService';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { isDemoMode, DEMO_EMPLOYEE, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import '../../styles/shared.css';

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const EVENT_COLORS = {
 holiday: '#DC2626',
 leave: '#10B981',
 shift: '#635BFF',
 training: '#8B5CF6',
};
function parseDate(value) {
 if (!value) return undefined;
 const [year, month, day] = String(value).split('-').map(Number);
 return new Date(year, month - 1, day);
}

function toDateString(date) {
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, '0');
 const day = String(date.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
}

export default function EmpCalendar() {
  const { user } = useAuth();
  const { locale } = useTranslation();

  const MONTHS = locale === 'en' ? MONTHS_EN : MONTHS_ID;
  const EVENT_TYPE_LABELS = locale === 'en'
    ? { holiday: 'Holiday', leave: 'Leave', shift: 'Shift', training: 'Training' }
    : { holiday: 'Hari Libur', leave: 'Cuti', shift: 'Shift', training: 'Training' };
  const [_emp, setEmp] = useState(null);
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

    if (isDemoMode()) {
      setEmp({ ...DEMO_EMPLOYEE });
      setHolidays([...(DEMO_PROFILE_DATA.holidays || [])]);
      setLeaves((DEMO_PROFILE_DATA.leaves || []).filter((l) => l.status === 'approved'));
      setShifts([...(DEMO_PROFILE_DATA.shifts || [])]);
      setTrainings([]);
      setLoading(false);
      return;
    }

    const email = user?.email || user?.user_metadata?.email;
    const { data: empData } = await getEmployeeByEmail(email);
    setEmp(empData);

    const holidayPromise = empData?.company_id
      ? holidayService.getAllHolidays(year, empData.company_id)
      : holidayService.getAllHolidays(year);

    const [hRes, lRes, tRes] = await Promise.all([
      holidayPromise,
      empData ? getMyLeaves(empData.id) : Promise.resolve({ data: [] }),
      supabase.from('trainings')
        .select('*, training_participants(employee_id)')
        .order('start_date', { ascending: true }),
    ]);

    setHolidays(hRes?.data || []);
    setLeaves((lRes.data || []).filter((l) => l.status === 'approved'));

    if (empData?.id && empData?.company_id) {
      const { data: myShifts } = await getMyShiftAssignments(empData.id, empData.company_id);
      setShifts(myShifts || []);
      const myTrainings = (tRes.data || []).filter((t) =>
        (t.training_participants || []).some((p) => p.employee_id === empData.id) &&
        (t.status === 'upcoming' || t.status === 'ongoing'),
      );
      setTrainings(myTrainings);
    } else {
      setShifts([]);
      setTrainings([]);
    }
    setLoading(false);
  }, [user, year]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  const today = new Date();
 const isToday = (d) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

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
 const selectedCalendarDate = selectedDate ? new Date(year, month, selectedDate) : undefined;
 const markedDates = useMemo(() => {
  const datesByType = { holiday: [], leave: [], shift: [], training: [] };
  for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
   getDateEvents(day).forEach((event) => datesByType[event.type]?.push(new Date(year, month, day)));
  }
  return datesByType;
 }, [year, month, holidays, leaves, shifts, trainings]);
 const todayStr = today.toISOString().split('T')[0];
 const upcomingHolidays = holidays.filter(h => h.date >= todayStr).slice(0, 5);

  if (loading) {
    return (
      <div style={{ animation: "fadeInUp 0.3s ease" }}>
        <div style={{ marginBottom: 12 }}>
          <div className="skeleton skeleton-text" style={{ width: 100, height: 22, marginBottom: 8 }} />
          <div className="skeleton skeleton-text-sm" style={{ width: 200 }} />
        </div>
        <div className="emp-card" style={{ height: 340, marginBottom: 12 }}>
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
      </div>      {/* Calendar Card (Grid mode) */}
      {viewMode === 'grid' && (
      <div className="emp-card" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--primary), #4338CA)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>{MONTHS[month]} {year}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{locale === 'en' ? 'Modern Coss/shadcn calendar' : 'Kalender modern Coss/shadcn'}</div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDate(today.getDate()); }}
          >
            {locale === 'en' ? 'Today' : 'Hari Ini'}
          </Button>
        </div>
        <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
          <Calendar
            mode="single"
            selected={selectedCalendarDate}
            month={new Date(year, month, 1)}
            onMonthChange={(date) => { setYear(date.getFullYear()); setMonth(date.getMonth()); setSelectedDate(null); }}
            onSelect={(date) => {
              if (!date) return;
              setYear(date.getFullYear());
              setMonth(date.getMonth());
              setSelectedDate(date.getDate());
            }}
            showOutsideDays
            captionLayout="dropdown"
            modifiers={markedDates}
            modifiersClassNames={{
              holiday: 'text-red-600 [&>button]:after:bg-red-600',
              leave: 'text-emerald-600 [&>button]:after:bg-emerald-600',
              shift: 'text-blue-600 [&>button]:after:bg-blue-600',
              training: 'text-violet-600 [&>button]:after:bg-violet-600',
            }}
            className="w-full max-w-[430px] [--cell-size:--spacing(12)] sm:[--cell-size:--spacing(11)]"
          />
        </div>
      </div>
      )}
      {/* Agenda View */}
      {viewMode === 'agenda' && (
        <div style={{ marginBottom: 12 }}>
          {/* Month nav for agenda too */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '10px 14px', background: 'linear-gradient(135deg, var(--primary), #4338CA)', borderRadius: 'var(--radius-md)', color: '#fff' }}>
            <Button variant="secondary" size="sm" onClick={prevMonth}>‹</Button>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{MONTHS[month]} {year}</span>
            <Button variant="secondary" size="sm" onClick={nextMonth}>›</Button>
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
                  <span style={{ fontSize: 15, fontWeight: 600, color: isToday(day) ? '#fff' : 'var(--primary)' }}>{day}</span>
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
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
        <div className="emp-card" style={{ marginBottom: 12 }}>
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
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#DC2626', color: '#fff', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, lineHeight: 1.1 }}>
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



