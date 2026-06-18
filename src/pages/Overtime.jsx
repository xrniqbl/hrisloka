import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import { FiPlus, FiCheck, FiX, FiClock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import * as overtimeService from '../services/overtimeService';
import * as employeeService from '../services/employeeService';
import { calculateOvertimePay } from '../lib/payrollEngine';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

export default function Overtime() {
  const { t } = useTranslation();
 const { employee } = useAuth();
 const [records, setRecords] = useState([]);
 const [employees, setEmployees] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [filter, setFilter] = useState('');
 const [form, setForm] = useState({ employeeId: '', date: '', hours: '', rate: '1.5', reason: '' });

 useEffect(() => { if (employee?.company_id) fetchData(); }, [employee?.company_id]);

 const fetchData = async () => {
 setLoading(true);
 const { data: otData } = await overtimeService.getAllOvertime(undefined, employee?.company_id);
 const { data: empData } = await employeeService.getAllEmployees(undefined, employee?.company_id);
 setRecords(otData || []);
 setEmployees(empData || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('overtime', fetchData);

 const filtered = records.filter((r) => !filter || r.status === filter);

 const handleApprove = async (id) => {
 await overtimeService.approveOvertime(id, employee?.id);
 fetchData();
 };
 const handleReject = async (id) => {
 await overtimeService.rejectOvertime(id);
 fetchData();
 };

 const handleSubmit = async () => {
 await overtimeService.submitOvertime(Number(form.employeeId), {
 date: form.date,
 hours: Number(form.hours),
 rate: Number(form.rate),
 reason: form.reason,
 });
 setShowForm(false);
 setForm({ employeeId: '', date: '', hours: '', rate: '1.5', reason: '' });
 fetchData();
 };

 const getEmp = (id) => employees.find(e => e.id === id);

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={5} />;
 return (
 <div>
 <div className="page-header">
 <h1>{t('overtime.title')}</h1>
 <button className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> Catat Lembur</button>
 </div>

 {/* Summary Cards */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
 <div className="info-card">
 <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Total Jam Lembur (Approved)</div>
 <div style={{ fontSize: 24, fontWeight: 700 }}>{records.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.hours || 0), 0)} jam</div>
 </div>
 <div className="info-card">
 <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Menunggu Approval</div>
 <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)' }}>{records.filter(r => r.status === 'pending').length}</div>
 </div>
 <div className="info-card">
 <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Total Biaya Lembur</div>
 <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
 {formatCurrency(records.filter(r => r.status === 'approved').reduce((s, r) => {
 const emp = getEmp(r.employee_id);
 return s + (emp ? calculateOvertimePay(emp.baseSalary || emp.base_salary || 0, Number(r.hours), Number(r.rate)) : 0);
 }, 0))}
 </div>
 </div>
 </div>

 <div className="filters-bar">
 <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
 <option value="">Semua Status</option>
 <option value="pending">Pending</option>
 <option value="approved">Approved</option>
 <option value="rejected">Rejected</option>
 </select>
 </div>

 <div className="data-table-card">
 <div className="table-responsive">
 <table className="data-table">
 <thead>
 <tr>
 <th>Karyawan</th>
 <th>Tanggal</th>
 <th>Jam Lembur</th>
 <th>Rate</th>
 <th>Biaya Lembur</th>
 <th>Alasan</th>
 <th>Status</th>
 <th>Aksi</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((ot) => {
 const emp = ot.employees || getEmp(ot.employee_id);
 const pay = emp ? calculateOvertimePay(emp.baseSalary || emp.base_salary || 0, Number(ot.hours), Number(ot.rate)) : 0;
 return (
 <tr key={ot.id}>
 <td>
 <div className="employee-cell">
 <div className="employee-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
 {(emp?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
 </div>
 <div className="employee-name">{emp?.name || '-'}</div>
 </div>
 </td>
 <td style={{ fontSize: 12 }}>{new Date(ot.date).toLocaleDateString('id-ID')}</td>
 <td style={{ fontWeight: 600 }}>{ot.hours} jam</td>
 <td><span className="chart-card-badge">{ot.rate}x</span></td>
 <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(pay)}</td>
 <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ot.reason}</td>
 <td><span className={`status-badge ${ot.status}`}>
 {ot.status === 'pending' ? 'Pending' : ot.status === 'approved' ? 'Approved' : 'Rejected'}
 </span></td>
 <td>
 {ot.status === 'pending' ? (
 <div className="actions-cell">
 <button className="action-btn" title="Approve" onClick={() => handleApprove(ot.id)} style={{ color: 'var(--success)' }}><FiCheck /></button>
 <button className="action-btn danger" title="Reject" onClick={() => handleReject(ot.id)}><FiX /></button>
 </div>
 ) : <span style={{ fontSize: 12, color: 'var(--muted)' }}>-</span>}
 </td>
 </tr>
 );
 })}
 {filtered.length === 0 && (
 <tr><td colSpan={8} className="empty-state">Belum ada data lembur.</td></tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Add Overtime Modal */}
 {showForm && (
 <div className="modal-overlay" onClick={() => setShowForm(false)}>
 <div className="modal-box" onClick={(e) => e.stopPropagation()}>
 <div className="modal-header">
 <h2>Catat Lembur</h2>
 <button className="modal-close" onClick={() => setShowForm(false)}><FiX /></button>
 </div>
 <div className="modal-body">
 <div className="form-grid">
 <div className="form-group">
 <label className="form-label">Karyawan</label>
 <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
 <option value="">Pilih Karyawan</option>
 {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
 </select>
 </div>
 <div className="form-group">
 <label className="form-label">Tanggal</label>
 <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
 </div>
 <div className="form-group">
 <label className="form-label">Jam Lembur</label>
 <input className="form-input" type="number" step="0.5" min="0.5" max="12" placeholder="2.5" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} />
 </div>
 <div className="form-group">
 <label className="form-label">Rate Multiplier</label>
 <select className="form-select" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })}>
 <option value="1.5">1.5x (Hari Kerja)</option>
 <option value="2.0">2.0x (Weekend / Libur)</option>
 </select>
 </div>
 <div className="form-group full-width">
 <label className="form-label">Alasan</label>
 <textarea className="form-textarea" placeholder="Alasan lembur..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
 </div>
 </div>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
 <button className="btn-primary" onClick={handleSubmit} disabled={!form.employeeId || !form.date || !form.hours}>Simpan</button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
