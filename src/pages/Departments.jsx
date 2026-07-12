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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


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
  useRealtimeTable('departments', fetchData, { companyId: companyId });

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
      console.warn('[Departments] Cannot delete: ' + count + ' employees still assigned');
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
      {/* --- Header --- */}
      <PageHeader titleKey="departments.title" subtitleKey="departments.subtitle" />
  <div className="page-header-actions">
        <div className="page-header-actions">
          <Button onClick={openAdd}>
            <FiPlus /> Tambah Departemen
          </Button>
        </div>
      </div>

      {/* --- Stats --- */}
      <div className="stats-grid mb">
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
              <div className="info-card-value">{s.value}</div>
              <div className="info-card-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Search --- */}
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

      {/* --- Table --- */}
      <div className="data-table-card">
        <div className="table-responsive">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Departemen</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead style={{ textAlign: 'center' }}>Karyawan</TableHead>
                <TableHead style={{ textAlign: 'center' }}>Status</TableHead>
                <TableHead style={{ textAlign: 'center', width: 100 }}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(d => (
                <TableRow key={d.id} style={{ opacity: d.is_active ? 1 : 0.55 }}>
                  <TableCell>
                    <div className="td-semibold">{d.name}</div>
                    <div className="btn-icon-row" style={{ marginTop: 2, flexWrap: 'wrap' }}>
                      {d.code && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px',
                          borderRadius: 4, background: 'rgba(99,102,241,0.08)',
                          color: '#6366F1', letterSpacing: '0.4px',
                        }}>{d.code}</span>
                      )}
                      {d.head && (
                        <span className="td-muted-sm">
                          Head: {d.head}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="td-truncate" style={{ maxWidth: 220 }}>
                    {d.description || '-'}
                  </TableCell>
                  <TableCell style={{ textAlign: 'center' }}>
                    <span className={`badge ${(empCounts[d.id] || 0) > 0 ? 'badge-primary' : 'badge-neutral'}`}>
                      {empCounts[d.id] || 0}
                    </span>
                  </TableCell>
                  <TableCell style={{ textAlign: 'center' }}>
                    <Button
                      onClick={() => handleToggleActive(d)}
                      variant="ghost"
                      size="icon"
                      className="action-btn"
                      style={{ color: d.is_active ? '#10B981' : '#9CA3AF', fontSize: 20 }}
                      title={d.is_active ? 'Aktif - klik untuk nonaktifkan' : 'Nonaktif - klik untuk aktifkan'}
                    >
                      {d.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                    </Button>
                  </TableCell>
                  <TableCell style={{ textAlign: 'center' }}>
                    <div className="actions-cell">
                      <Button variant="ghost" size="icon" className="action-btn" onClick={() => openEdit(d)} title="Edit">
                        <FiEdit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="action-btn danger" onClick={() => handleDelete(d.id)} title="Hapus">
                        <FiTrash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="empty-state">
                    <FiBriefcase size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
                    <div>{search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada departemen'}</div>
                    {!search && (
                      <Button onClick={openAdd}>
                        <FiPlus size={13} /> Tambah Departemen
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* --- Modal --- */}
      {showModal && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editDept ? 'Edit Departemen' : 'Tambah Departemen Baru'}</DialogTitle>
              <Button variant="ghost" size="icon" className="modal-close" onClick={() => setShowModal(false)}>
                <FiX size={18} />
              </Button>
            </DialogHeader>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <Label>Nama Departemen <span className="required">*</span></Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Contoh: Human Resources & General Affairs"
                  />
                </div>
                <div className="form-group">
                  <Label>Kode Departemen</Label>
                  <Input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="HR, IT, FIN"
                    maxLength={10}
 />
                  <span className="form-hint">Singkatan unik untuk departemen</span>
                </div>
                <div className="form-group">
                  <Label>Kepala Departemen</Label>
                  <Input
                    value={form.head}
                    onChange={e => setForm(f => ({ ...f, head: e.target.value }))}
                    placeholder="Nama kepala departemen"
                  />
                </div>
                <div className="form-group full-width">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Penjelasan singkat fungsi departemen ini..."
                    rows={3} />
                </div>
                <div className="form-group full-width">
                  <Label>Status</Label>
                  <div
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className="toggle-row"
                    style={{
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
              <Button
                onClick={handleSave}
                disabled={!form.name}
              >
                <FiCheck size={15} /> {editDept ? 'Simpan Perubahan' : 'Tambah Departemen'}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}

