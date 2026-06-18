import { useState, useEffect, useCallback, useRef } from 'react';
import {
  HiArrowPath,
  HiArrowUpTray,
  HiCamera,
  HiCheck,
  HiCurrencyDollar,
  HiDocument,
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

const CATEGORIES = ['Transport', 'Makan', 'Akomodasi', 'Perlengkapan', 'Lainnya'];
const STATUS_COLORS = {
  pending: { bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
  approved: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  rejected: { bg: 'rgba(220,38,38,0.1)', color: '#DC2626' },
};

export default function EmpReimbursement() {
  const { user } = useAuth();
  const toast = useToast();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const fileRef = useRef(null);
  const [form, setForm] = useState({ date: '', category: 'Transport', amount: '', description: '', receipt_url: '' });

  const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  const load = useCallback(async () => {
    const email = user?.email || user?.user_metadata?.email;
    const { data: empData } = await getEmployeeByEmail(email);
    if (!empData) { setLoading(false); return; }
    setEmp(empData);
    const { data } = await supabase
      .from('reimbursements')
      .select('*')
      .eq('employee_id', empData.id)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('emp:refresh', handler);
    return () => window.removeEventListener('emp:refresh', handler);
  }, [load]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !emp) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `reimbursements/${emp.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
      setReceiptUrl(publicUrl);
      setForm(f => ({ ...f, receipt_url: publicUrl }));
      toast?.success(locale === 'en' ? 'Receipt uploaded!' : 'Bukti berhasil diunggah!');
    } catch {
      toast?.error(locale === 'en' ? 'Upload failed' : 'Gagal mengunggah');
    }
    setUploadingPhoto(false);
  };

  const handleSubmit = async () => {
    if (!form.date || !form.amount || !form.description) {
      toast?.error(locale === 'en' ? 'Please fill all required fields' : 'Harap isi semua kolom wajib');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reimbursements').insert({
        employee_id: emp.id,
        date: form.date,
        category: form.category,
        amount: parseInt(form.amount.replace(/\D/g, '')) || 0,
        notes: form.description,
        receipt_url: form.receipt_url || null,
        status: 'pending',
      });
      if (error) throw error;
      toast?.success(locale === 'en' ? 'Reimbursement request submitted!' : 'Pengajuan reimburse berhasil dikirim!');
      setSheetOpen(false);
      setForm({ date: '', category: 'Transport', amount: '', description: '', receipt_url: '' });
      setReceiptUrl('');
      load();
    } catch {
      toast?.error(locale === 'en' ? 'Failed to submit' : 'Gagal mengirim');
    }
    setSubmitting(false);
  };

  const pendingTotal = items.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0);
  const approvedTotal = items.filter(i => i.status === 'approved').reduce((s, i) => s + (i.amount || 0), 0);


  return (
    <div className="emp-page">
      <div style={{ marginBottom: 20 }}>
        <h1 className="emp-page-title">
          {locale === 'en' ? 'Reimbursement' : 'Reimburse'}
        </h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'Submit expense reimbursement with receipt' : 'Ajukan penggantian biaya dengan bukti pembayaran'}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="emp-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: '#D97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            {locale === 'en' ? 'Pending' : 'Menunggu'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#D97706' }}>{fmt(pendingTotal)}</div>
        </div>
        <div className="emp-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            {locale === 'en' ? 'Approved' : 'Disetujui'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#16A34A' }}>{fmt(approvedTotal)}</div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => setSheetOpen(true)}
        style={{
          width: '100%', padding: '15px', borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          color: '#fff', border: 'none', fontWeight: 800, fontSize: 15,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 6px 20px rgba(124,58,237,0.28)', marginBottom: 24,
          transition: 'all 0.2s ease',
        }}
      >
        <HiCurrencyDollar size={18} />
        {locale === 'en' ? 'Submit Reimbursement' : 'Ajukan Reimburse'}
      </button>

      {/* List */}
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: 'var(--text)' }}>
        {locale === 'en' ? 'Request History' : 'Riwayat Pengajuan'}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="emp-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <HiCurrencyDollar size={36} style={{ color: 'var(--border)', marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{locale === 'en' ? 'No reimbursements yet' : 'Belum ada pengajuan reimburse'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{locale === 'en' ? 'Submit your first reimbursement above.' : 'Ajukan reimburse pertama Anda di atas.'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map(item => {
            const sc = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
            return (
              <div key={item.id} className="emp-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 6 }}>{item.category}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.date}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>{fmt(item.amount)}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{item.description}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, padding: '4px 10px', borderRadius: 20 }}>
                      {item.status === 'pending' ? (locale === 'en' ? 'Pending' : 'Menunggu')
                        : item.status === 'approved' ? (locale === 'en' ? 'Approved' : 'Disetujui')
                        : (locale === 'en' ? 'Rejected' : 'Ditolak')}
                    </span>
                    {item.receipt_url && (
                      <a href={item.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <HiDocument size={11} /> {locale === 'en' ? 'Receipt' : 'Bukti'}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setReceiptUrl(''); }}
        title={locale === 'en' ? 'Submit Reimbursement' : 'Ajukan Reimburse'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setSheetOpen(false); setReceiptUrl(''); }}>{locale === 'en' ? 'Cancel' : 'Batal'}</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <HiArrowPath size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><HiPaperAirplane style={{ marginRight: 6 }} />{locale === 'en' ? 'Submit' : 'Kirim'}</>}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Expense Date' : 'Tanggal Pengeluaran'} *</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="emp-field-input" />
          </div>
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Category' : 'Kategori'}</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="emp-field-input">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Amount (IDR)' : 'Jumlah (IDR)'} *</label>
            <input
              type="number"
              placeholder={locale === 'en' ? 'e.g. 150000' : 'Contoh: 150000'}
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="emp-field-input"
            />
          </div>
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Description' : 'Keterangan'} *</label>
            <textarea
              placeholder={locale === 'en' ? 'Expense details...' : 'Keterangan pengeluaran...'}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="emp-field-textarea"
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 8 }}>
              {locale === 'en' ? 'Receipt / Proof of Payment' : 'Bukti Pembayaran'}
            </label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            {receiptUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
                <HiCheck size={16} style={{ color: '#16A34A' }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#16A34A' }}>{locale === 'en' ? 'Receipt uploaded' : 'Bukti terunggah'}</span>
                <button onClick={() => { setReceiptUrl(''); setForm(f => ({ ...f, receipt_url: '' })); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                  <HiXMark size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto}
                style={{
                  width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
                  border: '2px dashed var(--border)', background: 'var(--bg)',
                  color: 'var(--muted)', fontFamily: 'inherit', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 13, fontWeight: 600,
                }}
              >
                {uploadingPhoto
                  ? <HiArrowPath size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <><HiArrowUpTray size={16} /> {locale === 'en' ? 'Upload Receipt' : 'Unggah Bukti'}</>}
              </button>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
