import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import { FiPlus, FiCheck, FiX, FiClock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import * as overtimeService from '../services/overtimeService';
import * as employeeService from '../services/employeeService';
import { calculateOvertimePay } from '../lib/payrollEngine';
import { useRealtimeTable } from '../hooks/useRealtime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPanel, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

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

 const fetchData = async () => {
 setLoading(true);
 const { data: otData } = await overtimeService.getAllOvertime(undefined, employee?.company_id);
 const { data: empData } = await employeeService.getAllEmployees(undefined, employee?.company_id);
 setRecords(otData || []);
 setEmployees(empData || []);
 setLoading(false);
 };

 useEffect(() => {
 if (!employee?.company_id) {
 setLoading(false);
 return;
 }
 fetchData();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [employee?.company_id]);

 // Realtime: auto-refresh (table name must match Supabase)
 useRealtimeTable('overtime_requests', fetchData, { companyId: employee?.company_id, enabled: !!employee?.company_id });

 const filtered = records.filter((r) => !filter || r.status === filter);

 const handleApprove = async (id) => {
 if (!employee?.company_id) return;
 await overtimeService.approveOvertime(id, employee?.id, employee.company_id);
 fetchData();
 };
 const handleReject = async (id) => {
 if (!employee?.company_id) return;
 await overtimeService.rejectOvertime(id, employee.company_id);
 fetchData();
 };

 const handleSubmit = async () => {
 const empId = form.employeeId || employee?.id;
 if (!empId || !form.date || !form.hours) return;
 await overtimeService.submitOvertime(empId, {
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
 <Button className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> Catat Lembur</Button>
 </div>

 {/* Summary Cards */}
 <div className="stats-grid">
 <div className="info-card">
 <div className="info-card-label">Total Jam Lembur (Approved)</div>
 <div className="info-card-value">{records.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.hours || 0), 0)} jam</div>
 </div>
 <div className="info-card">
 <div className="info-card-label">Menunggu Approval</div>
 <div className="info-card-value warning">{records.filter(r => r.status === 'pending').length}</div>
 </div>
 <div className="info-card">
 <div className="info-card-label">Total Biaya Lembur</div>
 <div className="info-card-value primary">
 {formatCurrency(records.filter(r => r.status === 'approved').reduce((s, r) => {
 const emp = getEmp(r.employee_id);
 return s + (emp ? calculateOvertimePay(emp.baseSalary || emp.base_salary || 0, Number(r.hours), Number(r.rate)) : 0);
 }, 0))}
 </div>
 </div>
 </div>

﻿ <div className="filters-bar">
 <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value)}>
 <option value="">Semua Status</option>
 <option value="pending">Pending</option>
 <option value="approved">Approved</option>
 <option value="rejected">Rejected</option>
 </NativeSelect>
 </div>

 <div className="data-table-card">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Karyawan</TableHead>
 <TableHead>Tanggal</TableHead>
 <TableHead>Jam Lembur</TableHead>
 <TableHead>Rate</TableHead>
 <TableHead>Biaya Lembur</TableHead>
 <TableHead>Alasan</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Aksi</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filtered.map((ot) => {
 const emp = ot.employees || getEmp(ot.employee_id);
 const pay = emp ? calculateOvertimePay(emp.baseSalary || emp.base_salary || 0, Number(ot.hours), Number(ot.rate)) : 0;
 return (
 <TableRow key={ot.id}>
 <TableCell>
 <div className="employee-cell">
 <div className="employee-avatar sm">
 {(emp?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
 </div>
 <div className="employee-name">{emp?.name || '-'}</div>
 </div>
 </TableCell>
 <TableCell className="td-sm">{new Date(ot.date).toLocaleDateString('id-ID')}</TableCell>
 <TableCell className="td-semibold">{ot.hours} jam</TableCell>
 <TableCell><span className="chart-card-badge">{ot.rate}x</span></TableCell>
 <TableCell className="td-primary-bold">{formatCurrency(pay)}</TableCell>
 <TableCell className="td-truncate">{ot.reason}</TableCell>
 <TableCell><span className={`status-badge ${ot.status}`}>
 {ot.status === 'pending' ? 'Pending' : ot.status === 'approved' ? 'Approved' : 'Rejected'}
 </span></TableCell>
 <TableCell>
 {ot.status === 'pending' ? (
 <div className="actions-cell">
 <Button variant="ghost" size="icon" className="action-btn success" title="Approve" onClick={() => handleApprove(ot.id)}><FiCheck /></Button>
 <Button variant="ghost" size="icon" className="action-btn danger" title="Reject" onClick={() => handleReject(ot.id)}><FiX /></Button>
 </div>
 ) : <span className="td-muted-sm">-</span>}
 </TableCell>
 </TableRow>
 );
 })}
 {filtered.length === 0 && (
 <TableRow>
  <TableCell colSpan={8} style={{ padding: 0, border: 'none' }}>
   <EmptyState
     title="Belum ada data lembur"
     description="Pengajuan lembur karyawan akan muncul di sini setelah diajukan dari PWA."
     ctaLabel="Muat ulang"
     onCta={fetchData}
     secondaryLabel="Pusat persetujuan"
     onSecondary={() => { window.location.href = '/approvals'; }}
     size="sm"
   />
  </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>

 <Dialog open={showForm} onOpenChange={setShowForm}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Catat Lembur</DialogTitle>
 </DialogHeader>
 <DialogPanel>
 <div className="form-grid">
 <div className="form-group">
 <label className="form-label">Karyawan</label>
 <NativeSelect value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
 <option value="">Pilih Karyawan</option>
 {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
 </NativeSelect>
 </div>
 <div className="form-group">
 <label className="form-label">Tanggal</label>
 <DatePicker value={form.date} onChange={(value) => setForm({ ...form, date: value })} placeholder="Pilih tanggal lembur" />
 </div>
 <div className="form-group">
 <label className="form-label">Jam Lembur</label>
 <Input type="number" step="0.5" min="0.5" max="12" placeholder="2.5" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} />
 </div>
 <div className="form-group">
 <label className="form-label">Rate Multiplier</label>
 <NativeSelect value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })}>
 <option value="1.5">1.5x (Hari Kerja)</option>
 <option value="2.0">2.0x (Weekend / Libur)</option>
 </NativeSelect>
 </div>
 <div className="form-group full-width">
 <label className="form-label">Alasan</label>
 <Textarea placeholder="Alasan lembur..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
 </div>
 </div>
 </DialogPanel>
 <DialogFooter>
 <Button variant="outline" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</Button>
 <Button className="btn-primary" onClick={handleSubmit} disabled={!form.employeeId || !form.date || !form.hours}>Simpan</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 </div>
 );
}
