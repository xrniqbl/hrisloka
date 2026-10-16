import { useState, useEffect } from 'react';
import {
  HiArrowLeftOnRectangle,
  HiBell,
  HiChevronRight,
  HiEye,
  HiEyeSlash,
  HiGlobeAmericas,
  HiLockClosed,
  HiMoon,
  HiShieldCheck,
  HiSun,
  HiTrash,
  HiXMark,
} from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscriptionStatus,
} from '../../lib/pushNotifications';
import { getEmployeeByEmail } from '../../services/employeeService';
import { useTranslation, LOCALES } from '../../lib/i18n';
import { isDemoMode, showDemoToast, DEMO_EMPLOYEE } from '../../lib/demoGuard';
import './EmpSettings.css';

const DARK_KEY = 'hrisync_dark_mode';

// Pure presentational rows — kept at module scope so they have a stable
// identity across EmpSettings renders (defining them inside the component
// remounted them every render). They take all data via props.
const ToggleRow = ({ icon, label, desc, value, onChange }) => (
  <div className="emp-settings__row">
    <div className="emp-settings__icon">{icon}</div>
    <div className="emp-settings__text">
      <div className="emp-settings__label">{label}</div>
      {desc && <div className="emp-settings__desc">{desc}</div>}
    </div>
    <button
      type="button"
      className="emp-settings__toggle"
      style={{ background: value ? 'var(--primary)' : 'var(--border)' }}
      onClick={() => onChange(!value)}
      aria-pressed={value}
      aria-label={label}
    >
      <span className="emp-settings__toggle-knob" style={{ left: value ? 23 : 3 }} />
    </button>
  </div>
);

const ActionRow = ({ icon, label, desc, onClick, danger }) => (
  <button type="button" className="emp-settings__row" onClick={onClick}>
    <div className={'emp-settings__icon' + (danger ? ' emp-settings__icon--danger' : '')}>{icon}</div>
    <div className="emp-settings__text">
      <div className={'emp-settings__label' + (danger ? ' emp-settings__label--danger' : '')}>{label}</div>
      {desc && <div className="emp-settings__desc">{desc}</div>}
    </div>
    <HiChevronRight size={16} className="emp-settings__chevron" />
  </button>
);

