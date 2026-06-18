import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiFileText, FiCalendar, FiDollarSign, FiClock, FiLoader } from 'react-icons/fi';
import * as leaveService from '../services/leaveService';
import * as reimbursementService from '../services/reimbursementService';
import * as documentService from '../services/documentService';
import * as overtimeService from '../services/overtimeService';
import { logAction } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';

export default function ApprovalDashboard() {
 const { employee } = useAuth();
 const [leaves, setLeaves] = useState([]);
 const [reimbursements, setReimbursements] = useState([]);
 const [documents, setDocuments] = useState([]);
 const [overtimeReqs, setOvertimeReqs] = useState([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState('leave');

 useEffect(() => {
 fetchData();
 const docSub = documentService.subscribeToDocuments(() => {
 fetchData();
 });
 return () => { if (docSub) docSub.unsubscribe(); };
 }, []);

 const fetchData = async () => {
 setLoading(true);
 const [lv, rb, dc, ot] = await Promise.all([
 leaveService.getAllLeaveRequests(),
 reimbursementService.getAllReimbursements(employee?.company_id),
 documentService.getAllDocuments(),
 overtimeService.getAllOvertime(),
 ]);
 setLeaves(lv.data || []);
 setReimbursements(rb.data || []);
 setDocuments(dc.data || []);
 setOvertimeReqs(ot.data || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('leave_requests', fetchData);

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
 } else if (service === 'overtime') {
 if (status === 'approved') {
 ({ error } = await overtimeService.approveOvertime(id, employee?.id));
 } else {
 ({ error } = await overtimeService.rejectOvertime(id));
 }
 if (!error) await logAction({ action: `APPROVE_OT_${status.toUpperCase()}`, targetTable: 'overtime_requests', targetId: id, newValue: { status } });
 }

 if (!error) fetchData();
 };

 if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><FiLoader className="spin" /> Loading...</div>;

 const pendingLeaves = leaves.filter(l => l.status === 'pending');
 const pendingReimbursements = reimbursements.filter(r => r.status === 'pending');
 const pendingDocuments = documents.filter(d => d.status === 'pending');
 const pendingOvertime = overtimeReqs.filter(o => o.status === 'pending');
 const totalPending = pendingLeaves.length + pendingReimbursements.length + pendingDocuments.length + pendingOvertime.length;

 const tabs = [
 { key: 'leave', label: 'CUTI', icon: <FiCalendar />, color: 'var(--primary)', count: pendingLeaves.length, desc: 'Menunggu Persetujuan' },
 { key: 'overtime', label: 'LEMBUR', icon: <FiClock />, color: '#8B5CF6', count: pendingOvertime.length, desc: 'Menunggu Approval' },
 { key: 'reimburse', label: 'REIMBURSE', icon: <FiDollarSign />, color: 'var(--warning)', count: pendingReimbursements.length, desc: 'Menunggu Klaim' },
 { key: 'document', label: 'DOKUMEN', icon: <FiFileText />, color: '#10B981', count: pendingDocuments.length, desc: 'Verifikasi Data' },
 ];

 const getActiveItems = () => {
 switch (activeTab) {
 case 'leave': return pendingLeaves;
 case 'overtime': return pendingOvertime;
 case 'reimburse': return pendingReimbursements;
 case 'document': return pendingDocuments;
 default: return [];
 }
 };

 const getTabTitle = () => {
 switch (activeTab) {
 case 'leave': return 'Pengajuan Cuti';
 case 'overtime': return 'Pengajuan Lembur';
 case 'reimburse': return 'Klaim Reimburse';
 case 'document': return 'Dokumen Karyawan';
 default: return '';
 }
 };

 const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

 return (
 <div>
 <div className="page-header" style={{ marginBottom: 24 }}>
 <div>
 <h1 style={{ fontSize: 24, fontWeight: 800 }}>Pusat Persetujuan</h1>
 <p style={{ color: 'var(--muted)', fontSize: 14 }}>
 Kelola semua pengajuan karyawan dalam satu tempat.
 {totalPending > 0 && <span style={{ color: 'var(--warning)', fontWeight: 600 }}> - {totalPending} item menunggu</span>}
 </p>
 </div>
 </div>

 {/* Metrics */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
 {tabs.map(tab => (
 <div
 key={tab.key}
 className="info-card"
 onClick={() => setActiveTab(tab.key)}
 style={{
 cursor: 'pointer',
 border: activeTab === tab.key ? `2px solid ${tab.color}` : '1px solid var(--border)',
 transition: 'all 0.2s ease',
 }}
 >
 <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: tab.color, marginBottom: 8 }}>
 {tab.icon} <span style={{ fontSize: 12, fontWeight: 700 }}>{tab.label}</span>
 </div>
 <div style={{ fontSize: 28, fontWeight: 800 }}>{tab.count}</div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>{tab.desc}</div>
 </div>
 ))}
 </div>

 {/* List */}
 <div className="data-table-card">
 <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <span>{getTabTitle()}</span>
 {getActiveItems().length > 0 && (
 <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'var(--primary)', color: '#fff', fontWeight: 700 }}>
 {getActiveItems().length} pending
 </span>
 )}
 </div>
 <div className="table-responsive">
 <table className="data-table">
 <thead>
 <tr>
 <th>Karyawan</th>
 <th>Detail</th>
 {activeTab === 'overtime' && <th>Jam</th>}
 {activeTab === 'reimburse' && <th>Jumlah</th>}
 <th>Tanggal</th>
 <th>Status</th>
 <th>Aksi</th>
 </tr>
 </thead>
 <tbody>
 {getActiveItems().map(item => (
 <tr key={item.id}>
 <td>
 <div style={{ fontWeight: 600 }}>{item.employees?.name || '-'}</div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.employees?.division || ''}</div>
 </td>
 <td>
 <div style={{ fontSize: 13 }}>{item.type || item.category || item.name || '-'}</div>
 <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
 {item.reason || item.notes || item.description || ''}
 </div>
 </td>
 {activeTab === 'overtime' && (
 <td>
 <span style={{ fontWeight: 600 }}>{item.hours}h</span>
 <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>x{item.rate}</span>
 </td>
 )}
 {activeTab === 'reimburse' && (
 <td style={{ fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
 )}
 <td style={{ fontSize: 12 }}>
 {item.date || item.start_date || new Date(item.created_at).toLocaleDateString('id-ID')}
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
 {getActiveItems().length === 0 && (
 <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
 Semua pengajuan {getTabTitle().toLowerCase()} telah diproses.
 </div>
 )}
 </div>
 </div>
 );
}
