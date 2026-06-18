import { useState, useRef, useCallback } from 'react';
import {
  HiArrowUpTray,
  HiCamera,
  HiCheckCircle,
  HiCurrencyDollar,
  HiDocumentText,
  HiXMark,
  HiArrowPath,
  HiReceiptPercent,
  HiPhoto,
} from 'react-icons/hi2';
import { createWorker } from 'tesseract.js';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

// ── Receipt OCR parser ────────────────────────────────────────────────────────
function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let amount = 0;
  const amountPatterns = [
    /(?:total|jumlah|bayar|grand total|amount)[^\d]*([0-9][0-9.,\s]{2,})/i,
    /rp\.?\s*([0-9][0-9.,\s]{2,})/i,
    /([0-9]{1,3}(?:[.,][0-9]{3})+)/,
  ];
  for (const pat of amountPatterns) {
    for (const line of lines) {
      const m = line.match(pat);
      if (m) {
        const raw = m[1].replace(/[\s,]/g, '').replace('.', '');
        const num = parseInt(raw, 10);
        if (num > 0 && num > amount) amount = num;
      }
    }
    if (amount > 0) break;
  }

  const merchant = lines[0] || '';

  let date = '';
  const datePattern = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
  for (const line of lines) {
    const m = line.match(datePattern);
    if (m) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3];
      date = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      break;
    }
  }
  if (!date) date = new Date().toISOString().split('T')[0];

  const textLower = text.toLowerCase();
  let category = 'Lainnya';
  if (/bbm|bensin|parking|parkir|toll|tol|grab|gojek|taxi|ojek|transjakarta|busway/i.test(textLower)) category = 'Transportasi';
  else if (/restaurant|resto|cafe|kafe|makan|lunch|dinner|breakfast|indomaret|alfamart|food|minuman/i.test(textLower)) category = 'Makan';
  else if (/apotik|apotek|klinik|dokter|rumah sakit|obat|medis|health/i.test(textLower)) category = 'Kesehatan';
  else if (/hotel|penginapan|villa|meeting|conference|seminar/i.test(textLower)) category = 'Akomodasi';
  else if (/atk|alat tulis|kertas|pulpen|printer|komputer|laptop|elektronik/i.test(textLower)) category = 'Operasional';

  return { amount, merchant, date, category };
}

const CATEGORIES = ['Transportasi', 'Makan', 'Kesehatan', 'Akomodasi', 'Operasional', 'Lainnya'];

