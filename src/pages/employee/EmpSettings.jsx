import { useState, useEffect } from 'react';
import {
  HiArrowLeftOnRectangle,
  HiBell,
  HiChevronRight,
  HiCog6Tooth,
  HiEye,
  HiEyeSlash,
  HiGlobeAmericas,
  HiLockClosed,
  HiMoon,
  HiShieldCheck,
  HiSun,
  HiTrash,
  HiXMark
} from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, getPushSubscriptionStatus } from '../../lib/pushNotifications';
import { getEmployeeByEmail } from '../../services/employeeService';
import { useTranslation, LOCALES } from '../../lib/i18n';
import '../../styles/shared.css';

const DARK_KEY = 'hrisync_dark_mode';
const NOTIF_KEY = 'hrisync_notif_enabled';

export default function EmpSettings() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { locale, setLocale } = useTranslation();
  const [emp, setEmp] = useState(null);

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(DARK_KEY) === 'true');
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Password change state
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const pwdRules = [
    { test: p => p.length >= 8,        label: locale === 'en' ? 'Min 8 chars' : 'Min 8 karakter' },
    { test: p => /[A-Z]/.test(p),      label: locale === 'en' ? 'Uppercase' : 'Huruf kapital' },
    { test: p => /[0-9]/.test(p),      label: locale === 'en' ? 'Number' : 'Angka' },
    { test: p => /[!@#$%^&*]/.test(p), label: locale === 'en' ? 'Special char' : 'Karakter spesial' },
  ];
  const pwdStrength = pwdRules.filter(r => r.test(pwdForm.newPassword)).length;

  const T = {
    settings: { id: 'Pengaturan', en: 'Settings' },
    prefsubtext: { id: 'Preferensi aplikasi dan akun', en: 'App & account preferences' },
    appearance: { id: 'Tampilan', en: 'Appearance' },
    dark_mode: { id: 'Mode Gelap', en: 'Dark Mode' },
    dark_mode_desc: { id: 'Gunakan tema gelap untuk tampilan lebih nyaman', en: 'Use dark theme for comfortable viewing' },
    language: { id: 'Bahasa', en: 'Language' },
    language_desc: { id: 'Pilih bahasa antarmuka', en: 'Choose interface language' },
    notifications: { id: 'Notifikasi', en: 'Notifications' },
    push_notif: { id: 'Push Notification', en: 'Push Notification' },
    push_notif_desc: { id: 'Terima notifikasi pengumuman dan update status pengajuan', en: 'Receive announcements and submission status updates' },
    privacy: { id: 'Privasi & Keamanan', en: 'Privacy & Security' },
    change_password: { id: 'Ubah Password', en: 'Change Password' },
    change_password_desc: { id: 'Perbarui kata sandi akun Anda', en: 'Update your account password' },
    clear_cache: { id: 'Hapus Cache', en: 'Clear Cache' },
    clear_cache_desc: { id: 'Kosongkan cache untuk memuat ulang data terbaru', en: 'Clear service worker cache to reload latest data' },
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
    pwd_min: { id: 'Minimal 6 karakter', en: 'Minimum 6 characters' },
    pwd_mismatch: { id: 'Password tidak cocok', en: 'Passwords do not match' },
    pwd_success: { id: 'Password berhasil diubah!', en: 'Password changed successfully!' },
    pwd_error: { id: 'Gagal mengubah password', en: 'Failed to change password' },
    pwd_save: { id: 'Simpan Password', en: 'Save Password' },
    cancel: { id: 'Batal', en: 'Cancel' },
  };
  const t = (key) => T[key]?.[locale] || T[key]?.id || key;

  useEffect(() => {
    // Load employee and check push subscription status
    async function init() {
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

  // Language is managed by i18n context (auto-persists to hrisync_locale)
  const handleLangChange = (newLocale) => {
    setLocale(newLocale);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const clearCache = () => {
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    toast.success(t('cache_cleared'));
  };

  const handleChangePassword = async () => {
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


  const ToggleRow = ({ icon, label, desc, value, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--primary)', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: value ? 'var(--primary)' : 'var(--border)',
          position: 'relative', transition: 'background 0.25s',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3, transition: 'left 0.25s',
          left: value ? 23 : 3,
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );

  const ActionRow = ({ icon, label, desc, onClick, danger }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
        borderBottom: '1px solid var(--border)', background: 'none', border: 'none',
        cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: danger ? 'rgba(220,38,38,0.08)' : 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: danger ? '#DC2626' : 'var(--primary)', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: danger ? '#DC2626' : 'var(--text)' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{desc}</div>}
      </div>
      <HiChevronRight size={16} style={{ color: 'var(--muted)' }} />
    </button>
  );

  return (
    <div className="emp-page">
      <div style={{ marginBottom: 20 }}>
        <h1 className="emp-page-title">{t('settings')}</h1>
        <p className="emp-page-subtitle">{t('prefsubtext')}</p>
      </div>

      {/* Tampilan */}
      <div className="emp-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{t('appearance')}</div>
        <ToggleRow
          icon={darkMode ? <HiMoon size={16} /> : <HiSun size={16} />}
          label={t('dark_mode')}
          desc={t('dark_mode_desc')}
          value={darkMode}
          onChange={setDarkMode}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <HiGlobeAmericas size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t('language')}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{t('language_desc')}</div>
          </div>
          <select
            value={locale}
            onChange={e => handleLangChange(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            {LOCALES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifikasi */}
      <div className="emp-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{t('notifications')}</div>
        <ToggleRow
          icon={<HiBell size={16} />}
          label={t('push_notif')}
          desc={t('push_notif_desc')}
          value={notifEnabled}
          onChange={async (val) => {
            if (val) {
              const { success, error } = await subscribeToPushNotifications(emp?.id);
              if (success) { setNotifEnabled(true); toast.success(t('notif_on')); }
              else toast.error(error || t('notif_err'));
            } else {
              await unsubscribeFromPushNotifications();
              setNotifEnabled(false);
              toast.success(t('notif_off'));
            }
          }}
        />
      </div>

      {/* Privasi & Keamanan */}
      <div className="emp-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{t('privacy')}</div>
        <ActionRow
          icon={<HiShieldCheck size={16} />}
          label={t('change_password')}
          desc={t('change_password_desc')}
          onClick={() => { setPwdForm({ newPassword: '', confirmPassword: '' }); setShowPwdModal(true); }}
        />
        <ActionRow
          icon={<HiTrash size={16} />}
          label={t('clear_cache')}
          desc={t('clear_cache_desc')}
          onClick={clearCache}
        />
      </div>

      {/* Password Change Modal */}
      {showPwdModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(6px)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease',
        }} onClick={() => setShowPwdModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface)', borderRadius: '24px 24px 0 0',
            padding: '24px 20px 40px', width: '100%', maxWidth: 480,
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
          }}>
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,71,171,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <HiLockClosed size={18} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{t('pwd_title')}</div>
              </div>
              <button onClick={() => setShowPwdModal(false)} style={{ background: 'var(--bg)', border: 'none', cursor: 'pointer', color: 'var(--muted)', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiXMark size={18} />
              </button>
            </div>

            {/* New Password */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{t('pwd_new')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={pwdForm.newPassword}
                  onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder={t('pwd_min')}
                  style={{
                    width: '100%', padding: '12px 44px 12px 14px', borderRadius: 12,
                    border: '1.5px solid var(--border)', background: 'var(--bg)',
                    fontSize: 14, fontFamily: 'inherit', color: 'var(--text)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                  {showPwd ? <HiEyeSlash size={16} /> : <HiEye size={16} />}
                </button>
              </div>
              {/* Strength indicator */}
              {pwdForm.newPassword && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginBottom: 5 }}>
                    <div style={{ height: '100%', width: `${pwdStrength * 25}%`, background: pwdStrength <= 1 ? '#ef4444' : pwdStrength <= 2 ? '#f59e0b' : pwdStrength <= 3 ? '#3b82f6' : '#22c55e', transition: 'all 0.3s', borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {pwdRules.map((r, i) => (
                      <span key={i} style={{ fontSize: 10, color: r.test(pwdForm.newPassword) ? '#22c55e' : 'var(--muted)', fontWeight: 600 }}>
                        {r.test(pwdForm.newPassword) ? '✓' : '○'} {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{t('pwd_confirm')}</label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwdForm.confirmPassword}
                onChange={e => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder={t('pwd_confirm')}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12,
                  border: `1.5px solid ${pwdForm.confirmPassword && pwdForm.confirmPassword !== pwdForm.newPassword ? '#ef4444' : 'var(--border)'}`,
                  background: 'var(--bg)', fontSize: 14, fontFamily: 'inherit',
                  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {pwdForm.confirmPassword && pwdForm.confirmPassword !== pwdForm.newPassword && (
                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{t('pwd_mismatch')}</div>
              )}
            </div>

            <button
              onClick={handleChangePassword}
              disabled={pwdLoading || pwdForm.newPassword.length < 8 || pwdForm.newPassword !== pwdForm.confirmPassword}
              style={{
                width: '100%', padding: '14px', borderRadius: 14,
                background: 'linear-gradient(135deg, #0047AB, #2563eb)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 15, fontFamily: 'inherit',
                opacity: pwdLoading || pwdForm.newPassword.length < 8 || pwdForm.newPassword !== pwdForm.confirmPassword ? 0.6 : 1,
              }}
            >
              {pwdLoading ? '...' : t('pwd_save')}
            </button>
          </div>
        </div>
      )}


      {/* Tentang */}
      <div className="emp-card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>{t('about')}</div>
        {[
          [t('app_name'), 'HRIS Loka Employee'],
          [t('version'), '2.0.0'],
          [t('platform'), 'Progressive Web App (PWA)'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{k}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%', padding: '14px', background: 'rgba(220,38,38,0.08)',
          color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-md)',
          fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <HiArrowLeftOnRectangle size={16} /> {t('logout')}
      </button>
    </div>
  );
}
