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

  useEffect(() => { if (companyId) fetchAnnouncements(); }, [companyId]);

  

  // Realtime: auto-refresh on new announcements
  useRealtimeTable('announcements', fetchAnnouncements);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    const payload = { title: title.trim(), message: message.trim() };
    if (companyId) payload.company_id = companyId;
    const { error } = await supabase.from('announcements').insert(payload);

    if (!error) {
      // Broadcast to company-scoped realtime channel
      const channelName = companyId ? `announcements-${companyId}` : 'announcements';
      supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'new_announcement',
        payload: { title: title.trim(), message: message.trim() },
      });
      sendAnnouncementPush(title.trim(), message.trim()).catch(() => {});
      setTitle('');
      setMessage('');
      fetchAnnouncements();
    }
    setSending(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    fetchAnnouncements();
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1><FiBell style={{ marginRight: 10 }} />Pengumuman</h1>
      </div>

      {/* Send Announcement Form */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)', padding: 28, marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
          Kirim Pengumuman Baru
        </h3>
        <form onSubmit={handleSend}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Judul Pengumuman *</label>
            <input
              className="form-input"
              placeholder="Contoh: Libur Nasional, Perubahan Jam Kerja..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: 18 }}>
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
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid rgba(0,0,0,0.04)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Riwayat Pengumuman</h3>
          <span style={{
            background: 'var(--primary)', color: '#fff', fontSize: 11,
            fontWeight: 700, padding: '2px 10px', borderRadius: 99,
          }}>{announcements.length}</span>
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
              <div key={ann.id} style={{
                padding: '18px 24px',
                borderBottom: '1px solid rgba(0,0,0,0.03)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
                transition: 'background 0.15s',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
                    {ann.title}
                  </div>
                  <div style={{
                    fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5,
                    marginBottom: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {ann.message}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                    <FiClock size={12} />
                    {formatDate(ann.created_at)}
                  </div>
                </div>
                <button
                  className="action-btn danger"
                  title="Hapus"
                  onClick={() => handleDelete(ann.id)}
                  style={{ flexShrink: 0 }}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
