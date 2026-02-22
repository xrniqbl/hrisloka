import { useState, useEffect } from 'react';
import { FiClock, FiLoader, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getShiftAssignments } from '../../services/shiftService';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function EmpShift() {
    const { user } = useAuth();
    const [emp, setEmp] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const email = user?.email || user?.user_metadata?.email || '';
            const { data: empData } = await getEmployeeByEmail(email);
            if (empData) {
                setEmp(empData);
                const { data: all } = await getShiftAssignments();
                const mine = (all || []).filter(a => a.employee_id === empData.id);
                setShifts(mine);
            }
            setLoading(false);
        }
        load();
    }, [user]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
                <FiLoader size={28} style={{ animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>Memuat jadwal shift...</span>
            </div>
        );
    }

    // Group shifts by day
    const shiftByDay = {};
    shifts.forEach(s => {
        const day = s.day_of_week || 0;
        shiftByDay[day] = s;
    });

    const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>📅 Jadwal Shift</h1>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Jadwal kerja Anda minggu ini</p>
            </div>

            {/* Current Shift Card */}
            {shiftByDay[todayIdx] ? (
                <div className="emp-card emp-card-gradient" style={{ marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Shift Hari Ini</div>
                    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                        {shiftByDay[todayIdx].shifts?.name || 'Shift'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, opacity: 0.9 }}>
                        <FiClock size={16} />
                        {shiftByDay[todayIdx].shifts?.start_time?.slice(0, 5)} — {shiftByDay[todayIdx].shifts?.end_time?.slice(0, 5)}
                    </div>
                </div>
            ) : (
                <div className="emp-card emp-card-gradient" style={{ marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 14, opacity: 0.8 }}>Tidak ada shift hari ini</div>
                </div>
            )}

            {/* Weekly Schedule */}
            <div style={{ display: 'grid', gap: 8 }}>
                {DAYS.map((day, idx) => {
                    const shift = shiftByDay[idx];
                    const isToday = idx === todayIdx;

                    return (
                        <div key={day} className="emp-card" style={{
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
                                    {isToday && <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>HARI INI</div>}
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
                                <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Libur</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
