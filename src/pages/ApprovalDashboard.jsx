import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiFileText, FiCalendar, FiDollarSign, FiClock, FiLoader } from 'react-icons/fi';
import * as leaveService from '../services/leaveService';
import * as reimbursementService from '../services/reimbursementService';
import * as documentService from '../services/documentService';
import { logAction } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import '../styles/shared.css';

export default function ApprovalDashboard() {
    const { employee } = useAuth();
    const [leaves, setLeaves] = useState([]);
    const [reimbursements, setReimbursements] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('leave');

    useEffect(() => {
        fetchData();

        // Subscription for real-time (simplified demo)
        const docSub = documentService.subscribeToDocuments(() => {
            fetchData();
        });

        return () => {
            if (docSub) docSub.unsubscribe();
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [lv, rb, dc] = await Promise.all([
            leaveService.getAllLeaveRequests(),
            reimbursementService.getAllReimbursements(),
            documentService.getAllDocuments()
        ]);
        setLeaves(lv.data || []);
        setReimbursements(rb.data || []);
        setDocuments(dc.data || []);
        setLoading(false);
    };

    const handleAction = async (service, id, status) => {
        let error;
        if (service === 'leave') {
            ({ error } = await leaveService.updateLeaveStatus(id, status, employee?.id));
            if (!error) await logAction({ action: `APPROVE_LEAVE_${status.toUpperCase()}`, targetTable: 'leave_requests', targetId: id, newValue: { status } });
        } else if (service === 'reimburse') {
            ({ error } = await reimbursementService.updateReimbursementStatus(id, status));
            if (!error) await logAction({ action: `APPROVE_REIMBURSE_${status.toUpperCase()}`, targetTable: 'reimbursements', targetId: id, newValue: { status } });
        } else if (service === 'document') {
            ({ error } = await documentService.updateDocumentStatus(id, status));
            if (!error) await logAction({ action: `APPROVE_DOC_${status.toUpperCase()}`, targetTable: 'documents', targetId: id, newValue: { status } });
        }

        if (!error) fetchData();
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><FiLoader className="spin" /> Loading...</div>;

    const pendingLeaves = leaves.filter(l => l.status === 'pending');
    const pendingReimbursements = reimbursements.filter(r => r.status === 'pending');
    const pendingDocuments = documents.filter(d => d.status === 'pending');

    return (
        <div style={{ padding: '24px' }}>
            <div className="page-header" style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800 }}>Pusat Persetujuan</h1>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Kelola semua pengajuan karyawan dalam satu tempat.</p>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="info-card" onClick={() => setActiveTab('leave')} style={{ cursor: 'pointer', border: activeTab === 'leave' ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)', marginBottom: 8 }}>
                        <FiCalendar /> <span style={{ fontSize: 12, fontWeight: 700 }}>CUTI</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{pendingLeaves.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Menunggu Persetujuan</div>
                </div>
                <div className="info-card" onClick={() => setActiveTab('reimburse')} style={{ cursor: 'pointer', border: activeTab === 'reimburse' ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--warning)', marginBottom: 8 }}>
                        <FiDollarSign /> <span style={{ fontSize: 12, fontWeight: 700 }}>REIMBURSE</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{pendingReimbursements.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Menunggu Klaim</div>
                </div>
                <div className="info-card" onClick={() => setActiveTab('document')} style={{ cursor: 'pointer', border: activeTab === 'document' ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--info)', marginBottom: 8 }}>
                        <FiFileText /> <span style={{ fontSize: 12, fontWeight: 700 }}>DOKUMEN</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{pendingDocuments.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Verifikasi Data</div>
                </div>
            </div>

            {/* List */}
            <div className="data-table-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
                    {activeTab === 'leave' ? 'Pengajuan Cuti' : activeTab === 'reimburse' ? 'Klaim Reimburse' : 'Dokumen Karyawan'}
                </div>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Karyawan</th>
                                <th>Detail</th>
                                <th>Tanggal</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(activeTab === 'leave' ? pendingLeaves : activeTab === 'reimburse' ? pendingReimbursements : pendingDocuments).map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{item.employees?.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.employees?.division}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 13 }}>{item.type || item.category}</div>
                                        <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.reason || item.notes || item.name}</div>
                                    </td>
                                    <td style={{ fontSize: 12 }}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <span className="status-badge pending">Pending</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="action-btn" title="Approve" onClick={() => handleAction(activeTab, item.id, 'approved')} style={{ color: 'var(--success)' }}><FiCheck /></button>
                                            <button className="action-btn danger" title="Reject" onClick={() => handleAction(activeTab, item.id, 'rejected')}><FiX /></button>
                                            {(item.url || item.receipt_url) && (
                                                <a href={item.url || item.receipt_url} target="_blank" rel="noreferrer" className="action-btn" title="View"><FiFileText /></a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {(activeTab === 'leave' ? pendingLeaves : activeTab === 'reimburse' ? pendingReimbursements : pendingDocuments).length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Semua pengajuan telah diproses.</div>
                )}
            </div>
        </div>
    );
}
