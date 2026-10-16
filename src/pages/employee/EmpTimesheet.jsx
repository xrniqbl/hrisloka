import { useState, useEffect, useCallback } from 'react';
import { HiClock, HiPaperAirplane, HiCalendarDays, HiXMark, HiArrowPath } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getMyTimesheets, logTimesheet, deleteTimesheet } from '../../services/projectService';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import { useRealtimeTable } from '../../hooks/useRealtime';
import EmpEmptyState from '../../components/EmpEmptyState';
import { isDemoMode, DEMO_EMPLOYEE, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import '../../styles/shared.css';

export default function EmpTimesheet() {
  const { user, employee: authEmployee } = useAuth();
  const toast = useToast();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], hours: '', project: '', task: '', notes: '' });

  const load = useCallback(async () => {
    if (isDemoMode()) {
      setEmp({ ...DEMO_EMPLOYEE });
      setEntries([...(DEMO_PROFILE_DATA.timesheets || [])]);
      setLoading(false);
      return;
    }
    let e = authEmployee;
    if (!e?.id && user?.email) {
      const { data } = await getEmployeeByEmail(user.email);
      e = data;
    }
    if (e) {
      setEmp(e);
      const { data: t } = await getMyTimesheets(e.id, null, null, 30);
      setEntries(t || []);
    }
    setLoading(false);
  }, [user, authEmployee]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.hours || !form.task) {
      toast?.error(locale === 'en' ? 'Hours and task are required' : 'Jam dan tugas wajib diisi');
      return;
    }
    const hours = parseFloat(form.hours);
    if (!hours || hours <= 0 || hours > 24) {
      toast?.error(locale === 'en' ? 'Hours must be between 0 and 24' : 'Jam harus 0–24');
      return;
    }
    setSubmitting(true);

    if (isDemoMode()) {
      setEntries((prev) => [{
        id: `demo-ts-${Date.now()}`,
        date: form.date,
        hours,
        project: form.project,
        task: form.task,
        notes: form.notes,
      }, ...prev]);
      toast?.success(locale === 'en' ? 'Demo timesheet saved!' : 'Timesheet demo disimpan!');
      setShowForm(false);
      setForm({ date: new Date().toISOString().split('T')[0], hours: '', project: '', task: '', notes: '' });
      setSubmitting(false);
      return;
    }

    const { error } = await logTimesheet(emp.id, {
      date: form.date,
      hours,
      project: form.project || null,
      task: form.task,
      notes: form.notes || null,
    });
    if (!error) {
      toast?.success(locale === 'en' ? 'Timesheet submitted!' : 'Timesheet berhasil dicatat!');
      setShowForm(false);
      setForm({ date: new Date().toISOString().split('T')[0], hours: '', project: '', task: '', notes: '' });
      load();
    } else {
      toast?.error(error.message || (locale === 'en' ? 'Failed to save timesheet' : 'Gagal menyimpan timesheet'));
      console.error('[EmpTimesheet] insert error:', error);
    }
    setSubmitting(false);
  };

  // Delete own entry (service is owner-agnostic delete by id; entries listed
  // here are always the current employee's via getMyTimesheets).
  const handleDelete = async (id) => {
    setConfirmDeleteId(null);
    setDeletingId(id);
    if (isDemoMode()) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setDeletingId(null);
      toast?.success(locale === 'en' ? 'Entry deleted.' : 'Catatan dihapus.');
      return;
    }
    const { error } = await deleteTimesheet(id);
    setDeletingId(null);
    if (error) {
      toast?.error(error.message || (locale === 'en' ? 'Delete failed' : 'Gagal menghapus'));
      return;
    }
    toast?.success(locale === 'en' ? 'Entry deleted.' : 'Catatan dihapus.');
    load();
  };

  // Realtime: refresh when timesheets table changes
  useRealtimeTable('timesheets', load, {
    enabled: !isDemoMode() && !!emp?.id,
    filter: emp?.id ? 'employee_id=eq.' + emp.id : undefined,
    companyId: emp?.company_id,
  });

  if (loading) return <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 10 }} />{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 14, marginBottom: 8 }} />)}</div>;
  if (!emp) return <EmpEmptyState type="noemp" />;

  const totalHours = entries.filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, e) => s + (e.hours || 0), 0);
  const iS = { width: '100%', padding: '12px 14px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' };

  return (
    <div className="emp-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{locale === 'en' ? 'Timesheet' : 'Timesheet'}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{locale === 'en' ? 'Daily work log' : 'Log kerja harian'}</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 18px', borderRadius: 14, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          <HiPaperAirplane size={14} /> {locale === 'en' ? 'Log' : 'Catat'}
        </button>
      </div>

      <div className="emp-card" style={{ padding: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid var(--primary)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#635BFF' }}><HiClock size={24} /></div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>{locale === 'en' ? 'This Month' : 'Bulan Ini'}</div>
          <div className="info-card-value primary">{totalHours.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 600 }}>{locale === 'en' ? 'hours' : 'jam'}</span></div>
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><HiCalendarDays size={16} style={{ color: 'var(--primary)' }} />{locale === 'en' ? 'Recent Entries' : 'Log Terbaru'}</div>
      {entries.length === 0 ? (
        <EmpEmptyState
          type="nodata"
          title={locale === 'en' ? 'No entries yet' : 'Belum ada catatan'}
          subtitle={locale === 'en' ? 'Log your work hours with the button above.' : 'Catat jam kerja lewat tombol di atas.'}
          cta={locale === 'en' ? 'Log work' : 'Catat kerja'}
          ctaAction={() => setShowForm(true)}
        />
      ) : entries.slice(0, 15).map(e => (
        <div key={e.id} className="emp-card" style={{ padding: '12px 16px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{e.task}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{e.project && `${e.project}  `}{new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>{e.hours}h</span>
            <button
              onClick={() => setConfirmDeleteId(e.id)}
              disabled={deletingId === e.id}
              title={locale === 'en' ? 'Delete entry' : 'Hapus catatan'}
              aria-label={locale === 'en' ? 'Delete entry' : 'Hapus catatan'}
              style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(220,38,38,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#DC2626', flexShrink: 0 }}
            >
              {deletingId === e.id ? <HiArrowPath size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <HiXMark size={12} />}
            </button>
          </div>
        </div>
      ))}

      {/* Delete confirmation (in-app dialog) */}
      {confirmDeleteId != null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmDeleteId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10001,
            background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420, background: 'var(--surface, #fff)',
              borderRadius: '16px 16px 0 0', padding: '20px 18px calc(20px + env(safe-area-inset-bottom))',
              boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              {locale === 'en' ? 'Delete this entry?' : 'Hapus catatan ini?'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {locale === 'en' ? 'This cannot be undone.' : 'Tindakan ini tidak dapat dibatalkan.'}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border, #e2e8f0)', background: 'transparent', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {locale === 'en' ? 'Keep' : 'Kembali'}
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#DC2626', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {deletingId === confirmDeleteId && <HiArrowPath size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
                {locale === 'en' ? 'Yes, delete' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '18px 18px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', padding: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>{locale === 'en' ? 'Log Work' : 'Catat Kerja'}</div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className="emp-field-label">{locale === 'en' ? 'Date' : 'Tanggal'}</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={iS} /></div>
                <div><label className="emp-field-label">{locale === 'en' ? 'Hours' : 'Jam'} *</label><input type="number" step="0.5" min="0.5" max="24" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} placeholder="8" style={iS} /></div>
              </div>
              <div><label className="emp-field-label">{locale === 'en' ? 'Project' : 'Proyek'}</label><input value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} placeholder="Nama proyek..." style={iS} /></div>
              <div><label className="emp-field-label">{locale === 'en' ? 'Task' : 'Tugas'} *</label><input value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} placeholder="Apa yang dikerjakan..." style={iS} /></div>
              <div><label className="emp-field-label">{locale === 'en' ? 'Notes' : 'Catatan'}</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan..." style={{ ...iS, minHeight: 60, resize: 'none' }} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{locale === 'en' ? 'Cancel' : 'Batal'}</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{submitting ? '...' : (locale === 'en' ? 'Save' : 'Simpan')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

