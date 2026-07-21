import { useState, useEffect, useMemo, useCallback } from 'react';
import { FiCalendar, FiStar } from 'react-icons/fi';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import * as holidayService from '../services/holidayService';
import { useAuth } from '../context/AuthContext';
import * as leaveService from '../services/leaveService';

import '../styles/shared.css';
import '../styles/admin.css';
import EmptyState from '../components/EmptyState';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function toDateString(date) {
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, '0');
 const day = String(date.getDate()).padStart(2, '0');
 return `${year}-${month}-${day}`;
}

function parseDate(value) {
 if (!value) return undefined;
 const [year, month, day] = value.split('-').map(Number);
 return new Date(year, month - 1, day);
}

export default function CalendarView() {
 const { employee } = useAuth();
 const today = new Date();
 const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
 const [holidays, setHolidays] = useState([]);
 const [leaves, setLeaves] = useState([]);
 const [selectedDate, setSelectedDate] = useState(today);

 const year = visibleMonth.getFullYear();
 const month = visibleMonth.getMonth();

 const fetchData = useCallback(async () => {
  const companyId = employee?.company_id;
  if (!companyId) {
   setHolidays([]);
   setLeaves([]);
   return;
  }
  const [hRes, lRes] = await Promise.all([
   holidayService.getAllHolidays(year, companyId),
   leaveService.getAllLeaves(undefined, companyId),
  ]);
  setHolidays(hRes.data || []);
  setLeaves((lRes.data || []).filter(l => l.status === 'approved'));
 }, [employee?.company_id, year]);

 useEffect(() => { fetchData(); }, [fetchData]);

 const getDateEvents = (date) => {
  if (!date) return [];
  const ds = toDateString(date);
  const events = [];
  holidays.filter(h => h.date === ds).forEach(h => events.push({ type: 'holiday', label: h.name, color: '#DC2626' }));
  leaves.filter(l => l.start_date <= ds && l.end_date >= ds).forEach(l => events.push({ type: 'leave', label: `${l.employees?.name || '?'} - ${l.type}`, color: '#635BFF' }));
  return events;
 };

 const selectedEvents = getDateEvents(selectedDate);
 const holidayDates = useMemo(() => holidays.map(h => parseDate(h.date)).filter(Boolean), [holidays]);
 const leaveDates = useMemo(() => {
  const dates = [];
  leaves.forEach((leave) => {
   const start = parseDate(leave.start_date);
   const end = parseDate(leave.end_date || leave.start_date);
   if (!start || !end) return;
   for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(new Date(date));
   }
  });
  return dates;
 }, [leaves]);
 const upcomingHolidays = holidays.filter(h => h.date >= toDateString(today)).slice(0, 5);

 return (
  <div className="admin-page cal-page">
   <div className="page-header">
    <div>
     <h1>Kalender</h1>
     <p className="page-header-subtitle td-muted-sm">Libur perusahaan & cuti disetujui</p>
    </div>
   </div>

   <div className="cal-layout">
    <div className="chart-card cal-main-card">
     <div className="chart-card-header cal-main-header">
      <div>
       <div className="chart-card-title">{MONTHS[month]} {year}</div>
       <div className="td-muted-sm">Klik tanggal untuk melihat detail</div>
      </div>
      <Button variant="outline" size="sm" onClick={() => { setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today); }}>
       Hari Ini
      </Button>
     </div>

     <div className="cal-calendar-wrap">
      <Calendar
       mode="single"
       selected={selectedDate}
       month={visibleMonth}
       onMonthChange={setVisibleMonth}
       onSelect={(date) => date && setSelectedDate(date)}
       showOutsideDays
       captionLayout="dropdown"
       modifiers={{ holiday: holidayDates, leave: leaveDates }}
       modifiersClassNames={{
        holiday: 'text-red-600 [&>button]:after:bg-red-600',
        leave: 'text-blue-600 [&>button]:after:bg-blue-600',
       }}
       className="w-full max-w-[620px] [--cell-size:--spacing(16)] sm:[--cell-size:--spacing(14)]"
      />
     </div>
    </div>

    <div className="cal-side">
     <div className="chart-card">
      <div className="chart-card-title mb-sm">
       {selectedDate ? selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Pilih tanggal'}
      </div>
      {selectedEvents.length === 0 ? (
       <EmptyState title="Tidak ada event" description="Pilih tanggal lain atau tambah hari libur." ctaLabel="Kelola libur" onCta={() => { window.location.href = '/holidays'; }} size="sm" />
      ) : selectedEvents.map((ev, i) => (
       <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < selectedEvents.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
        <div className="td-muted-sm">{ev.label}</div>
       </div>
      ))}
     </div>

     <div className="chart-card">
      <div className="chart-card-header" style={{ color: '#DC2626' }}>
       <FiStar className="icon-mr" /> <span className="chart-card-title">Hari Libur Mendatang</span>
      </div>
      {upcomingHolidays.map(h => (
       <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
        <span className="td-semibold">{h.name}</span>
        <span className="td-muted-sm">{new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
       </div>
      ))}
      {upcomingHolidays.length === 0 && (
        <EmptyState
          title="Tidak ada libur mendatang"
          description="Tambah hari libur di menu Holidays."
          ctaLabel="Kelola libur"
          onCta={() => { window.location.href = '/holidays'; }}
          size="sm"
        />
      )}
     </div>

     <div className="chart-card">
      <div className="chart-card-title mb-sm">Legenda</div>
      {[
       { color: '#DC2626', label: 'Hari Libur' },
       { color: '#635BFF', label: 'Cuti Karyawan' },
       { color: 'var(--primary)', label: 'Tanggal Dipilih' },
      ].map(l => (
       <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
        {l.label}
       </div>
      ))}
     </div>
    </div>
   </div>
  </div>
 );
}
