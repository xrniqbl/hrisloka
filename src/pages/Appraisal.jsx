import { useState, useEffect } from 'react';
import { FiPlus, FiX, FiCheck, FiStar, FiTrash2, FiEdit2, FiUser, FiUsers, FiAward } from 'react-icons/fi';
import * as appraisalService from '../services/appraisalService';
import { useAuth } from '../context/AuthContext';
import * as employeeService from '../services/employeeService';

import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import MetricStatCards from '../components/MetricStatCards';
import { ClipboardList, CheckCircle2, Hourglass, Star } from 'lucide-react';

const statusColors = { draft: '#6D8196', 'in-progress': '#F59E0B', completed: '#16A34A' };
const statusLabels = { draft: 'Draft', 'in-progress': 'Berlangsung', completed: 'Selesai' };

// Dynamic periods based on current year
const _currentYear = new Date().getFullYear();
const periods = [
 `Q1 ${_currentYear}`, `Q2 ${_currentYear}`, `Q3 ${_currentYear}`, `Q4 ${_currentYear}`,
 `H1 ${_currentYear}`, `H2 ${_currentYear}`, `Annual ${_currentYear}`,
];

// Group employees for reviewer selection
function groupReviewers(employees, selectedEmployeeId) {
 const selectedEmp = employees.find(e => e.id === Number(selectedEmployeeId));
 const groups = {
 manager: [],
 hr: [],
 sameDivision: [],
 otherDivision: [],
 };

 if (!selectedEmp) return groups;

 employees.forEach(emp => {
 if (emp.id === Number(selectedEmployeeId)) return; // exclude self

 // Manager (atasan langsung)
 if (selectedEmp.manager_id && emp.id === selectedEmp.manager_id) {
 groups.manager.push(emp);
 return;
 }

 // HR Admin
 if (emp.role === 'hr_admin' || emp.division === 'HR') {
 groups.hr.push(emp);
 return;
 }

 // Same division
 if (emp.division && emp.division === selectedEmp.division) {
 groups.sameDivision.push(emp);
 return;
 }

 // Other division
 groups.otherDivision.push(emp);
 });

 return groups;
}

