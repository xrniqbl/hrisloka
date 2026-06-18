import { useState, useEffect } from 'react';
import { FiBookOpen, FiPlus, FiX, FiCheck, FiEdit2, FiTrash2, FiDownload, FiSearch, FiFile, FiUpload, FiEye } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import * as policyService from '../services/policyService';
import '../styles/shared.css';
import '../styles/admin.css';

const CATEGORIES = [
  { id: 'sop', label: 'SOP', color: '#3B82F6' },
  { id: 'regulation', label: 'Peraturan Perusahaan', color: '#8B5CF6' },
  { id: 'policy', label: 'Kebijakan HR', color: '#10B981' },
  { id: 'guideline', label: 'Panduan Kerja', color: '#F59E0B' },
  { id: 'template', label: 'Template Dokumen', color: '#EC4899' },
];

const SEED_POLICIES = [
  { title: 'SOP Absensi & Kehadiran', category: 'sop', version: '2.1', effective_date: '2026-01-01', description: 'Prosedur standar absensi harian, izin, dan keterlambatan.', status: 'active' },
  { title: 'Peraturan Perusahaan 2026', category: 'regulation', version: '1.0', effective_date: '2026-01-01', description: 'Peraturan perusahaan yang berlaku untuk seluruh karyawan.', status: 'active' },
  { title: 'Kebijakan Cuti & Izin', category: 'policy', version: '3.0', effective_date: '2026-01-01', description: 'Ketentuan jenis cuti, kuota, dan prosedur pengajuan.', status: 'active' },
  { title: 'Kebijakan Work From Home', category: 'policy', version: '1.2', effective_date: '2026-03-01', description: 'Ketentuan dan persyaratan bekerja dari rumah.', status: 'active' },
  { title: 'Panduan Onboarding Karyawan Baru', category: 'guideline', version: '2.0', effective_date: '2025-08-01', description: 'Langkah-langkah onboarding dari hari pertama sampai 90 hari.', status: 'active' },
  { title: 'Template Surat Peringatan', category: 'template', version: '1.0', effective_date: '2025-06-01', description: 'Template SP-1, SP-2, SP-3 untuk pelanggaran disiplin.', status: 'active' },
  { title: 'SOP Reimbursement', category: 'sop', version: '1.5', effective_date: '2025-10-01', description: 'Prosedur pengajuan dan approval reimbursement.', status: 'active' },
  { title: 'Kode Etik Karyawan', category: 'regulation', version: '1.0', effective_date: '2025-01-01', description: 'Standar perilaku dan etika yang harus dipatuhi seluruh karyawan.', status: 'draft' },
];
export default function CompanyPolicyCenter() {
 const { employee } = useAuth();
 const companyId = employee?.company_id;
 const [loading, setLoading] = useState(true);
 const [policies, setPolicies] = useState([]);
 const [search, setSearch] = useState('');
 const [filterCategory, setFilterCategory] = useState('');
 const [modal, setModal] = useState(null);
 const [editId, setEditId] = useState(null);
 const [form, setForm] = useState({ title: '', category: 'sop', version: '1.0', effective_date: '', description: '', status: 'active' });

 useEffect(() => {
  async function load() {
    setLoading(true);
    const { data } = await policyService.getAllPolicies(companyId);
    if (data && data.length > 0) { setPolicies(data); }
    else { setPolicies(SEED_POLICIES.map((p,i)=>({id:i+1,...p,company_id:companyId,updated_at:new Date().toISOString().split('T')[0]}))); }
    setLoading(false);
  }
  load();
 }, [companyId]);

 const filtered = policies.filter(p => {
 const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
 const matchCat = !filterCategory || p.category === filterCategory;
 return matchSearch && matchCat;
 });

 const openCreate = () => {
 setForm({ title: '', category: 'sop', version: '1.0', effective_date: '', description: '', status: 'active' });
 setEditId(null);
 setModal('form');
 };

 const openEdit = (p) => {
 setForm({ title: p.title, category: p.category, version: p.version, effective_date: p.effective_date, description: p.description, status: p.status });
 setEditId(p.id);
 setModal('form');
 };

 const handleSubmit = () => {
 if (!form.title) return;
 let updated;
 if (editId) {
 updated = policies.map(p => p.id === editId ? { ...p, ...form, updated_at: new Date().toISOString().split('T')[0] } : p);
 } else {
 const newId = Math.max(...policies.map(p => p.id), 0) + 1;
 updated = [...policies, { id: newId, ...form, updated_at: new Date().toISOString().split('T')[0] }];
 }
 setPolicies(updated);
 /* service handles persistence */
 setModal(null);
 };

 const handleDelete = async (id) => {
  if (!confirm('Hapus kebijakan ini?')) return;
  await policyService.deletePolicy(id);
  setPolicies(prev => prev.filter(p => p.id !== id));
 };

 const getCatInfo = (cat) => CATEGORIES.find(c => c.id === cat) || { label: cat, color: '#6D8196' };

 const statsByCategory = CATEGORIES.map(c => ({
 ...c,
 count: policies.filter(p => p.category === c.id).length,
 }));

 return (
 <div>
 <div className="page-header">
 <h1><FiBookOpen style={{ marginRight: 10 }} /> Company Policy Center</h1>
 <div className="page-header-actions">
 <button className="btn-primary" onClick={openCreate}><FiPlus /> Tambah Kebijakan</button>
 </div>
 </div>

 {/* Stats */}
 <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
 {statsByCategory.map(s => (
 <div
 key={s.id}
 onClick={() => setFilterCategory(filterCategory === s.id ? '' : s.id)}
 style={{
 display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px',
 background: filterCategory === s.id ? `${s.color}15` : 'var(--surface)',
 borderRadius: 'var(--radius-md)',
 border: filterCategory === s.id ? `2px solid ${s.color}` : '1px solid var(--border)',
 cursor: 'pointer', transition: 'all 0.15s',
 }}
 >
 <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
 <span style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</span>
 <span style={{
 fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12,
 background: `${s.color}20`, color: s.color,
 }}>
 {s.count}
 </span>
 </div>
 ))}
 </div>

 {/* Search */}
 <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
 <div style={{ position: 'relative', flex: 1 }}>
 <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
 <input className="form-input" placeholder="Cari kebijakan..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
 </div>
 </div>

 {/* Policy Cards */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
 {filtered.length === 0 ? (
 <div className="info-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
 <FiBookOpen style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }} />
 <div>Tidak ada kebijakan ditemukan.</div>
 </div>
 ) : filtered.map(p => {
 const cat = getCatInfo(p.category);
 return (
 <div key={p.id} className="info-card" style={{ borderTop: `3px solid ${cat.color}`, padding: 0, overflow: 'hidden' }}>
 <div style={{ padding: '20px 20px 16px' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
 <div style={{ flex: 1 }}>
 <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{p.title}</div>
 <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
 <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#fff', background: cat.color }}>{cat.label}</span>
 <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, color: p.status === 'active' ? 'var(--success)' : 'var(--muted)', background: p.status === 'active' ? 'var(--success-light)' : 'var(--bg)' }}>
 {p.status === 'active' ? 'Aktif' : 'Draft'}
 </span>
 </div>
 </div>
 <div style={{ display: 'flex', gap: 4 }}>
 <button className="action-btn" onClick={() => openEdit(p)}><FiEdit2 size={13} /></button>
 <button className="action-btn danger" onClick={() => handleDelete(p.id)}><FiTrash2 size={13} /></button>
 </div>
 </div>
 <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{p.description}</p>
 </div>
 <div style={{
 display: 'flex', justifyContent: 'space-between', padding: '10px 20px',
 background: 'var(--bg)', fontSize: 11, color: 'var(--muted)',
 borderTop: '1px solid var(--border-light)',
 }}>
 <span>v{p.version}</span>
 <span>Berlaku: {p.effective_date || '—'}</span>
 <span>Update: {p.updated_at || '—'}</span>
 </div>
 </div>
 );
 })}
 </div>

 {/* Form Modal */}
 {modal === 'form' && (
 <div className="modal-overlay" onClick={() => setModal(null)}>
 <div className="modal-box large" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2>{editId ? 'Edit Kebijakan' : 'Tambah Kebijakan Baru'}</h2>
 <button className="modal-close" onClick={() => setModal(null)}><FiX /></button>
 </div>
 <div className="modal-body">
 <div className="form-grid">
 <div className="form-group full-width">
 <label className="form-label">Judul *</label>
 <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="SOP Absensi & Kehadiran" />
 </div>
 <div className="form-group">
 <label className="form-label">Kategori</label>
 <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
 {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
 </select>
 </div>
 <div className="form-group">
 <label className="form-label">Versi</label>
 <input className="form-input" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="1.0" />
 </div>
 <div className="form-group">
 <label className="form-label">Tanggal Berlaku</label>
 <input className="form-input" type="date" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} />
 </div>
 <div className="form-group">
 <label className="form-label">Status</label>
 <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
 <option value="active">Aktif</option>
 <option value="draft">Draft</option>
 </select>
 </div>
 <div className="form-group full-width">
 <label className="form-label">Deskripsi</label>
 <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Jelaskan isi kebijakan..." />
 </div>
 </div>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
 <button className="btn-primary" onClick={handleSubmit} disabled={!form.title}><FiCheck /> {editId ? 'Update' : 'Simpan'}</button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
