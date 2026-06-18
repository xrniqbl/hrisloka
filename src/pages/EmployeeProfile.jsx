import { useState, useEffect } from 'react';
import '../styles/admin.css';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiEdit2, FiMail, FiPhone, FiMapPin, FiCalendar,
  FiDollarSign, FiFileText, FiShield, FiBook, FiPlusCircle,
  FiKey, FiCheck, FiLoader, FiAlertTriangle, FiUser,
  FiCreditCard, FiActivity, FiHome, FiInfo,
} from 'react-icons/fi';
import { getContractDaysRemaining, formatCurrency } from '../lib/utils';
import { getEmployeeById, updateEmployeeRole } from '../services/employeeService';
import { calculateSalary } from '../lib/payrollEngine';
import { loadPayrollConfig } from '../lib/payrollConfig';
import EmployeeModal from '../components/EmployeeModal';
import { useAuth } from '../context/AuthContext';
import { getRole, ROLE_LABELS, ROLE_COLORS, isFounder } from '../lib/rbac';
import './EmployeeProfile.css';

// ── Helpers ────────────────────────────────────────────────────────────────
function InfoRow({ label, value, type = 'normal' }) {
  const isEmpty = value === null || value === undefined || value === '' || value === '-';
  return (
    <div className="ep-info-row">
      <span className="ep-info-label">{label}</span>
      <span className={`ep-info-value${isEmpty ? ' muted' : ''} ${type !== 'normal' ? type : ''}`}>
        {isEmpty ? 'Tidak tersedia' : value}
      </span>
    </div>
  );
}

