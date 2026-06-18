import { useState, useEffect } from 'react';
import { FiSearch, FiPlus, FiMoreVertical, FiX, FiCheck, FiRefreshCw, FiCalendar, FiUsers } from 'react-icons/fi';
import * as founderService from '../../services/founderService';
import { getAllCompanies } from '../../services/companyService';
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

export default function FounderSubscribers() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  if (loading) return <SkeletonPage cols={6} rows={8} hasStats={false} />;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);

  const fetchData = async () => {
    try {
      const { data, error } = await founderService.getAllSubscriptions();
      if (error) throw error;
      setSubs(data || []);
    } catch (err) {
      console.error("[FounderSubscribers] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = subs.filter(s => {
    const name = s.companies?.name?.toLowerCase() || '';
    const code = s.companies?.company_code?.toLowerCase() || '';
    const q = search.toLowerCase();
    const matchSearch = !search || name.includes(q) || code.includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchPlan = planFilter === 'all' || s.subscription_plans?.name === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  const getInitials = (name) =>
    (name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Subscribers</h1>
            <p className="fp-subtitle">{subs.length} companies registered on the platform</p>
          </div>
        </div>
      </div>

      <div className="fp-card">
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="fp-search">
            <FiSearch className="fp-search-icon" />
            <input
              placeholder="Search by company name or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="fp-select"
            style={{ width: 'auto', flexShrink: 0 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            className="fp-select"
            style={{ width: 'auto', flexShrink: 0 }}
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
          >
            {PLAN_OPTIONS.map(p => (
              <option key={p} value={p}>{p === 'all' ? 'All Plans' : p}</option>
            ))}
          </select>
          {(search || statusFilter !== 'all' || planFilter !== 'all') && (
            <button
              className="fp-btn fp-btn-secondary fp-btn-sm"
              onClick={() => { setSearch(''); setStatusFilter('all'); setPlanFilter('all'); }}
            >
              <FiX size={12} /> Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {filtered.length} results
          </span>
        </div>

        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Billing</th>
                <th>Start Date</th>
                <th>Next Renewal</th>
                <th>Employees</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="fp-empty">
                      <div className="fp-empty-icon"><FiUsers /></div>
                      <div className="fp-empty-title">No subscribers found</div>
                      <div className="fp-empty-desc">Try adjusting your search or filters</div>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(sub => (
                <tr key={sub.id}>
                  <td>
                    <div className="fp-entity-cell">
                      <div className="fp-entity-avatar">
                        {sub.companies?.logo_url
                          ? <img src={sub.companies.logo_url} alt="" />
                          : getInitials(sub.companies?.name)}
                      </div>
                      <div>
                        <div className="fp-entity-name">{sub.companies?.name || '—'}</div>
                        <div className="fp-entity-sub">{sub.companies?.company_code}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <PlanBadge slug={sub.subscription_plans?.slug || 'free'} name={sub.subscription_plans?.name || 'Free'} />
                  </td>
                  <td><StatusBadge status={sub.status} /></td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{formatIDR(sub.amount)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>/{sub.billing_cycle}</div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(sub.start_date)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(sub.end_date)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
                      <FiUsers size={12} style={{ color: 'var(--text-secondary)' }} />
                      {sub.employee_count ?? '—'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="fp-btn fp-btn-secondary fp-btn-sm"
                        onClick={() => setSelected(sub)}
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fp-modal-overlay" onClick={() => setSelected(null)}>
          <div className="fp-modal" onClick={e => e.stopPropagation()}>
            <div className="fp-modal-header">
              <div className="fp-modal-title">Subscriber Detail</div>
              <button className="fp-modal-close" onClick={() => setSelected(null)}><FiX /></button>
            </div>
            <div className="fp-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div className="fp-entity-avatar" style={{ width: 52, height: 52, borderRadius: 12, fontSize: 16 }}>
                  {getInitials(selected.companies?.name)}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{selected.companies?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{selected.companies?.company_code}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                {[
                  { label: 'Plan', value: selected.subscription_plans?.name || 'Free' },
                  { label: 'Billing Cycle', value: selected.billing_cycle || '—' },
                  { label: 'Amount', value: formatIDR(selected.amount) },
                  { label: 'Employees', value: selected.employee_count ?? '—' },
                  { label: 'Start Date', value: formatDate(selected.start_date) },
                  { label: 'End Date', value: formatDate(selected.end_date) },
                ].map(item => (
                  <div key={item.label} style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="fp-modal-footer">
              <button className="fp-btn fp-btn-danger fp-btn-sm">Cancel Subscription</button>
              <button className="fp-btn fp-btn-primary fp-btn-sm">Extend Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
