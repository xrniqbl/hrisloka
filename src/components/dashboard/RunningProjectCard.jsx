import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import { FolderKanban, Users } from 'lucide-react';
import CardHeader from './CardHeader';
import DashEmpty from './DashEmpty';

export default function RunningProjectCard({ projects = [], loading }) {
  const navigate = useNavigate();

  const items = useMemo(() => {
    const active = projects.filter((p) => {
      const s = (p.status || '').toLowerCase();
      return !s || s === 'active' || s === 'in_progress' || s === 'ongoing';
    });
    const source = active.length > 0 ? active : projects;
    return source.slice(0, 2).map((p) => {
      const start = p.start_date || p.startDate;
      const end = p.end_date || p.endDate;
      let progress = p.progress;
      if (progress == null) progress = 0;
      const completed = p.tasks_completed ?? p.completed_tasks;
      const totalTasks = p.tasks_total ?? p.total_tasks;
      return {
        id: p.id,
        name: p.name || p.title || 'Untitled Project',
        status: p.status || 'active',
        progress,
        client: p.client || p.lead || p.manager_name || null,
        pm: p.project_manager || p.manager_name || p.owner || null,
        timeline:
          start && end
            ? `${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${new Date(end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
            : null,
        taskLabel:
          completed != null && totalTasks != null ? `${completed}/${totalTasks}` : null,
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

  const statusLabel = (s) => {
    const v = (s || '').toLowerCase();
    if (v === 'in_progress' || v === 'active' || v === 'ongoing') return 'In Progress';
    if (v === 'completed' || v === 'done') return 'Selesai';
    return (s || 'active').replace(/_/g, ' ');
  };

  return (
    <div className="dash-card">
      <CardHeader
        icon={<Icon icon={FolderKanban} size="sm" color="inherit" />}
        title="Running Project"
      />
      <div className="dash-project">
        {items.length === 0 ? (
          <DashEmpty
            icon={<Icon icon={FolderKanban} size="md" color="inherit" />}
            title="Belum ada project aktif"
            description="Buat project untuk assign tim dan pantau progress."
            ctaLabel="Kelola project"
            onCta={() => navigate('/projects')}
          />
        ) : (
          items.map((p, i) => (
            <div
              key={p.id || i}
              className="dash-project-item dash-kpi-clickable"
              onClick={() => navigate('/projects')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/projects')}
            >
              <span className="dash-badge dash-badge-amber">{statusLabel(p.status)}</span>
              <div className="dash-project-name">{p.name}</div>

              {p.taskLabel && (
                <div className="dash-project-meta-row">
                  <span className="dash-project-meta-label">Task Completed</span>
                  <span className="dash-project-meta-value">{p.taskLabel}</span>
                </div>
              )}

              {p.client && (
                <div className="dash-project-meta-row">
                  <span className="dash-project-meta-label">Lead</span>
                  <span className="dash-project-lead">
                    <span className="dash-project-lead-avatar" style={{ background: '#5654D4' }}>
                      {String(p.client)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    {p.client}
                  </span>
                </div>
              )}

              {(p.pm || p.timeline) && (
                <div className="dash-project-footer-row">
                  {p.pm && (
                    <div>
                      <div className="dash-project-meta-label">Project Manager</div>
                      <div className="dash-project-meta-value">{p.pm}</div>
                    </div>
                  )}
                  {p.timeline && (
                    <div>
                      <div className="dash-project-meta-label">Timeline</div>
                      <div className="dash-project-meta-value">{p.timeline}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="dash-project-progress-row">
                <div className="dash-progress-bar">
                  <div className="dash-progress-fill" style={{ width: `${p.progress}%` }} />
                </div>
                <span className="dash-project-progress-value">{p.progress}%</span>
              </div>

              {p.tags?.length > 0 && (
                <div className="dash-project-tags">
                  {p.tags.slice(0, 4).map((tag, ti) => (
                    <span key={ti} className="dash-project-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {!p.client && !p.pm && (
                <div className="dash-project-meta-row" style={{ marginTop: 4 }}>
                  <span className="dash-project-meta-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon icon={Users} size="sm" color="inherit" />
                    Open project details
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
