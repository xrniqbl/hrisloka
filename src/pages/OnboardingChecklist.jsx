import { useState, useEffect, useCallback, useRef } from 'react';
import { FiUserPlus, FiCheck, FiX, FiPlusCircle, FiCheckCircle, FiClipboard } from 'react-icons/fi';
import * as onboardingService from '../services/onboardingService';
import * as employeeService from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { useRealtimeTable } from '../hooks/useRealtime';
import { useToast } from '../components/Toast';
import '../styles/shared.css';
import '../styles/admin.css';

const CATEGORIES = ['documents', 'training', 'equipment', 'access', 'orientation', 'general'];
const CAT_LABELS = { documents: 'Dokumen', training: 'Pelatihan', equipment: 'Peralatan', access: ' Access', orientation: 'Orientasi', general: 'Umum' };

export default function OnboardingChecklist() {
  const { employee } = useAuth();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);
 const [onboardings, setOnboardings] = useState([]);
 const [employees, setEmployees] = useState([]);
 const [loading, setLoading] = useState(true);
 const [modal, setModal] = useState(null);
 const [selectedOb, setSelectedOb] = useState(null);
 const [checklist, setChecklist] = useState([]);
 const [newEmpId, setNewEmpId] = useState('');

 // Group flat onboarding_tasks rows (per employee) into card-shaped groups
 // so the existing UI keeps working unchanged.
 const groupTasksByEmployee = (tasks = []) => {
   const map = new Map();
   for (const t of tasks) {
     const empId = t.employee_id;
     if (!map.has(empId)) {
       map.set(empId, {
         id: `emp-${empId}`,
         employee_id: empId,
         employees: t.employees || null,
         status: 'in-progress',
         target_completion: t.due_date || null,
         tasks: [],
       });
     }
     const g = map.get(empId);
     g.tasks.push(t);
     if (!g.employees && t.employees) g.employees = t.employees;
     if (!g.target_completion && t.due_date) g.target_completion = t.due_date;
   }
   return [...map.values()];
 };

 const fetchData = useCallback(async () => {
 setLoading(true);
 if (!employee?.company_id) {
   setOnboardings([]);
   setEmployees([]);
   setLoading(false);
   return;
 }
 try {
 const [taskRes, empRes] = await Promise.all([
 onboardingService.getAllOnboardingTasks(employee.company_id),
 employeeService.getAllEmployees(undefined, employee?.company_id),
 ]);
 if (taskRes.error) throw taskRes.error;
 if (empRes.error) throw empRes.error;
 // Attach employee details from the employee list (join may be partial)
 const empById = new Map((empRes.data || []).map((e) => [e.id, e]));
 const enriched = (taskRes.data || []).map((t) => ({
   ...t,
   employees: t.employees || empById.get(t.employee_id) || null,
 }));
 setOnboardings(groupTasksByEmployee(enriched));
 setEmployees(empRes.data || []);
 } catch (e) {
   console.error('[Onboarding] fetch failed:', e?.message || e);
   setOnboardings([]);
   toastRef.current.error('Gagal memuat data onboarding. Coba muat ulang.');
 } finally {
 setLoading(false);
 }
 }, [employee?.company_id]);

 useEffect(() => { fetchData(); }, [fetchData]);

 // Realtime: auto-refresh
 useRealtimeTable('onboarding_tasks', fetchData, { companyId: employee?.company_id });

 const openCreate = () => { setNewEmpId(''); setModal('create'); };

 const handleCreate = async () => {
 if (!newEmpId) return;
 try {
 const { error } = await onboardingService.seedOnboardingTasks(Number(newEmpId), employee?.company_id);
 if (error) throw error;
 setModal(null);
 toast.success('Onboarding dimulai.');
 fetchData();
 } catch (e) {
   console.error('[Onboarding] create failed:', e?.message || e);
   toast.error('Gagal memulai onboarding. Coba lagi.');
 }
 };

 const openDetail = async (ob) => {
 setSelectedOb(ob);
 if (Array.isArray(ob.tasks)) {
   setChecklist(ob.tasks);
   setModal('detail');
   return;
 }
 try {
 const { data, error } = await onboardingService.getOnboardingTasks(ob.employee_id);
 if (error) throw error;
 setChecklist(data || []);
 } catch (e) {
   console.error('[Onboarding] detail fetch failed:', e?.message || e);
   toast.error('Gagal memuat checklist onboarding.');
   setChecklist([]);
 }
 setModal('detail');
 };

 const toggleCheck = async (checkId, checked) => {
 const newStatus = checked ? 'pending' : 'done';
 setChecklist(prev => prev.map(c => c.id === checkId ? { ...c, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null } : c));
 const { error } = await onboardingService.updateTaskStatus(checkId, newStatus);
 if (error) {
   console.error('[Onboarding] toggle failed:', error.message);
   toast.error('Gagal memperbarui checklist. Coba lagi.');
   fetchData();
 }
 };

 const markComplete = async (id) => {
 const group = onboardings.find((o) => o.id === id);
 const empId = group?.employee_id ?? selectedOb?.employee_id;
 if (!empId) return;
 const pending = (checklist || []).filter((c) => c.status !== 'done');
 try {
 // Tandai semua task karyawan ini selesai via service (tabel onboarding_tasks)
 for (const t of pending) {
   const { error } = await onboardingService.updateTaskStatus(t.id, 'done');
   if (error) throw error;
 }
 setModal(null);
 toast.success('Onboarding selesai.');
 fetchData();
 } catch (e) {
   console.error('[Onboarding] complete failed:', e?.message || e);
   toast.error('Gagal menyelesaikan onboarding. Coba lagi.');
   fetchData();
 }
 };

 const getProgress = (ob) => {
 const items = ob.tasks || [];
 if (items.length === 0) return 0;
 return Math.round(items.filter(c => c.status === 'done').length / items.length * 100);
 };

 const getGroupStatus = (ob) => {
 const items = ob.tasks || [];
 if (items.length === 0) return 'in-progress';
 return items.every((c) => c.status === 'done') ? 'completed' : 'in-progress';
 };

 return (
 <div className="admin-page">
 <div className="page-header">
 <h1><FiUserPlus className="icon-mr" /> Onboarding Checklist</h1>
 <div className="page-header-actions">
 <button className="btn-primary" onClick={openCreate} aria-label="Mulai onboarding"><FiPlusCircle /> Mulai Onboarding</button>
 </div>
 </div>

 <div className="stats-grid">
 {loading ? Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="info-card skeleton" style={{ height: 160 }} />
 )) : onboardings.length === 0 ? (
 <div className="info-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
 <FiClipboard style={{ fontSize: 20, marginBottom: 8, opacity: 0.4 }} />
 <div>Belum ada proses onboarding.</div>
 </div>
 ) : onboardings.map(ob => {
 const progress = getProgress(ob);
 const groupStatus = getGroupStatus(ob);
 const emp = ob.employees;
 return (
 <div key={ob.id} className="info-card" onClick={() => openDetail({ ...ob, status: groupStatus })} style={{ cursor: 'pointer', transition: 'all 0.2s', borderLeft: `4px solid ${groupStatus === 'completed' ? 'var(--success)' : 'var(--primary)'}` }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
 <div>
 <div style={{ fontWeight: 700, fontSize: 15 }}>{emp?.name || '-'}</div>
 <div style={{ fontSize: 12, color: 'var(--muted)' }}>{emp?.division} - {emp?.position}</div>
 </div>
 <span style={{
 padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
 color: '#fff', background: groupStatus === 'completed' ? 'var(--success)' : 'var(--primary)',
 }}>
 {groupStatus === 'completed' ? 'Selesai' : 'Berlangsung'}
 </span>
 </div>
 <div className="progress-bar" style={{ marginBottom: 8 }}>
 <div className="progress-fill" style={{ width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'var(--primary)' }} />
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
 <span>{progress}% complete</span>
 <span>Target: {ob.target_completion || '-'}</span>
 </div>
 </div>
 );
 })}
 </div>

 {/* Create Modal */}
 {modal === 'create' && (
 <div className="modal-overlay" onClick={() => setModal(null)}>
 <div className="modal-box" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2>Mulai Onboarding Baru</h2>
 <button className="modal-close" onClick={() => setModal(null)}><FiX /></button>
 </div>
 <div className="modal-body">
 <div className="form-group">
 <label className="form-label">Karyawan Baru *</label>
 <select className="form-select" value={newEmpId} onChange={e => setNewEmpId(e.target.value)}>
 <option value="">- Pilih Karyawan -</option>
 {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} - {emp.division || ''}</option>)}
 </select>
 </div>
 <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
 Checklist dari template perusahaan akan ditambahkan otomatis. Anda bisa menambah/menghapus nanti.
 </p>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
 <button className="btn-primary" onClick={handleCreate} disabled={!newEmpId} aria-label="Mulai"><FiCheck /> Mulai</button>
 </div>
 </div>
 </div>
 )}

 {/* Detail Modal */}
 {modal === 'detail' && selectedOb && (
 <div className="modal-overlay" onClick={() => setModal(null)}>
 <div className="modal-box large" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2>Onboarding - {selectedOb.employees?.name}</h2>
 <button className="modal-close" onClick={() => setModal(null)}><FiX /></button>
 </div>
 <div className="modal-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
 {CATEGORIES.map(cat => {
 const items = checklist.filter(c => (c.category || 'general') === cat);
 if (items.length === 0) return null;
 const done = items.filter(c => c.status === 'done').length;
 return (
 <div key={cat} style={{ marginBottom: 20 }}>
 <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
 <span>{CAT_LABELS[cat]}</span>
 <span style={{ fontSize: 12, color: done === items.length ? 'var(--success)' : 'var(--muted)' }}>
 {done}/{items.length}
 </span>
 </div>
 {items.map(item => {
 const isDone = item.status === 'done';
 return (
 <div
 key={item.id}
 onClick={() => toggleCheck(item.id, isDone)}
 style={{
 display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
 background: isDone ? 'var(--success-light)' : 'var(--bg)',
 borderRadius: 'var(--radius-sm)', marginBottom: 6, cursor: 'pointer',
 border: `1px solid ${isDone ? 'var(--success)' : 'var(--border)'}`,
 transition: 'all 0.15s',
 }}
 >
 <div style={{
 width: 20, height: 20, borderRadius: 4,
 border: isDone ? 'none' : '2px solid var(--border)',
 background: isDone ? 'var(--success)' : 'transparent',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 color: '#fff', fontSize: 12, flexShrink: 0,
 }}>
 {isDone && <FiCheck />}
 </div>
 <span style={{
 fontSize: 13, flex: 1,
 textDecoration: isDone ? 'line-through' : 'none',
 color: isDone ? 'var(--muted)' : 'var(--text)',
 }}>
 {item.title || item.item}
 </span>
 {item.completed_at && (
 <span style={{ fontSize: 10, color: 'var(--muted)' }}>
 {new Date(item.completed_at).toLocaleDateString('id-ID')}
 </span>
 )}
 </div>
 );
 })}
 </div>
 );
 })}
 </div>
 {selectedOb.status !== 'completed' && (
 <div className="modal-footer">
 <button className="btn-primary" onClick={() => markComplete(selectedOb.id)} disabled={checklist.some(c => c.status !== 'done')}>
 <FiCheckCircle /> Tandai Selesai
 </button>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}


