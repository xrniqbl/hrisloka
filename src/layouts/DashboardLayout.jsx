import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isDemoMode } from '../lib/demoGuard';
import Sidebar from '../components/Sidebar';
import NotificationCenter from '../components/NotificationCenter';
import Breadcrumb from '../components/Breadcrumb';
import { hasAccess, getRole, isFounder, ROLE_LABELS, ROLE_COLORS } from '../lib/rbac';
import { useTranslation, LanguageToggle } from '../lib/i18n';
import { FiSun, FiMoon, FiLock } from 'react-icons/fi';
import { HiShieldCheck } from 'react-icons/hi2';
import GlobalSearch from '../components/GlobalSearch';
import './DashboardLayout.css';

export default function DashboardLayout() {
 const { user, employee, loading, hasOnboarding, onboardingLoading } = useAuth();
 const location = useLocation();
 const { t } = useTranslation();
 const [theme, setTheme] = useState(() => localStorage.getItem('hrisync_theme') || 'light');

 useEffect(() => {
 document.documentElement.setAttribute('data-theme', theme);
 localStorage.setItem('hrisync_theme', theme);
 }, [theme]);

 // Track current path for "return to last page" after re-login
 useEffect(() => {
 if (user && location.pathname !== '/') {
 localStorage.setItem('hrisync_last_path', location.pathname);
 }
 }, [location.pathname, user]);

 if (loading) {
 return (
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
 <div style={{ textAlign: 'center' }}>
 <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
 <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('common.loading')}</p>
 </div>
 </div>
 );
 }

 // Demo mode — bypass all guards, no real session needed
 if (isDemoMode()) {
  return (
   <div className="layout-wrapper">
    <Sidebar />
    <main className="layout-content">
     <div style={{
      background: 'linear-gradient(90deg,#0047AB,#2563eb)',
      color: '#fff', padding: '6px 16px', fontSize: 12,
      fontWeight: 700, textAlign: 'center', borderRadius: 8, marginBottom: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
     }}>
      🔒 Mode Demo — Akses Read-Only · Fitur edit/tambah/hapus dinonaktifkan
     </div>
     <Outlet />
    </main>
   </div>
  );
 }

 if (!user) {
 return <Navigate to="/" replace />;
 }

 const role = getRole(employee);
 const founderUser = isFounder(user, employee);

 // Guard: plain employees should not access the HR Dashboard.
 // Redirect them to the PWA instead. Founder always passes.
 if (!founderUser && role === 'employee') {
 // Employee accounts must use the PWA app — show informative block page
 return <Navigate to="/employee-web-access" replace />;
 }

 // Guard: onboarding must be completed (founder skips)
 if (!founderUser && !onboardingLoading && !hasOnboarding) {
 return <Navigate to="/onboarding-form" replace />;
 }

 // RBAC: check route access (founder always passes)
 if (!hasAccess(role, location.pathname, founderUser)) {
 return (
 <div className="layout-wrapper">
 <Sidebar />
 <main className="layout-content">
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
 <div style={{ textAlign: 'center', maxWidth: 400 }}>
 <div style={{
 width: 56, height: 56, borderRadius: 16,
 background: 'rgba(220, 38, 38, 0.08)', display: 'flex',
 alignItems: 'center', justifyContent: 'center',
 margin: '0 auto 16px', color: 'var(--danger)', fontSize: 24,
 }}>
 <FiLock />
 </div>
 <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{t('auth.access_denied')}</h2>
 <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
 {t('auth.no_permission')}
 {' '}{t('auth.your_role')}: <span style={{ fontWeight: 700, color: ROLE_COLORS[role], padding: '2px 8px', borderRadius: 20, background: `${ROLE_COLORS[role]}15`, fontSize: 12 }}>{ROLE_LABELS[role]}</span>
 </p>
 <button
 onClick={() => window.history.back()}
 style={{ marginTop: 20, padding: '10px 24px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
 >
 {t('common.back')}
 </button>
 </div>
 </div>
 </main>
 </div>
 );
 }

 // Display role — for founder, show the viewAs role from localStorage
 const displayRole = founderUser
 ? (localStorage.getItem('HRIS Loka_viewAs') || 'super_admin')
 : role;

 return (
 <div className="layout-wrapper">
 <Sidebar />
 <main className="layout-content">
   {/* Top bar */}
   <div style={{
     display: 'flex',
     justifyContent: 'space-between',
     alignItems: 'center',
     padding: '0 0 14px 0',
     gap: 12,
     borderBottom: '1px solid var(--border)',
     marginBottom: 20,
   }}>
     {/* Global Search */}
     <GlobalSearch />

     {/* Right Controls */}
     <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
       <LanguageToggle />
       <button
         onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
         title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
         style={{
           width: 32,
           height: 32,
           borderRadius: 'var(--radius-sm)',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           background: 'var(--bg)',
           border: '1px solid var(--border)',
           color: 'var(--text-secondary)',
           cursor: 'pointer',
           fontSize: 15,
           transition: 'background-color 0.2s, border-color 0.2s, color 0.2s',
         }}
       >
         {theme === 'dark' ? <FiSun /> : <FiMoon />}
       </button>
       <div style={{
         fontSize: 11,
         padding: '3px 9px',
         borderRadius: 20,
         background: founderUser ? 'rgba(0,71,171,0.10)' : `${ROLE_COLORS[displayRole]}15`,
         color: founderUser ? 'var(--primary)' : ROLE_COLORS[displayRole],
         fontWeight: 700,
         display: 'flex',
         alignItems: 'center',
         gap: 4,
         border: `1px solid ${founderUser ? 'rgba(0,71,171,0.20)' : `${ROLE_COLORS[displayRole]}25`}`,
       }}>
         {founderUser && <HiShieldCheck size={12} />}
         {founderUser ? 'Founder' : ROLE_LABELS[displayRole]}
       </div>
       <NotificationCenter />
     </div>
   </div>
   <Breadcrumb />
   <Outlet />
 </main>
 </div>
 );
}
