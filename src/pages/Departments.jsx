import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiUsers,
  FiSearch, FiBriefcase, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';
import * as departmentService from '../services/departmentService';
import { useRealtimeTable } from '../hooks/useRealtime';
import { useAuth } from '../context/AuthContext';
import '../styles/shared.css';
import '../styles/admin.css';


export default function Departments() {
  const { employee } = useAuth();
  const companyId = employee?.company_id;
  const [departments, setDepartments] = useState([]);
  const [empCounts, setEmpCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', code: '', description: '', head: '', is_active: true });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: deptData }, { data: countData }] = await Promise.all([
      departmentService.getAllDepartments(companyId),
      departmentService.getDepartmentEmployeeCounts(companyId),
    ]);
    setDepartments(deptData || []);
    setEmpCounts(countData || {});
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [companyId]);

  // Realtime: auto-refresh
  useRealtimeTable('departments', fetchData);

  const openAdd = () => {
    setEditDept(null);
    setForm({ name: '', code: '', description: '', head: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditDept(d);
    setForm({ name: d.name, code: d.code || '', description: d.description || '', head: d.head || '', is_active: d.is_active });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (editDept) {
      await departmentService.updateDepartment(editDept.id, form);
    } else {
      await departmentService.createDepartment({ ...form, company_id: companyId });
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
      <div className="animate-in">
        <PageHeader titleKey="departments.title" subtitleKey="departments.subtitle" />
  <div className="page-header-actions">
        </div>
        <div className="stats-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="info-card skeleton" style={{ height: 80 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* ─── Header ─── */}
      <PageHeader titleKey="departments.title" subtitleKey="departments.subtitle" />
  <div className="page-header-actions">
        <div className="page-header-actions">
          <button className="btn-primary" onClick={openAdd}>
            <FiPlus /> Tambah Departemen
          </button>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: 20 }}>
        {[
          { label: 'Total Departemen', value: departments.length, color: '#6366F1', bg: 'rgba(99,102,241,0.08)', icon: <FiBriefcase /> },
          { label: 'Aktif', value: departments.filter(d => d.is_active).length, color: '#10B981', bg: 'rgba(16,185,129,0.08)', icon: <FiCheck /> },
          { label: 'Total Karyawan', value: totalEmp, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', icon: <FiUsers /> },
        ].map(s => (
          <div key={s.label} className="info-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: s.bg, color: s.color, fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Search ─── */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <div className="filter-search-wrap">
          <FiSearch className="filter-search-icon" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari departemen..."
            className="filter-search"
          />
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="data-table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Departemen</th>
                <th>Deskripsi</th>
                <th style={{ textAlign: 'center' }}>Karyawan</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center', width: 100 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} style={{ opacity: d.is_active ? 1 : 0.55 }}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{d.name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      {d.code && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px',
                          borderRadius: 4, background: 'rgba(99,102,241,0.08)',
                          color: '#6366F1', letterSpacing: '0.4px',
                        }}>{d.code}</span>
                      )}
                      {d.head && (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          Head: {d.head}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.description || '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${(empCounts[d.id] || 0) > 0 ? 'badge-primary' : 'badge-neutral'}`}>
                      {empCounts[d.id] || 0}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleActive(d)}
                      className="action-btn"
                      style={{ color: d.is_active ? '#10B981' : '#9CA3AF', fontSize: 20, border: 'none', background: 'none' }}
                      title={d.is_active ? 'Aktif — klik untuk nonaktifkan' : 'Nonaktif — klik untuk aktifkan'}
                    >
                      {d.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="actions-cell">
                      <button className="action-btn" onClick={() => openEdit(d)} title="Edit">
                        <FiEdit2 size={14} />
                      </button>
                      <button className="action-btn danger" onClick={() => handleDelete(d.id)} title="Hapus">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    <FiBriefcase size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
                    <div>{search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada departemen'}</div>
                    {!search && (
                      <button className="btn-primary" onClick={openAdd} style={{ marginTop: 14, fontSize: 12, padding: '8px 16px' }}>
                        <FiPlus size={13} /> Tambah Departemen
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal ─── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editDept ? 'Edit Departemen' : 'Tambah Departemen Baru'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <FiX size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Nama Departemen <span className="required">*</span></label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Contoh: Human Resources & General Affairs"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kode Departemen</label>
                  <input
                    className="form-input"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="HR, IT, FIN"
                    maxLength={10}
                  />
                  <span className="form-hint">Singkatan unik untuk departemen</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Kepala Departemen</label>
                  <input
                    className="form-input"
                    value={form.head}
                    onChange={e => setForm(f => ({ ...f, head: e.target.value }))}
                    placeholder="Nama kepala departemen"
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Deskripsi</label>
                  <textarea
                    className="form-textarea"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Penjelasan singkat fungsi departemen ini..."
                    rows={3}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Status</label>
                  <div
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className="toggle-row"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${form.is_active ? '#10B981' : 'var(--border)'}`,
                      background: form.is_active ? 'rgba(16,185,129,0.06)' : 'var(--bg)',
                      transition: 'all 0.2s',
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
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={!form.name}
              >
                <FiCheck size={15} /> {editDept ? 'Simpan Perubahan' : 'Tambah Departemen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
