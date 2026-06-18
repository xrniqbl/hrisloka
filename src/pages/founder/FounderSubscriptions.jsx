import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiChevronRight } from 'react-icons/fi';
import * as founderService from '../../services/founderService';
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

export default function FounderSubscriptions() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  if (loading) return <SkeletonPage cols={5} rows={4} hasStats={false} />;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      const { data, error } = await founderService.getAllPlans();
      if (error) throw error;
      setPlans((data || []).map(p => ({ ...p, features: typeof p.features === "string" ? JSON.parse(p.features) : p.features || [] })));
    } catch (err) {
      console.error("[FounderSubscriptions] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_PLAN);
    setShowModal(true);
  };

  const openEdit = (plan) => {
    setEditing(plan);
    setForm({ ...plan, features: plan.features || [] });
    setShowModal(true);
  };

  const handleFeatureChange = (i, val) => {
    const arr = [...(form.features || [])];
    arr[i] = val;
    setForm(f => ({ ...f, features: arr }));
  };

  const addFeature = () => setForm(f => ({ ...f, features: [...(f.features || []), ''] }));
  const removeFeature = (i) => setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.name || !form.slug) return;
    setSaving(true);
    if (editing) {
      const { data } = await founderService.updatePlan(editing.id, form);
      if (data) setPlans(prev => prev.map(p => p.id === editing.id ? { ...data, features: form.features } : p));
    } else {
      const { data } = await founderService.createPlan(form);
      if (data) setPlans(prev => [...prev, { ...data, features: form.features }]);
    }
    setSaving(false);
    setShowModal(false);
  };

  const handleToggle = async (plan) => {
    const { data } = await founderService.updatePlan(plan.id, { is_active: !plan.is_active });
    if (data) setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
  };

  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Subscription Plans</h1>
            <p className="fp-subtitle">Manage pricing plans and features</p>
          </div>
          <div className="fp-actions">
            <button className="fp-btn fp-btn-primary" onClick={openCreate}>
              <FiPlus size={14} /> New Plan
            </button>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20, marginBottom: 32 }}>
        {plans.map(plan => (
          <div key={plan.id} className="fp-card" style={{
            opacity: plan.is_active ? 1 : 0.55,
            borderTop: `3px solid ${PLAN_COLORS[plan.slug] || '#94A3B8'}`,
          }}>
            <div className="fp-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{plan.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>/{plan.slug}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="fp-btn fp-btn-secondary fp-btn-sm" onClick={() => openEdit(plan)}>
                    <FiEdit2 size={12} />
                  </button>
                  <button
                    className="fp-btn fp-btn-secondary fp-btn-sm"
                    onClick={() => handleToggle(plan)}
                    title={plan.is_active ? 'Deactivate' : 'Activate'}
                    style={{ color: plan.is_active ? '#DC2626' : '#059669' }}
                  >
                    {plan.is_active ? <FiX size={12} /> : <FiCheck size={12} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: PLAN_COLORS[plan.slug] || '#94A3B8', letterSpacing: '-1px' }}>
                  {plan.price_monthly ? `Rp ${(plan.price_monthly / 1000)}k` : plan.slug === 'enterprise' ? 'Custom' : 'Free'}
                </div>
                {plan.price_monthly > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>/bulan · {plan.price_yearly ? `Rp ${(plan.price_yearly / 1000)}k/tahun` : ''}</div>
                )}
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Up to {plan.max_employees >= 9999 ? 'Unlimited' : plan.max_employees} employees
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(plan.features || []).map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)' }}>
                    <FiCheck size={12} style={{ color: PLAN_COLORS[plan.slug], flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <span className={`fp-badge ${plan.is_active ? 'active' : 'cancelled'}`}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full comparison table */}
      <div className="fp-card">
        <div className="fp-card-header">
          <span className="fp-card-title">Plan Comparison</span>
        </div>
        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Slug</th>
                <th>Monthly Price</th>
                <th>Yearly Price</th>
                <th>Max Employees</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.slug}</td>
                  <td>{formatIDR(p.price_monthly)}</td>
                  <td>{formatIDR(p.price_yearly)}</td>
                  <td>{p.max_employees >= 9999 ? 'Unlimited' : p.max_employees}</td>
                  <td><span className={`fp-badge ${p.is_active ? 'active' : 'cancelled'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="fp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="fp-modal-header">
              <div className="fp-modal-title">{editing ? 'Edit Plan' : 'Create New Plan'}</div>
              <button className="fp-modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <div className="fp-modal-body">
              <div className="fp-form-grid">
                <div className="fp-form-group">
                  <label className="fp-label">Plan Name *</label>
                  <input className="fp-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pro" />
                </div>
                <div className="fp-form-group">
                  <label className="fp-label">Slug *</label>
                  <input className="fp-input" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="e.g. pro" />
                </div>
                <div className="fp-form-group">
                  <label className="fp-label">Monthly Price (IDR)</label>
                  <input className="fp-input" type="number" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="fp-form-group">
                  <label className="fp-label">Yearly Price (IDR)</label>
                  <input className="fp-input" type="number" value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="fp-form-group fp-form-full">
                  <label className="fp-label">Max Employees</label>
                  <input className="fp-input" type="number" value={form.max_employees} onChange={e => setForm(f => ({ ...f, max_employees: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              <div className="fp-form-group">
                <label className="fp-label">Features</label>
                {(form.features || []).map((feat, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      className="fp-input"
                      value={feat}
                      onChange={e => handleFeatureChange(i, e.target.value)}
                      placeholder={`Feature ${i + 1}`}
                    />
                    <button className="fp-btn fp-btn-danger fp-btn-sm" onClick={() => removeFeature(i)}>
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))}
                <button className="fp-btn fp-btn-secondary fp-btn-sm" onClick={addFeature}>
                  <FiPlus size={13} /> Add Feature
                </button>
              </div>
            </div>
            <div className="fp-modal-footer">
              <button className="fp-btn fp-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="fp-btn fp-btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.slug}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
