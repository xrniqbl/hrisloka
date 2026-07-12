import { useState, useEffect } from 'react';
import { FiPlus, FiEye, FiEdit2, FiMonitor, FiHardDrive, FiCpu, FiX } from 'react-icons/fi';
import * as assetService from '../services/assetService';
import { useAuth } from '../context/AuthContext';
import * as employeeService from '../services/employeeService';

import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPanel, DialogFooter } from '@/components/ui/dialog';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

const statusColors = { 'in-use': '#635BFF', available: '#16A34A', maintenance: '#F59E0B' };
const statusLabels = { 'in-use': 'In Use', available: 'Available', maintenance: 'Maintenance' };
const categories = ['All', 'Laptop', 'Monitor', 'Mouse', 'Keyboard', 'Software', 'Peripheral'];

export default function AssetManagement() {
  const { employee } = useAuth();
 const [assetList, setAssetList] = useState([]);
 const [employees, setEmployees] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [filterCat, setFilterCat] = useState('All');
 const [filterStatus, setFilterStatus] = useState('All');
 const [modal, setModal] = useState(null);
 const [selected, setSelected] = useState(null);
 const [form, setForm] = useState({ name: '', category: 'Laptop', brand: '', serial: '', status: 'available', assigned_to: '', condition: 'New', notes: '' });

 useEffect(() => {
 if (!employee?.company_id) {
 setLoading(false);
 return;
 }
 fetchData();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [employee?.company_id]);

 const fetchData = async () => {
 setLoading(true);
 const { data: aData } = await assetService.getAllAssets(employee?.company_id);
 const { data: eData } = await employeeService.getAllEmployees(undefined, employee?.company_id);
 setAssetList(aData || []);
 setEmployees(eData || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('assets', fetchData, { companyId: currentUser?.company_id });

 const stats = [
 { label: 'Total Aset', value: assetList.length, color: '#635BFF', icon: <FiHardDrive /> },
 { label: 'In Use', value: assetList.filter(a => a.status === 'in-use').length, color: '#635BFF', icon: <FiCpu /> },
 { label: 'Available', value: assetList.filter(a => a.status === 'available').length, color: '#16A34A', icon: <FiMonitor /> },
 { label: 'Maintenance', value: assetList.filter(a => a.status === 'maintenance').length, color: '#F59E0B', icon: <FiMonitor /> },
 ];

 const filtered = assetList.filter(a => {
 const matchSearch = (a.name || '').toLowerCase().includes(search.toLowerCase());
 const matchCat = filterCat === 'All' || a.category === filterCat;
 const matchStatus = filterStatus === 'All' || a.status === filterStatus;
 return matchSearch && matchCat && matchStatus;
 });

 const openAdd = () => { setForm({ name: '', category: 'Laptop', brand: '', serial: '', status: 'available', assigned_to: '', condition: 'New', notes: '' }); setModal('add'); };
 const openView = (a) => { setSelected(a); setModal('view'); };
 const openEdit = (a) => { setForm({ ...a, assigned_to: a.assigned_to || '' }); setModal('edit'); };
 const closeModal = () => { setModal(null); setSelected(null); };

 const handleSave = async () => {
 const assetData = { ...form, assigned_to: form.assigned_to ? Number(form.assigned_to) : null, status: form.assigned_to ? 'in-use' : form.status };
 if (modal === 'add') {
 await assetService.createAsset(assetData);
 } else {
 await assetService.updateAsset(form.id, assetData);
 }
 closeModal();
 fetchData();
 };

 const getEmpName = (id) => {
 if (!id) return null;
 const emp = employees.find(e => e.id === id);
 return emp?.name || null;
 };

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={5} />;
 return (
 <div className="admin-page">
 <div className="page-header">
 <h1>IT Asset Management</h1>
 <div className="page-header-actions">
 <Button onClick={openAdd}><FiPlus /> Tambah Aset</Button>
 </div>
 </div>

 {/* Stat Cards */}
 <div className="stats-grid">
 {stats.map(s => (
 <div key={s.label} className="info-card">
 <div className="btn-icon-row" style={{ color: s.color, marginBottom: 8 }}>
 <span style={{ fontSize: 20 }}>{s.icon}</span>
 <span className="info-card-label">{s.label}</span>
 </div>
 <div className="info-card-value" style={{ color: s.color }}>{s.value}</div>
 </div>
 ))}
 </div>

 {/* Filters */}
 <div className="filters-bar">
 <Input className="filter-search" placeholder="Cari aset..." value={search} onChange={e => setSearch(e.target.value)} />
 <NativeSelect className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
 {categories.map(c => <option key={c} value={c}>{c}</option>)}
 </NativeSelect>
 <NativeSelect className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
 <option value="All">Semua Status</option>
 <option value="in-use">In Use</option>
 <option value="available">Available</option>
 <option value="maintenance">Maintenance</option>
 </NativeSelect>
 </div>

 {/* Table */}
 <div className="data-table-card">
 <div className="table-responsive">
 <Table>
 <TableHeader>
 <TableRow>
  <TableHead>ID</TableHead>
  <TableHead>Nama</TableHead>
  <TableHead>Kategori</TableHead>
  <TableHead>Brand</TableHead>
  <TableHead>Status</TableHead>
  <TableHead>Assigned To</TableHead>
  <TableHead>Aksi</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filtered.map(a => (
 <TableRow key={a.id}>
 <TableCell className="td-mono-bold">{a.id}</TableCell>
 <TableCell>{a.name}</TableCell>
 <TableCell>{a.category}</TableCell>
 <TableCell>{a.brand}</TableCell>
 <TableCell>
 <span className="status-badge" style={{ background: statusColors[a.status] || '#999', color: '#fff' }}>
 {statusLabels[a.status] || a.status}
 </span>
 </TableCell>
 <TableCell>{a.employees?.name || getEmpName(a.assigned_to) || <span className="td-muted-sm">-</span>}</TableCell>
 <TableCell>
 <div className="actions-cell">
 <Button variant="ghost" size="icon" onClick={() => openView(a)}><FiEye /></Button>
 <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><FiEdit2 /></Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 {filtered.length === 0 && (
 <TableRow><TableCell colSpan={7} className="empty-state">Belum ada aset.</TableCell></TableRow>
 )}
  </TableBody>
 </Table>
 </div>
 </div>

 {/* View Modal */}
 {modal === 'view' && selected && (
 <Dialog open={modal === 'view'} onOpenChange={(open) => !open && closeModal()}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>Detail Aset - {selected.id}</DialogTitle>
 </DialogHeader>
 <DialogPanel>
 <div className="form-grid">
 {[
 ['Nama', selected.name], ['Kategori', selected.category], ['Brand', selected.brand],
 ['Serial', selected.serial], ['Tanggal Beli', selected.purchase_date], ['Kondisi', selected.condition],
 ['Status', statusLabels[selected.status] || selected.status],
 ['Assigned To', selected.employees?.name || getEmpName(selected.assigned_to) || '-'],
 ].map(([l, v]) => (
 <div key={l} className="form-group">
 <label className="form-label td-muted-sm">{l}</label>
 <div className="td-semibold">{v}</div>
 </div>
 ))}
 <div className="form-group full-width">
 <label className="form-label td-muted-sm">Notes</label>
 <div className="td-sm">{selected.notes || '-'}</div>
 </div>
 </div>
 </DialogPanel>
 </DialogContent>
 </Dialog>
 )}

 {/* Add/Edit Modal */}
 {(modal === 'add' || modal === 'edit') && (
 <Dialog open={modal === 'add' || modal === 'edit'} onOpenChange={(open) => !open && closeModal()}>
 <DialogContent className="max-w-3xl">
 <DialogHeader>
 <DialogTitle>{modal === 'add' ? 'Tambah Aset Baru' : 'Edit Aset'}</DialogTitle>
 </DialogHeader>
 <DialogPanel>
 <div className="form-grid">
 <div className="form-group">
 <label className="form-label">Nama Aset</label>
 <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder='MacBook Pro 14"' />
 </div>
 <div className="form-group">
 <label className="form-label">Kategori</label>
 <NativeSelect value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
 {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
 </NativeSelect>
 </div>
 <div className="form-group">
 <label className="form-label">Brand</label>
 <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Apple" />
 </div>
 <div className="form-group">
 <label className="form-label">Serial Number</label>
 <Input value={form.serial} onChange={e => setForm({ ...form, serial: e.target.value })} />
 </div>
 <div className="form-group">
 <label className="form-label">Kondisi</label>
 <NativeSelect value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
 <option value="New">New</option>
 <option value="Good">Good</option>
 <option value="Fair">Fair</option>
 <option value="Poor">Poor</option>
 </NativeSelect>
 </div>
 <div className="form-group">
 <label className="form-label">Assign ke Karyawan</label>
 <NativeSelect value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
 <option value="">- Tidak di-assign -</option>
 {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
 </NativeSelect>
 </div>
 <div className="form-group">
 <label className="form-label">Status</label>
 <NativeSelect value={form.assigned_to ? 'in-use' : form.status} disabled={!!form.assigned_to} onChange={e => setForm({ ...form, status: e.target.value })}>
 <option value="available">Available</option>
 <option value="in-use">In Use</option>
 <option value="maintenance">Maintenance</option>
 </NativeSelect>
 </div>
 <div className="form-group full-width">
 <label className="form-label">Notes</label>
 <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
 </div>
 </div>
 </DialogPanel>
 <DialogFooter>
 <Button variant="outline" onClick={closeModal}>Batal</Button>
 <Button onClick={handleSave}>{modal === 'add' ? 'Simpan' : 'Update'}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 )}
 </div>
 );
}

