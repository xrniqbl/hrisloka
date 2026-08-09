import { useState, useEffect, useMemo } from 'react';
import {
  FiUser,
  FiLock,
  FiGlobe,
  FiBell,
  FiMoon,
  FiSun,
  FiSave,
  FiCheck,
  FiShield,
  FiLifeBuoy,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getCompanyById, updateMyCompany } from '../services/companyService';
import { getMySubscription } from '../services/subscriptionService';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
} from '../services/companySettingsService';
import { ROLE_LABELS } from '../lib/rbac';
import UserAvatar from '../components/UserAvatar';
import SubscriptionStatus from '../components/SubscriptionStatus';
import PaymentHistory from '../components/PaymentHistory';
import PlatformSupportPanel from '../components/PlatformSupportPanel';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import '../styles/shared.css';
import './Settings.css';

const TABS = [
  { key: 'account', label: 'Profil', icon: <FiUser size={14} /> },
  { key: 'security', label: 'Keamanan', icon: <FiLock size={14} /> },
  { key: 'company', label: 'Perusahaan', icon: <FiGlobe size={14} /> },
  { key: 'notifications', label: 'Notifikasi', icon: <FiBell size={14} /> },
  { key: 'appearance', label: 'Tema', icon: <FiMoon size={14} /> },
  { key: 'subscription', label: 'Langganan', icon: <FiShield size={14} /> },
  { key: 'support', label: 'Support', icon: <FiLifeBuoy size={14} /> },
];

function formatDateId(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatSessionTime(iso) {
  if (!iso) return 'Sesi aktif saat ini';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Sesi aktif saat ini';
  }
}

