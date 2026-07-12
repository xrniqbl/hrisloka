import { useState, useEffect, useRef } from 'react';
import {
  HiArrowTrendingUp,
  HiBellAlert,
  HiCalendarDays,
  HiClock,
  HiFolder,
  HiPlayCircle,
  HiSquare2Stack
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import * as projectService from '../../services/projectService';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

const fmtH = (h) => h ? `${Math.floor(h)}j ${Math.round((h % 1) * 60)}m` : '0j 0m';
const fmtTimer = (sec) => {
 const h = Math.floor(sec / 3600);
 const m = Math.floor((sec % 3600) / 60);
 const s = sec % 60;
 return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const getDeadlineInfo = (endDate, locale) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = Math.ceil((end - now) / 86400000);
  if (diffDays < 0) return { label: locale === 'en' ? `${Math.abs(diffDays)} days overdue` : `Terlambat ${Math.abs(diffDays)} hari`, color: '#DC2626', urgent: true };
  if (diffDays === 0) return { label: locale === 'en' ? 'Due Today!' : 'Tenggat Hari Ini!', color: '#F59E0B', urgent: true };
  if (diffDays <= 7) return { label: locale === 'en' ? `${diffDays} days left` : `${diffDays} hari lagi`, color: '#F59E0B', urgent: false };
  return { label: locale === 'en' ? `${diffDays} days left` : `${diffDays} hari lagi`, color: '#10B981', urgent: false };
};

// Compute progress from allocation and logged hours
const getProgress = (allocPct) => Math.min(100, Math.max(0, allocPct || 0));

export default function EmpProjects() {
  const { employee } = useAuth();
  const { locale } = useTranslation();
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
    <div className="ep-loading-wrap">
      <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)', marginBottom: 14 }} />
      <div className="stats-grid mb">
        {[1,2].map(i => <div key={i} className="emp-card"><div className="skeleton" style={{ height: 56, borderRadius: 8 }} /></div>)}
      </div>
      {[1,2,3].map(i => <div key={i} className="emp-card mb-sm" style={{ height: 80 }}><div className="skeleton" style={{ height: '100%', borderRadius: 8 }} /></div>)}
    </div>
  );

  return (
    <div className="emp-page">
      <h1 className="emp-page-title">{locale === 'en' ? 'My Projects' : 'Proyek Saya'}</h1>

      {/* Timer Section */}
      {/* background is a JS ternary — kept as inline */}
      <div className="chart-card mb" style={{ background: activeTimer ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'linear-gradient(135deg, var(--primary) 0%, #4338CA 100%)', color: '#fff' }}>
        {activeTimer ? (
          <div>
            <div className="btn-icon-row mb-sm" style={{ opacity: 0.85 }}>
              <span className="ep-pulse-dot" />
              <span className="td-sm">{locale === 'en' ? 'WORKING' : 'SEDANG BEKERJA'}</span>
            </div>
            <div className="td-sm mb-sm" style={{ opacity: 0.9 }}><HiFolder size={12} /> {activeTimer.projects?.name}</div>
            <div className="td-mono-bold" style={{ fontSize: 40, letterSpacing: 3 }}>{fmtTimer(elapsed)}</div>
            {activeTimer.description && <div className="td-sm" style={{ opacity: 0.8, marginTop: 4 }}>{activeTimer.description}</div>}
            <button onClick={handleStop} disabled={starting} className="ep-timer-btn mb">
              <HiSquare2Stack size={16} /> {starting ? (locale === 'en' ? 'Stopping...' : 'Menghentikan...') : 'Stop Timer'}
            </button>
          </div>
        ) : (
          <div>
            <div className="chart-card-title mb-sm btn-icon-row"><HiClock size={14} /> {locale === 'en' ? 'Start Working' : 'Mulai Kerja'}</div>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="ep-timer-select mb-sm"
            >
              <option value="" className="ep-option-dark">— {locale === 'en' ? 'Select Project' : 'Pilih Proyek'} —</option>
              {activeProjects.map(a => (
                <option key={a.projects?.id} value={a.projects?.id} className="ep-option-dark">
                  {a.projects?.name}{a.projects?.client ? ` (${a.projects.client})` : ''}
                </option>
              ))}
            </select>
            <input
              placeholder={locale === 'en' ? 'Task description (optional)' : 'Deskripsi tugas (opsional)'}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="ep-timer-input mb-sm"
            />
            {/* background depends on selectedProject (JS expression) — kept inline */}
            <button
              onClick={handleStart}
              disabled={!selectedProject || starting}
              className="ep-timer-start"
              style={{ background: selectedProject ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)', cursor: selectedProject ? 'pointer' : 'not-allowed' }}
            >
              <HiPlayCircle size={18} /> {starting ? (locale === 'en' ? 'Starting...' : 'Memulai...') : (locale === 'en' ? 'Start Work' : 'Mulai Kerja')}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid mb">
        <div className="emp-card ep-stat-center">
          <div className="info-card-label">{locale === 'en' ? 'This Week' : 'Minggu Ini'}</div>
          <div className="info-card-value primary">{fmtH(weeklyHours)}</div>
        </div>
        <div className="emp-card ep-stat-center">
          <div className="info-card-label">{locale === 'en' ? 'This Month' : 'Bulan Ini'}</div>
          <div className="info-card-value success">{fmtH(monthlyHours)}</div>
        </div>
      </div>

      {/* Today's Log */}
      <div className="mb">
        <div className="section-label mb-sm btn-icon-row">
          <HiCalendarDays size={14} /> {locale === 'en' ? "Today's Log" : 'Log Hari Ini'}
        </div>
        {todayLogs.length === 0 ? (
          <div className="emp-card ep-empty-center">
            <span className="td-muted-sm">{locale === 'en' ? 'No logs for today' : 'Belum ada log hari ini'}</span>
          </div>
        ) : (
          todayLogs.map(t => (
            <div className="emp-card mb-sm ep-log-row" key={t.id}>
              <div>
                <div className="td-semibold btn-icon-row" style={{ fontSize: 13 }}>
                  {/* color is a JS expression — kept inline */}
                  <span className="ep-color-dot" style={{ background: t.projects?.color || '#4F46E5' }} />
                  {t.projects?.name}
                </div>
                {t.description && <div className="td-muted-sm" style={{ marginTop: 2 }}>{t.description}</div>}
                <div className="td-muted-sm" style={{ marginTop: 2 }}>
                  {new Date(t.start_time).toLocaleTimeString(locale === 'en' ? 'en-US' : 'id-ID', { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {new Date(t.end_time).toLocaleTimeString(locale === 'en' ? 'en-US' : 'id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="td-primary-bold">{fmtH(t.hours)}</div>
            </div>
          ))
        )}
      </div>

      {/* My Projects List */}
      <div>
        <div className="section-label mb-sm btn-icon-row">
          <HiFolder size={14} /> {locale === 'en' ? `Projects (${myProjects.length})` : `Proyek (${myProjects.length})`}
        </div>
        {myProjects.length === 0 ? (
          <div className="emp-card emp-empty">
            <div className="emp-empty-title">{locale === 'en' ? 'No projects assigned yet' : 'Belum ada proyek yang di-assign'}</div>
          </div>
        ) : (
          myProjects.map(a => {
            const p = a.projects;
            if (!p) return null;
            return (
              /* borderLeft uses p.color (JS expression) — kept inline */
              <div className="emp-card emp-card-stagger mb-sm" key={a.id} style={{ borderLeft: `3px solid ${p.color || '#4F46E5'}` }}>
                <div className="ep-project-row">
                  <div className="ep-project-main">
                    <div className="td-semibold" style={{ fontSize: 14 }}>{p.name}</div>
                    {p.client && <div className="td-muted-sm">{locale === 'en' ? 'Client' : 'Klien'}: {p.client}</div>}
                    <div className="btn-icon-row ep-tags-row">
                      {/* background and color depend on p.status (JS expression) — kept inline */}
                      <span
                        className="td-sm"
                        style={{
                          padding: '2px 8px',
                          background: p.status === 'active' ? 'rgba(16,185,129,.1)' : 'rgba(107,114,128,.1)',
                          color: p.status === 'active' ? 'var(--success)' : 'var(--muted)',
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {p.status === 'active' ? (locale === 'en' ? 'Active' : 'Aktif') : p.status === 'completed' ? (locale === 'en' ? 'Completed' : 'Selesai') : (locale === 'en' ? 'On Hold' : 'Ditunda')}
                      </span>
                      <span className="ep-role-tag td-sm">
                        {a.role === 'lead' ? 'Lead' : 'Member'}  {a.allocation_pct}%
                      </span>
                    </div>
                  </div>
                  <div className="ep-project-deadline">
                    {p.end_date && (() => {
                      const di = getDeadlineInfo(p.end_date, locale);
                      return di ? (
                        <div className="btn-icon-row ep-deadline-row">
                          {/* color is di.color (JS expression) — kept inline */}
                          {di.urgent && <HiBellAlert size={12} style={{ color: di.color }} />}
                          <span className="td-semibold td-sm" style={{ color: di.color }}>{di.label}</span>
                        </div>
                      ) : null;
                    })()}
                    <div className="td-muted-sm" style={{ marginTop: 4 }}>{p.end_date}</div>
                  </div>
                </div>
                <div className="ep-alloc-block">
                  <div className="btn-icon-row ep-alloc-header">
                    <span className="td-muted-sm">{locale === 'en' ? 'Time allocation' : 'Alokasi waktu'}</span>
                    <span className="td-muted-sm">{a.allocation_pct || 0}%</span>
                  </div>
                  <div className="emp-progress-bar">
                    {/* width and background both use p.color (JS expressions) — kept inline */}
                    <div className="emp-progress-fill" style={{ width: `${getProgress(a.allocation_pct)}%`, background: `linear-gradient(90deg, ${p.color || '#4F46E5'}, ${p.color || '#635BFF'}88)` }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}
