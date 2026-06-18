import { useState, useEffect, useCallback } from 'react';
import {
  HiCalendarDays,
  HiChevronLeft,
  HiChevronRight,
  HiClock
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getShiftAssignments } from '../../services/shiftService';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

const DAYS_ID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function EmpShift() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const DAYS = locale === 'en' ? DAYS_EN : DAYS_ID;

  const getWeekStart = (offset = 0) => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff + offset * 7);
    return new Date(d.setHours(0, 0, 0, 0));
  };

  const weekStart = getWeekStart(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const fmtWeek = (d) => d.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short' });

  const weekLabel = () => {
    if (weekOffset === 0) return locale === 'en' ? 'This Week' : 'Minggu Ini';
    if (weekOffset === -1) return locale === 'en' ? 'Last Week' : 'Minggu Lalu';
    if (weekOffset === 1) return locale === 'en' ? 'Next Week' : 'Minggu Depan';
    return `${weekOffset > 0 ? '+' : ''}${weekOffset} ${locale === 'en' ? 'Weeks' : 'Minggu'}`;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const email = user?.email || user?.user_metadata?.email || '';
    const { data: empData } = await getEmployeeByEmail(email);
    if (empData) {
      setEmp(empData);
      const { data: all } = await getShiftAssignments();
      const mine = (all || []).filter(a => a.employee_id === empData.id);
      setShifts(mine);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  if (loading) return (
    <div style={{ animation: "fadeInUp 0.3s ease" }}>
      <div style={{ marginBottom: 16 }}>
        <div className="skeleton skeleton-text" style={{ width: 130, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 200 }} />
      </div>
      <div className="skeleton" style={{ height: 56, borderRadius: 'var(--radius-md)', marginBottom: 16 }} />
      <div className="emp-card emp-card-gradient" style={{ marginBottom: 16, height: 90 }}>
        <div className="skeleton" style={{ height: '100%', borderRadius: 12, opacity: 0.3 }} />
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {[1,2,3,4,5,6,7].map(i => (
          <div key={i} className="skeleton" style={{ height: 62, borderRadius: 'var(--radius-sm)' }} />
        ))}
      </div>
    </div>
  );

  const shiftByDay = {};
  shifts.forEach(s => { shiftByDay[s.day_of_week || 0] = s; });
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div className="emp-page">
      <div style={{ marginBottom: 16 }}>
        <h1 className="emp-page-title">
          {locale === 'en' ? 'Work Schedule' : 'Jadwal Shift'}
        </h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'Your work shift and attendance schedule' : 'Jadwal kerja dan absensi Anda'}
        </p>
      </div>

      {/* Week Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <HiChevronLeft size={18} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{weekLabel()}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtWeek(weekStart)} - {fmtWeek(weekEnd)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
              {locale === 'en' ? 'Today' : 'Hari Ini'}
            </button>
          )}
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <HiChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Today's Shift Card */}
      <div className="emp-card emp-card-gradient" style={{ marginBottom: 16, textAlign: 'center', padding: '20px' }}>
        {shiftByDay[todayIdx] ? (
          <>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
              {locale === 'en' ? "Today's Shift" : 'Shift Hari Ini'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
              {shiftByDay[todayIdx].shifts?.name || 'Shift'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, opacity: 0.9 }}>
              <HiClock size={16} />
              {shiftByDay[todayIdx].shifts?.start_time?.slice(0, 5)} — {shiftByDay[todayIdx].shifts?.end_time?.slice(0, 5)}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            {locale === 'en' ? 'No shift today' : 'Tidak ada shift hari ini'}
          </div>
        )}
      </div>

      {/* Weekly Schedule */}
      <div style={{ display: 'grid', gap: 8 }}>
        {DAYS.map((day, idx) => {
          const shift = shiftByDay[idx];
          const isToday = idx === todayIdx;
          return (
            <div key={day} className={`emp-card emp-card-stagger`} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px',
              border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: isToday ? 'rgba(37,99,235,0.04)' : 'var(--surface)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: isToday ? 'var(--primary)' : 'var(--surface)',
                  border: isToday ? 'none' : '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 12,
                  color: isToday ? '#fff' : 'var(--muted)',
                }}>
                  {day.slice(0, 3)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: isToday ? 700 : 500 }}>{day}</div>
                  {isToday && <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>
                    {locale === 'en' ? 'TODAY' : 'HARI INI'}
                  </div>}
                </div>
              </div>

              {shift ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: shift.shifts?.color || 'var(--primary)' }}>
                    {shift.shifts?.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {shift.shifts?.start_time?.slice(0, 5)} — {shift.shifts?.end_time?.slice(0, 5)}
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                  {locale === 'en' ? 'Day off' : 'Libur'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
