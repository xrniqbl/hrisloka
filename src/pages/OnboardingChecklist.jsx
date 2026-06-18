import { useState, useEffect } from 'react';
import { FiUserPlus, FiCheck, FiX, FiPlusCircle, FiSearch, FiCheckCircle, FiClipboard } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import * as employeeService from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';

const CATEGORIES = ['documents', 'training', 'equipment', 'access', 'orientation'];
const CAT_LABELS = { documents: 'Dokumen', training: 'Pelatihan', equipment: 'Peralatan', access: ' Access', orientation: 'Orientasi' };
const DEFAULT_CHECKLIST = [
 { category: 'documents', item: 'KTP / ID Card' },
 { category: 'documents', item: 'NPWP' },
 { category: 'documents', item: 'Ijazah / Sertifikat' },
 { category: 'documents', item: 'Surat Perjanjian Kerja' },
 { category: 'documents', item: 'Rekening Bank' },
 { category: 'training', item: 'Company Overview & Culture' },
 { category: 'training', item: 'SOP & Kebijakan Perusahaan' },
 { category: 'training', item: 'Training Tools & Systems' },
 { category: 'equipment', item: 'Laptop / PC' },
 { category: 'equipment', item: 'ID Badge / Access Card' },
 { category: 'equipment', item: 'Email & Akun Sistem' },
 { category: 'access', item: 'Akses Supabase / Database' },
 { category: 'access', item: 'Akses Repository (GitHub)' },
 { category: 'access', item: 'VPN / Network Access' },
 { category: 'orientation', item: 'Tour Kantor' },
 { category: 'orientation', item: 'Perkenalan Tim' },
 { category: 'orientation', item: 'Mentoring Assignment' },
];