export default function EmpExpenseOCR() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const toast = useToast();
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const [emp, setEmp] = useState(null);
  const [empLoaded, setEmpLoaded] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ amount: '', category: 'Transportasi', notes: '', date: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadEmp = useCallback(async () => {
    if (empLoaded) return;
    const { data } = await getEmployeeByEmail(user?.email);
    setEmp(data);
    setEmpLoaded(true);
  }, [user, empLoaded]);

  const handleImage = async (file) => {
    if (!file) return;
    await loadEmp();
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setResult(null);
    setSubmitted(false);
    setScanning(true);
    setScanProgress(0);

    try {
      const worker = await createWorker('ind+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') setScanProgress(Math.round((m.progress || 0) * 100));
        },
      });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const parsed = parseReceiptText(text);
      setResult({ ...parsed, rawText: text });
      setForm({
        amount: parsed.amount > 0 ? String(parsed.amount) : '',
        category: parsed.category,
        notes: parsed.merchant || '',
        date: parsed.date,
      });
    } catch {
      toast.error(locale === 'en'
        ? 'Failed to scan. Try a clearer photo.'
        : 'Gagal scan. Coba dengan foto yang lebih jelas.');
    } finally {
      setScanning(false);
      setScanProgress(0);
    }
  };

  const handleSubmit = async () => {
    if (!form.amount || !emp) return;
    setSubmitting(true);
    try {
      let fileUrl = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `receipts/${emp.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('employee-documents')
          .upload(fileName, imageFile, { upsert: true });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('employee-documents')
            .getPublicUrl(fileName);
          fileUrl = publicUrl;
        }
      }

      const { error } = await supabase.from('reimbursements').insert({
        employee_id: emp.id,
        category: form.category,
        amount: parseInt(form.amount, 10),
        notes: form.notes,
        date: form.date || new Date().toISOString().split('T')[0],
        receipt_url: fileUrl,
        status: 'pending',
      });

      if (error) throw error;
      setSubmitted(true);
      toast.success(locale === 'en' ? 'Expense submitted!' : 'Reimburse berhasil diajukan!');
    } catch {
      toast.error(locale === 'en' ? 'Failed to submit. Try again.' : 'Gagal submit. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setImageFile(null);
    setImageUrl(null);
    setResult(null);
    setSubmitted(false);
    setForm({ amount: '', category: 'Transportasi', notes: '', date: '' });
    if (fileRef.current) fileRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  // ── Success State ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="emp-page">
        <div className="emp-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: 'rgba(16,185,129,0.1)',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <HiCheckCircle size={32} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
            {locale === 'en' ? 'Expense Submitted' : 'Reimburse Terkirim'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
            Rp {parseInt(form.amount, 10).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 28 }}>
            {form.category}
          </div>
          <button
            onClick={reset}
            className="btn-primary"
            style={{ width: '100%', maxWidth: 280 }}
          >
            {locale === 'en' ? 'Scan Another Receipt' : 'Scan Struk Lagi'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="emp-page">
      {/* Header */}
      <div className="emp-page-header">
        <h1 className="emp-page-title">
          {locale === 'en' ? 'Scan Receipt' : 'Scan Struk'}
        </h1>
        <p className="emp-page-subtitle">
          {locale === 'en'
            ? 'Photograph your receipt to auto-fill reimbursement'
            : 'Foto struk untuk mengisi reimburse secara otomatis'}
        </p>
      </div>

      {/* Upload / Camera area */}
      {!imageUrl && (
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {/* Camera — primary action */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => handleImage(e.target.files?.[0])}
          />
          <button
            onClick={() => cameraRef.current?.click()}
            style={{
              padding: '24px 16px',
              borderRadius: 'var(--radius-md)',
              border: '2px dashed var(--primary)',
              background: 'rgba(0,71,171,0.03)',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(0,71,171,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <HiCamera size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                {locale === 'en' ? 'Take Photo' : 'Ambil Foto Struk'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>
                {locale === 'en' ? 'Use camera to capture receipt' : 'Pakai kamera untuk foto struk'}
              </div>
            </div>
          </button>

          {/* File picker — secondary */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleImage(e.target.files?.[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', gap: 8 }}
          >
            <HiPhoto size={16} />
            {locale === 'en' ? 'Upload from Gallery' : 'Pilih dari Galeri'}
          </button>
        </div>
      )}

      {/* Receipt Preview */}
      {imageUrl && (
        <div className="emp-card" style={{ marginBottom: 16, overflow: 'hidden', padding: 0 }}>
          <div style={{ position: 'relative' }}>
            <img
              src={imageUrl}
              alt={locale === 'en' ? 'Receipt preview' : 'Preview struk'}
              style={{
                width: '100%',
                maxHeight: 280,
                objectFit: 'contain',
                display: 'block',
                background: 'var(--bg)',
              }}
            />
            {!scanning && (
              <button
                onClick={reset}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.55)',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Hapus foto"
              >
                <HiXMark size={15} />
              </button>
            )}
          </div>

          {/* Scan progress */}
          {scanning && (
            <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HiArrowPath
                    size={14}
                    style={{ color: 'var(--primary)', animation: 'spin 0.8s linear infinite' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {locale === 'en' ? 'Scanning receipt...' : 'Memindai struk...'}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                  {scanProgress}%
                </span>
              </div>
              <div className="emp-progress-bar">
                <div
                  className="emp-progress-fill"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form after OCR result */}
      {result && !scanning && (
        <div className="emp-card" style={{ padding: 18 }}>
          {/* Auto-detected badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 16,
            padding: '5px 12px',
            background: 'rgba(16,185,129,0.08)',
            borderRadius: 8,
            border: '1px solid rgba(16,185,129,0.15)',
          }}>
            <HiReceiptPercent size={13} style={{ color: '#10B981' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
              {locale === 'en' ? 'Auto-detected from receipt' : 'Terdeteksi otomatis dari struk'}
            </span>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {/* Amount */}
            <div className="emp-form-group">
              <label className="emp-label">
                {locale === 'en' ? 'Amount (Rp)' : 'Jumlah (Rp)'}
                <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <HiCurrencyDollar
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="number"
                  className="emp-input"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  style={{ paddingLeft: 36 }}
                  placeholder="0"
                />
              </div>
              {result.amount > 0 && (
                <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>
                  Terdeteksi: Rp {result.amount.toLocaleString('id-ID')}
                </div>
              )}
            </div>

            {/* Category */}
            <div className="emp-form-group">
              <label className="emp-label">
                {locale === 'en' ? 'Category' : 'Kategori'}
              </label>
              <select
                className="emp-input"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Date */}
            <div className="emp-form-group">
              <label className="emp-label">
                {locale === 'en' ? 'Date' : 'Tanggal'}
              </label>
              <input
                type="date"
                className="emp-input"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div className="emp-form-group">
              <label className="emp-label">
                {locale === 'en' ? 'Notes / Merchant' : 'Catatan / Nama Toko'}
              </label>
              <input
                className="emp-input"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={locale === 'en' ? 'e.g. Grab, Indomaret, Warung...' : 'Contoh: Grab, Indomaret, Warung...'}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 20 }}>
            <button className="btn-secondary" onClick={reset}>
              {locale === 'en' ? 'Cancel' : 'Batal'}
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !form.amount}
              style={{ gap: 8 }}
            >
              {submitting ? (
                <>
                  <HiArrowPath size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                  {locale === 'en' ? 'Submitting...' : 'Mengirim...'}
                </>
              ) : (
                <>
                  <HiDocumentText size={14} />
                  {locale === 'en' ? 'Submit' : 'Ajukan Reimburse'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
