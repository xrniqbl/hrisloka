import { useState, useEffect, useMemo } from 'react';
import { FiBarChart2, FiDownload, FiFilter, FiRefreshCw, FiUsers, FiCalendar, FiDollarSign, FiClock, FiPieChart } from 'react-icons/fi';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import * as employeeService from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import * as attendanceService from '../services/attendanceService';

import * as leaveService from '../services/leaveService';

import { exportToExcel } from '../lib/excelExport';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';

const REPORT_TYPES = [
 { id: 'headcount', label: 'Headcount Summary', icon: <FiUsers />, color: '#3B82F6' },
 { id: 'attendance', label: 'Attendance Report', icon: <FiClock />, color: '#10B981' },
 { id: 'leave', label: 'Leave Summary', icon: <FiCalendar />, color: '#F59E0B' },
 { id: 'demographics', label: 'Demographics', icon: <FiPieChart />, color: '#8B5CF6' },
 { id: 'turnover', label: 'Turnover Analysis', icon: <FiRefreshCw />, color: '#EC4899' },
];

export default function AnalyticsReportBuilder() {
  const { employee } = useAuth();
 const [employees, setEmployees] = useState([]);
 const [attendance, setAttendance] = useState([]);
 const [leaves, setLeaves] = useState([]);
 const [loading, setLoading] = useState(true);
 const [reportType, setReportType] = useState('headcount');
 const [filterDivision, setFilterDivision] = useState('');
 const [filterStatus, setFilterStatus] = useState('');
 const [_dateRange, _setDateRange] = useState({ from: '', to: '' });

 useEffect(() => { fetchData(); }, []);

 const fetchData = async () => {
 setLoading(true);
 const [empRes, attRes, leaveRes] = await Promise.all([
 employeeService.getAllEmployees(undefined, employee?.company_id),
 attendanceService.getAllAttendanceToday(undefined, employee?.company_id),
 leaveService.getAllLeaves(undefined, employee?.company_id),
 ]);
 setEmployees(empRes.data || []);
 setAttendance(attRes.data || []);
 setLeaves(leaveRes.data || []);
 setLoading(false);
 };

 const divisions = [...new Set(employees.map(e => e.division).filter(Boolean))].sort();

 const filtered = useMemo(() => {
 return employees.filter(e => {
 if (filterDivision && e.division !== filterDivision) return false;
 if (filterStatus && e.status !== filterStatus) return false;
 return true;
 });
 }, [employees, filterDivision, filterStatus]);

 // -- Headcount data --
 const headcountByDivision = useMemo(() => {
 const map = {};
 filtered.forEach(e => { map[e.division || 'Lainnya'] = (map[e.division || 'Lainnya'] || 0) + 1; });
 return { labels: Object.keys(map), data: Object.values(map) };
 }, [filtered]);

 // -- Demographics data --
 const genderData = useMemo(() => {
 const map = {};
 filtered.forEach(e => { const g = e.gender || 'Tidak Diketahui'; map[g] = (map[g] || 0) + 1; });
 return { labels: Object.keys(map), data: Object.values(map) };
 }, [filtered]);

 const statusData = useMemo(() => {
 const map = {};
 filtered.forEach(e => { const s = e.status || 'unknown'; map[s] = (map[s] || 0) + 1; });
 return { labels: Object.keys(map), data: Object.values(map) };
 }, [filtered]);

 // -- Leave data --
 const leaveByType = useMemo(() => {
 const map = {};
 leaves.forEach(l => { const t = l.type || 'Lainnya'; map[t] = (map[t] || 0) + 1; });
 return { labels: Object.keys(map), data: Object.values(map) };
 }, [leaves]);

 const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6', '#E11D48'];

 const handleExport = () => {
 let data = [];
 if (reportType === 'headcount') {
 data = filtered.map(e => ({ Nama: e.name, NIP: e.nip, Divisi: e.division, Posisi: e.position, Status: e.status, 'Tanggal Bergabung': e.join_date }));
 } else if (reportType === 'leave') {
 data = leaves.map(l => ({ Karyawan: l.employees?.name, Tipe: l.type, Mulai: l.start_date, Selesai: l.end_date, Status: l.status }));
 } else if (reportType === 'demographics') {
 data = filtered.map(e => ({ Nama: e.name, Gender: e.gender, Status: e.status, Divisi: e.division, 'Tanggal Lahir': e.birth_date }));
 } else if (reportType === 'attendance') {
 data = attendance.map(a => ({ Karyawan: a.employees?.name, 'Clock In': a.clock_in, 'Clock Out': a.clock_out, Status: a.status }));
 } else {
 data = filtered.map(e => ({ Nama: e.name, Divisi: e.division, Status: e.status, 'Mulai': e.join_date, 'Kontrak Selesai': e.contract_end }));
 }
 exportToExcel(data, `Report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`, reportType);
 };

 const chartOptions = {
 responsive: true, maintainAspectRatio: false,
 plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 16, usePointStyle: true } } },
 };

 const renderReport = () => {
 if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>Memuat data...</div>;

 switch (reportType) {
 case 'headcount':
 return (
 <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
 <div className="info-card">
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Headcount per Divisi</div>
 <div style={{ height: 300 }}>
 <Bar data={{
 labels: headcountByDivision.labels,
 datasets: [{ label: 'Karyawan', data: headcountByDivision.data, backgroundColor: COLORS.slice(0, headcountByDivision.labels.length), borderRadius: 6 }],
 }} options={{ ...chartOptions, indexAxis: 'y', plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
 </div>
 </div>
 <div className="info-card">
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Summary</div>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
 {[
 { label: 'Total', value: filtered.length, color: '#3B82F6' },
 { label: 'Tetap', value: filtered.filter(e => e.status === 'permanent').length, color: '#10B981' },
 { label: 'Kontrak', value: filtered.filter(e => e.status === 'contract').length, color: '#F59E0B' },
 { label: 'Divisi', value: divisions.length, color: '#8B5CF6' },
 ].map(s => (
 <div key={s.label} style={{ padding: 16, borderRadius: 'var(--radius-md)', background: `${s.color}10`, textAlign: 'center' }}>
 <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
 <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
 </div>
 ))}
 </div>
 <div style={{ marginTop: 20 }}>
 <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Top 5 Divisi</div>
 {headcountByDivision.labels.slice(0, 5).map((label, i) => (
 <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
 <span>{label}</span>
 <span style={{ fontWeight: 700, color: COLORS[i] }}>{headcountByDivision.data[i]}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 );

 case 'demographics':
 return (
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
 <div className="info-card">
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Gender Distribution</div>
 <div style={{ height: 260 }}>
 <Doughnut data={{
 labels: genderData.labels,
 datasets: [{ data: genderData.data, backgroundColor: ['#3B82F6', '#EC4899', '#9CA3AF'], borderWidth: 0 }],
 }} options={chartOptions} />
 </div>
 </div>
 <div className="info-card">
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Status Distribution</div>
 <div style={{ height: 260 }}>
 <Doughnut data={{
 labels: statusData.labels,
 datasets: [{ data: statusData.data, backgroundColor: ['#10B981', '#F59E0B', '#DC2626', '#9CA3AF'], borderWidth: 0 }],
 }} options={chartOptions} />
 </div>
 </div>
 </div>
 );

 case 'leave':
 return (
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
 <div className="info-card">
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Leave by Type</div>
 <div style={{ height: 260 }}>
 <Doughnut data={{
 labels: leaveByType.labels,
 datasets: [{ data: leaveByType.data, backgroundColor: COLORS, borderWidth: 0 }],
 }} options={chartOptions} />
 </div>
 </div>
 <div className="info-card">
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Leave Summary</div>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
 {[
 { label: 'Total Request', value: leaves.length, color: '#3B82F6' },
 { label: 'Approved', value: leaves.filter(l => l.status === 'approved').length, color: '#10B981' },
 { label: 'Pending', value: leaves.filter(l => l.status === 'pending').length, color: '#F59E0B' },
 { label: 'Rejected', value: leaves.filter(l => l.status === 'rejected').length, color: '#DC2626' },
 ].map(s => (
 <div key={s.label} style={{ padding: 16, borderRadius: 'var(--radius-md)', background: `${s.color}10`, textAlign: 'center' }}>
 <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
 <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );

 case 'attendance': {
 const present = attendance.filter(a => a.status === 'present').length;
 const late = attendance.filter(a => a.status === 'late').length;
 const onLeave = attendance.filter(a => a.status === 'leave').length;
 const absent = employees.length - present - late - onLeave;
 return (
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
 <div className="info-card">
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Attendance Hari Ini</div>
 <div style={{ height: 260 }}>
 <Doughnut data={{
 labels: ['Hadir', 'Terlambat', 'Cuti', 'Tidak Hadir'],
 datasets: [{ data: [present, late, onLeave, Math.max(0, absent)], backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#DC2626'], borderWidth: 0 }],
 }} options={chartOptions} />
 </div>
 </div>
 <div className="info-card">
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Summary</div>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
 {[
 { label: 'Hadir', value: present, color: '#10B981' },
 { label: 'Terlambat', value: late, color: '#F59E0B' },
 { label: 'Cuti', value: onLeave, color: '#3B82F6' },
 { label: 'Tidak Hadir', value: Math.max(0, absent), color: '#DC2626' },
 ].map(s => (
 <div key={s.label} style={{ padding: 16, borderRadius: 'var(--radius-md)', background: `${s.color}10`, textAlign: 'center' }}>
 <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
 <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
 </div>
 ))}
 </div>
 <div style={{ marginTop: 16, padding: 14, background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
 <strong>Attendance Rate:</strong> {employees.length > 0 ? Math.round(((present + late) / employees.length) * 100) : 0}%
 </div>
 </div>
 </div>
 );
 }

 case 'turnover': {
 const contractExpiring = filtered.filter(e => {
 if (!e.contract_end) return false;
 const days = Math.ceil((new Date(e.contract_end) - new Date()) / 86400000);
 return days <= 90 && days > 0;
 });
 return (
 <div className="info-card">
 <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Kontrak Segera Habis (&le;90 hari)</div>
 {contractExpiring.length === 0 ? (
 <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Tidak ada kontrak yang segera habis.</div>
 ) : (
 <div className="table-responsive">
 <table className="data-table">
 <thead><tr><th>Nama</th><th>Divisi</th><th>Posisi</th><th>Kontrak Berakhir</th><th>Sisa Hari</th></tr></thead>
 <tbody>
 {contractExpiring.map(e => {
 const days = Math.ceil((new Date(e.contract_end) - new Date()) / 86400000);
 return (
 <tr key={e.id}>
 <td style={{ fontWeight: 600 }}>{e.name}</td>
 <td>{e.division}</td>
 <td>{e.position}</td>
 <td>{e.contract_end}</td>
 <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff', background: days <= 30 ? '#DC2626' : '#F59E0B' }}>{days} hari</span></td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
 }
 default:
 return null;
 }
 };

 return (
 <div>
 <div className="page-header">
 <h1><FiBarChart2 style={{ marginRight: 10 }} /> Analytics & Report Builder</h1>
 <div className="page-header-actions">
 <button className="btn-secondary" onClick={handleExport}><FiDownload /> Export Excel</button>
 </div>
 </div>

 {/* Report Type Cards */}
 <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
 {REPORT_TYPES.map(r => (
 <button
 key={r.id}
 onClick={() => setReportType(r.id)}
 style={{
 display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
 borderRadius: 'var(--radius-md)', border: reportType === r.id ? `2px solid ${r.color}` : '2px solid var(--border)',
 background: reportType === r.id ? `${r.color}10` : 'var(--surface)',
 color: reportType === r.id ? r.color : 'var(--text)',
 fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
 }}
 >
 {r.icon} {r.label}
 </button>
 ))}
 </div>

 {/* Filters */}
 <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
 <select className="form-select" value={filterDivision} onChange={e => setFilterDivision(e.target.value)} style={{ maxWidth: 200 }}>
 <option value="">Semua Divisi</option>
 {divisions.map(d => <option key={d} value={d}>{d}</option>)}
 </select>
 <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 160 }}>
 <option value="">Semua Status</option>
 <option value="permanent">Tetap</option>
 <option value="contract">Kontrak</option>
 <option value="probation">Probasi</option>
 </select>
 {(filterDivision || filterStatus) && (
 <button className="btn-secondary" onClick={() => { setFilterDivision(''); setFilterStatus(''); }} style={{ padding: '8px 14px', fontSize: 12 }}>
 <FiRefreshCw /> Reset
 </button>
 )}
 <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>
 {filtered.length} dari {employees.length} karyawan
 </div>
 </div>

 {/* Report Content */}
 {renderReport()}
 </div>
 );
}
