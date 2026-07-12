import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiArrowPath,
  HiArrowRight,
  HiArrowsRightLeft,
  HiArrowTrendingUp,
  HiBell,
  HiCalendarDays,
  HiChatBubbleLeftRight,
  HiCheckCircle,
  HiChevronRight,
  HiClipboardDocumentCheck,
  HiClock,
  HiCurrencyDollar,
  HiDocumentText,
  HiMapPin,
  HiPaperAirplane,
  HiUsers
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getTodayAttendance } from '../../services/attendanceService';
import { getMyLeaves, submitLeave } from '../../services/leaveService';
import { submitTicket } from '../../services/ticketService';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import BottomSheet from '../../components/BottomSheet';
import { useRealtimeMultiple } from '../../hooks/useRealtime';
import { useToast } from '../../components/Toast';
import { SkeletonDashboard } from '../../components/SkeletonLoader';
import EmpEmptyState from '../../components/EmpEmptyState';
import { supabase } from '../../lib/supabase';
import { subscribeToPushNotifications, getPushSubscriptionStatus } from '../../lib/pushNotifications';
import { useTranslation } from '../../lib/i18n';
import { isDemoMode, DEMO_EMPLOYEE, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import '../../styles/shared.css';

ChartJS.register(ArcElement, Tooltip);

export default function EmpDashboard() {
  const { employee: currentUser } = useAuth();
  const navigate = useNavigate();
  const { user, isDemo } = useAuth();
  const toast = useToast();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [todayAtt, setTodayAtt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState('');
  const [cutiForm, setCutiForm] = useState({ type: 'Cuti Tahunan', startDate: '', endDate: '', reason: '' });
  const [helpdeskForm, setHelpdeskForm] = useState({ category: 'IT Support', subject: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [myTasks, setMyTasks] = useState([]);

  const load = useCallback(async () => {
    // Demo mode: skip Supabase, use full demo profile
    if (isDemoMode()) {
      setEmp({ ...DEMO_EMPLOYEE });
      setTodayAtt(null);
      setPendingLeaves(DEMO_PROFILE_DATA.leaves.filter((l) => l.status === 'pending'));
      // Home shows max 3 announcements — more only on /app/announcements
      setRecentAnnouncements([
        {
          id: 1,
          title: 'Selamat datang di Demo HRIS Loka!',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          title: 'Pengingat: Lengkapi Face ID untuk absensi',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 3,
          title: 'Update kebijakan cuti tahunan 2026',
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: 4,
          title: 'Jadwal payroll bulan ini',
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
      ].slice(0, 3));
      setMyTasks(DEMO_PROFILE_DATA.tasks || []);
      setLoading(false);
      return;
    }
    const email = user?.email || user?.user_metadata?.email;
    const { data } = await getEmployeeByEmail(email);
    if (data) {
      setEmp(data);
      
      // Re-subscribe push notifications if not subscribed or expired
      const pushStatus = await getPushSubscriptionStatus();
      if (pushStatus.supported && !pushStatus.subscribed) {
        console.log('[EmpDashboard] Push not subscribed, attempting to subscribe...');
        await subscribeToPushNotifications(data.id);
      }
      
      const { data: att } = await getTodayAttendance(data.id);
      setTodayAtt(att);
      const { data: leaves } = await getMyLeaves(data.id);
      const pending = (leaves || []).filter(l => l.status === 'pending');
      setPendingLeaves(pending);

      // Build My Tasks from onboarding + pending leave + profile gaps
      const tasks = [];
      try {
        const { data: onboard } = await supabase
          .from('onboarding_tasks')
          .select('id,title,status')
          .eq('employee_id', data.id)
          .neq('status', 'done')
          .order('sort_order', { ascending: true })
          .limit(5);
        (onboard || []).forEach((t) => {
          tasks.push({
            id: `ob-${t.id}`,
            title: t.title || 'Tugas onboarding',
            titleEn: t.title || 'Onboarding task',
            status: 'pending',
            path: '/app/onboarding',
            type: 'onboarding',
          });
        });
      } catch { /* table may not exist */ }

      pending.slice(0, 2).forEach((l) => {
        tasks.push({
          id: `lv-${l.id}`,
          title: `Cuti menunggu: ${l.type || 'Pengajuan'}`,
          titleEn: `Leave pending: ${l.type || 'Request'}`,
          status: 'pending',
          path: '/app/submissions',
          type: 'leave',
        });
      });

      if (!data.profile_setup_done) {
        tasks.unshift({
          id: 'profile-setup',
          title: 'Lengkapi data profil',
          titleEn: 'Complete your profile',
          status: 'pending',
          path: '/app/profile',
          type: 'profile',
        });
      }

      setMyTasks(tasks.slice(0, 5));
    }
    const compId = data?.company_id;
    // Only load 3 for home preview — full list on announcements page
    // MUST chain .eq return value (Supabase builders are immutable-style)
    if (compId) {
      const { data: ann } = await supabase
        .from('announcements')
        .select('*')
        .eq('company_id', compId)
        .order('created_at', { ascending: false })
        .limit(3);
      setRecentAnnouncements((ann || []).slice(0, 3));
    } else {
      setRecentAnnouncements([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => { setLoading(true); load(); };
    window.addEventListener('emp:refresh', handler);
    return () => window.removeEventListener('emp:refresh', handler);
  }, [load]);

  const refreshData = useCallback(async () => {
    if (!emp) return;
    const { data: att } = await getTodayAttendance(emp.id);
    setTodayAtt(att);
    const { data: newEmp } = await getEmployeeByEmail(user?.email);
    if (newEmp) setEmp(newEmp);
  }, [emp, user]);

  useRealtimeMultiple([
    { table: 'attendance', onRefresh: refreshData, companyId: emp?.company_id },
    { table: 'leave_requests', onRefresh: refreshData, filter: emp?.id ? 'employee_id=eq.' + emp.id : undefined, companyId: emp?.company_id },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="emp-page-fadein">
        <div className="skeleton skeleton-hero" />
        <div className="skeleton-grid-2 mb">
          {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-stat" />)}
        </div>
        <div className="skeleton skeleton-label mb-sm" />
        <div className="skeleton-grid-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton skeleton-action" />)}
        </div>
      </div>
    );
  }

  if (!emp) {
    return <EmpEmptyState type="noemp" subtitle={`Email: ${user?.email} - Hubungi HR untuk verifikasi akun karyawan Anda.`} />;
  }

  const leaveBalance = (emp.leave_quota || 0) - (emp.leave_used || 0);
  const clockedIn = todayAtt?.clock_in && !todayAtt?.clock_out;
  const clockedOut = todayAtt?.clock_in && todayAtt?.clock_out;

  const formatTime = (d) => d.toLocaleTimeString(locale === 'en' ? 'en-US' : 'id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const openSheet = (type) => { setSheetType(type); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setSheetType(''); };

  const handleSubmitCuti = async () => {
    if (!cutiForm.startDate || !cutiForm.endDate) return;
    if (cutiForm.endDate < cutiForm.startDate) {
      try { toast?.error?.('Tanggal selesai tidak valid'); } catch { /* */ }
      return;
    }
    setSubmitting(true);
    const days = Math.ceil((new Date(cutiForm.endDate) - new Date(cutiForm.startDate)) / 86400000) + 1;
    const { error } = await submitLeave(emp.id, {
      type: cutiForm.type,
      startDate: cutiForm.startDate,
      endDate: cutiForm.endDate,
      days,
      reason: cutiForm.reason,
    });
    setSubmitting(false);
    if (error) {
      try { toast?.error?.(error.message || 'Gagal mengajukan cuti'); } catch { /* */ }
      return;
    }
    closeSheet();
    setCutiForm({ type: 'Cuti Tahunan', startDate: '', endDate: '', reason: '' });
    try { toast?.success('Pengajuan cuti berhasil dikirim!'); } catch { /* */ }
    // Refresh pending leaves on home
    try {
      const { data: leaves } = await getMyLeaves(emp.id);
      setPendingLeaves((leaves || []).filter((l) => l.status === 'pending'));
    } catch { /* */ }
  };

  const handleSubmitHelpdesk = async () => {
    if (!helpdeskForm.subject?.trim()) return;
    setSubmitting(true);
    // ticketService accepts object with employee_id + message
    const { error } = await submitTicket({
      employee_id: emp.id,
      category: helpdeskForm.category || 'it',
      subject: helpdeskForm.subject,
      message: helpdeskForm.description || helpdeskForm.subject,
      priority: 'medium',
    });
    setSubmitting(false);
    if (error) {
      try { toast?.error?.(error.message || 'Gagal mengirim tiket'); } catch { /* */ }
      return;
    }
    closeSheet();
    setHelpdeskForm({ category: 'IT Support', subject: '', description: '' });
    try { toast?.success?.('Tiket berhasil dikirim!'); } catch { /* */ }
  };


  return (
    <div className="emp-page">

      {/* Demo Mode Banner */}
      {isDemo && (
      <div className="demo-banner-wrap">
        <span className="demo-banner-icon">🎯</span>
        <div className="demo-banner-body">
          <div className="demo-banner-title">Mode Demo - Read Only</div>
          <div className="demo-banner-desc">Fitur kirim & aksi tidak tersedia dalam mode demo.</div>
        </div>
        <a href="/checkout" className="demo-banner-cta">Berlangganan</a>
      </div>
      )}

      {/* Hero Clock Card */}
      <div className={`emp-hero-card mb ${clockedIn ? 'emp-hero-card--in' : 'emp-hero-card--out'}`}>
        {/* Decorative blobs */}
        <div className="emp-hero-blob emp-hero-blob--tr" />
        <div className="emp-hero-blob emp-hero-blob--bl" />

        <div className="emp-hero-inner">
          <div className="emp-hero-label">
            {locale === 'en' ? 'Current time' : 'Waktu sekarang'}
          </div>
          <div className="emp-hero-row">
            <div className="emp-hero-clock">
              {formatTime(currentTime)}
            </div>
            <button
              onClick={() => navigate('/app/absen')}
              className="emp-hero-btn"
            >
              <HiMapPin size={17} />
              {clockedIn ? (locale === 'en' ? 'Clock Out' : 'Absen Keluar')
                : clockedOut ? (locale === 'en' ? 'Done' : 'Selesai')
                : (locale === 'en' ? 'Clock In' : 'Absen Masuk')}
            </button>
          </div>
          <div className="emp-hero-status">
            <div className="emp-hero-dot" />
            <span className="emp-hero-status-text">
              {todayAtt?.clock_in
                ? `${locale === 'en' ? 'In' : 'Masuk'}: ${todayAtt.clock_in}${todayAtt?.clock_out ? `  ${locale === 'en' ? 'Out' : 'Keluar'}: ${todayAtt.clock_out}` : ''}`
                : (locale === 'en' ? 'Within office radius' : 'Dalam radius kantor')}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2 Stat Cards ── */}
      <div className="emp-stat-grid mb">
        {/* Leave Balance */}
        <div className="emp-card emp-card-interactive emp-card-padded" onClick={() => navigate('/app/leave-balance')}>
          <div className="emp-card-header-row">
            <div className="emp-icon-box emp-icon-box--primary">
              <HiCalendarDays size={22} />
            </div>
            <HiChevronRight size={15} className="emp-chevron" />
          </div>
          <div className="info-card-label">
            {locale === 'en' ? 'Annual Leave Left' : 'Sisa Cuti Tahunan'}
          </div>
          <div className="info-card-value">
            {leaveBalance} <span className="emp-value-unit">{locale === 'en' ? 'Days' : 'Hari'}</span>
          </div>
          <div className="td-muted-sm">
            {locale === 'en' ? `Available ${new Date().getFullYear()}` : `Tersedia tahun ${new Date().getFullYear()}`}
          </div>
        </div>

        {/* Attendance Status */}
        <div className="emp-card emp-card-interactive emp-card-padded" onClick={() => navigate('/app/absen')}>
          <div className="emp-card-header-row">
            <div className={`emp-icon-box ${clockedIn ? 'emp-icon-box--success' : 'emp-icon-box--primary'}`}>
              <HiClock size={22} />
            </div>
            <HiChevronRight size={15} className="emp-chevron" />
          </div>
          <div className="info-card-label">
            {locale === 'en' ? 'Attendance Status' : 'Status Absensi'}
          </div>
          <div className="emp-att-status">
            {clockedIn ? (locale === 'en' ? 'Working' : 'Hadir') : clockedOut ? (locale === 'en' ? 'Done' : 'Selesai') : (locale === 'en' ? 'Not Clocked In' : 'Belum Absen')}
          </div>
          <div className="td-muted-sm">
            {emp.status === 'permanent' ? (locale === 'en' ? 'Permanent' : 'Tetap') : (locale === 'en' ? 'Contract' : 'Kontrak')}  {emp.division || ''}
          </div>
        </div>
      </div>

      {/* ── Layanan Utama ── */}
      <div className="page-header-actions mb-sm">
        <div className="section-label">
          {locale === 'en' ? 'Main Services' : 'Layanan Utama'}
        </div>
        <button onClick={() => navigate('/app/submissions')} className="btn-link-primary">
          {locale === 'en' ? 'See All' : 'Lihat Semua'}
        </button>
      </div>
      <div className="emp-actions-grid mb">
        {[
          { labelId: 'Payslip', labelEn: 'Payslip', icon: <HiDocumentText size={20} />, cls: 'emp-action-icon--green', onClick: () => navigate('/app/payslip') },
          { labelId: 'Klaim', labelEn: 'Claim', icon: <HiCurrencyDollar size={20} />, cls: 'emp-action-icon--indigo', onClick: () => navigate('/app/reimbursement') },
          { labelId: 'Cuti', labelEn: 'Leave', icon: <HiCalendarDays size={20} />, cls: 'emp-action-icon--amber', onClick: () => openSheet('cuti') },
          { labelId: 'KPI', labelEn: 'KPI', icon: <HiArrowTrendingUp size={20} />, cls: 'emp-action-icon--purple', onClick: () => navigate('/app/kpi') },
          { labelId: 'Helpdesk', labelEn: 'Helpdesk', icon: <HiChatBubbleLeftRight size={20} />, cls: 'emp-action-icon--sky', onClick: () => openSheet('helpdesk') },
          { labelId: 'Direktori', labelEn: 'Directory', icon: <HiUsers size={20} />, cls: 'emp-action-icon--orange', onClick: () => navigate('/app/directory') },
        ].map((a, idx) => (
          <button key={a.labelId} onClick={a.onClick} className="emp-action-btn" style={{ animationDelay: `${0.04 + idx * 0.05}s` }}>
            <div className={`emp-action-icon ${a.cls}`}>
              {a.icon}
            </div>
            <span className="emp-action-label">
              {locale === 'en' ? a.labelEn : a.labelId}
            </span>
          </button>
        ))}
      </div>

      {/* ── Pengumuman: max 3 di home — “Lihat Semua” ke halaman penuh ── */}
      <div className="mb">
        <div className="page-header-actions mb-sm">
          <div className="section-label">
            {locale === 'en' ? 'Announcements' : 'Pengumuman'}
          </div>
          <button type="button" onClick={() => navigate('/app/announcements')} className="btn-link-primary btn-icon-row">
            {locale === 'en' ? 'See All' : 'Lihat Semua'} <HiChevronRight size={12} />
          </button>
        </div>
        {recentAnnouncements.length > 0 ? (
          <div className="emp-list-grid">
            {recentAnnouncements.slice(0, 3).map((a, i) => {
              const isNew = (Date.now() - new Date(a.created_at).getTime()) < 7 * 24 * 3600 * 1000;
              return (
                <div
                  key={a.id || i}
                  className="emp-card emp-card-interactive emp-ann-row"
                  onClick={() => navigate('/app/announcements')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/app/announcements')}
                >
                  <div className="emp-ann-row-icon">
                    <HiBell size={20} />
                  </div>
                  <div className="emp-ann-row-body">
                    <div className="emp-ann-row-title-row">
                      {isNew && <span className="badge badge-primary badge-xs">{locale === 'en' ? 'New' : 'Baru'}</span>}
                      <div className="td-semibold td-truncate">{a.title}</div>
                    </div>
                    <div className="td-muted-sm">
                      {new Date(a.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </div>
                  </div>
                  <HiChevronRight size={16} className="emp-chevron" />
                </div>
              );
            })}
          </div>
        ) : (
          <EmpEmptyState
            type="nodata"
            title={locale === 'en' ? 'No announcements yet' : 'Belum ada pengumuman'}
            subtitle={locale === 'en' ? 'Company news from HR will show here.' : 'Pengumuman dari HR akan muncul di sini.'}
            cta={locale === 'en' ? 'View all' : 'Lihat semua'}
            ctaHref="/app/announcements"
          />
        )}
      </div>

      {/* ── My Tasks (di bawah pengumuman) ── */}
      <div className="mb">
        <div className="page-header-actions mb-sm">
          <div className="section-label">
            {locale === 'en' ? 'My Tasks' : 'Tugas Saya'}
            {myTasks.length > 0 && (
              <span className="badge badge-primary badge-xs" style={{ marginLeft: 8 }}>
                {myTasks.length}
              </span>
            )}
          </div>
          <button type="button" onClick={() => navigate('/app/onboarding')} className="btn-link-primary btn-icon-row">
            {locale === 'en' ? 'See All' : 'Lihat Semua'} <HiChevronRight size={12} />
          </button>
        </div>
        {myTasks.length > 0 ? (
          <div className="emp-list-grid">
            {myTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="emp-card emp-card-interactive emp-task-row"
                onClick={() => navigate(task.path || '/app/onboarding')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(task.path || '/app/onboarding')}
              >
                <div className="emp-task-row-icon">
                  <HiClipboardDocumentCheck size={20} />
                </div>
                <div className="emp-task-row-body">
                  <div className="td-semibold td-truncate">
                    {locale === 'en' ? (task.titleEn || task.title) : task.title}
                  </div>
                  <div className="td-muted-sm">
                    {task.status === 'done'
                      ? (locale === 'en' ? 'Done' : 'Selesai')
                      : (locale === 'en' ? 'To do' : 'Perlu dikerjakan')}
                  </div>
                </div>
                {task.status === 'done' ? (
                  <HiCheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
                ) : (
                  <HiChevronRight size={16} className="emp-chevron" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmpEmptyState
            type="success"
            title={locale === 'en' ? "You're all caught up" : 'Semua tugas selesai'}
            subtitle={locale === 'en' ? 'No pending tasks right now.' : 'Tidak ada tugas yang menunggu.'}
            cta={locale === 'en' ? 'Open submissions' : 'Buka pengajuan'}
            ctaHref="/app/submissions"
            secondaryCta={locale === 'en' ? 'Onboarding' : 'Onboarding'}
            secondaryHref="/app/onboarding"
          />
        )}
      </div>

      {/* -- Pending leave (compact) -- */}
      {pendingLeaves.length > 0 && (
        <div className="mb">
          <div className="page-header-actions mb-sm">
            <div className="section-label">
              {locale === 'en' ? `Pending leave (${pendingLeaves.length})` : `Cuti menunggu (${pendingLeaves.length})`}
            </div>
            <button type="button" onClick={() => navigate('/app/submissions')} className="btn-link-primary btn-icon-row">
              {locale === 'en' ? 'See all' : 'Lihat semua'} <HiChevronRight size={12} />
            </button>
          </div>
          <div className="emp-list-grid">
            {pendingLeaves.slice(0, 2).map((l) => (
              <div key={l.id} className="emp-card emp-card-padded emp-pending-row">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="td-semibold td-truncate">{l.type}</div>
                  <div className="td-muted-sm">
                    {l.start_date} - {l.end_date} · {l.days} {locale === 'en' ? 'days' : 'hari'}
                  </div>
                </div>
                <span className="badge badge-warning">
                  {locale === 'en' ? 'Pending' : 'Menunggu'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Leave Bottom Sheet ── */}
      <BottomSheet open={sheetOpen && sheetType === 'cuti'} onClose={closeSheet}
        title={locale === 'en' ? 'Apply for Leave' : 'Ajukan Cuti'}
        footer={<><button className="btn-secondary" onClick={closeSheet}>{locale === 'en' ? 'Cancel' : 'Batal'}</button><button className="btn-primary" onClick={handleSubmitCuti} disabled={submitting}>{submitting ? '...' : <><HiPaperAirplane className="btn-icon-left" />{locale === 'en' ? 'Submit' : 'Kirim'}</>}</button></>}>
        <div className="emp-form-grid">
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Leave Type' : 'Jenis Cuti'}</label>
            <select value={cutiForm.type} onChange={e => setCutiForm({ ...cutiForm, type: e.target.value })} className="emp-field-input">
              <option>{locale === 'en' ? 'Annual Leave' : 'Cuti Tahunan'}</option>
              <option>{locale === 'en' ? 'Sick Leave' : 'Sakit'}</option>
              <option>{locale === 'en' ? 'Permission' : 'Izin'}</option>
            </select>
          </div>
          <div className="emp-form-date-row">
            <div>
              <label className="emp-field-label">{locale === 'en' ? 'From' : 'Dari'}</label>
              <input type="date" value={cutiForm.startDate} onChange={e => setCutiForm({ ...cutiForm, startDate: e.target.value })} className="emp-field-input" />
            </div>
            <div>
              <label className="emp-field-label">{locale === 'en' ? 'Until' : 'Sampai'}</label>
              <input type="date" value={cutiForm.endDate} onChange={e => setCutiForm({ ...cutiForm, endDate: e.target.value })} className="emp-field-input" />
            </div>
          </div>
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Reason' : 'Alasan'}</label>
            <textarea placeholder={locale === 'en' ? 'Reason for leave...' : 'Alasan cuti...'} value={cutiForm.reason} onChange={e => setCutiForm({ ...cutiForm, reason: e.target.value })} className="emp-field-textarea" />
          </div>
        </div>
      </BottomSheet>

      {/* ── Helpdesk Bottom Sheet ── */}
      <BottomSheet open={sheetOpen && sheetType === 'helpdesk'} onClose={closeSheet}
        title={locale === 'en' ? 'Helpdesk Ticket' : 'Tiket Helpdesk'}
        footer={<><button className="btn-secondary" onClick={closeSheet}>{locale === 'en' ? 'Cancel' : 'Batal'}</button><button className="btn-primary" onClick={handleSubmitHelpdesk} disabled={submitting}>{submitting ? '...' : <><HiPaperAirplane className="btn-icon-left" />{locale === 'en' ? 'Submit' : 'Kirim'}</>}</button></>}>
        <div className="emp-form-grid">
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Category' : 'Kategori'}</label>
            <select value={helpdeskForm.category} onChange={e => setHelpdeskForm({ ...helpdeskForm, category: e.target.value })} className="emp-field-input">
              <option>IT Support</option><option>HR</option><option>{locale === 'en' ? 'Facilities' : 'Fasilitas'}</option><option>{locale === 'en' ? 'Other' : 'Lainnya'}</option>
            </select>
          </div>
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Subject' : 'Judul'}</label>
            <input type="text" placeholder={locale === 'en' ? 'Issue title...' : 'Judul masalah...'} value={helpdeskForm.subject} onChange={e => setHelpdeskForm({ ...helpdeskForm, subject: e.target.value })} className="emp-field-input" />
          </div>
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Description' : 'Deskripsi'}</label>
            <textarea placeholder={locale === 'en' ? 'Describe the issue...' : 'Jelaskan masalahnya...'} value={helpdeskForm.description} onChange={e => setHelpdeskForm({ ...helpdeskForm, description: e.target.value })} className="emp-field-textarea" />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

