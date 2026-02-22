import { useState, useEffect } from 'react';
import { FiPlus, FiEye, FiX, FiAlertCircle, FiClock, FiCheckCircle, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import * as ticketService from '../services/ticketService';
import * as employeeService from '../services/employeeService';
import '../styles/shared.css';

const priorityColors = { low: '#6D8196', medium: '#F59E0B', high: '#DC2626', critical: '#7C2D12' };
const statusColors = { open: '#0047AB', 'in-progress': '#F59E0B', resolved: '#16A34A' };
const statusLabels = { open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved' };
const tabs = ['all', 'open', 'in-progress', 'resolved'];

function getSlaStatus(ticket) {
    if (ticket.status === 'resolved') return { label: 'Resolved', color: '#16A34A' };
    const created = new Date(ticket.createdDate);
    const now = new Date();
    const hoursElapsed = (now - created) / (1000 * 60 * 60);
    const pct = hoursElapsed / ticket.slaHours;
    if (pct >= 1) return { label: 'Breached', color: '#DC2626' };
    if (pct >= 0.75) return { label: 'At Risk', color: '#F59E0B' };
    return { label: 'On Track', color: '#16A34A' };
}

export default function Helpdesk() {
    const { employee } = useAuth();
    const [ticketList, setTicketList] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All');
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ subject: '', category: 'IT', priority: 'medium', description: '', employeeId: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: tktData } = await ticketService.getAllTickets();
        const { data: empData } = await employeeService.getAllEmployees();
        setTicketList(tktData || []);
        setAllEmployees(empData || []);
        setLoading(false);
    };

    const stats = [
        { label: 'Total Tiket', value: ticketList.length, color: '#0047AB', icon: <FiMessageSquare /> },
        { label: 'Open', value: ticketList.filter(t => t.status === 'open').length, color: '#0047AB', icon: <FiAlertCircle /> },
        { label: 'In Progress', value: ticketList.filter(t => t.status === 'in-progress').length, color: '#F59E0B', icon: <FiClock /> },
        { label: 'Resolved', value: ticketList.filter(t => t.status === 'resolved').length, color: '#16A34A', icon: <FiCheckCircle /> },
    ];

    const filtered = ticketList.filter(t => {
        const matchTab = activeTab === 'all' || t.status === activeTab;
        const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === 'All' || t.category === filterCat;
        return matchTab && matchSearch && matchCat;
    });

    const openSubmit = () => { setForm({ subject: '', category: 'IT', priority: 'medium', description: '', employeeId: '' }); setModal('submit'); };
    const openView = (t) => { setSelected(t); setModal('view'); };
    const closeModal = () => { setModal(null); setSelected(null); };

    const handleSubmit = async () => {
        const { error } = await ticketService.createTicket({
            employee_id: form.employeeId || employee?.id,
            subject: form.subject,
            category: form.category,
            priority: form.priority,
            description: form.description,
            status: 'open',
            assigned_to: form.category === 'IT' ? 'IT Support' : form.category === 'HR' ? 'HR Team' : 'Finance Team',
            sla_hours: form.priority === 'critical' ? 2 : form.priority === 'high' ? 4 : form.priority === 'medium' ? 24 : 48,
        });

        if (!error) {
            fetchData();
            closeModal();
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        const { error } = await ticketService.updateTicketStatus(id, newStatus);
        if (!error) {
            fetchData();
            if (selected && selected.id === id) {
                const { data: updated } = await ticketService.getTicketById(id);
                setSelected(updated);
            }
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Helpdesk & Ticketing</h1>
                <div className="page-header-actions">
                    <button className="btn-primary" onClick={openSubmit}><FiPlus /> Submit Tiket</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ color: s.color, fontSize: 20 }}>{s.icon}</span>
                            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="tab-bar">
                {tabs.map(t => (
                    <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                        {t === 'all' ? 'Semua' : statusLabels[t] || t}
                    </button>
                ))}
            </div>

            <div className="filters-bar">
                <input className="filter-search" placeholder="Cari tiket..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="All">Semua Kategori</option>
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                </select>
            </div>

            <div className="data-table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Ticket ID</th>
                            <th>Subject</th>
                            <th>Pelapor</th>
                            <th>Kategori</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>SLA</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(t => {
                            const emp = allEmployees.find(e => e.id === t.employee_id);
                            const sla = getSlaStatus(t);
                            return (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>TKT-{String(t.id).padStart(3, '0')}</td>
                                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</td>
                                    <td>{emp?.name || '—'}</td>
                                    <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: t.category === 'IT' ? '#EFF6FF' : t.category === 'HR' ? '#F5F3FF' : '#FFF7ED', color: t.category === 'IT' ? '#0047AB' : t.category === 'HR' ? '#7C3AED' : '#EA580C' }}>{t.category}</span></td>
                                    <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: priorityColors[t.priority] || priorityColors.medium }}>{t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span></td>
                                    <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: statusColors[t.status] || statusColors.open }}>{statusLabels[t.status]}</span></td>
                                    <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: sla.color }}>{sla.label}</span></td>
                                    <td>
                                        <button className="action-btn" title="Lihat" onClick={() => openView(t)}><FiEye /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* View Ticket Modal */}
            {modal === 'view' && selected && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selected.id} — {selected.subject}</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Pelapor</label>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{allEmployees.find(e => e.id === selected.employee_id)?.name || 'Unknown'}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Kategori</label>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.category}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Priority</label>
                                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff', background: priorityColors[selected.priority], display: 'inline-block' }}>{selected.priority.charAt(0).toUpperCase() + selected.priority.slice(1)}</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Assigned To</label>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.assigned_to || selected.assignedTo}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>SLA</label>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.sla_hours || selected.slaHours} jam</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Dibuat</label>
                                    <div style={{ fontSize: 14 }}>{new Date(selected.created_at || selected.createdDate).toLocaleString('id-ID')}</div>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Deskripsi</label>
                                    <div style={{ fontSize: 14, lineHeight: 1.6, padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>{selected.description}</div>
                                </div>
                            </div>
                            {selected.status !== 'resolved' && (
                                <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                                    <label className="form-label" style={{ alignSelf: 'center', marginRight: 8 }}>Update Status:</label>
                                    {selected.status === 'open' && <button className="btn-primary btn-sm" onClick={() => handleStatusChange(selected.id, 'in-progress')}>→ In Progress</button>}
                                    {(selected.status === 'open' || selected.status === 'in-progress') && <button className="btn-primary btn-sm" style={{ background: 'var(--success)' }} onClick={() => handleStatusChange(selected.id, 'resolved')}>✓ Resolved</button>}
                                </div>
                            )}
                            {selected.status === 'resolved' && selected.resolvedDate && (
                                <div style={{ marginTop: 16, padding: 12, background: '#F0FDF4', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#16A34A' }}>
                                    ✓ Resolved pada {new Date(selected.resolvedDate).toLocaleString('id-ID')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Ticket Modal */}
            {modal === 'submit' && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Submit Tiket Baru</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label className="form-label">Subject</label>
                                    <input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Deskripsikan masalah secara singkat" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kategori</label>
                                    <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        <option value="IT">IT</option>
                                        <option value="HR">HR</option>
                                        <option value="Finance">Finance</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Deskripsi</label>
                                    <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Jelaskan detail masalah..." rows={4} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModal}>Batal</button>
                            <button className="btn-primary" onClick={handleSubmit} disabled={!form.subject}>Submit Tiket</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
