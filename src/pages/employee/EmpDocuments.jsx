import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HiArrowDownTray,
  HiArrowPath,
  HiArrowUpTray,
  HiBellAlert,
  HiCheck,
  HiClock,
  HiDocumentText,
  HiXMark
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { uploadDocument, getEmployeeDocuments } from '../../services/documentService';
import DocLink from '../../components/DocLink';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import { isDemoMode, DEMO_EMPLOYEE, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import EmpEmptyState from '../../components/EmpEmptyState';
import '../../styles/shared.css';


export default function EmpDocuments() {
  const { user, employee: authEmployee } = useAuth();
  const { locale } = useTranslation();
  const toast = useToast();
  const fileRef = useRef(null);
  const [emp, setEmp] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('ktp');

  const loadData = useCallback(async () => {
    setLoading(true);
    if (isDemoMode()) {
      setEmp({ ...DEMO_EMPLOYEE });
      setDocuments((DEMO_PROFILE_DATA.documents || []).map((d) => ({
        ...d,
        document_type: d.type,
        file_name: d.type,
        file_url: d.url,
      })));
      setLoading(false);
      return;
    }
    let empData = authEmployee;
    if (!empData?.id) {
      const email = user?.email || user?.user_metadata?.email;
      const res = await getEmployeeByEmail(email);
      empData = res.data;
    }
    if (empData) {
      setEmp(empData);
      const { data: docs } = await getEmployeeDocuments(empData.id);
      setDocuments(docs || []);
    }
    setLoading(false);
  }, [user, authEmployee]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !emp) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(locale === 'en' ? 'Max file size is 10MB.' : 'Ukuran file maksimal 10MB.');
      e.target.value = '';
      return;
    }
    const okType = /pdf|jpe?g|png|webp/i.test(file.type || '') || /\.(pdf|jpe?g|png|webp)$/i.test(file.name || '');
    if (!okType) {
      toast.error(locale === 'en' ? 'Only PDF / JPG / PNG allowed.' : 'Hanya PDF / JPG / PNG yang diizinkan.');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      if (isDemoMode()) {
        setDocuments((prev) => [{
          id: `demo-doc-${Date.now()}`,
          document_type: uploadType,
          file_name: file.name,
          file_url: '#',
          status: 'pending',
          created_at: new Date().toISOString(),
        }, ...prev]);
        toast.success(locale === 'en' ? 'Demo document added!' : 'Dokumen demo ditambahkan!');
        setUploading(false);
        e.target.value = '';
        return;
      }

      // Secure path: private storage + path in DB (signed URL on open)
      const { data, error } = await uploadDocument(file, emp.id, uploadType, {
        companyId: emp.company_id,
      });
      if (error) throw error;

      await loadData();
      toast.success(locale === 'en' ? 'Document uploaded securely!' : 'Dokumen tersimpan dengan aman!');
      if (data) {
        // no-op — list refreshed
      }
    } catch (err) {
      const msg = err?.message || (locale === 'en' ? 'Failed to upload document.' : 'Gagal mengunggah dokumen.');
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) return (
    <div className="ep-loading-wrap">
      <div style={{ marginBottom: 12 }}>
        <div className="skeleton skeleton-text" style={{ width: 130, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 220 }} />
      </div>
      <div className="emp-card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="skeleton" style={{ height: 88, borderRadius: 8 }} />
      </div>
      {[1,2,3].map(i => <div key={i} className="emp-card" style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 8 }}>
        <div className="skeleton skeleton-circle" style={{ width: 44, height: 44, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: 6 }} />
          <div className="skeleton skeleton-text-sm" style={{ width: '40%' }} />
        </div>
      </div>)}
    </div>
  );

  const DOC_TYPES = locale === 'en' ? [
    { value: 'ktp', label: 'ID Card (KTP)', required: true },
    { value: 'npwp', label: 'Tax Number (NPWP)', required: false },
    { value: 'ijazah', label: 'Diploma / Certificate', required: true },
    { value: 'skck', label: 'Police Clearance (SKCK)', required: false },
    { value: 'bpjs', label: 'Health Insurance (BPJS)', required: true },
    { value: 'bank', label: 'Bank Account Book', required: true },
    { value: 'cv', label: 'CV / Resume', required: false },
    { value: 'contract', label: 'Work Contract', required: true },
    { value: 'other', label: 'Other Documents', required: false },
  ] : [
    { value: 'ktp', label: 'KTP', required: true },
    { value: 'npwp', label: 'NPWP', required: false },
    { value: 'ijazah', label: 'Ijazah', required: true },
    { value: 'skck', label: 'SKCK', required: false },
    { value: 'bpjs', label: 'BPJS Kesehatan', required: true },
    { value: 'bank', label: 'Buku Rekening', required: true },
    { value: 'cv', label: 'CV / Resume', required: false },
    { value: 'contract', label: 'Kontrak Kerja', required: true },
    { value: 'other', label: 'Dokumen Lainnya', required: false },
  ];

  const STATUS_CONFIG = {
    pending: { label: locale === 'en' ? 'Pending' : 'Menunggu', color: '#F59E0B', icon: <HiClock size={12} /> },
    approved: { label: locale === 'en' ? 'Approved' : 'Disetujui', color: '#16A34A', icon: <HiCheck size={12} /> },
    rejected: { label: locale === 'en' ? 'Rejected' : 'Ditolak', color: '#DC2626', icon: <HiXMark size={12} /> },
  };

  const uploadedTypes = new Set(documents.map(d => d.document_type));
  const requiredMissing = DOC_TYPES.filter(d => d.required && !uploadedTypes.has(d.value));

  return (
    <div className="emp-page">
      <div className="mb">
        <h1 className="emp-page-title">{locale === 'en' ? 'My Documents' : 'Dokumen Saya'}</h1>
        <p className="emp-page-subtitle">{locale === 'en' ? 'Manage and upload administrative documents' : 'Kelola dan unggah dokumen administratif'}</p>
      </div>

      {/* Missing required docs warning */}
      {requiredMissing.length > 0 && (
        <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #F59E0B', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <HiBellAlert size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>
              {locale === 'en' ? 'Required Documents Incomplete' : 'Dokumen Wajib Belum Lengkap'}
            </div>
            <div style={{ fontSize: 12, color: '#92400E' }}>{requiredMissing.map(d => d.label).join(', ')}</div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="emp-card mb-sm">
        <div className="section-label mb-sm">{locale === 'en' ? 'Upload Document' : 'Unggah Dokumen'}</div>
        <div className="emp-doc-upload">
          <div>
            <label className="emp-field-label">{locale === 'en' ? 'Document Type' : 'Jenis Dokumen'}</label>
            <select
              className="emp-field-input"
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}{d.required ? ' *' : ''}
                </option>
              ))}
            </select>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} style={{ display: 'none' }} />
          <button
            type="button"
            className="emp-doc-upload-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? <><HiArrowPath size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> {locale === 'en' ? 'Uploading…' : 'Mengunggah…'}</>
              : <><HiArrowUpTray size={14} /> {locale === 'en' ? 'Select file (PDF / JPG / PNG)' : 'Pilih file (PDF / JPG / PNG)'}</>}
          </button>
        </div>
      </div>

      {/* Document List */}
      <div className="section-label mb-sm">
        {locale === 'en' ? `Uploaded Documents (${documents.length})` : `Dokumen Terunggah (${documents.length})`}
      </div>
      {documents.length === 0 ? (
        <EmpEmptyState
          type="nodata"
          title={locale === 'en' ? 'No documents yet' : 'Belum ada dokumen'}
          subtitle={locale === 'en' ? 'Upload admin documents (KTP, NPWP, etc.) so HR can verify them.' : 'Unggah dokumen admin (KTP, NPWP, dll.) agar HR dapat memverifikasi.'}
          cta={locale === 'en' ? 'Choose file' : 'Pilih file'}
          ctaAction={() => fileRef.current?.click()}
          secondaryCta={locale === 'en' ? 'Home' : 'Beranda'}
          secondaryHref="/app/home"
        />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {documents.map(doc => {
            const statusConf = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
            const docType = DOC_TYPES.find(d => d.value === doc.document_type);
            return (
              <div key={doc.id} className="emp-card emp-doc-row">
                <div className="emp-doc-row-icon" style={{ background: `${statusConf.color}14`, color: statusConf.color }}>
                  <HiDocumentText size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{docType?.label || doc.document_type}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{new Date(doc.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID')}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, color: statusConf.color, background: `${statusConf.color}12` }}>
                    {statusConf.icon} {statusConf.label}
                  </span>
                  {(doc.file_url || doc.url) && doc.file_url !== '#' && (
                    <DocLink
                      docRef={doc.file_url || doc.url}
                      title={locale === 'en' ? 'Download' : 'Unduh'}
                      download
                      ownerEmployeeId={doc.employee_id || emp?.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      <HiArrowDownTray size={12} /> {locale === 'en' ? 'Download' : 'Unduh'}
                    </DocLink>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
