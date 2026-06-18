import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus, FiEye, FiCheck, FiX, FiUpload, FiAlertTriangle, FiDollarSign, FiCamera, FiImage, FiCpu, FiLoader } from 'react-icons/fi';
import * as reimbursementService from '../services/reimbursementService';
import { useAuth } from '../context/AuthContext';
import * as employeeService from '../services/employeeService';

import { supabase } from '../lib/supabase';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;
const statusColors = { pending: '#F59E0B', approved: '#0047AB', paid: '#16A34A', rejected: '#DC2626' };
const statusLabels = { pending: 'Pending', approved: 'Approved', paid: 'Paid', rejected: 'Rejected' };

// -- OCR Helpers -------------------------------------------------------------

/**
 * Extract Rupiah amount from OCR text.
 * Handles formats: Rp 150.000 / Rp150000 / 150,000 / 150.000
 */
function extractAmount(text) {
  // Match Rp followed by number with dots/commas
  const patterns = [
    /Rp\.?\s*([\d.,]+)/gi,
    /Total\s*:?\s*Rp\.?\s*([\d.,]+)/gi,
    /TOTAL\s*:?\s*Rp\.?\s*([\d.,]+)/gi,
    /Grand\s*Total\s*:?\s*Rp\.?\s*([\d.,]+)/gi,
    /Jumlah\s*:?\s*Rp\.?\s*([\d.,]+)/gi,
    /BAYAR\s*:?\s*Rp\.?\s*([\d.,]+)/gi,
  ];

  let best = null;
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      // Clean separator - Indonesian uses dots for thousands, comma for decimal
      const cleaned = match[1].replace(/\./g, '').replace(',', '');
      const num = parseInt(cleaned, 10);
      if (!isNaN(num) && num > 0 && num < 100_000_000) {
        if (!best || num > best) best = num;
      }
      pattern.lastIndex = 0;
    }
  }
  return best;
}

/**
 * Extract date from OCR text.
 */
function extractDate(text) {
  const patterns = [
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,        // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,          // YYYY-MM-DD
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des|January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
  ];

  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return m[0];
  }
  return null;
}

/**
 * Extract merchant/store name (first meaningful line of receipt).
 */
function extractMerchant(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 60);
  // Try to find a store-like name (usually at top of receipt)
  for (const line of lines.slice(0, 6)) {
    if (!/\d{5,}/.test(line) && !/Rp/i.test(line) && !/Total/i.test(line)) {
      return line;
    }
  }
  return null;
}

