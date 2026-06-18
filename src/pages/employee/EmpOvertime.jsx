import { useState, useEffect, useCallback } from 'react';
import {
  HiArrowPath,
  HiBellAlert,
  HiCheck,
  HiChevronDown,
  HiClock,
  HiPaperAirplane,
  HiXMark
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import BottomSheet from '../../components/BottomSheet';
import '../../styles/shared.css';

const STATUS_COLORS = {
  pending: { bg: 'rgba(245,158,11,0.1)', color: '#D97706', label: 'Menunggu' },
  approved: { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Disetujui' },
  rejected: { bg: 'rgba(220,38,38,0.1)', color: '#DC2626', label: 'Ditolak' },
};

export default function EmpOvertime() {
  const { user } = useAuth();
  const toast = useToast();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [overtimes, setOvertimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ date: '', start_time: '', end_time: '', reason: '', category: 'Reguler' });

  const load = useCallback(async () => {
    const email = user?.email || user?.user_metadata?.email;
    const { data: empData } = await getEmployeeByEmail(email);
    if (!empData) { setLoading(false); return; }
    setEmp(empData);
    const { data } = await supabase
      .from('overtime_requests')
      .select('*')
      .eq('employee_id', empData.id)
      .order('created_at', { ascending: false });
    setOvertimes(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('emp:refresh', handler);
    return () => window.removeEventListener('emp:refresh', handler);
  }, [load]);

  const handleSubmit = async () => {
    if (!form.date || !form.start_time || !form.end_time || !form.reason) {
      toast?.error(locale === 'en' ? 'Please fill all required fields' : 'Harap isi semua kolom wajib');
      return;
    }
    setSubmitting(true);
    try {
      const start = new Date(`${form.date}T${form.start_time}`);
      const end = new Date(`${form.date}T${form.end_time}`);
      const durationHours = Math.max(0, (end - start) / 3600000);

      const { error } = await supabase.from('overtime_requests').insert({
        employee_id: emp.id,
        date: form.date,
        hours: Math.round(durationHours * 10) / 10,
        reason: `[${form.category}] ${form.start_time}�${form.end_time} � ${form.reason}`,
        status: 'pending',
      });

      if (error) throw error;
      toast?.success(locale === 'en' ? 'Overtime request submitted!' : 'Pengajuan lembur berhasil dikirim!');
      setSheetOpen(false);
      setForm({ date: '', start_time: '', end_time: '', reason: '', category: 'Reguler' });
      load();
    } catch (err) {
      toast?.error(locale === 'en' ? 'Failed to submit. Please try again.' : 'Gagal mengirim. Coba lagi.');
    }
    setSubmitting(false);
  };

  const totalThisMonth = overtimes.filter(o => {
    const d = new Date(o.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const approvedHours = totalThisMonth.filter(o => o.status === 'approved').reduce((s, o) => s + (o.hours || o.duration_hours || 0), 0);


  return (
    <div className="emp-page">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="emp-page-title">
          {locale === 'en' ? 'Overtime' : 'Lembur'}
        </h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'Submit and track your overtime requests' : 'Ajukan dan pantau permintaan lembur Anda'}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="emp-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>{totalThisMonth.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>
            {locale === 'en' ? 'This Month' : 'Bulan Ini'}
          </div>
        </div>
        <div className="emp-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#16A34A', lineHeight: 1 }}>{approvedHours.toFixed(1)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>
            {locale === 'en' ? 'Approved Hours' : 'Jam Disetujui'}
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={() => setSheetOpen(true)}
        style={{
          width: '100%', padding: '15px', borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
          color: '#fff', border: 'none', fontWeight: 800, fontSize: 15,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 6px 20px rgba(220,38,38,0.28)', marginBottom: 24,
          transition: 'all 0.2s ease',
        }}
      >
        <HiClock size={18} />
        {locale === 'en' ? 'Request Overtime' : 'Ajukan Lembur'}
      </button>

      {/* History List */}
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: 'var(--text)' }}>
        {locale === 'en' ? 'Overtime History' : 'Riwayat Lembur'}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />)}
        </div>
      ) : overtimes.length === 0 ? (
        <div className="emp-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <HiClock size={36} style={{ color: 'var(--border)', marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{locale === 'en' ? 'No overtime records yet' : 'Belum ada riwayat lembur'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{locale === 'en' ? 'Submit an overtime request above.' : 'Ajukan permintaan lembur di atas.'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {overtimes.map(o => {
            const sc = STATUS_COLORS[o.status] || STATUS_COLORS.pending;
            return (
              <div key={o.id} className="emp-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{o.date}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {(o.hours || o.duration_hours || 0)}h
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, padding: '4px 10px', borderRadius: 20 }}>
                    {locale === 'en' ? o.status : sc.label}
                  </span>
                </div>
                {o.reason && <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{o.reason}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Overtime Request Bottom Sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={locale === 'en' ? 'Request Overtime' : 'Ajukan Lembur'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setSheetOpen(false)}>{locale === 'en' ? 'Cancel' : 'Batal'}</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <HiArrowPath size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><HiPaperAirplane style={{ marginRight: 6 }} />{locale === 'en' ? 'Submit' : 'Kirim'}</>}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Date' : 'Tanggal'} *</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="emp-field-input" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="emp-field-label">{locale === 'en' ? 'Start Time' : 'Mulai'} *</label>
              <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="emp-field-input" />
            </div>
            <div>
              <label className="emp-field-label">{locale === 'en' ? 'End Time' : 'Selesai'} *</label>
              <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="emp-field-input" />
            </div>
          </div>
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Category' : 'Kategori'}</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="emp-field-input">
              <option>Reguler</option>
              <option>{locale === 'en' ? 'Weekend' : 'Akhir Pekan'}</option>
              <option>{locale === 'en' ? 'Holiday' : 'Hari Libur'}</option>
            </select>
          </div>
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Reason' : 'Alasan'} *</label>
            <textarea
              placeholder={locale === 'en' ? 'Reason for overtime...' : 'Alasan lembur...'}
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              className="emp-field-textarea"
            />
          </div>
          {form.start_time && form.end_time && (
            <div style={{ padding: '10px 14px', background: 'rgba(0,71,171,0.06)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiClock size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                {(() => {
                  const diff = (new Date(`2000-01-01T${form.end_time}`) - new Date(`2000-01-01T${form.start_time}`)) / 3600000;
                  return diff > 0 ? `${diff.toFixed(1)} ${locale === 'en' ? 'hours' : 'jam'}` : '�';
                })()}
              </span>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
