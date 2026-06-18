import { useState, useEffect } from 'react';
import { FiStar, FiPlus, FiX, FiCheck, FiEdit2, FiTrash2, FiDownload, FiCalendar } from 'react-icons/fi';
import * as holidayService from '../services/holidayService';
import { exportToExcel } from '../lib/excelExport';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function HolidayManagement() {
 const [holidays, setHolidays] = useState([]);
 const [loading, setLoading] = useState(true);
 const [modal, setModal] = useState(null);
 const [editId, setEditId] = useState(null);
 const [form, setForm] = useState({ name: '', date: '', description: '' });
 const [year, setYear] = useState(new Date().getFullYear());

 useEffect(() => { fetchData(); }, [year]);

 const fetchData = async () => {
 setLoading(true);
 const { data } = await holidayService.getAllHolidays(year);
 setHolidays(data || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('holidays', fetchData);

 const openCreate = () => { setForm({ name: '', date: '', description: '' }); setEditId(null); setModal('form'); };
 const openEdit = (h) => { setForm({ name: h.name, date: h.date, description: h.description || '' }); setEditId(h.id); setModal('form'); };

 const handleSubmit = async () => {
 if (!form.name || !form.date) return;
 if (editId) {
 await holidayService.updateHoliday(editId, form);
 } else {
 await holidayService.createHoliday(form);
 }
 setModal(null);
 fetchData();
 };

 const handleDelete = async (id) => {
 if (!confirm('Hapus hari libur ini?')) return;
 await holidayService.deleteHoliday(id);
 fetchData();
 };

 const handleExport = () => {
 exportToExcel(holidays.map(h => ({ Tanggal: h.date, Nama: h.name, Keterangan: h.description || '' })), `Holidays_${year}.xlsx`, 'Holidays');
 };

 // Group by month
 const byMonth = {};
 holidays.forEach(h => {
 const m = new Date(h.date).getMonth();
 if (!byMonth[m]) byMonth[m] = [];
 byMonth[m].push(h);
 });

 const today = new Date().toISOString().split('T')[0];
 const upcoming = holidays.filter(h => h.date >= today);

 return (
 <div>
 <div className="page-header">
 <h1><FiStar style={{ marginRight: 10 }} /> Hari Libur</h1>
 <div className="page-header-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
 <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }}>
 {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
 </select>
 <button className="btn-secondary" onClick={handleExport}><FiDownload /> Export</button>
 <button className="btn-primary" onClick={openCreate}><FiPlus /> Tambah</button>
 </div>
 </div>

 {/* Stats */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
 <div className="info-card"><div style={{ fontSize: 12, color: 'var(--muted)' }}>Total Hari Libur {year}</div><div style={{ fontSize: 28, fontWeight: 800, color: '#DC2626' }}>{holidays.length}</div></div>
 <div className="info-card"><div style={{ fontSize: 12, color: 'var(--muted)' }}>Mendatang</div><div style={{ fontSize: 28, fontWeight: 800, color: '#3B82F6' }}>{upcoming.length}</div></div>
 </div>

 {/* Monthly Timeline */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
 {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="info-card skeleton" style={{ height: 120 }} />) :
 holidays.length === 0 ? (
 <div className="info-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Belum ada hari libur untuk tahun {year}.</div>
 ) : Object.keys(byMonth).sort((a, b) => a - b).map(m => (
 <div key={m} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
 <div style={{ background: 'linear-gradient(135deg, #DC262615, #DC262608)', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: '#DC2626' }}>
 <FiCalendar style={{ marginRight: 6 }} /> {MONTHS[m]} {year}
 </div>
 {byMonth[m].map(h => (
 <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
 <div style={{
 width: 40, height: 40, borderRadius: 'var(--radius-sm)',
 background: h.date < today ? 'var(--muted)' : '#DC2626',
 color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
 fontSize: 14, fontWeight: 800, lineHeight: 1.1, flexShrink: 0,
 }}>
 {new Date(h.date).getDate()}
 </div>
 <div style={{ flex: 1 }}>
 <div style={{ fontWeight: 600, fontSize: 13 }}>{h.name}</div>
 {h.description && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{h.description}</div>}
 </div>
 <div style={{ display: 'flex', gap: 4 }}>
 <button className="action-btn" onClick={() => openEdit(h)}><FiEdit2 size={13} /></button>
 <button className="action-btn danger" onClick={() => handleDelete(h.id)}><FiTrash2 size={13} /></button>
 </div>
 </div>
 ))}
 </div>
 ))
 }
 </div>

 {/* Form Modal */}
 {modal === 'form' && (
 <div className="modal-overlay" onClick={() => setModal(null)}>
 <div className="modal-box" onClick={e => e.stopPropagation()}>
 <div className="modal-header"><h2>{editId ? 'Edit Hari Libur' : 'Tambah Hari Libur'}</h2><button className="modal-close" onClick={() => setModal(null)}><FiX /></button></div>
 <div className="modal-body">
 <div className="form-grid">
 <div className="form-group full-width"><label className="form-label">Nama *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Hari Raya Idul Fitri" /></div>
 <div className="form-group"><label className="form-label">Tanggal *</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
 <div className="form-group full-width"><label className="form-label">Keterangan</label><input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
 </div>
 </div>
 <div className="modal-footer"><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={handleSubmit} disabled={!form.name || !form.date}><FiCheck /> {editId ? 'Update' : 'Simpan'}</button></div>
 </div>
 </div>
 )}
 </div>
 );
}
