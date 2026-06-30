import { useMemo } from 'react';
import { FiFolder } from 'react-icons/fi';
import CardHeader from './CardHeader';

export default function RunningProjectCard({ trainings = [], loading }) {
  const projects = useMemo(() => {
    if (trainings.length > 0) {
      return trainings.slice(0, 3).map(t => ({
        name: t.title || t.name || 'Untitled Project',
        status: t.status || 'in_progress',
        progress: t.completion || Math.floor(Math.random() * 80 + 10),
        totalTasks: t.total_tasks || 12,
        completedTasks: t.completed_tasks || Math.floor(Math.random() * 10 + 1),
        lead: t.trainer || t.lead || 'Team Lead',
        tags: t.tags || t.category ? [t.category || 'Internal'] : ['Internal'],
      }));
    }
    return [
      { name: 'Hiring for B2B Company', status: 'in_progress', progress: 33, totalTasks: 12, completedTasks: 4, lead: 'Rizqi Afdhal', tags: ['Internal', 'UI KIT', 'Branding', 'Marketing'] },
    ];
  }, [trainings]);

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

  return (
    <div className="dash-card">
      <CardHeader
        icon={<FiFolder size={18} />}
        title="Running Project"
        badge={`${projects.length} Active`}
        badgeColor="purple"
      />

      <div className="dash-project">
        {projects.map((p, i) => (
          <div key={i} className="dash-project-item">
            <div className="dash-project-status-row">
              <span className="dash-badge dash-badge-purple" style={{ textTransform: 'capitalize' }}>
                {p.status === 'in_progress' ? 'In Progress' : p.status.replace('_', ' ')}
              </span>
            </div>
            <div className="dash-project-name">{p.name}</div>
            <div className="dash-project-progress-row">
              <span className="dash-project-progress-label">Task Completed</span>
              <span className="dash-project-progress-value">{p.completedTasks}/{p.totalTasks}</span>
            </div>
            <div className="dash-progress-bar">
              <div className="dash-progress-fill" style={{ width: `${p.progress}%` }} />
            </div>
            <div className="dash-project-meta">
              <div className="dash-project-lead">
                <span className="dash-project-lead-avatar" style={{ background: '#5654D4' }}>
                  {(p.lead || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
                {p.lead}
              </div>
            </div>
            {p.tags && p.tags.length > 0 && (
              <div className="dash-project-tags">
                {p.tags.map((tag, j) => (
                  <span key={j} className="dash-project-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
