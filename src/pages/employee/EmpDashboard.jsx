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
  HiChevronRight,
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
import { useTranslation } from '../../lib/i18n';
import { isDemoMode } from '../../lib/demoGuard';
import '../../styles/shared.css';

ChartJS.register(ArcElement, Tooltip);

export default function EmpDashboard() {
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

  const load = useCallback(async () => {
    // Demo mode: skip Supabase, use dummy data
    if (isDemoMode()) {
      setEmp({
        name: 'Pengguna Demo', position: 'Staff HR', division: 'Human Resources',
        status: 'permanent', leave_quota: 12, leave_used: 3, company_id: null,
      });
      setTodayAtt(null);
      setPendingLeaves([]);
      setRecentAnnouncements([{ id: 1, title: 'Selamat datang di Demo HRIS Loka!', created_at: new Date().toISOString() }]);
      setLoading(false);
      return;
    }
    const email = user?.email || user?.user_metadata?.email;
    const { data } = await getEmployeeByEmail(email);
    if (data) {
      setEmp(data);
      const { data: att } = await getTodayAttendance(data.id);
      setTodayAtt(att);
      const { data: leaves } = await getMyLeaves(data.id);
      setPendingLeaves((leaves || []).filter(l => l.status === 'pending'));
    }
    const compId = data?.company_id;
    const annQuery = supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5);
    if (compId) annQuery.eq('company_id', compId);
    const { data: ann } = await annQuery;
    setRecentAnnouncements(ann || []);
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
    { table: 'attendance', onRefresh: refreshData },
    { table: 'leave_requests', onRefresh: refreshData },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div style={{ animation: "fadeInUp 0.3s ease" }}>
        <div className="skeleton" style={{ height: 220, borderRadius: 24, marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />)}
        </div>
        <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 6, marginBottom: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  if (!emp) {
    return <EmpEmptyState type="noemp" subtitle={`Email: ${user?.email} — Hubungi HR untuk verifikasi akun karyawan Anda.`} />;
  }

  const leaveBalance = (emp.leave_quota || 0) - (emp.leave_used || 0);
  const leavePercent = emp.leave_quota > 0 ? Math.round((leaveBalance / emp.leave_quota) * 100) : 0;
  const clockedIn = todayAtt?.clock_in && !todayAtt?.clock_out;
  const clockedOut = todayAtt?.clock_in && todayAtt?.clock_out;

  const formatTime = (d) => d.toLocaleTimeString(locale === 'en' ? 'en-US' : 'id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const openSheet = (type) => { setSheetType(type); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setSheetType(''); };

  const handleSubmitCuti = async () => {
    if (!cutiForm.startDate || !cutiForm.endDate) return;
    setSubmitting(true);
    const days = Math.ceil((new Date(cutiForm.endDate) - new Date(cutiForm.startDate)) / 86400000) + 1;
    await submitLeave(emp.id, { type: cutiForm.type, startDate: cutiForm.startDate, endDate: cutiForm.endDate, days, reason: cutiForm.reason });
    setSubmitting(false);
    closeSheet();
    setCutiForm({ type: 'Cuti Tahunan', startDate: '', endDate: '', reason: '' });
    try { toast?.success('Pengajuan cuti berhasil dikirim!'); } catch(e) {}
  };

  const handleSubmitHelpdesk = async () => {
    if (!helpdeskForm.subject) return;
    setSubmitting(true);
    await submitTicket(emp.id, { category: helpdeskForm.category, subject: helpdeskForm.subject, description: helpdeskForm.description });
    setSubmitting(false);
    closeSheet();
    setHelpdeskForm({ category: 'IT Support', subject: '', description: '' });
  };

  const quickActions = [
    { labelId: 'Ajukan Cuti', labelEn: 'Apply Leave', icon: <HiCalendarDays size={24} />, color: '#0047AB', bg: '#EEF2FF', onClick: () => openSheet('cuti') },
    { labelId: 'Helpdesk', labelEn: 'Helpdesk', icon: <HiChatBubbleLeftRight size={24} />, color: '#D97706', bg: '#FFFBEB', onClick: () => openSheet('helpdesk') },
    { labelId: 'Payslip', labelEn: 'Payslip', icon: <HiDocumentText size={24} />, color: '#16A34A', bg: '#F0FDF4', onClick: () => navigate('/app/payslip') },
    { labelId: 'Direktori', labelEn: 'Directory', icon: <HiUsers size={24} />, color: '#6366F1', bg: '#F5F3FF', onClick: () => navigate('/app/directory') },
    { labelId: 'Lembur', labelEn: 'Overtime', icon: <HiArrowsRightLeft size={24} />, color: '#EF4444', bg: '#FEF2F2', onClick: () => navigate('/app/overtime') },
    { labelId: 'Reimburse', labelEn: 'Reimburse', icon: <HiCurrencyDollar size={24} />, color: '#7C3AED', bg: '#F5F3FF', onClick: () => navigate('/app/reimbursement') },
    { labelId: 'KPI', labelEn: 'KPI', icon: <HiArrowTrendingUp size={24} />, color: '#0EA5E9', bg: '#F0F9FF', onClick: () => navigate('/app/kpi') },
    { labelId: 'Pengajuan', labelEn: 'Submissions', icon: <HiPaperAirplane size={24} />, color: '#8B5CF6', bg: '#F5F3FF', onClick: () => navigate('/app/submissions') },
  ];


  return (
    <div className="emp-page">

      {/* Demo Mode Banner */}
      {isDemo && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
        border: '1.5px solid #F59E0B',
        borderRadius: 14, padding: '11px 16px',
        marginBottom: 14,
        boxShadow: '0 2px 12px rgba(245,158,11,0.15)',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>🎯</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#92400E' }}>Mode Demo — Read Only</div>
          <div style={{ fontSize: 11, color: '#B45309', marginTop: 1 }}>Fitur kirim & aksi tidak tersedia dalam mode demo.</div>
        </div>
        <a href="/checkout" style={{
          fontSize: 11, fontWeight: 700, color: '#fff',
          background: '#D97706', borderRadius: 8,
          padding: '6px 12px', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
        }}>Berlangganan</a>
      </div>
      )}

      {/* Hero Clock Card */}
      <div style={{
        marginBottom: 16, padding: '20px 22px',
        borderRadius: 22, color: '#fff', position: 'relative', overflow: 'hidden',
        background: clockedIn
          ? 'linear-gradient(135deg, #059669 0%, #10B981 60%, #34D399 100%)'
          : 'linear-gradient(135deg, #1565C0 0%, #1976D2 55%, #2196F3 100%)',
        boxShadow: clockedIn ? '0 10px 36px rgba(5,150,105,0.32)' : '0 10px 36px rgba(21,101,192,0.32)',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -50, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600, marginBottom: 6 }}>
            {locale === 'en' ? 'Current time' : 'Waktu sekarang'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {formatTime(currentTime)}
            </div>
            <button
              onClick={() => navigate('/app/absen')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                padding: '13px 16px', borderRadius: 16,
                background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(12px)',
                border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff',
                fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <HiMapPin size={17} />
              {clockedIn ? (locale === 'en' ? 'Clock Out' : 'Absen Keluar')
                : clockedOut ? (locale === 'en' ? 'Done' : 'Selesai')
                : (locale === 'en' ? 'Clock In' : 'Absen Masuk')}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px #4ADE80' }} />
            <span style={{ fontSize: 13, opacity: 0.9 }}>
              {todayAtt?.clock_in
                ? `${locale === 'en' ? 'In' : 'Masuk'}: ${todayAtt.clock_in}${todayAtt?.clock_out ? ` · ${locale === 'en' ? 'Out' : 'Keluar'}: ${todayAtt.clock_out}` : ''}`
                : (locale === 'en' ? 'Within office radius' : 'Dalam radius kantor')}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2 Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {/* Leave Balance */}
        <div className="emp-card emp-card-interactive" style={{ padding: '16px' }} onClick={() => navigate('/app/leave-balance')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(0,71,171,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <HiCalendarDays size={22} />
            </div>
            <HiChevronRight size={15} style={{ color: 'var(--muted)', marginTop: 4 }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, marginBottom: 3 }}>
            {locale === 'en' ? 'Annual Leave Left' : 'Sisa Cuti Tahunan'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', lineHeight: 1, marginBottom: 3 }}>
            {leaveBalance} <span style={{ fontSize: 13, fontWeight: 600 }}>{locale === 'en' ? 'Days' : 'Hari'}</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            {locale === 'en' ? `Available ${new Date().getFullYear()}` : `Tersedia tahun ${new Date().getFullYear()}`}
          </div>
        </div>

        {/* Attendance Status */}
        <div className="emp-card emp-card-interactive" style={{ padding: '16px' }} onClick={() => navigate('/app/absen')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: clockedIn ? 'rgba(16,185,129,0.1)' : 'rgba(0,71,171,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: clockedIn ? '#10B981' : 'var(--primary)' }}>
              <HiClock size={22} />
            </div>
            <HiChevronRight size={15} style={{ color: 'var(--muted)', marginTop: 4 }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, marginBottom: 3 }}>
            {locale === 'en' ? 'Attendance Status' : 'Status Absensi'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', lineHeight: 1.2, marginBottom: 3 }}>
            {clockedIn ? (locale === 'en' ? 'Working' : 'Hadir') : clockedOut ? (locale === 'en' ? 'Done' : 'Selesai') : (locale === 'en' ? 'Not Clocked In' : 'Belum Absen')}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            {emp.status === 'permanent' ? (locale === 'en' ? 'Permanent' : 'Tetap') : (locale === 'en' ? 'Contract' : 'Kontrak')} · {emp.division || ''}
          </div>
        </div>
      </div>

      {/* ── Layanan Utama ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
          {locale === 'en' ? 'Main Services' : 'Layanan Utama'}
        </div>
        <button onClick={() => navigate('/app/submissions')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {locale === 'en' ? 'See All' : 'Lihat Semua'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { labelId: 'Payslip', labelEn: 'Payslip', icon: <HiDocumentText size={26} />, color: '#16A34A', bg: 'rgba(16,163,74,0.1)', onClick: () => navigate('/app/payslip') },
          { labelId: 'Klaim', labelEn: 'Claim', icon: <HiCurrencyDollar size={26} />, color: '#6366F1', bg: 'rgba(99,102,241,0.1)', onClick: () => navigate('/app/reimbursement') },
          { labelId: 'Cuti', labelEn: 'Leave', icon: <HiCalendarDays size={26} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', onClick: () => openSheet('cuti') },
          { labelId: 'KPI', labelEn: 'KPI', icon: <HiArrowTrendingUp size={26} />, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', onClick: () => navigate('/app/kpi') },
          { labelId: 'Helpdesk', labelEn: 'Helpdesk', icon: <HiChatBubbleLeftRight size={26} />, color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)', onClick: () => openSheet('helpdesk') },
          { labelId: 'Direktori', labelEn: 'Directory', icon: <HiUsers size={26} />, color: '#F97316', bg: 'rgba(249,115,22,0.1)', onClick: () => navigate('/app/directory') },
        ].map((a, idx) => (
          <button key={a.labelId} onClick={a.onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '16px 8px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 18, cursor: 'pointer',
            transition: 'all 0.2s ease', fontFamily: 'inherit',
            animation: `fadeInUp 0.4s ease ${0.04 + idx * 0.05}s both`,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: a.bg, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {a.icon}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, textAlign: 'center' }}>
              {locale === 'en' ? a.labelEn : a.labelId}
            </span>
          </button>
        ))}
      </div>

      {/* -- Info Banner -- */}
      {recentAnnouncements.length > 0 && (
        <div onClick={() => navigate('/app/announcements')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(0,71,171,0.06)', borderRadius: 14, border: '1px solid rgba(0,71,171,0.1)', marginBottom: 16, cursor: 'pointer' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HiBell size={18} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {recentAnnouncements[0]?.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {locale === 'en' ? 'Must be read by all employees' : 'Wajib dibaca oleh semua karyawan'}
            </div>
          </div>
          <HiChevronRight size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        </div>
      )}

      {/* -- Pending Submissions -- */}
      {pendingLeaves.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
              {locale === 'en' ? `Pending (${pendingLeaves.length})` : `Menunggu Persetujuan (${pendingLeaves.length})`}
            </div>
            <button onClick={() => navigate('/app/submissions')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit' }}>
              {locale === 'en' ? 'See all' : 'Lihat semua'} <HiChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {pendingLeaves.slice(0, 2).map(l => (
              <div key={l.id} className="emp-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #F59E0B' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{l.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{l.start_date} — {l.end_date} · {l.days} {locale === 'en' ? 'days' : 'hari'}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#D97706', background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                  {locale === 'en' ? 'Pending' : 'Menunggu'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Announcements ── */}
      {recentAnnouncements.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
              {locale === 'en' ? 'Announcements' : 'Pengumuman'}
            </div>
            <button onClick={() => navigate('/app/announcements')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {locale === 'en' ? 'See All' : 'Lihat Semua'}
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {recentAnnouncements.slice(0, 3).map((a, i) => {
              const isNew = (Date.now() - new Date(a.created_at).getTime()) < 7 * 24 * 3600 * 1000;
              return (
                <div key={a.id || i} className="emp-card emp-card-interactive" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate('/app/announcements')}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0,71,171,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                    <HiBell size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      {isNew && <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: 'var(--primary)', borderRadius: 4, padding: '1px 5px' }}>{locale === 'en' ? 'New' : 'Baru'}</span>}
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(a.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <HiChevronRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Leave Bottom Sheet ── */}
      <BottomSheet open={sheetOpen && sheetType === 'cuti'} onClose={closeSheet}
        title={locale === 'en' ? 'Apply for Leave' : 'Ajukan Cuti'}
        footer={<><button className="btn-secondary" onClick={closeSheet}>{locale === 'en' ? 'Cancel' : 'Batal'}</button><button className="btn-primary" onClick={handleSubmitCuti} disabled={submitting}>{submitting ? '...' : <><HiPaperAirplane style={{ marginRight: 6 }} />{locale === 'en' ? 'Submit' : 'Kirim'}</>}</button></>}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Leave Type' : 'Jenis Cuti'}</label>
            <select value={cutiForm.type} onChange={e => setCutiForm({ ...cutiForm, type: e.target.value })} className="emp-field-input">
              <option>{locale === 'en' ? 'Annual Leave' : 'Cuti Tahunan'}</option>
              <option>{locale === 'en' ? 'Sick Leave' : 'Sakit'}</option>
              <option>{locale === 'en' ? 'Permission' : 'Izin'}</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
        footer={<><button className="btn-secondary" onClick={closeSheet}>{locale === 'en' ? 'Cancel' : 'Batal'}</button><button className="btn-primary" onClick={handleSubmitHelpdesk} disabled={submitting}>{submitting ? '...' : <><HiPaperAirplane style={{ marginRight: 6 }} />{locale === 'en' ? 'Submit' : 'Kirim'}</>}</button></>}>
        <div style={{ display: 'grid', gap: 14 }}>
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
