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
import DocLink from '../components/DocLink';

export default function ApprovalDashboard() {
 const { employee } = useAuth();
 const [leaves, setLeaves] = useState([]);
 const [reimbursements, setReimbursements] = useState([]);
 const [documents, setDocuments] = useState([]);
 const [overtimeReqs, setOvertimeReqs] = useState([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState('leave');

 const companyId = employee?.company_id;

 useEffect(() => {
 if (!companyId) return;
 fetchData();
 const docSub = documentService.subscribeToDocuments(() => {
 fetchData();
 });
 return () => { if (docSub) docSub.unsubscribe(); };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [companyId]);

 const fetchData = async () => {
 if (!companyId) {
 setLeaves([]); setReimbursements([]); setDocuments([]); setOvertimeReqs([]);
 setLoading(false);
 return;
 }
 setLoading(true);
 const [lv, rb, dc, ot] = await Promise.all([
 leaveService.getAllLeaveRequests(undefined, companyId),
 reimbursementService.getAllReimbursements(companyId),
 documentService.getAllDocuments(companyId),
 overtimeService.getAllOvertime(undefined, companyId),
 ]);
 setLeaves(lv.data || []);
 setReimbursements(rb.data || []);
 setDocuments(dc.data || []);
 setOvertimeReqs(ot.data || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('leave_requests', fetchData, { companyId, enabled: !!companyId });

 const handleAction = async (service, id, status) => {
 if (!companyId) return;
 let error;
 if (service === 'leave') {
 ({ error } = await leaveService.updateLeaveStatus(id, status, employee?.id, companyId));
 if (!error) await logAction({ action: `APPROVE_LEAVE_${status.toUpperCase()}`, targetTable: 'leave_requests', targetId: id, newValue: { status } });
 } else if (service === 'reimburse') {
 ({ error } = await reimbursementService.updateReimbursementStatus(id, status, companyId));
 if (!error) await logAction({ action: `APPROVE_REIMBURSE_${status.toUpperCase()}`, targetTable: 'reimbursements', targetId: id, newValue: { status } });
 } else if (service === 'document') {
 ({ error } = await documentService.updateDocumentStatus(id, status, companyId));
 if (!error) await logAction({ action: `APPROVE_DOC_${status.toUpperCase()}`, targetTable: 'documents', targetId: id, newValue: { status } });
 } else if (service === 'overtime') {
 if (status === 'approved') {
 ({ error } = await overtimeService.approveOvertime(id, employee?.id, companyId));
 } else {
 ({ error } = await overtimeService.rejectOvertime(id, companyId));
 }
 if (!error) await logAction({ action: `APPROVE_OT_${status.toUpperCase()}`, targetTable: 'overtime_requests', targetId: id, newValue: { status } });
 }

 if (!error) fetchData();
 else console.warn('[ApprovalDashboard] action failed:', error?.message);
 };

 if (loading) return <div className="ep-loading-wrap"><div className="ep-loading-inner"><div className="ep-spinner" /><div className="ep-loading-text">Loading...</div></div></div>;

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
 <div className="admin-page">
 <div className="page-header">
 <div>
 <h1>Pusat Persetujuan</h1>
 <p className="td-muted-sm">
 Kelola semua pengajuan karyawan dalam satu tempat.
 {totalPending > 0 && <span className="text-danger" style={{ fontWeight: 600 }}> - {totalPending} item menunggu</span>}
 </p>
 </div>
 </div>

 {/* Metrics */}
 <div className="stats-grid" style={{ marginBottom: 24 }}>
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
 <div className="btn-icon-row" style={{ color: tab.color, marginBottom: 8 }}>
 {tab.icon} <span className="td-semibold">{tab.label}</span>
 </div>
 <div className="info-card-value">{tab.count}</div>
 <div className="info-card-label">{tab.desc}</div>
 </div>
 ))}
 </div>

 {/* List */}
 <div className="data-table-card">
 <div className="data-table-header">
 <span>{getTabTitle()}</span>
 {getActiveItems().length > 0 && (
 <span className="status-badge active">
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
 <div className="td-semibold">{item.employees?.name || '-'}</div>
 <div className="td-muted-sm">{item.employees?.division || ''}</div>
 </td>
 <td>
 <div className="td-sm">{item.type || item.category || item.name || '-'}</div>
 <div className="td-truncate td-muted-sm">
 {item.reason || item.notes || item.description || ''}
 </div>
 </td>
 {activeTab === 'overtime' && (
 <td>
 <span className="td-semibold">{item.hours}h</span>
 <span className="td-muted-sm" style={{ marginLeft: 4 }}>x{item.rate}</span>
 </td>
 )}
 {activeTab === 'reimburse' && (
 <td className="td-semibold">{formatCurrency(item.amount)}</td>
 )}
 <td className="td-sm">
 {item.date || item.start_date || new Date(item.created_at).toLocaleDateString('id-ID')}
 </td>
 <td>
 <span className="status-badge pending">Pending</span>
 </td>
 <td>
 <div className="actions-cell">
 <button className="action-btn success" title="Approve" onClick={() => handleAction(activeTab, item.id, 'approved')} aria-label="Approve"><FiCheck /></button>
 <button className="action-btn danger" title="Reject" onClick={() => handleAction(activeTab, item.id, 'rejected')}><FiX /></button>
 {(item.url || item.receipt_url) && (
 <DocLink docRef={item.url || item.receipt_url} title="View"><FiFileText /></DocLink>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {getActiveItems().length === 0 && (
 <div className="empty-state">
 Semua pengajuan {getTabTitle().toLowerCase()} telah diproses.
 </div>
 )}
 </div>
 </div>
 );
}