export default function EmpSettings() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { locale, setLocale } = useTranslation();
  const [emp, setEmp] = useState(null);

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(DARK_KEY) === 'true');
  const [notifEnabled, setNotifEnabled] = useState(false);

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const pwdRules = [
    { test: (p) => p.length >= 8, label: locale === 'en' ? 'Min 8 chars' : 'Min 8 karakter' },
    { test: (p) => /[A-Z]/.test(p), label: locale === 'en' ? 'Uppercase' : 'Huruf kapital' },
    { test: (p) => /[0-9]/.test(p), label: locale === 'en' ? 'Number' : 'Angka' },
    { test: (p) => /[!@#$%^&*]/.test(p), label: locale === 'en' ? 'Special char' : 'Karakter spesial' },
  ];
  const pwdStrength = pwdRules.filter((r) => r.test(pwdForm.newPassword)).length;

  const T = {
    settings: { id: 'Pengaturan', en: 'Settings' },
    prefsubtext: { id: 'Preferensi aplikasi dan akun', en: 'App & account preferences' },
    appearance: { id: 'Tampilan', en: 'Appearance' },
    dark_mode: { id: 'Mode Gelap', en: 'Dark Mode' },
    dark_mode_desc: {
      id: 'Gunakan tema gelap untuk tampilan lebih nyaman',
      en: 'Use dark theme for comfortable viewing',
    },
    language: { id: 'Bahasa', en: 'Language' },
    language_desc: { id: 'Pilih bahasa antarmuka', en: 'Choose interface language' },
    notifications: { id: 'Notifikasi', en: 'Notifications' },
    push_notif: { id: 'Push Notification', en: 'Push Notification' },
    push_notif_desc: {
      id: 'Terima notifikasi pengumuman dan update status pengajuan',
      en: 'Receive announcements and submission status updates',
    },
    privacy: { id: 'Privasi & Keamanan', en: 'Privacy & Security' },
    change_password: { id: 'Ubah Password', en: 'Change Password' },
    change_password_desc: { id: 'Perbarui kata sandi akun Anda', en: 'Update your account password' },
    clear_cache: { id: 'Hapus Cache', en: 'Clear Cache' },
    clear_cache_desc: {
      id: 'Kosongkan cache untuk memuat ulang data terbaru',
      en: 'Clear service worker cache to reload latest data',
    },
    about: { id: 'Tentang Aplikasi', en: 'About App' },
    app_name: { id: 'Nama Aplikasi', en: 'App Name' },
    version: { id: 'Versi', en: 'Version' },
    platform: { id: 'Platform', en: 'Platform' },
    logout: { id: 'Keluar dari Akun', en: 'Sign Out' },
    cache_cleared: { id: 'Cache berhasil dihapus!', en: 'Cache cleared successfully!' },
    notif_on: { id: 'Notifikasi push aktif!', en: 'Push notifications enabled!' },
    notif_off: { id: 'Notifikasi push dinonaktifkan.', en: 'Push notifications disabled.' },
    notif_err: { id: 'Gagal mengaktifkan notifikasi.', en: 'Failed to enable notifications.' },
    pwd_title: { id: 'Ubah Password', en: 'Change Password' },
    pwd_new: { id: 'Password Baru', en: 'New Password' },
    pwd_confirm: { id: 'Konfirmasi Password', en: 'Confirm Password' },
    pwd_min: { id: 'Minimal 8 karakter', en: 'Minimum 8 characters' },
    pwd_mismatch: { id: 'Password tidak cocok', en: 'Passwords do not match' },
    pwd_success: { id: 'Password berhasil diubah!', en: 'Password changed successfully!' },
    pwd_error: { id: 'Gagal mengubah password', en: 'Failed to change password' },
    pwd_save: { id: 'Simpan Password', en: 'Save Password' },
  };
  const t = (key) => T[key]?.[locale] || T[key]?.id || key;

  useEffect(() => {
    async function init() {
      if (isDemoMode()) {
        setEmp({ ...DEMO_EMPLOYEE });
        setNotifEnabled(false);
        return;
      }
      const email = user?.email || user?.user_metadata?.email;
      const { data } = await getEmployeeByEmail(email);
      if (data) setEmp(data);
      const status = await getPushSubscriptionStatus();
      setNotifEnabled(status.subscribed && status.permission === 'granted');
    }
    init();
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem(DARK_KEY, darkMode.toString());
  }, [darkMode]);

  const handleLogout = async () => {
    await signOut();
    navigate(isDemoMode() ? '/app/welcome' : '/app/login');
  };

  const clearCache = () => {
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
    toast.success(t('cache_cleared'));
  };

  const handleChangePassword = async () => {
    if (isDemoMode()) {
      showDemoToast();
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      toast.error(locale === 'en' ? 'Password must be at least 8 characters' : 'Password minimal 8 karakter');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error(t('pwd_mismatch'));
      return;
    }
    setPwdLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwdForm.newPassword });
    setPwdLoading(false);
    if (error) {
      toast.error(t('pwd_error') + ': ' + error.message);
    } else {
      toast.success(t('pwd_success'));
      setShowPwdModal(false);
      setPwdForm({ newPassword: '', confirmPassword: '' });
    }
  };

  const handleNotifToggle = async (val) => {
    if (isDemoMode()) {
      showDemoToast();
      return;
    }
    if (val) {
      const { success, error } = await subscribeToPushNotifications(emp?.id);
      if (success) {
        setNotifEnabled(true);
        toast.success(t('notif_on'));
      } else toast.error(error || t('notif_err'));
    } else {
      await unsubscribeFromPushNotifications();
      setNotifEnabled(false);
      toast.success(t('notif_off'));
    }
  };

  const pwdOk = pwdForm.newPassword.length >= 8 && pwdForm.newPassword === pwdForm.confirmPassword;

  return (
    <div className="emp-page emp-settings">
      <header className="emp-settings__header">
        <h1>{t('settings')}</h1>
        <p>{t('prefsubtext')}</p>
      </header>

      {/* Appearance */}
      <section className="emp-settings__group">
        <div className="emp-settings__group-title">{t('appearance')}</div>
        <ToggleRow
          icon={darkMode ? <HiMoon size={18} /> : <HiSun size={18} />}
          label={t('dark_mode')}
          desc={t('dark_mode_desc')}
          value={darkMode}
          onChange={setDarkMode}
        />
        <div className="emp-settings__row">
          <div className="emp-settings__icon">
            <HiGlobeAmericas size={18} />
          </div>
          <div className="emp-settings__text">
            <div className="emp-settings__label">{t('language')}</div>
            <div className="emp-settings__desc">{t('language_desc')}</div>
          </div>
          <select
            className="emp-settings__select"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            aria-label={t('language')}
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Notifications */}
      <section className="emp-settings__group">
        <div className="emp-settings__group-title">{t('notifications')}</div>
        <ToggleRow
          icon={<HiBell size={18} />}
          label={t('push_notif')}
          desc={t('push_notif_desc')}
          value={notifEnabled}
          onChange={handleNotifToggle}
        />
      </section>

      {/* Privacy */}
      <section className="emp-settings__group">
        <div className="emp-settings__group-title">{t('privacy')}</div>
        <ActionRow
          icon={<HiShieldCheck size={18} />}
          label={t('change_password')}
          desc={t('change_password_desc')}
          onClick={() => {
            setPwdForm({ newPassword: '', confirmPassword: '' });
            setShowPwdModal(true);
          }}
        />
        <ActionRow
          icon={<HiTrash size={18} />}
          label={t('clear_cache')}
          desc={t('clear_cache_desc')}
          onClick={clearCache}
        />
      </section>

      {/* About */}
      <section className="emp-settings__group">
        <div className="emp-settings__group-title">{t('about')}</div>
        {[
          [t('app_name'), 'KiniKerja Employee'],
          [t('version'), '2.0.0'],
          [t('platform'), 'PWA'],
        ].map(([k, v]) => (
          <div key={k} className="emp-settings__about-row">
            <span className="emp-settings__about-key">{k}</span>
            <span className="emp-settings__about-val">{v}</span>
          </div>
        ))}
      </section>

      <button type="button" className="emp-settings__logout" onClick={handleLogout}>
        <HiArrowLeftOnRectangle size={18} />
        {t('logout')}
      </button>

      {/* Password sheet */}
      {showPwdModal && (
        <div className="emp-settings__overlay" onClick={() => setShowPwdModal(false)} role="presentation">
          <div
            className="emp-settings__sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwd-sheet-title"
          >
            <div className="emp-settings__sheet-handle" />
            <div className="emp-settings__sheet-head">
              <div className="emp-settings__icon">
                <HiLockClosed size={18} />
              </div>
              <h2 id="pwd-sheet-title">{t('pwd_title')}</h2>
              <button
                type="button"
                className="emp-settings__sheet-close"
                onClick={() => setShowPwdModal(false)}
                aria-label="Close"
              >
                <HiXMark size={18} />
              </button>
            </div>

            <div className="emp-settings__field">
              <label htmlFor="new-pwd">{t('pwd_new')}</label>
              <div className="emp-settings__input-wrap">
                <input
                  id="new-pwd"
                  className="emp-settings__input"
                  type={showPwd ? 'text' : 'password'}
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder={t('pwd_min')}
                  autoComplete="new-password"
                />
                <button type="button" className="emp-settings__eye" onClick={() => setShowPwd((v) => !v)}>
                  {showPwd ? <HiEyeSlash size={16} /> : <HiEye size={16} />}
                </button>
              </div>
              {pwdForm.newPassword && (
                <>
                  <div className="emp-settings__pwd-track">
                    <div
                      style={{
                        height: '100%',
                        width: `${pwdStrength * 25}%`,
                        background:
                          pwdStrength <= 1
                            ? '#ef4444'
                            : pwdStrength <= 2
                              ? '#f59e0b'
                              : pwdStrength <= 3
                                ? '#635BFF'
                                : '#22c55e',
                        transition: 'all 0.3s',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div className="emp-settings__pwd-rules">
                    {pwdRules.map((r) => (
                      <span
                        key={r.label}
                        className={'emp-settings__pwd-rule' + (r.test(pwdForm.newPassword) ? ' is-ok' : '')}
                      >
                        {r.test(pwdForm.newPassword) ? '✓' : '○'} {r.label}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="emp-settings__field">
              <label htmlFor="confirm-pwd">{t('pwd_confirm')}</label>
              <input
                id="confirm-pwd"
                className="emp-settings__input"
                type={showPwd ? 'text' : 'password'}
                value={pwdForm.confirmPassword}
                onChange={(e) => setPwdForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder={t('pwd_confirm')}
                autoComplete="new-password"
                style={{
                  paddingRight: 14,
                  borderColor:
                    pwdForm.confirmPassword && pwdForm.confirmPassword !== pwdForm.newPassword
                      ? '#ef4444'
                      : undefined,
                }}
              />
              {pwdForm.confirmPassword && pwdForm.confirmPassword !== pwdForm.newPassword && (
                <div className="emp-settings__error">{t('pwd_mismatch')}</div>
              )}
            </div>

            <button
              type="button"
              className="emp-settings__sheet-submit"
              disabled={pwdLoading || !pwdOk}
              onClick={handleChangePassword}
            >
              {pwdLoading ? '...' : t('pwd_save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
