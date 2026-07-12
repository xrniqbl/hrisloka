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
import { submitOvertime, getMyOvertime } from '../../services/overtimeService';
import BottomSheet from '../../components/BottomSheet';
import { isDemoMode, DEMO_EMPLOYEE, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import '../../styles/shared.css';
import EmpEmptyState from '../../components/EmpEmptyState';

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
    if (isDemoMode()) {
      setEmp({ ...DEMO_EMPLOYEE });
      setOvertimes([...(DEMO_PROFILE_DATA.overtimes || [])]);
      setLoading(false);
      return;
    }
    const email = user?.email || user?.user_metadata?.email;
    const { data: empData } = await getEmployeeByEmail(email);
    if (!empData) { setLoading(false); return; }
    setEmp(empData);
    const { data } = await getMyOvertime(empData.id);
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
      let durationHours = (end - start) / 3600000;
      if (durationHours < 0) durationHours += 24; // overnight
      durationHours = Math.round(Math.max(0.5, durationHours) * 10) / 10;
      const reason = `[${form.category}] ${form.start_time}–${form.end_time} · ${form.reason}`;

      if (isDemoMode()) {
        setOvertimes((prev) => [{
          id: `demo-ot-${Date.now()}`,
          date: form.date,
          hours: durationHours,
          reason,
          status: 'pending',
          created_at: new Date().toISOString(),
        }, ...prev]);
        toast?.success(locale === 'en' ? 'Demo overtime submitted!' : 'Lembur demo dikirim!');
        setSheetOpen(false);
        setForm({ date: '', start_time: '', end_time: '', reason: '', category: 'Reguler' });
        setSubmitting(false);
        return;
      }

      const { error } = await submitOvertime(emp.id, {
        date: form.date,
        hours: durationHours,
        reason,
      });

      if (error) throw error;
      toast?.success(locale === 'en' ? 'Overtime request submitted!' : 'Pengajuan lembur berhasil dikirim!');
      setSheetOpen(false);
      setForm({ date: '', start_time: '', end_time: '', reason: '', category: 'Reguler' });
      load();
    } catch (err) {
      toast?.error(err?.message || (locale === 'en' ? 'Failed to submit. Please try again.' : 'Gagal mengirim. Coba lagi.'));
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
      <div className="mb">
        <h1 className="emp-page-title">
          {locale === 'en' ? 'Overtime' : 'Lembur'}
        </h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'Submit and track your overtime requests' : 'Ajukan dan pantau permintaan lembur Anda'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: 14 }}>
        <div className="emp-card" style={{ textAlign: 'center' }}>
          <div className="info-card-value primary">{totalThisMonth.length}</div>
          <div className="period-label">
            {locale === 'en' ? 'This Month' : 'Bulan Ini'}
          </div>
        </div>
        <div className="emp-card" style={{ textAlign: 'center' }}>
          <div className="info-card-value success">{approvedHours.toFixed(1)}</div>
          <div className="period-label">
            {locale === 'en' ? 'Approved Hours' : 'Jam Disetujui'}
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={() => setSheetOpen(true)}
        className="btn-primary"
        style={{ width: '100%', marginBottom: 24 }}
      >
        <HiClock size={18} />
        {locale === 'en' ? 'Request Overtime' : 'Ajukan Lembur'}
      </button>

      {/* History List */}
      <div className="section-label mb-sm">
        {locale === 'en' ? 'Overtime History' : 'Riwayat Lembur'}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />)}
        </div>
      ) : overtimes.length === 0 ? (
        <EmpEmptyState
          type="nodata"
          title={locale === 'en' ? 'No overtime yet' : 'Belum ada riwayat lembur'}
          subtitle={locale === 'en' ? 'Submit an overtime request with the form above.' : 'Ajukan lembur lewat form di atas.'}
          cta={locale === 'en' ? 'All submissions' : 'Semua pengajuan'}
          ctaHref="/app/submissions"
        />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {overtimes.map(o => {
            const sc = STATUS_COLORS[o.status] || STATUS_COLORS.pending;
            return (
              <div key={o.id} className="emp-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div className="td-semibold">{o.date}</div>
                    <div className="td-muted-sm" style={{ marginTop: 2 }}>
                      {(o.hours || o.duration_hours || 0)}h
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, padding: '4px 10px', borderRadius: 12 }}>
                    {locale === 'en' ? o.status : sc.label}
                  </span>
                </div>
                {o.reason && <div className="td-muted-sm" style={{ fontStyle: 'italic' }}>{o.reason}</div>}
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
            <div style={{ padding: '10px 14px', background: 'rgba(99,91,255,0.06)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
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

