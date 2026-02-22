import { useState, useEffect, useRef } from 'react';
import { FiPlay, FiSquare, FiClock, FiFolder, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import * as projectService from '../../services/projectService';
import '../../styles/shared.css';

const fmtH = (h) => h ? `${Math.floor(h)}j ${Math.round((h % 1) * 60)}m` : '0j 0m';
const fmtTimer = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function EmpProjects() {
    const { employee } = useAuth();
    const [myProjects, setMyProjects] = useState([]);
    const [activeTimer, setActiveTimer] = useState(null);
    const [todayLogs, setTodayLogs] = useState([]);
    const [weeklyHours, setWeeklyHours] = useState(0);
    const [monthlyHours, setMonthlyHours] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState('');
    const [description, setDescription] = useState('');
    const [elapsed, setElapsed] = useState(0);
    const [starting, setStarting] = useState(false);
    const intervalRef = useRef(null);

    const empId = employee?.id;
    const today = new Date().toISOString().split('T')[0];

    const getWeekStart = () => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay());
        return d.toISOString().split('T')[0];
    };
    const getMonthStart = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    };

    const fetchData = async () => {
        if (!empId) return;
        setLoading(true);
        const [proj, timer, todayTs, weekTs, monthTs] = await Promise.all([
            projectService.getEmployeeProjects(empId),
            projectService.getActiveTimer(empId),
            projectService.getMyTimesheets(empId, today, today),
            projectService.getMyTimesheets(empId, getWeekStart(), today),
            projectService.getMyTimesheets(empId, getMonthStart(), today),
        ]);
        setMyProjects(proj.data || []);
        setActiveTimer(timer.data || null);
        setTodayLogs((todayTs.data || []).filter(t => t.end_time));
        setWeeklyHours((weekTs.data || []).reduce((s, t) => s + (t.hours || 0), 0));
        setMonthlyHours((monthTs.data || []).reduce((s, t) => s + (t.hours || 0), 0));
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [empId]);

    // Live timer
    useEffect(() => {
        if (activeTimer?.start_time) {
            const calcElapsed = () => Math.floor((Date.now() - new Date(activeTimer.start_time).getTime()) / 1000);
            setElapsed(calcElapsed());
            intervalRef.current = setInterval(() => setElapsed(calcElapsed()), 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(intervalRef.current);
    }, [activeTimer]);

    const handleStart = async () => {
        if (!selectedProject || !empId) return;
        setStarting(true);
        await projectService.startTimer(empId, selectedProject, description);
        setDescription('');
        setSelectedProject('');
        setStarting(false);
        fetchData();
    };

    const handleStop = async () => {
        if (!activeTimer) return;
        setStarting(true);
        await projectService.stopTimer(activeTimer.id);
        setStarting(false);
        fetchData();
    };

    const activeProjects = myProjects.filter(a => a.projects?.status === 'active');

    if (loading) return (
        <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <div><FiClock className="spin" size={24} style={{ marginBottom: 8 }} /><br />Memuat proyek...</div>
        </div>
    );

    return (
        <div style={{ padding: '16px 16px 100px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Proyek Saya</h2>

            {/* ═══ Timer Section ═══ */}
            <div style={{
                background: activeTimer
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, var(--primary) 0%, #1D4ED8 100%)',
                borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20, color: '#fff',
            }}>
                {activeTimer ? (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, opacity: 0.85, fontSize: 12 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
                            SEDANG BEKERJA
                        </div>
                        <div style={{ fontSize: 13, marginBottom: 4, opacity: 0.9 }}>
                            <FiFolder size={12} /> {activeTimer.projects?.name}
                        </div>
                        <div style={{ fontSize: 40, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 3 }}>
                            {fmtTimer(elapsed)}
                        </div>
                        {activeTimer.description && (
                            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{activeTimer.description}</div>
                        )}
                        <button
                            onClick={handleStop}
                            disabled={starting}
                            style={{
                                marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px',
                                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.4)',
                                color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                            }}
                        >
                            <FiSquare size={16} /> {starting ? 'Menghentikan...' : 'Stop Timer'}
                        </button>
                    </div>
                ) : (
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⏱ Mulai Kerja</div>
                        <select
                            value={selectedProject}
                            onChange={e => setSelectedProject(e.target.value)}
                            style={{
                                width: '100%', padding: 12, borderRadius: 'var(--radius-md)',
                                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                                color: '#fff', fontSize: 13, marginBottom: 10, appearance: 'auto',
                            }}
                        >
                            <option value="" style={{ color: '#333' }}>— Pilih Proyek —</option>
                            {activeProjects.map(a => (
                                <option key={a.projects?.id} value={a.projects?.id} style={{ color: '#333' }}>
                                    {a.projects?.name}{a.projects?.client ? ` (${a.projects.client})` : ''}
                                </option>
                            ))}
                        </select>
                        <input
                            placeholder="Deskripsi tugas (opsional)"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            style={{
                                width: '100%', padding: 12, borderRadius: 'var(--radius-md)',
                                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                                color: '#fff', fontSize: 13, marginBottom: 12,
                            }}
                        />
                        <button
                            onClick={handleStart}
                            disabled={!selectedProject || starting}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
                                padding: '14px 0', background: selectedProject ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-md)',
                                color: '#fff', fontWeight: 700, fontSize: 15, cursor: selectedProject ? 'pointer' : 'not-allowed',
                            }}
                        >
                            <FiPlay size={18} /> {starting ? 'Memulai...' : 'Start Work'}
                        </button>
                    </div>
                )}
            </div>

            {/* ═══ Stats ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div className="emp-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Minggu Ini</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{fmtH(weeklyHours)}</div>
                </div>
                <div className="emp-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Bulan Ini</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{fmtH(monthlyHours)}</div>
                </div>
            </div>

            {/* ═══ Today's Log ═══ */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiCalendar size={14} /> Log Hari Ini
                </div>
                {todayLogs.length === 0 ? (
                    <div className="emp-card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 20, fontSize: 13 }}>Belum ada log hari ini</div>
                ) : (
                    todayLogs.map(t => (
                        <div className="emp-card" key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.projects?.color || '#2563EB' }} />
                                    {t.projects?.name}
                                </div>
                                {t.description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.description}</div>}
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                    {new Date(t.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    {' — '}
                                    {new Date(t.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>{fmtH(t.hours)}</div>
                        </div>
                    ))
                )}
            </div>

            {/* ═══ My Projects List ═══ */}
            <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiFolder size={14} /> Proyek ({myProjects.length})
                </div>
                {myProjects.length === 0 ? (
                    <div className="emp-card" style={{ textAlign: 'center', padding: 28 }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada proyek yang di-assign</div>
                    </div>
                ) : (
                    myProjects.map(a => {
                        const p = a.projects;
                        if (!p) return null;
                        return (
                            <div className="emp-card" key={a.id} style={{ marginBottom: 8, borderLeft: `3px solid ${p.color || '#2563EB'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                                        {p.client && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Klien: {p.client}</div>}
                                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 10, padding: '2px 8px', background: p.status === 'active' ? 'rgba(16,185,129,.1)' : 'rgba(107,114,128,.1)', color: p.status === 'active' ? 'var(--success)' : 'var(--muted)', borderRadius: 4, fontWeight: 600 }}>
                                                {p.status === 'active' ? 'Aktif' : p.status === 'completed' ? 'Selesai' : 'Ditunda'}
                                            </span>
                                            <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(59,130,246,.08)', color: 'var(--primary)', borderRadius: 4 }}>
                                                {a.role === 'lead' ? '★ Lead' : 'Member'} • {a.allocation_pct}%
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {p.start_date}
                                        {p.end_date && <><br />{p.end_date}</>}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pulse animation style */}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        </div>
    );
}
