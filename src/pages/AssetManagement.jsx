import { useState, useEffect } from 'react';
import { FiPlus, FiEye, FiEdit2, FiMonitor, FiHardDrive, FiCpu, FiX } from 'react-icons/fi';
import * as assetService from '../services/assetService';
import * as employeeService from '../services/employeeService';
import '../styles/shared.css';

const statusColors = { 'in-use': '#0047AB', available: '#16A34A', maintenance: '#F59E0B' };
const statusLabels = { 'in-use': 'In Use', available: 'Available', maintenance: 'Maintenance' };
const categories = ['All', 'Laptop', 'Monitor', 'Mouse', 'Keyboard', 'Software', 'Peripheral'];

export default function AssetManagement() {
    const [assetList, setAssetList] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ name: '', category: 'Laptop', brand: '', serial: '', status: 'available', assigned_to: '', condition: 'New', notes: '' });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: aData } = await assetService.getAllAssets();
        const { data: eData } = await employeeService.getAllEmployees();
        setAssetList(aData || []);
        setEmployees(eData || []);
        setLoading(false);
    };

    const stats = [
        { label: 'Total Aset', value: assetList.length, color: '#0047AB', icon: <FiHardDrive /> },
        { label: 'In Use', value: assetList.filter(a => a.status === 'in-use').length, color: '#0047AB', icon: <FiCpu /> },
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

    return (
        <div>
            <div className="page-header">
                <h1>IT Asset Management</h1>
                <div className="page-header-actions">
                    <button className="btn-primary" onClick={openAdd}><FiPlus /> Tambah Aset</button>
                </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ color: s.color, fontSize: 20 }}>{s.icon}</span>
                            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <input className="filter-search" placeholder="Cari aset..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="All">Semua Status</option>
                    <option value="in-use">In Use</option>
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                </select>
            </div>

            {/* Table */}
            <div className="data-table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nama</th>
                            <th>Kategori</th>
                            <th>Brand</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(a => (
                            <tr key={a.id}>
                                <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{a.id}</td>
                                <td>{a.name}</td>
                                <td>{a.category}</td>
                                <td>{a.brand}</td>
                                <td>
                                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff', background: statusColors[a.status] || '#999' }}>
                                        {statusLabels[a.status] || a.status}
                                    </span>
                                </td>
                                <td>{a.employees?.name || getEmpName(a.assigned_to) || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                                <td>
                                    <div className="actions-cell">
                                        <button className="action-btn" title="Lihat" onClick={() => openView(a)}><FiEye /></button>
                                        <button className="action-btn" title="Edit" onClick={() => openEdit(a)}><FiEdit2 /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} className="empty-state">Belum ada aset.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* View Modal */}
            {modal === 'view' && selected && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detail Aset — {selected.id}</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                {[
                                    ['Nama', selected.name], ['Kategori', selected.category], ['Brand', selected.brand],
                                    ['Serial', selected.serial], ['Tanggal Beli', selected.purchase_date], ['Kondisi', selected.condition],
                                    ['Status', statusLabels[selected.status] || selected.status],
                                    ['Assigned To', selected.employees?.name || getEmpName(selected.assigned_to) || '—'],
                                ].map(([l, v]) => (
                                    <div key={l} className="form-group">
                                        <label className="form-label" style={{ color: 'var(--muted)' }}>{l}</label>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                                    </div>
                                ))}
                                <div className="form-group full-width">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Notes</label>
                                    <div style={{ fontSize: 14 }}>{selected.notes || '—'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {(modal === 'add' || modal === 'edit') && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{modal === 'add' ? 'Tambah Aset Baru' : 'Edit Aset'}</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Nama Aset</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder='MacBook Pro 14"' />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kategori</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Brand</label>
                                    <input className="form-input" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Apple" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Serial Number</label>
                                    <input className="form-input" value={form.serial} onChange={e => setForm({ ...form, serial: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kondisi</label>
                                    <select className="form-select" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                                        <option value="New">New</option>
                                        <option value="Good">Good</option>
                                        <option value="Fair">Fair</option>
                                        <option value="Poor">Poor</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assign ke Karyawan</label>
                                    <select className="form-select" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                                        <option value="">— Tidak di-assign —</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={form.assigned_to ? 'in-use' : form.status} disabled={!!form.assigned_to} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        <option value="available">Available</option>
                                        <option value="in-use">In Use</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModal}>Batal</button>
                            <button className="btn-primary" onClick={handleSave}>{modal === 'add' ? 'Simpan' : 'Update'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
