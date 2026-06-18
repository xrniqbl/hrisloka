import { useState, useEffect } from 'react';
import { FiMessageCircle, FiX, FiSend, FiSearch, FiClock, FiAlertCircle } from 'react-icons/fi';
import * as founderService from '../../services/founderService';
import { useToast } from '../../components/Toast';
import './founder.css';
// \u2500\u2500 Skeleton helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function SkeletonBox({ w = '100%', h = 28, style = {} }) {
  return (
    <div style={{
      height: h, background: 'var(--border)', borderRadius: 8,
      width: w, animation: 'fp-pulse 1.5s ease-in-out infinite', ...style
    }} />
  );
}
function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><SkeletonBox w={i === 0 ? '80%' : '60%'} h={14} /></td>
      ))}
    </tr>
  );
}
// ── Skeleton helper ──────────────────────────────────────────────────────────
function SkeletonPage({ cols = 5, rows = 6, hasStats = false }) {
  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div><SkeletonBox w={200} h={28} /><SkeletonBox w={300} h={14} style={{ marginTop: 8 }} /></div>
          <SkeletonBox w={120} h={38} style={{ borderRadius: 10 }} />
        </div>
      </div>
      {hasStats && (
        <div className="fp-stats" style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="fp-stat">
              <SkeletonBox w={40} h={40} style={{ borderRadius: 10, marginBottom: 14 }} />
              <SkeletonBox w="55%" h={28} style={{ marginBottom: 8 }} />
              <SkeletonBox w="70%" h={12} />
            </div>
          ))}
        </div>
      )}
      <div className="fp-card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
          <SkeletonBox w={260} h={36} style={{ borderRadius: 8 }} />
          <SkeletonBox w={120} h={36} style={{ borderRadius: 8 }} />
        </div>
        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead>
              <tr>{Array.from({ length: cols }).map((_, i) => <th key={i}><SkeletonBox w={i === 0 ? 100 : 80} h={12} /></th>)}</tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => <TableRowSkeleton key={i} cols={cols} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function FounderSupport() {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  if (loading) return <SkeletonPage cols={4} rows={5} hasStats={true} />;
  const [selected, setSelected] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const { data, error } = await founderService.getAllComplaints();
      if (error) throw error;
      setComplaints(data || []);
    } catch (err) {
      console.error("[FounderSupport] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const openTicket = async (c) => {
    setSelected(c);
    setReplyText('');
    const { data } = await founderService.getComplaintReplies(c.id);
    setReplies(data || []);
  };

  const handleStatusChange = async (complaint, newStatus) => {
    const { data } = await founderService.updateComplaintStatus(complaint.id, newStatus);
    if (data) {
      setComplaints(prev => prev.map(c => c.id === complaint.id ? { ...c, status: newStatus } : c));
      if (selected?.id === complaint.id) setSelected(s => ({ ...s, status: newStatus }));
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    const { data } = await founderService.addComplaintReply(selected.id, replyText, 'founder', 'Founder Team');
    if (data) {
      setReplies(prev => [...prev, data]);
      setReplyText('');
      setComplaints(prev => prev.map(c => c.id === selected.id ? { ...c, status: c.status === 'open' ? 'in_progress' : c.status } : c));
      if (selected.status === 'open') setSelected(s => ({ ...s, status: 'in_progress' }));
      toast.success('Reply sent!');
    }
    setSending(false);
  };

  const filtered = complaints.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search || c.subject?.toLowerCase().includes(q) || c.companies?.name?.toLowerCase().includes(q) || c.contact_name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Client Support</h1>
            <p className="fp-subtitle">Respond to support tickets from subscribing companies</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="fp-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Open', count: complaints.filter(c => c.status === 'open').length, cls: 'open' },
          { label: 'In Progress', count: complaints.filter(c => c.status === 'in_progress').length, cls: 'in_progress' },
          { label: 'Resolved', count: complaints.filter(c => c.status === 'resolved').length, cls: 'resolved' },
          { label: 'Total', count: complaints.length, cls: '' },
        ].map(item => (
          <div key={item.label} className="fp-stat">
            <div className="fp-stat-value">{item.count}</div>
            <div className="fp-stat-label">{item.label} Tickets</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, height: 'calc(100vh - 320px)', minHeight: 500 }}>
        {/* Ticket List */}
        <div className="fp-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div className="fp-search" style={{ maxWidth: '100%' }}>
              <FiSearch className="fp-search-icon" />
              <input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
              {FILTER_STATUS.map(s => (
                <button
                  key={s}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                    background: statusFilter === s ? 'var(--text)' : 'var(--bg)',
                    color: statusFilter === s ? 'var(--surface)' : 'var(--text-secondary)',
                    fontFamily: 'inherit',
                  }}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div className="fp-empty">
                <div className="fp-empty-icon"><FiMessageCircle /></div>
                <div className="fp-empty-title">No tickets</div>
              </div>
            ) : filtered.map(c => (
              <div
                key={c.id}
                onClick={() => openTicket(c)}
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selected?.id === c.id ? 'var(--bg)' : 'none',
                  transition: 'background 0.12s',
                  borderLeft: selected?.id === c.id ? '3px solid #F59E0B' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', lineHeight: 1.3 }}>{c.subject}</div>
                  <span className={`fp-badge ${c.status}`} style={{ flexShrink: 0, fontSize: 10 }}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  {c.companies?.name} · {c.contact_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLOR[c.priority], background: `${PRIORITY_COLOR[c.priority]}15`, padding: '1px 6px', borderRadius: 10 }}>
                    {c.priority}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatRelative(c.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket Detail / Reply */}
        <div className="fp-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div className="fp-empty" style={{ margin: 'auto' }}>
              <div className="fp-empty-icon"><FiMessageCircle /></div>
              <div className="fp-empty-title">Select a ticket</div>
              <div className="fp-empty-desc">Click on a support ticket to view details and reply</div>
            </div>
          ) : (
            <>
              {/* Ticket header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{selected.subject}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      From <strong>{selected.contact_name}</strong> ({selected.contact_email}) · {selected.companies?.name} · {formatLong(selected.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <select
                      className="fp-select"
                      style={{ width: 'auto', fontSize: 12, padding: '5px 10px' }}
                      value={selected.status}
                      onChange={e => handleStatusChange(selected, e.target.value)}
                    >
                      {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Thread */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Original message */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {selected.contact_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{selected.contact_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatRelative(selected.created_at)}</span>
                    </div>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
                      {selected.message}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {replies.map(r => (
                  <div key={r.id} style={{ display: 'flex', gap: 12, flexDirection: r.sender_type === 'founder' ? 'row-reverse' : 'row' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: r.sender_type === 'founder' ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)',
                      color: r.sender_type === 'founder' ? '#F59E0B' : '#6366F1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                    }}>
                      {r.sender_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                    </div>
                    <div style={{ flex: 1, maxWidth: '80%' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, justifyContent: r.sender_type === 'founder' ? 'flex-end' : 'flex-start' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{r.sender_name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatRelative(r.created_at)}</span>
                      </div>
                      <div style={{
                        background: r.sender_type === 'founder' ? 'rgba(245,158,11,0.08)' : 'var(--bg)',
                        border: `1px solid ${r.sender_type === 'founder' ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
                        borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.7,
                      }}>
                        {r.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Write your reply..."
                    rows={3}
                    className="fp-textarea"
                    style={{ resize: 'none', flex: 1 }}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(); }}
                  />
                  <button
                    className="fp-btn fp-btn-primary"
                    style={{ alignSelf: 'flex-end', flexShrink: 0 }}
                    onClick={handleReply}
                    disabled={sending || !replyText.trim()}
                  >
                    <FiSend size={14} />
                    {sending ? 'Sending...' : 'Reply'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>Ctrl+Enter to send</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
