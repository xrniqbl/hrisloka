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
import '../../styles/shared.css';

export default function EmpHelpdesk() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const toast = useToast();
  const [emp, setEmp] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'it', priority: 'medium', message: '' });

  const STATUS_COLORS = { open: '#F59E0B', in_progress: '#3B82F6', resolved: '#16A34A', closed: '#6B7280' };
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
    const email = user?.email || user?.user_metadata?.email;
    const { data: empData } = await getEmployeeByEmail(email);
    if (empData) {
      setEmp(empData);
      const { data: ticketData } = await getTicketsByEmployee(empData.id);
      setTickets(ticketData || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  const handleSubmit = async () => {
    if (!emp || !form.subject || !form.message) return;
    setSubmitting(true);
    await submitTicket({
      employee_id: emp.id,
      subject: form.subject,
      category: form.category,
      priority: form.priority,
      message: form.message,
    });
    setForm({ subject: '', category: 'it', priority: 'medium', message: '' });
    await loadData();
    setSubmitting(false);
    setSheetOpen(false);
    toast.success(locale === 'en' ? 'Ticket submitted successfully!' : 'Tiket berhasil dikirim!');
  };

  if (loading) return (
    <div style={{ animation: "fadeInUp 0.3s ease" }}>
      <div style={{ marginBottom: 16 }}>
        <div className="skeleton skeleton-text" style={{ width: 120, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 200 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[1, 2].map(i => <div key={i} className="emp-card" style={{ padding: 14, textAlign: 'center' }}><div className="skeleton" style={{ height: 48, borderRadius: 8 }} /></div>)}
      </div>
      <div className="skeleton" style={{ height: 52, borderRadius: 'var(--radius-md)', marginBottom: 20 }} />
      <div style={{ display: 'grid', gap: 10 }}>
        {[1, 2, 3].map(i => <div key={i} className="emp-card" style={{ height: 88 }}><div className="skeleton" style={{ height: '100%', borderRadius: 8 }} /></div>)}
      </div>
    </div>
  );

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');

  return (
    <div className="emp-page">
      <div style={{ marginBottom: 16 }}>
        <h1 className="emp-page-title">{locale === 'en' ? 'Helpdesk' : 'Helpdesk'}</h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'Create and track support tickets' : 'Buat dan pantau tiket bantuan'}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="emp-card" style={{ padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
            {locale === 'en' ? 'Active Tickets' : 'Tiket Aktif'}
          </div>
          <div className="emp-stat-number" style={{ fontSize: 22, fontWeight: 800, color: '#F59E0B' }}>{openTickets.length}</div>
        </div>
        <div className="emp-card" style={{ padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
            {locale === 'en' ? 'Total Tickets' : 'Total Tiket'}
          </div>
          <div className="emp-stat-number" style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{tickets.length}</div>
        </div>
      </div>

      {/* New Ticket Button */}
      <button
        onClick={() => setSheetOpen(true)}
        style={{
          width: '100%', padding: '14px', marginBottom: 20,
          background: 'linear-gradient(135deg, var(--primary), #1D4ED8)',
          color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 14px rgba(0,71,171,0.25)',
          fontFamily: 'inherit', transition: 'opacity 0.2s',
        }}
      >
        <HiPlus size={18} /> {locale === 'en' ? 'Create New Ticket' : 'Buat Tiket Baru'}
      </button>

      {/* Ticket List */}
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
        {locale === 'en' ? `Ticket History (${tickets.length})` : `Riwayat Tiket (${tickets.length})`}
      </div>
      {tickets.length === 0 ? (
        <div className="emp-card emp-empty">
          <div className="emp-empty-icon"><HiQuestionMarkCircle size={24} /></div>
          <div className="emp-empty-title">{locale === 'en' ? 'No tickets yet' : 'Belum ada tiket'}</div>
          <div className="emp-empty-desc">{locale === 'en' ? 'Create a new ticket if you need assistance' : 'Buat tiket baru jika membutuhkan bantuan'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {tickets.map(t => (
            <div key={t.id} className="emp-card emp-card-stagger" style={{ padding: 16, borderLeft: `4px solid ${STATUS_COLORS[t.status] || '#6B7280'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{t.subject}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {CATEGORIES.find(c => c.value === t.category)?.label || t.category} � {new Date(t.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID')}
                  </div>
                </div>
                <span className={`status-badge ${t.status === 'in_progress' ? 'active' : t.status === 'resolved' ? 'approved' : t.status}`}>
                  {STATUS_LABELS[t.status] || t.status}
                </span>
              </div>
              {t.message && (
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, fontStyle: 'italic' }}>"{t.message.slice(0, 80)}{t.message.length > 80 ? '...' : ''}"</div>
              )}
              {t.admin_reply && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(0,71,171,0.06)', borderRadius: 8, borderLeft: '3px solid var(--primary)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>
                    {locale === 'en' ? 'HR/ADMIN REPLY' : 'BALASAN HR/ADMIN'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.admin_reply}</div>
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
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="emp-label">{locale === 'en' ? 'Subject *' : 'Subjek *'}</label>
            <input
              className="emp-input"
              placeholder={locale === 'en' ? 'Briefly describe the issue...' : 'Deskripsikan masalah secara singkat...'}
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div>
            <label className="emp-label">{locale === 'en' ? 'Category' : 'Kategori'}</label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13 }}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="emp-label">{locale === 'en' ? 'Priority' : 'Prioritas'}</label>
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13 }}
            >
              <option value="low">{locale === 'en' ? 'Low' : 'Rendah'}</option>
              <option value="medium">{locale === 'en' ? 'Medium' : 'Sedang'}</option>
              <option value="high">{locale === 'en' ? 'High' : 'Tinggi'}</option>
              <option value="urgent">{locale === 'en' ? 'Urgent' : 'Mendesak'}</option>
            </select>
          </div>
          <div>
            <label className="emp-label">{locale === 'en' ? 'Issue Description *' : 'Deskripsi Masalah *'}</label>
            <textarea
              className="emp-input"
              placeholder={locale === 'en' ? 'Explain your issue or request in detail...' : 'Jelaskan masalah atau permintaan Anda secara detail...'}
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              style={{ minHeight: 100, resize: 'vertical' }}
            />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
