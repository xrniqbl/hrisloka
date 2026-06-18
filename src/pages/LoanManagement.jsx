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

const fmt = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;
const statusColors = { pending: '#F59E0B', active: '#3B82F6', paid: '#16A34A', rejected: '#DC2626' };
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

 useEffect(() => { fetchData(); }, []);

 const fetchData = async () => {
 setLoading(true);
 const [lRes, eRes] = await Promise.all([loanService.getAllLoans(), employeeService.getAllEmployees(undefined, employee?.company_id)]);
 setLoans(lRes.data || []);
 setEmployees(eRes.data || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('loans', fetchData);

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
 <div>
 <div className="page-header">
 <h1><FiDollarSign style={{ marginRight: 10 }} /> Pinjaman / Kasbon</h1>
 <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
 <button className="btn-secondary" onClick={handleExport}><FiDownload /> Export</button>
 <button className="btn-primary" onClick={openCreate}><FiPlus /> Ajukan Pinjaman</button>
 </div>
 </div>

 {/* Stats */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
 <div className="info-card">
 <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Total Pinjaman</div>
 <div style={{ fontSize: 28, fontWeight: 800 }}>{loans.length}</div>
 </div>
 <div className="info-card">
 <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Sisa Pinjaman Aktif</div>
 <div style={{ fontSize: 20, fontWeight: 800, color: '#3B82F6' }}>{fmt(totalActive)}</div>
 </div>
 <div className="info-card">
 <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Menunggu Approval</div>
 <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B' }}>{totalPending}</div>
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
 <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Memuat...</td></tr>
 ) : loans.length === 0 ? (
 <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Belum ada data pinjaman.</td></tr>
 ) : loans.map(l => (
 <tr key={l.id}>
 <td style={{ fontWeight: 600 }}>{l.employees?.name || '-'}</td>
 <td style={{ fontWeight: 600 }}>{fmt(l.amount)}</td>
 <td style={{ fontWeight: 600, color: l.remaining > 0 ? '#DC2626' : 'var(--success)' }}>{fmt(l.remaining)}</td>
 <td>{fmt(l.monthly_deduction)}</td>
 <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--muted)' }}>{l.reason || '-'}</td>
 <td>
 <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff', background: statusColors[l.status] }}>
 {statusLabels[l.status]}
 </span>
 </td>
 <td>
 <div style={{ display: 'flex', gap: 6 }}>
 {l.status === 'pending' && (
 <>
 <button className="action-btn" style={{ color: 'var(--success)' }} onClick={() => handleApprove(l.id)} title="Approve"><FiCheckCircle /></button>
 <button className="action-btn danger" onClick={() => handleReject(l.id)} title="Reject"><FiXCircle /></button>
 </>
 )}
 {l.status === 'active' && l.remaining > 0 && (
 <button className="action-btn" onClick={() => openPayment(l)} title="Catat Pembayaran"><FiDollarSign /></button>
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
 <div className="modal-footer"><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={handleCreate} disabled={!form.employeeId || !form.amount}><FiCheck /> Ajukan</button></div>
 </div>
 </div>
 )}

 {/* Payment Modal */}
 {modal === 'payment' && selected && (
 <div className="modal-overlay" onClick={() => setModal(null)}>
 <div className="modal-box" onClick={e => e.stopPropagation()}>
 <div className="modal-header"><h2>Catat Pembayaran</h2><button className="modal-close" onClick={() => setModal(null)}><FiX /></button></div>
 <div className="modal-body">
 <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 16, fontSize: 13 }}>
 <div>Sisa pinjaman: <strong style={{ color: '#DC2626' }}>{fmt(selected.remaining)}</strong></div>
 <div>Cicilan bulanan: <strong>{fmt(selected.monthly_deduction)}</strong></div>
 </div>
 <div className="form-group">
 <label className="form-label">Jumlah Pembayaran</label>
 <input className="form-input" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
 </div>
 </div>
 <div className="modal-footer"><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={handlePayment} disabled={!paymentAmount}><FiCheck /> Bayar</button></div>
 </div>
 </div>
 )}
 </div>
 );
}
