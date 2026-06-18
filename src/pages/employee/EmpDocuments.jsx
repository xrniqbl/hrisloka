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
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';


export default function EmpDocuments() {
  const { user } = useAuth();
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
    const email = user?.email || user?.user_metadata?.email;
    const { data: empData } = await getEmployeeByEmail(email);
    if (empData) {
      setEmp(empData);
      const { data: docs } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', empData.id)
        .order('created_at', { ascending: false });
      setDocuments(docs || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !emp) return;
    setUploading(true);
    try {
      const fileName = `${emp.id}/${uploadType}_${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(fileName);

      await supabase.from('employee_documents').insert({
        employee_id: emp.id,
        document_type: uploadType,
        file_url: publicUrl,
        file_name: file.name,
        status: 'pending',
      });

      await loadData();
      toast.success(locale === 'en' ? 'Document uploaded successfully!' : 'Dokumen berhasil diunggah!');
    } catch (err) {
      toast.error(locale === 'en' ? 'Failed to upload document. Please try again.' : 'Gagal mengunggah dokumen. Coba lagi.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) return (
    <div style={{ animation: "fadeInUp 0.3s ease" }}>
      <div style={{ marginBottom: 16 }}>
        <div className="skeleton skeleton-text" style={{ width: 130, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 220 }} />
      </div>
      <div className="emp-card" style={{ padding: 16, marginBottom: 16 }}>
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
      <div style={{ marginBottom: 16 }}>
        <h1 className="emp-page-title">{locale === 'en' ? 'My Documents' : 'Dokumen Saya'}</h1>
        <p className="emp-page-subtitle">{locale === 'en' ? 'Manage and upload administrative documents' : 'Kelola dan unggah dokumen administratif'}</p>
      </div>

      {/* Missing required docs warning */}
      {requiredMissing.length > 0 && (
        <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #F59E0B', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
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
      <div className="emp-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{locale === 'en' ? 'Upload Document' : 'Unggah Dokumen'}</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label className="emp-label">{locale === 'en' ? 'Document Type' : 'Jenis Dokumen'}</label>
            <select
              value={uploadType}
              onChange={e => setUploadType(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13 }}
            >
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}{d.required ? ' *' : ''}</option>)}
            </select>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} style={{ display: 'none' }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '2px dashed var(--border)', background: 'var(--bg)', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit' }}
          >
            {uploading
              ? <><HiArrowPath size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> {locale === 'en' ? 'Uploading...' : 'Mengunggah...'}</>
              : <><HiArrowUpTray size={16} /> {locale === 'en' ? 'Select File (PDF / JPG / PNG)' : 'Pilih File (PDF / JPG / PNG)'}</>}
          </button>
        </div>
      </div>

      {/* Document List */}
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
        {locale === 'en' ? `Uploaded Documents (${documents.length})` : `Dokumen Terunggah (${documents.length})`}
      </div>
      {documents.length === 0 ? (
        <div className="emp-card emp-empty">
          <div className="emp-empty-icon"><HiDocumentText size={24} /></div>
          <div className="emp-empty-title">{locale === 'en' ? 'No documents yet' : 'Belum ada dokumen'}</div>
          <div className="emp-empty-desc">{locale === 'en' ? 'Upload your administrative documents above' : 'Unggah dokumen administratif di atas'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {documents.map(doc => {
            const statusConf = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
            const docType = DOC_TYPES.find(d => d.value === doc.document_type);
            return (
              <div key={doc.id} className="emp-card emp-card-stagger" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: `${statusConf.color}12`, color: statusConf.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HiDocumentText size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{docType?.label || doc.document_type}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{new Date(doc.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID')}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: statusConf.color, background: `${statusConf.color}12` }}>
                    {statusConf.icon} {statusConf.label}
                  </span>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                      <HiArrowDownTray size={12} /> {locale === 'en' ? 'Download' : 'Unduh'}
                    </a>
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
