import { useMemo } from 'react';
import { FiCheckSquare, FiCalendar, FiClock, FiCheckCircle } from 'react-icons/fi';
import CardHeader from './CardHeader';

export default function MyTaskCard({ leaves = [], overtimeRecords = [], reimbursements = [], onApprove, onReject: _onReject, loading }) {
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
        {tasks.length === 0 ? (
          <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--dash-text-muted, #9CA3AF)', fontSize: 13 }}>
            <FiCheckCircle size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
            <div>Tidak ada tugas pending</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Semua pengajuan sudah diproses</div>
          </div>
        ) : tasks.map((task, i) => (
          <div key={task.id || i} className="dash-task-item">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, flexShrink: 0, paddingTop: 2 }}>
              <span className="dash-badge dash-badge-gray" style={{ fontSize: 11 }}>{task.badge}</span>
            </div>
            <div className="dash-task-info">
              <div className="dash-task-title">{task.title}</div>
              <div className="dash-task-datetime">
                {task.type === 'leave' && <FiCalendar size={11} style={{ marginRight: 4 }} />}
                {task.type === 'overtime' && <FiClock size={11} style={{ marginRight: 4 }} />}
                {task.date}{task.time ? ` · ${task.time}` : ''}
              </div>
            </div>
            {onApprove && (
              <button
                type="button"
                className="dash-task-action"
                onClick={(e) => { e.stopPropagation(); onApprove(task.type, task.id); }}
                title="Setujui"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#16A34A' }}
              >
                <FiCheckCircle size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
