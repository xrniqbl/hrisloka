import { useState, useEffect } from 'react';
import { FiDatabase, FiRefreshCw, FiDownload, FiRotateCcw, FiTrash2, FiCheck, FiAlertTriangle, FiClock } from 'react-icons/fi';
import * as backupService from '../../services/backupService';
import { useToast } from '../../components/Toast';
import './founder.css';

function SkeletonBox({ w = '100%', h = 28, style = {} }) {
  return <div style={{ height: h, background: 'var(--border)', borderRadius: 8, width: w, animation: 'fp-pulse 1.5s ease-in-out infinite', ...style }} />;
}

function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>{Array.from({ length: cols }).map((_, i) => (
      <td key={i}><SkeletonBox w={i === 0 ? '80%' : '60%'} h={14} /></td>
    ))}</tr>
  );
}

function SkeletonPage() {
  return (
    <div>
      <div className="fp-header"><div className="fp-header-top">
        <div><SkeletonBox w={200} h={28} /><SkeletonBox w={320} h={14} style={{ marginTop: 8 }} /></div>
        <SkeletonBox w={150} h={38} style={{ borderRadius: 10 }} />
      </div></div>
      <div className="fp-stats" style={{ marginBottom: 24 }}>
        {[1,2,3,4].map(i => <div key={i} className="fp-stat"><SkeletonBox w="55%" h={28} style={{ marginBottom: 8 }} /><SkeletonBox w="70%" h={12} /></div>)}
      </div>
      <div className="fp-card"><div className="fp-table-wrap"><table className="fp-table">
        <thead><tr>{[1,2,3,4,5].map(i => <th key={i}><SkeletonBox w={80} h={12} /></th>)}</tr></thead>
        <tbody>{[1,2,3,4,5].map(i => <TableRowSkeleton key={i} cols={5} />)}</tbody>
      </table></div></div>
    </div>
  );
}

const TABS = [
  { key: 'snapshots', label: 'Daily Snapshots', icon: <FiDatabase /> },
  { key: 'deleted',   label: 'Recycle Bin', icon: <FiTrash2 /> },
  { key: 'logs',      label: 'Backup Logs', icon: <FiClock /> },
];

const EXPORT_TABLES = [
  { value: 'employees',      label: 'Employees' },
  { value: 'payroll_records', label: 'Payroll Records' },
  { value: 'attendance',     label: 'Attendance' },
];

