import { useState, useEffect } from 'react';
import { FiBook, FiPlus, FiX, FiCheck, FiUsers, FiCalendar, FiMapPin, FiAward, FiEdit2, FiTrash2, FiDownload, FiPlay, FiLink, FiExternalLink, FiYoutube } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import * as employeeService from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { exportToExcel } from '../lib/excelExport';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { PageSkeleton } from '../components/SkeletonLoader';

const catColors = { technical: '#3B82F6', soft_skill: '#10B981', compliance: '#F59E0B', leadership: '#8B5CF6', certification: '#EC4899' };
const catLabels = { technical: 'Technical', soft_skill: 'Soft Skill', compliance: 'Compliance', leadership: 'Leadership', certification: 'Certification' };
const statusColors = { upcoming: '#3B82F6', ongoing: '#F59E0B', completed: '#16A34A', cancelled: '#DC2626' };
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

 useEffect(() => { fetchData(); }, []);

 const fetchData = async () => {
 setLoading(true);
 const [tRes, eRes] = await Promise.all([
 supabase.from('trainings').select('*, training_participants(*, employees(name, division)), training_materials(*)').order('start_date', { ascending: false }),
 employeeService.getAllEmployees(undefined, employee?.company_id),
 ]);
 setTrainings(tRes.data || []);
 setEmployees(eRes.data || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('trainings', fetchData);

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
 await supabase.from('trainings').update(payload).eq('id', selected.id);
 } else {
 await supabase.from('trainings').insert(payload);
 }
 setModal(null);
 fetchData();
 };

 const handleDelete = async (id) => {
 if (!confirm('Hapus pelatihan ini?')) return;
 await supabase.from('trainings').delete().eq('id', id);
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
 <div>
 <div className="page-header">
 <h1><FiBook style={{ marginRight: 10 }} /> Training & Learning</h1>
 <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
 <button className="btn-secondary" onClick={handleExport}><FiDownload /> Export</button>
 <button className="btn-primary" onClick={openCreate}><FiPlus /> Tambah Pelatihan</button>
 </div>
 </div>

 {/* Stats */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
 {[
 { label: 'Total Pelatihan', value: trainings.length, color: '#3B82F6', icon: <FiBook /> },
 { label: 'Akan Datang', value: upcoming, color: '#F59E0B', icon: <FiCalendar /> },
 { label: 'Selesai', value: completedCount, color: '#16A34A', icon: <FiCheck /> },
 { label: 'Total Peserta', value: totalParticipants, color: '#8B5CF6', icon: <FiUsers /> },
 { label: 'Total Materi', value: totalMaterials, color: '#EC4899', icon: <FiPlay /> },
 ].map(s => (
 <div key={s.label} className="info-card">
 <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: s.color, marginBottom: 8 }}>{s.icon} <span style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</span></div>
 <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
 </div>
 ))}
 </div>

 {/* Training Cards */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
 {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="info-card skeleton" style={{ height: 180 }} />) :
 trainings.length === 0 ? (
 <div className="info-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
 Belum ada data pelatihan.
 </div>
 ) : trainings.map(t => (
 <div key={t.id} className="info-card" style={{ cursor: 'pointer', transition: 'all 0.2s', borderTop: `3px solid ${catColors[t.category] || '#6D8196'}` }} onClick={() => openDetail(t)}>
 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
 <div style={{ flex: 1 }}>
 <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t.title}</div>
 <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
 <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#fff', background: catColors[t.category] }}>{catLabels[t.category]}</span>
 <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#fff', background: statusColors[t.status] }}>{statusLabels[t.status]}</span>
 {(t.training_materials || []).length > 0 && (
 <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#EC4899', background: '#FDF2F8' }}>
 <FiPlay size={9} style={{ marginRight: 3 }} />{(t.training_materials || []).length} Materi
 </span>
 )}
 </div>
 </div>
 <div style={{ display: 'flex', gap: 4 }}>
 <button className="action-btn" onClick={(e) => { e.stopPropagation(); setSelected(t); setForm({ title: t.title, category: t.category, instructor: t.instructor || '', location: t.location || '', startDate: t.start_date || '', endDate: t.end_date || '', maxParticipants: t.max_participants, description: t.description || '' }); setModal('form'); }}><FiEdit2 size={13} /></button>
 <button className="action-btn danger" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}><FiTrash2 size={13} /></button>
 </div>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
 {t.instructor && <div><FiUsers style={{ marginRight: 4 }} />{t.instructor}</div>}
 {t.location && <div><FiMapPin style={{ marginRight: 4 }} />{t.location}</div>}
 {t.start_date && <div><FiCalendar style={{ marginRight: 4 }} />{t.start_date}{t.end_date && t.end_date !== t.start_date ? ` - ${t.end_date}` : ''}</div>}
 <div><FiUsers style={{ marginRight: 4 }} />{(t.training_participants || []).length}/{t.max_participants} peserta</div>
 </div>
 </div>
 ))}
 </div>

 {/* Create/Edit Modal */}
 {modal === 'form' && (
 <div className="modal-overlay" onClick={() => setModal(null)}>
 <div className="modal-box large" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2>{selected ? 'Edit Pelatihan' : 'Tambah Pelatihan Baru'}</h2>
 <button className="modal-close" onClick={() => setModal(null)}><FiX /></button>
 </div>
 <div className="modal-body">
 <div className="form-grid">
 <div className="form-group full-width"><label className="form-label">Judul *</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
 <div className="form-group"><label className="form-label">Kategori</label><select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{Object.entries(catLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
 <div className="form-group"><label className="form-label">Instruktur</label><input className="form-input" value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} /></div>
 <div className="form-group"><label className="form-label">Lokasi</label><input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
 <div className="form-group"><label className="form-label">Max Peserta</label><input className="form-input" type="number" value={form.maxParticipants} onChange={e => setForm({ ...form, maxParticipants: Number(e.target.value) })} /></div>
 <div className="form-group"><label className="form-label">Tanggal Mulai</label><input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
 <div className="form-group"><label className="form-label">Tanggal Selesai</label><input className="form-input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
 <div className="form-group full-width"><label className="form-label">Deskripsi</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
 </div>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
 <button className="btn-primary" onClick={handleSubmit} disabled={!form.title}><FiCheck /> {selected ? 'Update' : 'Simpan'}</button>
 </div>
 </div>
 </div>
 )}

 {/* Detail + Participants + Materials Modal */}
 {modal === 'detail' && selected && (
 <div className="modal-overlay" onClick={() => setModal(null)}>
 <div className="modal-box large" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2>{selected.title}</h2>
 <button className="modal-close" onClick={() => setModal(null)}><FiX /></button>
 </div>
 <div className="modal-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
 {selected.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{selected.description}</p>}

 {/* Tabs */}
 <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
 <button
 onClick={() => setDetailTab('participants')}
 style={{
 padding: '8px 18px', borderRadius: 99, border: 'none',
 background: detailTab === 'participants' ? 'var(--primary)' : 'var(--bg)',
 color: detailTab === 'participants' ? '#fff' : 'var(--text-secondary)',
 fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
 }}
 >
 <FiUsers style={{ marginRight: 6 }} /> Peserta ({participants.length})
 </button>
 <button
 onClick={() => setDetailTab('materials')}
 style={{
 padding: '8px 18px', borderRadius: 99, border: 'none',
 background: detailTab === 'materials' ? '#EC4899' : 'var(--bg)',
 color: detailTab === 'materials' ? '#fff' : 'var(--text-secondary)',
 fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
 }}
 >
 <FiPlay style={{ marginRight: 6 }} /> Materi ({materials.length})
 </button>
 </div>

 {/* Participants Tab */}
 {detailTab === 'participants' && (
 <>
 <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
 <select className="form-select" value={addEmpId} onChange={e => setAddEmpId(e.target.value)} style={{ flex: 1 }}>
 <option value="">-- Tambah Peserta --</option>
 {employees.filter(e => !participants.some(p => p.employee_id === e.id)).map(e => (
 <option key={e.id} value={e.id}>{e.name} - {e.division || ''}</option>
 ))}
 </select>
 <button className="btn-primary btn-sm" onClick={addParticipant} disabled={!addEmpId}><FiPlus /></button>
 </div>

 {participants.length === 0 ? (
 <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Belum ada peserta.</div>
 ) : participants.map(p => (
 <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: 6, border: '1px solid var(--border)' }}>
 <div style={{ flex: 1 }}>
 <div style={{ fontWeight: 600, fontSize: 13 }}>{p.employees?.name || '-'}</div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.employees?.division || ''}</div>
 </div>
 <select
 style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface)' }}
 value={p.status}
 onChange={e => updateParticipantStatus(p.id, e.target.value)}
 >
 <option value="registered">Terdaftar</option>
 <option value="attended">Hadir</option>
 <option value="completed">Lulus</option>
 <option value="absent">Absen</option>
 </select>
 <button className="action-btn danger" onClick={() => removeParticipant(p.id)}><FiTrash2 size={13} /></button>
 </div>
 ))}
 </>
 )}

 {/* Materials Tab */}
 {detailTab === 'materials' && (
 <>
 {/* Add Material Form */}
 <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
 <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
 <FiPlus size={14} /> Tambah Materi/Link
 </div>
 <div className="form-grid">
 <div className="form-group">
 <label className="form-label">Judul Materi *</label>
 <input className="form-input" value={materialForm.title} onChange={e => setMaterialForm({ ...materialForm, title: e.target.value })} placeholder="Contoh: Video Pengenalan AI" />
 </div>
 <div className="form-group">
 <label className="form-label">URL Link/YouTube *</label>
 <input className="form-input" value={materialForm.url} onChange={e => setMaterialForm({ ...materialForm, url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
 </div>
 <div className="form-group full-width">
 <label className="form-label">Deskripsi (opsional)</label>
 <input className="form-input" value={materialForm.description} onChange={e => setMaterialForm({ ...materialForm, description: e.target.value })} placeholder="Deskripsi singkat materi..." />
 </div>
 </div>
 {/* YouTube Preview */}
 {materialForm.url && getYouTubeId(materialForm.url) && (
 <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
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
 <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }}>
 <FiLink size={12} style={{ marginRight: 6, color: 'var(--muted)' }} />
 Tipe: {materialTypes[detectMaterialType(materialForm.url)]}
 </div>
 )}
 <button className="btn-primary" style={{ marginTop: 12 }} onClick={addMaterial} disabled={!materialForm.title || !materialForm.url}>
 <FiPlus /> Tambah Materi
 </button>
 </div>

 {/* Material List */}
 {materials.length === 0 ? (
 <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
 Belum ada materi. Tambahkan link YouTube atau materi lainnya di atas.
 </div>
 ) : materials.map(m => {
 const ytId = getYouTubeId(m.url);
 return (
 <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: 8, border: '1px solid var(--border)' }}>
 <div style={{
 width: 36, height: 36, borderRadius: 8,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 background: ytId ? '#FEE2E2' : '#E8F0FE',
 color: ytId ? '#DC2626' : 'var(--primary)',
 flexShrink: 0,
 }}>
 {ytId ? <FiPlay size={16} /> : <FiExternalLink size={16} />}
 </div>
 <div style={{ flex: 1 }}>
 <div style={{ fontWeight: 600, fontSize: 13 }}>{m.title}</div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>
 {materialTypes[m.type] || 'Link'} {m.description ? `- ${m.description}` : ''}
 </div>
 </div>
 <a href={m.url} target="_blank" rel="noopener noreferrer" className="action-btn" title="Buka">
 <FiExternalLink size={13} />
 </a>
 <button className="action-btn danger" onClick={() => removeMaterial(m.id)} title="Hapus">
 <FiTrash2 size={13} />
 </button>
 </div>
 );
 })}
 </>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
