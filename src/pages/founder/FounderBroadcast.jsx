import { useState, useEffect } from 'react';
import { FiBell, FiSend, FiX, FiTrash2, FiUsers, FiInfo, FiAlertTriangle, FiTag } from 'react-icons/fi';
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

export default function FounderBroadcast() {
  const { toast } = useToast();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  if (loading) return <SkeletonPage cols={5} rows={5} hasStats={false} />;
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [preview, setPreview] = useState(null);

  const fetchData = async () => {
    try {
      const { data, error } = await founderService.getAllBroadcasts();
      if (error) throw error;
      setBroadcasts(data || []);
    } catch (err) {
      console.error("[FounderBroadcast] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSend = async () => {
    if (!form.title || !form.message) return;
    setSending(true);
    const { data, error } = await founderService.sendBroadcast({
      title: form.title,
      message: form.message,
      type: form.type,
      target: form.target,
      target_plan_id: form.target_plan_id ? parseInt(form.target_plan_id) : null,
      target_company_id: form.target_company_id ? parseInt(form.target_company_id) : null,
      action_url: form.action_url || null,
      action_label: form.action_label || null,
    });
    if (error) {
      toast.error('Failed to send broadcast');
    } else {
      setBroadcasts(prev => [data, ...prev]);
      toast.success('Broadcast sent successfully!');
      setShowCompose(false);
      setForm(EMPTY_FORM);
    }
    setSending(false);
  };

  const handleDelete = async (id) => {
    await founderService.deleteBroadcast(id);
    setBroadcasts(prev => prev.filter(b => b.id !== id));
    setDeleteConfirm(null);
    toast.success('Broadcast deleted');
  };

  const typeConfig = TYPES.reduce((acc, t) => { acc[t.value] = t; return acc; }, {});

  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Broadcast Notifications</h1>
            <p className="fp-subtitle">Send announcements to all or specific subscriber groups</p>
          </div>
          <div className="fp-actions">
            <button className="fp-btn fp-btn-primary" onClick={() => { setForm(EMPTY_FORM); setShowCompose(true); }}>
              <FiSend size={14} /> Compose Broadcast
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="fp-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="fp-stat">
          <div className="fp-stat-value">{broadcasts.length}</div>
          <div className="fp-stat-label">Total Broadcasts</div>
        </div>
        <div className="fp-stat">
          <div className="fp-stat-value">{broadcasts.filter(b => b.type === 'promo').length}</div>
          <div className="fp-stat-label">Promo Broadcasts</div>
        </div>
        <div className="fp-stat">
          <div className="fp-stat-value">{broadcasts.filter(b => b.target === 'all').length}</div>
          <div className="fp-stat-label">Sent to All Subscribers</div>
        </div>
      </div>

      {/* Broadcast history */}
      <div className="fp-card">
        <div className="fp-card-header">
          <span className="fp-card-title">Broadcast History</span>
          <span className="fp-card-badge">{broadcasts.length} sent</span>
        </div>

        {broadcasts.length === 0 ? (
          <div className="fp-empty">
            <div className="fp-empty-icon"><FiBell /></div>
            <div className="fp-empty-title">No broadcasts sent yet</div>
            <div className="fp-empty-desc">Compose your first broadcast notification</div>
          </div>
        ) : (
          <div>
            {broadcasts.map((b, i) => {
              const tCfg = typeConfig[b.type] || typeConfig.info;
              return (
                <div
                  key={b.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: i < broadcasts.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  onClick={() => setPreview(b)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: `${tCfg.color}18`, color: tCfg.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>
                      {tCfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{b.title}</div>
                        <BroadcastTypeBadge type={b.type} />
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {b.target === 'all' ? 'All subscribers' : 'Specific target'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                        {b.message}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>
                        {formatDateTime(b.sent_at)}
                      </div>
                    </div>
                    <button
                      className="fp-btn fp-btn-danger fp-btn-sm"
                      style={{ flexShrink: 0 }}
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(b); }}
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fp-modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="fp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="fp-modal-header">
              <div className="fp-modal-title">Compose Broadcast</div>
              <button className="fp-modal-close" onClick={() => setShowCompose(false)}><FiX /></button>
            </div>
            <div className="fp-modal-body">
              <div className="fp-form-group">
                <label className="fp-label">Notification Type</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      className="fp-btn fp-btn-sm"
                      style={{
                        border: `1.5px solid ${form.type === t.value ? t.color : 'var(--border)'}`,
                        background: form.type === t.value ? `${t.color}14` : 'none',
                        color: form.type === t.value ? t.color : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                      onClick={() => setForm(f => ({ ...f, type: t.value }))}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fp-form-group">
                <label className="fp-label">Target Audience</label>
                <select className="fp-select" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
                  {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="fp-form-group">
                <label className="fp-label">Title *</label>
                <input className="fp-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title" maxLength={200} />
              </div>

              <div className="fp-form-group">
                <label className="fp-label">Message *</label>
                <textarea
                  className="fp-textarea"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Write your broadcast message here..."
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="fp-form-grid">
                <div className="fp-form-group">
                  <label className="fp-label">Action URL (optional)</label>
                  <input className="fp-input" value={form.action_url} onChange={e => setForm(f => ({ ...f, action_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="fp-form-group">
                  <label className="fp-label">Action Button Label</label>
                  <input className="fp-input" value={form.action_label} onChange={e => setForm(f => ({ ...f, action_label: e.target.value }))} placeholder="e.g. Learn More" />
                </div>
              </div>

              {/* Preview */}
              {(form.title || form.message) && (
                <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preview</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${typeConfig[form.type]?.color || '#3B82F6'}18`, color: typeConfig[form.type]?.color || '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {TYPES.find(t => t.value === form.type)?.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{form.title || 'Notification Title'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{form.message || 'Message goes here...'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="fp-modal-footer">
              <button className="fp-btn fp-btn-secondary" onClick={() => setShowCompose(false)}>Cancel</button>
              <button className="fp-btn fp-btn-primary" onClick={handleSend} disabled={sending || !form.title || !form.message}>
                <FiSend size={13} />
                {sending ? 'Sending...' : 'Send Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fp-modal-overlay" onClick={() => setPreview(null)}>
          <div className="fp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="fp-modal-header">
              <div className="fp-modal-title">Broadcast Detail</div>
              <button className="fp-modal-close" onClick={() => setPreview(null)}><FiX /></button>
            </div>
            <div className="fp-modal-body">
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <BroadcastTypeBadge type={preview.type} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {preview.target === 'all' ? 'All subscribers' : 'Specific target'} · {formatDateTime(preview.sent_at)}
                </span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{preview.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{preview.message}</div>
              {preview.action_url && (
                <a href={preview.action_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 16, color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>
                  {preview.action_label || 'View Link'}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fp-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="fp-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="fp-modal-header">
              <div className="fp-modal-title">Delete Broadcast</div>
              <button className="fp-modal-close" onClick={() => setDeleteConfirm(null)}><FiX /></button>
            </div>
            <div className="fp-modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                Delete broadcast <strong style={{ color: 'var(--text)' }}>"{deleteConfirm.title}"</strong>? This cannot be undone.
              </p>
            </div>
            <div className="fp-modal-footer">
              <button className="fp-btn fp-btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="fp-btn fp-btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
