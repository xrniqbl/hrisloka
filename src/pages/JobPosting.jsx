import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiMapPin, FiClock, FiUsers, FiX } from 'react-icons/fi';
import * as jobService from '../services/jobService';
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
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

export default function JobPosting() {
  const { employee } = useAuth();
 const [jobs, setJobs] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [form, setForm] = useState({ title: '', department: '', location: '', type: 'full-time', deadline: '', description: '', requirements: '' });

 const fetchData = async () => {
 setLoading(true);
 const { data } = await jobService.getAllJobs(employee?.company_id);
 setJobs(data || []);
 setLoading(false);
 };

 useEffect(() => { fetchData(); }, []);

 // Realtime: auto-refresh
 useRealtimeTable('job_postings', fetchData, { companyId: employee?.company_id });

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
 
    companyId: employee?.company_id,
  });
 setShowForm(false);
 setForm({ title: '', department: '', location: '', type: 'full-time', deadline: '', description: '', requirements: '' });
 fetchData();
 };

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={5} />;
 return (
 <div className="admin-page">
 <div className="page-header">
 <h1>Lowongan Pekerjaan</h1>
 <Button onClick={() => setShowForm(true)}><FiPlus /> Buat Lowongan</Button>
 </div>

 {loading ? (
 <div className="ep-loading-wrap"><div className="ep-loading-inner"><div className="ep-spinner" /><div className="ep-loading-text">Loading...</div></div></div>
 ) : jobs.length === 0 ? (
 <EmptyState
  title="Belum ada lowongan"
  description="Buat lowongan pertama agar kandidat bisa melamar."
  ctaLabel="Buat lowongan"
  onCta={() => setShowForm(true)}
 />
 ) : (
 <div className="cards-grid">
 {jobs.map((job) => (
 <div className="info-card" key={job.id}>
 <div className="info-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
 <div>
 <h3 className="td-semibold" style={{ fontSize: 15, marginBottom: 4 }}>{job.title}</h3>
 <div className="td-muted-sm">{job.department}</div>
 </div>
 <span className={`status-badge ${job.status}`}>{job.status === 'open' ? 'Aktif' : 'Ditutup'}</span>
 </div>

 <div className="btn-icon-row td-muted-sm mb-sm" style={{ flexWrap: 'wrap' }}>
 <span className="btn-icon-row"><FiMapPin /> {job.location || '-'}</span>
 <span className="btn-icon-row"><FiClock /> {job.type}</span>
 <span className="btn-icon-row"><FiUsers /> {job.applicants || 0} pelamar</span>
 </div>

 <p className="td-muted-sm td-truncate mb-sm" style={{ lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
 {job.description}
 </p>

 <div className="btn-icon-row" style={{ flexWrap: 'wrap' }}>
 {(job.requirements || []).slice(0, 3).map((req, i) => (
 <span key={i} className="status-badge" style={{ fontSize: 10 }}>
 {req}
 </span>
 ))}
 </div>

 <div className="td-muted-sm" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
 Dibuat: {new Date(job.created_at).toLocaleDateString('id-ID')}
 {job.deadline && ` * Deadline: ${new Date(job.deadline).toLocaleDateString('id-ID')}`}
 </div>
 </div>
 ))}
 </div>
 )}

 {showForm && (
 <Dialog open={showForm} onOpenChange={setShowForm}>
 <DialogContent className="max-w-2xl">
 <div className="modal-header">
 <h2>Buat Lowongan Baru</h2>
 <button className="modal-close" onClick={() => setShowForm(false)}><FiX /></button>
 </div>
 
 <div className="form-grid">
 <div className="form-group">
 <Label>Judul Posisi *</Label>
 <Input placeholder="Misal: Frontend Developer" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
 </div>
 <div className="form-group">
 <Label>Departemen *</Label>
 <Input placeholder="Engineering" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
 </div>
 <div className="form-group">
 <Label>Lokasi</Label>
 <Input placeholder="Jakarta, Indonesia" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
 </div>
 <div className="form-group">
 <Label>Tipe</Label>
 <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
 <option value="full-time">Full-time</option>
 <option value="part-time">Part-time</option>
 <option value="contract">Contract</option>
 <option value="intern">Internship</option>
 </select>
 </div>
 <div className="form-group">
 <Label>Deadline</Label>
 <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
 </div>
 <div className="form-group full-width">
 <Label>Deskripsi</Label>
 <Textarea placeholder="Deskripsi pekerjaan..." style={{ minHeight: 100 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
 <Button onClick={handleSubmit} disabled={!form.title || !form.department}>Publikasi</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 )}
 </div>
 );
}
