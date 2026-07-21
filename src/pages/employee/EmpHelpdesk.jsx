import { useState, useEffect, useCallback } from 'react';
import {
  HiPaperAirplane,
  HiPlus,
  HiQuestionMarkCircle
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getTicketsByEmployee, submitTicket } from '../../services/ticketService';
import BottomSheet from '../../components/BottomSheet';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import { isDemoMode, DEMO_EMPLOYEE, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import EmpEmptyState from '../../components/EmpEmptyState';
import '../../styles/shared.css';

export default function EmpHelpdesk() {
  const { user, employee: authEmployee } = useAuth();
  const { locale } = useTranslation();
  const toast = useToast();
  const [emp, setEmp] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ subject: '', category: 'it', priority: 'medium', message: '' });

  const STATUS_COLORS = { open: '#F59E0B', in_progress: '#635BFF', resolved: '#16A34A', closed: '#6B7280' };
  const STATUS_LABELS = {
    open: locale === 'en' ? 'Open' : 'Terbuka',
    in_progress: locale === 'en' ? 'In Progress' : 'Diproses',
    resolved: locale === 'en' ? 'Resolved' : 'Selesai',
    closed: locale === 'en' ? 'Closed' : 'Ditutup',
  };

  const CATEGORIES = locale === 'en' ? [
    { value: 'it', label: 'IT / Technical' },
    { value: 'hr', label: 'HR / Administration' },
    { value: 'finance', label: 'Finance / Payroll' },
    { value: 'facility', label: 'Facilities & Office' },
    { value: 'other', label: 'Other' },
  ] : [
    { value: 'it', label: 'IT / Teknis' },
    { value: 'hr', label: 'HR / Administrasi' },
    { value: 'finance', label: 'Keuangan / Payroll' },
    { value: 'facility', label: 'Fasilitas & Kantor' },
    { value: 'other', label: 'Lainnya' },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    if (isDemoMode()) {
      setEmp({ ...DEMO_EMPLOYEE });
      setTickets([...(DEMO_PROFILE_DATA.tickets || [])]);
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
      const { data: ticketData } = await getTicketsByEmployee(empData.id);
      setTickets(ticketData || []);
    }
    setLoading(false);
  }, [user, authEmployee]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  const handleSubmit = async () => {
    setFormError('');
    if (!emp || !form.subject?.trim() || !form.message?.trim()) {
      setFormError(locale === 'en' ? 'Subject and message are required.' : 'Subjek dan pesan wajib diisi.');
      return;
    }
    setSubmitting(true);

    if (isDemoMode()) {
      setTickets((prev) => [{
        id: `demo-ticket-${Date.now()}`,
        subject: form.subject.trim(),
        category: form.category,
        priority: form.priority,
        message: form.message.trim(),
        status: 'open',
        created_at: new Date().toISOString(),
      }, ...prev]);
      setForm({ subject: '', category: 'it', priority: 'medium', message: '' });
      setSubmitting(false);
      setSheetOpen(false);
      toast.success(locale === 'en' ? 'Demo ticket created!' : 'Tiket demo dibuat!');
      return;
    }

    const { error } = await submitTicket({
      employee_id: emp.id,
      subject: form.subject,
      category: form.category,
      priority: form.priority,
      message: form.message,
    });
    setSubmitting(false);
    if (error) {
      setFormError(error.message || (locale === 'en' ? 'Failed to submit ticket' : 'Gagal mengirim tiket'));
      toast?.error?.(error.message);
      return;
    }
    setForm({ subject: '', category: 'it', priority: 'medium', message: '' });
    await loadData();
    setSheetOpen(false);
    toast.success(locale === 'en' ? 'Ticket submitted successfully!' : 'Tiket berhasil dikirim!');
  };

  if (loading) return (
    <div className="ep-loading-wrap">
      <div style={{ marginBottom: 12 }}>
        <div className="skeleton skeleton-text" style={{ width: 120, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 200 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[1, 2].map(i => <div key={i} className="emp-card" style={{ padding: 14, textAlign: 'center' }}><div className="skeleton" style={{ height: 48, borderRadius: 8 }} /></div>)}
      </div>
      <div className="skeleton" style={{ height: 52, borderRadius: 'var(--radius-md)', marginBottom: 14 }} />
      <div style={{ display: 'grid', gap: 10 }}>
        {[1, 2, 3].map(i => <div key={i} className="emp-card" style={{ height: 88 }}><div className="skeleton" style={{ height: '100%', borderRadius: 8 }} /></div>)}
      </div>
    </div>
  );

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');

  return (
    <div className="emp-page">
      <div style={{ marginBottom: 12 }}>
        <h1 className="emp-page-title">{locale === 'en' ? 'Helpdesk' : 'Helpdesk'}</h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'Create and track support tickets' : 'Buat dan pantau tiket bantuan'}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="emp-card" style={{ padding: 14, textAlign: 'center' }}>
          <div className="td-muted-sm mb-sm">
            {locale === 'en' ? 'Active Tickets' : 'Tiket Aktif'}
          </div>
          <div className="info-card-value warning">{openTickets.length}</div>
        </div>
        <div className="emp-card" style={{ padding: 14, textAlign: 'center' }}>
          <div className="td-muted-sm mb-sm">
            {locale === 'en' ? 'Total Tickets' : 'Total Tiket'}
          </div>
          <div className="info-card-value primary">{tickets.length}</div>
        </div>
      </div>

      {/* New Ticket Button */}
      <button className="btn-primary mb" onClick={() => setSheetOpen(true)}>
        <HiPlus size={18} /> {locale === 'en' ? 'Create New Ticket' : 'Buat Tiket Baru'}
      </button>

      {/* Ticket List */}
      <div className="section-label mb-sm">
        {locale === 'en' ? `Ticket History (${tickets.length})` : `Riwayat Tiket (${tickets.length})`}
      </div>
      {tickets.length === 0 ? (
        <EmpEmptyState
          type="nodata"
          title={locale === 'en' ? 'No tickets yet' : 'Belum ada tiket'}
          subtitle={locale === 'en' ? 'Create a ticket if you need help from HR or IT.' : 'Buat tiket jika butuh bantuan HR atau IT.'}
          cta={locale === 'en' ? 'Create ticket' : 'Buat tiket'}
          ctaAction={() => setSheetOpen(true)}
          secondaryCta={locale === 'en' ? 'Home' : 'Beranda'}
          secondaryHref="/app/home"
        />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {tickets.map(t => (
            <div key={t.id} className="emp-card emp-card-stagger" style={{ padding: 16, borderLeft: `4px solid ${STATUS_COLORS[t.status] || '#6B7280'}` }}>
              <div className="btn-icon-row" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <div className="td-semibold mb-sm">{t.subject}</div>
                  <div className="td-muted-sm">
                    {CATEGORIES.find(c => c.value === t.category)?.label || t.category} · {new Date(t.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID')}
                  </div>
                </div>
                <span className={`status-badge ${t.status === 'in_progress' ? 'active' : t.status === 'resolved' ? 'approved' : t.status}`}>
                  {STATUS_LABELS[t.status] || t.status}
                </span>
              </div>
              {t.message && (
                <div className="td-muted-sm" style={{ lineHeight: 1.5, fontStyle: 'italic' }}>"{t.message.slice(0, 80)}{t.message.length > 80 ? '...' : ''}"</div>
              )}
              {t.admin_reply && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(99,91,255,0.06)', borderRadius: 8, borderLeft: '3px solid var(--primary)' }}>
                  <div className="td-muted-sm" style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>
                    {locale === 'en' ? 'HR/ADMIN REPLY' : 'BALASAN HR/ADMIN'}
                  </div>
                  <div className="td-muted-sm" style={{ color: 'var(--text-secondary)' }}>{t.admin_reply}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Ticket Sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={locale === 'en' ? 'Create Support Ticket' : 'Buat Tiket Bantuan'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setSheetOpen(false)}>{locale === 'en' ? 'Cancel' : 'Batal'}</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting || !form.subject || !form.message}>
              {submitting ? (locale === 'en' ? 'Sending...' : 'Mengirim...') : <><HiPaperAirplane style={{ marginRight: 6 }} />{locale === 'en' ? 'Submit' : 'Kirim'}</>}
            </button>
          </>
        }
      >
        <div className="form-grid" style={{ gap: 14 }}>
          {formError && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontSize: 12, fontWeight: 600 }}>
              {formError}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{locale === 'en' ? 'Subject *' : 'Subjek *'}</label>
            <input
              className="emp-input"
              placeholder={locale === 'en' ? 'Briefly describe the issue...' : 'Deskripsikan masalah secara singkat...'}
              value={form.subject}
              onChange={e => { setForm({ ...form, subject: e.target.value }); setFormError(''); }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'en' ? 'Category' : 'Kategori'}</label>
            <select
              className="form-select"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'en' ? 'Priority' : 'Prioritas'}</label>
            <select
              className="form-select"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
            >
              <option value="low">{locale === 'en' ? 'Low' : 'Rendah'}</option>
              <option value="medium">{locale === 'en' ? 'Medium' : 'Sedang'}</option>
              <option value="high">{locale === 'en' ? 'High' : 'Tinggi'}</option>
              <option value="urgent">{locale === 'en' ? 'Urgent' : 'Mendesak'}</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'en' ? 'Issue Description *' : 'Deskripsi Masalah *'}</label>
            <textarea
              className="form-textarea"
              placeholder={locale === 'en' ? 'Explain your issue or request in detail...' : 'Jelaskan masalah atau permintaan Anda secara detail...'}
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
            />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

