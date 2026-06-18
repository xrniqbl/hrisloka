import { useState, useEffect } from 'react';
import { FiPlus, FiMapPin, FiClock, FiUsers, FiX } from 'react-icons/fi';
import * as jobService from '../services/jobService';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

export default function JobPosting() {
 const [jobs, setJobs] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [form, setForm] = useState({ title: '', department: '', location: '', type: 'full-time', deadline: '', description: '', requirements: '' });

 useEffect(() => { fetchData(); }, []);

 const fetchData = async () => {
 setLoading(true);
 const { data } = await jobService.getAllJobs();
 setJobs(data || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('jobs', fetchData);

 const handleSubmit = async () => {
 await jobService.createJob({
 title: form.title,
 department: form.department,
 location: form.location,
 type: form.type,
 deadline: form.deadline || null,
 description: form.description,
 requirements: form.requirements ? form.requirements.split(',').map(r => r.trim()) : [],
 status: 'open',
 applicants: 0,
 });
 setShowForm(false);
 setForm({ title: '', department: '', location: '', type: 'full-time', deadline: '', description: '', requirements: '' });
 fetchData();
 };

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={5} />;
 return (
 <div>
 <div className="page-header">
 <h1>Lowongan Pekerjaan</h1>
 <button className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> Buat Lowongan</button>
 </div>

 {loading ? (
 <div style={{ padding: 20 }}>Loading...</div>
 ) : jobs.length === 0 ? (
 <div className="info-card" style={{ textAlign: 'center', padding: 40 }}>
 <div className="empty-state-icon" style={{ fontSize: 22 }}></div>
 <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Belum ada lowongan</div>
 <div style={{ fontSize: 13, color: 'var(--muted)' }}>Klik "Buat Lowongan" untuk membuat lowongan pertama.</div>
 </div>
 ) : (
 <div className="cards-grid">
 {jobs.map((job) => (
 <div className="info-card" key={job.id}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
 <div>
 <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{job.title}</h3>
 <div style={{ fontSize: 12, color: 'var(--muted)' }}>{job.department}</div>
 </div>
 <span className={`status-badge ${job.status}`}>{job.status === 'open' ? 'Aktif' : 'Ditutup'}</span>
 </div>

 <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, flexWrap: 'wrap' }}>
 <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiMapPin /> {job.location || '—'}</span>
 <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiClock /> {job.type}</span>
 <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiUsers /> {job.applicants || 0} pelamar</span>
 </div>

 <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
 {job.description}
 </p>

 <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
 {(job.requirements || []).slice(0, 3).map((req, i) => (
 <span key={i} style={{ fontSize: 10, padding: '3px 8px', background: 'var(--bg)', borderRadius: 4, color: 'var(--muted)', fontWeight: 600 }}>
 {req}
 </span>
 ))}
 </div>

 <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)' }}>
 Dibuat: {new Date(job.created_at).toLocaleDateString('id-ID')}
 {job.deadline && ` • Deadline: ${new Date(job.deadline).toLocaleDateString('id-ID')}`}
 </div>
 </div>
 ))}
 </div>
 )}

 {showForm && (
 <div className="modal-overlay" onClick={() => setShowForm(false)}>
 <div className="modal-box large" onClick={(e) => e.stopPropagation()}>
 <div className="modal-header">
 <h2>Buat Lowongan Baru</h2>
 <button className="modal-close" onClick={() => setShowForm(false)}><FiX /></button>
 </div>
 <div className="modal-body">
 <div className="form-grid">
 <div className="form-group">
 <label className="form-label">Judul Posisi *</label>
 <input className="form-input" placeholder="Misal: Frontend Developer" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
 </div>
 <div className="form-group">
 <label className="form-label">Departemen *</label>
 <input className="form-input" placeholder="Engineering" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
 </div>
 <div className="form-group">
 <label className="form-label">Lokasi</label>
 <input className="form-input" placeholder="Jakarta, Indonesia" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
 </div>
 <div className="form-group">
 <label className="form-label">Tipe</label>
 <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
 <option value="full-time">Full-time</option>
 <option value="part-time">Part-time</option>
 <option value="contract">Contract</option>
 <option value="intern">Internship</option>
 </select>
 </div>
 <div className="form-group">
 <label className="form-label">Deadline</label>
 <input className="form-input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
 </div>
 <div className="form-group full-width">
 <label className="form-label">Deskripsi</label>
 <textarea className="form-textarea" placeholder="Deskripsi pekerjaan..." style={{ minHeight: 100 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
 </div>
 <div className="form-group full-width">
 <label className="form-label">Persyaratan (pisahkan dengan koma)</label>
 <input className="form-input" placeholder="React, TypeScript, 3+ tahun pengalaman" value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />
 </div>
 </div>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
 <button className="btn-primary" onClick={handleSubmit} disabled={!form.title || !form.department}>Publikasi</button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
