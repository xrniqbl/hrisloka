import { useState, useEffect, useCallback } from 'react';
import { FiBook, FiPlus, FiX, FiCheck, FiUsers, FiCalendar, FiMapPin, FiAward, FiEdit2, FiTrash2, FiDownload, FiPlay, FiLink, FiExternalLink, FiYoutube } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import * as employeeService from '../services/employeeService';
import * as trainingService from '../services/trainingService';
import { useAuth } from '../context/AuthContext';
import { exportToExcel } from '../lib/excelExport';
import { useRealtimeTable } from '../hooks/useRealtime';
import { safeExternalUrl } from '../lib/safeUrl';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPanel, DialogFooter } from '@/components/ui/dialog';
import '../styles/shared.css';
import '../styles/admin.css';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

const catColors = { technical: '#635BFF', soft_skill: '#10B981', compliance: '#F59E0B', leadership: '#8B5CF6', certification: '#EC4899' };
const catLabels = { technical: 'Technical', soft_skill: 'Soft Skill', compliance: 'Compliance', leadership: 'Leadership', certification: 'Certification' };
const statusColors = { upcoming: '#635BFF', ongoing: '#F59E0B', completed: '#16A34A', cancelled: '#DC2626' };
const statusLabels = { upcoming: 'Akan Datang', ongoing: 'Berlangsung', completed: 'Selesai', cancelled: 'Dibatalkan' };
const materialTypes = { youtube: 'YouTube', link: 'Link', document: 'Dokumen', video: 'Video' };

function getYouTubeId(url) {
 if (!url) return null;
 const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
 return match ? match[1] : null;
}

function detectMaterialType(url) {
 if (!url) return 'link';
 if (getYouTubeId(url)) return 'youtube';
 if (/\.(mp4|webm|ogg)$/i.test(url)) return 'video';
 if (/\.(pdf|doc|docx|pptx|xlsx)$/i.test(url)) return 'document';
 return 'link';
}