export default function Appraisal() {
  const { employee } = useAuth();
 const [appraisals, setAppraisals] = useState([]);
 const [employees, setEmployees] = useState([]);
 const [loading, setLoading] = useState(true);
 const [modal, setModal] = useState(null);
 const [form, setForm] = useState({ employeeId: '', reviewerId: '', period: `Q1 ${_currentYear}`, rating: 3.5, status: 'in-progress', comments: '' });
 const [editingId, setEditingId] = useState(null);
 const [reviewerGroups, setReviewerGroups] = useState({ manager: [], hr: [], sameDivision: [], otherDivision: [] });

 useEffect(() => {
 if (!employee?.company_id) {
 setLoading(false);
 return;
 }
 fetchData();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [employee?.company_id]);

 const fetchData = async () => {
 setLoading(true);
 const [apRes, emRes] = await Promise.all([
 appraisalService.getAllAppraisals(employee?.company_id),
 employeeService.getAllEmployees(undefined, employee?.company_id),
 ]);
 setAppraisals(apRes.data || []);
 setEmployees(emRes.data || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('appraisals', fetchData, { companyId: employee?.company_id });

 // Update reviewer groups when employee changes
 useEffect(() => {
 if (form.employeeId) {
 setReviewerGroups(groupReviewers(employees, form.employeeId));
 }
 }, [form.employeeId, employees]);

 const openCreate = () => {
 setForm({ employeeId: '', reviewerId: '', period: `Q1 ${_currentYear}`, rating: 3.5, status: 'in-progress', comments: '' });
 setEditingId(null);
 setReviewerGroups({ manager: [], hr: [], sameDivision: [], otherDivision: [] });
 setModal('form');
 };

 const openEdit = (ap) => {
 setForm({
 employeeId: ap.employee_id,
 reviewerId: ap.reviewer_id || '',
 period: ap.period,
 rating: ap.rating,
 status: ap.status,
 comments: ap.comments || '',
 });
 setEditingId(ap.id);
 setModal('form');
 };

 const handleSubmit = async () => {
 if (!form.employeeId) return;
 const companyId = employee?.company_id;
 if (editingId) {
 await appraisalService.updateAppraisal(editingId, {
 rating: Number(form.rating),
 status: form.status,
 comments: form.comments,
 }, companyId);
 } else {
 await appraisalService.createAppraisal({
 employeeId: Number(form.employeeId),
 reviewerId: form.reviewerId ? Number(form.reviewerId) : null,
 period: form.period,
 rating: Number(form.rating),
 status: form.status,
 comments: form.comments,
 }, companyId);
 }
 setModal(null);
 fetchData();
 };

 const handleDelete = async (id) => {
 if (!confirm('Hapus appraisal ini?')) return;
 await appraisalService.deleteAppraisal(id, employee?.company_id);
 fetchData();
 };

 // Stats
 const completed = appraisals.filter(a => a.status === 'completed').length;
 const inProgress = appraisals.filter(a => a.status === 'in-progress').length;
 const avgRating = appraisals.length ? (appraisals.reduce((s, a) => s + a.rating, 0) / appraisals.length).toFixed(1) : '0';

 // Helpers
 const hasManager = reviewerGroups.manager.length > 0;
 const hasHR = reviewerGroups.hr.length > 0;
 const hasSameDivision = reviewerGroups.sameDivision.length > 0;
 const hasOtherDivision = reviewerGroups.otherDivision.length > 0;

 return (
 <div className="admin-page">
 <div className="page-header">
 <h1><FiStar className="icon-mr" /> Appraisal & Review</h1>
 <div className="page-header-actions">
 <button className="btn-primary" onClick={openCreate} aria-label="Buat appraisal"><FiPlus /> Buat Appraisal</button>
 </div>
 </div>

 <MetricStatCards items={[
 { key: 'total', label: 'Total Appraisal', value: appraisals.length, icon: ClipboardList },
 { key: 'done', label: 'Selesai', value: completed, icon: CheckCircle2 },
 { key: 'progress', label: 'Berlangsung', value: inProgress, icon: Hourglass },
 { key: 'rating', label: 'Rata-rata Rating', value: `${avgRating}/5`, icon: Star },
 ]} />

 {loading ? (
 <div className="data-table-card" style={{ padding: 24 }}>
 <TableSkeleton rows={4} cols={6} />
 </div>
 ) : appraisals.length === 0 ? (
 <EmptyState
 title="Belum ada data appraisal"
 description="Buat appraisal pertama untuk menilai kinerja karyawan."
 ctaLabel="Buat appraisal"
 onCta={openCreate}
 />
 ) : (
 <div className="data-table-card">
 <div className="table-responsive">
 <table className="data-table">
 <thead>
 <tr>
 <th>Karyawan</th>
 <th>Periode</th>
 <th style={{ textAlign: 'center' }}>Rating</th>
 <th>Reviewer</th>
 <th>Komentar</th>
 <th>Status</th>
 <th>Aksi</th>
 </tr>
 </thead>
 <tbody>
 {appraisals.map((ap) => {
 const emp = ap.employees;
 const reviewer = ap.reviewer;
 return (
 <tr key={ap.id}>
 <td>
 <div className="employee-cell">
 <div className="employee-avatar sm">
 {(emp?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
 </div>
 <div>
 <div className="employee-name">{emp?.name || '-'}</div>
 <div className="employee-dept">{emp?.division || ''}</div>
 </div>
 </div>
 </td>
 <td><span className="period-label">{ap.period}</span></td>
 <td style={{ textAlign: 'center' }}>
 <div className="btn-icon-row" style={{ justifyContent: 'center' }}>
 <FiStar style={{ color: '#F59E0B', fill: '#F59E0B' }} size={14} />
 <span className="td-semibold">{ap.rating}</span>
 <span className="td-muted-sm">/5</span>
 </div>
 </td>
 <td>
 <div className="td-sm">
 {reviewer?.name || '-'}
 {emp?.manager_id && reviewer && emp.manager_id === reviewer.id ? (
 <span className="status-badge active" style={{ marginLeft: 6, fontSize: 9 }}>Atasan</span>
 ) : null}
 </div>
 </td>
 <td className="td-truncate td-muted-sm" style={{ maxWidth: 220 }}>{ap.comments}</td>
 <td>
 <span className="status-badge" style={{ background: statusColors[ap.status], color: '#fff' }}>
 {statusLabels[ap.status]}
 </span>
 </td>
 <td>
 <div className="actions-cell">
 <button className="action-btn" onClick={() => openEdit(ap)} title="Edit" aria-label="Edit appraisal"><FiEdit2 /></button>
 <button className="action-btn danger" onClick={() => handleDelete(ap.id)} title="Hapus" aria-label="Hapus appraisal"><FiTrash2 /></button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Create/Edit Appraisal Modal */}
 {modal === 'form' && (
 <div className="modal-overlay" onClick={() => setModal(null)}>
 <div className="modal-box large" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2>{editingId ? 'Edit Appraisal' : 'Buat Appraisal Baru'}</h2>
 <button className="modal-close" onClick={() => setModal(null)}><FiX /></button>
 </div>
 <div className="modal-body">
 <div className="form-grid">
 <div className="form-group">
 <label className="form-label">Karyawan *</label>
 <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value, reviewerId: '' })} disabled={!!editingId}>
 <option value="">-- Pilih Karyawan --</option>
 {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} - {emp.division || ''}</option>)}
 </select>
 </div>

 {/* Reviewer - Grouped Selection */}
 <div className="form-group">
 <label className="form-label">Reviewer</label>
 <select
 className="form-select"
 value={form.reviewerId}
 onChange={e => setForm({ ...form, reviewerId: e.target.value })}
 disabled={!form.employeeId}
 >
 <option value="">-- Pilih Reviewer --</option>

 {hasManager && (
 <optgroup label="Atasan Langsung (Recommended)">
 {reviewerGroups.manager.map(emp => (
 <option key={emp.id} value={emp.id}>
 {emp.name} - {emp.position || emp.division || 'Manager'}
 </option>
 ))}
 </optgroup>
 )}

 {hasHR && (
 <optgroup label="HR Department">
 {reviewerGroups.hr.map(emp => (
 <option key={emp.id} value={emp.id}>
 {emp.name} - {emp.position || 'HR'}
 </option>
 ))}
 </optgroup>
 )}

 {hasSameDivision && (
 <optgroup label="Sesama Divisi (Peer Review)">
 {reviewerGroups.sameDivision.map(emp => (
 <option key={emp.id} value={emp.id}>
 {emp.name} - {emp.position || emp.division}
 </option>
 ))}
 </optgroup>
 )}

 {hasOtherDivision && (
 <optgroup label="Divisi Lain (Cross-Department)">
 {reviewerGroups.otherDivision.map(emp => (
 <option key={emp.id} value={emp.id}>
 {emp.name} - {emp.position || emp.division}
 </option>
 ))}
 </optgroup>
 )}
 </select>

 {/* Reviewer info hint */}
 {form.employeeId && !form.reviewerId && (
 <div className="info-card td-sm" style={{ marginTop: 8, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E', lineHeight: 1.5 }}>
 <strong>Pilih reviewer:</strong>
 <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
 {hasManager && <li><strong>Atasan Langsung</strong> (recommended) - review oleh manager/supervisor langsung</li>}
 {hasHR && <li><strong>HR Department</strong> - review oleh tim HR</li>}
 {hasSameDivision && <li><strong>Peer Review</strong> - review oleh rekan kerja di divisi yang sama</li>}
 {hasOtherDivision && <li><strong>Cross-Dept</strong> - review oleh rekan dari divisi lain</li>}
 </ul>
 </div>
 )}

 {/* Show who was selected as reviewer */}
 {form.reviewerId && (() => {
 const rv = employees.find(e => e.id === Number(form.reviewerId));
 const selectedEmp = employees.find(e => e.id === Number(form.employeeId));
 const isManager = selectedEmp?.manager_id && rv?.id === selectedEmp.manager_id;

 return rv ? (
 <div className="btn-icon-row info-card td-sm" style={{
 marginTop: 8,
 background: isManager ? '#F0FDF4' : '#F0EEFF',
 border: `1px solid ${isManager ? '#BBF7D0' : '#C7D2FE'}`,
 }}>
 <div className="employee-avatar sm" style={{ background: isManager ? '#16A34A' : 'var(--primary)', color: '#fff' }}>
 {rv.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
 </div>
 <div>
 <div className="td-semibold">
 {rv.name}
 {isManager && <span className="status-badge active" style={{ marginLeft: 6, fontSize: 9 }}>Atasan Langsung</span>}
 </div>
 <div className="td-muted-sm">{rv.position || rv.division || '-'}</div>
 </div>
 </div>
 ) : null;
 })()}
 </div>

 <div className="form-group">
 <label className="form-label">Periode *</label>
 <select className="form-select" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
 {periods.map(p => <option key={p} value={p}>{p}</option>)}
 </select>
 </div>
 <div className="form-group">
 <label className="form-label">Rating (1-5): <strong className="text-warning">{form.rating}</strong></label>
 <input
 type="range" min={1} max={5} step={0.5}
 value={form.rating}
 onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
 style={{ width: '100%' }}
 />
 <div className="btn-icon-row td-muted-sm" style={{ justifyContent: 'space-between' }}>
 <span>Buruk</span><span>Cukup</span><span>Baik</span><span>Sangat Baik</span><span>Luar Biasa</span>
 </div>
 </div>
 <div className="form-group">
 <label className="form-label">Status</label>
 <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
 <option value="draft">Draft</option>
 <option value="in-progress">Berlangsung</option>
 <option value="completed">Selesai</option>
 </select>
 </div>
 <div className="form-group full-width">
 <label className="form-label">Komentar</label>
 <textarea
 className="form-textarea"
 value={form.comments}
 onChange={e => setForm({ ...form, comments: e.target.value })}
 placeholder="Evaluasi kinerja: kekuatan, area yang perlu ditingkatkan..."
 rows={4}
 style={{ resize: 'vertical', minHeight: 80 }}
 />
 </div>
 </div>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
 <button className="btn-primary" onClick={handleSubmit} disabled={!form.employeeId} aria-label="Simpan appraisal"><FiCheck /> {editingId ? 'Update' : 'Simpan'}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}


