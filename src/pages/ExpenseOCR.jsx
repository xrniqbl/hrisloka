import { useState, useEffect } from 'react';
import { FiPlus, FiEye, FiCheck, FiX, FiUpload, FiAlertTriangle, FiDollarSign, FiCamera } from 'react-icons/fi';
import * as reimbursementService from '../services/reimbursementService';
import * as employeeService from '../services/employeeService';
import '../styles/shared.css';

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;
const statusColors = { pending: '#F59E0B', approved: '#0047AB', paid: '#16A34A', rejected: '#DC2626' };
const statusLabels = { pending: 'Pending', approved: 'Approved', paid: 'Paid', rejected: 'Rejected' };

export default function ExpenseOCR() {
    const [expenses, setExpenses] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ employeeId: '', category: 'Transport', manualAmount: '', notes: '' });
    const [ocrSimulated, setOcrSimulated] = useState(false);
    const [ocrResult, setOcrResult] = useState({ amount: 0, text: '' });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: reimbData } = await reimbursementService.getAllReimbursements();
        const { data: empData } = await employeeService.getAllEmployees();
        setExpenses(reimbData || []);
        setEmployees(empData || []);
        setLoading(false);
    };

    const getEmpName = (id) => employees.find(e => e.id === id)?.name || '—';

    const totalPending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalApproved = expenses.filter(e => e.status === 'approved' || e.status === 'paid').reduce((s, e) => s + Number(e.amount || 0), 0);

    const stats = [
        { label: 'Total Expense', value: expenses.length, color: '#0047AB', icon: <FiDollarSign /> },
        { label: 'Pending Review', value: formatCurrency(totalPending), color: '#F59E0B', icon: <FiAlertTriangle />, isText: true },
        { label: 'Approved/Paid', value: formatCurrency(totalApproved), color: '#16A34A', icon: <FiCheck />, isText: true },
        { label: 'Total Records', value: expenses.length, color: '#DC2626', icon: <FiCamera /> },
    ];

    const openSubmit = () => { setForm({ employeeId: '', category: 'Transport', manualAmount: '', notes: '' }); setOcrSimulated(false); setOcrResult({ amount: 0, text: '' }); setModal('submit'); };
    const openView = (e) => { setSelected(e); setModal('view'); };
    const closeModal = () => { setModal(null); setSelected(null); setOcrSimulated(false); };

    const simulateOCR = () => {
        const manual = Number(form.manualAmount) || 0;
        const variation = Math.random() > 0.7 ? Math.floor(Math.random() * 10000) - 5000 : 0;
        const ocrAmount = Math.max(0, manual + variation);
        const text = `Total: Rp ${ocrAmount.toLocaleString('id-ID')}`;
        setOcrResult({ amount: ocrAmount, text });
        setOcrSimulated(true);
    };

    const handleSubmit = async () => {
        const empId = Number(form.employeeId);
        if (!empId) return;

        await reimbursementService.submitReimbursement(empId, {
            type: form.category,
            amount: Number(form.manualAmount),
            description: form.notes,
        });
        closeModal();
        fetchData();
    };

    const handleApprove = async (id) => {
        await reimbursementService.updateReimbursement(id, { status: 'approved' });
        fetchData();
    };
    const handleReject = async (id) => {
        await reimbursementService.updateReimbursement(id, { status: 'rejected' });
        fetchData();
    };

    return (
        <div>
            <div className="page-header">
                <h1>Expense & Reimbursement (OCR)</h1>
                <div className="page-header-actions">
                    <button className="btn-primary" onClick={openSubmit}><FiPlus /> Submit Expense</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ color: s.color, fontSize: 20 }}>{s.icon}</span>
                            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: s.isText ? 18 : 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div className="data-table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Karyawan</th>
                            <th>Kategori</th>
                            <th>Tanggal</th>
                            <th>Jumlah</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map(e => {
                            const empName = e.employees?.name || getEmpName(e.employee_id);
                            return (
                                <tr key={e.id}>
                                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>EXP-{String(e.id).padStart(3, '0')}</td>
                                    <td style={{ fontWeight: 600 }}>{empName}</td>
                                    <td>{e.type || e.category || '—'}</td>
                                    <td style={{ fontSize: 13 }}>{new Date(e.created_at).toLocaleDateString('id-ID')}</td>
                                    <td style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}</td>
                                    <td>
                                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: statusColors[e.status] }}>
                                            {statusLabels[e.status]}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="action-btn" onClick={() => openView(e)}><FiEye /></button>
                                            {e.status === 'pending' && (
                                                <>
                                                    <button className="action-btn" style={{ color: '#16A34A', borderColor: '#16A34A' }} onClick={() => handleApprove(e.id)}><FiCheck /></button>
                                                    <button className="action-btn danger" onClick={() => handleReject(e.id)}><FiX /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {expenses.length === 0 && (
                            <tr><td colSpan={7} className="empty-state">Belum ada data expense.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* View Receipt Modal */}
            {modal === 'view' && selected && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detail Expense — EXP-{String(selected.id).padStart(3, '0')}</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Karyawan</label>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.employees?.name || getEmpName(selected.employee_id)}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Kategori</label>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.type || selected.category}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Jumlah</label>
                                    <div style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(selected.amount)}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Status</label>
                                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff', background: statusColors[selected.status], display: 'inline-block' }}>
                                        {statusLabels[selected.status]}
                                    </span>
                                </div>
                            </div>

                            {selected.description && (
                                <div style={{ marginTop: 16, padding: 14, background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    <strong>Deskripsi:</strong> {selected.description}
                                </div>
                            )}

                            {selected.receipt_url && (
                                <div style={{ marginTop: 16, padding: 16, background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>📸 Receipt</div>
                                    <a href={selected.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: 13 }}>View Receipt →</a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Expense Modal */}
            {modal === 'submit' && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Submit Expense Baru</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Karyawan</label>
                                    <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                                        <option value="">— Pilih —</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kategori</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        <option value="Transport">Transport</option>
                                        <option value="Medical">Medical</option>
                                        <option value="Meeting">Meeting</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jumlah (Manual)</label>
                                    <input type="number" className="form-input" value={form.manualAmount} onChange={e => setForm({ ...form, manualAmount: e.target.value })} placeholder="350000" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Upload Struk</label>
                                    <button className="btn-secondary btn-sm" style={{ marginTop: 2 }} onClick={simulateOCR}>
                                        <FiUpload /> {ocrSimulated ? 'Re-Scan OCR' : 'Upload & Scan OCR'}
                                    </button>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Deskripsi pengeluaran..." />
                                </div>
                            </div>

                            {ocrSimulated && (
                                <div style={{ marginTop: 16, padding: 16, background: '#EFF6FF', borderRadius: 'var(--radius-md)', border: '1px solid #BFDBFE' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0047AB', marginBottom: 8 }}>🔍 Hasil OCR Scanning</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: 14, marginBottom: 8 }}>{ocrResult.text}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 13 }}>OCR Amount: <strong>{formatCurrency(ocrResult.amount)}</strong></span>
                                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: Number(form.manualAmount) === ocrResult.amount ? '#16A34A' : '#DC2626', background: Number(form.manualAmount) === ocrResult.amount ? '#F0FDF4' : '#FEF2F2' }}>
                                            {Number(form.manualAmount) === ocrResult.amount ? '✓ Match' : '⚠ Mismatch'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModal}>Batal</button>
                            <button className="btn-primary" onClick={handleSubmit} disabled={!form.employeeId || !form.manualAmount}>Submit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
