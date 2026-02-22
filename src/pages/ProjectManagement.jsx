import { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiBarChart2, FiList, FiCalendar, FiX, FiCheck, FiClock } from 'react-icons/fi';
import * as projectService from '../services/projectService';
import * as employeeService from '../services/employeeService';
import '../styles/shared.css';

const PRIORITY_COLORS = { low: '#6B7280', medium: '#3B82F6', high: '#F59E0B', critical: '#EF4444' };
const STATUS_LABELS = { active: 'Aktif', completed: 'Selesai', on_hold: 'Ditunda' };

export default function ProjectManagement() {
    const [projects, setProjects] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('list');
    const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'assign'
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ name: '', client: '', description: '', status: 'active', priority: 'medium', startDate: '', endDate: '', hourlyRate: '', color: '#2563EB' });
    const [assignForm, setAssignForm] = useState({ employeeId: '', role: 'member', allocationPct: 100 });
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const [p, a, e] = await Promise.all([
            projectService.getAllProjects(),
            projectService.getAllAssignments(),
            employeeService.getAllEmployees(),
        ]);
        setProjects(p.data || []);
        setAssignments(a.data || []);
        setEmployees(e.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = () => {
        setForm({ name: '', client: '', description: '', status: 'active', priority: 'medium', startDate: '', endDate: '', hourlyRate: '', color: '#2563EB' });
        setModal('create');
    };

    const openEdit = (p) => {
        setSelected(p);
        setForm({ name: p.name, client: p.client || '', description: p.description || '', status: p.status, priority: p.priority, startDate: p.start_date, endDate: p.end_date || '', hourlyRate: p.hourly_rate || '', color: p.color || '#2563EB' });
        setModal('edit');
    };

    const openAssign = (p) => {
        setSelected(p);
        setAssignForm({ employeeId: '', role: 'member', allocationPct: 100 });
        setModal('assign');
    };

    const handleSave = async () => {
        if (!form.name || !form.startDate) return;
        setSaving(true);
        if (modal === 'create') {
            await projectService.createProject(form);
        } else {
            await projectService.updateProject(selected.id, form);
        }
        setModal(null);
        setSaving(false);
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus proyek ini? Semua assignment & timesheet terkait akan ikut terhapus.')) return;
        await projectService.deleteProject(id);
        fetchData();
    };

    const handleAssign = async () => {
        if (!assignForm.employeeId) return;
        setSaving(true);
        await projectService.assignEmployee(selected.id, assignForm.employeeId, assignForm.role, assignForm.allocationPct);
        setSaving(false);
        setModal(null);
        fetchData();
    };

    const handleRemoveAssignment = async (aId) => {
        await projectService.removeAssignment(aId);
        fetchData();
    };

    // ─── Resource data ───
    const resourceData = useMemo(() => {
        const empMap = {};
        (assignments || []).forEach(a => {
            const eid = a.employee_id;
            if (!empMap[eid]) empMap[eid] = { employee: a.employees, projects: [], totalAlloc: 0 };
            empMap[eid].projects.push(a);
            if (a.projects?.status === 'active') empMap[eid].totalAlloc += (a.allocation_pct || 0);
        });
        return Object.values(empMap).sort((a, b) => b.totalAlloc - a.totalAlloc);
    }, [assignments]);

    // ─── Gantt data ───
    const ganttData = useMemo(() => {
        const active = projects.filter(p => p.start_date);
        if (!active.length) return { projects: [], minDate: new Date(), maxDate: new Date(), totalDays: 1 };
        const dates = active.flatMap(p => [new Date(p.start_date), p.end_date ? new Date(p.end_date) : new Date()]);
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / 86400000) + 1);
        return { projects: active, minDate, maxDate, totalDays };
    }, [projects]);

    const getBarStyle = (p) => {
        const start = new Date(p.start_date);
        const end = p.end_date ? new Date(p.end_date) : new Date();
        const left = Math.max(0, (start - ganttData.minDate) / 86400000 / ganttData.totalDays * 100);
        const width = Math.max(2, ((end - start) / 86400000 + 1) / ganttData.totalDays * 100);
        return { left: `${left}%`, width: `${width}%`, background: p.color || '#2563EB' };
    };

    const assignmentsFor = (projectId) => (assignments || []).filter(a => a.project_id === projectId);

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Memuat proyek...</div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Manajemen Proyek</h1>
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{projects.length} proyek • {assignments.length} penugasan</p>
                </div>
                <button className="btn-primary" onClick={openCreate}><FiPlus /> Proyek Baru</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 4, border: '1px solid var(--border)' }}>
                {[
                    { key: 'list', label: 'Proyek', icon: <FiList size={14} /> },
                    { key: 'gantt', label: 'Gantt Chart', icon: <FiBarChart2 size={14} /> },
                    { key: 'resource', label: 'Resource', icon: <FiUsers size={14} /> },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                        background: tab === t.key ? 'var(--primary)' : 'transparent',
                        color: tab === t.key ? '#fff' : 'var(--muted)',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ═══ LIST TAB ═══ */}
            {tab === 'list' && (
                <div className="cards-grid">
                    {projects.map(p => (
                        <div className="info-card" key={p.id} style={{ borderLeft: `4px solid ${p.color || '#2563EB'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                                    {p.client && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Klien: {p.client}</div>}
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn-icon" onClick={() => openAssign(p)} title="Assign"><FiUsers size={14} /></button>
                                    <button className="btn-icon" onClick={() => openEdit(p)} title="Edit"><FiEdit2 size={14} /></button>
                                    <button className="btn-icon" onClick={() => handleDelete(p.id)} title="Hapus" style={{ color: 'var(--danger)' }}><FiTrash2 size={14} /></button>
                                </div>
                            </div>
                            {p.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>{p.description}</div>}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                <span className="badge" style={{ background: `${PRIORITY_COLORS[p.priority]}18`, color: PRIORITY_COLORS[p.priority] }}>{p.priority.toUpperCase()}</span>
                                <span className="badge" style={{ background: p.status === 'active' ? 'rgba(16,185,129,.1)' : p.status === 'completed' ? 'rgba(107,114,128,.1)' : 'rgba(245,158,11,.1)', color: p.status === 'active' ? 'var(--success)' : p.status === 'completed' ? 'var(--muted)' : 'var(--warning)' }}>{STATUS_LABELS[p.status]}</span>
                                {p.hourly_rate > 0 && <span className="badge">Rp {Number(p.hourly_rate).toLocaleString('id-ID')}/jam</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 12 }}>
                                <span><FiCalendar size={11} /> {p.start_date}{p.end_date ? ` — ${p.end_date}` : ''}</span>
                                <span><FiUsers size={11} /> {assignmentsFor(p.id).length} anggota</span>
                            </div>
                            {/* Assignment list */}
                            {assignmentsFor(p.id).length > 0 && (
                                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                                    {assignmentsFor(p.id).map(a => (
                                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
                                            <span>{a.employees?.name} <span style={{ color: 'var(--muted)' }}>({a.role}, {a.allocation_pct}%)</span></span>
                                            <button onClick={() => handleRemoveAssignment(a.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {projects.length === 0 && (
                        <div className="info-card" style={{ textAlign: 'center', padding: 40, gridColumn: '1/-1' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
                            <div style={{ fontWeight: 600 }}>Belum ada proyek</div>
                            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Klik "Proyek Baru" untuk memulai.</div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ GANTT TAB ═══ */}
            {tab === 'gantt' && (
                <div className="info-card" style={{ overflow: 'auto' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📊 Timeline Proyek</div>
                    {ganttData.projects.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>Tidak ada proyek dengan tanggal.</div>
                    ) : (
                        <div style={{ minWidth: 600 }}>
                            {/* Timeline header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 8, padding: '0 140px 0 0' }}>
                                <span>{ganttData.minDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                <span>{new Date((ganttData.minDate.getTime() + ganttData.maxDate.getTime()) / 2).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                <span>{ganttData.maxDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                            </div>
                            {/* Bars */}
                            {ganttData.projects.map(p => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ width: 140, flexShrink: 0, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }} title={p.name}>{p.name}</div>
                                    <div style={{ flex: 1, position: 'relative', height: 28, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                        <div style={{
                                            position: 'absolute', top: 2, height: 24, borderRadius: 'var(--radius-sm)',
                                            ...getBarStyle(p),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 10, color: '#fff', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap',
                                        }}>
                                            {assignmentsFor(p.id).length > 0 && `${assignmentsFor(p.id).length} org`}
                                        </div>
                                        {/* Today marker */}
                                        {(() => {
                                            const todayPct = ((new Date() - ganttData.minDate) / 86400000 / ganttData.totalDays) * 100;
                                            return todayPct >= 0 && todayPct <= 100 ? (
                                                <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: 2, background: 'var(--danger)', zIndex: 1 }} title="Hari ini" />
                                            ) : null;
                                        })()}
                                    </div>
                                </div>
                            ))}
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 12, height: 2, background: 'var(--danger)', display: 'inline-block' }} /> Hari ini
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ RESOURCE TAB ═══ */}
            {tab === 'resource' && (
                <div>
                    <div className="info-card" style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>👥 Pemantauan Beban Kerja</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Karyawan dengan alokasi &gt;100% berisiko burnout</div>
                    </div>
                    {resourceData.length === 0 ? (
                        <div className="info-card" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>Belum ada penugasan.</div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Karyawan</th><th>Divisi</th><th>Proyek Aktif</th><th>Total Alokasi</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {resourceData.map((r, i) => {
                                        const overload = r.totalAlloc > 100;
                                        return (
                                            <tr key={i} style={overload ? { background: 'rgba(239,68,68,.04)' } : {}}>
                                                <td style={{ fontWeight: 600 }}>{r.employee?.name || '—'}</td>
                                                <td>{r.employee?.division || '—'}</td>
                                                <td>
                                                    {r.projects.filter(a => a.projects?.status === 'active').map((a, j) => (
                                                        <span key={j} className="badge" style={{ marginRight: 4, background: `${a.projects?.color || '#2563EB'}18`, color: a.projects?.color || '#2563EB', fontSize: 10 }}>
                                                            {a.projects?.name} ({a.allocation_pct}%)
                                                        </span>
                                                    ))}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                                            <div style={{ width: `${Math.min(100, r.totalAlloc)}%`, height: '100%', background: overload ? 'var(--danger)' : r.totalAlloc > 80 ? 'var(--warning)' : 'var(--success)', borderRadius: 4 }} />
                                                        </div>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: overload ? 'var(--danger)' : 'inherit', minWidth: 40 }}>{r.totalAlloc}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {overload ? (
                                                        <span className="badge" style={{ background: 'rgba(239,68,68,.1)', color: 'var(--danger)', fontWeight: 700 }}>⚠ OVERLOAD</span>
                                                    ) : r.totalAlloc > 80 ? (
                                                        <span className="badge" style={{ background: 'rgba(245,158,11,.1)', color: 'var(--warning)' }}>Tinggi</span>
                                                    ) : (
                                                        <span className="badge" style={{ background: 'rgba(16,185,129,.1)', color: 'var(--success)' }}>Normal</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ MODAL: Create/Edit Project ═══ */}
            {(modal === 'create' || modal === 'edit') && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h2>{modal === 'create' ? 'Proyek Baru' : 'Edit Proyek'}</h2>
                            <button onClick={() => setModal(null)} className="btn-icon"><FiX /></button>
                        </div>
                        <div style={{ display: 'grid', gap: 14, padding: '16px 0' }}>
                            <div className="form-group">
                                <label>Nama Proyek *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama proyek" />
                            </div>
                            <div className="form-group">
                                <label>Klien</label>
                                <input className="form-input" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} placeholder="Nama klien (opsional)" />
                            </div>
                            <div className="form-group">
                                <label>Deskripsi</label>
                                <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi proyek" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        <option value="active">Aktif</option>
                                        <option value="on_hold">Ditunda</option>
                                        <option value="completed">Selesai</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Prioritas</label>
                                    <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label>Tanggal Mulai *</label>
                                    <input type="date" className="form-input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Tanggal Selesai</label>
                                    <input type="date" className="form-input" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label>Tarif per Jam (Rp)</label>
                                    <input type="number" className="form-input" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label>Warna</label>
                                    <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
                            <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.startDate}>{saving ? 'Menyimpan...' : modal === 'create' ? 'Buat Proyek' : 'Simpan'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MODAL: Assign Employee ═══ */}
            {modal === 'assign' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h2>Assign ke: {selected?.name}</h2>
                            <button onClick={() => setModal(null)} className="btn-icon"><FiX /></button>
                        </div>
                        <div style={{ display: 'grid', gap: 14, padding: '16px 0' }}>
                            <div className="form-group">
                                <label>Karyawan</label>
                                <select className="form-input" value={assignForm.employeeId} onChange={e => setAssignForm({ ...assignForm, employeeId: e.target.value })}>
                                    <option value="">— Pilih Karyawan —</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.division})</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label>Role</label>
                                    <select className="form-input" value={assignForm.role} onChange={e => setAssignForm({ ...assignForm, role: e.target.value })}>
                                        <option value="member">Member</option>
                                        <option value="lead">Lead</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Alokasi (%)</label>
                                    <input type="number" className="form-input" min={10} max={100} step={10} value={assignForm.allocationPct} onChange={e => setAssignForm({ ...assignForm, allocationPct: parseInt(e.target.value) || 100 })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
                            <button className="btn-primary" onClick={handleAssign} disabled={saving || !assignForm.employeeId}>{saving ? 'Menyimpan...' : 'Assign'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
