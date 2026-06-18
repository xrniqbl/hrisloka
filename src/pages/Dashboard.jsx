import { useState, useEffect, useMemo } from 'react';
import '../styles/admin.css';
import { FiUsers, FiCheckCircle, FiFileText, FiTrendingUp, FiCalendar, FiPieChart, FiBarChart2, FiSliders, FiEye, FiEyeOff, FiCreditCard, FiExternalLink } from 'react-icons/fi';
import {
 Chart as ChartJS,
 CategoryScale,
 LinearScale,
 BarElement,
 ArcElement,
 PointElement,
 LineElement,
 Filler,
 Tooltip,
 Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import StatCard from '../components/StatCard';
import NotificationBoard from '../components/NotificationBoard';
import ContractBadge from '../components/ContractBadge';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '../components/SkeletonLoader';
import * as employeeService from '../services/employeeService';
import * as attendanceService from '../services/attendanceService';
import * as leaveService from '../services/leaveService';
import * as overtimeService from '../services/overtimeService';
import * as billingService from '../services/billingService';
import BranchFilter from '../components/BranchFilter';
import { useBranch } from '../context/BranchContext';
import { useRealtimeMultiple } from '../hooks/useRealtime';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend);

const chartFont = { family: 'Plus Jakarta Sans', weight: '500' };

const tooltipConfig = {
 backgroundColor: 'rgba(15, 23, 42, 0.92)',
 titleFont: { ...chartFont, weight: '700', size: 13 },
 bodyFont: { ...chartFont, size: 12 },
 cornerRadius: 10,
 padding: { top: 10, bottom: 10, left: 14, right: 14 },
 boxPadding: 4,
 usePointStyle: true,
};

const legendConfig = {
 position: 'top', align: 'end',
 labels: { boxWidth: 8, boxHeight: 8, borderRadius: 4, useBorderRadius: true, font: { size: 12, ...chartFont }, color: '#9CA3AF', padding: 20 },
};

// --- Helper: get age generation from birthDate ---
function getGeneration(birthDate) {
 if (!birthDate) return 'Unknown';
 const year = new Date(birthDate).getFullYear();
 if (year >= 1997) return 'Gen Z';
 if (year >= 1981) return 'Milenial';
 if (year >= 1965) return 'Gen X';
 return 'Baby Boomer';
}

