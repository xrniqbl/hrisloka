import { useState, useEffect, useMemo } from 'react';
import { FiFilter, FiDownload, FiDollarSign, FiClock, FiTrendingUp } from 'react-icons/fi';
import * as projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import * as employeeService from '../services/employeeService';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import PageHeader from '../components/PageHeader';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { DatePicker } from '@/components/ui/date-picker';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

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

 const companyId = employee?.company_id;

 const fetchData = async () => {
 setLoading(true);
 if (!companyId) {
  setTimesheets([]); setProjects([]); setEmployees([]); setLoading(false);
  return;
 }
 const filters = {};
 if (filterProject) filters.projectId = filterProject;
 if (filterEmployee) filters.employeeId = filterEmployee;
 if (filterFrom) filters.dateFrom = filterFrom;
 if (filterTo) filters.dateTo = filterTo;
 const [t, p, e] = await Promise.all([
 projectService.getTimesheets(filters, companyId),
 projectService.getAllProjects(companyId),
 employeeService.getAllEmployees(undefined, companyId),
 ]);
 setTimesheets(t.data || []);
 setProjects(p.data || []);
 setEmployees(e.data || []);
 setLoading(false);
 };

 useEffect(() => {
  if (!companyId) {
   setLoading(false);
   return;
  }
  fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [companyId]);

 // Realtime: auto-refresh when new timesheet entries arrive
 useRealtimeTable('timesheets', fetchData, { companyId, enabled: !!companyId });

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
 <div className="admin-page">
 <PageHeader titleKey="timesheets.title" subtitleKey="timesheets.subtitle" />
  <div className="page-header-actions">
 <Button className="btn-primary" onClick={exportCSV}><FiDownload /> Export CSV</Button>
 </div>

 {/* Summary Cards */}
 <div className="stats-grid">
 <div className="info-card info-card--flex">
 <div className="info-card-icon info-card-icon--primary"><FiClock size={22} /></div>
 <div>
 <div className="info-card-label">Total Jam</div>
 <div className="info-card-value">{fmtH(summary.totalHours)}</div>
 </div>
 </div>
 <div className="info-card info-card--flex">
 <div className="info-card-icon info-card-icon--success"><FiTrendingUp size={22} /></div>
 <div>
 <div className="info-card-label">Billable Hours</div>
 <div className="info-card-value">{fmtH(summary.billableHours)}</div>
 </div>
 </div>
 <div className="info-card info-card--flex">
 <div className="info-card-icon info-card-icon--warning"><FiDollarSign size={22} /></div>
 <div>
 <div className="info-card-label">Revenue</div>
 <div className="info-card-value">{fmt(summary.revenue)}</div>
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="info-card mb-sm">
 <div className="filter-row">
 <div className="form-group filter-field">
 <label className="section-label">Proyek</label>
 <NativeSelect size="sm" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
 <option value="">Semua</option>
 {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
 </NativeSelect>
 </div>
 <div className="form-group filter-field">
 <label className="section-label">Karyawan</label>
 <NativeSelect size="sm" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
 <option value="">Semua</option>
 {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
 </NativeSelect>
 </div>
 <div className="form-group filter-field-sm">
 <label className="section-label">Dari</label>
 <DatePicker value={filterFrom} onChange={setFilterFrom} placeholder="Dari tanggal" buttonClassName="td-sm" />
 </div>
 <div className="form-group filter-field-sm">
 <label className="section-label">Sampai</label>
 <DatePicker value={filterTo} onChange={setFilterTo} placeholder="Sampai tanggal" buttonClassName="td-sm" />
 </div>
 <Button className="btn-primary btn-filter" onClick={applyFilter}><FiFilter size={14} /> Filter</Button>
 </div>
 </div>

 {/* Timesheet Table */}
 {loading ? (
 <div className="ep-loading-wrap"><div className="ep-loading-inner"><div className="ep-loading-text">Memuat...</div></div></div>
 ) : (
 <div className="data-table-card mb">
 <Table>
 <TableHeader><TableRow>
 {['Tanggal','Karyawan','Proyek','Klien','Mulai','Selesai','Jam','Billable','Revenue','Deskripsi'].map(h => <TableHead key={h}>{h}</TableHead>)}
 </TableRow></TableHeader>
 <TableBody>
 {timesheets.length === 0 ? (
 <TableRow>
  <TableCell colSpan={10} style={{ padding: 0, border: 'none' }}>
   <EmptyState
     title="Belum ada data timesheet"
     description="Catatan jam kerja karyawan dari PWA akan muncul di sini."
     ctaLabel="Muat ulang"
     onCta={fetchData}
     size="sm"
   />
  </TableCell>
 </TableRow>
 ) : timesheets.map(t => (
 <TableRow key={t.id}>
 <TableCell className="td-truncate">{t.date}</TableCell>
 <TableCell className="td-semibold">{t.employees?.name || '-'}</TableCell>
 <TableCell><span className="td-project-cell"><span style={{ width: 8, height: 8, borderRadius: '50%', background: t.projects?.color || '#999' }} />{t.projects?.name || '-'}</span></TableCell>
 <TableCell>{t.projects?.client || '-'}</TableCell>
 <TableCell className="td-sm">{t.start_time ? new Date(t.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
 <TableCell className="td-sm">{t.end_time ? new Date(t.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : <span className="badge badge--success">Berjalan</span>}</TableCell>
 <TableCell className="td-semibold">{t.hours ? fmtH(t.hours) : '-'}</TableCell>
 <TableCell>{t.billable ? '' : '-'}</TableCell>
 <TableCell className="td-semibold">{t.billable && t.hours ? fmt((t.hours || 0) * (t.projects?.hourly_rate || 0)) : '-'}</TableCell>
 <TableCell className="td-sm td-truncate">{t.description || ''}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}

 {/* Invoice by Client */}
 {invoiceData.length > 0 && (
 <div>
 <h2 className="chart-card-title mb">Ringkasan Tagihan per Klien</h2>
 <div className="cards-grid">
 {invoiceData.map(inv => (
 <div className="info-card" key={inv.client}>
 <div className="invoice-card-header">
 <div>
 <div className="td-semibold">{inv.client}</div>
 <div className="td-muted-sm">{inv.entries.length} entri</div>
 </div>
 <div className="text-right">
 <div className="info-card-value success">{fmt(inv.totalRevenue)}</div>
 <div className="td-muted-sm">{fmtH(inv.totalHours)} billable</div>
 </div>
 </div>
 <div className="invoice-card-breakdown">
 {[...new Set(inv.entries.map(e => e.projects?.name))].map((pName, i) => {
 const pEntries = inv.entries.filter(e => e.projects?.name === pName);
 const pHours = pEntries.reduce((s, e) => s + (e.hours || 0), 0);
 const pRev = pEntries.reduce((s, e) => s + (e.hours || 0) * (e.projects?.hourly_rate || 0), 0);
 return (
 <div key={i} className="invoice-project-row">
 <span>{pName}</span>
 <span className="td-semibold">{fmtH(pHours)} &rarr; {fmt(pRev)}</span>
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


