import { useState, useEffect } from 'react';
import { FiPlus, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import * as leaveService from '../services/leaveService';
import * as employeeService from '../services/employeeService';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import BranchFilter from '../components/BranchFilter';
import { useBranch } from '../context/BranchContext';
import '../styles/shared.css';

export default function LeaveManagement() {
    const { employee } = useAuth();
    const [leaves, setLeaves] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);

    const [newLeave, setNewLeave] = useState({
        type: 'cuti',
        startDate: '',
        endDate: '',
        reason: '',
        employeeId: ''
    });

    const { selectedBranchId } = useBranch();

    useEffect(() => {
        fetchData();
    }, [selectedBranchId]);

    const fetchData = async () => {
        setLoading(true);
        const { data: leaveData } = await leaveService.getAllLeaves(selectedBranchId);
        const { data: empData } = await employeeService.getAllEmployees(selectedBranchId);
        setLeaves(leaveData || []);
        setAllEmployees(empData || []);
        setLoading(false);
    };

    const filtered = leaves.filter((l) => !filter || l.status === filter);

    const handleApprove = async (id) => {
        const { error } = await leaveService.updateLeave(id, { status: 'approved', approved_by: employee?.id });
        if (!error) fetchData();
    };

    const handleReject = async (id) => {
        const { error } = await leaveService.updateLeave(id, { status: 'rejected', approved_by: employee?.id });
        if (!error) fetchData();
    };

    const handleSubmit = async () => {
        const days = Math.ceil((new Date(newLeave.endDate) - new Date(newLeave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        const empId = newLeave.employeeId || employee?.id;
        const { error } = await leaveService.submitLeave(empId, {
            type: newLeave.type,
            startDate: newLeave.startDate,
            endDate: newLeave.endDate,
            days: days,
            reason: newLeave.reason
        });

        if (!error) {
            setShowForm(false);
            fetchData();
            setNewLeave({ type: 'cuti', startDate: '', endDate: '', reason: '', employeeId: '' });
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Manajemen Cuti & Izin</h1>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <BranchFilter />
                    <button className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> Ajukan Cuti</button>
                </div>
            </div>

            {/* Leave Quota Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {allEmployees.slice(0, 4).map((emp) => {
                    const quota = emp.leave_quota || emp.leaveQuota || 12;
                    const used = emp.leave_used || emp.leaveUsed || 0;
                    return (
                        <div className="info-card" key={emp.id}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{emp.name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                                <span>Sisa Cuti</span>
                                <span style={{ fontWeight: 700, color: 'var(--text)' }}>{quota - used} / {quota}</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{
                                    width: `${((quota - used) / quota) * 100}%`,
                                    background: (quota - used) <= 3 ? 'var(--danger)' : 'var(--primary)',
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            {/* Leave Requests Table */}
            {loading ? (
                <TableSkeleton rows={5} cols={5} />
            ) : filtered.length === 0 ? (
                <div className="data-table-card">
                    <EmptyState
                        icon="leave"
                        title="Belum ada pengajuan cuti"
                        description="Semua terkendali! Belum ada karyawan yang mengajukan cuti saat ini."
                    />
                </div>
            ) : (
                <div className="data-table-card">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Karyawan</th>
                                    <th>Jenis</th>
                                    <th>Tanggal</th>
                                    <th>Durasi</th>
                                    <th>Alasan</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((leave) => {
                                    const emp = allEmployees.find((e) => e.id === leave.employee_id);
                                    return (
                                        <tr key={leave.id}>
                                            <td>
                                                <div className="employee-cell">
                                                    <div className="employee-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                                                        {emp?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                                                    </div>
                                                    <div className="employee-name">{emp?.name || 'Unknown'}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${leave.type === 'cuti' ? 'approved' : leave.type === 'sakit' ? 'pending' : 'leave'}`}>
                                                    {leave.type === 'cuti' ? 'Cuti' : leave.type === 'sakit' ? 'Sakit' : 'Izin'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12 }}>
                                                {new Date(leave.start_date || leave.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                {(leave.start_date || leave.startDate) !== (leave.end_date || leave.endDate) && ` – ${new Date(leave.end_date || leave.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{leave.days} hari</td>
                                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leave.reason}</td>
                                            <td><span className={`status-badge ${leave.status}`}>
                                                {leave.status === 'pending' ? 'Pending' : leave.status === 'approved' ? 'Approved' : 'Rejected'}
                                            </span></td>
                                            <td>
                                                {leave.status === 'pending' ? (
                                                    <div className="actions-cell">
                                                        <button className="action-btn" title="Approve" onClick={() => handleApprove(leave.id)} style={{ color: 'var(--success)' }}><FiCheck /></button>
                                                        <button className="action-btn danger" title="Reject" onClick={() => handleReject(leave.id)}><FiX /></button>
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
            )}

            {/* Leave Request Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Ajukan Cuti / Izin</h2>
                            <button className="modal-close" onClick={() => setShowForm(false)}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Karyawan</label>
                                    <select className="form-select" value={newLeave.employeeId} onChange={(e) => setNewLeave({ ...newLeave, employeeId: e.target.value })}>
                                        <option value="">Pilih Karyawan</option>
                                        {allEmployees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jenis</label>
                                    <select className="form-select" value={newLeave.type} onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}>
                                        <option value="cuti">Cuti Tahunan</option>
                                        <option value="sakit">Sakit</option>
                                        <option value="izin">Izin</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal Mulai</label>
                                    <input className="form-input" type="date" value={newLeave.startDate} onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal Selesai</label>
                                    <input className="form-input" type="date" value={newLeave.endDate} onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })} />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Alasan</label>
                                    <textarea className="form-textarea" placeholder="Tuliskan alasan cuti/izin..." value={newLeave.reason} onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })} />
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
