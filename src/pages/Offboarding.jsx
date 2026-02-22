import { useState, useEffect } from 'react';
import { FiPlus, FiX, FiUserMinus, FiCheckSquare, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import * as offboardingService from '../services/offboardingService';
import * as employeeService from '../services/employeeService';
import '../styles/shared.css';

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;
const statusColors = { initiated: '#F59E0B', 'in-progress': '#0047AB', completed: '#16A34A' };
const statusLabels = { initiated: 'Initiated', 'in-progress': 'In Progress', completed: 'Completed' };
const typeLabels = { resign: 'Resign', 'contract-end': 'Habis Kontrak', terminated: 'Terminated' };

export default function Offboarding() {
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ employeeId: '', type: 'resign', reason: '', lastWorkingDay: '' });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: offData } = await offboardingService.getAllOffboarding();
        const { data: empData } = await employeeService.getAllEmployees();
        setRecords(offData || []);
        setEmployees(empData || []);
        setLoading(false);
    };

    const stats = [
        { label: 'Total Offboarding', value: records.length, color: '#0047AB' },
        { label: 'Initiated', value: records.filter(r => r.status === 'initiated').length, color: '#F59E0B' },
        { label: 'In Progress', value: records.filter(r => r.status === 'in-progress').length, color: '#0047AB' },
        { label: 'Completed', value: records.filter(r => r.status === 'completed').length, color: '#16A34A' },
    ];

    const openInitiate = () => { setForm({ employeeId: '', type: 'resign', reason: '', lastWorkingDay: '' }); setModal('initiate'); };
    const openClearance = (r) => { setSelected({ ...r }); setModal('clearance'); };
    const closeModal = () => { setModal(null); setSelected(null); };

    const handleInitiate = async () => {
        const { error } = await offboardingService.createOffboarding({
            employee_id: Number(form.employeeId),
            type: form.type,
            reason: form.reason,
            last_working_day: form.lastWorkingDay,
        });
        if (!error) {
            closeModal();
            fetchData();
        }
    };

    const toggleChecklist = async (idx) => {
        if (!selected) return;
        const checklist = selected.offboarding_checklist || [];
        const item = checklist[idx];
        if (!item) return;

        await offboardingService.toggleChecklistItem(item.id, !item.completed);

        // Refetch
        const { data } = await offboardingService.getOffboardingById(selected.id);
        if (data) {
            setSelected(data);
            fetchData();
        }
    };

    const getEmpName = (id) => employees.find(e => e.id === id)?.name || '—';
    const getEmpDiv = (id) => employees.find(e => e.id === id)?.division || '';

    const checklist = selected?.offboarding_checklist || [];
    const completedCount = checklist.filter(c => c.completed).length;
    const totalCount = checklist.length;

    return (
        <div>
            <div className="page-header">
                <h1>Offboarding & Exit Clearance</h1>
                <div className="page-header-actions">
                    <button className="btn-primary" onClick={openInitiate}><FiPlus /> Initiate Offboarding</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{s.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div className="data-table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Karyawan</th>
                            <th>Divisi</th>
                            <th>Tipe</th>
                            <th>Status</th>
                            <th>Tanggal Inisiasi</th>
                            <th>Hari Terakhir</th>
                            <th>Clearance</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map(r => {
                            const cl = r.offboarding_checklist || [];
                            const done = cl.filter(c => c.completed).length;
                            const total = cl.length;
                            return (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 600 }}>{r.employees?.name || getEmpName(r.employee_id)}</td>
                                    <td>{r.employees?.division || getEmpDiv(r.employee_id)}</td>
                                    <td>
                                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.type === 'resign' ? '#FFF7ED' : '#EFF6FF', color: r.type === 'resign' ? '#EA580C' : '#0047AB' }}>
                                            {typeLabels[r.type] || r.type}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: statusColors[r.status] || '#999' }}>
                                            {statusLabels[r.status] || r.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 13 }}>{r.initiated_date || new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                                    <td style={{ fontSize: 13 }}>{r.last_working_day || '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div className="progress-bar" style={{ width: 80 }}>
                                                <div className="progress-fill" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, background: done === total && total > 0 ? '#16A34A' : '#0047AB' }} />
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 600 }}>{done}/{total}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button className="action-btn" title="Clearance" onClick={() => openClearance(r)}><FiCheckSquare /></button>
                                    </td>
                                </tr>
                            );
                        })}
                        {records.length === 0 && (
                            <tr><td colSpan={8} className="empty-state">Belum ada data offboarding.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Initiate Offboarding Modal */}
            {modal === 'initiate' && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><FiUserMinus style={{ marginRight: 8 }} /> Initiate Offboarding</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Karyawan</label>
                                    <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                                        <option value="">— Pilih Karyawan —</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.division}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tipe</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="resign">Resign</option>
                                        <option value="contract-end">Habis Kontrak</option>
                                        <option value="terminated">Terminated</option>
                                    </select>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Alasan</label>
                                    <textarea className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Alasan resign / pemutusan kontrak" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hari Kerja Terakhir</label>
                                    <input type="date" className="form-input" value={form.lastWorkingDay} onChange={e => setForm({ ...form, lastWorkingDay: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModal}>Batal</button>
                            <button className="btn-danger" onClick={handleInitiate} disabled={!form.employeeId || !form.lastWorkingDay}>
                                <FiAlertTriangle /> Initiate Offboarding
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clearance Checklist Modal */}
            {modal === 'clearance' && selected && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><FiCheckSquare style={{ marginRight: 8 }} /> Exit Clearance — {selected.employees?.name || getEmpName(selected.employee_id)}</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            {/* Info */}
                            <div className="form-grid" style={{ marginBottom: 20 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Tipe</label>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{typeLabels[selected.type] || selected.type}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Status</label>
                                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff', background: statusColors[selected.status], display: 'inline-block' }}>{statusLabels[selected.status]}</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Hari Terakhir</label>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.last_working_day || '—'}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Alasan</label>
                                    <div style={{ fontSize: 14 }}>{selected.reason || '—'}</div>
                                </div>
                            </div>

                            {/* Progress */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                                    <span>Clearance Progress</span>
                                    <span>{completedCount}/{totalCount}</span>
                                </div>
                                <div className="progress-bar" style={{ height: 10 }}>
                                    <div className="progress-fill" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`, background: completedCount === totalCount && totalCount > 0 ? '#16A34A' : '#0047AB' }} />
                                </div>
                            </div>

                            {/* Checklist */}
                            <div style={{ display: 'grid', gap: 8 }}>
                                {checklist.map((c, idx) => (
                                    <div key={c.id || idx}
                                        onClick={() => toggleChecklist(idx)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                                            background: c.completed ? '#F0FDF4' : 'var(--bg)', borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer', border: `1px solid ${c.completed ? '#BBF7D0' : 'var(--border)'}`,
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{
                                            width: 22, height: 22, borderRadius: 6,
                                            border: `2px solid ${c.completed ? '#16A34A' : 'var(--border)'}`,
                                            background: c.completed ? '#16A34A' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s ease', flexShrink: 0
                                        }}>
                                            {c.completed && <FiCheck color="#fff" size={14} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, textDecoration: c.completed ? 'line-through' : 'none', color: c.completed ? 'var(--muted)' : 'var(--text)' }}>
                                                {c.item}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
