import { useState, useEffect } from 'react';
import { FiPlus, FiCopy, FiEdit2, FiTrash2, FiX, FiCheck, FiSearch } from 'react-icons/fi';
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

export default function FounderVouchers() {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  if (loading) return <SkeletonPage cols={6} rows={6} hasStats={false} />;
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchData = async () => {
    try {
      const { data, error } = await founderService.getAllVouchers();
      if (error) throw error;
      setVouchers(data || []);
    } catch (err) {
      console.error('[FounderVouchers] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, code: generateCode() });
    setShowModal(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    setForm({ ...v, max_uses: v.max_uses ?? '', valid_until: v.valid_until || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.discount_value) return;
    setSaving(true);
    const payload = {
      ...form,
      code: form.code.toUpperCase().trim(),
      max_uses: form.max_uses === '' ? null : parseInt(form.max_uses),
      valid_until: form.valid_until || null,
    };
    if (editing) {
      const { data } = await founderService.updateVoucher(editing.id, payload);
      if (data) setVouchers(prev => prev.map(v => v.id === editing.id ? data : v));
    } else {
      const { data, error } = await founderService.createVoucher(payload);
      if (error) {
        toast.error('Gagal membuat voucher: ' + (error.message || 'Duplicate code'));
      } else if (data) {
        setVouchers(prev => [data, ...prev]);
      }
    }
    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await founderService.deleteVoucher(id);
    setVouchers(prev => prev.filter(v => v.id !== id));
    setDeleteConfirm(null);
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Voucher code copied!');
  };

  const filtered = vouchers.filter(v =>
    !search || v.code.toLowerCase().includes(search.toLowerCase()) || (v.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const getVoucherStatus = (v) => {
    if (!v.is_active) return { label: 'Inactive', cls: 'cancelled' };
    if (isExpired(v)) return { label: 'Expired', cls: 'expired' };
    if (isExhausted(v)) return { label: 'Exhausted', cls: 'suspended' };
    return { label: 'Active', cls: 'active' };
  };

  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Voucher Management</h1>
            <p className="fp-subtitle">Create and manage discount voucher codes</p>
          </div>
          <div className="fp-actions">
            <button className="fp-btn fp-btn-primary" onClick={openCreate}>
              <FiPlus size={14} /> Create Voucher
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="fp-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="fp-stat">
          <div className="fp-stat-value">{vouchers.filter(v => v.is_active).length}</div>
          <div className="fp-stat-label">Active Vouchers</div>
        </div>
        <div className="fp-stat">
          <div className="fp-stat-value">{vouchers.reduce((sum, v) => sum + (v.used_count || 0), 0)}</div>
          <div className="fp-stat-label">Total Redemptions</div>
        </div>
        <div className="fp-stat">
          <div className="fp-stat-value">{vouchers.filter(v => isExpired(v) || isExhausted(v)).length}</div>
          <div className="fp-stat-label">Expired / Exhausted</div>
        </div>
      </div>

      <div className="fp-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="fp-search">
            <FiSearch className="fp-search-icon" />
            <input placeholder="Search by code or description..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>{filtered.length} vouchers</span>
        </div>

        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Discount</th>
                <th>Usage</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="fp-empty">
                    <div className="fp-empty-icon"><FiCopy /></div>
                    <div className="fp-empty-title">No vouchers found</div>
                    <div className="fp-empty-desc">Create your first discount voucher</div>
                  </div>
                </td></tr>
              ) : filtered.map(v => {
                const status = getVoucherStatus(v);
                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                          color: 'var(--text)', letterSpacing: '1px',
                          padding: '3px 10px', border: '1px dashed var(--border)',
                          borderRadius: 6,
                        }}>
                          {v.code}
                        </div>
                        <button
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 0 }}
                          onClick={() => handleCopy(v.code)}
                          title="Copy code"
                        >
                          <FiCopy size={13} />
                        </button>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200 }}>
                      {v.description || '—'}
                    </td>
                    <td>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                        {v.discount_type === 'percent' ? `${v.discount_value}%` : `Rp ${v.discount_value?.toLocaleString('id-ID')}`}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v.discount_type}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {v.used_count} / {v.max_uses ?? 'unlimited'}
                      </div>
                      {v.max_uses && (
                        <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', width: 80 }}>
                          <div style={{ height: '100%', background: '#F59E0B', borderRadius: 2, width: `${Math.min(100, (v.used_count / v.max_uses) * 100)}%` }} />
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {v.valid_until ? new Date(v.valid_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No expiry'}
                    </td>
                    <td><span className={`fp-badge ${status.cls}`}>{status.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="fp-btn fp-btn-secondary fp-btn-sm" onClick={() => openEdit(v)}><FiEdit2 size={12} /></button>
                        <button className="fp-btn fp-btn-danger fp-btn-sm" onClick={() => setDeleteConfirm(v)}><FiTrash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="fp-modal" onClick={e => e.stopPropagation()}>
            <div className="fp-modal-header">
              <div className="fp-modal-title">{editing ? 'Edit Voucher' : 'Create Voucher'}</div>
              <button className="fp-modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <div className="fp-modal-body">
              <div className="fp-form-grid">
                <div className="fp-form-group fp-form-full">
                  <label className="fp-label">Voucher Code *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="fp-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') }))} placeholder="e.g. PROMO50" style={{ fontFamily: 'monospace', letterSpacing: '1px', fontWeight: 700 }} />
                    <button className="fp-btn fp-btn-secondary fp-btn-sm" onClick={() => setForm(f => ({ ...f, code: generateCode() }))} style={{ flexShrink: 0 }}>Generate</button>
                  </div>
                </div>
                <div className="fp-form-group fp-form-full">
                  <label className="fp-label">Description</label>
                  <input className="fp-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Launch promo discount" />
                </div>
                <div className="fp-form-group">
                  <label className="fp-label">Discount Type</label>
                  <select className="fp-select" value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (IDR)</option>
                  </select>
                </div>
                <div className="fp-form-group">
                  <label className="fp-label">Discount Value</label>
                  <input className="fp-input" type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: parseInt(e.target.value) || 0 }))} min={0} max={form.discount_type === 'percent' ? 100 : undefined} />
                </div>
                <div className="fp-form-group">
                  <label className="fp-label">Max Uses (leave blank for unlimited)</label>
                  <input className="fp-input" type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Unlimited" min={0} />
                </div>
                <div className="fp-form-group">
                  <label className="fp-label">Valid From</label>
                  <input className="fp-input" type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
                </div>
                <div className="fp-form-group fp-form-full">
                  <label className="fp-label">Valid Until (leave blank for no expiry)</label>
                  <input className="fp-input" type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="fp-modal-footer">
              <button className="fp-btn fp-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="fp-btn fp-btn-primary" onClick={handleSave} disabled={saving || !form.code}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fp-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="fp-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="fp-modal-header">
              <div className="fp-modal-title">Delete Voucher</div>
              <button className="fp-modal-close" onClick={() => setDeleteConfirm(null)}><FiX /></button>
            </div>
            <div className="fp-modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                Are you sure you want to delete voucher <strong style={{ color: 'var(--text)' }}>{deleteConfirm.code}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="fp-modal-footer">
              <button className="fp-btn fp-btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="fp-btn fp-btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Delete Voucher</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