export default function Settings() {
  const { employee, user, subscription: authSub, session, refreshEmployee } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [companyError, setCompanyError] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);
  const [liveSub, setLiveSub] = useState(null);

  const [accountForm, setAccountForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
  });

  const [companyForm, setCompanyForm] = useState({
    name: '',
    address: '',
    phone: '',
    website: '',
    company_code: '',
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const savedPrefs = localStorage.getItem('hrisync_notifications');
      return savedPrefs
        ? { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(savedPrefs) }
        : { ...DEFAULT_NOTIFICATION_PREFS };
    } catch {
      return { ...DEFAULT_NOTIFICATION_PREFS };
    }
  });
  const [notifSaving, setNotifSaving] = useState(false);

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('hrisync_theme') === 'dark',
  );

  // Theme sync
  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hrisync_theme', theme);
    window.dispatchEvent(new Event('hrisync-theme-change'));
  }, [darkMode]);

  // Load notification prefs from DB (fallback localStorage)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getNotificationPrefs(user.id).then(({ data }) => {
      if (cancelled || !data) return;
      setNotifications((prev) => ({ ...prev, ...data }));
      try {
        localStorage.setItem('hrisync_notifications', JSON.stringify(data));
      } catch { /* ignore */ }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Account form from employee
  useEffect(() => {
    if (employee) {
      setAccountForm({
        name: employee.name || '',
        email: employee.email || user?.email || '',
        phone: employee.phone || '',
        position: employee.position || '',
      });
    } else if (user) {
      setAccountForm((f) => ({
        ...f,
        email: user.email || '',
        name: user.user_metadata?.full_name || f.name,
      }));
    }
  }, [employee, user]);

  // Load company from Supabase
  useEffect(() => {
    const companyId = employee?.company_id;
    if (!companyId) return;

    let cancelled = false;
    (async () => {
      setCompanyLoading(true);
      const { data, error } = await getCompanyById(companyId);
      if (cancelled) return;
      if (error) {
        console.warn('[Settings] company load:', error.message);
      }
      if (data) {
        setCompanyForm({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          website: data.website || '',
          company_code: data.company_code || '',
        });
      }
      setCompanyLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [employee?.company_id]);

  // Enrich subscription for plan grid
  useEffect(() => {
    if (authSub) {
      setLiveSub(authSub);
      return;
    }
    let cancelled = false;
    getMySubscription().then(({ data }) => {
      if (!cancelled && data) setLiveSub(data);
    });
    return () => {
      cancelled = true;
    };
  }, [authSub]);

  const planInfo = useMemo(() => {
    const sub = liveSub || authSub;
    if (!sub) {
      return {
        plan: '—',
        billing: '—',
        start: '—',
        end: '—',
        status: 'none',
      };
    }
    const plan =
      sub.plan_name ||
      sub.plan_label ||
      sub.subscription_plans?.name ||
      sub.plan_slug ||
      '—';
    const billing =
      sub.billing_label ||
      (sub.billing_cycle === 'yearly'
        ? 'Tahunan'
        : sub.billing_cycle === 'monthly'
          ? 'Bulanan'
          : sub.billing_cycle || '—');
    const start = formatDateId(sub.starts_at || sub.start_date);
    const end = formatDateId(sub.expires_at || sub.end_date);
    return {
      plan,
      billing,
      start,
      end,
      status: sub.computed_status || sub.status || '—',
    };
  }, [liveSub, authSub]);

  const sessionLabel = useMemo(() => {
    const last =
      user?.last_sign_in_at ||
      session?.user?.last_sign_in_at ||
      null;
    return formatSessionTime(last);
  }, [user, session]);

  const roleLabel =
    ROLE_LABELS[employee?.role] || employee?.role?.replace(/_/g, ' ') || 'User';

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveAccount = async () => {
    if (!employee?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('employees')
      .update({
        name: accountForm.name,
        phone: accountForm.phone,
        position: accountForm.position,
      })
      .eq('id', employee.id);
    setSaving(false);
    if (error) {
      console.warn('[Settings] save account:', error.message);
      return;
    }
    if (typeof refreshEmployee === 'function') refreshEmployee();
    showSaved();
  };

  const handleSaveCompany = async () => {
    setCompanyError('');
    const companyId = employee?.company_id;
    if (!companyId) {
      setCompanyError('Akun belum terhubung ke perusahaan.');
      return;
    }
    if (!['super_admin', 'hr_admin'].includes(employee?.role)) {
      setCompanyError('Hanya Owner / HR Admin yang dapat mengubah data perusahaan.');
      return;
    }
    if (!companyForm.name?.trim()) {
      setCompanyError('Nama perusahaan wajib diisi.');
      return;
    }
    setSaving(true);
    const { data, error } = await updateMyCompany(companyId, {
      name: companyForm.name.trim(),
      address: companyForm.address?.trim() || null,
      phone: companyForm.phone?.trim() || null,
      website: companyForm.website?.trim() || null,
    });
    setSaving(false);
    if (error) {
      setCompanyError(error.message || 'Gagal menyimpan. Cek izin / RLS.');
      return;
    }
    if (data) {
      setCompanyForm((f) => ({
        ...f,
        name: data.name || f.name,
        address: data.address || '',
        phone: data.phone || '',
        website: data.website || '',
        company_code: data.company_code || f.company_code,
      }));
    }
    showSaved();
  };

  const handleNotifChange = async (key, checked) => {
    const next = { ...notifications, [key]: checked };
    setNotifications(next);
    try {
      localStorage.setItem('hrisync_notifications', JSON.stringify(next));
    } catch { /* ignore */ }
    if (!user?.id) return;
    setNotifSaving(true);
    await saveNotificationPrefs(user.id, next);
    setNotifSaving(false);
    showSaved();
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setPasswordError('Password baru tidak cocok.');
      return;
    }
    if (securityForm.newPassword.length < 6) {
      setPasswordError('Password minimal 6 karakter.');
      return;
    }
    if (!securityForm.currentPassword) {
      setPasswordError('Masukkan password saat ini terlebih dahulu.');
      return;
    }
    setSaving(true);
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password: securityForm.currentPassword,
    });
    if (verifyError) {
      setSaving(false);
      setPasswordError('Password saat ini salah.');
      return;
    }
    const { error } = await supabase.auth.updateUser({
      password: securityForm.newPassword,
    });
    setSaving(false);
    if (error) {
      setPasswordError('Gagal mengubah password: ' + error.message);
    } else {
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSaved();
    }
  };

  return (
    <div className="admin-page settings-page">
      <div className="settings-page-header">
        <div>
          <h1 className="settings-page-title">Settings</h1>
          <p className="settings-page-sub">Profil, keamanan, perusahaan, dan preferensi tampilan</p>
        </div>
        {saved && (
          <div className="settings-saved">
            <FiCheck size={14} /> Tersimpan
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="settings-tabs">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="settings-tab-btn">
              {tab.icon} {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Account ── */}
        <TabsContent value="account" className="settings-panel">
          <div className="settings-card">
            <div className="settings-card-head">
              <h3 className="settings-card-title">Informasi Akun</h3>
              <p className="settings-card-desc">Data profil yang tampil di dashboard HR</p>
            </div>

            <div className="settings-profile">
              <UserAvatar
                src={employee?.photo_url}
                name={accountForm.name}
                size={52}
                className="settings-avatar"
              />
              <div>
                <div className="settings-profile-name">{accountForm.name || '—'}</div>
                <div className="settings-profile-meta">{accountForm.email}</div>
                <span className="settings-role-pill">{roleLabel}</span>
              </div>
            </div>

            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label className="settings-label">Nama Lengkap</label>
                <Input
                  className="settings-input"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Email</label>
                <Input className="settings-input" value={accountForm.email} disabled />
                <span className="settings-hint">Email tidak dapat diubah dari sini</span>
              </div>
              <div className="settings-form-group">
                <label className="settings-label">No. Telepon</label>
                <Input
                  className="settings-input"
                  value={accountForm.phone}
                  onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                  placeholder="08xxx"
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Jabatan</label>
                <Input
                  className="settings-input"
                  value={accountForm.position}
                  onChange={(e) => setAccountForm({ ...accountForm, position: e.target.value })}
                />
              </div>
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="settings-btn settings-btn-primary"
                onClick={handleSaveAccount}
                disabled={saving || !employee?.id}
              >
                <FiSave size={14} /> {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security" className="settings-panel">
          <div className="settings-card">
            <div className="settings-card-head">
              <h3 className="settings-card-title">
                <FiShield size={16} /> Keamanan Akun
              </h3>
              <p className="settings-card-desc">Ubah password login dashboard</p>
            </div>

            <div className="settings-form-grid">
              <div className="settings-form-group settings-form-group--full">
                <label className="settings-label">Password Saat Ini</label>
                <input
                  type="password"
                  className="settings-input"
                  value={securityForm.currentPassword}
                  onChange={(e) =>
                    setSecurityForm({ ...securityForm, currentPassword: e.target.value })
                  }
                  placeholder="Masukkan password saat ini"
                  autoComplete="current-password"
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Password Baru</label>
                <input
                  type="password"
                  className="settings-input"
                  value={securityForm.newPassword}
                  onChange={(e) =>
                    setSecurityForm({ ...securityForm, newPassword: e.target.value })
                  }
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Konfirmasi</label>
                <input
                  type="password"
                  className="settings-input"
                  value={securityForm.confirmPassword}
                  onChange={(e) =>
                    setSecurityForm({ ...securityForm, confirmPassword: e.target.value })
                  }
                  placeholder="Ketik ulang password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {passwordError && (
              <div className="settings-error" style={{ marginTop: 12 }}>
                {passwordError}
              </div>
            )}

            <div className="settings-actions">
              <button
                type="button"
                className="settings-btn settings-btn-primary"
                onClick={handleChangePassword}
                disabled={saving || !securityForm.newPassword}
              >
                <FiLock size={14} /> {saving ? 'Menyimpan…' : 'Ubah Password'}
              </button>
            </div>

            <div className="settings-notice">
              <strong>Session</strong>
              Login terakhir / sesi: {sessionLabel}
            </div>
          </div>
        </TabsContent>

        {/* ── Company ── */}
        <TabsContent value="company" className="settings-panel">
          <div className="settings-card">
            <div className="settings-card-head">
              <h3 className="settings-card-title">Informasi Perusahaan</h3>
              <p className="settings-card-desc">
                Data tenant disimpan di database (bukan hanya browser)
              </p>
            </div>

            {companyForm.company_code && (
              <div className="settings-code-row">
                <div className="settings-code-box">{companyForm.company_code}</div>
              </div>
            )}

            {companyLoading ? (
              <p className="settings-card-desc">Memuat data perusahaan…</p>
            ) : !employee?.company_id ? (
              <p className="settings-card-desc">
                Akun belum terhubung ke perusahaan. Selesaikan checkout / onboarding terlebih dahulu.
              </p>
            ) : (
              <>
                <div className="settings-form-grid">
                  <div className="settings-form-group">
                    <label className="settings-label">Nama Perusahaan</label>
                    <Input
                      className="settings-input"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    />
                  </div>
                  <div className="settings-form-group">
                    <label className="settings-label">Website</label>
                    <Input
                      className="settings-input"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                      placeholder="https://"
                    />
                  </div>
                  <div className="settings-form-group settings-form-group--full">
                    <label className="settings-label">Alamat</label>
                    <Input
                      className="settings-input"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    />
                  </div>
                  <div className="settings-form-group">
                    <label className="settings-label">Telepon Kantor</label>
                    <Input
                      className="settings-input"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                {companyError && (
                  <div className="settings-error" style={{ marginTop: 12 }}>
                    {companyError}
                  </div>
                )}

                <div className="settings-actions">
                  <button
                    type="button"
                    className="settings-btn settings-btn-primary"
                    onClick={handleSaveCompany}
                    disabled={saving}
                  >
                    <FiSave size={14} /> {saving ? 'Menyimpan…' : 'Simpan ke Database'}
                  </button>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="settings-panel">
          <div className="settings-stack">
            <div className="settings-card">
              <div className="settings-card-head">
                <h3 className="settings-card-title">Email Notifikasi</h3>
                <p className="settings-card-desc">
                  Disimpan ke akun Anda{notifSaving ? ' · menyimpan…' : ''} — mengontrol email cuti & reimburse
                </p>
              </div>
              {[
                { key: 'emailLeave', label: 'Pengajuan Cuti', desc: 'Email saat cuti disetujui/ditolak' },
                { key: 'emailPayroll', label: 'Payroll', desc: 'Email saat slip gaji terbit' },
                {
                  key: 'emailReimbursement',
                  label: 'Reimbursement',
                  desc: 'Email saat reimburse disetujui/ditolak',
                },
              ].map((item) => (
                <div key={item.key} className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-label">{item.label}</div>
                    <div className="settings-toggle-desc">{item.desc}</div>
                  </div>
                  <Switch
                    checked={!!notifications[item.key]}
                    onCheckedChange={(checked) => handleNotifChange(item.key, checked)}
                  />
                </div>
              ))}
            </div>

            <div className="settings-card">
              <div className="settings-card-head">
                <h3 className="settings-card-title">Push Notifikasi</h3>
                <p className="settings-card-desc">Preferensi push browser / PWA (disimpan ke akun)</p>
              </div>
              {[
                { key: 'pushAttendance', label: 'Absensi', desc: 'Reminder clock-in' },
                { key: 'pushApproval', label: 'Approval', desc: 'Item yang perlu disetujui' },
                { key: 'pushAnnouncement', label: 'Pengumuman', desc: 'Pengumuman perusahaan' },
              ].map((item) => (
                <div key={item.key} className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-label">{item.label}</div>
                    <div className="settings-toggle-desc">{item.desc}</div>
                  </div>
                  <Switch
                    checked={!!notifications[item.key]}
                    onCheckedChange={(checked) => handleNotifChange(item.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Appearance ── */}
        <TabsContent value="appearance" className="settings-panel">
          <div className="settings-card">
            <div className="settings-card-head">
              <h3 className="settings-card-title">Tema</h3>
              <p className="settings-card-desc">
                Berlaku untuk seluruh dashboard HR (termasuk founder jika dibuka di browser yang sama)
              </p>
            </div>

            <div className="settings-theme-grid">
              <div
                className={`settings-theme-option ${!darkMode ? 'settings-theme-option--active' : ''}`}
                onClick={() => setDarkMode(false)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setDarkMode(false)}
              >
                <div className="settings-theme-icon">
                  <FiSun size={22} />
                </div>
                <div className="settings-theme-label">Terang</div>
                <div className="settings-theme-sub">Default — clean light shell</div>
              </div>
              <div
                className={`settings-theme-option settings-theme-option--preview-dark ${darkMode ? 'settings-theme-option--active' : ''}`}
                onClick={() => setDarkMode(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setDarkMode(true)}
              >
                <div className="settings-theme-icon">
                  <FiMoon size={22} />
                </div>
                <div className="settings-theme-label">Gelap</div>
                <div className="settings-theme-sub">High contrast dark mode</div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Subscription ── */}
        <TabsContent value="subscription" className="settings-panel">
          <div className="settings-stack">
            <div className="settings-card">
              <div className="settings-card-head">
                <h3 className="settings-card-title">Status Langganan</h3>
                <p className="settings-card-desc">Paket aktif & sisa masa berlaku</p>
              </div>
              <SubscriptionStatus />
            </div>

            <div className="settings-card">
              <div className="settings-card-head">
                <h3 className="settings-card-title">Detail Plan</h3>
              </div>
              <div className="settings-plan-grid">
                {[
                  { label: 'Paket', value: planInfo.plan },
                  { label: 'Siklus Billing', value: planInfo.billing },
                  { label: 'Mulai', value: planInfo.start },
                  { label: 'Berakhir', value: planInfo.end },
                ].map((item) => (
                  <div key={item.label} className="settings-plan-cell">
                    <div className="settings-plan-cell-label">{item.label}</div>
                    <div className="settings-plan-cell-value">{item.value}</div>
                  </div>
                ))}
              </div>
              <p className="settings-card-desc" style={{ marginTop: 14, marginBottom: 0 }}>
                Upgrade, downgrade, atau pertanyaan billing →{' '}
                <button
                  type="button"
                  className="settings-link-btn"
                  onClick={() => setActiveTab('support')}
                >
                  Support Platform
                </button>
              </p>
            </div>

            <div className="settings-card">
              <div className="settings-card-head">
                <h3 className="settings-card-title">Riwayat Pembayaran</h3>
                <p className="settings-card-desc">Transaksi langganan & unduh invoice PDF</p>
              </div>
              <PaymentHistory companyName={companyForm.name} />
            </div>
          </div>
        </TabsContent>

        {/* ── Support ── */}
        <TabsContent value="support" className="settings-panel">
          <PlatformSupportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
