import { useState, useEffect, useCallback } from 'react';
import { HiClock, HiPaperAirplane, HiCalendarDays } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import { useRealtimeTable } from '../../hooks/useRealtime';
import EmpEmptyState from '../../components/EmpEmptyState';
import '../../styles/shared.css';

export default function EmpTimesheet() {
  const { user } = useAuth();
  const toast = useToast();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], hours: '', project: '', task: '', notes: '' });

  const load = useCallback(async () => {
    if (!user?.email) return;
    const { data: e } = await supabase.from('employees').select('*').eq('email', user.email).single();
    if (e) {
      setEmp(e);
      const { data: t } = await supabase.from('timesheets').select('*').eq('employee_id', e.id).order('date', { ascending: false }).limit(30);
      setEntries(t || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.hours || !form.task) return;
    setSubmitting(true);
    const { error } = await supabase.from('timesheets').insert({
      employee_id: emp.id,
      date: form.date,
      hours: parseFloat(form.hours),
      project: form.project,
      task: form.task,
      notes: form.notes,
    });
    if (!error) {
      toast?.success(locale === 'en' ? 'Timesheet submitted!' : 'Timesheet berhasil dicatat!');
      setShowForm(false);
      setForm({ date: new Date().toISOString().split('T')[0], hours: '', project: '', task: '', notes: '' });
      load();
    } else {
      toast?.error(locale === 'en' ? 'Failed to save timesheet' : 'Gagal menyimpan timesheet');
      console.error('[EmpTimesheet] insert error:', error);
    }
    setSubmitting(false);
  };

  // Realtime: refresh when timesheets table changes
  useRealtimeTable('timesheets', load);

  if (loading) return <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 10 }} />{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 14, marginBottom: 8 }} />)}</div>;
  if (!emp) return <EmpEmptyState type="noemp" />;

  const totalHours = entries.filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, e) => s + (e.hours || 0), 0);
  const iS = { width: '100%', padding: '12px 14px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' };

  return (
    <div className="emp-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{locale === 'en' ? 'Timesheet' : 'Timesheet'}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{locale === 'en' ? 'Daily work log' : 'Log kerja harian'}</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 18px', borderRadius: 14, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          <HiPaperAirplane size={14} /> {locale === 'en' ? 'Log' : 'Catat'}
        </button>
      </div>

      <div className="emp-card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid var(--primary)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0047AB' }}><HiClock size={24} /></div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>{locale === 'en' ? 'This Month' : 'Bulan Ini'}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)' }}>{totalHours.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 600 }}>{locale === 'en' ? 'hours' : 'jam'}</span></div>
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><HiCalendarDays size={16} style={{ color: 'var(--primary)' }} />{locale === 'en' ? 'Recent Entries' : 'Log Terbaru'}</div>
      {entries.length === 0 ? (
        <div className="emp-card" style={{ padding: 24, textAlign: 'center' }}><div style={{ fontSize: 13, color: 'var(--muted)' }}>{locale === 'en' ? 'No entries yet' : 'Belum ada catatan'}</div></div>
      ) : entries.slice(0, 15).map(e => (
        <div key={e.id} className="emp-card" style={{ padding: '12px 16px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{e.task}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{e.project && `${e.project} · `}{new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{e.hours}h</span>
          </div>
        </div>
      ))}

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>{locale === 'en' ? 'Log Work' : 'Catat Kerja'}</div>
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
