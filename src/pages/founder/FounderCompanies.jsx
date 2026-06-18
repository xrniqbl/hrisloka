import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiX, FiEdit2, FiToggleLeft, FiToggleRight, FiCopy, FiUsers, FiGlobe } from 'react-icons/fi';
import * as founderService from '../../services/founderService';
import { useToast } from '../../components/Toast';
import './founder.css';

// ── Skeleton helpers ──────────────────────────────────────────────────────────
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
function SkeletonPage({ cols = 5, rows = 6 }) {
  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div><SkeletonBox w={200} h={28} /><SkeletonBox w={300} h={14} style={{ marginTop: 8 }} /></div>
          <SkeletonBox w={120} h={38} style={{ borderRadius: 10 }} />
        </div>
      </div>
      <div className="fp-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        {[1,2,3].map(i => <div key={i} className="fp-stat"><SkeletonBox w="55%" h={28} style={{ marginBottom: 8 }} /><SkeletonBox w="70%" h={12} /></div>)}
      </div>
      <div className="fp-card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
          <SkeletonBox w={260} h={36} style={{ borderRadius: 8 }} />
        </div>
        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead><tr>{Array.from({ length: cols }).map((_, i) => <th key={i}><SkeletonBox w={80} h={12} /></th>)}</tr></thead>
            <tbody>{Array.from({ length: rows }).map((_, i) => <TableRowSkeleton key={i} cols={cols} />)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name) {
  return (name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const EMPTY_FORM = {
  name: '', industry: '', phone: '', website: '', address: '',
  employee_count_limit: 100, plan_id: '', is_active: true,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function FounderCompanies() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [newCompanyCode, setNewCompanyCode] = useState(null);

  const fetchData = async () => {
    try {
      const [{ data: companiesData }, { data: planData }] = await Promise.all([
        founderService.getCompaniesWithStats(),
        founderService.getAllPlans(),
      ]);
      setCompanies(companiesData || []);
      setPlans(planData || []);
    } catch (err) {
      console.error('[FounderCompanies] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <SkeletonPage cols={7} rows={6} />;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNewCompanyCode(null);
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name, industry: c.industry || '', phone: c.phone || '',
      website: c.website || '', address: c.address || '',
      employee_count_limit: c.employee_count_limit || 100,
      plan_id: c.subscription?.plan_id || '',
      is_active: c.is_active,
    });
    setNewCompanyCode(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editing) {
        const { supabase } = await import('../../lib/supabase');
        const { data } = await supabase.from('companies').update({
          name: form.name, industry: form.industry, phone: form.phone,
          website: form.website, address: form.address,
          employee_count_limit: form.employee_count_limit, is_active: form.is_active,
        }).eq('id', editing.id).select().single();
        if (data) {
          setCompanies(prev => prev.map(c => c.id === editing.id ? { ...c, ...data } : c));
          toast.success('Company updated!');
          setShowModal(false);
        }
      } else {
        const { data, error } = await founderService.createCompanyWithPlan({
          name: form.name, industry: form.industry, phone: form.phone,
          website: form.website, address: form.address,
          employee_count_limit: parseInt(form.employee_count_limit) || 100,
          is_active: true,
          plan_id: form.plan_id ? parseInt(form.plan_id) : null,
        });
        if (error) {
          toast.error('Gagal membuat perusahaan');
        } else if (data) {
          setNewCompanyCode(data.company_code);
          setCompanies(prev => [{ ...data, employee_count: 0, subscription: null }, ...prev]);
          toast.success('Company created!');
        }
      }
    } catch (err) {
      toast.error('Terjadi kesalahan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (company) => {
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data } = await supabase.from('companies').update({ is_active: !company.is_active }).eq('id', company.id).select().single();
      if (data) setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, is_active: !company.is_active } : c));
    } catch (err) {
      toast.error('Gagal mengubah status');
    }
  };

  const filtered = companies.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.company_code?.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Company Management</h1>
            <p className="fp-subtitle">Register and manage all tenant companies</p>
          </div>
          <div className="fp-actions">
            <button className="fp-btn fp-btn-primary" onClick={openCreate}>
              <FiPlus size={14} /> Add Company
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats — data real dari Supabase */}
      <div className="fp-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="fp-stat">
          <div className="fp-stat-value">{companies.length}</div>
          <div className="fp-stat-label">Total Companies</div>
        </div>
        <div className="fp-stat">
          <div className="fp-stat-value">{companies.filter(c => c.is_active).length}</div>
          <div className="fp-stat-label">Active</div>
        </div>
        <div className="fp-stat">
          <div className="fp-stat-value">{companies.reduce((sum, c) => sum + (c.employee_count || 0), 0)}</div>
          <div className="fp-stat-label">Total Employees Managed</div>
        </div>
      </div>

      <div className="fp-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="fp-search">
            <FiSearch className="fp-search-icon" />
            <input placeholder="Search by name, code, or industry..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>{filtered.length} companies</span>
        </div>

        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Company Code</th>
                <th>Industry</th>
                <th>Plan</th>
                <th>Employees</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="fp-empty">
                    <div className="fp-empty-icon"><FiGlobe /></div>
                    <div className="fp-empty-title">Belum ada perusahaan</div>
                    <div className="fp-empty-desc">Tambahkan tenant perusahaan pertama Anda</div>
                  </div>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="fp-entity-cell">
                      <div className="fp-entity-avatar">{getInitials(c.name)}</div>
                      <div>
                        <div className="fp-entity-name">{c.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <code style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{c.company_code}</code>
                      <button
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}
                        onClick={() => { navigator.clipboard.writeText(c.company_code); toast.success('Code copied!'); }}
                      >
                        <FiCopy size={12} />
                      </button>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.industry || '—'}</td>
                  <td>
                    {c.subscription
                      ? <span className={`fp-badge ${c.subscription.subscription_plans?.slug || 'free'}`}>{c.subscription.subscription_plans?.name || 'Free'}</span>
                      : <span className="fp-badge free">Free</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
                      <FiUsers size={12} style={{ color: 'var(--text-secondary)' }} />
                      {c.employee_count}
                    </div>
                  </td>
                  <td><span className={`fp-badge ${c.is_active ? 'active' : 'cancelled'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="fp-btn fp-btn-secondary fp-btn-sm" onClick={() => openEdit(c)}>
                        <FiEdit2 size={12} />
                      </button>
                      <button
                        className="fp-btn fp-btn-secondary fp-btn-sm"
                        onClick={() => handleToggleActive(c)}
                        style={{ color: c.is_active ? '#DC2626' : '#059669' }}
                        title={c.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {c.is_active ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fp-modal-overlay" onClick={() => !newCompanyCode && setShowModal(false)}>
          <div className="fp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="fp-modal-header">
              <div className="fp-modal-title">{editing ? 'Edit Company' : 'Register New Company'}</div>
              <button className="fp-modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <div className="fp-modal-body">
              {newCompanyCode ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#059669', fontSize: 22 }}>
                    <FiGlobe />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Company Created!</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Bagikan kode unik ini agar karyawan bisa mendaftar:</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 800, letterSpacing: '2px', color: 'var(--text)', padding: '12px 24px', border: '2px dashed var(--border)', borderRadius: 12 }}>
                      {newCompanyCode}
                    </div>
                    <button className="fp-btn fp-btn-secondary fp-btn-sm" onClick={() => { navigator.clipboard.writeText(newCompanyCode); toast.success('Copied!'); }}>
                      <FiCopy size={13} /> Copy
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="fp-form-grid">
                    <div className="fp-form-group fp-form-full">
                      <label className="fp-label">Company Name *</label>
                      <input className="fp-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. PT Maju Bersama" />
                    </div>
                    <div className="fp-form-group">
                      <label className="fp-label">Industry</label>
                      <input className="fp-input" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g. Teknologi" />
                    </div>
                    <div className="fp-form-group">
                      <label className="fp-label">Phone</label>
                      <input className="fp-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(021) 555-0123" />
                    </div>
                    <div className="fp-form-group">
                      <label className="fp-label">Website</label>
                      <input className="fp-input" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" />
                    </div>
                    <div className="fp-form-group">
                      <label className="fp-label">Max Employees</label>
                      <input className="fp-input" type="number" value={form.employee_count_limit} onChange={e => setForm(f => ({ ...f, employee_count_limit: e.target.value }))} />
                    </div>
                    {!editing && plans.length > 0 && (
                      <div className="fp-form-group fp-form-full">
                        <label className="fp-label">Initial Plan</label>
                        <select className="fp-select" value={form.plan_id} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}>
                          <option value="">No plan (Free)</option>
                          {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {p.price_monthly ? `Rp ${p.price_monthly.toLocaleString('id-ID')}/bln` : 'Free'}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="fp-form-group fp-form-full">
                      <label className="fp-label">Address</label>
                      <textarea className="fp-textarea" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Company address" rows={2} />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="fp-modal-footer">
              {newCompanyCode ? (
                <button className="fp-btn fp-btn-primary" onClick={() => setShowModal(false)}>Done</button>
              ) : (
                <>
                  <button className="fp-btn fp-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="fp-btn fp-btn-primary" onClick={handleSave} disabled={saving || !form.name}>
                    {saving ? 'Processing...' : editing ? 'Save Changes' : 'Create Company'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
