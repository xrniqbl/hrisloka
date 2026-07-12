import { useState, useEffect } from 'react';
import { FiEye, FiX, FiZap, FiCpu, FiAward, FiPlus, FiSave, FiTrash2, FiFilter } from 'react-icons/fi';
import * as employeeService from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';

const levelColors = { beginner: '#6D8196', intermediate: '#F59E0B', advanced: '#635BFF', expert: '#16A34A' };
const levelLabels = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' };

function getReadinessLabel(score) {
 if (score >= 80) return { label: 'Highly Adaptive', color: '#16A34A' };
 if (score >= 60) return { label: 'Adaptive', color: '#635BFF' };
 if (score >= 40) return { label: 'Developing', color: '#F59E0B' };
 return { label: 'Low Adoption', color: '#DC2626' };
}

const defaultSkills = [
 'Prompt Engineering',
 'Data Analysis with AI',
 'AI-Assisted Writing',
 'Machine Learning Basics',
 'AI Ethics & Governance',
];

export default function AICapability() {
  const { employee } = useAuth();
 const [employees, setEmployees] = useState([]);
 const [aiData, setAiData] = useState([]);
 const [certifications, setCertifications] = useState([]);
 const [loading, setLoading] = useState(true);
 const [modal, setModal] = useState(null);
 const [selected, setSelected] = useState(null);
 const [reviewEmpId, setReviewEmpId] = useState('');
 const [reviewResult, setReviewResult] = useState('');
 const [search, setSearch] = useState('');
 const [filterDivision, setFilterDivision] = useState('all');
 const [addForm, setAddForm] = useState({ employeeId: '', skills: [] });

 const fetchData = async () => {
 setLoading(true);
 const [empRes, aiRes, certRes] = await Promise.all([
 employeeService.getAllEmployees(undefined, employee?.company_id),
 supabase.from('ai_capabilities').select('*, employees(name, division, position)').eq('company_id', employee?.company_id).order('employee_id'),
 supabase.from('ai_certifications').select('*, employees(name)').eq('company_id', employee?.company_id).order('employee_id'),
 ]);
 setEmployees(empRes.data || []);
 setAiData(aiRes.data || []);
 setCertifications(certRes.data || []);
 setLoading(false);
 };

 useEffect(() => { if (employee?.company_id, fetchData) fetchData(); }, [employee?.company_id]);

 // Realtime: auto-refresh
 useRealtimeTable('ai_capabilities', fetchData, { companyId: employee?.company_id });

 // Group AI data per employee
 const buildCapabilityMap = () => {
 const map = {};
 aiData.forEach(rec => {
 if (!map[rec.employee_id]) {
 const emp = employees.find(e => e.id === rec.employee_id) || rec.employees;
 map[rec.employee_id] = { employeeId: rec.employee_id, emp, skills: [], certifications: [] };
 }
 map[rec.employee_id].skills.push({ id: rec.id, name: rec.skill_name, score: rec.score, level: rec.level, assessedDate: rec.assessed_date });
 });
 certifications.forEach(c => {
 if (map[c.employee_id]) {
 map[c.employee_id].certifications.push(c);
 }
 });
 // Compute avg
 Object.values(map).forEach(entry => {
 entry.avgScore = entry.skills.length ? Math.round(entry.skills.reduce((s, sk) => s + sk.score, 0) / entry.skills.length) : 0;
 entry.lastAssessed = entry.skills.length ? entry.skills.reduce((latest, sk) => sk.assessedDate > latest ? sk.assessedDate : latest, '') : '-';
 });
 return Object.values(map);
 };

 const aiCapabilities = buildCapabilityMap();
 const divisions = [...new Set(employees.map(e => e.division).filter(Boolean))];

 function getDivisionScore(division) {
 const divCaps = aiCapabilities.filter(ac => ac.emp?.division === division);
 if (!divCaps.length) return 0;
 return Math.round(divCaps.reduce((sum, ac) => sum + ac.avgScore, 0) / divCaps.length);
 }

 const filtered = aiCapabilities.filter(m => {
 const matchSearch = (m.emp?.name || '').toLowerCase().includes(search.toLowerCase());
 const matchDivision = filterDivision === 'all' || m.emp?.division === filterDivision;
 return matchSearch && matchDivision;
 });

 const openProfile = (ac) => { setSelected(ac); setModal('profile'); };
 const openSmartReview = () => { setReviewEmpId(''); setReviewResult(''); setModal('review'); };
 const closeModal = () => { setModal(null); setSelected(null); setReviewResult(''); };

 const openAddModal = () => {
 setAddForm({
 employeeId: '',
 skills: defaultSkills.map(name => ({ name, score: 50, level: 'intermediate' })),
 });
 setModal('add');
 };

 const handleAddSubmit = async () => {
 if (!addForm.employeeId) return;
 const rows = addForm.skills.filter(s => s.name.trim()).map(s => ({
 employee_id: Number(addForm.employeeId),
 skill_name: s.name,
 score: s.score,
 level: s.score >= 80 ? 'expert' : s.score >= 60 ? 'advanced' : s.score >= 40 ? 'intermediate' : 'beginner',
 assessed_date: new Date().toISOString().split('T')[0],
 
    company_id: employee?.company_id,
  }));
 if (rows.length === 0) return;
 await supabase.from('ai_capabilities').insert(rows);
 closeModal();
 fetchData();
 };

 const handleDeleteSkill = async (id) => {
 if (!confirm('Hapus skill ini?')) return;
 await supabase.from('ai_capabilities').delete().eq('id', id).eq('company_id', employee?.company_id);
 fetchData();
 };

 const generateReview = () => {
 const emp = employees.find(e => e.id === Number(reviewEmpId) || e.id === reviewEmpId);
 const aiCap = aiCapabilities.find(ac => ac.employeeId === emp?.id);
 if (!emp) { setReviewResult('Pilih karyawan terlebih dahulu.'); return; }

 const aiInfo = aiCap
 ? `AI Skills: ${aiCap.skills.map(s => `${s.name} (${s.level}, ${s.score}%)`).join(', ')}. Sertifikasi: ${aiCap.certifications.length ? aiCap.certifications.map(c => c.name).join(', ') : 'Belum ada'}.`
 : 'Belum ada data AI Capability.';

 const draft = `DRAF EVALUASI KINERJA BULANAN
-----------------------------------

Karyawan: ${emp.name}
Divisi: ${emp.division || '-'} - ${emp.position || '-'}
Periode: ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}

--- AI Readiness ---
${aiInfo}

--- Ringkasan ---
${emp.name} menunjukkan performa yang baik di posisi ${emp.position || '-'}. ${aiCap ? `Dari sisi adopsi teknologi AI, karyawan ini berada di level ${aiCap.skills[0]?.level || 'beginner'} untuk ${aiCap.skills[0]?.name || 'AI skills'}.` : ''}

--- Rekomendasi ---
${aiCap && aiCap.skills.some(s => s.score < 50) ? '- Sertakan dalam program pelatihan AI perusahaan\n' : ''}- Lanjutkan pengembangan kompetensi melalui mentoring
- Evaluasi ulang target untuk kuartal berikutnya

--- Status: DRAFT - Perlu review HR Manager ---`;

 setReviewResult(draft);
 };

 if (loading) return <div className="admin-page"><h1>AI Capability Mapping</h1><p className="td-muted-sm">Memuat data...</p></div>;

 return (
 <div className="admin-page">
 <div className="page-header">
 <h1>AI Capability Mapping</h1>
 <div className="page-header-actions">
 <button className="btn-secondary" onClick={openAddModal} aria-label="Tambah skill"><FiPlus /> Tambah Skill</button>
 <button className="btn-primary" onClick={openSmartReview} aria-label="Smart review generator"><FiZap /> Smart Review Generator</button>
 </div>
 </div>

 {/* Division AI Readiness Cards */}
 <div className="stats-grid" style={{ marginBottom: 28 }}>
 {divisions.map(div => {
 const score = getDivisionScore(div);
 const readiness = getReadinessLabel(score);
 return (
 <div key={div} className="info-card">
 <div className="info-card-label">{div}</div>
 <div className="info-card-value" style={{ color: readiness.color }}>{score}%</div>
 <div className="progress-bar" style={{ marginBottom: 8 }}>
 <div className="progress-fill" style={{ width: `${score}%`, background: readiness.color }} />
 </div>
 <span className="status-badge" style={{ background: readiness.color, color: '#fff' }}>{readiness.label}</span>
 </div>
 );
 })}
 {divisions.length === 0 && (
 <div className="empty-state" style={{ gridColumn: '1/-1' }}>
 Belum ada data AI capability. Klik "Tambah Skill" untuk mulai menambahkan.
 </div>
 )}
 </div>

 {/* Employee AI Skills Table */}
 <div className="filters-bar">
 <input className="filter-search" placeholder="Cari karyawan..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
 <select className="filter-select" value={filterDivision} onChange={e => setFilterDivision(e.target.value)}>
 <option value="all">Semua Divisi</option>
 {divisions.map(d => <option key={d} value={d}>{d}</option>)}
 </select>
 </div>

 <div className="data-table-card">
 <div className="table-responsive">
 <table className="data-table">
 <thead>
 <tr>
 <th>Karyawan</th>
 <th>Divisi</th>
 <th>Avg Score</th>
 <th>Top Skill</th>
 <th>Sertifikasi</th>
 <th>Last Assessed</th>
 <th>Aksi</th>
 </tr>
 </thead>
 <tbody>
 {filtered.length === 0 ? (
 <tr><td colSpan="7" className="empty-state">Belum ada data AI capability.</td></tr>
 ) : filtered.map(m => {
 const topSkill = m.skills.reduce((a, b) => a.score > b.score ? a : b);
 return (
 <tr key={m.employeeId}>
 <td className="td-semibold">{m.emp?.name}</td>
 <td>{m.emp?.division}</td>
 <td>
 <div className="btn-icon-row">
 <div className="progress-bar" style={{ width: 60 }}>
 <div className="progress-fill" style={{ width: `${m.avgScore}%`, background: getReadinessLabel(m.avgScore).color }} />
 </div>
 <span className="td-semibold">{m.avgScore}%</span>
 </div>
 </td>
 <td>
 <span className="status-badge" style={{ background: levelColors[topSkill.level], color: '#fff' }}>
 {topSkill.name}
 </span>
 </td>
 <td className="td-sm">
 {m.certifications.length ? m.certifications.map(c => c.name).join(', ') : <span className="td-muted-sm">-</span>}
 </td>
 <td className="td-sm">{m.lastAssessed}</td>
 <td><button className="action-btn" onClick={() => openProfile(m)} aria-label="Lihat profil"><FiEye /></button></td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* Employee AI Profile Modal */}
 {modal === 'profile' && selected && (
 <div className="modal-overlay" onClick={closeModal}>
 <div className="modal-box large" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2><FiCpu className="icon-mr" /> AI Profile - {selected.emp?.name}</h2>
 <button className="modal-close" onClick={closeModal}><FiX /></button>
 </div>
 <div className="modal-body">
 <div className="mb">
 <div className="td-muted-sm">{selected.emp?.division} - {selected.emp?.position}</div>
 <div className="td-muted-sm">Last assessed: {selected.lastAssessed}</div>
 </div>
 <div style={{ display: 'grid', gap: 12 }}>
 {selected.skills.map(sk => (
 <div key={sk.id} className="info-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
 <div>
 <div className="td-semibold mb-sm">{sk.name}</div>
 <span className="status-badge" style={{ background: levelColors[sk.level], color: '#fff' }}>{levelLabels[sk.level]}</span>
 </div>
 <div className="btn-icon-row" style={{ minWidth: 140 }}>
 <div className="progress-bar" style={{ flex: 1 }}>
 <div className="progress-fill" style={{ width: `${sk.score}%`, background: levelColors[sk.level] }} />
 </div>
 <span className="td-semibold" style={{ minWidth: 36, textAlign: 'right' }}>{sk.score}%</span>
 <button onClick={() => handleDeleteSkill(sk.id)} className="action-btn danger" title="Hapus skill" aria-label="Hapus skill"><FiTrash2 size={13} /></button>
 </div>
 </div>
 ))}
 </div>
 {selected.certifications.length > 0 && (
 <div className="mb">
 <div className="section-label mb-sm">Sertifikasi</div>
 <div className="btn-icon-row" style={{ flexWrap: 'wrap' }}>
 {selected.certifications.map(c => (
 <span key={c.id} className="status-badge active btn-icon-row">
 <FiAward size={14} /> {c.name}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Add AI Skills Modal */}
 {modal === 'add' && (
 <div className="modal-overlay" onClick={closeModal}>
 <div className="modal-box large" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2><FiPlus className="icon-mr" /> Tambah AI Skills</h2>
 <button className="modal-close" onClick={closeModal}><FiX /></button>
 </div>
 <div className="modal-body">
 <div className="form-group mb">
 <label className="form-label">Karyawan *</label>
 <select className="form-select" value={addForm.employeeId} onChange={e => setAddForm({ ...addForm, employeeId: e.target.value })}>
 <option value="">- Pilih Karyawan -</option>
 {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} - {emp.division || 'No divisi'}</option>)}
 </select>
 </div>
 <div className="section-label mb-sm">AI Skills Assessment</div>
 <div style={{ display: 'grid', gap: 10 }}>
 {addForm.skills.map((sk, i) => (
 <div key={i} className="btn-icon-row">
 <input
 className="form-input"
 style={{ flex: 2 }}
 value={sk.name}
 onChange={e => {
 const updated = [...addForm.skills];
 updated[i].name = e.target.value;
 setAddForm({ ...addForm, skills: updated });
 }}
 placeholder="Nama skill"
 />
 <input
 type="range"
 min={0} max={100}
 value={sk.score}
 onChange={e => {
 const updated = [...addForm.skills];
 updated[i].score = Number(e.target.value);
 setAddForm({ ...addForm, skills: updated });
 }}
 style={{ flex: 1 }}
 />
 <span className="td-semibold" style={{ minWidth: 36 }}>{sk.score}%</span>
 <button
 onClick={() => setAddForm({ ...addForm, skills: addForm.skills.filter((_, j) => j !== i) })}
 className="action-btn danger"
 ><FiTrash2 size={13} /></button>
 </div>
 ))}
 </div>
 <button
 className="btn-secondary mb-sm"
 onClick={() => setAddForm({ ...addForm, skills: [...addForm.skills, { name: '', score: 50, level: 'intermediate' }] })}
 ><FiPlus /> Tambah Skill</button>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={closeModal}>Batal</button>
 <button className="btn-primary" onClick={handleAddSubmit} disabled={!addForm.employeeId} aria-label="Simpan"><FiSave /> Simpan</button>
 </div>
 </div>
 </div>
 )}

 {/* Smart Review Generator Modal */}
 {modal === 'review' && (
 <div className="modal-overlay" onClick={closeModal}>
 <div className="modal-box large" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2><FiZap className="icon-mr" /> Smart Review Generator</h2>
 <button className="modal-close" onClick={closeModal}><FiX /></button>
 </div>
 <div className="modal-body">
 <p className="td-muted-sm mb">Pilih karyawan untuk men-generate draf evaluasi kinerja bulanan secara otomatis berdasarkan data AI Capability.</p>
 <div className="btn-icon-row mb">
 <select className="form-select" style={{ flex: 1 }} value={reviewEmpId} onChange={e => setReviewEmpId(e.target.value)}>
 <option value="">- Pilih Karyawan -</option>
 {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} - {emp.division || '-'}</option>)}
 </select>
 <button className="btn-primary" onClick={generateReview} disabled={!reviewEmpId} aria-label="Generate"><FiZap /> Generate</button>
 </div>
 {reviewResult && (
 <div className="data-table-card" style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
 {reviewResult}
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}