export default function OnboardingChecklist() {
  const { employee } = useAuth();
 const [onboardings, setOnboardings] = useState([]);
 const [employees, setEmployees] = useState([]);
 const [loading, setLoading] = useState(true);
 const [modal, setModal] = useState(null);
 const [selectedOb, setSelectedOb] = useState(null);
 const [checklist, setChecklist] = useState([]);
 const [newEmpId, setNewEmpId] = useState('');

 useEffect(() => { fetchData(); }, []);

 const fetchData = async () => {
 setLoading(true);
 const [obRes, empRes] = await Promise.all([
 supabase.from('onboarding').select('*, employees(name, division, position), onboarding_checklist(*)').order('created_at', { ascending: false }),
 employeeService.getAllEmployees(undefined, employee?.company_id),
 ]);
 setOnboardings(obRes.data || []);
 setEmployees(empRes.data || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('onboarding_checklists', fetchData);

 const openCreate = () => { setNewEmpId(''); setModal('create'); };

 const handleCreate = async () => {
 if (!newEmpId) return;
 const { data: ob } = await supabase.from('onboarding').insert({
 employee_id: Number(newEmpId),
 status: 'in-progress',
 target_completion: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
 }).select().single();
 if (ob) {
 const items = DEFAULT_CHECKLIST.map(c => ({ onboarding_id: ob.id, ...c }));
 await supabase.from('onboarding_checklist').insert(items);
 }
 setModal(null);
 fetchData();
 };

 const openDetail = async (ob) => {
 setSelectedOb(ob);
 const { data } = await supabase.from('onboarding_checklist').select('*').eq('onboarding_id', ob.id).order('category');
 setChecklist(data || []);
 setModal('detail');
 };

 const toggleCheck = async (checkId, checked) => {
 await supabase.from('onboarding_checklist').update({
 completed: !checked,
 completed_at: !checked ? new Date().toISOString() : null,
 }).eq('id', checkId);
 setChecklist(prev => prev.map(c => c.id === checkId ? { ...c, completed: !checked, completed_at: !checked ? new Date().toISOString() : null } : c));
 };

 const markComplete = async (id) => {
 await supabase.from('onboarding').update({ status: 'completed' }).eq('id', id);
 setModal(null);
 fetchData();
 };

 const getProgress = (ob) => {
 const items = ob.onboarding_checklist || [];
 if (items.length === 0) return 0;
 return Math.round(items.filter(c => c.completed).length / items.length * 100);
 };

 return (
 <div>
 <div className="page-header">
 <h1><FiUserPlus style={{ marginRight: 10 }} /> Onboarding Checklist</h1>
 <div className="page-header-actions">
 <button className="btn-primary" onClick={openCreate}><FiPlusCircle /> Mulai Onboarding</button>
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
 {loading ? Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="info-card skeleton" style={{ height: 160 }} />
 )) : onboardings.length === 0 ? (
 <div className="info-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
 <FiClipboard style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }} />
 <div>Belum ada proses onboarding.</div>
 </div>
 ) : onboardings.map(ob => {
 const progress = getProgress(ob);
 const emp = ob.employees;
 return (
 <div key={ob.id} className="info-card" onClick={() => openDetail(ob)} style={{ cursor: 'pointer', transition: 'all 0.2s', borderLeft: `4px solid ${ob.status === 'completed' ? 'var(--success)' : 'var(--primary)'}` }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
 <div>
 <div style={{ fontWeight: 700, fontSize: 15 }}>{emp?.name || '-'}</div>
 <div style={{ fontSize: 12, color: 'var(--muted)' }}>{emp?.division} - {emp?.position}</div>
 </div>
 <span style={{
 padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
 color: '#fff', background: ob.status === 'completed' ? 'var(--success)' : 'var(--primary)',
 }}>
 {ob.status === 'completed' ? 'Selesai' : 'Berlangsung'}
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
 Checklist default ({DEFAULT_CHECKLIST.length} item) akan ditambahkan otomatis. Anda bisa menambah/menghapus nanti.
 </p>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
 <button className="btn-primary" onClick={handleCreate} disabled={!newEmpId}><FiCheck /> Mulai</button>
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
 const items = checklist.filter(c => c.category === cat);
 if (items.length === 0) return null;
 const done = items.filter(c => c.completed).length;
 return (
 <div key={cat} style={{ marginBottom: 20 }}>
 <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
 <span>{CAT_LABELS[cat]}</span>
 <span style={{ fontSize: 12, color: done === items.length ? 'var(--success)' : 'var(--muted)' }}>
 {done}/{items.length}
 </span>
 </div>
 {items.map(item => (
 <div
 key={item.id}
 onClick={() => toggleCheck(item.id, item.completed)}
 style={{
 display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
 background: item.completed ? 'var(--success-light)' : 'var(--bg)',
 borderRadius: 'var(--radius-sm)', marginBottom: 6, cursor: 'pointer',
 border: `1px solid ${item.completed ? 'var(--success)' : 'var(--border)'}`,
 transition: 'all 0.15s',
 }}
 >
 <div style={{
 width: 20, height: 20, borderRadius: 4,
 border: item.completed ? 'none' : '2px solid var(--border)',
 background: item.completed ? 'var(--success)' : 'transparent',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 color: '#fff', fontSize: 12, flexShrink: 0,
 }}>
 {item.completed && <FiCheck />}
 </div>
 <span style={{
 fontSize: 13, flex: 1,
 textDecoration: item.completed ? 'line-through' : 'none',
 color: item.completed ? 'var(--muted)' : 'var(--text)',
 }}>
 {item.item}
 </span>
 {item.completed_at && (
 <span style={{ fontSize: 10, color: 'var(--muted)' }}>
 {new Date(item.completed_at).toLocaleDateString('id-ID')}
 </span>
 )}
 </div>
 ))}
 </div>
 );
 })}
 </div>
 {selectedOb.status !== 'completed' && (
 <div className="modal-footer">
 <button className="btn-primary" onClick={() => markComplete(selectedOb.id)} disabled={checklist.some(c => !c.completed)}>
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
