import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFolder, FiChevronRight, FiUsers } from 'react-icons/fi';
import CardHeader from './CardHeader';

export default function RunningProjectCard({ projects = [], loading }) {
  const navigate = useNavigate();

  const items = useMemo(() => {
    const active = projects.filter(p => {
      const s = (p.status || '').toLowerCase();
      return !s || s === 'active' || s === 'in_progress' || s === 'ongoing';
    });
    const source = active.length > 0 ? active : projects;
    return source.slice(0, 3).map(p => {
      const start = p.start_date || p.startDate;
      const end = p.end_date || p.endDate;
      let progress = p.progress;
      if (progress == null && start && end) {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const now = Date.now();
        if (e > s) progress = Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)));
        else progress = 0;
      }
      if (progress == null) progress = 0;
      return {
        id: p.id,
        name: p.name || p.title || 'Untitled Project',
        status: p.status || 'active',
        progress,
        client: p.client || p.lead || null,
        tags: p.tags || (p.priority ? [p.priority] : []),
      };
    });
  }, [projects]);

  if (loading) {
    return (
      <div className="dash-card dash-skeleton-card">
        <div className="dash-skeleton" style={{ width: 160, height: 14, marginBottom: 16 }} />
        <div className="dash-skeleton" style={{ width: 80, height: 24, marginBottom: 12 }} />
        <div className="dash-skeleton" style={{ width: '100%', height: 16, marginBottom: 8 }} />
        <div className="dash-skeleton" style={{ width: '70%', height: 6 }} />
      </div>
    );
  }

  const statusColor = (s) => {
    const v = (s || '').toLowerCase();
    if (v === 'in_progress' || v === 'active' || v === 'ongoing') return '#8B5CF6';
    if (v === 'completed' || v === 'done') return '#10B981';
    return '#F59E0B';
  };
  const statusLabel = (s) => {
    const v = (s || '').toLowerCase();
    if (v === 'in_progress' || v === 'active' || v === 'ongoing') return 'In Progress';
    if (v === 'completed' || v === 'done') return 'Selesai';
    return (s || 'active').replace(/_/g, ' ');
  };

  return (
    <div className="dash-card">
      <CardHeader
        icon={<FiFolder size={18} />}
        title="Running Project"
        badge={`${items.length} Active`}
        badgeColor="purple"
      />
      <div className="dash-project">
        {items.length === 0 ? (
          <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--dash-text-muted, #9CA3AF)', fontSize: 13 }}>
            Belum ada project aktif
            <button
              type="button"
              onClick={() => navigate('/projects')}
              style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 'none', color: '#8B5CF6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Kelola project <FiChevronRight style={{ verticalAlign: 'middle' }} />
            </button>
          </div>
        ) : items.map((p, i) => (
          <div
            key={p.id || i}
            className="dash-project-item dash-kpi-clickable"
            onClick={() => navigate('/projects')}
            style={{ cursor: 'pointer', borderRadius: 10, padding: '10px 8px', margin: '0 -8px', transition: 'background 0.15s' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.name}</div>
                {p.client && (
                  <div style={{ fontSize: 11, color: 'var(--dash-text-muted, #9CA3AF)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiUsers size={11} /> {p.client}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: `${statusColor(p.status)}18`, color: statusColor(p.status),
              }}>
                {statusLabel(p.status)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--border, #E5E7EB)', overflow: 'hidden' }}>
                <div style={{ width: `${p.progress}%`, height: '100%', background: statusColor(p.status), borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--dash-text-muted, #6B7280)', minWidth: 32 }}>{p.progress}%</span>
            </div>
            {p.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                {p.tags.slice(0, 3).map((tag, ti) => (
                  <span key={ti} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg, #F3F4F6)', color: 'var(--muted, #6B7280)' }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
