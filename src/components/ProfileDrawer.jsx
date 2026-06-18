import { useState, useRef, useEffect } from 'react';
import {
  HiArrowDownTray,
  HiArrowLeftOnRectangle,
  HiArrowTopRightOnSquare,
  HiBell,
  HiBriefcase,
  HiCamera,
  HiCheck,
  HiChevronRight,
  HiCurrencyDollar,
  HiDocumentDuplicate,
  HiGlobeAmericas,
  HiInformationCircle,
  HiLockClosed,
  HiMoon,
  HiPauseCircle,
  HiPlayCircle,
  HiShieldCheck,
  HiSun,
  HiUser,
  HiXMark
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { isFounder, ROLE_LABELS, ROLE_COLORS, getRole } from '../lib/rbac';
import { useTranslation, LOCALES } from '../lib/i18n';
import { useToast } from './Toast';
import { loadPayrollConfig, savePayrollConfig, DEFAULT_PAYROLL_CONFIG, PTKP_VALUES } from '../lib/payrollConfig';
import AvatarPicker from './AvatarPicker';
import '../styles/shared.css';
import './ProfileDrawer.css';

// ── Toggle Component ─────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <label className="pd-toggle" onClick={onChange}>
      <div className={`pd-toggle-track${checked ? ' on' : ''}`}>
        <div className="pd-toggle-thumb" />
      </div>
    </label>
  );
}

