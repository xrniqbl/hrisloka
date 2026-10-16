import { useState, useEffect, useCallback } from 'react';
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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import './ContractManagement.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

const CONTRACT_TYPES = {
  pkwt: { label: 'PKWT', color: '#4F46E5', bg: '#F0EEFF' },
  pkwtt: { label: 'PKWTT', color: '#635BFF', bg: '#F0EEFF' },
  offering_letter: { label: 'Offering Letter', color: '#059669', bg: '#ECFDF5' },
  appointment: { label: 'SK Pengangkatan', color: '#D97706', bg: '#FFFBEB' },
  addendum: { label: 'Addendum', color: '#7C3AED', bg: '#F5F3FF' },
};

const STATUS_MAP = {
  draft: { label: 'Draft', color: '#6B7280', bg: '#F3F4F6', icon: <FiClock size={10}/> },
  sent: { label: 'Terkirim', color: '#635BFF', bg: '#F0EEFF', icon: <FiSend size={10}/> },
  signed: { label: 'Ditandatangani', color: '#16A34A', bg: '#F0FDF4', icon: <FiCheckCircle size={10}/> },
  expired: { label: 'Kadaluarsa', color: '#DC2626', bg: '#FEF2F2', icon: <FiAlertCircle size={10}/> },
};

export default function ContractManagement() {
  const { t } = useTranslation();
  const { employee } = useAuth();
  const { toast } = useToast();
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

  const fetchAll = useCallback(async () => {
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
  }, [employee?.company_id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
        <div className="page-header-actions">
          <button className="btn-primary" onClick={() => setShowWizard(true)} aria-label="Buat kontrak"><FiPlus /> Buat Kontrak
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cm-stats-row">
        {[
          { label: 'Total Kontrak', value: stats.total, icon: <FiFileText />, color: '#635BFF', bg: '#F0EEFF', accent: '#635BFF' },
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
            <div className="search-input-wrap">
              <FiSearch className="search-input-icon" size={14} />
              <input
                className="filter-search search-input-padded"
                placeholder="Cari nama karyawan atau nomor kontrak..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <NativeSelect className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">Semua Jenis</option>
              {Object.entries(CONTRACT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </NativeSelect>
            <NativeSelect className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </NativeSelect>
          </div>

          <div className="data-table-card">
            <div className="table-responsive">
            <Table>
              <TableHeader>
                <tr>
                  <th>No. Kontrak</th>
                  <TableHead>Karyawan</TableHead>
                  <th>Jenis Kontrak</th>
                  <TableHead>Status</TableHead>
                  <th>Dibuat</th>
                  <TableHead>Aksi</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="td-center-muted">Memuat data...</TableCell></TableRow>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                      <EmptyState
                        title="Belum ada kontrak"
                        description="Buat kontrak kerja karyawan dari template yang tersedia."
                        ctaLabel="Buat kontrak"
                        onCta={() => setShowWizard(true)}
                        size="sm"
                      />
                    </td>
                  </tr>
                ) : filteredContracts.map(c => {
                  const type = CONTRACT_TYPES[c.type] || CONTRACT_TYPES.pkwt;
                  const status = STATUS_MAP[c.status] || STATUS_MAP.draft;
                  const fmt = d => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="td-mono-bold td-muted-sm">
                          {c.contract_number || `#${c.id}`}
                        </span>
                      </td>
                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar sm">
                            {(c.employees?.name || '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="employee-name td-sm">{c.employees?.name || '-'}</div>
                            <div className="employee-dept">{c.employees?.position || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge-type" style={{ background: type.bg, color: type.color }}>
                          {type.label}
                        </span>
                      </td>
                      <td>
                        <span className="badge-status" style={{ background: status.bg, color: status.color }}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td className="td-muted-sm">{fmt(c.created_at)}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="action-btn" title="Edit & Preview" onClick={() => navigate(`/contracts/edit/${c.id}`)} aria-label="Edit dan preview kontrak"><FiEdit2 />
                          </button>
                          <button
                            className="action-btn"
                            title="Export PDF"
                            disabled={pdfLoading === c.id}
                            onClick={async () => {
                              try {
                              setPdfLoading(c.id);
                              await generateContractPDF(c.html_content, c.contract_number);
                              } catch (e) {
                                console.error('[Contract] PDF error:', e);
                                toast.error('Gagal membuat PDF kontrak. Coba lagi.');
                              } finally {
                                setPdfLoading(null);
                              }
                            }}
                          >
                            {pdfLoading === c.id ? <FiRefreshCw style={{ animation: 'spin 0.8s linear infinite' }} /> : <FiDownload />}
                          </button>
                          <button className="action-btn danger" title="Hapus" onClick={() => handleDeleteContract(c.id)} aria-label="Hapus kontrak"><FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </TableBody>
            </Table>
            </div>
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
                  <div className="cm-template-meta">
                    <div className="cm-template-name">{tpl.name}</div>
                    <div className="cm-template-badges">
                      <span className="badge-type" style={{ background: type.bg, color: type.color, border: `1px solid ${type.color}20` }}>
                        {type.label}
                      </span>
                      {tpl.is_default && (
                        <span className="badge-default">Default</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="cm-template-desc">{tpl.description || 'Template kontrak kerja'}</p>
                <div className="cm-template-actions">
                  <button className="btn-secondary btn-sm" onClick={() => navigate(`/contracts/template/${tpl.id}`)} aria-label="Edit template"><FiEdit2 size={12} /> Edit Template
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => handleDuplicateTemplate(tpl)} aria-label="Duplikat template"><FiCopy size={12} /> Duplikat
                  </button>
                  {!tpl.is_default && (
                    <button className="action-btn danger" title="Hapus" onClick={() => handleDeleteTemplate(tpl.id)} aria-label="Hapus template"><FiTrash2 size={13} />
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
          <div className="modal-box modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Buat Kontrak Baru</h2>
              <button className="modal-close" onClick={() => { setShowWizard(false); setWizardStep(1); }}>-</button>
            </div>

            {/* Step indicator */}
            <div className="wizard-steps">
              {['Pilih Template', 'Pilih Karyawan', 'Konfirmasi'].map((s, i) => (
                <div key={s} className={`wizard-step-item${i < 2 ? ' wizard-step-flex' : ''}`}>
                  <div className={`wizard-step-dot${wizardStep > i + 1 ? ' done' : wizardStep === i + 1 ? ' active' : ''}`}>
                    {wizardStep > i + 1 ? '?' : i + 1}
                  </div>
                  <span className={`wizard-step-label${wizardStep === i + 1 ? ' active' : ''}`}>
                    {s}
                  </span>
                  {i < 2 && <div className="wizard-step-line" />}
                </div>
              ))}
            </div>

            <div className="modal-body">
              {/* Step 1: Select Template */}
              {wizardStep === 1 && (
                <div>
                  <p className="section-label mb-sm">
                    Pilih jenis kontrak yang ingin dibuat:
                  </p>
                  <div className="wizard-template-list">
                    {templates.map(tpl => {
                      const type = CONTRACT_TYPES[tpl.type] || CONTRACT_TYPES.pkwt;
                      const isSelected = selectedTemplate?.id === tpl.id;
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setSelectedTemplate(tpl)}
                          className={`wizard-tpl-row${isSelected ? ' selected' : ''}`}
                          style={{
                            border: `2px solid ${isSelected ? type.color : 'var(--border)'}`,
                            background: isSelected ? type.bg : 'var(--surface)',
                          }}
                        >
                          <div className="wizard-tpl-icon" style={{ background: type.bg, color: type.color }}>
                            <FiFileText />
                          </div>
                          <div className="wizard-tpl-body">
                            <div className="td-semibold td-sm">{tpl.name}</div>
                            <div className="td-muted-sm">{tpl.description}</div>
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
                  <p className="section-label mb">
                    Pilih karyawan yang akan mendapatkan kontrak ini:
                  </p>
                  <div className="search-input-wrap mb-sm">
                    <FiUsers className="search-input-icon" />
                    <select
                      className="form-select search-input-padded"
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
                      <div className="wizard-emp-card">
                        <div className="td-semibold mb-sm">{emp.name}</div>
                        <div className="wizard-emp-grid">
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
                  <div className="wizard-confirm-card">
                    <FiCheckCircle className="wizard-confirm-icon" />
                    <p className="td-semibold mb-sm">Siap membuat kontrak!</p>
                    <div className="wizard-confirm-list">
                      <span><FiFileText size={12} className="inline-icon" />Template: <strong>{selectedTemplate?.name}</strong></span>
                      <span><FiUsers size={12} className="inline-icon" />Karyawan: <strong>{employees.find(e => String(e.id) === String(selectedEmployee))?.name}</strong></span>
                      <span><FiEdit2 size={12} className="inline-icon" />Status awal: <strong>Draft</strong> (dapat diedit sebelum dikirim)</span>
                    </div>
                  </div>
                  <p className="td-muted-sm text-center mt-sm">
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
                <button className="btn-primary" onClick={handleCreateContract} aria-label="Buat dan edit kontrak"><FiEdit2 /> Buat & Edit Kontrak
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


