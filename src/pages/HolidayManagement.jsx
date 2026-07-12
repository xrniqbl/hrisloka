import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiStar, FiPlus, FiCheck, FiEdit2, FiTrash2, FiDownload, FiCalendar } from 'react-icons/fi';
import * as holidayService from '../services/holidayService';
import { exportToExcel } from '../lib/excelExport';
import { useRealtimeTable } from '../hooks/useRealtime';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPanel, DialogFooter } from '@/components/ui/dialog';
import '../styles/shared.css';
import '../styles/admin.css';
import EmptyState from '../components/EmptyState';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function HolidayManagement() {
  const { employee: currentUser } = useAuth();
 const [holidays, setHolidays] = useState([]);
 const [loading, setLoading] = useState(true);
 const [modal, setModal] = useState(null);
 const [editId, setEditId] = useState(null);
 const [form, setForm] = useState({ name: '', date: '', description: '' });
 const [year, setYear] = useState(new Date().getFullYear());

 const fetchData = async () => {
 setLoading(true);
 const { data } = await holidayService.getAllHolidays(year, currentUser?.company_id);
 setHolidays(data || []);
 setLoading(false);
 };

 useEffect(() => {
  if (currentUser?.company_id) fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [year, currentUser?.company_id]);

 // Realtime: auto-refresh
 useRealtimeTable('holidays', fetchData, { companyId: currentUser?.company_id, enabled: !!currentUser?.company_id });

 const openCreate = () => { setForm({ name: '', date: '', description: '' }); setEditId(null); setModal('form'); };
 const openEdit = (h) => { setForm({ name: h.name, date: h.date, description: h.description || '' }); setEditId(h.id); setModal('form'); };

 const handleSubmit = async () => {
 if (!form.name || !form.date) return;
 if (editId) {
 await holidayService.updateHoliday(editId, form, currentUser?.company_id);
 } else {
 await holidayService.createHoliday(form, currentUser?.company_id);
 }
 setModal(null);
 fetchData();
 };

 const handleDelete = async (id) => {
 if (!confirm('Hapus hari libur ini?')) return;
 await holidayService.deleteHoliday(id, currentUser?.company_id);
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
 <div className="admin-page">
 <div className="page-header">
 <h1><FiStar className="icon-mr" /> Hari Libur</h1>
 <div className="page-header-actions">
 <NativeSelect value={year} onChange={e => setYear(Number(e.target.value))}>
 {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
 </NativeSelect>
 <Button variant="outline" className="btn-secondary" onClick={handleExport}><FiDownload /> Export</Button>
 <Button className="btn-primary" onClick={openCreate}><FiPlus /> Tambah</Button>
 </div>
 </div>

 {/* Stats */}
 <div className="stats-grid">
 <div className="info-card"><div className="info-card-label">Total Hari Libur {year}</div><div className="info-card-value danger">{holidays.length}</div></div>
 <div className="info-card"><div className="info-card-label">Mendatang</div><div className="info-card-value primary">{upcoming.length}</div></div>
 </div>

 {/* Monthly Timeline */}
 <div className="stats-grid">
 {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="info-card skeleton" style={{ height: 120 }} />) :
 holidays.length === 0 ? (
 <div style={{ gridColumn: '1/-1' }}>
  <EmptyState
    title={`Belum ada hari libur ${year}`}
    description="Tambah hari libur nasional atau cuti bersama agar muncul di kalender PWA."
    ctaLabel="Tambah hari libur"
    onCta={openCreate}
  />
 </div>
 ) : Object.keys(byMonth).sort((a, b) => a - b).map(m => (
 <div key={m} className="data-table-card">
 <div className="data-table-header" style={{ background: 'linear-gradient(135deg, #DC262615, #DC262608)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: '#DC2626' }}>
 <FiCalendar className="icon-mr" /> {MONTHS[m]} {year}
 </div>
 {byMonth[m].map(h => (
 <div key={h.id} className="holiday-row">
 <div style={{
 width: 40, height: 40, borderRadius: 'var(--radius-sm)',
 background: h.date < today ? 'var(--muted)' : '#DC2626',
 color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
 fontSize: 14, fontWeight: 600, lineHeight: 1.1, flexShrink: 0,
 }}>
 {new Date(h.date).getDate()}
 </div>
 <div className="holiday-row-info">
 <div className="td-semibold">{h.name}</div>
 {h.description && <div className="td-muted-sm">{h.description}</div>}
 </div>
 <div className="actions-cell">
 <Button variant="ghost" size="icon" className="action-btn" onClick={() => openEdit(h)}><FiEdit2 size={13} /></Button>
 <Button variant="ghost" size="icon" className="action-btn danger" onClick={() => handleDelete(h.id)}><FiTrash2 size={13} /></Button>
 </div>
 </div>
 ))}
 </div>
 ))
 }
 </div>

 <Dialog open={modal === 'form'} onOpenChange={(open) => !open && setModal(null)}>
  <DialogContent>
   <DialogHeader>
    <DialogTitle>{editId ? 'Edit Hari Libur' : 'Tambah Hari Libur'}</DialogTitle>
   </DialogHeader>
   <DialogPanel>
    <div className="form-grid">
     <div className="form-group full-width"><label className="form-label">Nama *</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Hari Raya Idul Fitri" /></div>
     <div className="form-group"><label className="form-label">Tanggal *</label><DatePicker value={form.date} onChange={(value) => setForm({ ...form, date: value })} placeholder="Pilih tanggal libur" /></div>
     <div className="form-group full-width"><label className="form-label">Keterangan</label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
    </div>
   </DialogPanel>
   <DialogFooter>
    <Button variant="outline" className="btn-secondary" onClick={() => setModal(null)}>Batal</Button>
    <Button className="btn-primary" onClick={handleSubmit} disabled={!form.name || !form.date}><FiCheck /> {editId ? 'Update' : 'Simpan'}</Button>
   </DialogFooter>
  </DialogContent>
 </Dialog>
 </div>
 );
}


