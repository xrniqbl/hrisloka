import { useState, useEffect } from 'react';
import { FiDollarSign, FiPlus, FiX, FiCheck, FiClock, FiCheckCircle, FiXCircle, FiDownload } from 'react-icons/fi';
import * as loanService from '../services/loanService';
import * as employeeService from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { exportToExcel } from '../lib/excelExport';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

const fmt = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;
const statusColors = { pending: '#F59E0B', active: '#635BFF', paid: '#16A34A', rejected: '#DC2626' };
const statusLabels = { pending: 'Menunggu', active: 'Aktif', paid: 'Lunas', rejected: 'Ditolak' };

export default function LoanManagement() {
 const { employee } = useAuth();
 const [loans, setLoans] = useState([]);
 const [employees, setEmployees] = useState([]);
 const [loading, setLoading] = useState(true);
 const [modal, setModal] = useState(null);
 const [selected, setSelected] = useState(null);
 const [form, setForm] = useState({ employeeId: '', amount: '', monthlyDeduction: '', reason: '' });
 const [paymentAmount, setPaymentAmount] = useState('');

 const fetchData = async () => {
 setLoading(true);
 const [lRes, eRes] = await Promise.all([loanService.getAllLoans(employee?.company_id), employeeService.getAllEmployees(undefined, employee?.company_id)]);
 setLoans(lRes.data || []);
 setEmployees(eRes.data || []);
 setLoading(false);
 };

 useEffect(() => { fetchData(); }, []);

 // Realtime: auto-refresh
 useRealtimeTable('loans', fetchData, { companyId: currentUser?.company_id });

 const openCreate = () => { setForm({ employeeId: '', amount: '', monthlyDeduction: '', reason: '' }); setModal('create'); };

 const handleCreate = async () => {
 if (!form.employeeId || !form.amount) return;
 await loanService.submitLoan(Number(form.employeeId), {
 amount: Number(form.amount),
 monthlyDeduction: Number(form.monthlyDeduction) || Math.round(Number(form.amount) / 12),
 reason: form.reason,
 });
 setModal(null);
 fetchData();
 };

 const handleApprove = async (id) => { await loanService.approveLoan(id, employee?.id); fetchData(); };
 const handleReject = async (id) => { await loanService.rejectLoan(id); fetchData(); };

 const openPayment = (loan) => { setSelected(loan); setPaymentAmount(loan.monthly_deduction || ''); setModal('payment'); };
 const handlePayment = async () => {
 if (!selected || !paymentAmount) return;
 await loanService.recordPayment(selected.id, Number(paymentAmount));
 setModal(null);
 fetchData();
 };

 const handleExport = () => {
 exportToExcel(loans.map(l => ({
 Karyawan: l.employees?.name, NIP: l.employees?.nip, Jumlah: l.amount,
 Sisa: l.remaining, 'Cicilan/Bulan': l.monthly_deduction, Status: statusLabels[l.status],
 Alasan: l.reason, 'Mulai': l.start_date,
 })), 'Loan_Report.xlsx', 'Loans');
 };

 const totalActive = loans.filter(l => l.status === 'active').reduce((s, l) => s + (l.remaining || 0), 0);
 const totalPending = loans.filter(l => l.status === 'pending').length;

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={6} />;
 return (
 <div className="admin-page">
 <div className="page-header">
 <h1><FiDollarSign className="icon-mr" /> Pinjaman / Kasbon</h1>
 <div className="page-header-actions">
 <button className="btn-secondary" onClick={handleExport} aria-label="Export"><FiDownload /> Export</button>
 <button className="btn-primary" onClick={openCreate} aria-label="Ajukan pinjaman"><FiPlus /> Ajukan Pinjaman</button>
 </div>
 </div>

 {/* Stats */}
 <div className="stats-grid">
 <div className="info-card">
 <div className="info-card-label">Total Pinjaman</div>
 <div className="info-card-value">{loans.length}</div>
 </div>
 <div className="info-card">
 <div className="info-card-label">Sisa Pinjaman Aktif</div>
 <div className="info-card-value info">{fmt(totalActive)}</div>
 </div>
 <div className="info-card">
 <div className="info-card-label">Menunggu Approval</div>
 <div className="info-card-value warning">{totalPending}</div>
 </div>
 </div>

 <div className="data-table-card">
 <div className="table-responsive">
 <table className="data-table">
 <thead>
 <tr>
 <th>Karyawan</th>
 <th>Jumlah</th>
 <th>Sisa</th>
 <th>Cicilan/Bulan</th>
 <th>Alasan</th>
 <th>Status</th>
 <th>Aksi</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr><td colSpan={7} className="empty-state">Memuat...</td></tr>
 ) : loans.length === 0 ? (
 <tr><td colSpan={7} style={{ padding: 0, border: 'none' }}>
  <EmptyState
    title="Belum ada data pinjaman"
    description="Pengajuan pinjaman dari PWA atau buat manual di sini."
    ctaLabel="Ajukan pinjaman"
    onCta={openCreate}
    secondaryLabel="Muat ulang"
    onSecondary={fetchData}
    size="sm"
  />
 </td></tr>
 ) : loans.map(l => (
 <tr key={l.id}>
 <td className="td-semibold">{l.employees?.name || '-'}</td>
 <td className="td-semibold">{fmt(l.amount)}</td>
 <td style={{ fontWeight: 600, color: l.remaining > 0 ? '#DC2626' : 'var(--success)' }}>{fmt(l.remaining)}</td>
 <td>{fmt(l.monthly_deduction)}</td>
 <td className="td-truncate td-muted-sm">{l.reason || '-'}</td>
 <td>
 <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff', background: statusColors[l.status] }}>
 {statusLabels[l.status]}
 </span>
 </td>
 <td>
 <div className="actions-cell">
 {l.status === 'pending' && (
 <>
 <button className="action-btn success" onClick={() => handleApprove(l.id)} title="Approve" aria-label="Approve loan"><FiCheckCircle /></button>
 <button className="action-btn danger" onClick={() => handleReject(l.id)} title="Reject" aria-label="Reject loan"><FiXCircle /></button>
 </>
 )}
 {l.status === 'active' && l.remaining > 0 && (
 <button className="action-btn" onClick={() => openPayment(l)} title="Catat Pembayaran" aria-label="Catat pembayaran"><FiDollarSign /></button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Create Modal */}
 {modal === 'create' && (
 <div className="modal-overlay" onClick={() => setModal(null)}>
 <div className="modal-box" onClick={e => e.stopPropagation()}>
 <div className="modal-header"><h2>Ajukan Pinjaman Baru</h2><button className="modal-close" onClick={() => setModal(null)}><FiX /></button></div>
 <div className="modal-body">
 <div className="form-grid">
 <div className="form-group"><label className="form-label">Karyawan *</label>
 <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
 <option value="">- Pilih -</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
 </select>
 </div>
 <div className="form-group"><label className="form-label">Jumlah Pinjaman *</label><input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="5000000" /></div>
 <div className="form-group"><label className="form-label">Cicilan/Bulan</label><input className="form-input" type="number" value={form.monthlyDeduction} onChange={e => setForm({ ...form, monthlyDeduction: e.target.value })} placeholder="Auto = 1/12" /></div>
 <div className="form-group full-width"><label className="form-label">Alasan</label><textarea className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
 </div>
 </div>
 <div className="modal-footer"><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={handleCreate} disabled={!form.employeeId || !form.amount} aria-label="Ajukan"><FiCheck /> Ajukan</button></div>
 </div>
 </div>
 )}

 {/* Payment Modal */}
 {modal === 'payment' && selected && (
 <div className="modal-overlay" onClick={() => setModal(null)}>
 <div className="modal-box" onClick={e => e.stopPropagation()}>
 <div className="modal-header"><h2>Catat Pembayaran</h2><button className="modal-close" onClick={() => setModal(null)}><FiX /></button></div>
 <div className="modal-body">
 <div className="payment-summary-box">
 <div>Sisa pinjaman: <strong className="text-danger">{fmt(selected.remaining)}</strong></div>
 <div>Cicilan bulanan: <strong>{fmt(selected.monthly_deduction)}</strong></div>
 </div>
 <div className="form-group">
 <label className="form-label">Jumlah Pembayaran</label>
 <input className="form-input" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
 </div>
 </div>
 <div className="modal-footer"><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={handlePayment} disabled={!paymentAmount} aria-label="Bayar"><FiCheck /> Bayar</button></div>
 </div>
 </div>
 )}
 </div>
 );
}



