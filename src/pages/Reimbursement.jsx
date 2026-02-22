import { useState, useEffect } from 'react';
import { FiPlus, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import * as reimbursementService from '../services/reimbursementService';
import * as employeeService from '../services/employeeService';
import { formatCurrency } from '../lib/utils';
import '../styles/shared.css';

export default function Reimbursement() {
    const { employee } = useAuth();
    const [records, setRecords] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState('');
    const [form, setForm] = useState({
        employeeId: '',
        category: 'transport',
        amount: '',
        date: '',
        notes: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: reimbData } = await reimbursementService.getAllReimbursements();
        const { data: empData } = await employeeService.getAllEmployees();
        setRecords(reimbData || []);
        setAllEmployees(empData || []);
        setLoading(false);
    };

    const filtered = records.filter((r) => !filter || r.status === filter);

    const handleApprove = async (id) => {
        const { error } = await reimbursementService.updateReimbursementStatus(id, 'approved');
        if (!error) fetchData();
    };

    const handleReject = async (id) => {
        const { error } = await reimbursementService.updateReimbursementStatus(id, 'rejected');
        if (!error) fetchData();
    };

    const handleSubmit = async () => {
        const { error } = await reimbursementService.createReimbursement({
            employee_id: form.employeeId || employee?.id,
            category: form.category,
            amount: Number(form.amount),
            date: form.date,
            notes: form.notes,
            status: 'pending'
        });

        if (!error) {
            setShowForm(false);
            fetchData();
            setForm({ employeeId: '', category: 'transport', amount: '', date: '', notes: '' });
        }
    };

    const summary = {
        total: records.reduce((s, r) => s + (Number(r.amount) || 0), 0),
        approved: records.filter((r) => r.status === 'approved').reduce((s, r) => s + (Number(r.amount) || 0), 0),
        pending: records.filter((r) => r.status === 'pending').length,
    };

    return (
        <div>
            <div className="page-header">
                <h1>Reimbursement</h1>
                <button className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> Ajukan Reimburse</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="info-card">
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Total Klaim</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrency(summary.total)}</div>
                </div>
                <div className="info-card">
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Disetujui</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(summary.approved)}</div>
                </div>
                <div className="info-card">
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Menunggu Approval</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>{summary.pending}</div>
                </div>
            </div>

            <div className="filters-bar">
                <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="paid">Paid</option>
                </select>
            </div>

            <div className="data-table-card">
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr><th>Karyawan</th><th>Jenis</th><th>Deskripsi</th><th>Jumlah</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr>
                        </thead>
                        <tbody>
                            {filtered.map((r) => {
                                const emp = allEmployees.find((e) => e.id === r.employee_id);
                                return (
                                    <tr key={r.id}>
                                        <td>
                                            <div className="employee-cell">
                                                <div className="employee-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                                                    {emp?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                                                </div>
                                                <div className="employee-name">{emp?.name || 'Unknown'}</div>
                                            </div>
                                        </td>
                                        <td><span className="chart-card-badge">{r.category || r.type}</span></td>
                                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || r.description}</td>
                                        <td style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</td>
                                        <td style={{ fontSize: 12 }}>{new Date(r.date).toLocaleDateString('id-ID')}</td>
                                        <td><span className={`status-badge ${r.status}`}>
                                            {r.status === 'pending' ? 'Pending' : r.status === 'approved' ? 'Approved' : r.status === 'paid' ? 'Paid' : 'Rejected'}
                                        </span></td>
                                        <td>
                                            {r.status === 'pending' ? (
                                                <div className="actions-cell">
                                                    <button className="action-btn" title="Approve" onClick={() => handleApprove(r.id)} style={{ color: 'var(--success)' }}><FiCheck /></button>
                                                    <button className="action-btn danger" title="Reject" onClick={() => handleReject(r.id)}><FiX /></button>
                                                </div>
                                            ) : <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Ajukan Reimbursement</h2>
                            <button className="modal-close" onClick={() => setShowForm(false)}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Karyawan</label>
                                    <select className="form-select" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                                        <option value="">Pilih Karyawan</option>
                                        {allEmployees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jenis</label>
                                    <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                        <option value="transport">Transport</option>
                                        <option value="medical">Medical</option>
                                        <option value="meals">Meals</option>
                                        <option value="training">Training</option>
                                        <option value="other">Lainnya</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jumlah (IDR)</label>
                                    <input className="form-input" type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal</label>
                                    <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Deskripsi</label>
                                    <textarea className="form-textarea" placeholder="Deskripsi klaim..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
                            <button className="btn-primary" onClick={handleSubmit}>Ajukan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