export default function FounderBackup() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('snapshots');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const [snapshots, setSnapshots] = useState([]);
  const [deletedRecords, setDeletedRecords] = useState([]);
  const [backupLogs, setBackupLogs] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [tableFilter, setTableFilter] = useState('all');
  const [exportTable, setExportTable] = useState('employees');
  const [exporting, setExporting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: snaps }, { data: deleted }, { data: logs }] = await Promise.all([
        backupService.getSnapshots(null, 30),
        backupService.getDeletedRecords({ limit: 100 }),
        backupService.getBackupLogs(50),
      ]);
      setSnapshots(snaps || []);
      setDeletedRecords(deleted || []);
      setBackupLogs(logs || []);
    } catch (err) {
      console.error('[FounderBackup] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return <SkeletonPage />;

  const handleRunSnapshot = async () => {
    setRunning(true);
    try {
      const { error } = await backupService.runAllSnapshots();
      if (error) throw error;
      toast.success('Snapshot berhasil dibuat untuk semua perusahaan!');
      await fetchAll();
    } catch (err) {
      toast.error('Gagal membuat snapshot: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleRestore = async (record) => {
    setRestoring(record.id);
    try {
      const { data, error } = await backupService.restoreRecord(record.restore_key);
      if (error) throw error;
      if (data?.success) {
        toast.success(`Record ${record.table_name} #${record.record_id} berhasil di-restore!`);
        setDeletedRecords(prev => prev.filter(r => r.id !== record.id));
      } else {
        toast.error(data?.error || 'Gagal restore');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setRestoring(null);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const result = await backupService.exportCompanyDataCSV(null, exportTable);
      if (result.error) throw new Error(result.error);
      const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = result.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.count} rows as CSV`);
    } catch (err) {
      toast.error('Export gagal: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const uniqueTables = ['all', ...new Set(deletedRecords.map(r => r.table_name))];
  const filteredDeleted = tableFilter === 'all' ? deletedRecords : deletedRecords.filter(r => r.table_name === tableFilter);

  const fmtDate = (d) => d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDateOnly = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Backup & Security</h1>
            <p className="fp-subtitle">Snapshot harian otomatis, recycle bin, dan export data per perusahaan</p>
          </div>
          <div className="fp-actions">
            <button className="fp-btn fp-btn-secondary" onClick={fetchAll}>
              <FiRefreshCw size={13} /> Refresh
            </button>
            <button className="fp-btn fp-btn-primary" onClick={handleRunSnapshot} disabled={running}>
              <FiDatabase size={13} /> {running ? 'Membuat Snapshot...' : 'Buat Snapshot Sekarang'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="fp-stats" style={{ marginBottom: 24 }}>
        <div className="fp-stat">
          <div className="fp-stat-value">{snapshots.length}</div>
          <div className="fp-stat-label">Total Snapshots</div>
        </div>
        <div className="fp-stat">
          <div className="fp-stat-value">{deletedRecords.length}</div>
          <div className="fp-stat-label">Data di Recycle Bin</div>
        </div>
        <div className="fp-stat">
          <div className="fp-stat-value">{backupLogs.filter(l => l.status === 'completed').length}</div>
          <div className="fp-stat-label">Backup Sukses</div>
        </div>
        <div className="fp-stat">
          <div className="fp-stat-value" style={{ color: backupLogs.some(l => l.status === 'failed') ? '#EF4444' : '#10B981' }}>
            {backupLogs.some(l => l.status === 'failed') ? 'Ada Error' : 'OK'}
          </div>
          <div className="fp-stat-label">Status Sistem</div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 13, color: '#6366F1', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
        <FiAlertTriangle />
        <span>Snapshot harian otomatis berjalan setiap jam 01:00 UTC via pg_cron. Data terhapus disimpan 90 hari di Recycle Bin sebelum dihapus permanen.</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', border: '1px solid var(--border)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
            borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: 600, fontSize: 13,
            background: activeTab === t.key ? 'var(--primary, #0047AB)' : 'none',
            color: activeTab === t.key ? '#fff' : 'var(--text-secondary)',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Snapshots ── */}
      {activeTab === 'snapshots' && (
        <>
          {/* Export tool */}
          <div className="fp-card" style={{ marginBottom: 20 }}>
            <div className="fp-card-header"><span className="fp-card-title">Export Data CSV</span></div>
            <div className="fp-card-body">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="fp-select" style={{ width: 200 }} value={exportTable} onChange={e => setExportTable(e.target.value)}>
                  {EXPORT_TABLES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button className="fp-btn fp-btn-primary" onClick={handleExportCSV} disabled={exporting}>
                  <FiDownload size={13} /> {exporting ? 'Exporting...' : 'Download CSV'}
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Data real-time dari Supabase</span>
              </div>
            </div>
          </div>

          <div className="fp-card">
            <div className="fp-card-header">
              <span className="fp-card-title">Riwayat Snapshot Harian</span>
              <span className="fp-card-badge">{snapshots.length} snapshots</span>
            </div>
            <div className="fp-table-wrap">
              <table className="fp-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Perusahaan</th>
                    <th>Karyawan</th>
                    <th>Absensi Hari Ini</th>
                    <th>Cuti Pending</th>
                    <th>Payroll Bulan Ini</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.length === 0 ? (
                    <tr><td colSpan={7}>
                      <div className="fp-empty">
                        <div className="fp-empty-icon"><FiDatabase /></div>
                        <div className="fp-empty-title">Belum ada snapshot</div>
                        <div className="fp-empty-desc">Klik "Buat Snapshot Sekarang" atau tunggu jadwal otomatis jam 01:00 UTC</div>
                      </div>
                    </td></tr>
                  ) : snapshots.map(s => (
                    <tr key={s.id} onClick={() => setSelectedSnapshot(selectedSnapshot?.id === s.id ? null : s)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 600 }}>{fmtDateOnly(s.snapshot_date)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ID {s.company_id}</td>
                      <td>{s.employees_json ? JSON.parse(JSON.stringify(s.employees_json)).length || 0 : 0} karyawan</td>
                      <td>{s.attendance_count ?? 0}</td>
                      <td>{s.leave_count ?? 0}</td>
                      <td style={{ fontSize: 12 }}>
                        {s.payroll_summary?.total_records
                          ? `${s.payroll_summary.total_records} records`
                          : '—'}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, color: '#6366F1', fontWeight: 600 }}>
                          {selectedSnapshot?.id === s.id ? 'Tutup ▲' : 'Detail ▼'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Snapshot detail drawer */}
            {selectedSnapshot && (
              <div style={{ padding: '16px 20px', borderTop: '2px solid var(--primary, #0047AB)', background: 'rgba(99,102,241,0.04)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
                  Detail Snapshot — {fmtDateOnly(selectedSnapshot.snapshot_date)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>Payroll Summary</div>
                    <pre style={{ fontSize: 12, background: 'var(--bg)', padding: 10, borderRadius: 8, overflow: 'auto', margin: 0, maxHeight: 120 }}>
                      {JSON.stringify(selectedSnapshot.payroll_summary, null, 2) || 'Tidak ada data'}
                    </pre>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>Statistik</div>
                    <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span>👥 Absensi hari itu: <strong>{selectedSnapshot.attendance_count}</strong></span>
                      <span>🏖️ Cuti pending: <strong>{selectedSnapshot.leave_count}</strong></span>
                      <span>📸 Dibuat: <strong>{fmtDate(selectedSnapshot.created_at)}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: Recycle Bin ── */}
      {activeTab === 'deleted' && (
        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Recycle Bin — Data Terhapus</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {uniqueTables.map(t => (
                <button key={t} onClick={() => setTableFilter(t)} style={{
                  padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  background: tableFilter === t ? 'var(--text)' : 'var(--bg)',
                  color: tableFilter === t ? 'var(--surface)' : 'var(--text-secondary)',
                  fontFamily: 'inherit',
                }}>
                  {t === 'all' ? 'Semua' : t}
                </button>
              ))}
            </div>
          </div>
          <div className="fp-table-wrap">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Tabel</th>
                  <th>Record ID</th>
                  <th>Company</th>
                  <th>Dihapus Pada</th>
                  <th>Restore</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeleted.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="fp-empty">
                      <div className="fp-empty-icon"><FiCheck /></div>
                      <div className="fp-empty-title">Recycle bin kosong</div>
                      <div className="fp-empty-desc">Tidak ada data yang terhapus</div>
                    </div>
                  </td></tr>
                ) : filteredDeleted.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, background: 'rgba(99,102,241,0.1)', color: '#6366F1', padding: '2px 8px', borderRadius: 5 }}>
                        {r.table_name}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{r.record_id}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {r.record_data?.full_name || r.record_data?.name || `Company ${r.company_id}`}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(r.deleted_at)}</td>
                    <td>
                      <button
                        className="fp-btn fp-btn-secondary fp-btn-sm"
                        onClick={() => handleRestore(r)}
                        disabled={restoring === r.id}
                        style={{ color: '#059669' }}
                        title="Restore record ini"
                      >
                        <FiRotateCcw size={12} />
                        {restoring === r.id ? ' Restoring...' : ' Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)' }}>
            ⏱ Data disimpan 90 hari · Setelah itu dihapus permanen secara otomatis
          </div>
        </div>
      )}

      {/* ── TAB: Backup Logs ── */}
      {activeTab === 'logs' && (
        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Backup Activity Log</span>
            <span className="fp-card-badge">{backupLogs.length} entri</span>
          </div>
          <div className="fp-table-wrap">
            <table className="fp-table">
              <thead>
                <tr>
                  <th>Tipe</th>
                  <th>Perusahaan</th>
                  <th>Backup Key</th>
                  <th>Status</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {backupLogs.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="fp-empty">
                      <div className="fp-empty-icon"><FiClock /></div>
                      <div className="fp-empty-title">Belum ada log</div>
                    </div>
                  </td></tr>
                ) : backupLogs.map(l => (
                  <tr key={l.id}>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                        background: l.backup_type === 'auto_daily' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)',
                        color: l.backup_type === 'auto_daily' ? '#6366F1' : '#D97706',
                      }}>
                        {l.backup_type}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{l.companies?.name || `ID ${l.company_id}` || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>{l.backup_key}</td>
                    <td>
                      <span className={`fp-badge ${l.status === 'completed' ? 'active' : 'expired'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
