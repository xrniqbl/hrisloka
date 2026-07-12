import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import { FiPlus, FiEye, FiX, FiAlertCircle, FiClock, FiCheckCircle, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import * as ticketService from '../services/ticketService';
import * as employeeService from '../services/employeeService';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PageSkeleton } from '../components/SkeletonLoader';

const priorityColors = { low: '#6D8196', medium: '#F59E0B', high: '#DC2626', critical: '#7C2D12' };
const statusColors = { open: '#635BFF', 'in-progress': '#F59E0B', resolved: '#16A34A' };
const statusLabels = { open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved' };
const tabs = ['all', 'open', 'in-progress', 'resolved'];

function getSlaStatus(ticket) {
  if (ticket.status === 'resolved') return { label: 'Resolved', color: '#16A34A' };
  const created = new Date(ticket.created_at || ticket.createdDate);
  const now = new Date();
  const hoursElapsed = (now - created) / (1000 * 60 * 60);
  const slaHours = ticket.sla_hours || ticket.slaHours || 24;
  const pct = hoursElapsed / slaHours;
  if (pct >= 1) return { label: 'Breached', color: '#DC2626' };
  if (pct >= 0.75) return { label: 'At Risk', color: '#F59E0B' };
  return { label: 'On Track', color: '#16A34A' };
}

export default function Helpdesk() {
  const { t } = useTranslation();
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

  const fetchData = async () => {
    setLoading(true);
    const { data: tktData } = await ticketService.getAllTickets(employee?.company_id);
    const { data: empData } = await employeeService.getAllEmployees(undefined, employee?.company_id);
    setTicketList(tktData || []);
    setAllEmployees(empData || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!employee?.company_id) {
      setLoading(false);
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.company_id]);

  // Realtime: auto-refresh
  useRealtimeTable('tickets', fetchData, { companyId: employee?.company_id, enabled: !!employee?.company_id });

  const stats = [
    { label: 'Total Tiket', value: ticketList.length, color: '#635BFF', icon: <FiMessageSquare /> },
    { label: 'Open', value: ticketList.filter(t => t.status === 'open').length, color: '#635BFF', icon: <FiAlertCircle /> },
    { label: 'In Progress', value: ticketList.filter(t => t.status === 'in-progress').length, color: '#F59E0B', icon: <FiClock /> },
    { label: 'Resolved', value: ticketList.filter(t => t.status === 'resolved').length, color: '#16A34A', icon: <FiCheckCircle /> },
  ];

  const filtered = ticketList.filter(t => {
    const matchTab = activeTab === 'all' || t.status === activeTab;
    const matchSearch = (t.subject || '').toLowerCase().includes(search.toLowerCase()) || String(t.id).toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || t.category === filterCat;
    return matchTab && matchSearch && matchCat;
  });

  const openSubmit = () => { setForm({ subject: '', category: 'IT', priority: 'medium', description: '', employeeId: '' }); setModal('submit'); };
  const openView = (t) => { setSelected(t); setModal('view'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = async () => {
    const { error } = await ticketService.submitTicket({
      employee_id: form.employeeId || employee?.id,
      subject: form.subject,
      category: form.category,
      priority: form.priority,
      message: form.description,
    });

    if (!error) {
      fetchData();
      closeModal();
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    // Normalize status values used in UI vs DB
    const status = newStatus === 'in-progress' ? 'in_progress' : newStatus;
    const { error } = await ticketService.updateTicket(id, { status }, employee?.company_id);
    if (!error) {
      fetchData();
      if (selected && selected.id === id) {
        setSelected(prev => ({ ...prev, status }));
      }
    } else {
      console.warn('[Helpdesk] status update failed:', error.message);
    }
  };

  if (loading) return <PageSkeleton hasStats={false} tableRows={6} tableCols={5} />;
  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>{t('helpdesk.title')}</h1>
        <div className="page-header-actions">
          <Button onClick={openSubmit}><FiPlus /> Submit Tiket</Button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.label} className="info-card">
            <div className="btn-icon-row mb-sm">
              <span style={{ color: s.color, fontSize: 20 }}>{s.icon}</span>
              <span className="info-card-label">{s.label}</span>
            </div>
            <div className="info-card-value" style={{ color: s.color }}>{s.value}</div>
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
        <div className="table-responsive">
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
                  <td className="td-mono-bold">TKT-{String(t.id).padStart(3, '0')}</td>
                  <td className="td-truncate" style={{ maxWidth: 220 }}>{t.subject}</td>
                  <td>{emp?.name || ''}</td>
                  <td><span className="status-badge" style={{ background: t.category === 'IT' ? '#F0EEFF' : t.category === 'HR' ? '#F5F3FF' : '#FFF7ED', color: t.category === 'IT' ? '#635BFF' : t.category === 'HR' ? '#7C3AED' : '#EA580C' }}>{t.category}</span></td>
                  <td><span className="status-badge" style={{ background: priorityColors[t.priority] || priorityColors.medium, color: '#fff' }}>{t.priority ? t.priority.charAt(0).toUpperCase() + t.priority.slice(1) : 'Medium'}</span></td>
                  <td><span className="status-badge" style={{ background: statusColors[t.status] || statusColors.open, color: '#fff' }}>{statusLabels[t.status] || t.status}</span></td>
                  <td><span className="status-badge" style={{ background: sla.color, color: '#fff' }}>{sla.label}</span></td>
                  <td>
                    <button className="action-btn" title="Lihat" onClick={() => openView(t)} aria-label="Lihat tiket"><FiEye /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* View Ticket Modal */}
      {modal === 'view' && selected && (
        <Dialog open={modal !== null} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selected.id} - {selected.subject}</DialogTitle>
              <DialogDescription>Informasi lengkap tentang tiket ini</DialogDescription>
            </DialogHeader>
            <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Pelapor</label>
                  <div className="td-semibold">{allEmployees.find(e => e.id === selected.employee_id)?.name || 'Unknown'}</div>
                </div>
                <div className="form-group">
                  <Label>Kategori</Label>
                  <div className="td-semibold">{selected.category}</div>
                </div>
                <div className="form-group">
                  <Label>Priority</Label>
                  <span className="status-badge" style={{ background: priorityColors[selected.priority], color: '#fff' }}>{selected.priority ? selected.priority.charAt(0).toUpperCase() + selected.priority.slice(1) : 'Medium'}</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned To</label>
                  <div className="td-semibold">{selected.assigned_to || selected.assignedTo || ''}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">SLA</label>
                  <div className="td-semibold">{selected.sla_hours || selected.slaHours || 24} jam</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Dibuat</label>
                  <div>{new Date(selected.created_at || selected.createdDate).toLocaleString('id-ID')}</div>
                </div>
                <div className="form-group full-width">
                  <Label>Deskripsi</Label>
                  <div style={{ lineHeight: 1.6, padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>{selected.description || selected.message}</div>
                </div>
              </div>
              {selected.status !== 'resolved' && (
                <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                  <label className="form-label" style={{ alignSelf: 'center', marginRight: 8 }}>Update Status:</label>
                  {selected.status === 'open' && <button className="btn-primary btn-sm" onClick={() => handleStatusChange(selected.id, 'in-progress')}>&rarr; In Progress</button>}
                  {(selected.status === 'open' || selected.status === 'in-progress') && <button className="btn-primary btn-sm" style={{ background: 'var(--success)' }} onClick={() => handleStatusChange(selected.id, 'resolved')}> Resolved</button>}
                </div>
              )}
              {selected.status === 'resolved' && selected.resolvedDate && (
                <div style={{ marginTop: 16, padding: 12, background: '#F0FDF4', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#16A34A' }}>
                  Resolved pada {new Date(selected.resolvedDate).toLocaleString('id-ID')}
                </div>
              )}
          </DialogContent>
        </Dialog>
      )}

      {/* Submit Ticket Modal */}
      {modal === 'submit' && (
        <Dialog open={modal !== null} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Tiket Baru</DialogTitle>
              <DialogDescription>Lengkapi form di bawah untuk membuat tiket baru</DialogDescription>
            </DialogHeader>
            <div className="form-grid">
              <div className="form-group full-width">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Deskripsikan masalah secara singkat" />
              </div>
              <div className="form-group">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="form-group">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="form-group full-width">
                <Label>Deskripsi</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Jelaskan detail masalah..." rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeModal}>Batal</Button>
              <Button onClick={handleSubmit} disabled={!form.subject}>Submit Tiket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


