/**
 * Owner setup wizard — post-checkout company bootstrap (5 minutes).
 * Steps: Company → Invite code → Department → Done
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import {
  Building2,
  Copy,
  Check,
  Users,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Share2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getOwnerSetupState,
  ensureOwnerCompany,
  ensureCompanyCode,
  seedFirstDepartment,
  completeOwnerSetup,
} from '../services/ownerSetupService';
import { markNoIndex } from '../lib/seo';
import './OwnerSetupWizard.css';

const STEPS = [
  { key: 'company', label: 'Perusahaan' },
  { key: 'code', label: 'Kode undangan' },
  { key: 'team', label: 'Tim' },
  { key: 'done', label: 'Selesai' },
];

export default function OwnerSetupWizard() {
  const navigate = useNavigate();
  const { user, employee, refreshEmployee } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState({
    name: '',
    industry: '',
    phone: '',
    address: '',
    website: '',
    deptName: 'General Affairs',
    deptCode: 'GA',
  });

  useEffect(() => {
    markNoIndex('KiniKerja — Setup');
  }, []);

  useEffect(() => {
    if (!user && !employee) {
      // Wait briefly for auth; if still empty redirect
      const t = setTimeout(() => {
        if (!user) navigate('/login', { replace: true });
      }, 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [user, employee, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const state = await getOwnerSetupState();
    if (state.complete) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (state.company) {
      setCompany(state.company);
      setForm((f) => ({
        ...f,
        name: state.company.name || f.name,
        industry: state.company.industry || '',
        phone: state.company.phone || '',
        address: state.company.address || '',
        website: state.company.website || '',
      }));
      if (state.company.company_code) setStep(1);
    } else {
      // Prefill from onboarding if available via employee name only
      setForm((f) => ({
        ...f,
        name: f.name || employee?.companies?.name || '',
        phone: f.phone || employee?.phone || '',
      }));
    }
    setLoading(false);
  }, [navigate, employee]);

  useEffect(() => { load(); }, [load]);

  const handleSaveCompany = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('Nama perusahaan wajib diisi');
      return;
    }
    setSaving(true);
    const { data, error: err } = await ensureOwnerCompany({
      name: form.name,
      industry: form.industry,
      phone: form.phone,
      address: form.address,
      website: form.website,
    });
    if (err || !data) {
      setError(err?.message || 'Gagal menyimpan perusahaan');
      setSaving(false);
      return;
    }
    const codeRes = await ensureCompanyCode(data.id);
    setCompany(codeRes.data || data);
    if (typeof refreshEmployee === 'function') await refreshEmployee();
    setSaving(false);
    setStep(1);
  };

  const handleCopyCode = async () => {
    const code = company?.company_code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Salin gagal — salin manual: ' + code);
    }
  };

  const handleSeedDept = async () => {
    setError('');
    if (!company?.id) {
      setError('Perusahaan belum siap');
      return;
    }
    setSaving(true);
    if (form.deptName.trim()) {
      await seedFirstDepartment(company.id, {
        name: form.deptName.trim(),
        code: form.deptCode.trim() || 'GA',
      });
    }
    setSaving(false);
    setStep(3);
  };

  const handleFinish = async () => {
    if (!company?.id) {
      setError('Perusahaan belum siap');
      return;
    }
    setSaving(true);
    const { error: err } = await completeOwnerSetup(company.id, {
      by: user?.email,
      steps: STEPS.map((s) => s.key),
    });
    setSaving(false);
    if (err) {
      setError(err.message || 'Gagal menyelesaikan setup');
      return;
    }
    if (typeof refreshEmployee === 'function') await refreshEmployee();
    navigate('/dashboard', { replace: true });
  };

  if (loading) {
    return (
      <div className="osw-root">
        <div className="osw-card osw-loading">Menyiapkan wizard…</div>
      </div>
    );
  }

  return (
    <div className="osw-root">
      <div className="osw-card">
        <div className="osw-brand">
          <img src="/landing/kinikerjalogo.jpeg" alt="" className="osw-logo" />
          <div>
            <div className="osw-brand-name">KiniKerja</div>
            <div className="osw-brand-sub">Setup perusahaan · ~5 menit</div>
          </div>
        </div>

        <div className="osw-steps" role="list">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              role="listitem"
              className={`osw-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            >
              <span className="osw-step-num">{i < step ? '✓' : i + 1}</span>
              <span className="osw-step-label">{s.label}</span>
            </div>
          ))}
        </div>

        {error && <div className="osw-error">{error}</div>}

        {/* Step 0 — Company */}
        {step === 0 && (
          <div className="osw-panel">
            <h1 className="osw-title">
              <Icon icon={Building2} size="md" color="inherit" /> Profil perusahaan
            </h1>
            <p className="osw-desc">
              Data ini jadi tenant multi-company Anda. Karyawan daftar pakai kode undangan.
            </p>
            <div className="osw-form">
              <label className="osw-label">
                Nama perusahaan *
                <input
                  className="osw-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="PT Maju Jaya"
                />
              </label>
              <label className="osw-label">
                Industri
                <input
                  className="osw-input"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="Teknologi, Retail, …"
                />
              </label>
              <label className="osw-label">
                Telepon
                <input
                  className="osw-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label className="osw-label osw-full">
                Alamat
                <input
                  className="osw-input"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </label>
              <label className="osw-label osw-full">
                Website
                <input
                  className="osw-input"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://"
                />
              </label>
            </div>
            <div className="osw-actions">
              <button
                type="button"
                className="osw-btn osw-btn-primary"
                onClick={handleSaveCompany}
                disabled={saving}
              >
                Lanjut <Icon icon={ArrowRight} size="sm" color="inherit" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Code */}
        {step === 1 && (
          <div className="osw-panel">
            <h1 className="osw-title">
              <Icon icon={Share2} size="md" color="inherit" /> Kode undangan karyawan
            </h1>
            <p className="osw-desc">
              Bagikan kode ini ke karyawan. Mereka daftar di aplikasi ESS: /app/register
            </p>
            <div className="osw-code-box">
              <code>{company?.company_code || '—'}</code>
              <button type="button" className="osw-btn osw-btn-secondary" onClick={handleCopyCode}>
                {copied ? (
                  <>
                    <Icon icon={Check} size="sm" color="inherit" /> Disalin
                  </>
                ) : (
                  <>
                    <Icon icon={Copy} size="sm" color="inherit" /> Salin
                  </>
                )}
              </button>
            </div>
            <p className="osw-hint">
              Link ESS: <strong>{window.location.origin}/app/register</strong>
            </p>
            <div className="osw-actions">
              <button type="button" className="osw-btn osw-btn-ghost" onClick={() => setStep(0)}>
                <Icon icon={ArrowLeft} size="sm" color="inherit" /> Kembali
              </button>
              <button type="button" className="osw-btn osw-btn-primary" onClick={() => setStep(2)}>
                Lanjut <Icon icon={ArrowRight} size="sm" color="inherit" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Team / department */}
        {step === 2 && (
          <div className="osw-panel">
            <h1 className="osw-title">
              <Icon icon={Users} size="md" color="inherit" /> Departemen awal
            </h1>
            <p className="osw-desc">
              Opsional — buat satu departemen untuk mulai. Bisa diubah nanti di menu Departments.
            </p>
            <div className="osw-form">
              <label className="osw-label">
                Nama departemen
                <input
                  className="osw-input"
                  value={form.deptName}
                  onChange={(e) => setForm({ ...form, deptName: e.target.value })}
                />
              </label>
              <label className="osw-label">
                Kode
                <input
                  className="osw-input"
                  value={form.deptCode}
                  onChange={(e) => setForm({ ...form, deptCode: e.target.value })}
                  maxLength={10}
                />
              </label>
            </div>
            <div className="osw-actions">
              <button type="button" className="osw-btn osw-btn-ghost" onClick={() => setStep(1)}>
                <Icon icon={ArrowLeft} size="sm" color="inherit" /> Kembali
              </button>
              <button
                type="button"
                className="osw-btn osw-btn-secondary"
                onClick={() => setStep(3)}
                disabled={saving}
              >
                Lewati
              </button>
              <button
                type="button"
                className="osw-btn osw-btn-primary"
                onClick={handleSeedDept}
                disabled={saving}
              >
                Simpan & lanjut
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="osw-panel osw-panel-center">
            <div className="osw-done-icon">
              <Icon icon={Sparkles} size="lg" color="inherit" />
            </div>
            <h1 className="osw-title">Siap digunakan!</h1>
            <p className="osw-desc">
              Perusahaan <strong>{company?.name}</strong> sudah disiapkan. Lanjut ke dashboard untuk
              kelola karyawan, absensi, dan payroll.
            </p>
            <ul className="osw-checklist">
              <li>Dashboard & approval</li>
              <li>Import / tambah karyawan</li>
              <li>Bagikan kode {company?.company_code}</li>
            </ul>
            <div className="osw-actions osw-actions-center">
              <button
                type="button"
                className="osw-btn osw-btn-primary"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? 'Menyimpan…' : 'Buka Dashboard'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
