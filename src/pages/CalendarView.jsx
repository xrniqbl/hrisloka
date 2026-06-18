import { useState, useEffect, useMemo } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiStar, FiClock, FiSun, FiUsers } from 'react-icons/fi';
import * as holidayService from '../services/holidayService';
import { useAuth } from '../context/AuthContext';
import * as leaveService from '../services/leaveService';

import * as shiftService from '../services/shiftService';

import '../styles/shared.css';
import '../styles/admin.css';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function CalendarView() {
  const { employee } = useAuth();
 const [year, setYear] = useState(new Date().getFullYear());
 const [month, setMonth] = useState(new Date().getMonth());
 const [holidays, setHolidays] = useState([]);
 const [leaves, setLeaves] = useState([]);
 const [selectedDate, setSelectedDate] = useState(null);

 useEffect(() => { fetchData(); }, [year]);

 const fetchData = async () => {
 const [hRes, lRes] = await Promise.all([
 holidayService.getAllHolidays(year),
 leaveService.getAllLeaves(undefined, employee?.company_id),
 ]);
 setHolidays(hRes.data || []);
 setLeaves((lRes.data || []).filter(l => l.status === 'approved'));
 };

 const daysInMonth = new Date(year, month + 1, 0).getDate();
 const firstDay = new Date(year, month, 1).getDay();
 const today = new Date();
 const isToday = (d) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

 const calendarDays = useMemo(() => {
 const days = [];
 for (let i = 0; i < firstDay; i++) days.push(null);
 for (let d = 1; d <= daysInMonth; d++) days.push(d);
 return days;
 }, [year, month, daysInMonth, firstDay]);

 const getDateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

 const getDateEvents = (d) => {
 if (!d) return [];
 const ds = getDateStr(d);
 const events = [];
 holidays.filter(h => h.date === ds).forEach(h => events.push({ type: 'holiday', label: h.name, color: '#DC2626' }));
 leaves.filter(l => l.start_date <= ds && l.end_date >= ds).forEach(l => events.push({ type: 'leave', label: `${l.employees?.name || '?'} - ${l.type}`, color: '#3B82F6' }));
 return events;
 };

 const selectedEvents = selectedDate ? getDateEvents(selectedDate) : [];

 const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
 const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

 return (
 <div>
 <div className="page-header">
 <h1><FiCalendar style={{ marginRight: 10 }} /> Kalender</h1>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
 {/* Calendar Grid */}
 <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
 {/* Month Navigation */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
 <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 18, padding: 4 }}><FiChevronLeft /></button>
 <div style={{ fontWeight: 800, fontSize: 18 }}>{MONTHS[month]} {year}</div>
 <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 18, padding: 4 }}><FiChevronRight /></button>
 </div>

 {/* Day Headers */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
 {DAYS.map(d => (
 <div key={d} style={{ textAlign: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, color: d === 'Min' ? '#DC2626' : 'var(--muted)' }}>{d}</div>
 ))}
 </div>

 {/* Days Grid */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
 {calendarDays.map((d, i) => {
 const events = d ? getDateEvents(d) : [];
 const isSunday = i % 7 === 0;
 const hasHoliday = events.some(e => e.type === 'holiday');
 return (
 <div
 key={i}
 onClick={() => d && setSelectedDate(d)}
 style={{
 minHeight: 72, padding: '6px 8px', borderBottom: '1px solid var(--border-light)',
 borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border-light)' : 'none',
 cursor: d ? 'pointer' : 'default',
 background: selectedDate === d ? 'var(--primary-light)' : hasHoliday ? 'rgba(220,38,38,0.04)' : 'transparent',
 transition: 'background 0.15s',
 }}
 >
 {d && (
 <>
 <div style={{
 fontSize: 13, fontWeight: isToday(d) ? 800 : 500,
 color: isToday(d) ? '#fff' : isSunday || hasHoliday ? '#DC2626' : 'var(--text)',
 background: isToday(d) ? 'var(--primary)' : 'transparent',
 width: 26, height: 26, borderRadius: '50%',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 }}>
 {d}
 </div>
 {events.slice(0, 2).map((ev, j) => (
 <div key={j} style={{
 fontSize: 9, fontWeight: 600, padding: '1px 4px', borderRadius: 3,
 background: `${ev.color}15`, color: ev.color, marginTop: 2,
 overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
 }}>
 {ev.label}
 </div>
 ))}
 {events.length > 2 && <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>+{events.length - 2} lagi</div>}
 </>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Sidebar */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
 {/* Selected Date Events */}
 <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 16 }}>
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
 {selectedDate ? `${selectedDate} ${MONTHS[month]} ${year}` : 'Pilih tanggal'}
 </div>
 {selectedEvents.length === 0 ? (
 <div style={{ fontSize: 13, color: 'var(--muted)' }}>{selectedDate ? 'Tidak ada event.' : 'Klik tanggal di kalender untuk melihat detail.'}</div>
 ) : selectedEvents.map((ev, i) => (
 <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < selectedEvents.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
 <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
 <div style={{ fontSize: 13 }}>{ev.label}</div>
 </div>
 ))}
 </div>

 {/* Upcoming Holidays */}
 <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 16 }}>
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626' }}>
 <FiStar /> Hari Libur Mendatang
 </div>
 {holidays.filter(h => h.date >= today.toISOString().split('T')[0]).slice(0, 5).map(h => (
 <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
 <span style={{ fontWeight: 600 }}>{h.name}</span>
 <span style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
 </div>
 ))}
 {holidays.filter(h => h.date >= today.toISOString().split('T')[0]).length === 0 && (
 <div style={{ fontSize: 13, color: 'var(--muted)' }}>Tidak ada hari libur mendatang.</div>
 )}
 </div>

 {/* Legend */}
 <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 16 }}>
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Legenda</div>
 {[
 { color: '#DC2626', label: 'Hari Libur' },
 { color: '#3B82F6', label: 'Cuti Karyawan' },
 { color: 'var(--primary)', label: 'Hari Ini' },
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