export default function TrainingManagement() {
  const { employee } = useAuth();
 const [trainings, setTrainings] = useState([]);
 const [employees, setEmployees] = useState([]);
 const [loading, setLoading] = useState(true);
 const [modal, setModal] = useState(null);
 const [selected, setSelected] = useState(null);
 const [form, setForm] = useState({ title: '', category: 'technical', instructor: '', location: '', startDate: '', endDate: '', maxParticipants: 30, description: '' });
 const [participants, setParticipants] = useState([]);
 const [addEmpId, setAddEmpId] = useState('');
 const [detailTab, setDetailTab] = useState('participants'); // 'participants' | 'materials'
 const [materialForm, setMaterialForm] = useState({ title: '', url: '', description: '' });
 const [materials, setMaterials] = useState([]);

 const fetchData = useCallback(async () => {
 setLoading(true);
 const [tRes, eRes] = await Promise.all([
 trainingService.getAllTrainings(employee?.company_id),
 employeeService.getAllEmployees(undefined, employee?.company_id),
 ]);
 setTrainings(tRes.data || []);
 setEmployees(eRes.data || []);
 setLoading(false);
 }, [employee?.company_id]);

 useEffect(() => { fetchData(); }, [fetchData]);

 // Realtime: auto-refresh
 useRealtimeTable('trainings', fetchData, { companyId: employee?.company_id });

 const openCreate = () => {
 setForm({ title: '', category: 'technical', instructor: '', location: '', startDate: '', endDate: '', maxParticipants: 30, description: '' });
 setSelected(null);
 setModal('form');
 };

 const openDetail = (t) => {
 setSelected(t);
 setParticipants(t.training_participants || []);
 setMaterials(t.training_materials || []);
 setAddEmpId('');
 setMaterialForm({ title: '', url: '', description: '' });
 setDetailTab('participants');
 setModal('detail');
 };

 const handleSubmit = async () => {
 if (!form.title) return;
 const payload = {
 title: form.title, category: form.category, instructor: form.instructor,
 location: form.location, start_date: form.startDate || null, end_date: form.endDate || null,
 max_participants: form.maxParticipants, description: form.description,
 };
 if (selected) {
 await trainingService.updateTraining(selected.id, payload, employee?.company_id);
 } else {
 await trainingService.createTraining({ ...payload, company_id: employee?.company_id });
 }
 setModal(null);
 fetchData();
 };

 const handleDelete = async (id) => {
 if (!confirm('Hapus pelatihan ini?')) return;
 await trainingService.deleteTraining(id, employee?.company_id);
 fetchData();
 };

 const addParticipant = async () => {
 if (!addEmpId || !selected) return;
 await supabase.from('training_participants').insert({ training_id: selected.id, employee_id: Number(addEmpId) });
 const { data } = await supabase.from('training_participants').select('*, employees(name, division)').eq('training_id', selected.id);
 setParticipants(data || []);
 setAddEmpId('');
 };

 const removeParticipant = async (id) => {
 await supabase.from('training_participants').delete().eq('id', id);
 setParticipants(prev => prev.filter(p => p.id !== id));
 };

 const updateParticipantStatus = async (id, status) => {
 await supabase.from('training_participants').update({ status }).eq('id', id);
 setParticipants(prev => prev.map(p => p.id === id ? { ...p, status } : p));
 };

 // Materials CRUD
 const addMaterial = async () => {
 if (!materialForm.url || !materialForm.title || !selected) return;
 const type = detectMaterialType(materialForm.url);
 await supabase.from('training_materials').insert({
 training_id: selected.id,
 title: materialForm.title,
 url: materialForm.url,
 type,
 description: materialForm.description || null,
 sort_order: materials.length,
 });
 const { data } = await supabase.from('training_materials').select('*').eq('training_id', selected.id).order('sort_order');
 setMaterials(data || []);
 setMaterialForm({ title: '', url: '', description: '' });
 };

 const removeMaterial = async (id) => {
 await supabase.from('training_materials').delete().eq('id', id);
 setMaterials(prev => prev.filter(m => m.id !== id));
 };

 const handleExport = () => {
 const data = trainings.map(t => ({
 Judul: t.title, Kategori: catLabels[t.category] || t.category,
 Instruktur: t.instructor, Lokasi: t.location,
 'Tanggal Mulai': t.start_date, 'Tanggal Selesai': t.end_date,
 Peserta: (t.training_participants || []).length, Status: statusLabels[t.status],
 Materi: (t.training_materials || []).length,
 }));
 exportToExcel(data, 'Training_Report.xlsx', 'Training');
 };

 // Stats
 const upcoming = trainings.filter(t => t.status === 'upcoming').length;
 const completedCount = trainings.filter(t => t.status === 'completed').length;
 const totalParticipants = trainings.reduce((s, t) => s + (t.training_participants || []).length, 0);
 const totalMaterials = trainings.reduce((s, t) => s + (t.training_materials || []).length, 0);

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={5} />;
 return (
 <div className="admin-page">
 <div className="page-header">
 <h1><FiBook className="icon-mr" /> Training & Learning</h1>
 <div className="page-header-actions">
 <button type="button" className="btn-secondary" onClick={handleExport}><FiDownload /> Export</button>
 <button type="button" className="btn-primary" onClick={openCreate}><FiPlus /> Tambah Pelatihan</button>
 </div>
 </div>

 {/* Stats */}
 <div className="stats-grid">
 {[
 { label: 'Total Pelatihan', value: trainings.length, color: '#635BFF', icon: <FiBook /> },
 { label: 'Akan Datang', value: upcoming, color: '#F59E0B', icon: <FiCalendar /> },
 { label: 'Selesai', value: completedCount, color: '#16A34A', icon: <FiCheck /> },
 { label: 'Total Peserta', value: totalParticipants, color: '#8B5CF6', icon: <FiUsers /> },
 { label: 'Total Materi', value: totalMaterials, color: '#EC4899', icon: <FiPlay /> },
 ].map(s => (
 <div key={s.label} className="info-card">
 <div className="btn-icon-row mb-sm" style={{ color: s.color }}>{s.icon} <span className="info-card-label">{s.label}</span></div>
 <div className="info-card-value" style={{ color: s.color }}>{s.value}</div>
 </div>
 ))}
 </div>

 {/* Training Cards */}
 <div className="stats-grid">
 {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="info-card skeleton" style={{ height: 180 }} />) :
 trainings.length === 0 ? (
 <div style={{ gridColumn: '1/-1' }}>
  <EmptyState
    title="Belum ada data pelatihan"
    description="Buat pelatihan pertama lalu assign peserta karyawan."
    ctaLabel="Buat pelatihan"
    onCta={openCreate}
  />
 </div>
 ) : trainings.map(t => (
 <div key={t.id} className="info-card" style={{ cursor: 'pointer', transition: 'all 0.2s', borderTop: `3px solid ${catColors[t.category] || '#6D8196'}` }} onClick={() => openDetail(t)}>
 <div className="btn-icon-row mb">
 <div className="page-header-actions" style={{ flex: 1 }}>
 <div className="td-semibold td-primary-bold td-truncate">{t.title}</div>
 <div className="btn-icon-row" style={{ flexWrap: 'wrap' }}>
 <span className="badge" style={{ background: catColors[t.category], color: '#fff' }}>{catLabels[t.category]}</span>
 <span className="badge" style={{ background: statusColors[t.status], color: '#fff' }}>{statusLabels[t.status]}</span>
 {(t.training_materials || []).length > 0 && (
 <span className="badge" style={{ color: '#EC4899', background: '#FDF2F8' }}>
 <FiPlay size={9} style={{ marginRight: 3 }} />{(t.training_materials || []).length} Materi
 </span>
 )}
 </div>
 </div>
 <div className="btn-icon-row">
 <Button variant="ghost" size="icon" className="action-btn" onClick={(e) => { e.stopPropagation(); setSelected(t); setForm({ title: t.title, category: t.category, instructor: t.instructor || '', location: t.location || '', startDate: t.start_date || '', endDate: t.end_date || '', maxParticipants: t.max_participants, description: t.description || '' }); setModal('form'); }}><FiEdit2 size={13} /></Button>
 <Button variant="ghost" size="icon" className="action-btn danger" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}><FiTrash2 size={13} /></Button>
 </div>
 </div>
 <div className="td-muted-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
 {t.instructor && <div><FiUsers style={{ marginRight: 4 }} />{t.instructor}</div>}
 {t.location && <div><FiMapPin style={{ marginRight: 4 }} />{t.location}</div>}
 {t.start_date && <div><FiCalendar style={{ marginRight: 4 }} />{t.start_date}{t.end_date && t.end_date !== t.start_date ? ` - ${t.end_date}` : ''}</div>}
 <div><FiUsers style={{ marginRight: 4 }} />{(t.training_participants || []).length}/{t.max_participants} peserta</div>
 </div>
 </div>
 ))}
 </div>

 {/* Create/Edit Modal */}
 <Dialog open={modal === 'form'} onOpenChange={(open) => !open && setModal(null)}>
 <DialogContent className="max-w-3xl">
 <DialogHeader>
 <DialogTitle>{selected ? 'Edit Pelatihan' : 'Tambah Pelatihan Baru'}</DialogTitle>
 </DialogHeader>
 <DialogPanel>
 <div className="form-grid">
 <div className="form-group full-width"><label className="form-label">Judul *</label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
 <div className="form-group"><label className="form-label">Kategori</label><NativeSelect value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{Object.entries(catLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></div>
 <div className="form-group"><label className="form-label">Instruktur</label><Input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} /></div>
 <div className="form-group"><label className="form-label">Lokasi</label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
 <div className="form-group"><label className="form-label">Max Peserta</label><Input type="number" value={form.maxParticipants} onChange={e => setForm({ ...form, maxParticipants: Number(e.target.value) })} /></div>
 <div className="form-group"><label className="form-label">Tanggal Mulai</label><DatePicker value={form.startDate} onChange={(value) => setForm({ ...form, startDate: value })} placeholder="Pilih tanggal mulai" /></div>
 <div className="form-group"><label className="form-label">Tanggal Selesai</label><DatePicker value={form.endDate} onChange={(value) => setForm({ ...form, endDate: value })} placeholder="Pilih tanggal selesai" /></div>
 <div className="form-group full-width"><label className="form-label">Deskripsi</label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
 </div>
 </DialogPanel>
 <DialogFooter>
 <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
 <button type="button" className="btn-primary" onClick={handleSubmit} disabled={!form.title}><FiCheck /> {selected ? 'Update' : 'Simpan'}</button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Detail + Participants + Materials Modal */}
 <Dialog open={modal === 'detail' && Boolean(selected)} onOpenChange={(open) => !open && setModal(null)}>
 <DialogContent className="max-w-4xl">
 <DialogHeader>
 <DialogTitle>{selected?.title}</DialogTitle>
 </DialogHeader>
 <DialogPanel className="max-h-[70vh]">
 {selected.description && <p className="td-muted-sm mb">{selected.description}</p>}

 {/* Tabs */}
 <div className="btn-icon-row mb">
 <Button variant={detailTab === 'participants' ? 'default' : 'outline'} size="sm" onClick={() => setDetailTab('participants')}>
 <FiUsers style={{ marginRight: 6 }} /> Peserta ({participants.length})
 </Button>
 <Button variant={detailTab === 'materials' ? 'default' : 'outline'} size="sm" onClick={() => setDetailTab('materials')}>
 <FiPlay style={{ marginRight: 6 }} /> Materi ({materials.length})
 </Button>
 </div>

 {/* Participants Tab */}
 {detailTab === 'participants' && (
 <>
 <div className="btn-icon-row mb">
 <NativeSelect value={addEmpId} onChange={e => setAddEmpId(e.target.value)} style={{ flex: 1 }}>
 <option value="">-- Tambah Peserta --</option>
 {employees.filter(e => !participants.some(p => p.employee_id === e.id)).map(e => (
 <option key={e.id} value={e.id}>{e.name} - {e.division || ''}</option>
 ))}
 </NativeSelect>
 <button type="button" className="btn-primary btn-sm" onClick={addParticipant} disabled={!addEmpId}><FiPlus /></button>
 </div>

 {participants.length === 0 ? (
 <div className="ep-empty-wrap"><span className="ep-empty-desc">Belum ada peserta.</span></div>
 ) : participants.map(p => (
 <div key={p.id} className="btn-icon-row mb-sm" style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
 <div className="page-header-actions" style={{ flex: 1 }}>
 <div className="td-semibold">{p.employees?.name || '-'}</div>
 <div className="td-muted-sm">{p.employees?.division || ''}</div>
 </div>
 <NativeSelect size="sm"
 value={p.status}
 onChange={e => updateParticipantStatus(p.id, e.target.value)}
 >
 <option value="registered">Terdaftar</option>
 <option value="attended">Hadir</option>
 <option value="completed">Lulus</option>
 <option value="absent">Absen</option>
 </NativeSelect>
 <Button variant="ghost" size="icon" className="action-btn danger" onClick={() => removeParticipant(p.id)}><FiTrash2 size={13} /></Button>
 </div>
 ))}
 </>
 )}

 {/* Materials Tab */}
 {detailTab === 'materials' && (
 <>
 {/* Add Material Form */}
 <div className="chart-card mb">
 <div className="btn-icon-row chart-card-header">
 <span className="chart-card-title section-label"><FiPlus size={14} /> Tambah Materi/Link</span>
 </div>
 <div className="form-grid">
 <div className="form-group">
 <label className="form-label">Judul Materi *</label>
 <Input value={materialForm.title} onChange={e => setMaterialForm({ ...materialForm, title: e.target.value })} placeholder="Contoh: Video Pengenalan AI" />
 </div>
 <div className="form-group">
 <label className="form-label">URL Link/YouTube *</label>
 <Input value={materialForm.url} onChange={e => setMaterialForm({ ...materialForm, url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
 </div>
 <div className="form-group full-width">
 <label className="form-label">Deskripsi (opsional)</label>
 <Input value={materialForm.description} onChange={e => setMaterialForm({ ...materialForm, description: e.target.value })} placeholder="Deskripsi singkat materi..." />
 </div>
 </div>
 {/* YouTube Preview */}
 {materialForm.url && getYouTubeId(materialForm.url) && (
 <div className="chart-container mb-sm" style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
 <iframe
 width="100%"
 height="200"
 src={`https://www.youtube.com/embed/${getYouTubeId(materialForm.url)}`}
 title="Preview"
 frameBorder="0"
 allowFullScreen
 />
 </div>
 )}
 {materialForm.url && !getYouTubeId(materialForm.url) && (
 <div className="td-muted-sm mb-sm" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
 <FiLink size={12} style={{ marginRight: 6 }} />
 Tipe: {materialTypes[detectMaterialType(materialForm.url)]}
 </div>
 )}
 <button type="button" className="btn-primary mb" onClick={addMaterial} disabled={!materialForm.title || !materialForm.url}>
 <FiPlus /> Tambah Materi
 </button>
 </div>

 {/* Material List */}
 {materials.length === 0 ? (
 <div className="ep-empty-wrap"><span className="ep-empty-desc">Belum ada materi. Tambahkan link YouTube atau materi lainnya di atas.</span></div>
 ) : materials.map(m => {
 const ytId = getYouTubeId(m.url);
 return (
 <div key={m.id} className="btn-icon-row mb-sm" style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
 <div style={{
 width: 36, height: 36, borderRadius: 8,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 background: ytId ? '#FEE2E2' : '#F0EEFF',
 color: ytId ? '#DC2626' : 'var(--primary)',
 flexShrink: 0,
 }}>
 {ytId ? <FiPlay size={16} /> : <FiExternalLink size={16} />}
 </div>
 <div className="page-header-actions" style={{ flex: 1 }}>
 <div className="td-semibold">{m.title}</div>
 <div className="td-muted-sm">
 {materialTypes[m.type] || 'Link'} {m.description ? `- ${m.description}` : ''}
 </div>
 </div>
 {safeExternalUrl(m.url) ? (
 <a href={safeExternalUrl(m.url)} target="_blank" rel="noopener noreferrer" className="action-btn" title="Buka">
 <FiExternalLink size={13} />
 </a>
 ) : null}
 <Button variant="ghost" size="icon" className="action-btn danger" onClick={() => removeMaterial(m.id)} title="Hapus">
 <FiTrash2 size={13} />
 </Button>
 </div>
 );
 })}
 </>
 )}
 </DialogPanel>
 </DialogContent>
 </Dialog>
 </div>
 );
}