// ── Section Card ─────────────────────────────────────────────────
function PdCard({ title, iconEl, iconColor = 'blue', children, actions }) {
  return (
    <div className="pd-card">
      <div className="pd-card-header">
        <div className={`pd-card-icon ${iconColor}`}>{iconEl}</div>
        <span className="pd-card-title">{title}</span>
      </div>
      <div className="pd-card-body">
        {children}
        {actions && <div className="pd-actions">{actions}</div>}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function ProfileDrawer({ open, onClose }) {
  const { user, employee, signOut, refreshEmployee } = useAuth();
  const { locale, setLocale } = useTranslation();
  const { toast } = useToast();

  const founderUser = isFounder(user, employee);
  const role = employee?.role || 'employee';
  const currentRole = getRole(employee);
  const canManagePayroll = ['hr_admin', 'super_admin'].includes(currentRole) || founderUser;

  // Dynamic tabs
  const TABS = [
    { key: 'account',       label: 'Profil Akun',        icon: <HiUser size={13} /> },
    { key: 'security',      label: 'Keamanan',            icon: <HiLockClosed size={13} /> },
    { key: 'company',       label: 'Perusahaan',          icon: <HiGlobeAmericas size={13} /> },
    { key: 'career',        label: 'Career Page',         icon: <HiBriefcase size={13} /> },
    { key: 'notifications', label: 'Notifikasi',          icon: <HiBell size={13} /> },
    { key: 'appearance',    label: 'Tampilan',            icon: <HiMoon size={13} /> },
    ...(canManagePayroll ? [{ key: 'payroll', label: 'Payroll & Potongan', icon: <HiCurrencyDollar size={13} /> }] : []),
  ];

  const [activeTab, setActiveTab] = useState('account');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef();
  const slugDebounceRef = useRef(null);

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  // Handle avatar selection (from picker or upload)
  const handleAvatarSelect = async (url) => {
    setAvatarUrl(url);
    try {
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      if (employee?.id) await supabase.from('employees').update({ photo_url: url }).eq('id', employee.id);
      await refreshEmployee();
      toast.success('Foto profil berhasil diperbarui.');
    } catch (_) {
      toast.error('Gagal menyimpan foto.');
    }
  };

  // ── Account form ──
  const [accountForm, setAccountForm] = useState({ name: '', email: '', phone: '', position: '' });
  const [departments, setDepartments] = useState([]);
  const [deptSelected, setDeptSelected] = useState('');

  // ── Company form ──
  const [companyForm, setCompanyForm] = useState(() => {
    try {
      const s = localStorage.getItem('HRIS Loka_company_settings');
      return s ? JSON.parse(s) : { name: 'PT HRIS Loka Indonesia', address: 'Jl. Sudirman No. 123, Jakarta Selatan', phone: '(021) 555-0123', website: 'hrisloka.id' };
    } catch { return { name: '', address: '', phone: '', website: '' }; }
  });

  // ── Career form ──
  const [careerForm, setCareerForm] = useState({
    slug: 'informasilowongan', company_name: 'HRIS Loka',
    company_description: '', accent_color: '#0047AB', is_active: true,
  });
  const [originalSlug, setOriginalSlug] = useState('informasilowongan');
  // 'idle' | 'checking' | 'available' | 'taken'
  const [slugStatus, setSlugStatus] = useState('idle');

  // ── Notifications ──
  const [notifications, setNotifications] = useState(() => {
    try {
      const s = localStorage.getItem('HRIS Loka_notifications');
      return s ? JSON.parse(s) : { emailLeave: true, emailPayroll: true, emailReimbursement: true, pushAttendance: true, pushApproval: true, pushAnnouncement: true };
    } catch { return { emailLeave: true, emailPayroll: true, emailReimbursement: true, pushAttendance: true, pushApproval: true, pushAnnouncement: true }; }
  });
  useEffect(() => { localStorage.setItem('HRIS Loka_notifications', JSON.stringify(notifications)); }, [notifications]);

  // ── Security form ──
  const [securityForm, setSecurityForm] = useState({ newPassword: '', confirmPassword: '' });

  // ── Appearance ──
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('hrisync_theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('hrisync_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // ── Payroll config ──
  const [payrollConfig, setPayrollConfig] = useState(() => loadPayrollConfig());

  // ── Sync from auth ──
  useEffect(() => {
    if (employee) {
      setAccountForm({
        name: employee.name || user?.user_metadata?.full_name || '',
        email: employee.email || user?.email || '',
        phone: employee.phone || '',
        position: employee.position || '',
      });
      setDeptSelected(employee.department || '');
      setAvatarUrl(employee.photo_url || user?.user_metadata?.avatar_url || null);
    } else if (user) {
      setAccountForm({ name: user.user_metadata?.full_name || '', email: user.email || '', phone: '', position: '' });
      setAvatarUrl(user.user_metadata?.avatar_url || null);
    }
  }, [employee, user]);

  // ── Load dept & career ──
  useEffect(() => {
    supabase.from('departments').select('id,name').eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setDepartments(data); });
    supabase.from('career_settings').select('*').limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCareerForm({
            slug: data.slug || 'informasilowongan',
            company_name: data.company_name || 'HRIS Loka',
            company_description: data.company_description || '',
            accent_color: data.accent_color || '#0047AB',
            is_active: data.is_active !== false,
          });
          setOriginalSlug(data.slug || 'informasilowongan');
        }
      }).catch(() => {});
  }, []);

  // ESC to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // ═════════════════════ HANDLERS ═════════════════════

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(publicUrl);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (employee?.id) await supabase.from('employees').update({ photo_url: publicUrl }).eq('id', employee.id);
      await refreshEmployee();
      toast.success('Foto profil berhasil diperbarui.');
    } catch (_err) {
      toast.error('Gagal upload foto.');
    }
    setUploading(false);
  };

  const handleSaveAccount = async () => {
    setSaving(true);
    try {
      await supabase.auth.updateUser({ data: { full_name: accountForm.name } });
      const updates = { name: accountForm.name, phone: accountForm.phone || null, position: accountForm.position || null, department: deptSelected || null };
      if (employee?.id) {
        const { error } = await supabase.from('employees').update(updates).eq('id', employee.id);
        if (error) throw error;
      }
      const fresh = await refreshEmployee();
      if (fresh) {
        setAccountForm({ name: fresh.name || '', email: fresh.email || user?.email || '', phone: fresh.phone || '', position: fresh.position || '' });
        setDeptSelected(fresh.department || '');
        setAvatarUrl(fresh.photo_url || user?.user_metadata?.avatar_url || null);
      }
      toast.success('Profil berhasil diperbarui.');
      showSaved();
    } catch (_err) {
      toast.error('Gagal menyimpan: ' + _err.message);
    }
    setSaving(false);
  };

  const handleSaveCompany = () => {
    localStorage.setItem('HRIS Loka_company_settings', JSON.stringify(companyForm));
    toast.success('Pengaturan perusahaan disimpan.');
    showSaved();
  };

  const handleSaveCareer = async () => {
    if (slugStatus === 'taken') { toast.error('URL slug sudah dipakai perusahaan lain. Pilih slug yang berbeda.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('career_settings').upsert({ id: 1, ...careerForm }, { onConflict: 'id' });
      if (error) throw error;
      setOriginalSlug(careerForm.slug);
      setSlugStatus('idle');
      toast.success('Career page settings disimpan.');
    } catch {
      localStorage.setItem('HRIS Loka_career_settings', JSON.stringify(careerForm));
      toast.info('Disimpan lokal. Jalankan migration SQL untuk simpan ke database.');
    }
    setSaving(false);
    showSaved();
  };

  const checkSlugAvailability = async (slug) => {
    if (!slug || slug === originalSlug) { setSlugStatus('idle'); return; }
    setSlugStatus('checking');
    try {
      const { data, error } = await supabase
        .from('career_settings')
        .select('slug')
        .eq('slug', slug)
        .neq('slug', originalSlug)
        .limit(1);
      if (!error) {
        setSlugStatus(data && data.length > 0 ? 'taken' : 'available');
      } else {
        setSlugStatus('idle');
      }
    } catch {
      setSlugStatus('idle');
    }
  };

  const handleSlugChange = (rawValue) => {
    const clean = rawValue.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setCareerForm(prev => ({ ...prev, slug: clean }));
    setSlugStatus(clean === originalSlug ? 'idle' : 'checking');
    clearTimeout(slugDebounceRef.current);
    slugDebounceRef.current = setTimeout(() => checkSlugAvailability(clean), 600);
  };

  const handleChangePassword = async () => {
    if (!securityForm.newPassword) { toast.warning('Masukkan password baru.'); return; }
    if (securityForm.newPassword !== securityForm.confirmPassword) { toast.warning('Konfirmasi password tidak cocok.'); return; }
    if (securityForm.newPassword.length < 6) { toast.warning('Password minimal 6 karakter.'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: securityForm.newPassword });
    setSaving(false);
    if (error) { toast.error('Gagal ubah password: ' + error.message); }
    else { setSecurityForm({ newPassword: '', confirmPassword: '' }); toast.success('Password berhasil diubah.'); showSaved(); }
  };

  const handleSavePayroll = () => {
    savePayrollConfig(payrollConfig);
    toast.success('Konfigurasi payroll disimpan.');
    showSaved();
  };

  const handleLogout = async () => {
    await signOut();
    window.location.replace('/login');
  };

  const initials = accountForm.name
    ? accountForm.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() || 'U');

  // ═════════════════════ RENDER ═════════════════════
  return (
    <>
      {/* Backdrop */}
      <div className={`profile-backdrop ${open ? 'open' : ''}`} onClick={onClose} />

      {/* Drawer */}
      <div className={`pd-drawer ${open ? 'open' : ''}`}>

        {/* ── Header ── */}
        <div className="pd-header">
          <span className="pd-header-title">Profil & Pengaturan</span>
          <div className="pd-header-right">
            {saved && (
              <span className="pd-saved-badge">
                <HiCheck size={13} /> Tersimpan
              </span>
            )}
            <button className="pd-close-btn" onClick={onClose}><HiXMark size={16} /></button>
          </div>
        </div>

        {/* ── Hero Banner ── */}
        <div className="pd-hero">
          <div className="pd-avatar-wrap">
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar" className="pd-avatar-img" />
              : <div className="pd-avatar-initials">{initials}</div>}
            <button
              className="pd-avatar-btn"
              onClick={() => setShowAvatarPicker(true)}
              disabled={uploading}
              title="Ganti foto profil"
            >
              {uploading ? <span className="pd-spinner" /> : <HiCamera size={13} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>

          <div className="pd-hero-info">
            <div className="pd-hero-name">{accountForm.name || user?.email?.split('@')[0] || 'Pengguna'}</div>
            <div className="pd-hero-chips">
              <span className="pd-chip role">
                <HiShieldCheck size={9} /> {founderUser ? 'Founder' : (ROLE_LABELS[role] || 'Employee')}
              </span>
            </div>
            <div className="pd-hero-email">{accountForm.email}</div>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="pd-tab-bar">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`pd-tab-btn${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Scrollable Body ── */}
        <div className="pd-body">

          {/* ══ PROFIL AKUN ══ */}
          {activeTab === 'account' && (
            <PdCard
              title="Informasi Akun"
              iconEl={<HiUser size={16} />}
              iconColor="blue"
              actions={
                <button className="btn-primary" onClick={handleSaveAccount} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <HiArrowDownTray size={14} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              }
            >
              <div className="pd-form-grid">
                <div className="pd-form-group">
                  <label className="pd-form-label">Nama Lengkap</label>
                  <input className="pd-form-input" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Nama lengkap" />
                </div>
                <div className="pd-form-group">
                  <label className="pd-form-label">Email</label>
                  <input className="pd-form-input" value={accountForm.email} disabled />
                  <span className="pd-form-hint">Email tidak dapat diubah dari sini.</span>
                </div>
                <div className="pd-form-group">
                  <label className="pd-form-label">No. Telepon</label>
                  <input className="pd-form-input" value={accountForm.phone} onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
                </div>
                <div className="pd-form-group">
                  <label className="pd-form-label">Jabatan</label>
                  <input className="pd-form-input" value={accountForm.position} onChange={e => setAccountForm({ ...accountForm, position: e.target.value })} placeholder="Contoh: Manager HRD" />
                </div>
                <div className="pd-form-group pd-form-full">
                  <label className="pd-form-label">Departemen</label>
                  <select className="pd-form-select" value={deptSelected} onChange={e => setDeptSelected(e.target.value)}>
                    <option value="">-- Pilih Departemen --</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                  {departments.length === 0 && (
                    <span className="pd-form-hint">Belum ada departemen. Tambahkan di menu Departemen.</span>
                  )}
                </div>
              </div>
            </PdCard>
          )}

          {/* ══ KEAMANAN ══ */}
          {activeTab === 'security' && (
            <PdCard
              title="Keamanan Akun"
              iconEl={<HiLockClosed size={16} />}
              iconColor="red"
              actions={
                <button className="btn-primary" onClick={handleChangePassword} disabled={saving || !securityForm.newPassword} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <HiLockClosed size={14} /> {saving ? 'Menyimpan...' : 'Ubah Password'}
                </button>
              }
            >
              <div className="pd-form-grid">
                <div className="pd-form-group pd-form-full">
                  <label className="pd-form-label">Password Baru</label>
                  <input type="password" className="pd-form-input" value={securityForm.newPassword} onChange={e => setSecurityForm({ ...securityForm, newPassword: e.target.value })} placeholder="Minimal 6 karakter" />
                </div>
                <div className="pd-form-group pd-form-full">
                  <label className="pd-form-label">Konfirmasi Password Baru</label>
                  <input type="password" className="pd-form-input" value={securityForm.confirmPassword} onChange={e => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })} placeholder="Ketik ulang password baru" />
                </div>
              </div>
              <div className="pd-session-box" style={{ marginTop: 16 }}>
                <div className="pd-session-title">Sesi Aktif</div>
                <div className="pd-session-desc">
                  Login terakhir: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </PdCard>
          )}

          {/* ══ PERUSAHAAN ══ */}
          {activeTab === 'company' && (
            <PdCard
              title="Informasi Perusahaan"
              iconEl={<HiGlobeAmericas size={16} />}
              iconColor="teal"
              actions={
                <button className="btn-primary" onClick={handleSaveCompany} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <HiArrowDownTray size={14} /> Simpan
                </button>
              }
            >
              <div className="pd-form-grid">
                <div className="pd-form-group">
                  <label className="pd-form-label">Nama Perusahaan</label>
                  <input className="pd-form-input" value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} />
                </div>
                <div className="pd-form-group">
                  <label className="pd-form-label">Website</label>
                  <input className="pd-form-input" value={companyForm.website} onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })} placeholder="www.perusahaan.com" />
                </div>
                <div className="pd-form-group pd-form-full">
                  <label className="pd-form-label">Alamat</label>
                  <input className="pd-form-input" value={companyForm.address} onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })} />
                </div>
                <div className="pd-form-group">
                  <label className="pd-form-label">Telepon Kantor</label>
                  <input className="pd-form-input" value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} placeholder="(021) xxx-xxxx" />
                </div>
              </div>
            </PdCard>
          )}

          {/* ══ CAREER PAGE ══ */}
          {activeTab === 'career' && (
            <>
              <PdCard
                title="Career Page Settings"
                iconEl={<HiBriefcase size={16} />}
                iconColor="purple"
                actions={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 10 }}>
                    <a href={`/careers/${careerForm.slug}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                      <HiArrowTopRightOnSquare size={13} /> Preview Halaman Karir
                    </a>
                    <button className="btn-primary" onClick={handleSaveCareer} disabled={saving || slugStatus === 'taken'} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <HiArrowDownTray size={14} /> {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                }
              >
                <div className="pd-form-grid">
                  <div className="pd-form-group">
                    <label className="pd-form-label">Nama Perusahaan</label>
                    <input className="pd-form-input" value={careerForm.company_name} onChange={e => setCareerForm({ ...careerForm, company_name: e.target.value })} placeholder="PT Contoh Indonesia" />
                    <span className="pd-form-hint">Tampil sebagai "Karir di [Nama]" di halaman publik.</span>
                  </div>
                  <div className="pd-form-group">
                    <label className="pd-form-label">URL Slug</label>
                    <div style={{ display: 'flex' }}>
                      <div style={{ padding: '10px 11px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>/careers/</div>
                      <input
                        className="pd-form-input"
                        style={{
                          borderRadius: '0 10px 10px 0', borderLeft: 'none',
                          borderColor: slugStatus === 'taken' ? '#EF4444' : slugStatus === 'available' ? '#10B981' : undefined,
                          boxShadow: slugStatus === 'taken' ? '0 0 0 3px rgba(239,68,68,0.1)' : slugStatus === 'available' ? '0 0 0 3px rgba(16,185,129,0.1)' : undefined,
                        }}
                        value={careerForm.slug}
                        onChange={e => handleSlugChange(e.target.value)}
                        placeholder="nama-perusahaan-anda"
                      />
                    </div>
                    {/* Slug status indicator */}
                    {slugStatus === 'checking' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 12, color: 'var(--muted)' }}>
                        <span style={{ width: 12, height: 12, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                        Mengecek ketersediaan URL...
                      </div>
                    )}
                    {slugStatus === 'available' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 12, fontWeight: 600, color: '#059669' }}>
                        <span style={{ fontSize: 14 }}>✓</span> URL tersedia — dapat digunakan
                      </div>
                    )}
                    {slugStatus === 'taken' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 12, fontWeight: 600, color: '#DC2626' }}>
                        <span style={{ fontSize: 14 }}>✕</span> URL ini sudah dipakai perusahaan lain. Pilih URL yang berbeda.
                      </div>
                    )}
                    {slugStatus === 'idle' && (
                      <span className="pd-form-hint">Hanya huruf kecil, angka, dan tanda hubung (-)</span>
                    )}
                  </div>
                  <div className="pd-form-group pd-form-full">
                    <label className="pd-form-label">Deskripsi Perusahaan</label>
                    <textarea className="pd-form-textarea" value={careerForm.company_description} onChange={e => setCareerForm({ ...careerForm, company_description: e.target.value })} placeholder="Deskripsi singkat perusahaan..." rows={3} />
                  </div>
                  <div className="pd-form-group">
                    <label className="pd-form-label">Warna Aksen</label>
                    <div className="pd-color-row">
                      <input type="color" value={careerForm.accent_color} onChange={e => setCareerForm({ ...careerForm, accent_color: e.target.value })} style={{ width: 42, height: 38, border: '2px solid var(--border)', borderRadius: 8, padding: 2, cursor: 'pointer', background: 'none' }} />
                      <input className="pd-form-input" value={careerForm.accent_color} onChange={e => setCareerForm({ ...careerForm, accent_color: e.target.value })} style={{ width: 100 }} />
                      {['#0047AB', '#16A34A', '#DC2626', '#7C3AED', '#EA580C', '#0891B2'].map(c => (
                        <div key={c} className={`pd-color-swatch${careerForm.accent_color === c ? ' selected' : ''}`}
                          style={{ background: c }} onClick={() => setCareerForm({ ...careerForm, accent_color: c })} />
                      ))}
                    </div>
                  </div>
                  <div className="pd-form-group">
                    <label className="pd-form-label">Status Halaman</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
                      <Toggle checked={careerForm.is_active} onChange={() => setCareerForm({ ...careerForm, is_active: !careerForm.is_active })} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: careerForm.is_active ? 'var(--primary)' : 'var(--muted)' }}>
                        {careerForm.is_active ? 'Aktif — Dapat diakses publik' : 'Nonaktif — Tidak dapat diakses'}
                      </span>
                    </div>
                  </div>
                </div>
              </PdCard>

              <PdCard title="URL Halaman Karir" iconEl={<HiArrowTopRightOnSquare size={16} />} iconColor="blue">
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.6 }}>
                  Bagikan URL ini ke publik agar kandidat bisa melihat lowongan dan melamar tanpa login.
                </p>
                <div className="pd-url-box">
                  <span className="pd-url-text">{typeof window !== 'undefined' ? window.location.origin : ''}/careers/{careerForm.slug}</span>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/careers/${careerForm.slug}`); toast.success('URL berhasil disalin.'); }}>
                    <HiDocumentDuplicate size={12} /> Salin
                  </button>
                </div>
              </PdCard>
            </>
          )}

          {/* ══ NOTIFIKASI ══ */}
          {activeTab === 'notifications' && (
            <>
              <PdCard title="Notifikasi Email" iconEl={<HiBell size={16} />} iconColor="blue">
                {[
                  { key: 'emailLeave',         label: 'Pengajuan Cuti',   desc: 'Notifikasi email saat ada pengajuan cuti baru' },
                  { key: 'emailPayroll',        label: 'Slip Gaji',        desc: 'Notifikasi email saat slip gaji terbit' },
                  { key: 'emailReimbursement',  label: 'Reimbursement',    desc: 'Notifikasi email saat reimburse diproses' },
                ].map(item => (
                  <div key={item.key} className="pd-toggle-row">
                    <div className="pd-toggle-info">
                      <div className="pd-toggle-label">{item.label}</div>
                      <div className="pd-toggle-desc">{item.desc}</div>
                    </div>
                    <Toggle checked={notifications[item.key]} onChange={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })} />
                  </div>
                ))}
              </PdCard>

              <PdCard title="Push Notifikasi" iconEl={<HiBell size={16} />} iconColor="green">
                {[
                  { key: 'pushAttendance',  label: 'Pengingat Absensi',  desc: 'Reminder clock-in setiap hari kerja' },
                  { key: 'pushApproval',    label: 'Permintaan Approval',desc: 'Notifikasi saat ada item yang perlu disetujui' },
                  { key: 'pushAnnouncement',label: 'Pengumuman Baru',    desc: 'Pengumuman dari manajemen perusahaan' },
                ].map(item => (
                  <div key={item.key} className="pd-toggle-row">
                    <div className="pd-toggle-info">
                      <div className="pd-toggle-label">{item.label}</div>
                      <div className="pd-toggle-desc">{item.desc}</div>
                    </div>
                    <Toggle checked={notifications[item.key]} onChange={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })} />
                  </div>
                ))}
              </PdCard>
            </>
          )}

          {/* ══ TAMPILAN ══ */}
          {activeTab === 'appearance' && (
            <>
              <PdCard title="Mode Tampilan" iconEl={<HiSun size={16} />} iconColor="orange">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div
                    className="pd-theme-card"
                    onClick={() => setDarkMode(false)}
                    style={{ borderColor: !darkMode ? 'var(--primary)' : 'var(--border)', background: '#fff' }}
                  >
                    <HiSun size={28} style={{ color: '#F59E0B', display: 'block', margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Light Mode</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Tema terang default</div>
                  </div>
                  <div
                    className="pd-theme-card"
                    onClick={() => setDarkMode(true)}
                    style={{ borderColor: darkMode ? 'var(--primary)' : 'var(--border)', background: '#1F2937', color: '#fff' }}
                  >
                    <HiMoon size={28} style={{ color: '#818CF8', display: 'block', margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Dark Mode</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Tema gelap, nyaman di mata</div>
                  </div>
                </div>
              </PdCard>

              <PdCard title="Bahasa / Language" iconEl={<HiGlobeAmericas size={16} />} iconColor="teal">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {LOCALES.map(loc => (
                    <div
                      key={loc.code}
                      className="pd-lang-card"
                      onClick={() => setLocale(loc.code)}
                      style={{ borderColor: locale === loc.code ? 'var(--primary)' : 'var(--border)', background: locale === loc.code ? 'rgba(0,71,171,0.06)' : 'var(--surface)' }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: locale === loc.code ? 'var(--primary)' : 'var(--text)' }}>
                        {loc.code.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{loc.label}</div>
                    </div>
                  ))}
                </div>
              </PdCard>
            </>
          )}

          {/* ══ KONFIGURASI PAYROLL ══ */}
          {activeTab === 'payroll' && canManagePayroll && (
            <>
              <div className="pd-alert info">
                Pengaturan ini menentukan komponen potongan yang ditampilkan pada profil karyawan dan slip gaji.
                Mengacu pada PP 64/2020, Permenaker 1/2024, dan UU HPP No. 7 Tahun 2021.
              </div>

              {/* PTKP Default */}
              <PdCard title="Status PTKP Default Perusahaan" iconEl={<HiInformationCircle size={16} />} iconColor="blue"
                actions={
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => { setPayrollConfig(DEFAULT_PAYROLL_CONFIG); toast.success('Konfigurasi direset ke default regulasi.'); }}>
                      Reset Default
                    </button>
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }} onClick={handleSavePayroll}>
                      <HiArrowDownTray size={13} /> Simpan Konfigurasi
                    </button>
                  </div>
                }
              >
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 0, lineHeight: 1.6 }}>
                  PTKP (Penghasilan Tidak Kena Pajak) digunakan untuk menghitung PPh 21. Pilih status default jika karyawan belum diset secara individual.
                </p>
                <div className="pd-ptkp-grid">
                  {Object.entries(PTKP_VALUES).map(([status, value]) => (
                    <button
                      key={status}
                      className={`pd-ptkp-btn${payrollConfig.defaultPTKP === status ? ' selected' : ''}`}
                      onClick={() => setPayrollConfig(prev => ({ ...prev, defaultPTKP: status }))}
                    >
                      <div className="pd-ptkp-label">{status}</div>
                      <div className="pd-ptkp-value">Rp {(value / 1_000_000).toFixed(1)} jt/tahun</div>
                    </button>
                  ))}
                </div>
              </PdCard>

              {/* Deduction Groups */}
              {[{
                title: 'BPJS Ketenagakerjaan & Kesehatan',
                iconColor: 'green',
                badge: 'Regulasi Wajib',
                desc: 'Iuran karyawan berdasarkan PP No. 64/2020 dan Permenaker No. 1/2024.',
                keys: ['bpjsKesehatan', 'bpjsJHT', 'bpjsJP'],
              }, {
                title: 'Pajak Penghasilan (PPh 21)',
                iconColor: 'red',
                badge: 'Regulasi Wajib',
                desc: 'Pajak penghasilan progresif berdasarkan UU HPP No. 7 Tahun 2021.',
                keys: ['pph21'],
              }, {
                title: 'Potongan Tambahan',
                iconColor: 'orange',
                badge: null,
                desc: 'Potongan kustom sesuai kebijakan perusahaan. Dapat diaktifkan per kebutuhan.',
                keys: ['loan', 'absenceDeduction', 'uniformDeduction', 'coop'],
              }].map(group => (
                <PdCard key={group.title} title={group.title} iconEl={<HiShieldCheck size={16} />} iconColor={group.iconColor}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                    <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{group.desc}</p>
                    {group.badge && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap', border: '1px solid rgba(245,158,11,0.2)', flexShrink: 0 }}>
                        {group.badge}
                      </span>
                    )}
                  </div>
                  {group.keys.map(key => {
                    const item = payrollConfig.deductions[key];
                    if (!item) return null;
                    const isOn = item.enabled;
                    return (
                      <div key={key} className={`pd-deduction-item${isOn ? ' active' : ''}`}>
                        <div style={{ flex: 1 }}>
                          <div className="pd-deduction-name">{item.label}</div>
                          {item.rate && (
                            <div className="pd-deduction-rate">
                              Rate: {(item.rate * 100).toFixed(0)}%
                              {item.wageCapBP ? ` · Batas upah: Rp ${item.wageCapBP.toLocaleString('id-ID')}` : ''}
                              {item.cap ? ` · Maks iuran: Rp ${item.cap.toLocaleString('id-ID')}` : ''}
                            </div>
                          )}
                          {!item.rate && (
                            <div className="pd-deduction-rate" style={{ color: 'var(--muted)' }}>
                              {item.description?.substring(0, 60)}...
                            </div>
                          )}
                        </div>
                        <button
                          className="pd-toggle-icon-btn"
                          style={{ color: isOn ? 'var(--primary)' : 'var(--muted)' }}
                          onClick={() => setPayrollConfig(prev => ({
                            ...prev,
                            deductions: { ...prev.deductions, [key]: { ...prev.deductions[key], enabled: !isOn } },
                          }))}
                          title={isOn ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {isOn ? <HiPlayCircle size={30} /> : <HiPauseCircle size={30} />}
                        </button>
                      </div>
                    );
                  })}
                </PdCard>
              ))}
            </>
          )}

        </div>{/* end pd-body */}

        {/* ── Footer ── */}
        <div className="pd-footer">
          <button className="pd-logout-btn" onClick={handleLogout}>
            <HiArrowLeftOnRectangle size={15} />
            Keluar dari Akun
            <HiChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.45 }} />
          </button>
        </div>

            </div>{/* end pd-drawer */}

      {/* Avatar Picker Modal */}
      <AvatarPicker
        open={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        onSelect={handleAvatarSelect}
        currentAvatar={avatarUrl}
        gender={employee?.gender}
      />

    </>
  );
}