export default function ExpenseOCR() {
  const { employee } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ employeeId: '', category: 'Transport', manualAmount: '', notes: '' });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null); // { amount, date, merchant, rawText }
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => { if (employee?.company_id) fetchData(); }, [employee?.company_id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: reimbData } = await reimbursementService.getAllReimbursements(employee?.company_id);
    const { data: empData } = await employeeService.getAllEmployees(undefined, employee?.company_id);
    setExpenses(reimbData || []);
    setEmployees(empData || []);
    setLoading(false);
  };

  const getEmpName = (id) => employees.find(e => e.id === id)?.name || '-';

  const totalPending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalApproved = expenses.filter(e => e.status === 'approved' || e.status === 'paid').reduce((s, e) => s + Number(e.amount || 0), 0);

  const stats = [
    { label: 'Total Expense', value: expenses.length, color: '#0047AB', icon: <FiDollarSign /> },
    { label: 'Pending Review', value: formatCurrency(totalPending), color: '#F59E0B', icon: <FiAlertTriangle />, isText: true },
    { label: 'Approved/Paid', value: formatCurrency(totalApproved), color: '#16A34A', icon: <FiCheck />, isText: true },
    { label: 'Rejected', value: expenses.filter(e => e.status === 'rejected').length, color: '#DC2626', icon: <FiX /> },
  ];

  const openSubmit = () => {
    setForm({ employeeId: '', category: 'Transport', manualAmount: '', notes: '' });
    setReceiptFile(null);
    setReceiptPreview(null);
    setOcrResult(null);
    setOcrProgress(0);
    setModal('submit');
  };
  const openView = (e) => { setSelected(e); setModal('view'); };
  const closeModal = () => { setModal(null); setSelected(null); setReceiptFile(null); setReceiptPreview(null); setOcrResult(null); };

  // -- OCR: Run Tesseract on the uploaded image ------------------------------
  const runOCR = useCallback(async (file) => {
    setOcrLoading(true);
    setOcrProgress(0);
    setOcrResult(null);

    try {
      // Dynamic import so Tesseract.js only loads when needed (saves ~2MB on initial load)
      const Tesseract = (await import('tesseract.js')).default;

      const result = await Tesseract.recognize(file, 'ind+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      const amount = extractAmount(text);
      const date = extractDate(text);
      const merchant = extractMerchant(text);

      const ocrData = { amount, date, merchant, rawText: text };
      setOcrResult(ocrData);

      // Auto-fill form amount if extracted
      if (amount) {
        setForm(prev => ({ ...prev, manualAmount: String(amount) }));
      }
      if (merchant) {
        setForm(prev => ({ ...prev, notes: prev.notes || `${merchant}${date ? ` | ${date}` : ''}` }));
      }
    } catch (err) {
      console.error('OCR error:', err);
      setOcrResult({ error: 'Gagal membaca struk. Coba foto yang lebih jelas.' });
    }
    setOcrLoading(false);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result);
    reader.readAsDataURL(file);
    // Automatically run OCR
    runOCR(file);
  };

  const handleSubmit = async () => {
    const empId = Number(form.employeeId);
    if (!empId || !form.manualAmount) return;
    setUploading(true);

    let receiptUrl = null;
    if (receiptFile) {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `expense_${empId}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile, { cacheControl: '3600', upsert: false });
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        receiptUrl = urlData?.publicUrl || null;
      }
    }

    await reimbursementService.submitReimbursement(empId, {
      category: form.category,
      amount: Number(form.manualAmount),
      notes: form.notes,
      receiptUrl,
    });
    setUploading(false);
    closeModal();
    fetchData();
  };

  const handleApprove = async (id) => {
    await reimbursementService.updateReimbursement(id, { status: 'approved' });
    fetchData();
  };
  const handleReject = async (id) => {
    await reimbursementService.updateReimbursement(id, { status: 'rejected' });
    fetchData();
  };

  if (loading) return <PageSkeleton hasStats={false} tableRows={6} tableCols={4} />;
  return (
    <div>
      <div className="page-header">
        <h1>
          <FiCpu style={{ marginRight: 8, color: '#7C3AED' }} />
          Expense & Reimbursement <span style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED', background: 'rgba(124,58,237,0.1)', padding: '2px 8px', borderRadius: 20, marginLeft: 8 }}>OCR Smart Scan</span>
        </h1>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={openSubmit}><FiPlus /> Submit Expense</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ color: s.color, fontSize: 20 }}>{s.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: s.isText ? 18 : 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="data-table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Karyawan</th><th>Kategori</th><th>Tanggal</th><th>Jumlah</th><th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(e => {
              const empName = e.employees?.name || getEmpName(e.employee_id);
              return (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>EXP-{String(e.id).padStart(3, '0')}</td>
                  <td style={{ fontWeight: 600 }}>{empName}</td>
                  <td>{e.type || e.category || '-'}</td>
                  <td style={{ fontSize: 13 }}>{new Date(e.created_at).toLocaleDateString('id-ID')}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: statusColors[e.status] }}>
                      {statusLabels[e.status]}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="action-btn" onClick={() => openView(e)}><FiEye /></button>
                      {e.status === 'pending' && (
                        <>
                          <button className="action-btn" style={{ color: '#16A34A', borderColor: '#16A34A' }} onClick={() => handleApprove(e.id)}><FiCheck /></button>
                          <button className="action-btn danger" onClick={() => handleReject(e.id)}><FiX /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {expenses.length === 0 && (
              <tr><td colSpan={7} className="empty-state">Belum ada data expense.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Expense - EXP-{String(selected.id).padStart(3, '0')}</h2>
              <button className="modal-close" onClick={closeModal}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--muted)' }}>Karyawan</label>
                  <div style={{ fontWeight: 600 }}>{selected.employees?.name || getEmpName(selected.employee_id)}</div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--muted)' }}>Kategori</label>
                  <div style={{ fontWeight: 600 }}>{selected.type || selected.category}</div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--muted)' }}>Jumlah</label>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0047AB' }}>{formatCurrency(selected.amount)}</div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--muted)' }}>Status</label>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff', background: statusColors[selected.status], display: 'inline-block' }}>
                    {statusLabels[selected.status]}
                  </span>
                </div>
              </div>
              {selected.description && (
                <div style={{ marginTop: 16, padding: 14, background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: 13, lineHeight: 1.5 }}>
                  <strong>Deskripsi:</strong> {selected.description}
                </div>
              )}
              {selected.receipt_url && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Struk / Receipt</div>
                  <img src={selected.receipt_url} alt="Receipt" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 12, objectFit: 'contain', border: '1px solid var(--border)' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal with OCR */}
      {modal === 'submit' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiCpu style={{ marginRight: 8, color: '#7C3AED' }} /> Submit Expense - Smart OCR Scan</h2>
              <button className="modal-close" onClick={closeModal}><FiX /></button>
            </div>
            <div className="modal-body">
              {/* Receipt Upload + OCR Section */}
              <div style={{ marginBottom: 20, padding: 16, background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(99,102,241,0.03))', borderRadius: 12, border: '1.5px dashed rgba(124,58,237,0.3)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiCamera /> Scan Struk / Kwitansi (AI OCR)
                </div>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn-secondary btn-sm"
                    style={{ borderColor: '#7C3AED', color: '#7C3AED' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FiCamera /> Foto Struk
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute('capture');
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <FiImage /> Pilih dari Galeri
                  </button>
                </div>

                {/* OCR Progress */}
                {ocrLoading && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#7C3AED', marginBottom: 6 }}>
                      <FiLoader style={{ animation: 'spin 1s linear infinite' }} />
                      Membaca struk... {ocrProgress}%
                    </div>
                    <div style={{ height: 6, background: 'rgba(124,58,237,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${ocrProgress}%`, height: '100%', background: '#7C3AED', borderRadius: 3, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )}

                {/* OCR Result */}
                {ocrResult && !ocrLoading && (
                  <div style={{ marginTop: 12, padding: 12, background: ocrResult.error ? 'rgba(220,38,38,0.06)' : 'rgba(22,163,74,0.06)', borderRadius: 10, border: `1px solid ${ocrResult.error ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}` }}>
                    {ocrResult.error ? (
                      <div style={{ fontSize: 13, color: '#DC2626' }}>{ocrResult.error}</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', marginBottom: 6 }}>? OCR Berhasil - Data terdeteksi:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13 }}>
                          {ocrResult.amount && (
                            <div style={{ padding: '6px 10px', background: '#fff', borderRadius: 8, border: '1px solid rgba(22,163,74,0.2)' }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>JUMLAH</div>
                              <div style={{ fontWeight: 700, color: '#0047AB' }}>{formatCurrency(ocrResult.amount)}</div>
                            </div>
                          )}
                          {ocrResult.date && (
                            <div style={{ padding: '6px 10px', background: '#fff', borderRadius: 8, border: '1px solid rgba(22,163,74,0.2)' }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>TANGGAL</div>
                              <div style={{ fontWeight: 700 }}>{ocrResult.date}</div>
                            </div>
                          )}
                          {ocrResult.merchant && (
                            <div style={{ gridColumn: '1/-1', padding: '6px 10px', background: '#fff', borderRadius: 8, border: '1px solid rgba(22,163,74,0.2)' }}>
                              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>MERCHANT</div>
                              <div style={{ fontWeight: 700 }}>{ocrResult.merchant}</div>
                            </div>
                          )}
                          {!ocrResult.amount && !ocrResult.date && !ocrResult.merchant && (
                            <div style={{ gridColumn: '1/-1', fontSize: 12, color: '#D97706' }}>
                              ?? Tidak ada data terdeteksi - isi manual di bawah
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Receipt Preview */}
                {receiptPreview && (
                  <div style={{ marginTop: 12, position: 'relative', display: 'inline-block' }}>
                    <img src={receiptPreview} alt="Receipt" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--border)' }} />
                    <button
                      onClick={() => { setReceiptFile(null); setReceiptPreview(null); setOcrResult(null); }}
                      style={{ position: 'absolute', top: 4, right: 4, background: '#DC2626', border: 'none', borderRadius: '50%', width: 22, height: 22, color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FiX size={11} />
                    </button>
                  </div>
                )}
              </div>

              {/* Rest of form */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Karyawan</label>
                  <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                    <option value="">- Pilih -</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="Transport">Transport</option>
                    <option value="Medical">Medical</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Makan">Makan</option>
                    <option value="Akomodasi">Akomodasi</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Jumlah
                    {ocrResult?.amount && <span style={{ fontSize: 11, color: '#7C3AED', marginLeft: 6, fontWeight: 600 }}>? dari OCR</span>}
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.manualAmount}
                    onChange={e => setForm({ ...form, manualAmount: e.target.value })}
                    placeholder="350000"
                    style={ocrResult?.amount ? { borderColor: '#7C3AED', background: 'rgba(124,58,237,0.03)' } : {}}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Notes / Keterangan</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Deskripsi pengeluaran..." rows={2} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>Batal</button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!form.employeeId || !form.manualAmount || uploading || ocrLoading}
              >
                {uploading ? 'Mengupload...' : 'Submit Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
