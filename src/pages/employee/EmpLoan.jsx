import { useState, useEffect, useCallback } from 'react';
import {
  HiBellAlert,
  HiChevronDown,
  HiClock,
  HiCurrencyDollar,
  HiPaperAirplane
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getMyLoans, submitLoan, getLoanPayments } from '../../services/loanService';
import BottomSheet from '../../components/BottomSheet';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import { isDemoMode, DEMO_EMPLOYEE, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import '../../styles/shared.css';

const fmt = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

export default function EmpLoan() {
  const { user, employee: authEmployee } = useAuth();
  const { locale } = useTranslation();
  const toast = useToast();
  const [emp, setEmp] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [expandedLoan, setExpandedLoan] = useState(null);
  const [payments, setPayments] = useState({});
  const [form, setForm] = useState({ amount: '', monthlyDeduction: '', reason: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    if (isDemoMode()) {
      setEmp({ ...DEMO_EMPLOYEE });
      setLoans([...(DEMO_PROFILE_DATA.loans || [])]);
      setLoading(false);
      return;
    }
    let empData = authEmployee;
    if (!empData?.id) {
      const email = user?.email || user?.user_metadata?.email;
      const res = await getEmployeeByEmail(email);
      empData = res.data;
    }
    if (empData) {
      setEmp(empData);
      const { data: loanData } = await getMyLoans(empData.id);
      setLoans(loanData || []);
    }
    setLoading(false);
  }, [user, authEmployee?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  const handleSubmit = async () => {
    setFormError('');
    if (!emp || !form.amount || Number(form.amount) <= 0) {
      setFormError(locale === 'en' ? 'Enter a valid loan amount.' : 'Masukkan nominal pinjaman yang valid.');
      return;
    }
    setSubmitting(true);
    const amount = Number(form.amount);
    const monthlyDeduction = Number(form.monthlyDeduction) || Math.round(amount / 12);

    if (isDemoMode()) {
      setLoans((prev) => [{
        id: `demo-loan-${Date.now()}`,
        amount,
        remaining: amount,
        monthly_deduction: monthlyDeduction,
        reason: form.reason,
        status: 'pending',
        created_at: new Date().toISOString(),
      }, ...prev]);
      setForm({ amount: '', monthlyDeduction: '', reason: '' });
      setSubmitting(false);
      setSheetOpen(false);
      toast.success(locale === 'en' ? 'Demo loan submitted!' : 'Pinjaman demo dikirim!');
      return;
    }

    const { error } = await submitLoan(emp.id, {
      amount,
      monthlyDeduction,
      reason: form.reason,
      companyId: emp.company_id,
    });
    setSubmitting(false);
    if (error) {
      setFormError(error.message || (locale === 'en' ? 'Failed to submit loan' : 'Gagal mengajukan pinjaman'));
      toast?.error?.(error.message);
      return;
    }
    setForm({ amount: '', monthlyDeduction: '', reason: '' });
    await loadData();
    setSheetOpen(false);
    toast.success(locale === 'en' ? 'Loan application submitted!' : 'Pengajuan pinjaman berhasil dikirim!');
  };

  const toggleExpand = async (loan) => {
    if (expandedLoan === loan.id) { setExpandedLoan(null); return; }
    setExpandedLoan(loan.id);
    if (!payments[loan.id]) {
      const { data } = await getLoanPayments(loan.id);
      setPayments(prev => ({ ...prev, [loan.id]: data || [] }));
    }
  };

  if (loading) return (
    <div style={{ animation: "fadeInUp 0.3s ease" }}>
      <div className="mb">
        <div className="skeleton skeleton-text" style={{ width: 160, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 220 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[1,2].map(i => <div key={i} className="emp-card" style={{ padding: 14, textAlign: 'center' }}><div className="skeleton" style={{ height: 48, borderRadius: 8 }} /></div>)}
      </div>
      <div className="skeleton" style={{ height: 52, borderRadius: 'var(--radius-md)', marginBottom: 14 }} />
      <div style={{ display: 'grid', gap: 10 }}>
        {[1,2].map(i => <div key={i} className="emp-card" style={{ height: 100 }}><div className="skeleton" style={{ height: '100%', borderRadius: 8 }} /></div>)}
      </div>
    </div>
  );

  if (!emp) return <div className="ep-empty-wrap"><div className="ep-empty-desc">Data tidak ditemukan.</div></div>;

  const statusLabels = {
    pending: locale === 'en' ? 'Pending' : 'Menunggu',
    active: locale === 'en' ? 'Active' : 'Aktif',
    paid: locale === 'en' ? 'Paid Off' : 'Lunas',
    rejected: locale === 'en' ? 'Rejected' : 'Ditolak',
  };

  const activeLoans = loans.filter(l => l.status === 'active');
  const totalRemaining = activeLoans.reduce((s, l) => s + (l.remaining || 0), 0);
  const totalMonthly = activeLoans.reduce((s, l) => s + (l.monthly_deduction || 0), 0);

  return (
    <div className="emp-page">
      <div className="mb">
        <h1 className="emp-page-title">{locale === 'en' ? 'Loans & Cash Advances' : 'Pinjaman / Kasbon'}</h1>
        <p className="emp-page-subtitle">{locale === 'en' ? 'Manage loans and installment history' : 'Kelola pinjaman dan riwayat cicilan'}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="emp-card" style={{ padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>{locale === 'en' ? 'Remaining Balance' : 'Sisa Pinjaman'}</div>
          <div className="emp-stat-number" style={{ color: totalRemaining > 0 ? '#DC2626' : 'var(--success)' }}>{fmt(totalRemaining)}</div>
        </div>
        <div className="emp-card" style={{ padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>{locale === 'en' ? 'Monthly Installment' : 'Cicilan/Bulan'}</div>
          <div className="emp-stat-number">{fmt(totalMonthly)}</div>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={() => setSheetOpen(true)}
        className="btn-primary"
        style={{ width: '100%', marginBottom: 14 }}
      >
        <HiCurrencyDollar size={18} /> {locale === 'en' ? 'Apply for New Loan' : 'Ajukan Pinjaman Baru'}
      </button>

      {/* Loan List */}
      <div className="section-label mb-sm">
        {locale === 'en' ? `Loan History (${loans.length})` : `Riwayat Pinjaman (${loans.length})`}
      </div>
      {loans.length === 0 ? (
        <div className="emp-card emp-empty">
          <div className="emp-empty-icon"><HiCurrencyDollar size={24} /></div>
          <div className="emp-empty-title">{locale === 'en' ? 'No loan history' : 'Belum ada pinjaman'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {loans.map(l => {
            const progress = l.amount > 0 ? Math.round(((l.amount - (l.remaining || 0)) / l.amount) * 100) : 0;
            const isExpanded = expandedLoan === l.id;
            return (
              <div key={l.id} className="emp-card emp-card-interactive emp-card-stagger" style={{ padding: 16 }} onClick={() => toggleExpand(l)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(l.amount)}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{l.start_date || l.created_at?.split('T')[0] || '-'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`status-badge ${l.status === 'active' ? 'active' : l.status === 'paid' ? 'approved' : l.status}`}>
                      {statusLabels[l.status]}
                    </span>
                    <HiChevronDown size={14} style={{ color: 'var(--muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                  </div>
                </div>

                {(l.status === 'active' || l.status === 'paid') && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: 'var(--muted)' }}>
                      <span>{locale === 'en' ? `Paid ${progress}%` : `Terbayar ${progress}%`}</span>
                      <span>{locale === 'en' ? `Remaining: ${fmt(l.remaining)}` : `Sisa: ${fmt(l.remaining)}`}</span>
                    </div>
                    <div className="emp-progress-bar">
                      <div className="emp-progress-fill" style={{ width: `${progress}%`, background: progress >= 100 ? '#16A34A' : 'var(--primary)' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span><HiClock size={11} /> {locale === 'en' ? `Installment: ${fmt(l.monthly_deduction)}/mo` : `Cicilan: ${fmt(l.monthly_deduction)}/bulan`}</span>
                </div>

                {l.reason && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>"{l.reason}"</div>
                )}

                {isExpanded && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                      {locale === 'en' ? 'Payment History' : 'Riwayat Pembayaran'}
                    </div>
                    {(payments[l.id] || l.loan_payments || []).length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {locale === 'en' ? 'No payments yet.' : 'Belum ada pembayaran.'}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 6 }}>
                        {(payments[l.id] || l.loan_payments || []).map((p, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg)', borderRadius: 6, fontSize: 12 }}>
                            <span style={{ color: 'var(--muted)' }}>{p.payment_date || p.created_at?.split('T')[0]}</span>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>-{fmt(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Loan Sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={locale === 'en' ? 'Apply for New Loan' : 'Ajukan Pinjaman Baru'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setSheetOpen(false)}>{locale === 'en' ? 'Cancel' : 'Batal'}</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting || !form.amount}>
              {submitting ? (locale === 'en' ? 'Sending...' : 'Mengirim...') : <><HiPaperAirplane style={{ marginRight: 6 }} />{locale === 'en' ? 'Submit' : 'Kirim'}</>}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 14 }}>
          {formError && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontSize: 12, fontWeight: 600 }}>
              {formError}
            </div>
          )}
          {activeLoans.length > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#D97706', fontWeight: 600 }}>
              <HiBellAlert />
              {locale === 'en'
                ? `You have ${activeLoans.length} active loan(s) (remaining: ${fmt(totalRemaining)})`
                : `Anda memiliki ${activeLoans.length} pinjaman aktif (sisa: ${fmt(totalRemaining)})`}
            </div>
          )}
          <div>
            <label className="emp-label">{locale === 'en' ? 'Loan Amount (Rp) *' : 'Jumlah Pinjaman (Rp) *'}</label>
            <input className="emp-input" type="number" placeholder="5000000" value={form.amount} onChange={e => { setForm({ ...form, amount: e.target.value }); setFormError(''); }} />
          </div>
          <div>
            <label className="emp-label">{locale === 'en' ? 'Monthly Installment (Rp)' : 'Cicilan per Bulan (Rp)'}</label>
            <input className="emp-input" type="number"
              placeholder={form.amount ? `Auto: ${fmt(Math.round(Number(form.amount) / 12))}` : (locale === 'en' ? 'Auto = 1/12 of total' : 'Auto = 1/12 dari total')}
              value={form.monthlyDeduction} onChange={e => setForm({ ...form, monthlyDeduction: e.target.value })} />
            <div className="emp-helper-text">{locale === 'en' ? 'Leave blank for auto-calculation' : 'Kosongkan untuk auto-kalkulasi'}</div>
          </div>
          <div>
            <label className="emp-label">{locale === 'en' ? 'Reason / Purpose' : 'Alasan / Keperluan'}</label>
            <textarea className="emp-input"
              placeholder={locale === 'en' ? 'Reason for the loan...' : 'Alasan pinjaman...'}
              value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
              style={{ minHeight: 80, resize: 'vertical' }} />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
