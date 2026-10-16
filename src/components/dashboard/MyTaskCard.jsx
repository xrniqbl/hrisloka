import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import { ListTodo, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import CardHeader from './CardHeader';
import DashEmpty from './DashEmpty';

export default function MyTaskCard({
  leaves = [],
  overtimeRecords = [],
  reimbursements = [],
  onApprove,
  onReject: _onReject,
  loading,
}) {
  const navigate = useNavigate();
  const tasks = useMemo(() => {
    const items = [];

    leaves
      .filter((l) => l.status === 'pending')
      .slice(0, 3)
      .forEach((l) => {
        items.push({
          id: l.id,
          type: 'leave',
          title: `${l.employees?.name || 'Employee'} — ${l.type || 'Leave'} Request`,
          date: l.start_date
            ? new Date(l.start_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : '—',
          time: l.reason || '',
          badge: 'Todo',
        });
      });

    overtimeRecords
      .filter((o) => o.status === 'pending')
      .slice(0, 2)
      .forEach((o) => {
        items.push({
          id: o.id,
          type: 'overtime',
          title: `${o.employees?.name || 'Employee'} — Overtime Request`,
          date: o.date
            ? new Date(o.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : '—',
          time: o.hours ? `${o.hours} hours` : '',
          badge: 'Todo',
        });
      });

    reimbursements
      .filter((r) => r.status === 'pending')
      .slice(0, 2)
      .forEach((r) => {
        items.push({
          id: r.id,
          type: 'reimbursement',
          title: `${r.employees?.name || 'Employee'} — Reimbursement`,
          date: r.created_at
            ? new Date(r.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : '—',
          time: r.amount ? `Rp ${Number(r.amount).toLocaleString('id-ID')}` : '',
          badge: 'Todo',
        });
      });

    return items.slice(0, 5);
  }, [leaves, overtimeRecords, reimbursements]);

  if (loading) {
    return (
      <div className="dash-card dash-skeleton-card">
        <div className="dash-skeleton" style={{ width: 80, height: 14, marginBottom: 16 }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div className="dash-skeleton" style={{ width: 60, height: 18, marginBottom: 6 }} />
            <div className="dash-skeleton" style={{ width: '100%', height: 14, marginBottom: 4 }} />
            <div className="dash-skeleton" style={{ width: '40%', height: 12 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dash-card">
      <CardHeader
        icon={<Icon icon={ListTodo} size="sm" color="inherit" />}
        title="My Task"
      />

      <div className="dash-task">
        {tasks.length === 0 ? (
          <DashEmpty
            icon={<Icon icon={CheckCircle2} size="md" color="inherit" />}
            title="Tidak ada tugas pending"
            description="Semua pengajuan sudah diproses."
            ctaLabel="Pusat persetujuan"
            onCta={() => navigate('/approvals')}
          />
        ) : (
          tasks.map((task, i) => (
            <div key={task.id || i} className="dash-task-item dash-task-item--card">
              <div className="dash-task-main">
                <span className="dash-badge dash-badge-todo">{task.badge}</span>
                <div className="dash-task-title">{task.title}</div>
                <div className="dash-task-datetime">
                  {task.type === 'leave' && (
                    <Icon icon={Calendar} size="sm" color="inherit" />
                  )}
                  {task.type === 'overtime' && (
                    <Icon icon={Clock} size="sm" color="inherit" />
                  )}
                  <span>
                    {task.date}
                    {task.time ? ` · ${task.time}` : ''}
                  </span>
                </div>
              </div>
              {onApprove && (
                <button
                  type="button"
                  className="dash-task-action dash-task-action--complete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(task.type, task.id);
                  }}
                  title="Setujui / tandai selesai"
                >
                  <Icon icon={CheckCircle2} size="sm" color="inherit" />
                  <span>Mark as completed</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
