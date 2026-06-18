import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiPlus, FiSearch, FiFileText, FiEdit2, FiTrash2, FiEye,
  FiDownload, FiSend, FiCheckCircle, FiClock, FiAlertCircle,
  FiFilter, FiUsers, FiRefreshCw, FiCopy, FiSettings,
} from 'react-icons/fi';
import * as contractService from '../services/contractService';
import { useAuth } from '../context/AuthContext';
import * as employeeService from '../services/employeeService';

import { getCompanyById } from '../services/companyService';

import { DEFAULT_TEMPLATES } from '../data/contractTemplates';
import { generateContractPDF } from '../lib/contractPDF';
import '../styles/shared.css';
import '../styles/admin.css';
import './ContractManagement.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

const CONTRACT_TYPES = {
  pkwt: { label: 'PKWT', color: '#4F46E5', bg: '#EEF2FF' },
  pkwtt: { label: 'PKWTT', color: '#0047AB', bg: '#EFF6FF' },
  offering_letter: { label: 'Offering Letter', color: '#059669', bg: '#ECFDF5' },
  appointment: { label: 'SK Pengangkatan', color: '#D97706', bg: '#FFFBEB' },
  addendum: { label: 'Addendum', color: '#7C3AED', bg: '#F5F3FF' },
};

const STATUS_MAP = {
  draft: { label: 'Draft', color: '#6B7280', bg: '#F3F4F6', icon: <FiClock size={10}/> },
  sent: { label: 'Terkirim', color: '#0047AB', bg: '#EFF6FF', icon: <FiSend size={10}/> },
  signed: { label: 'Ditandatangani', color: '#16A34A', bg: '#F0FDF4', icon: <FiCheckCircle size={10}/> },
  expired: { label: 'Kadaluarsa', color: '#DC2626', bg: '#FEF2F2', icon: <FiAlertCircle size={10}/> },
};

