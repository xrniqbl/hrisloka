/**
 * Owner → Founder support: submit tickets + thread replies.
 * Mounted in Settings (tab Support).
 */
import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import {
  LifeBuoy,
  Send,
  MessageSquare,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getMyCompanyComplaints,
  submitCompanyComplaint,
  getComplaintThread,
  replyAsClient,
} from '../services/ownerPlatformService';
import './PlatformSupportPanel.css';

const CATEGORIES = [
  { value: 'general', label: 'Umum' },
  { value: 'billing', label: 'Billing / Langganan' },
  { value: 'technical', label: 'Teknis' },
  { value: 'feature', label: 'Permintaan Fitur' },
];

const PRIORITIES = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
  { value: 'urgent', label: 'Mendesak' },
];

const STATUS_LABEL = {
  open: 'Terbuka',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  closed: 'Ditutup',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PlatformSupportPanel() {
  const { employee, user } = useAuth();
  const companyId = employee?.company_id;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium',
  });

  const loadTickets = useCallback(async () => {
    if (!companyId) {
      setTickets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await getMyCompanyComplaints(companyId);
    if (err) console.warn('[PlatformSupport]', err.message);
    setTickets(data || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openTicket = async (ticket) => {
    setSelected(ticket);
    setReplyText('');
    setError('');
    const { data } = await getComplaintThread(ticket.id, companyId);
    setReplies(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!companyId) {
      setError('Akun belum terhubung ke perusahaan. Selesaikan onboarding terlebih dahulu.');
      return;
    }
    if (!form.subject.trim() || !form.message.trim()) {
      setError('Subjek dan pesan wajib diisi.');
      return;
    }
    setSending(true);
    const { data, error: err } = await submitCompanyComplaint({
      companyId,
      contactName: employee?.name || user?.email?.split('@')[0] || 'Owner',
      contactEmail: employee?.email || user?.email || null,
      subject: form.subject,
      message: form.message,
      category: form.category,
      priority: form.priority,
    });
    setSending(false);
    if (err) {
      setError(err.message || 'Gagal mengirim tiket.');
      return;
    }
    setSuccess('Tiket terkirim. Tim platform akan merespons di sini.');
    setForm({ subject: '', message: '', category: 'general', priority: 'medium' });
    setTickets((prev) => [data, ...prev]);
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    setError('');
    const { data, error: err } = await replyAsClient(
      selected.id,
      replyText,
      employee?.name || 'Owner',
      companyId,
    );
    setSending(false);
    if (err) {
      setError(err.message || 'Gagal mengirim balasan.');
      return;
    }
    setReplies((prev) => [...prev, data]);
    setReplyText('');
  };

  if (!companyId) {
    return (
      <div className="psp-card">
        <div className="psp-empty">
          <Icon icon={LifeBuoy} size="md" color="inherit" />
          <p>Hubungkan akun ke perusahaan untuk mengirim tiket support platform.</p>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="psp-layout">
        <div className="psp-card psp-thread">
          <button type="button" className="psp-back" onClick={() => setSelected(null)}>
            <Icon icon={ChevronLeft} size="sm" color="inherit" />
            Kembali ke daftar
          </button>
          <div className="psp-thread-head">
            <div>
              <h3 className="psp-title">{selected.subject}</h3>
              <p className="psp-meta">
                <span className={`psp-badge psp-badge--${selected.status}`}>
                  {STATUS_LABEL[selected.status] || selected.status}
                </span>
                <span>{formatDate(selected.created_at)}</span>
                <span className="psp-cat">{selected.category}</span>
              </p>
            </div>
          </div>

          <div className="psp-msg-block psp-msg-block--client">
            <div className="psp-msg-label">Pesan awal</div>
            <p>{selected.message}</p>
          </div>

          <div className="psp-replies">
            {replies.map((r) => (
              <div
                key={r.id}
                className={`psp-msg-block ${r.sender_type === 'founder' ? 'psp-msg-block--founder' : 'psp-msg-block--client'}`}
              >
                <div className="psp-msg-label">
                  {r.sender_type === 'founder' ? 'Platform' : r.sender_name || 'Anda'}
                  <span>{formatDate(r.created_at)}</span>
                </div>
                <p>{r.message}</p>
              </div>
            ))}
            {replies.length === 0 && (
              <p className="psp-hint">Belum ada balasan dari platform.</p>
            )}
          </div>

          {selected.status !== 'closed' && (
            <div className="psp-reply-box">
              <textarea
                className="psp-textarea"
                rows={3}
                placeholder="Tulis balasan…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <button
                type="button"
                className="psp-btn psp-btn-primary"
                disabled={sending || !replyText.trim()}
                onClick={handleReply}
              >
                <Icon icon={Send} size="sm" color="inherit" />
                Kirim balasan
              </button>
            </div>
          )}
          {error && <p className="psp-error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="psp-layout">
      <div className="psp-card">
        <div className="psp-card-head">
          <div>
            <h3 className="psp-title">
              <Icon icon={LifeBuoy} size="sm" color="inherit" />
              Hubungi Support Platform
            </h3>
            <p className="psp-desc">
              Tiket langsung ke Founder KiniKerja (billing, teknis, fitur). Bukan helpdesk internal karyawan.
            </p>
          </div>
        </div>

        <form className="psp-form" onSubmit={handleSubmit}>
          <div className="psp-row">
            <label className="psp-label">
              Kategori
              <select
                className="psp-select"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="psp-label">
              Prioritas
              <select
                className="psp-select"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="psp-label">
            Subjek
            <input
              className="psp-input"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Ringkas masalah Anda"
              maxLength={200}
              required
            />
          </label>
          <label className="psp-label">
            Pesan
            <textarea
              className="psp-textarea"
              rows={4}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Jelaskan detail, langkah yang sudah dicoba, atau ID referensi billing…"
              required
            />
          </label>
          {error && <p className="psp-error">{error}</p>}
          {success && <p className="psp-success">{success}</p>}
          <button type="submit" className="psp-btn psp-btn-primary" disabled={sending}>
            <Icon icon={Send} size="sm" color="inherit" />
            {sending ? 'Mengirim…' : 'Kirim tiket'}
          </button>
        </form>
      </div>

      <div className="psp-card">
        <div className="psp-card-head">
          <h3 className="psp-title">
            <Icon icon={MessageSquare} size="sm" color="inherit" />
            Tiket saya
          </h3>
          <button type="button" className="psp-btn psp-btn-ghost" onClick={loadTickets} title="Refresh">
            <Icon icon={RefreshCw} size="sm" color="inherit" />
          </button>
        </div>

        {loading ? (
          <p className="psp-hint">Memuat…</p>
        ) : tickets.length === 0 ? (
          <div className="psp-empty">
            <p>Belum ada tiket. Kirim pesan di formulir di atas.</p>
          </div>
        ) : (
          <ul className="psp-list">
            {tickets.map((t) => (
              <li key={t.id}>
                <button type="button" className="psp-list-item" onClick={() => openTicket(t)}>
                  <div className="psp-list-main">
                    <span className="psp-list-subject">{t.subject}</span>
                    <span className="psp-list-date">{formatDate(t.created_at)}</span>
                  </div>
                  <span className={`psp-badge psp-badge--${t.status}`}>
                    {STATUS_LABEL[t.status] || t.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