function SectionCard({ title, iconEl, iconColor = 'blue', children }) {
  return (
    <div className="ep-card">
      <div className="ep-card-header">
        <div className={`ep-card-icon ${iconColor}`}>{iconEl}</div>
        <span className="ep-card-title">{title}</span>
      </div>
      <div className="ep-card-body">{children}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, employee: currentUser } = useAuth();
  const currentRole = getRole(currentUser);
  const canAssignRole = currentRole === 'super_admin' || isFounder(user, currentUser);

  const [tab, setTab] = useState('biodata');
  const [editOpen, setEditOpen] = useState(false);
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);

  // Role assignment state
  const [selectedRole, setSelectedRole] = useState('employee');
  const [savingRole, setSavingRole] = useState(false);
  const [roleSaved, setRoleSaved] = useState(false);
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      const { data, error } = await getEmployeeById(id, currentUser?.company_id ?? null);
      if (!error && data) {
        setEmp(data);
        setSelectedRole(data.role || 'employee');
      }
      setLoading(false);
    };
    fetchEmployee();
  }, [id, currentUser?.company_id]);

  const handleSaveRole = async () => {
    setSavingRole(true);
    setRoleError('');
    setRoleSaved(false);
    // Mandatory: pass companyId for tenant isolation
    const { error } = await updateEmployeeRole(id, selectedRole, currentUser?.company_id);
    setSavingRole(false);
    if (error) {
      setRoleError(error.message || 'Gagal menyimpan role.');
    } else {
      setRoleSaved(true);
      // Re-fetch employee so UI shows fresh data (not stale cache)
      const { data: fresh } = await getEmployeeById(id, currentUser?.company_id ?? null);
      if (fresh) setEmp(fresh);
      setTimeout(() => setRoleSaved(false), 3000);
    }
  };

  // ── Loading & Error ──
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Memuat profil karyawan...</p>
        </div>
      </div>
    );
  }

  if (!emp) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--muted)' }}>
          <FiUser size={24} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>Karyawan tidak ditemukan</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Data karyawan dengan ID ini tidak tersedia.</p>
      </div>
    );
  }

  const salary = calculateSalary(emp, []);
  const contractDays = getContractDaysRemaining(emp.contract_end || emp.contractEnd);
  const initials = (emp.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const leaveUsed = emp.leave_used || emp.leaveUsed || 0;
  const leaveQuota = emp.leave_quota || emp.leaveQuota || 12;
  const leaveRemaining = leaveQuota - leaveUsed;
  const leavePct = Math.min(100, Math.round((leaveUsed / leaveQuota) * 100));

  const tabs = [
    { key: 'biodata',    label: 'Biodata' },
    { key: 'employment', label: 'Kepegawaian' },
    { key: 'documents',  label: 'Dokumen' },
    { key: 'payroll',    label: 'Payroll' },
    ...(canAssignRole ? [{ key: 'access', label: 'Hak Akses' }] : []),
  ];

  const contractDaysEl = contractDays !== null ? (
    <span className={`ep-contract-days ${contractDays <= 30 ? 'critical' : contractDays <= 90 ? 'warning' : 'safe'}`}>
      {contractDays} hari tersisa
    </span>
  ) : null;

  return (
    <div className="ep-wrapper">
      {/* ── Page Header ── */}
      <div className="ep-page-header">
        <div className="ep-page-header-left">
          <button className="ep-back-btn" onClick={() => navigate('/employees')}>
            <FiArrowLeft size={16} />
          </button>
          <h1 className="ep-page-title">Profil Karyawan</h1>
        </div>
        <div className="ep-page-header-actions">
          <button
            className="btn-secondary"
            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}
            onClick={() => navigate(`/contracts?employee=${id}`)}
          >
            <FiPlusCircle size={14} /> Buat Kontrak
          </button>
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            onClick={() => setEditOpen(true)}
          >
            <FiEdit2 size={14} /> Edit Data
          </button>
        </div>
      </div>

      {/* ── Hero Card ── */}
      <div className="ep-hero">
        <div className="ep-avatar-wrap">
          {emp.photo_url ? (
            <div className="ep-avatar"><img src={emp.photo_url} alt={emp.name} /></div>
          ) : (
            <div className="ep-avatar">{initials}</div>
          )}
          <span className={`ep-status-dot ${emp.status === 'permanent' ? 'active' : 'inactive'}`} />
        </div>

        <div className="ep-hero-info">
          <h2 className="ep-hero-name">{emp.name}</h2>
          <p className="ep-hero-position">{emp.position} &mdash; {emp.division}</p>

          <div className="ep-hero-meta">
            {emp.email && (
              <span className="ep-hero-meta-item">
                <FiMail size={13} />
                {emp.email}
              </span>
            )}
            {emp.phone && (
              <span className="ep-hero-meta-item">
                <FiPhone size={13} />
                {emp.phone}
              </span>
            )}
            {emp.branches?.name && (
              <span className="ep-hero-meta-item">
                <FiHome size={13} />
                {emp.branches.name}
              </span>
            )}
          </div>
        </div>

        <div className="ep-hero-badges">
          <span className={`ep-badge ${emp.status === 'permanent' ? 'permanent' : 'contract'}`}>
            <span className="ep-badge-dot" />
            {emp.status === 'permanent' ? 'Karyawan Tetap' : 'Karyawan Kontrak'}
          </span>
          {(emp.employee_id || emp.nip) && (
            <span className="ep-nip-badge">{emp.employee_id || emp.nip}</span>
          )}
          {emp.role && emp.role !== 'employee' && (
            <span className="ep-badge" style={{
              background: `${ROLE_COLORS[emp.role]}12`,
              color: ROLE_COLORS[emp.role],
              border: `1px solid ${ROLE_COLORS[emp.role]}25`,
            }}>
              <span className="ep-badge-dot" />
              {ROLE_LABELS[emp.role]}
            </span>
          )}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="ep-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`ep-tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: BIODATA                                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'biodata' && (
        <div className="ep-grid">
          <SectionCard title="Data Pribadi" iconEl={<FiUser size={16} />} iconColor="blue">
            <InfoRow label="Nama Lengkap" value={emp.name} />
            <InfoRow label="NIK" value={emp.nik} />
            <InfoRow label="Tanggal Lahir" value={
              emp.birth_date
                ? new Date(emp.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : null
            } />
            <InfoRow label="Alamat" value={emp.address} />
          </SectionCard>

          <SectionCard title="Kontak" iconEl={<FiPhone size={16} />} iconColor="teal">
            <InfoRow label="Email" value={emp.email} />
            <InfoRow label="No. Telepon" value={emp.phone} />
            <InfoRow label="WhatsApp" value={emp.whatsapp} />
            <InfoRow label="Email Pribadi" value={emp.personal_email} />
          </SectionCard>

          <SectionCard title="Kontak Darurat" iconEl={<FiAlertTriangle size={16} />} iconColor="orange">
            <InfoRow label="Nama" value={
              emp.emergency_contact?.name || emp.emergency_name ||
              emp.emergencyContact?.name || null
            } />
            <InfoRow label="Hubungan" value={
              emp.emergency_contact?.relation || emp.emergency_relation ||
              emp.emergencyContact?.relation || null
            } />
            <InfoRow label="No. Telepon" value={
              emp.emergency_contact?.phone || emp.emergency_phone ||
              emp.emergencyContact?.phone || null
            } />
          </SectionCard>

          <SectionCard title="Pendidikan" iconEl={<FiBook size={16} />} iconColor="purple">
            <InfoRow label="Jenjang" value={
              emp.education?.level || emp.edu_level || null
            } />
            <InfoRow label="Jurusan" value={
              emp.education?.major || emp.edu_major || null
            } />
            <InfoRow label="Universitas" value={
              emp.education?.university || emp.edu_university || null
            } />
            <InfoRow label="Tahun Lulus" value={
              emp.education?.year || emp.edu_year || null
            } />
          </SectionCard>

          <SectionCard title="Rekening Bank" iconEl={<FiCreditCard size={16} />} iconColor="green">
            <InfoRow label="Bank" value={
              emp.bank_account?.bank || emp.bank_name ||
              emp.bankAccount?.bank || null
            } />
            <InfoRow label="No. Rekening" value={
              emp.bank_account?.number || emp.bank_number ||
              emp.bankAccount?.number || null
            } />
            <InfoRow label="Atas Nama" value={
              emp.bank_account?.holder || emp.bank_holder ||
              emp.bankAccount?.holder || null
            } />
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: KEPEGAWAIAN                                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'employment' && (
        <div className="ep-grid">
          <SectionCard title="Info Kepegawaian" iconEl={<FiCalendar size={16} />} iconColor="blue">
            <InfoRow label="NIP" value={emp.nip || emp.employee_id} />
            <InfoRow label="Divisi" value={emp.division} />
            <InfoRow label="Jabatan" value={emp.position} />
            <InfoRow label="Cabang" value={emp.branches?.name} />
            <InfoRow label="Status" value={emp.status === 'permanent' ? 'Karyawan Tetap' : 'Karyawan Kontrak'} />
            <InfoRow label="Tanggal Bergabung" value={
              (emp.join_date || emp.joinDate)
                ? new Date(emp.join_date || emp.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : null
            } />
          </SectionCard>

          {(emp.status === 'contract' || emp.contract_end || emp.contractEnd) && (
            <SectionCard title="Informasi Kontrak" iconEl={<FiFileText size={16} />} iconColor="orange">
              <InfoRow label="Mulai Kontrak" value={
                (emp.contract_start || emp.contractStart)
                  ? new Date(emp.contract_start || emp.contractStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  : null
              } />
              <InfoRow label="Akhir Kontrak" value={
                (emp.contract_end || emp.contractEnd)
                  ? new Date(emp.contract_end || emp.contractEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  : null
              } />
              <div className="ep-info-row">
                <span className="ep-info-label">Sisa Waktu</span>
                <span className="ep-info-value">
                  {contractDays !== null ? contractDaysEl : <span className="ep-info-value muted">Tidak tersedia</span>}
                </span>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Cuti & Kehadiran" iconEl={<FiActivity size={16} />} iconColor="green">
            <div className="ep-leave-bar-wrap">
              <div className="ep-leave-bar-header">
                <span className="ep-leave-bar-label">Kuota Cuti</span>
                <span className="ep-leave-bar-stat">{leaveUsed} / {leaveQuota} hari</span>
              </div>
              <div className="ep-leave-bar-track">
                <div className="ep-leave-bar-fill" style={{ width: `${leavePct}%` }} />
              </div>
              <div className="ep-leave-details">
                <span className="ep-leave-detail-item">Digunakan: <span>{leaveUsed} hari</span></span>
                <span className="ep-leave-detail-item">Tersisa: <span style={{ color: leaveRemaining <= 2 ? '#DC2626' : '#16A34A' }}>{leaveRemaining} hari</span></span>
                <span className="ep-leave-detail-item">Total: <span>{leaveQuota} hari/tahun</span></span>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: DOCUMENTS                                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'documents' && (
        <div className="ep-card">
          <div className="ep-card-header">
            <div className="ep-card-icon blue"><FiFileText size={16} /></div>
            <span className="ep-card-title">Dokumen Karyawan</span>
          </div>
          <div className="ep-doc-empty">
            <div className="ep-doc-empty-icon"><FiFileText size={22} /></div>
            <p>Belum ada dokumen</p>
            <small>Dokumen yang diunggah akan tampil di sini</small>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: PAYROLL                                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'payroll' && (() => {
        const payrollCfg = loadPayrollConfig();
        const cfg = payrollCfg.deductions;
        const enabledBPJS = [
          cfg.bpjsKesehatan?.enabled && { key: 'bpjsKesehatan', label: cfg.bpjsKesehatan.label, value: salary.bpjs?.bpjsKesehatan || 0 },
          cfg.bpjsJHT?.enabled       && { key: 'bpjsJHT',       label: cfg.bpjsJHT.label,       value: salary.bpjs?.bpjsJHT || 0 },
          cfg.bpjsJP?.enabled        && { key: 'bpjsJP',        label: cfg.bpjsJP.label,         value: salary.bpjs?.bpjsJP || 0 },
        ].filter(Boolean);

        const enabledOther = [
          cfg.pph21?.enabled           && { key: 'pph21',           label: cfg.pph21.label,           value: salary.pph21 || 0 },
          cfg.loan?.enabled            && { key: 'loan',            label: cfg.loan.label,            value: salary.loanDeduction || 0 },
          cfg.absenceDeduction?.enabled&& { key: 'absenceDeduction',label: cfg.absenceDeduction.label,value: salary.absenceDeduction || 0 },
          cfg.uniformDeduction?.enabled&& { key: 'uniformDeduction',label: cfg.uniformDeduction.label,value: salary.uniformDeduction || 0 },
          cfg.coop?.enabled            && { key: 'coop',            label: cfg.coop.label,            value: salary.coopDeduction || 0 },
        ].filter(Boolean);

        const allDeductions = [...enabledBPJS, ...enabledOther];
        const noDeductions = allDeductions.length === 0;

        return (
          <div>
            {/* Hero THP Card */}
            <div className="ep-payroll-hero" style={{ marginBottom: 20 }}>
              <div className="ep-payroll-hero-label">Take Home Pay (per bulan)</div>
              <div className="ep-payroll-hero-amount">{formatCurrency(salary.takeHomePay)}</div>
              <div className="ep-payroll-hero-sub">PTKP: {salary.ptkpStatus} &mdash; PKP Tahunan: {formatCurrency(salary.annualPKP || 0)}</div>
            </div>

            {/* Stats Bar */}
            <div className="ep-payroll-stats">
              <div className="ep-payroll-stat">
                <div className="ep-payroll-stat-label">Gaji Pokok</div>
                <div className="ep-payroll-stat-value blue">{formatCurrency(salary.baseSalary)}</div>
              </div>
              <div className="ep-payroll-stat">
                <div className="ep-payroll-stat-label">Penghasilan Kotor</div>
                <div className="ep-payroll-stat-value">{formatCurrency(salary.grossIncome)}</div>
              </div>
              <div className="ep-payroll-stat">
                <div className="ep-payroll-stat-label">Total Potongan</div>
                <div className="ep-payroll-stat-value red">- {formatCurrency(salary.totalDeductions)}</div>
              </div>
            </div>

            <div className="ep-grid">
              {/* Komponen Penghasilan */}
              <SectionCard title="Komponen Penghasilan" iconEl={<FiDollarSign size={16} />} iconColor="green">
                <InfoRow label="Gaji Pokok" value={formatCurrency(salary.baseSalary)} />
                <InfoRow label="Tunjangan" value={formatCurrency(salary.allowance)} />
                <InfoRow label="Upah Lembur" value={formatCurrency(salary.overtimePay)} />
                <div className="ep-info-row" style={{ borderTop: '2px solid var(--border)', marginTop: 2 }}>
                  <span className="ep-info-label" style={{ fontWeight: 800 }}>Penghasilan Kotor</span>
                  <span className="ep-info-value highlight" style={{ fontSize: 15, fontWeight: 800 }}>
                    {formatCurrency(salary.grossIncome)}
                  </span>
                </div>
              </SectionCard>

              {/* Potongan — hanya yang enabled */}
              <SectionCard title="Potongan" iconEl={<FiShield size={16} />} iconColor="red">
                {noDeductions ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    Tidak ada potongan yang aktif. Konfigurasi di Settings &gt; Payroll.
                  </div>
                ) : (
                  <>
                    {allDeductions.map(d => (
                      <InfoRow
                        key={d.key}
                        label={d.label}
                        value={`- ${formatCurrency(d.value)}`}
                        type="danger"
                      />
                    ))}
                    {/* Biaya Jabatan (info saja) */}
                    {salary.biayaJabatan > 0 && (
                      <InfoRow label="Biaya Jabatan (pengurang PKP)" value={`- ${formatCurrency(salary.biayaJabatan)}`} type="muted" />
                    )}
                    <div className="ep-info-row" style={{ borderTop: '2px solid var(--border)', marginTop: 2 }}>
                      <span className="ep-info-label" style={{ fontWeight: 800 }}>Total Potongan</span>
                      <span className="ep-info-value danger" style={{ fontSize: 15, fontWeight: 800 }}>
                        - {formatCurrency(salary.totalDeductions)}
                      </span>
                    </div>
                  </>
                )}
              </SectionCard>

              {/* Keterangan PPh 21 */}
              {cfg.pph21?.enabled && (
                <div className="ep-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="ep-card-header">
                    <div className="ep-card-icon blue"><FiInfo size={16} /></div>
                    <span className="ep-card-title">Detail Perhitungan PPh 21</span>
                  </div>
                  <div className="ep-card-body">
                    <InfoRow label="Status PTKP" value={salary.ptkpStatus} />
                    <InfoRow label="Penghasilan Bruto Setahun" value={formatCurrency((salary.grossIncome || 0) * 12)} />
                    <InfoRow label="Biaya Jabatan (maks 6 jt/thn)" value={`- ${formatCurrency(salary.biayaJabatan || 0)}`} />
                    <InfoRow label="BPJS Setahun" value={`- ${formatCurrency((salary.bpjs?.total || 0) * 12)}`} />
                    <InfoRow label="PTKP" value={`- ${formatCurrency(salary.annualPKP !== undefined ? ((salary.grossIncome - (salary.bpjs?.total||0)) * 12 - (salary.biayaJabatan||0) - salary.annualPKP) : 0)}`} />
                    <div className="ep-info-row" style={{ borderTop: '2px solid var(--border)', marginTop: 2 }}>
                      <span className="ep-info-label" style={{ fontWeight: 800 }}>PKP (Penghasilan Kena Pajak)</span>
                      <span className="ep-info-value highlight" style={{ fontWeight: 800 }}>{formatCurrency(salary.annualPKP || 0)} / thn</span>
                    </div>
                    <InfoRow label="PPh 21 Bulanan" value={formatCurrency(salary.pph21 || 0)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB: HAK AKSES (Super Admin / Founder only)                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'access' && canAssignRole && (
        <div className="ep-access-grid">
          {/* Assignment Panel */}
          <SectionCard title="Hak Akses & Role" iconEl={<FiKey size={16} />} iconColor="purple">
            {/* Current Role */}
            <div style={{ padding: '0 24px 0' }}>
              <div
                className="ep-role-current"
                style={{ background: `${ROLE_COLORS[emp.role || 'employee']}10`, border: `1.5px solid ${ROLE_COLORS[emp.role || 'employee']}25`, marginTop: 16 }}
              >
                <div className="ep-role-dot" style={{ background: ROLE_COLORS[emp.role || 'employee'] }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Role Saat Ini</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: ROLE_COLORS[emp.role || 'employee'] }}>
                    {ROLE_LABELS[emp.role || 'employee']}
                  </div>
                </div>
              </div>

              {/* Selector */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Ubah Role Menjadi
                </label>
                <div style={{ position: 'relative' }}>
                  <select className="ep-role-select" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                    <option value="employee">Employee — Akses PWA saja</option>
                    <option value="hr_admin">HR Admin — Staf HRD, akses penuh portal HR</option>
                    <option value="manager">Manager — Approvals, KPI, tim</option>
                    <option value="super_admin">Owner — Pemilik / Bos Perusahaan</option>
                  </select>
                </div>
              </div>

              {/* Desc */}
              <div className="ep-role-desc" style={{ marginBottom: 16 }}>
                {selectedRole === 'employee' && 'Karyawan hanya bisa mengakses aplikasi PWA mobile. Tidak bisa masuk ke portal HR.'}
                {selectedRole === 'hr_admin' && 'Staf HRD. Bisa mengakses seluruh portal HR: karyawan, payroll, rekrutmen, training, kontrak, dan lebih banyak lagi.'}
                {selectedRole === 'manager' && 'Bisa mengakses approvals (cuti, lembur, reimbursement), KPI, proyek, dan absensi tim.'}
                {selectedRole === 'super_admin' && 'Owner / Pemilik Perusahaan. Akses penuh termasuk manajemen cabang, audit trail, billing, dan assignment hak akses karyawan.'}
              </div>

              {/* Warning for downgrade */}
              {['hr_admin', 'manager', 'super_admin'].includes(emp.role) && selectedRole === 'employee' && (
                <div className="ep-role-warning">
                  <FiAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Mengubah ke Employee akan mencabut akses portal HR pada login berikutnya.</span>
                </div>
              )}

              {/* Save */}
              <button
                className={`ep-role-save-btn ${selectedRole === emp.role ? 'disabled' : 'primary'}`}
                onClick={handleSaveRole}
                disabled={savingRole || selectedRole === emp.role}
                style={{ marginBottom: 14 }}
              >
                {savingRole
                  ? <><FiLoader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Menyimpan...</>
                  : roleSaved
                  ? <><FiCheck size={15} /> Role berhasil disimpan</>
                  : selectedRole === emp.role
                  ? 'Role tidak berubah'
                  : `Simpan — Ubah ke ${ROLE_LABELS[selectedRole]}`
                }
              </button>

              {roleError && (
                <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginBottom: 14 }}>{roleError}</div>
              )}

              <div className="ep-role-note">
                Perubahan role berlaku saat karyawan login ulang. Sesi aktif tidak terpengaruh hingga berakhir.
              </div>
            </div>
          </SectionCard>

          {/* Reference Card */}
          <SectionCard title="Referensi Akses per Role" iconEl={<FiInfo size={16} />} iconColor="blue">
            <div style={{ padding: '12px 24px' }}>
              {[
                { role: 'employee', access: ['PWA Mobile — Absen, Cuti, Payslip, Pengajuan', 'Profil dan data pribadi', 'Direktori & pengumuman perusahaan'] },
                { role: 'hr_admin', access: ['Semua akses Employee', 'Data karyawan & rekrutmen', 'Payroll & reimbursement', 'Kontrak & dokumen', 'Training & onboarding'] },
                { role: 'manager', access: ['Semua akses Employee', 'Approval cuti / lembur / reimburse', 'KPI & penilaian kinerja', 'Proyek & timesheet', 'Absensi tim'] },
                { role: 'super_admin', access: ['Semua akses HR Admin & Manager', 'Pengaturan sistem & cabang', 'Audit trail lengkap', 'Manajemen billing & langganan', 'Assignment hak akses karyawan'] },
              ].map(r => (
                <div key={r.role} className="ep-ref-item">
                  <div className="ep-ref-role-label">
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: ROLE_COLORS[r.role], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: ROLE_COLORS[r.role] }}>{ROLE_LABELS[r.role]}</span>
                  </div>
                  {r.access.map(a => (
                    <div key={a} className="ep-ref-access-item">{a}</div>
                  ))}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      <EmployeeModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={() => { setEditOpen(false); }}
        employee={emp}
      />
    </div>
  );
}