export default function ContractManagement() {
  const { t } = useTranslation();
  const { employee } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState('contracts'); // 'contracts' | 'templates'
  const [contracts, setContracts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pdfLoading, setPdfLoading] = useState(null); // contract id being exported

  // Create contract wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    const [contractsRes, templatesRes, empRes, companyRes] = await Promise.all([
      contractService.getAllContracts(employee?.company_id),
      contractService.getContractTemplates(employee?.company_id),
      employeeService.getAllEmployees(undefined, employee?.company_id),
      getCompanyById(employee?.company_id),
    ]);

    // Use the current user's company data
    if (companyRes.data) {
      setCompany(companyRes.data);
    }

    // Auto-seed default templates if none exist - check by name to avoid duplicates
    let tpls = templatesRes.data || [];
    if (tpls.length === 0) {
      const existingNames = tpls.map(t => t.name);
      for (const tpl of DEFAULT_TEMPLATES) {
        if (!existingNames.includes(tpl.name)) {
          await contractService.createTemplate(tpl);
          existingNames.push(tpl.name);
        }
      }
      const refreshed = await contractService.getContractTemplates();
      tpls = refreshed.data || [];
    } else {
      // Deduplicate: if default templates appear more than once, keep only one
      const seen = new Set();
      const toDelete = [];
      tpls.forEach(t => {
        if (seen.has(t.name)) {
          toDelete.push(t.id);
        } else {
          seen.add(t.name);
        }
      });
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(id => contractService.deleteTemplate(id)));
        const refreshed = await contractService.getContractTemplates();
        tpls = refreshed.data || [];
      }
    }

    setContracts(contractsRes.data || []);
    setTemplates(tpls);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Auto-open wizard if ?employee=ID is in URL (coming from EmployeeProfile)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const empId = params.get('employee');
    if (empId && employees.length > 0) {
      setSelectedEmployee(empId);
      setShowWizard(true);
      setWizardStep(1);
    }
  }, [location.search, employees]);

  

  const handleDeleteContract = async (id) => {
    if (!confirm('Hapus kontrak ini?')) return;
    await contractService.deleteContract(id);
    fetchAll();
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Hapus template ini?')) return;
    await contractService.deleteTemplate(id);
    fetchAll();
  };

  const handleDuplicateTemplate = async (tpl) => {
    const newTpl = {
      name: `${tpl.name} (Salinan)`,
      type: tpl.type,
      html_content: tpl.html_content,
      description: tpl.description,
      is_default: false,
    };
    await contractService.createTemplate(newTpl);
    fetchAll();
  };

  const handleCreateContract = async () => {
    if (!selectedTemplate || !selectedEmployee) return;
    const emp = employees.find(e => String(e.id) === String(selectedEmployee));
    const existingCount = contracts.filter(c => c.type === selectedTemplate.type).length;
    const contractNumber = contractService.generateContractNumber(selectedTemplate.type, existingCount + 1);

    // Build company data from database record
    const companyData = company ? {
      name: company.name,
      address: company.address || '',
      city: company.city || 'Bandung',
      phone: company.phone || '',
      npwp: company.npwp || '',
      director: company.director || company.pic_name || '',
    } : {};

    const filledContent = contractService.fillTemplateVariables(
      selectedTemplate.html_content, emp, companyData, { contractNumber }
    );
    const { data } = await contractService.createContract({
      employee_id: emp.id,
      template_id: selectedTemplate.id,
      type: selectedTemplate.type,
      contract_number: contractNumber,
      html_content: filledContent,
      status: 'draft',
      metadata: { employeeSnapshot: emp, companySnapshot: companyData },
    });
    setShowWizard(false);
    setWizardStep(1);
    setSelectedTemplate(null);
    setSelectedEmployee('');
    if (data?.id) navigate(`/contracts/edit/${data.id}`);
    else fetchAll();
  };

  const filteredContracts = contracts.filter(c => {
    const name = c.employees?.name?.toLowerCase() || '';
    const num = c.contract_number?.toLowerCase() || '';
    const matchSearch = !search || name.includes(search.toLowerCase()) || num.includes(search.toLowerCase());
    const matchType = !typeFilter || c.type === typeFilter;
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const stats = {
    total: contracts.length,
    draft: contracts.filter(c => c.status === 'draft').length,
    signed: contracts.filter(c => c.status === 'signed').length,
    expired: contracts.filter(c => c.status === 'expired').length,
  };

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={5} />;
  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>{t('nav.contracts')}</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={() => setShowWizard(true)}>
            <FiPlus /> Buat Kontrak
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cm-stats-row">
        {[
          { label: 'Total Kontrak', value: stats.total, icon: <FiFileText />, color: '#0047AB', bg: '#EFF6FF', accent: '#0047AB' },
          { label: 'Draft', value: stats.draft, icon: <FiClock />, color: '#6B7280', bg: '#F3F4F6', accent: '#6B7280' },
          { label: 'Ditandatangani', value: stats.signed, icon: <FiCheckCircle />, color: '#16A34A', bg: '#F0FDF4', accent: '#16A34A' },
          { label: 'Kadaluarsa', value: stats.expired, icon: <FiAlertCircle />, color: '#DC2626', bg: '#FEF2F2', accent: '#DC2626' },
        ].map(s => (
          <div className="cm-stat-card" key={s.label} style={{ '--cm-stat-accent': s.accent }}>
            <div className="cm-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="cm-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="cm-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="cm-tabs">
        {[
          { id: 'contracts', label: 'Kontrak Karyawan', icon: <FiFileText size={13} /> },
          { id: 'templates', label: 'Template Dokumen', icon: <FiSettings size={13} /> },
        ].map(t => (
          <button
            key={t.id}
            className={`cm-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* --- CONTRACTS TAB --- */}
      {tab === 'contracts' && (
        <>
          <div className="cm-filter-bar">
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} size={14} />
              <input
                className="filter-search"
                style={{ paddingLeft: 36, width: '100%' }}
                placeholder="Cari nama karyawan atau nomor kontrak..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">Semua Jenis</option>
              {Object.entries(CONTRACT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="data-table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Kontrak</th>
                  <th>Karyawan</th>
                  <th>Jenis Kontrak</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Memuat data...</td></tr>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 48 }}>
                      <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                        <FiFileText size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                        Belum ada kontrak. Klik <strong>Buat Kontrak</strong> untuk memulai.
                      </div>
                    </td>
                  </tr>
                ) : filteredContracts.map(c => {
                  const type = CONTRACT_TYPES[c.type] || CONTRACT_TYPES.pkwt;
                  const status = STATUS_MAP[c.status] || STATUS_MAP.draft;
                  const fmt = d => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                  return (
                    <tr key={c.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>
                          {c.contract_number || `#${c.id}`}
                        </span>
                      </td>
                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                            {(c.employees?.name || '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="employee-name" style={{ fontSize: 13 }}>{c.employees?.name || '-'}</div>
                            <div className="employee-dept">{c.employees?.position || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: type.bg, color: type.color }}>
                          {type.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: status.bg, color: status.color }}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(c.created_at)}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="action-btn" title="Edit & Preview" onClick={() => navigate(`/contracts/edit/${c.id}`)}>
                            <FiEdit2 />
                          </button>
                          <button
                            className="action-btn"
                            title="Export PDF"
                            disabled={pdfLoading === c.id}
                            onClick={async () => {
                              setPdfLoading(c.id);
                              await generateContractPDF(c.html_content, c.contract_number);
                              setPdfLoading(null);
                            }}
                          >
                            {pdfLoading === c.id ? <FiRefreshCw style={{ animation: 'spin 0.8s linear infinite' }} /> : <FiDownload />}
                          </button>
                          <button className="action-btn danger" title="Hapus" onClick={() => handleDeleteContract(c.id)}>
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* --- TEMPLATES TAB --- */}
      {tab === 'templates' && (
        <div className="cm-templates-grid">
          {templates.map(tpl => {
            const type = CONTRACT_TYPES[tpl.type] || CONTRACT_TYPES.pkwt;
            return (
              <div className="cm-template-card" key={tpl.id}>
                <div className="cm-template-header">
                  <div className="cm-template-icon" style={{ background: type.bg, color: type.color }}>
                    <FiFileText size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="cm-template-name">{tpl.name}</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: type.bg, color: type.color, border: `1px solid ${type.color}20` }}>
                        {type.label}
                      </span>
                      {tpl.is_default && (
                        <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B30' }}>
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="cm-template-desc">{tpl.description || 'Template kontrak kerja'}</p>
                <div className="cm-template-actions">
                  <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => navigate(`/contracts/template/${tpl.id}`)}>
                    <FiEdit2 size={12} /> Edit Template
                  </button>
                  <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => handleDuplicateTemplate(tpl)}>
                    <FiCopy size={12} /> Duplikat
                  </button>
                  {!tpl.is_default && (
                    <button className="action-btn danger" title="Hapus" onClick={() => handleDeleteTemplate(tpl.id)}>
                      <FiTrash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <button className="cm-add-template-card" onClick={async () => {
            const { data } = await contractService.createTemplate({
              name: 'Template Baru',
              type: 'pkwt',
              html_content: '<p>Isi template di sini...</p>',
              is_default: false,
            });
            if (data?.id) navigate(`/contracts/template/${data.id}`);
            else fetchAll();
          }}>
            <FiPlus size={24} />
            <span>Buat Template Baru</span>
          </button>
        </div>
      )}

      {/* --- CREATE WIZARD MODAL --- */}
      {showWizard && (
        <div className="modal-overlay" onClick={() => { setShowWizard(false); setWizardStep(1); }}>
          <div className="modal-box" style={{ maxWidth: 560, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Buat Kontrak Baru</h2>
              <button className="modal-close" onClick={() => { setShowWizard(false); setWizardStep(1); }}>-</button>
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 8, padding: '0 24px 16px', alignItems: 'center' }}>
              {['Pilih Template', 'Pilih Karyawan', 'Konfirmasi'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < 2 ? '1 1 0' : undefined }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: wizardStep > i + 1 ? '#16A34A' : wizardStep === i + 1 ? '#0047AB' : 'var(--border)',
                    color: wizardStep >= i + 1 ? '#fff' : 'var(--muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {wizardStep > i + 1 ? '?' : i + 1}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: wizardStep === i + 1 ? 600 : 400, color: wizardStep === i + 1 ? 'var(--text)' : 'var(--muted)' }}>
                    {s}
                  </span>
                  {i < 2 && <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />}
                </div>
              ))}
            </div>

            <div className="modal-body">
              {/* Step 1: Select Template */}
              {wizardStep === 1 && (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Pilih jenis kontrak yang ingin dibuat:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {templates.map(tpl => {
                      const type = CONTRACT_TYPES[tpl.type] || CONTRACT_TYPES.pkwt;
                      const isSelected = selectedTemplate?.id === tpl.id;
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setSelectedTemplate(tpl)}
                          style={{
                            padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                            border: `2px solid ${isSelected ? type.color : 'var(--border)'}`,
                            background: isSelected ? type.bg : 'var(--surface)',
                            display: 'flex', alignItems: 'center', gap: 14,
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: type.bg, color: type.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FiFileText />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{tpl.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{tpl.description}</div>
                          </div>
                          {isSelected && <FiCheckCircle style={{ color: type.color }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Select Employee */}
              {wizardStep === 2 && (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Pilih karyawan yang akan mendapatkan kontrak ini:
                  </p>
                  <div style={{ position: 'relative', marginBottom: 12 }}>
                    <FiUsers style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <select
                      className="form-select"
                      style={{ paddingLeft: 38 }}
                      value={selectedEmployee}
                      onChange={e => setSelectedEmployee(e.target.value)}
                    >
                      <option value="">-- Pilih Karyawan --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} - {emp.position || emp.division}</option>
                      ))}
                    </select>
                  </div>
                  {selectedEmployee && (() => {
                    const emp = employees.find(e => String(e.id) === String(selectedEmployee));
                    return emp ? (
                      <div style={{ background: '#F0F7FF', borderRadius: 10, padding: 16, border: '1px solid #BFDBFE' }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>{emp.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                          <span>NIP: {emp.employee_id || emp.nip || '-'}</span>
                          <span>Jabatan: {emp.position || '-'}</span>
                          <span>Divisi: {emp.division || '-'}</span>
                          <span>NIK: {emp.nik || '-'}</span>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Step 3: Confirm */}
              {wizardStep === 3 && (
                <div>
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 20 }}>
                    <FiCheckCircle style={{ color: '#16A34A', fontSize: 24, marginBottom: 12 }} />
                    <p style={{ fontWeight: 700, marginBottom: 8 }}>Siap membuat kontrak!</p>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span><FiFileText size={12} style={{ display: 'inline', marginRight: 6 }} />Template: <strong>{selectedTemplate?.name}</strong></span>
                      <span><FiUsers size={12} style={{ display: 'inline', marginRight: 6 }} />Karyawan: <strong>{employees.find(e => String(e.id) === String(selectedEmployee))?.name}</strong></span>
                      <span><FiEdit2 size={12} style={{ display: 'inline', marginRight: 6 }} />Status awal: <strong>Draft</strong> (dapat diedit sebelum dikirim)</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
                    Data karyawan akan otomatis diisi. Anda dapat mengedit konten sebelum mengirim.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {wizardStep > 1 && (
                <button className="btn-secondary" onClick={() => setWizardStep(s => s - 1)}>? Kembali</button>
              )}
              <button className="btn-secondary" onClick={() => { setShowWizard(false); setWizardStep(1); }}>Batal</button>
              {wizardStep < 3 ? (
                <button
                  className="btn-primary"
                  disabled={wizardStep === 1 ? !selectedTemplate : !selectedEmployee}
                  onClick={() => setWizardStep(s => s + 1)}
                >
                  Lanjut ?
                </button>
              ) : (
                <button className="btn-primary" onClick={handleCreateContract}>
                  <FiEdit2 /> Buat & Edit Kontrak
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
