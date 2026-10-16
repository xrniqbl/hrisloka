import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  HiArrowDownTray,
  HiBellAlert,
  HiCheck,
  HiChevronRight,
  HiDocumentText
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getContractsByEmployee, signContract } from '../../services/contractService';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import EmpEmptyState from '../../components/EmpEmptyState';
import '../../styles/shared.css';
import '../../styles/admin.css';

// Sanitize HTML contract content - prevents XSS injection via contract body
const sanitizeContractHtml = (html) =>
  DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'hr'],
    ALLOWED_ATTR: ['style', 'class'],
    FORBID_SCRIPTS: true,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  });

const STATUS_CONFIG = {
  draft:     { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', label: 'Draft' },
  active:    { color: '#635BFF', bg: 'rgba(99,91,255,0.1)',   label: 'Aktif' },
  signed:    { color: '#16A34A', bg: 'rgba(22,163,74,0.1)',  label: 'Ditandatangani' },
  expired:   { color: '#DC2626', bg: 'rgba(220,38,38,0.1)',  label: 'Berakhir' },
  terminated:{ color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  label: 'Diputus' },
};

export default function EmpContracts() {
  const { user } = useAuth();
  const toast = useToast();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async () => {
    const email = user?.email || user?.user_metadata?.email;
    const { data: empData } = await getEmployeeByEmail(email);
    if (!empData) { setLoading(false); return; }
    setEmp(empData);
    const { data } = await getContractsByEmployee(empData.id);
    setContracts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('emp:refresh', handler);
    return () => window.removeEventListener('emp:refresh', handler);
  }, [load]);

  const handleSign = async (contract) => {
    setSigning(true);
    try {
      const signatureData = `Ditandatangani secara digital oleh ${emp?.name} pada ${new Date().toLocaleString('id-ID')}`;
      const { error } = await signContract(contract.id, signatureData, 'employee');
      if (error) throw error;
      toast?.success(locale === 'en' ? 'Contract signed successfully!' : 'Kontrak berhasil ditandatangani!');
      setShowDetail(false);
      setSelectedContract(null);
      load();
    } catch {
      toast?.error(locale === 'en' ? 'Failed to sign. Try again.' : 'Gagal menandatangani. Coba lagi.');
    }
    setSigning(false);
  };

  const pendingSign = contracts.filter(c => c.status === 'active' && !c.signed_at);

  if (loading) {
    return (
      <div className="ep-loading-wrap">
        <div className="skeleton" style={{ height: 28, width: 140, borderRadius: 8, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 12, marginBottom: 12 }} />
        {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14, marginBottom: 10 }} />)}
      </div>
    );
  }

  // Detail view
  if (showDetail && selectedContract) {
    const sc = STATUS_CONFIG[selectedContract.status] || STATUS_CONFIG.draft;
    return (
      <div className="mb">
        <button
          onClick={() => { setShowDetail(false); setSelectedContract(null); }}
          className="btn-back-link"
        >
          &larr; {locale === 'en' ? 'Back to Contracts' : 'Kembali ke Kontrak'}
        </button>

        <div className="emp-card mb">
          <div className="chart-card-header">
            <div>
              <h2 className="chart-card-title">{selectedContract.title}</h2>
              <span style={{ fontSize: 12, fontWeight: 700, color: sc.color, background: sc.bg, padding: '4px 12px', borderRadius: 12 }}>
                {locale === 'en' ? selectedContract.status : sc.label}
              </span>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${sc.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HiDocumentText size={20} style={{ color: sc.color }} />
            </div>
          </div>

          {/* Contract details */}
          {[
            [locale === 'en' ? 'Type' : 'Jenis', selectedContract.type],
            [locale === 'en' ? 'Start Date' : 'Tanggal Mulai', selectedContract.start_date],
            [locale === 'en' ? 'End Date' : 'Tanggal Berakhir', selectedContract.end_date || (locale === 'en' ? 'Permanent' : 'Permanen')],
            [locale === 'en' ? 'Created' : 'Dibuat', new Date(selectedContract.created_at).toLocaleDateString('id-ID')],
          ].filter(([,v]) => v).map(([label, value]) => (
            <div key={label} className="emp-detail-row btn-icon-row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-light)', justifyContent: 'space-between' }}>
              <span className="td-muted-sm">{label}</span>
              <span className="td-semibold td-sm">{value}</span>
            </div>
          ))}
        </div>

        {/* Contract content */}
        {selectedContract.content && (
          <div className="emp-card mb">
            <div className="section-label mb-sm">{locale === 'en' ? 'Contract Content' : 'Isi Kontrak'}</div>
            <div
              style={{ lineHeight: 1.7, maxHeight: 320, overflowY: 'auto' }}
              dangerouslySetInnerHTML={{ __html: sanitizeContractHtml(selectedContract.content) }}
            />
          </div>
        )}

        {/* Signature section */}
        {selectedContract.status === 'active' && !selectedContract.signed_at ? (
          <div className="emp-card mb" style={{ border: '2px solid var(--primary)' }}>
            <div className="btn-icon-row mb-sm">
              <HiBellAlert size={20} className="ep-icon-shrink" style={{ color: 'var(--primary)' }} />
              <div>
                <div className="td-semibold" style={{ fontSize: 14, marginBottom: 4 }}>{locale === 'en' ? 'Signature Required' : 'Perlu Ditandatangani'}</div>
                <div className="td-muted-sm">
                  {locale === 'en'
                    ? 'By signing, you agree to the terms and conditions stated in this employment contract.'
                    : 'Dengan menandatangani, Anda menyetujui syarat dan ketentuan yang tercantum dalam kontrak kerja ini.'}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleSign(selectedContract)}
              disabled={signing}
              className="action-btn success"
              style={{ width: '100%', padding: '14px', fontSize: 15 }}
            >
              {signing
                ? <><span className="ep-spinner-inline" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%' }} /> {locale === 'en' ? 'Signing...' : 'Menandatangani...'}</>
                : <><HiCheck size={16} /> {locale === 'en' ? 'Sign Contract Digitally' : 'Tandatangani Kontrak Secara Digital'}</>}
            </button>
          </div>
        ) : selectedContract.signed_at && (
          <div className="emp-card" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="btn-icon-row">
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HiCheck size={18} style={{ color: '#16A34A' }} />
              </div>
              <div>
                <div className="td-semibold" style={{ fontSize: 14, color: '#16A34A' }}>{locale === 'en' ? 'Contract Signed' : 'Kontrak Ditandatangani'}</div>
                <div className="td-muted-sm">
                  {new Date(selectedContract.signed_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download if URL available */}
        {selectedContract.pdf_url && (
          <a
            href={selectedContract.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="btn-icon-row"
            style={{
              padding: '13px', borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border)', background: 'var(--bg)',
              color: 'var(--primary)', fontWeight: 700, fontSize: 14,
              textDecoration: 'none', marginTop: 12, justifyContent: 'center',
            }}
          >
            <HiArrowDownTray size={16} />
            {locale === 'en' ? 'Download PDF' : 'Unduh PDF'}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="emp-page">
      <div className="mb">
        <h1 className="emp-page-title">
          {locale === 'en' ? 'My Contracts' : 'Kontrak Kerja'}
        </h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'View and sign your employment contracts' : 'Lihat dan tandatangani kontrak kerja Anda'}
        </p>
      </div>

      {/* Unsigned contracts alert */}
      {pendingSign.length > 0 && (
        <div className="emp-alert-danger btn-icon-row mb">
          <HiBellAlert size={18} className="ep-icon-shrink text-danger" />
          <div>
            <div className="td-semibold td-sm" style={{ color: '#DC2626' }}>
              {pendingSign.length} {locale === 'en' ? 'contract(s) need your signature' : 'kontrak perlu ditandatangani'}
            </div>
            <div className="td-muted-sm">
              {locale === 'en' ? 'Tap on the contract below to sign.' : 'Ketuk kontrak di bawah untuk menandatangani.'}
            </div>
          </div>
        </div>
      )}

      {/* Contract list */}
      {loading ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />)}
        </div>
      ) : contracts.length === 0 ? (
        <EmpEmptyState
          type="nodata"
          title={locale === 'en' ? 'No contracts yet' : 'Belum ada kontrak'}
          subtitle={locale === 'en' ? 'Your employment contracts will appear here once HR publishes them.' : 'Kontrak kerja akan muncul di sini setelah HR menerbitkan.'}
          cta={locale === 'en' ? 'Contact helpdesk' : 'Hubungi helpdesk'}
          ctaHref="/app/helpdesk"
          secondaryCta={locale === 'en' ? 'Home' : 'Beranda'}
          secondaryHref="/app/home"
        />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {contracts.map(contract => {
            const sc = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
            const needsSign = contract.status === 'active' && !contract.signed_at;
            return (
              <div
                key={contract.id}
                className="emp-card"
                onClick={() => { setSelectedContract(contract); setShowDetail(true); }}
                style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s', border: needsSign ? '1.5px solid #EF4444' : '1px solid var(--border-light)' }}
              >
                <div className="btn-icon-row">
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: `${sc.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <HiDocumentText size={20} style={{ color: sc.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="td-semibold td-truncate td-sm">{contract.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, padding: '2px 8px', borderRadius: 12 }}>
                        {locale === 'en' ? contract.status : sc.label}
                      </span>
                      {contract.type && <span className="td-muted-sm">{contract.type}</span>}
                      {contract.start_date && <span className="td-muted-sm">{contract.start_date}</span>}
                    </div>
                    {needsSign && (
                      <div className="td-danger-bold td-sm" style={{ marginTop: 4 }}>
                        {locale === 'en' ? 'Signature required' : 'Perlu ditandatangani'}
                      </div>
                    )}
                  </div>
                  <HiChevronRight size={18} className="ep-icon-shrink" style={{ color: 'var(--muted)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

