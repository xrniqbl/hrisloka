import { useState, useEffect, useMemo } from 'react';
import { FiFilter, FiDownload, FiDollarSign, FiClock, FiTrendingUp } from 'react-icons/fi';
import * as projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import * as employeeService from '../services/employeeService';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import PageHeader from '../components/PageHeader';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

const fmt = (v) => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
const fmtH = (h) => `${Math.floor(h)}j ${Math.round((h % 1) * 60)}m`;

export default function TimesheetAdmin() {
  const { employee } = useAuth();
 const [timesheets, setTimesheets] = useState([]);
 const [projects, setProjects] = useState([]);
 const [employees, setEmployees] = useState([]);
 const [loading, setLoading] = useState(true);
 const [filterProject, setFilterProject] = useState('');
 const [filterEmployee, setFilterEmployee] = useState('');
 const [filterFrom, setFilterFrom] = useState('');
 const [filterTo, setFilterTo] = useState('');

 const fetchData = async () => {
 setLoading(true);
 const filters = {};
 if (filterProject) filters.projectId = filterProject;
 if (filterEmployee) filters.employeeId = filterEmployee;
 if (filterFrom) filters.dateFrom = filterFrom;
 if (filterTo) filters.dateTo = filterTo;
 const [t, p, e] = await Promise.all([
 projectService.getTimesheets(filters),
 projectService.getAllProjects(),
 employeeService.getAllEmployees(undefined, employee?.company_id),
 ]);
 setTimesheets(t.data || []);
 setProjects(p.data || []);
 setEmployees(e.data || []);
 setLoading(false);
 };

 useEffect(() => { fetchData(); }, []);

 // Realtime: auto-refresh when new timesheet entries arrive
 useRealtimeTable('timesheets', fetchData);

 const applyFilter = () => fetchData();

 const summary = useMemo(() => {
 const totalHours = timesheets.reduce((s, t) => s + (t.hours || 0), 0);
 const billableHours = timesheets.filter(t => t.billable).reduce((s, t) => s + (t.hours || 0), 0);
 const revenue = timesheets.filter(t => t.billable).reduce((s, t) => s + ((t.hours || 0) * (t.projects?.hourly_rate || 0)), 0);
 return { totalHours, billableHours, revenue };
 }, [timesheets]);

 // Group by client for invoice
 const invoiceData = useMemo(() => {
 const byClient = {};
 timesheets.filter(t => t.billable && t.projects?.client).forEach(t => {
 const key = t.projects.client;
 if (!byClient[key]) byClient[key] = { client: key, entries: [], totalHours: 0, totalRevenue: 0 };
 byClient[key].entries.push(t);
 byClient[key].totalHours += (t.hours || 0);
 byClient[key].totalRevenue += (t.hours || 0) * (t.projects?.hourly_rate || 0);
 });
 return Object.values(byClient).sort((a, b) => b.totalRevenue - a.totalRevenue);
 }, [timesheets]);

 const exportCSV = () => {
 const header = 'Tanggal,Karyawan,Proyek,Klien,Jam,Billable,Tarif,Revenue,Deskripsi\n';
 const rows = timesheets.map(t =>
 `${t.date},${t.employees?.name || ''},${t.projects?.name || ''},${t.projects?.client || ''},${t.hours || 0},${t.billable},${t.projects?.hourly_rate || 0},${(t.hours || 0) * (t.projects?.hourly_rate || 0)},${(t.description || '').replace(/,/g, ';')}`
 ).join('\n');
 const blob = new Blob([header + rows], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url; a.download = `timesheet_${new Date().toISOString().split('T')[0]}.csv`; a.click();
 };

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={6} />;
 return (
 <div>
 <PageHeader titleKey="timesheets.title" subtitleKey="timesheets.subtitle" />
  <div className="page-header-actions">
 <button className="btn-primary" onClick={exportCSV}><FiDownload /> Export CSV</button>
 </div>

 {/* Summary Cards */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
 <div className="info-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
 <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'rgba(59,130,246,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><FiClock size={22} /></div>
 <div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Jam</div>
 <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtH(summary.totalHours)}</div>
 </div>
 </div>
 <div className="info-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
 <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}><FiTrendingUp size={22} /></div>
 <div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>Billable Hours</div>
 <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtH(summary.billableHours)}</div>
 </div>
 </div>
 <div className="info-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
 <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}><FiDollarSign size={22} /></div>
 <div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>Revenue</div>
 <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(summary.revenue)}</div>
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="info-card" style={{ marginBottom: 20 }}>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
 <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
 <label style={{ fontSize: 11 }}>Proyek</label>
 <select className="form-input" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ fontSize: 12 }}>
 <option value="">Semua</option>
 {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
 </select>
 </div>
 <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
 <label style={{ fontSize: 11 }}>Karyawan</label>
 <select className="form-input" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} style={{ fontSize: 12 }}>
 <option value="">Semua</option>
 {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
 </select>
 </div>
 <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
 <label style={{ fontSize: 11 }}>Dari</label>
 <input type="date" className="form-input" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ fontSize: 12 }} />
 </div>
 <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
 <label style={{ fontSize: 11 }}>Sampai</label>
 <input type="date" className="form-input" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ fontSize: 12 }} />
 </div>
 <button className="btn-primary" onClick={applyFilter} style={{ height: 38 }}><FiFilter size={14} /> Filter</button>
 </div>
 </div>

 {/* Timesheet Table */}
 {loading ? (
 <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Memuat...</div>
 ) : (
 <div className="table-container" style={{ marginBottom: 24 }}>
 <table className="data-table">
 <thead>
 <tr>
 <th>Tanggal</th>
 <th>Karyawan</th>
 <th>Proyek</th>
 <th>Klien</th>
 <th>Mulai</th>
 <th>Selesai</th>
 <th>Jam</th>
 <th>Billable</th>
 <th>Revenue</th>
 <th>Deskripsi</th>
 </tr>
 </thead>
 <tbody>
 {timesheets.length === 0 ? (
 <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>Belum ada data timesheet</td></tr>
 ) : timesheets.map(t => (
 <tr key={t.id}>
 <td style={{ whiteSpace: 'nowrap' }}>{t.date}</td>
 <td style={{ fontWeight: 600 }}>{t.employees?.name || '—'}</td>
 <td>
 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
 <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.projects?.color || '#999' }} />
 {t.projects?.name || '—'}
 </span>
 </td>
 <td>{t.projects?.client || '—'}</td>
 <td style={{ fontSize: 12 }}>{t.start_time ? new Date(t.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
 <td style={{ fontSize: 12 }}>{t.end_time ? new Date(t.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : <span className="badge" style={{ background: 'rgba(16,185,129,.1)', color: 'var(--success)' }}>Berjalan</span>}</td>
 <td style={{ fontWeight: 600 }}>{t.hours ? fmtH(t.hours) : '—'}</td>
 <td>{t.billable ? '' : '—'}</td>
 <td style={{ fontWeight: 600 }}>{t.billable && t.hours ? fmt((t.hours || 0) * (t.projects?.hourly_rate || 0)) : '—'}</td>
 <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || ''}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {/* Invoice by Client */}
 {invoiceData.length > 0 && (
 <div>
 <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Ringkasan Tagihan per Klien</h2>
 <div className="cards-grid">
 {invoiceData.map(inv => (
 <div className="info-card" key={inv.client}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
 <div>
 <div style={{ fontSize: 15, fontWeight: 700 }}>{inv.client}</div>
 <div style={{ fontSize: 12, color: 'var(--muted)' }}>{inv.entries.length} entri</div>
 </div>
 <div style={{ textAlign: 'right' }}>
 <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>{fmt(inv.totalRevenue)}</div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtH(inv.totalHours)} billable</div>
 </div>
 </div>
 <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
 {[...new Set(inv.entries.map(e => e.projects?.name))].map((pName, i) => {
 const pEntries = inv.entries.filter(e => e.projects?.name === pName);
 const pHours = pEntries.reduce((s, e) => s + (e.hours || 0), 0);
 const pRev = pEntries.reduce((s, e) => s + (e.hours || 0) * (e.projects?.hourly_rate || 0), 0);
 return (
 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
 <span>{pName}</span>
 <span style={{ fontWeight: 600 }}>{fmtH(pHours)} → {fmt(pRev)}</span>
 </div>
 );
 })}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}
