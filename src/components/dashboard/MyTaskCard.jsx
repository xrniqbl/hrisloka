import { useMemo } from 'react';
import { FiCheckSquare, FiCalendar, FiClock, FiCheckCircle } from 'react-icons/fi';
import CardHeader from './CardHeader';

export default function MyTaskCard({ leaves = [], overtimeRecords = [], reimbursements = [], onApprove, onReject, loading }) {
  const tasks = useMemo(() => {
    const items = [];

    leaves.filter(l => l.status === 'pending').slice(0, 3).forEach(l => {
      items.push({
        id: l.id,
        type: 'leave',
        title: `${l.employees?.name || 'Employee'} — ${l.type || 'Leave'} Request`,
        date: l.start_date ? new Date(l.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        time: l.reason || '',
        badge: 'Todo',
      });
    });

    overtimeRecords.filter(o => o.status === 'pending').slice(0, 2).forEach(o => {
      items.push({
        id: o.id,
        type: 'overtime',
        title: `${o.employees?.name || 'Employee'} — Overtime Request`,
        date: o.date ? new Date(o.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        time: o.hours ? `${o.hours} hours` : '',
        badge: 'Todo',
      });
    });

    reimbursements.filter(r => r.status === 'pending').slice(0, 2).forEach(r => {
      items.push({
        id: r.id,
        type: 'reimbursement',
        title: `${r.employees?.name || 'Employee'} — Reimbursement`,
        date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        time: r.amount ? `Rp ${Number(r.amount).toLocaleString('id-ID')}` : '',
        badge: 'Todo',
      });
    });

    if (items.length === 0) {
      return [
        { id: 'demo-1', type: 'leave', title: 'Interview with candidates', date: '12 Mar', time: '09:30 PM', badge: 'Todo' },
        { id: 'demo-2', type: 'leave', title: 'Interview with candidates', date: '12 Mar', time: '09:30 PM', badge: 'Todo' },
        { id: 'demo-3', type: 'leave', title: 'Interview with candidates', date: '12 Mar', time: '09:30 PM', badge: 'Todo' },
      ];
    }

    return items.slice(0, 5);
  }, [leaves, overtimeRecords, reimbursements]);

  if (loading) {
    return (
      <div className="dash-card dash-skeleton-card">
        <div className="dash-skeleton" style={{ width: 80, height: 14, marginBottom: 16 }} />
        {[1, 2, 3].map(i => (
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
      <CardHeader icon={<FiCheckSquare size={18} />} title="My Task" />

      <div className="dash-task">
        {tasks.map((task, i) => (
          <div key={task.id || i} className="dash-task-item">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, flexShrink: 0, paddingTop: 2 }}>
              <span className="dash-badge dash-badge-gray" style={{ fontSize: 11 }}>{task.badge}</span>
            </div>
            <div className="dash-task-info">
              <div className="dash-task-title">{task.title}</div>
              <div className="dash-task-datetime">
                <FiCalendar size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                {task.date}
                {task.time && (
                  <>
                    <FiClock size={11} style={{ verticalAlign: 'middle', marginLeft: 6, marginRight: 3 }} />
                    {task.time}
                  </>
                )}
              </div>
            </div>
            <button
              className="dash-task-action"
              onClick={() => {
                if (task.id && !String(task.id).startsWith('demo') && onApprove) {
                  onApprove(task.type, task.id);
                }
              }}
            >
              <FiCheckCircle size={12} />
              Mark as completed
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
