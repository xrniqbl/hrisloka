import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import { FiPlus, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import * as reimbursementService from '../services/reimbursementService';
import * as employeeService from '../services/employeeService';
import { formatCurrency } from '../lib/utils';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import FormDateField from '../components/FormDateField';
import { useToast } from '../components/Toast';

export default function Reimbursement() {
  const { t } = useTranslation();
  const { employee } = useAuth();
  const { toast } = useToast();
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

  const fetchData = async () => {
    setLoading(true);
    const { data: reimbData } = await reimbursementService.getAllReimbursements(employee?.company_id);
    const { data: empData } = await employeeService.getAllEmployees(undefined, employee?.company_id);
    setRecords(reimbData || []);
    setAllEmployees(empData || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!employee?.company_id) {
      setLoading(false);
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.company_id]);

  // Realtime: auto-refresh
  useRealtimeTable('reimbursements', fetchData, { companyId: employee?.company_id, enabled: !!employee?.company_id });

  const filtered = records.filter((r) => !filter || r.status === filter);

  // Service layer already sends push/WA/email/in-app when companyId is passed
  const handleApprove = async (id) => {
    const { error } = await reimbursementService.updateReimbursementStatus(
      id,
      'approved',
      employee?.company_id,
    );
    if (!error) fetchData();
    else {
      console.warn('[Reimbursement] approve failed:', error.message);
      toast.error('Gagal menyetujui reimbursement. Coba lagi.');
    }
  };

  const handleReject = async (id) => {
    const { error } = await reimbursementService.updateReimbursementStatus(
      id,
      'rejected',
      employee?.company_id,
    );
    if (!error) fetchData();
    else {
      console.warn('[Reimbursement] reject failed:', error.message);
      toast.error('Gagal menolak reimbursement. Coba lagi.');
    }
  };

  const handleSubmit = async () => {
    const { error } = await reimbursementService.submitReimbursement(
      form.employeeId || employee?.id,
      {
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        notes: form.notes,
      }
    );

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

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={5} />;
  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>{t('reimbursement.title')}</h1>
        <Button onClick={() => setShowForm(true)}><FiPlus /> {t('reimbursement.add')}</Button>
      </div>

      <div class="stats-grid">
        <div className="info-card">
          <div class="info-card-label">Total Klaim</div>
          <div class="info-card-value">{formatCurrency(summary.total)}</div>
        </div>
        <div className="info-card">
          <div class="info-card-label">Disetujui</div>
          <div class="info-card-value success">{formatCurrency(summary.approved)}</div>
        </div>
        <div className="info-card">
          <div class="info-card-label">Menunggu Approval</div>
          <div class="info-card-value warning">{summary.pending}</div>
        </div>
      </div>

      <div className="filters-bar">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="data-table-card">
        <div className="table-responsive">
          <Table>
            <TableHeader>
              <TableRow>
            
              <TableHead>Karyawan</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} style={{ padding: 0, border: 'none' }}>
                    <EmptyState
                      title="Belum ada klaim reimburse"
                      description="Klaim dari PWA akan muncul di sini untuk disetujui."
                      ctaLabel="Muat ulang"
                      onCta={fetchData}
                      secondaryLabel="Tambah klaim"
                      onSecondary={() => setShowForm(true)}
                      size="sm"
                    />
                  </TableCell>
                </TableRow>
              ) : filtered.map((r) => {
                const emp = allEmployees.find((e) => e.id === r.employee_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="employee-cell">
                        <div className="employee-avatar sm">
                          {emp?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                        </div>
                        <div className="employee-name">{emp?.name || 'Unknown'}</div>
                      </div>
                    </TableCell>
                    <TableCell><span className="chart-card-badge">{r.category || r.type}</span></TableCell>
                    <TableCell className="td-truncate">{r.notes || r.description}</TableCell>
                    <TableCell className="td-semibold">{formatCurrency(r.amount)}</TableCell>
                    <TableCell className="td-sm">{new Date(r.date).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell><span className={`status-badge ${r.status}`}>
                      {r.status === 'pending' ? 'Pending' : r.status === 'approved' ? 'Approved' : r.status === 'paid' ? 'Paid' : 'Rejected'}
                    </span></TableCell>
                    <TableCell>
                      {r.status === 'pending' ? (
                        <div className="actions-cell">
                          <Button variant="ghost" size="icon" className="action-btn success" onClick={() => handleApprove(r.id)}><FiCheck /></Button>
                          <Button variant="ghost" size="icon" className="action-btn danger" onClick={() => handleReject(r.id)}><FiX /></Button>
                        </div>
                      ) : <span className="td-muted-sm">-</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {showForm && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajukan Reimbursement</DialogTitle>
              <DialogDescription>Lengkapi form berikut untuk mengajukan klaim reimbursement</DialogDescription>
            </DialogHeader>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Karyawan</label>
                  <Select value={form.employeeId} onValueChange={(value) => setForm({ ...form, employeeId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    <option value="">Pilih Karyawan</option>
                    {allEmployees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jenis</label>
                  <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="meals">Meals</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah (IDR)</label>
                  <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal</label>
                  <FormDateField value={form.date} onChange={(v) => setForm({ ...form, date: v })} placeholder="Tanggal" />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Deskripsi</label>
                  <Textarea placeholder="Deskripsi klaim..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button onClick={handleSubmit}>Ajukan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
