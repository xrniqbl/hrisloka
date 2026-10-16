import { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiX, FiFileText, FiCalendar, FiDollarSign, FiClock, FiInbox, FiRefreshCw } from 'react-icons/fi';
import MetricStatCards from '../components/MetricStatCards';
import { Calendar, Clock, DollarSign, FileText } from 'lucide-react';
import * as leaveService from '../services/leaveService';
import * as reimbursementService from '../services/reimbursementService';
import * as documentService from '../services/documentService';
import * as overtimeService from '../services/overtimeService';
import { logAction } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import DocLink from '../components/DocLink';
import EmptyState from '../components/EmptyState';

export default function ApprovalDashboard() {
  const { employee, loading: authLoading } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [overtimeReqs, setOvertimeReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leave');
  const [fetchError, setFetchError] = useState(null);

  const companyId = employee?.company_id;

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setLeaves([]);
      setReimbursements([]);
      setDocuments([]);
      setOvertimeReqs([]);
      setFetchError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
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
      const firstErr = lv.error || rb.error || dc.error || ot.error;
      if (firstErr) setFetchError(firstErr.message || 'Gagal memuat data');
    } catch (err) {
      console.warn('[ApprovalDashboard] fetch failed:', err?.message);
      setFetchError(err?.message || 'Gagal memuat data');
      setLeaves([]);
      setReimbursements([]);
      setDocuments([]);
      setOvertimeReqs([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    // Wait for auth to resolve — avoid infinite spinner when companyId is still null
    if (authLoading) return;
    if (!companyId) {
      setLeaves([]);
      setReimbursements([]);
      setDocuments([]);
      setOvertimeReqs([]);
      setLoading(false);
      return;
    }
    fetchData();
    const docSub = documentService.subscribeToDocuments(() => {
      fetchData();
    });
    return () => {
      if (docSub) docSub.unsubscribe();
    };
  }, [companyId, authLoading, fetchData]);

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

  // Auth still resolving — short skeleton, not infinite spinner
  if (authLoading || loading) {
    return (
      <div className="admin-page">
        <div className="page-header">
          <div>
            <h1>Pusat Persetujuan</h1>
            <p className="td-muted-sm">Memuat data pengajuan…</p>
          </div>
        </div>
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="info-card skeleton" style={{ height: 44, borderRadius: 12 }} />
          ))}
        </div>
        <div className="data-table-card">
          <div className="empty-state" style={{ padding: '48px 24px' }}>
            <div className="ep-spinner" style={{ margin: '0 auto 12px' }} />
            <div className="empty-state-desc">Memuat antrian persetujuan…</div>
          </div>
        </div>
      </div>
    );
  }

  // No company context — empty CTA, never spin forever
  if (!companyId) {
    return (
      <div className="admin-page">
        <div className="page-header">
          <div>
            <h1>Pusat Persetujuan</h1>
            <p className="td-muted-sm">Kelola semua pengajuan karyawan dalam satu tempat.</p>
          </div>
        </div>
        <div className="data-table-card">
          <EmptyState
            title="Perusahaan belum terhubung"
            description="Akun Anda belum terhubung ke company_id. Hubungkan profil karyawan ke perusahaan agar antrian persetujuan bisa dimuat."
            ctaLabel="Kembali ke Dashboard"
            onCta={() => { window.location.href = '/dashboard'; }}
          />
        </div>
      </div>
    );
  }

  const pendingLeaves = leaves.filter((l) => l.status === 'pending');
  const pendingReimbursements = reimbursements.filter((r) => r.status === 'pending');
  const pendingDocuments = documents.filter((d) => d.status === 'pending');
  const pendingOvertime = overtimeReqs.filter((o) => o.status === 'pending');
  const totalPending =
    pendingLeaves.length + pendingReimbursements.length + pendingDocuments.length + pendingOvertime.length;


  const getActiveItems = () => {
    switch (activeTab) {
      case 'leave':
        return pendingLeaves;
      case 'overtime':
        return pendingOvertime;
      case 'reimburse':
        return pendingReimbursements;
      case 'document':
        return pendingDocuments;
      default:
        return [];
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'leave':
        return 'Pengajuan Cuti';
      case 'overtime':
        return 'Pengajuan Lembur';
      case 'reimburse':
        return 'Klaim Reimburse';
      case 'document':
        return 'Dokumen Karyawan';
      default:
        return '';
    }
  };

  const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;
  const activeItems = getActiveItems();

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Pusat Persetujuan</h1>
          <p className="td-muted-sm">
            Kelola semua pengajuan karyawan dalam satu tempat.
            {totalPending > 0 && (
              <span className="text-danger" style={{ fontWeight: 600 }}>
                {' '}
                — {totalPending} item menunggu
              </span>
            )}
          </p>
        </div>
        <button type="button" className="btn-ghost" onClick={fetchData} title="Muat ulang">
          <FiRefreshCw /> Muat Ulang
        </button>
      </div>

      {fetchError && (
        <div
          className="info-card"
          style={{
            marginBottom: 16,
            border: '1px solid rgba(220,38,38,0.25)',
            background: 'rgba(220,38,38,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{fetchError}</span>
          <button type="button" className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={fetchData}>
            Coba Lagi
          </button>
        </div>
      )}

      {/* Metrics — clean monochrome strip */}
      <MetricStatCards
        activeKey={activeTab}
        onSelect={setActiveTab}
        items={[
          { key: 'leave', label: 'Cuti', value: pendingLeaves.length, icon: Calendar },
          { key: 'overtime', label: 'Lembur', value: pendingOvertime.length, icon: Clock },
          { key: 'reimburse', label: 'Reimburse', value: pendingReimbursements.length, icon: DollarSign },
          { key: 'document', label: 'Dokumen', value: pendingDocuments.length, icon: FileText },
        ]}
      />

      {/* List */}
      <div className="data-table-card">
        <div className="data-table-header">
          <span>{getTabTitle()}</span>
          {activeItems.length > 0 && (
            <span className="status-badge active">{activeItems.length} pending</span>
          )}
        </div>

        {activeItems.length === 0 ? (
          <EmptyState
            title="Tidak ada pengajuan menunggu"
            description={`Semua ${getTabTitle().toLowerCase()} sudah diproses. Pengajuan baru dari karyawan akan muncul di sini.`}
            ctaLabel="Muat Ulang"
            onCta={fetchData}
            secondaryLabel="Lihat Cuti"
            onSecondary={() => { window.location.href = '/leave'; }}
          />
        ) : (
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
                {activeItems.map((item) => (
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
                        <span className="td-muted-sm" style={{ marginLeft: 4 }}>
                          x{item.rate}
                        </span>
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
                        <button
                          className="action-btn success"
                          title="Approve"
                          onClick={() => handleAction(activeTab, item.id, 'approved')}
                          aria-label="Approve"
                        >
                          <FiCheck />
                        </button>
                        <button
                          className="action-btn danger"
                          title="Reject"
                          onClick={() => handleAction(activeTab, item.id, 'rejected')}
                        >
                          <FiX />
                        </button>
                        {(item.url || item.receipt_url) && (
                          <DocLink docRef={item.url || item.receipt_url} title="View">
                            <FiFileText />
                          </DocLink>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
