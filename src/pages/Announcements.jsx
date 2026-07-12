import { useState, useEffect } from 'react';
import { FiSend, FiTrash2, FiBell, FiClock } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { useRealtimeTable } from '../hooks/useRealtime';
import { sendAnnouncementPush } from '../services/pushService';
import '../styles/shared.css';
import '../styles/admin.css';

export default function Announcements() {
  const { employee } = useAuth();
  const companyId = employee?.company_id;
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    let query = supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    setAnnouncements(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!companyId) {
      setAnnouncements([]);
      setLoading(false);
      return;
    }
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  

  // Realtime: auto-refresh on new announcements
  useRealtimeTable('announcements', fetchAnnouncements, { companyId: companyId });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    if (!companyId) {
      alert('Perusahaan tidak terdeteksi. Login ulang sebagai HR.');
      return;
    }
    setSending(true);
    // Always scope to company — PWA only reads same company_id
    const payload = {
      title: title.trim(),
      message: message.trim(),
      company_id: companyId,
      created_by: employee?.id || null,
      priority: 'normal',
    };
    let { error } = await supabase.from('announcements').insert(payload);

    // Retry without optional columns on older schemas
    if (error && /column|priority|created_by|company_id/i.test(error.message || '')) {
      const slim = { title: payload.title, message: payload.message };
      if (!/company_id/i.test(error.message || '')) slim.company_id = companyId;
      const retry = await supabase.from('announcements').insert(slim);
      error = retry.error;
    }

    if (!error) {
      const channelName = `announcements-${companyId}`;
      supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'new_announcement',
        payload: { title: title.trim(), message: message.trim(), company_id: companyId },
      }).catch(() => {});
      sendAnnouncementPush(title.trim(), message.trim()).catch((e) => console.warn('[Action failed]', e?.message || e));
      setTitle('');
      setMessage('');
      fetchAnnouncements();
    } else {
      alert('Gagal mengirim: ' + (error.message || 'error'));
    }
    setSending(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    if (!companyId) return;
    await supabase.from('announcements').delete().eq('id', id).eq('company_id', companyId);
    fetchAnnouncements();
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1><FiBell className="icon-mr" />Pengumuman</h1>
      </div>

      {/* Send Announcement Form */}
      <div className="data-table-card" style={{ padding: 28, marginBottom: 24 }}>
        <h3 className="section-label" style={{ marginBottom: 16 }}>
          Kirim Pengumuman Baru
        </h3>
        <form onSubmit={handleSend}>
          <div className="mb-sm">
            <label className="form-label">Judul Pengumuman *</label>
            <input
              className="form-input"
              placeholder="Contoh: Libur Nasional, Perubahan Jam Kerja..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="mb">
            <label className="form-label">Isi Pengumuman *</label>
            <textarea
              className="form-textarea"
              placeholder="Tulis detail pengumuman disini..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              required
              style={{ resize: 'vertical', minHeight: 100 }}
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={sending || !title.trim() || !message.trim()}
          >
            <FiSend /> {sending ? 'Mengirim...' : 'Kirim Pengumuman'}
          </button>
        </form>
      </div>

      {/* Announcements List */}
      <div className="data-table-card">
        <div className="data-table-header">
          <h3 className="section-label">Riwayat Pengumuman</h3>
          <span className="status-badge active">{announcements.length}</span>
        </div>

        {loading ? (
          <div style={{ padding: 24 }}>
            <TableSkeleton rows={3} cols={3} />
          </div>
        ) : announcements.length === 0 ? (
          <EmptyState
            icon="notification"
            title="Belum ada pengumuman"
            description="Buat pengumuman pertama untuk dikirim ke semua karyawan."
          />
        ) : (
          <div>
            {announcements.map(ann => (
              <div key={ann.id} className="announcement-row" style={{
                padding: '18px 24px',
                borderBottom: '1px solid rgba(0,0,0,0.03)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
              }}>
                <div style={{ flex: 1 }}>
                  <div className="td-semibold" style={{ marginBottom: 4 }}>
                    {ann.title}
                  </div>
                  <div className="td-muted-sm" style={{ lineHeight: 1.5, marginBottom: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {ann.message}
                  </div>
                  <div className="btn-icon-row td-muted-sm">
                    <FiClock size={12} />
                    {formatDate(ann.created_at)}
                  </div>
                </div>
                <button
                  className="action-btn danger"
                  title="Hapus"
                  onClick={() => handleDelete(ann.id)}
                ><FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