export default function Dashboard() {
 const { user, employee, isDemo } = useAuth();
 const navigate = useNavigate();
 const [employees, setEmployees] = useState([]);
 const [todayAttendance, setTodayAttendance] = useState([]);
 const [leaves, setLeaves] = useState([]);
 const [overtimeRecords, setOvertimeRecords] = useState([]);
 const [loading, setLoading] = useState(true);
 const [billing, setBilling] = useState(null);
 const [showPayment, setShowPayment] = useState(false);
 const today = new Date();
 const formattedDate = today.toLocaleDateString('id-ID', {
 weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
 });

 const { selectedBranchId } = useBranch();

 // Fetch real billing info
 useEffect(() => {
 if (user?.id) {
 billingService.getBillingInfo(user.id).then(({ data }) => {
 if (data) setBilling({ ...billingService.getDefaultBillingInfo(), ...data });
 });
 }
 }, [user?.id]);

 // Widget visibility customization
 const WIDGET_DEFAULTS = { stats: true, trend: true, notifications: true, headcount: true, demographics: true, division: true, employees: true };
 const [widgets, setWidgets] = useState(() => {
 const saved = localStorage.getItem('HRIS Loka_dashboard_widgets');
 return saved ? { ...WIDGET_DEFAULTS, ...JSON.parse(saved) } : WIDGET_DEFAULTS;
 });
 const [showWidgetSettings, setShowWidgetSettings] = useState(false);

 useEffect(() => {
 localStorage.setItem('HRIS Loka_dashboard_widgets', JSON.stringify(widgets));
 }, [widgets]);

 const toggleWidget = (key) => setWidgets(prev => ({ ...prev, [key]: !prev[key] }));

 useEffect(() => { fetchData(); }, [selectedBranchId]);

 const fetchData = async () => {
  setLoading(true);
  try {
  const companyId = employee?.company_id;
  const { data: empData } = await employeeService.getAllEmployees(selectedBranchId, companyId);
  const { data: attData } = await attendanceService.getAllAttendanceToday(selectedBranchId, companyId);
  const { data: leaveData } = await leaveService.getAllLeaves(selectedBranchId, companyId);
  const { data: otData } = await overtimeService.getAllOvertime(selectedBranchId, companyId);
  setEmployees(empData || []);
  setTodayAttendance(attData || []);
  setLeaves(leaveData || []);
  setOvertimeRecords(otData || []);
  } catch (e) {
  console.error('Dashboard fetch error:', e);
  }
  setLoading(false);
  };

 // Realtime: auto-refresh dashboard when data changes
  useRealtimeMultiple([
  { table: 'employees', onRefresh: fetchData },
  { table: 'attendance', onRefresh: fetchData },
  { table: 'leave_requests', onRefresh: fetchData },
  { table: 'overtime_requests', onRefresh: fetchData },
  ]);

 const getContractDaysRemaining = (contractEnd) => {
 if (!contractEnd) return Infinity;
 return Math.ceil((new Date(contractEnd) - new Date()) / (1000 * 60 * 60 * 24));
 };

 // --- Stats ---
 const activeEmployees = employees.length;
 const onLeaveToday = todayAttendance.filter((a) => a.status === 'leave').length;
 const presentToday = todayAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
 const attendancePercent = activeEmployees > 0 ? Math.round((presentToday / activeEmployees) * 100) : 0;
 const expiringContracts = employees.filter(
 (e) => e.status === 'contract' && e.contract_end && getContractDaysRemaining(e.contract_end) <= 60
 ).length;
 const pendingLeaves = leaves.filter((l) => l.status === 'pending').length;

 // ---------------------------------------
 // CHART 1: Attendance Trend (30-day) � Real data from DB
 // ---------------------------------------
 const [attendanceSummary, setAttendanceSummary] = useState({});
 useEffect(() => {
  const companyId = employee?.company_id;
  if (!companyId) return;
  attendanceService.getAttendanceSummary30Days(companyId, selectedBranchId ?? undefined)
   .then(({ data }) => setAttendanceSummary(data || {}));
 }, [employee?.company_id, selectedBranchId]);

 const trendData = useMemo(() => {
 const data = [];
 for (let i = 29; i >= 0; i--) {
 const d = new Date();
 d.setDate(d.getDate() - i);
 const dateStr = d.toISOString().split('T')[0];
 if (i === 0) {
 data.push({ date: dateStr, present: presentToday, late: todayAttendance.filter(a => a.status === 'late').length });
 } else {
 const summary = attendanceSummary[dateStr] || { present: 0, late: 0 };
 data.push({ date: dateStr, present: summary.present, late: summary.late });
 }
 }
 return data;
 }, [attendanceSummary, presentToday, todayAttendance]);

 const trendChartData = {
 labels: trendData.map((d) => {
 const dt = new Date(d.date);
 return `${dt.getDate()}/${dt.getMonth() + 1}`;
 }),
 datasets: [
 {
 label: 'Hadir',
 data: trendData.map((d) => d.present),
 borderColor: '#0047AB',
 backgroundColor: 'rgba(0, 71, 171, 0.08)',
 tension: 0.4, fill: true, pointRadius: 0,
 pointHoverRadius: 6, pointHoverBackgroundColor: '#0047AB',
 pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, borderWidth: 2.5,
 },
 {
 label: 'Terlambat',
 data: trendData.map((d) => d.late),
 borderColor: '#F59E0B',
 backgroundColor: 'rgba(245, 158, 11, 0.08)',
 tension: 0.4, fill: true, pointRadius: 0,
 pointHoverRadius: 6, pointHoverBackgroundColor: '#F59E0B',
 pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, borderWidth: 2.5,
 },
 ],
 };

 const lineOptions = {
 responsive: true, maintainAspectRatio: false,
 interaction: { mode: 'index', intersect: false },
 plugins: { legend: legendConfig, tooltip: tooltipConfig },
 scales: {
 y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false }, ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', padding: 8 }, border: { display: false } },
 x: { grid: { display: false }, ticks: { font: { size: 10, ...chartFont }, color: '#9CA3AF', maxTicksLimit: 10, padding: 4 }, border: { display: false } },
 },
 };

 // ---------------------------------------
 // CHART 2: Employee Demographics (Donut) � REAL DATA
 // ---------------------------------------
 const demographicsData = useMemo(() => {
 const permanent = employees.filter(e => e.status === 'permanent').length;
 const contract = employees.filter(e => e.status === 'contract').length;
 const male = employees.filter(e => e.gender === 'male').length;
 const female = employees.filter(e => e.gender === 'female').length;
 const unspecified = employees.filter(e => !e.gender).length;
 const genZ = employees.filter(e => getGeneration(e.birthDate || e.birth_date) === 'Gen Z').length;
 const milenial = employees.filter(e => getGeneration(e.birthDate || e.birth_date) === 'Milenial').length;
 const genX = employees.filter(e => getGeneration(e.birthDate || e.birth_date) === 'Gen X').length;
 const boomer = employees.filter(e => getGeneration(e.birthDate || e.birth_date) === 'Baby Boomer').length;
 return { permanent, contract, male, female, unspecified, genZ, milenial, genX, boomer };
 }, [employees]);

 const [demoTab, setDemoTab] = useState('status');

 const demoChartData = useMemo(() => {
 if (demoTab === 'status') {
 return {
 labels: ['Karyawan Tetap', 'Kontrak'],
 datasets: [{ data: [demographicsData.permanent, demographicsData.contract], backgroundColor: ['#0047AB', '#60A5FA'], borderWidth: 0, hoverOffset: 8, borderRadius: 4 }],
 };
 } else if (demoTab === 'gender') {
 return {
 labels: ['Laki-laki', 'Perempuan', 'Belum Diisi'],
 datasets: [{ data: [demographicsData.male, demographicsData.female, demographicsData.unspecified], backgroundColor: ['#3B82F6', '#EC4899', '#D1D5DB'], borderWidth: 0, hoverOffset: 8, borderRadius: 4 }],
 };
 } else {
 return {
 labels: ['Gen Z', 'Milenial', 'Gen X', 'Baby Boomer'],
 datasets: [{ data: [demographicsData.genZ, demographicsData.milenial, demographicsData.genX, demographicsData.boomer], backgroundColor: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'], borderWidth: 0, hoverOffset: 8, borderRadius: 4 }],
 };
 }
 }, [demoTab, demographicsData]);

 const demoOptions = {
 responsive: true, maintainAspectRatio: false, cutout: '70%',
 plugins: {
 legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, borderRadius: 4, useBorderRadius: true, font: { size: 11, ...chartFont }, color: '#9CA3AF', padding: 14 } },
 tooltip: { ...tooltipConfig, callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} orang` } },
 },
 };

 // ---------------------------------------
 // CHART 3: Headcount Trend (Line/Area) � REAL DATA
 // ---------------------------------------
 const headcountData = useMemo(() => {
 const months = [];
 const now = new Date();
 for (let i = 11; i >= 0; i--) {
 const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
 const monthLabel = d.toLocaleDateString('id-ID', { month: 'short' });
 const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

 // Count employees joined this month
 const hired = employees.filter(e => {
 const jd = e.joinDate || e.join_date;
 return jd && jd.startsWith(monthKey);
 }).length;

 months.push({ label: monthLabel, hired, turnover: 0 }); // turnover would need resigned_date field
 }
 return months;
 }, [employees]);

 const headcountChartData = {
 labels: headcountData.map(d => d.label),
 datasets: [
 {
 label: 'Karyawan Baru',
 data: headcountData.map(d => d.hired),
 borderColor: '#10B981',
 backgroundColor: 'rgba(16, 185, 129, 0.1)',
 tension: 0.4, fill: true, pointRadius: 3,
 pointBackgroundColor: '#10B981', borderWidth: 2.5,
 },
 ],
 };

 // ---------------------------------------
 // CHART 4: Division Distribution (Horizontal Bar) � REAL DATA
 // ---------------------------------------
 const divisionData = useMemo(() => {
 const counts = {};
 employees.forEach(e => {
 const div = e.division || 'Lainnya';
 counts[div] = (counts[div] || 0) + 1;
 });
 // Sort descending by count
 const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
 return { labels: sorted.map(s => s[0]), data: sorted.map(s => s[1]) };
 }, [employees]);

 const divisionColors = ['#0047AB', '#3B82F6', '#60A5FA', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'];

 const divisionChartData = {
 labels: divisionData.labels,
 datasets: [{
 label: 'Jumlah Staf',
 data: divisionData.data,
 backgroundColor: divisionData.labels.map((_, i) => divisionColors[i % divisionColors.length]),
 borderRadius: 6,
 barPercentage: 0.6,
 borderSkipped: false,
 }],
 };

 const horizontalBarOptions = {
 responsive: true, maintainAspectRatio: false,
 indexAxis: 'y',
 plugins: {
 legend: { display: false },
 tooltip: { ...tooltipConfig, callbacks: { label: (ctx) => ` ${ctx.parsed.x} orang` } },
 },
 scales: {
 x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false }, ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', stepSize: 1 }, border: { display: false } },
 y: { grid: { display: false }, ticks: { font: { size: 12, ...chartFont, weight: '600' }, color: '#64748B', padding: 8 }, border: { display: false } },
 },
 };

 const recentEmployees = employees.slice(0, 6);

 // --- Skeleton Loading State ---
 if (loading) {
 return (
 <div className="dashboard">
 <div className="dashboard-header">
 <div>
 <h1>Dashboard</h1>
 <p>{formattedDate}</p>
 </div>
 </div>
 <CardSkeleton count={4} />
 <div className="dashboard-charts-row">
 <ChartSkeleton />
 <ChartSkeleton />
 </div>
 <div className="dashboard-charts">
 <ChartSkeleton />
 <ChartSkeleton />
 </div>
 </div>
 );
 }

 return (
 <div className="dashboard">
 <div className="dashboard-header">
 <div>
 <h1>{(() => { const h = new Date().getHours(); return h < 12 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam'; })()}{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}</h1>
 <p>{formattedDate}</p>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
 <BranchFilter />
 <div style={{ position: 'relative' }}>
 <button
 className="btn-secondary"
 onClick={() => setShowWidgetSettings(!showWidgetSettings)}
 style={{ padding: '8px 14px', fontSize: 13 }}
 >
 <FiSliders /> Widget
 </button>
 {showWidgetSettings && (
 <div style={{
 position: 'absolute', top: '100%', right: 0, marginTop: 8,
 width: 260, background: 'var(--surface)', borderRadius: 'var(--radius-md)',
 border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
 padding: 12, zIndex: 100, animation: 'ncSlideIn 0.15s ease',
 }}>
 <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Tampilkan Widget</div>
 {[
 { key: 'stats', label: 'Stat Cards' },
 { key: 'trend', label: 'Tren Kehadiran' },
 { key: 'notifications', label: 'Notifikasi' },
 { key: 'headcount', label: 'Tren Headcount' },
 { key: 'demographics', label: 'Demografi' },
 { key: 'division', label: 'Distribusi Divisi' },
 { key: 'employees', label: 'Tabel Karyawan' },
 ].map(w => (
 <div key={w.key} onClick={() => toggleWidget(w.key)} style={{
 display: 'flex', alignItems: 'center', justifyContent: 'space-between',
 padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
 background: widgets[w.key] ? 'var(--primary-light)' : 'transparent',
 transition: 'background 0.12s', marginBottom: 4,
 }}>
 <span style={{ fontSize: 13, fontWeight: 500 }}>{w.label}</span>
 {widgets[w.key] ? <FiEye style={{ color: 'var(--primary)' }} /> : <FiEyeOff style={{ color: 'var(--muted)' }} />}
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>

 {/* -- Billing & Payment (Collapsible) -- */}
 <div style={{ marginBottom: 20 }}>
 <button
 onClick={() => setShowPayment(p => !p)}
 style={{
 display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
 background: 'var(--surface)', border: '1px solid var(--border)',
 borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 12,
 fontWeight: 600, color: 'var(--text-secondary)', width: 'fit-content',
 transition: 'all 0.15s', fontFamily: 'inherit',
 }}
 >
 <FiCreditCard size={13} />
 Billing & Pembayaran
 <span style={{ fontSize: 10, transform: showPayment ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>&#9660;</span>
 {billing?.status === 'active' && (
 <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: '#059669' }}>Aktif</span>
 )}
 </button>
 {showPayment && (
 <div className="payment-method-card" style={{ marginTop: 10, animation: 'fadeInUp 0.2s ease' }}>
 <div className="payment-card-header">
 <div className="payment-card-heading">
 <FiCreditCard size={15} />
 Metode Pembayaran
 </div>
 <button className="btn-change-plan" onClick={() => navigate('/settings')}>
 <FiExternalLink size={12} /> Ganti Metode Pembayaran
 </button>
 </div>
 <div className="payment-card-details">
 <div className="pay-detail-col">
 <div className="pay-detail-label">Nama Pemegang</div>
 <div className="pay-detail-value">{billing.cardholder_name}</div>
 </div>
 <div className="pay-detail-col">
 <div className="pay-detail-label">Nomor Akun</div>
 <div className="pay-detail-value pay-masked">{billing.account_number_masked}</div>
 </div>
 <div className="pay-detail-col">
 <div className="pay-detail-label">Kadaluwarsa</div>
 <div className="pay-detail-value">{billing.expiry}</div>
 </div>
 <div className="pay-detail-col">
 <div className="pay-detail-label">Paket & Metode</div>
 <div className="pay-detail-value pay-method-row">
 <span className="pay-chip pay-visa">{billing.payment_method || 'VISA'}</span>
 <span>{billing.plan} Plan</span>
 </div>
 </div>
 <div className="pay-detail-col">
 <div className="pay-detail-label">Perpanjang</div>
 <div className="pay-detail-value" style={{ fontSize: 12.5 }}>{billing.renewal_date}</div>
 </div>
 </div>
 </div>
 )}
 </div>

 {widgets.stats && (
 <div className="dashboard-stats">
 <StatCard icon={<FiUsers />} label="Total Karyawan Aktif" value={activeEmployees} change={`${employees.filter(e => e.status === 'permanent').length} tetap`} changeType="up" color="blue" />
 <StatCard icon={<FiCalendar />} label="Sedang Cuti Hari Ini" value={onLeaveToday} change={`${pendingLeaves} pending`} changeType="down" color="orange" />
 <StatCard icon={<FiCheckCircle />} label="Kehadiran Harian" value={`${attendancePercent}%`} change={`${presentToday} dari ${activeEmployees}`} changeType="up" color="green" />
 <StatCard icon={<FiFileText />} label="Kontrak Segera Habis" value={expiringContracts} change="dalam 60 hari" changeType="down" color="cyan" />
 </div>
 )}

 {(widgets.trend || widgets.notifications) && (
 <div className="dashboard-charts-row">
 {widgets.trend && (
 <div className="chart-card chart-card-wide">
 <div className="chart-card-header">
 <span className="chart-card-title"><FiTrendingUp style={{ marginRight: 8 }} />Tren Kehadiran 30 Hari</span>
 <span className="chart-card-badge">Real-time</span>
 </div>
 <div className="chart-container">
 <Line data={trendChartData} options={lineOptions} />
 </div>
 </div>
 )}
 {widgets.notifications && <NotificationBoard />}
 </div>
 )}

 {(widgets.headcount || widgets.demographics) && (
 <div className="dashboard-charts-row">
 {widgets.headcount && (
 <div className="chart-card chart-card-wide">
 <div className="chart-card-header">
 <span className="chart-card-title"><FiTrendingUp style={{ marginRight: 8 }} />Tren Headcount (12 Bulan)</span>
 <span className="chart-card-badge">Hiring</span>
 </div>
 <div className="chart-container">
 <Line data={headcountChartData} options={lineOptions} />
 </div>
 </div>
 )}

 {widgets.demographics && (
 <div className="chart-card">
 <div className="chart-card-header">
 <span className="chart-card-title"><FiPieChart style={{ marginRight: 8 }} />Demografi</span>
 </div>
 <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
 {[{ key: 'status', label: 'Status' }, { key: 'gender', label: 'Gender' }, { key: 'generation', label: 'Generasi' }].map(t => (
 <button key={t.key}
 onClick={() => setDemoTab(t.key)}
 style={{
 flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer',
 background: demoTab === t.key ? 'var(--primary)' : 'var(--bg)',
 color: demoTab === t.key ? '#fff' : 'var(--text-tertiary)',
 transition: 'all 0.2s',
 }}
 >{t.label}</button>
 ))}
 </div>
 <div className="chart-container" style={{ position: 'relative' }}>
 <Doughnut data={demoChartData} options={demoOptions} />
 <div style={{
 position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%)',
 textAlign: 'center', pointerEvents: 'none',
 }}>
 <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{activeEmployees}</div>
 <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Total</div>
 </div>
 </div>
 </div>
 )}
 </div>
 )}

 {(widgets.division || widgets.employees) && (
 <div className="dashboard-charts" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
 {widgets.division && (
 <div className="chart-card">
 <div className="chart-card-header">
 <span className="chart-card-title"><FiBarChart2 style={{ marginRight: 8 }} />Distribusi Divisi</span>
 <span className="chart-card-badge">{divisionData.labels.length} divisi</span>
 </div>
 <div className="chart-container" style={{ height: Math.max(220, divisionData.labels.length * 38) }}>
 <Bar data={divisionChartData} options={horizontalBarOptions} />
 </div>
 </div>
 )}

 {widgets.employees && (
 <div className="recent-table-card">
 <div className="recent-table-header">
 <span className="recent-table-title">Data Karyawan Terbaru</span>
 <span className="recent-table-link">Lihat Semua</span>
 </div>
 <div className="table-responsive">
 <table className="recent-table">
 <thead>
 <tr>
 <th>Karyawan</th>
 <th>Divisi</th>
 <th>Status</th>
 <th>Kehadiran</th>
 </tr>
 </thead>
 <tbody>
 {recentEmployees.length === 0 ? (
 <tr>
 <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
 Belum ada data karyawan.
 </td>
 </tr>
 ) : recentEmployees.map((emp) => {
 const att = todayAttendance.find((a) => a.employee_id === emp.id);
 return (
 <tr key={emp.id}>
 <td>
 <div className="employee-cell">
 <div className="employee-avatar">
 {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
 </div>
 <div>
 <div className="employee-name">{emp.name}</div>
 <div className="employee-dept">{emp.position}</div>
 </div>
 </div>
 </td>
 <td><span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{emp.division}</span></td>
 <td>
 <ContractBadge status={emp.status} contractEnd={emp.contract_end || emp.contractEnd} />
 </td>
 <td>
 <span className={`status-badge ${att?.status || 'absent'}`}>
 {att?.status === 'present' ? 'Hadir' : att?.status === 'late' ? 'Terlambat' : att?.status === 'leave' ? 'Cuti' : 'Tidak Hadir'}
 </span>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 );
}
