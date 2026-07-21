import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../lib/i18n';
import { FiPlus, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import * as leaveService from '../services/leaveService';
import * as employeeService from '../services/employeeService';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import BranchFilter from '../components/BranchFilter';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPanel, DialogFooter } from '@/components/ui/dialog';
import { useBranch } from '../context/BranchContext';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';

export default function LeaveManagement() {
  const { t } = useTranslation();
  const { employee } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [newLeave, setNewLeave] = useState({ type: 'cuti', startDate: '', endDate: '', reason: '', employeeId: '' });
  const { selectedBranchId } = useBranch();

  const companyId = employee?.company_id;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [leaveRes, empRes] = await Promise.all([
      leaveService.getAllLeaves(selectedBranchId, companyId),
      employeeService.getAllEmployees(selectedBranchId, companyId),
    ]);
    setLeaves(leaveRes.data || []);
    setAllEmployees(empRes.data || []);
    setLoading(false);
  }, [employee?.company_id, selectedBranchId, companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeTable('leave_requests', fetchData, { companyId, enabled: !!companyId });

  const filtered = leaves.filter((l) => !filter || l.status === filter);

  // Service layer already sends email/WA/push/in-app; keep lightweight local refresh only
  const handleApprove = async (id) => {
    const { error } = await leaveService.updateLeave(
      id,
      { status: 'approved', approved_by: employee?.id },
      companyId,
    );
    if (!error) fetchData();
    else console.warn('[LeaveManagement] approve failed:', error.message);
  };

  const handleReject = async (id) => {
    const { error } = await leaveService.updateLeave(
      id,
      { status: 'rejected', approved_by: employee?.id },
      companyId,
    );
    if (!error) fetchData();
    else console.warn('[LeaveManagement] reject failed:', error.message);
  };

  const handleSubmit = async () => {
    const days = Math.ceil((new Date(newLeave.endDate) - new Date(newLeave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    const { error } = await leaveService.submitLeave(newLeave.employeeId || employee?.id, {
      type: newLeave.type, startDate: newLeave.startDate, endDate: newLeave.endDate, days, reason: newLeave.reason,
    });
    if (!error) {
      setShowForm(false);
      fetchData();
      setNewLeave({ type: 'cuti', startDate: '', endDate: '', reason: '', employeeId: '' });
    }
  };

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={5} />;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>{t('leave.title')}</h1>
        <div className="page-header-actions">
          <BranchFilter />
          <button type="button" className="btn-primary btn-icon-row" onClick={() => setShowForm(true)}><FiPlus /> Ajukan Cuti</button>
        </div>
      </div>

      {/* Leave Quota Cards */}
      <div className="stats-grid mb">
        {allEmployees.slice(0, 4).map((emp) => {
          const quota = emp.leave_quota || emp.leaveQuota || 12;
          const used  = emp.leave_used  || emp.leaveUsed  || 0;
          const pct   = ((quota - used) / quota) * 100;
          return (
            <div className="info-card" key={emp.id}>
              <div className="td-semibold mb-sm">{emp.name}</div>
              <div className="leave-quota-row">
                <span className="td-muted-sm">Sisa Cuti</span>
                <span className="td-semibold">{quota - used} / {quota}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${pct}%`,
                  background: (quota - used) <= 3 ? 'var(--danger)' : 'var(--primary)',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="filters-bar">
        <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </NativeSelect>
      </div>

      {filtered.length === 0 ? (
        <div className="data-table-card">
          <EmptyState
            title="Belum ada pengajuan cuti"
            description="Semua terkendali. Pengajuan cuti karyawan akan muncul di sini."
            ctaLabel="Muat ulang"
            onCta={fetchData}
            secondaryLabel="Buka persetujuan"
            onSecondary={() => { window.location.href = '/approvals'; }}
          />
        </div>
      ) : (
        <div className="data-table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Karyawan</th><th>Jenis</th><th>Tanggal</th><th>Durasi</th><th>Alasan</th><th>Status</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((leave) => {
                  const emp = allEmployees.find((e) => e.id === leave.employee_id);
                  return (
                    <tr key={leave.id}>
                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar sm">
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
                      <td className="td-sm">
                        {new Date(leave.start_date || leave.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        {(leave.start_date || leave.startDate) !== (leave.end_date || leave.endDate) &&
                          ` - ${new Date(leave.end_date || leave.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                      </td>
                      <td className="td-semibold">{leave.days} hari</td>
                      <td className="td-truncate">{leave.reason}</td>
                      <td>
                        <span className={`status-badge ${leave.status}`}>
                          {leave.status === 'pending' ? 'Pending' : leave.status === 'approved' ? 'Approved' : leave.status === 'cancelled' ? 'Dibatalkan' : 'Rejected'}
                        </span>
                      </td>
                      <td>
                        {leave.status === 'pending' ? (
                          <div className="actions-cell">
                            <Button variant="ghost" size="icon" className="action-btn success" title="Approve" onClick={() => handleApprove(leave.id)}><FiCheck /></Button>
                            <Button variant="ghost" size="icon" className="action-btn danger" title="Reject" onClick={() => handleReject(leave.id)}><FiX /></Button>
                          </div>
                        ) : <span className="td-muted-sm">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Cuti / Izin</DialogTitle>
          </DialogHeader>
          <DialogPanel>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Karyawan</label>
                <NativeSelect value={newLeave.employeeId} onChange={(e) => setNewLeave({ ...newLeave, employeeId: e.target.value })}>
                  <option value="">Pilih Karyawan</option>
                  {allEmployees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </NativeSelect>
              </div>
              <div className="form-group">
                <label className="form-label">Jenis</label>
                <NativeSelect value={newLeave.type} onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}>
                  <option value="cuti">Cuti Tahunan</option>
                  <option value="sakit">Sakit</option>
                  <option value="izin">Izin</option>
                </NativeSelect>
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Mulai</label>
                <DatePicker value={newLeave.startDate} onChange={(value) => setNewLeave({ ...newLeave, startDate: value })} placeholder="Pilih tanggal mulai" />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Selesai</label>
                <DatePicker value={newLeave.endDate} onChange={(value) => setNewLeave({ ...newLeave, endDate: value })} placeholder="Pilih tanggal selesai" />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Alasan</label>
                <Textarea placeholder="Tuliskan alasan cuti/izin..." value={newLeave.reason} onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })} />
              </div>
            </div>
          </DialogPanel>
          <DialogFooter>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
            <button type="button" className="btn-primary" onClick={handleSubmit}>Ajukan</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

