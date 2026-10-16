import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import { FiPlus, FiX, FiUserMinus, FiCheckSquare, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import * as offboardingService from '../services/offboardingService';
import { useAuth } from '../context/AuthContext';
import * as employeeService from '../services/employeeService';

import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import FormDateField from '../components/FormDateField';

const statusColors = { initiated: '#F59E0B', 'in-progress': '#635BFF', completed: '#16A34A' };
const statusLabels = { initiated: 'Initiated', 'in-progress': 'In Progress', completed: 'Completed' };
const typeLabels = { resign: 'Resign', 'contract-end': 'Habis Kontrak', terminated: 'Terminated' };

export default function Offboarding() {
  const { t } = useTranslation();
  const { employee } = useAuth();
 const [records, setRecords] = useState([]);
 const [employees, setEmployees] = useState([]);
 const [loading, setLoading] = useState(true);
 const [modal, setModal] = useState(null);
 const [selected, setSelected] = useState(null);
 const [form, setForm] = useState({ employeeId: '', type: 'resign', reason: '', lastWorkingDay: '' });

 const fetchData = async () => {
 setLoading(true);
 const { data: offData } = await offboardingService.getAllOffboarding(employee?.company_id);
 const { data: empData } = await employeeService.getAllEmployees(undefined, employee?.company_id);
 setRecords(offData || []);
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

 // Realtime: auto-refresh
 useRealtimeTable('offboarding', fetchData, { companyId: employee?.company_id });

 const stats = [
 { label: 'Total Offboarding', value: records.length, color: '#635BFF' },
 { label: 'Initiated', value: records.filter(r => r.status === 'initiated').length, color: '#F59E0B' },
 { label: 'In Progress', value: records.filter(r => r.status === 'in-progress').length, color: '#635BFF' },
 { label: 'Completed', value: records.filter(r => r.status === 'completed').length, color: '#16A34A' },
 ];

 const openInitiate = () => { setForm({ employeeId: '', type: 'resign', reason: '', lastWorkingDay: '' }); setModal('initiate'); };
 const openClearance = (r) => { setSelected({ ...r }); setModal('clearance'); };
 const closeModal = () => { setModal(null); setSelected(null); };

 const handleInitiate = async () => {
 const { error } = await offboardingService.createOffboarding({
 employee_id: Number(form.employeeId),
 type: form.type,
 reason: form.reason,
 last_working_day: form.lastWorkingDay,
 });
 if (!error) {
 closeModal();
 fetchData();
 }
 };

 const toggleChecklist = async (idx) => {
 if (!selected) return;
 const checklist = selected.offboarding_checklist || [];
 const item = checklist[idx];
 if (!item) return;

 await offboardingService.toggleChecklistItem(item.id, !item.completed);

 // Refetch
 const { data } = await offboardingService.getOffboardingById(selected.id);
 if (data) {
 setSelected(data);
 fetchData();
 }
 };

 const getEmpName = (id) => employees.find(e => e.id === id)?.name || '-';
 const getEmpDiv = (id) => employees.find(e => e.id === id)?.division || '';

 const checklist = selected?.offboarding_checklist || [];
 const completedCount = checklist.filter(c => c.completed).length;
 const totalCount = checklist.length;

  if (loading) return <PageSkeleton hasStats={false} tableRows={6} tableCols={5} />;
 return (
 <div className="admin-page">
 <div className="page-header">
 <h1>{t('offboarding.title')}</h1>
 <div className="page-header-actions">
 <Button onClick={openInitiate}><FiPlus /> Initiate Offboarding</Button>
 </div>
 </div>

 <div className="stats-grid">
 {stats.map(s => (
 <div key={s.label} className="info-card">
 <div className="info-card-label">{s.label}</div>
 <div className="info-card-value" style={{ color: s.color }}>{s.value}</div>
 </div>
 ))}
 </div>

 <div className="data-table-card">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Karyawan</TableHead>
 <TableHead>Divisi</TableHead>
 <TableHead>Tipe</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Tanggal Inisiasi</TableHead>
 <TableHead>Hari Terakhir</TableHead>
 <TableHead>Clearance</TableHead>
 <TableHead>Aksi</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {records.map(r => {
 const cl = r.offboarding_checklist || [];
 const done = cl.filter(c => c.completed).length;
 const total = cl.length;
 return (
 <TableRow key={r.id}>
 <TableCell className="td-semibold">{r.employees?.name || getEmpName(r.employee_id)}</TableCell>
 <TableCell>{r.employees?.division || getEmpDiv(r.employee_id)}</TableCell>
 <TableCell>
 <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.type === 'resign' ? '#FFF7ED' : '#F0EEFF', color: r.type === 'resign' ? '#EA580C' : '#635BFF' }}>
 {typeLabels[r.type] || r.type}
 </span>
 </TableCell>
 <TableCell>
 <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: statusColors[r.status] || '#999' }}>
 {statusLabels[r.status] || r.status}
 </span>
 </TableCell>
 <TableCell style={{ fontSize: 13 }}>{r.initiated_date || new Date(r.created_at).toLocaleDateString('id-ID')}</TableCell>
 <TableCell style={{ fontSize: 13 }}>{r.last_working_day || '-'}</TableCell>
 <TableCell>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 <div className="progress-bar" style={{ width: 80 }}>
 <div className="progress-fill" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, background: done === total && total > 0 ? '#16A34A' : '#635BFF' }} />
 </div>
 <span style={{ fontSize: 12, fontWeight: 600 }}>{done}/{total}</span>
 </div>
 </TableCell>
 <TableCell>
 <button className="action-btn" title="Clearance" onClick={() => openClearance(r)} aria-label="Clearance"><FiCheckSquare /></button>
 </TableCell>
 </TableRow>
 );
 })}
 {records.length === 0 && (
 <TableRow>
 <TableCell colSpan={8} style={{ padding: 0, border: 'none' }}>
  <EmptyState
    title="Belum ada data offboarding"
    description="Proses offboarding karyawan akan muncul di sini."
    ctaLabel="Muat ulang"
    onCta={fetchData}
    size="sm"
  />
 </TableCell>
</TableRow>
 )}
 </TableBody>
 </Table>
 </div>

 {/* Initiate Offboarding Modal */}
 {modal === 'initiate' && (
 <Dialog open={modal === 'initiate'} onOpenChange={(open) => !open && closeModal()}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle><FiUserMinus style={{ marginRight: 8 }} /> Initiate Offboarding</DialogTitle>
 </DialogHeader>
 <div className="form-grid">
 <div className="form-group">
 <Label>Karyawan</Label>
 <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
 <option value="">- Pilih Karyawan -</option>
 {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} - {emp.division}</option>)}
 </select>
 </div>
 <div className="form-group">
 <Label>Tipe</Label>
 <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
 <option value="resign">Resign</option>
 <option value="contract-end">Habis Kontrak</option>
 <option value="terminated">Terminated</option>
 </select>
 </div>
 <div className="form-group full-width">
 <Label>Alasan</Label>
 <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Alasan resign / pemutusan kontrak" />
 </div>
 <div className="form-group">
 <Label>Hari Kerja Terakhir</Label>
 <FormDateField value={form.lastWorkingDay} onChange={(v) => setForm({ ...form, lastWorkingDay: v })} placeholder="Hari terakhir" />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={closeModal}>Batal</Button>
 <Button variant="destructive" onClick={handleInitiate} disabled={!form.employeeId || !form.lastWorkingDay}>
 <FiAlertTriangle /> Initiate Offboarding
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 )}

 {/* Clearance Checklist Modal */}
 {modal === 'clearance' && selected && (
 <Dialog open={modal === 'clearance'} onOpenChange={(open) => !open && closeModal()}>
 <DialogContent className="max-w-3xl">
 <DialogHeader>
 <DialogTitle><FiCheckSquare style={{ marginRight: 8 }} /> Exit Clearance - {selected.employees?.name || getEmpName(selected.employee_id)}</DialogTitle>
 </DialogHeader>
 <div className="form-grid" style={{ marginBottom: 20 }}>
 <div className="form-group">
 <label className="form-label" style={{ color: 'var(--muted)' }}>Tipe</label>
 <div style={{ fontSize: 14, fontWeight: 600 }}>{typeLabels[selected.type] || selected.type}</div>
 </div>
 <div className="form-group">
 <label className="form-label" style={{ color: 'var(--muted)' }}>Status</label>
 <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff', background: statusColors[selected.status], display: 'inline-block' }}>{statusLabels[selected.status]}</span>
 </div>
 <div className="form-group">
 <label className="form-label" style={{ color: 'var(--muted)' }}>Hari Terakhir</label>
 <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.last_working_day || '-'}</div>
 </div>
 <div className="form-group">
 <label className="form-label" style={{ color: 'var(--muted)' }}>Alasan</label>
 <div style={{ fontSize: 14 }}>{selected.reason || '-'}</div>
 </div>
 </div>

 {/* Progress */}
 <div style={{ marginBottom: 16 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
 <span>Clearance Progress</span>
 <span>{completedCount}/{totalCount}</span>
 </div>
 <div className="progress-bar" style={{ height: 10 }}>
 <div className="progress-fill" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`, background: completedCount === totalCount && totalCount > 0 ? '#16A34A' : '#635BFF' }} />
 </div>
 </div>

 {/* Checklist */}
 <div style={{ display: 'grid', gap: 8 }}>
 {checklist.map((c, idx) => (
 <div key={c.id || idx}
 onClick={() => toggleChecklist(idx)}
 className={c.completed ? 'checklist-item checklist-item--done' : 'checklist-item'}
 style={{
 display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
 background: c.completed ? '#F0FDF4' : 'var(--bg)', borderRadius: 'var(--radius-sm)',
 cursor: 'pointer', border: `1px solid ${c.completed ? '#BBF7D0' : 'var(--border)'}`,
 transition: 'all 0.2s ease'
 }}
 >
 <div style={{
 width: 22, height: 22, borderRadius: 6,
 border: `2px solid ${c.completed ? '#16A34A' : 'var(--border)'}`,
 background: c.completed ? '#16A34A' : 'transparent',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 transition: 'all 0.2s ease', flexShrink: 0
 }}>
 {c.completed && <FiCheck color="#fff" size={14} />}
 </div>
 <div style={{ flex: 1 }}>
 <div style={{ fontSize: 14, fontWeight: 600, textDecoration: c.completed ? 'line-through' : 'none', color: c.completed ? 'var(--muted)' : 'var(--text)' }}>
 {c.item}
 </div>
 </div>
 </div>
 ))}
 </div>
 </DialogContent>
 </Dialog>
 )}
 </div>
 );
}


