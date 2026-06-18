import { useState, useEffect } from 'react';
import { FiActivity, FiSearch, FiFilter, FiDownload } from 'react-icons/fi';
import * as auditService from '../services/auditService';
import { exportToExcel } from '../lib/excelExport';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

const actionColors = {
 CREATE: '#16A34A', INSERT: '#16A34A', ADD: '#16A34A',
 UPDATE: '#F59E0B', EDIT: '#F59E0B', CHANGE: '#F59E0B',
 DELETE: '#DC2626', REMOVE: '#DC2626',
 APPROVE: '#0047AB', LOGIN: '#8B5CF6',
};

function getActionColor(action) {
 const key = Object.keys(actionColors).find(k => (action || '').toUpperCase().includes(k));
 return actionColors[key] || '#6D8196';
}

export default function AuditTrail() {
 const [logs, setLogs] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [filterTable, setFilterTable] = useState('');

 useEffect(() => { fetchData(); }, []);

 const fetchData = async () => {
 setLoading(true);
 const { data } = await auditService.getAuditLogs();
 setLogs(data || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('audit_trails', fetchData);

 const tables = [...new Set(logs.map(l => l.target_table).filter(Boolean))].sort();

 const filtered = logs.filter(l => {
 const matchSearch = !search || (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
 (l.employees?.name || '').toLowerCase().includes(search.toLowerCase()) ||
 (l.target_table || '').toLowerCase().includes(search.toLowerCase());
 const matchTable = !filterTable || l.target_table === filterTable;
 return matchSearch && matchTable;
 });

 const handleExport = () => {
 const data = filtered.map(l => ({
 Waktu: new Date(l.created_at).toLocaleString('id-ID'),
 User: l.employees?.name || '—',
 Aksi: l.action,
 Tabel: l.target_table,
 'Target ID': l.target_id,
 'Nilai Baru': JSON.stringify(l.new_value || ''),
 }));
 exportToExcel(data, 'Audit_Trail.xlsx', 'Audit');
 };

  if (loading) return <PageSkeleton hasStats={false} tableRows={6} tableCols={6} />;
 return (
 <div>
 <div className="page-header">
 <h1><FiActivity style={{ marginRight: 10 }} /> Audit Trail</h1>
 <div className="page-header-actions">
 <button className="btn-secondary" onClick={handleExport}><FiDownload /> Export Excel</button>
 </div>
 </div>

 <div className="filters-bar" style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
 <div style={{ position: 'relative', flex: 1 }}>
 <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
 <input className="form-input" placeholder="Cari aksi, user, atau tabel..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
 </div>
 <select className="form-select" value={filterTable} onChange={e => setFilterTable(e.target.value)} style={{ maxWidth: 200 }}>
 <option value="">Semua Tabel</option>
 {tables.map(t => <option key={t} value={t}>{t}</option>)}
 </select>
 </div>

 <div className="data-table-card">
 <div className="table-responsive">
 <table className="data-table">
 <thead>
 <tr>
 <th>Waktu</th>
 <th>User</th>
 <th>Aksi</th>
 <th>Tabel</th>
 <th>Target ID</th>
 <th>Detail</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Memuat data...</td></tr>
 ) : filtered.length === 0 ? (
 <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
 Belum ada log audit.
 </td></tr>
 ) : filtered.slice(0, 200).map(log => (
 <tr key={log.id}>
 <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
 {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
 <span style={{ color: 'var(--muted)', marginLeft: 6 }}>
 {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
 </span>
 </td>
 <td style={{ fontWeight: 600, fontSize: 13 }}>{log.employees?.name || '—'}</td>
 <td>
 <span style={{
 padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
 color: '#fff', background: getActionColor(log.action),
 }}>
 {log.action}
 </span>
 </td>
 <td><code style={{ fontSize: 12, padding: '2px 6px', background: 'var(--primary-light)', borderRadius: 4, color: 'var(--primary)' }}>{log.target_table}</code></td>
 <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{log.target_id || '—'}</td>
 <td style={{ maxWidth: 200, fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
 {log.new_value ? JSON.stringify(log.new_value).slice(0, 80) : '—'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {filtered.length > 200 && (
 <div style={{ padding: 12, textAlign: 'center', color: 'var(--muted)', fontSize: 12, borderTop: '1px solid var(--border)' }}>
 Menampilkan 200 dari {filtered.length} log. Gunakan filter untuk mempersempit pencarian.
 </div>
 )}
 </div>
 </div>
 );
}
