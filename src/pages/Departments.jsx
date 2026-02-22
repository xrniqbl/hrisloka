import { useState, useEffect } from 'react';
import {
    FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiUsers,
    FiSearch, FiBriefcase, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';
import * as departmentService from '../services/departmentService';
import '../styles/shared.css';

export default function Departments() {
    const [departments, setDepartments] = useState([]);
    const [empCounts, setEmpCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editDept, setEditDept] = useState(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ name: '', description: '', is_active: true });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const [{ data: deptData }, { data: countData }] = await Promise.all([
            departmentService.getAllDepartments(),
            departmentService.getDepartmentEmployeeCounts(),
        ]);
        setDepartments(deptData || []);
        setEmpCounts(countData || {});
        setLoading(false);
    };

    const openAdd = () => {
        setEditDept(null);
        setForm({ name: '', description: '', is_active: true });
        setShowModal(true);
    };

    const openEdit = (d) => {
        setEditDept(d);
        setForm({ name: d.name, description: d.description || '', is_active: d.is_active });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (editDept) {
            await departmentService.updateDepartment(editDept.id, form);
        } else {
            await departmentService.createDepartment(form);
        }
        setShowModal(false);
        fetchData();
    };

    const handleDelete = async (id) => {
        const count = empCounts[id] || 0;
        if (count > 0) {
            alert(`Tidak bisa dihapus. Masih ada ${count} karyawan di departemen ini.`);
            return;
        }
        if (!confirm('Hapus departemen ini?')) return;
        await departmentService.deleteDepartment(id);
        fetchData();
    };

    const handleToggleActive = async (d) => {
        await departmentService.updateDepartment(d.id, { ...d, is_active: !d.is_active });
        fetchData();
    };

    const filtered = departments.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.description || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalEmp = Object.values(empCounts).reduce((a, b) => a + b, 0);

    if (loading) {
        return (
            <div className="shared-page">
                <div className="shared-header">
                    <div><h1>🏷️ Master Departemen</h1><p>Kelola daftar divisi perusahaan</p></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="shared-card" style={{ height: 80, background: 'var(--bg)', borderRadius: 12 }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="shared-page">
            <div className="shared-header">
                <div>
                    <h1>🏷️ Master Departemen</h1>
                    <p>Kelola daftar divisi perusahaan</p>
                </div>
                <button className="shared-btn-primary" onClick={openAdd}>
                    <FiPlus /> Tambah Departemen
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Departemen', value: departments.length, color: '#6366F1', icon: <FiBriefcase /> },
                    { label: 'Aktif', value: departments.filter(d => d.is_active).length, color: '#10B981', icon: <FiCheck /> },
                    { label: 'Total Karyawan', value: totalEmp, color: '#8B5CF6', icon: <FiUsers /> },
                ].map(s => (
                    <div key={s.label} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: 'var(--card)', border: '1.5px solid var(--border)',
                        borderRadius: 14, padding: '12px 18px', flex: '1 1 140px',
                    }}>
                        <div style={{ color: s.color, fontSize: 18 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
                <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cari departemen..."
                    style={{
                        width: '100%', padding: '10px 12px 10px 36px', fontSize: 13,
                        border: '1.5px solid var(--border)', borderRadius: 10,
                        background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
                        outline: 'none', boxSizing: 'border-box',
                    }}
                />
            </div>

            {/* Department Table */}
            <div className="shared-card" style={{ borderRadius: 14, overflow: 'hidden', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--border)' }}>
                            <th style={thStyle}>Departemen</th>
                            <th style={thStyle}>Deskripsi</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Karyawan</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                            <th style={{ ...thStyle, textAlign: 'center', width: 100 }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(d => (
                            <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', opacity: d.is_active ? 1 : 0.5 }}>
                                <td style={tdStyle}>
                                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                                </td>
                                <td style={{ ...tdStyle, color: 'var(--text-tertiary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {d.description || '—'}
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                        background: (empCounts[d.id] || 0) > 0 ? 'rgba(99,102,241,0.1)' : 'var(--bg)',
                                        color: (empCounts[d.id] || 0) > 0 ? '#6366F1' : 'var(--text-tertiary)',
                                    }}>
                                        {empCounts[d.id] || 0}
                                    </span>
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    <button
                                        onClick={() => handleToggleActive(d)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: d.is_active ? '#10B981' : '#9CA3AF', fontSize: 20 }}
                                        title={d.is_active ? 'Aktif — klik untuk nonaktifkan' : 'Nonaktif — klik untuk aktifkan'}
                                    >
                                        {d.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                                    </button>
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                        <button onClick={() => openEdit(d)} style={actionBtn} title="Edit">
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(d.id)} style={{ ...actionBtn, color: '#EF4444' }} title="Hapus">
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
                                    {search ? 'Tidak ditemukan' : 'Belum ada departemen'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div style={overlay} onClick={() => setShowModal(false)}>
                    <div style={modal} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                                {editDept ? '✏️ Edit Departemen' : '🏷️ Tambah Departemen Baru'}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                                <FiX size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Nama Departemen <span style={{ color: '#EF4444' }}>*</span></label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Contoh: Human Resources & General Affairs"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Deskripsi</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Penjelasan singkat fungsi departemen ini..."
                                    style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Status</label>
                                <div
                                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                                        border: `1.5px solid ${form.is_active ? '#10B981' : 'var(--border)'}`,
                                        background: form.is_active ? 'rgba(16,185,129,0.06)' : 'var(--bg)',
                                    }}
                                >
                                    <div style={{
                                        width: 38, height: 22, borderRadius: 11,
                                        background: form.is_active ? '#10B981' : '#D1D5DB',
                                        position: 'relative', transition: 'background 0.3s', flexShrink: 0,
                                    }}>
                                        <div style={{
                                            width: 16, height: 16, borderRadius: '50%',
                                            background: '#fff', position: 'absolute', top: 3,
                                            left: form.is_active ? 19 : 3,
                                            transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }} />
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: form.is_active ? '#059669' : 'var(--text-secondary)' }}>
                                        {form.is_active ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowModal(false)} style={cancelBtn}>Batal</button>
                            <button
                                onClick={handleSave}
                                disabled={!form.name}
                                style={{ ...saveBtn, opacity: !form.name ? 0.5 : 1 }}
                            >
                                <FiCheck size={16} /> {editDept ? 'Simpan' : 'Tambah'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Styles ───

const thStyle = { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '12px 16px', fontSize: 13 };

const actionBtn = {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
    padding: 6, cursor: 'pointer', color: 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', transition: 'all 0.15s',
};

const overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    backdropFilter: 'blur(4px)',
};

const modal = {
    background: 'var(--card)', borderRadius: 20, padding: 28,
    width: '90%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };

const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 13,
    border: '1.5px solid var(--border)', borderRadius: 8,
    background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
};

const cancelBtn = {
    padding: '9px 20px', fontSize: 13, fontWeight: 600,
    border: '1.5px solid var(--border)', borderRadius: 10,
    background: 'transparent', color: 'var(--text-secondary)',
    cursor: 'pointer', fontFamily: 'inherit',
};

const saveBtn = {
    padding: '9px 20px', fontSize: 13, fontWeight: 600,
    border: 'none', borderRadius: 10,
    background: 'var(--primary)', color: '#fff',
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 6,
};
