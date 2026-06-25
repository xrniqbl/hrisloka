import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HiAcademicCap,
  HiArchiveBox,
  HiArrowPath,
  HiArrowsRightLeft,
  HiArrowTrendingUp,
  HiBell,
  HiBellAlert,
  HiBookOpen,
  HiCalendarDays,
  HiChevronDown,
  HiClipboardDocumentList,
  HiClock,
  HiCog6Tooth,
  HiCreditCard,
  HiCurrencyDollar,
  HiDocumentText,
  HiFolder,
  HiGlobeAlt,
  HiHome,
  HiMagnifyingGlass,
  HiMapPin,
  HiMoon,
  HiPaperAirplane,
  HiQrCode,
  HiQuestionMarkCircle,
  HiShieldCheck,
  HiSignal,
  HiSignalSlash,
  HiSquares2X2,
  HiSun,
  HiUser,
  HiUserCircle,
  HiUsers,
  HiClipboardDocumentCheck,
  HiReceiptPercent,
  HiXMark
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../lib/i18n';
import { isFounder, getRole } from '../lib/rbac';
import { supabase } from '../lib/supabase';
import { requestPersistentStorage } from '../lib/backgroundSync';
import UpdatePrompt from '../components/UpdatePrompt';
import InstallPrompt from '../components/InstallPrompt';
import EmpProfileSetup from '../pages/employee/EmpProfileSetup';
import './EmployeeLayout.css';
import { isDemoMode } from '../lib/demoGuard';

const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch (_e) { /* intentionally empty */ } };

const navItems = [
  { labelId: 'Home', labelEn: 'Home', icon: <HiHome />, path: '/app/home' },
  { labelId: 'Absen', labelEn: 'Clock In', icon: <HiMapPin />, path: '/app/absen' },
  { labelId: 'Pengajuan', labelEn: 'Submit', icon: <HiPaperAirplane />, path: '/app/submissions' },
  { labelId: 'Menu', labelEn: 'Menu', icon: <HiSquares2X2 />, path: '__menu__' },
  { labelId: 'Profil', labelEn: 'Profile', icon: <HiUserCircle />, path: '/app/profile' },
];

const getMenuCategories = () => [
  {
    labelId: 'Pekerjaan', labelEn: 'Work',
    items: [
      { labelId: 'Dashboard', labelEn: 'Dashboard', icon: <HiHome size={24} />, path: '/app/home', color: '#0047AB' },
      { labelId: 'Absensi', labelEn: 'Attendance', icon: <HiMapPin size={24} />, path: '/app/absen', color: '#10B981' },
      { labelId: 'Shift', labelEn: 'Shift', icon: <HiClock size={24} />, path: '/app/shift', color: '#F59E0B' },
      { labelId: 'Lembur', labelEn: 'Overtime', icon: <HiArrowsRightLeft size={24} />, path: '/app/overtime', color: '#EF4444' },
      { labelId: 'Proyek', labelEn: 'Projects', icon: <HiFolder size={24} />, path: '/app/projects', color: '#EC4899' },
      { labelId: 'Timesheet', labelEn: 'Timesheet', icon: <HiClock size={24} />, path: '/app/timesheet', color: '#0EA5E9' },
    ],
  },
  {
    labelId: 'Keuangan', labelEn: 'Finance',
    items: [
      { labelId: 'Slip Gaji', labelEn: 'Payslip', icon: <HiDocumentText size={24} />, path: '/app/payslip', color: '#16A34A' },
      { labelId: 'Pinjaman', labelEn: 'Loans', icon: <HiCurrencyDollar size={24} />, path: '/app/loan', color: '#D97706' },
      { labelId: 'Reimburse', labelEn: 'Reimburse', icon: <HiCurrencyDollar size={24} />, path: '/app/reimbursement', color: '#7C3AED' },
      { labelId: 'Pengajuan', labelEn: 'Submissions', icon: <HiPaperAirplane size={24} />, path: '/app/submissions', color: '#8B5CF6' },
    ],
  },
  {
    labelId: 'Pengembangan', labelEn: 'Growth',
    items: [
      { labelId: 'Training', labelEn: 'Training', icon: <HiBookOpen size={24} />, path: '/app/training', color: '#6366F1' },
      { labelId: 'KPI', labelEn: 'KPI', icon: <HiArrowTrendingUp size={24} />, path: '/app/kpi', color: '#7C3AED' },
      { labelId: 'Onboarding', labelEn: 'Onboarding', icon: <HiClipboardDocumentList size={24} />, path: '/app/onboarding', color: '#DC2626' },
      { labelId: 'Penilaian', labelEn: 'Appraisal', icon: <HiArrowTrendingUp size={24} />, path: '/app/appraisal', color: '#6366F1' },
    ],
  },
  {
    labelId: 'Lainnya', labelEn: 'More',
    items: [
      { labelId: 'Kontrak', labelEn: 'Contract', icon: <HiDocumentText size={24} />, path: '/app/contracts', color: '#0EA5E9' },
      { labelId: 'Kalender', labelEn: 'Calendar', icon: <HiCalendarDays size={24} />, path: '/app/calendar', color: '#3B82F6' },
      { labelId: 'Kontak', labelEn: 'Directory', icon: <HiUsers size={24} />, path: '/app/directory', color: '#2563EB' },
      { labelId: 'Aset Saya', labelEn: 'My Assets', icon: <HiArchiveBox size={24} />, path: '/app/assets', color: '#059669' },
      { labelId: 'Kebijakan', labelEn: 'Policies', icon: <HiBookOpen size={24} />, path: '/app/policy', color: '#0EA5E9' },
      { labelId: 'Pengumuman', labelEn: 'Announcements', icon: <HiBell size={24} />, path: '/app/announcements', color: '#EA580C' },
      { labelId: 'Helpdesk', labelEn: 'Helpdesk', icon: <HiQuestionMarkCircle size={24} />, path: '/app/helpdesk', color: '#7C3AED' },
      { labelId: 'Notifikasi', labelEn: 'Notifications', icon: <HiBellAlert size={24} />, path: '/app/notifications', color: '#F59E0B' },
      { labelId: 'Dokumen', labelEn: 'Documents', icon: <HiDocumentText size={24} />, path: '/app/documents', color: '#EC4899' },
      { labelId: 'Saldo Cuti', labelEn: 'Leave Balance', icon: <HiCalendarDays size={24} />, path: '/app/leave-balance', color: '#16A34A' },
      { labelId: 'Pengaturan', labelEn: 'Settings', icon: <HiCog6Tooth size={24} />, path: '/app/settings', color: '#64748B' },
      { labelId: 'Offboarding', labelEn: 'Offboarding', icon: <HiClipboardDocumentList size={24} />, path: '/app/offboarding', color: '#6B7280' },
      { labelId: 'Persetujuan', labelEn: 'Approvals', icon: <HiClipboardDocumentCheck size={24} />, path: '/app/approvals', color: '#7C3AED', managerOnly: true },
      { labelId: 'Struktur Org', labelEn: 'Org Chart', icon: <HiUsers size={24} />, path: '/app/org-chart', color: '#0EA5E9' },
      { labelId: 'Scan Struk', labelEn: 'Expense OCR', icon: <HiReceiptPercent size={24} />, path: '/app/expense-ocr', color: '#F97316' },
    ],
  },
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   QR SCANNER MODAL â€” BarcodeDetector API
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function QRScannerModal({ onClose, navigate }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | scanning | result | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Stop camera stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const handleClose = useCallback(() => { stopStream(); onClose(); }, [stopStream, onClose]);

  // Handle scanned result
  const handleResult = useCallback((raw) => {
    stopStream();
    setResult(raw);
    setStatus('result');
    haptic(40);
  }, [stopStream]);

  // Start camera + scan loop
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        // Check BarcodeDetector support
        const supported = 'BarcodeDetector' in window;
        let detector = null;
        if (supported) {
          const formats = await BarcodeDetector.getSupportedFormats().catch(() => ['qr_code']);
          detector = new BarcodeDetector({ formats: formats.includes('qr_code') ? ['qr_code'] : formats });
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus('scanning');

        if (!supported) {
          // No BarcodeDetector â€” show manual input fallback
          setStatus('error');
          setErrorMsg('BarcodeDetector tidak didukung browser ini. Coba Chrome terbaru.');
          return;
        }

        // Scan loop using requestAnimationFrame
        const scan = async () => {
          if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(scan);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && !cancelled) {
              handleResult(barcodes[0].rawValue);
              return;
            }
          } catch (_e) { /* intentionally empty */ }
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);

      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        if (err.name === 'NotAllowedError') setErrorMsg('Izin kamera ditolak. Aktifkan kamera di pengaturan browser.');
        else if (err.name === 'NotFoundError') setErrorMsg('Tidak ada kamera yang ditemukan di perangkat ini.');
        else setErrorMsg(`Error: ${err.message}`);
      }
    };

    start();
    return () => { cancelled = true; stopStream(); };
  }, [handleResult, stopStream]);

  // Try to route based on scanned URL
  const handleAction = () => {
    if (!result) return;
    try {
      const url = new URL(result);
      // Internal app link
      if (url.hostname === window.location.hostname) {
        navigate(url.pathname + url.search);
        handleClose();
        return;
      }
    } catch (_e) { /* intentionally empty */ }
    // External URL â€” open in new tab
    window.open(result, '_blank', 'noopener');
    handleClose();
  };

  return (
    <div className="qr-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="qr-modal">
        <div className="qr-modal-header">
          <span className="qr-modal-title">
            <HiQrCode size={18} /> Scan QR Code
          </span>
          <button className="qr-modal-close" onClick={handleClose} aria-label="Tutup">
            <HiXMark size={20} />
          </button>
        </div>

        <div className="qr-viewfinder">
          {/* Camera feed */}
          <video ref={videoRef} className="qr-video" playsInline muted />

          {/* Scanning frame corners */}
          {status === 'scanning' && (
            <>
              <div className="qr-frame" />
              <div className="qr-scan-line" />
              <p className="qr-hint">Arahkan kamera ke QR Code</p>
            </>
          )}

          {/* Starting overlay */}
          {status === 'starting' && (
            <div className="qr-state-overlay">
              <div className="qr-spinner" />
              <p>Membuka kamera...</p>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="qr-state-overlay qr-error">
              <HiShieldCheck size={40} style={{ color: '#ef4444' }} />
              <p>{errorMsg}</p>
              <button className="qr-btn-retry" onClick={handleClose}>Tutup</button>
            </div>
          )}

          {/* Result state */}
          {status === 'result' && (
            <div className="qr-result">
              <div className="qr-result-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="qr-result-label">QR Terdeteksi</p>
              <div className="qr-result-value">{result}</div>
              <div className="qr-result-actions">
                <button className="qr-btn-action" onClick={handleAction}>
                  Buka
                </button>
                <button className="qr-btn-secondary" onClick={() => { setResult(null); setStatus('starting'); /* restart */ window.location.reload(); }}>
                  Scan Lagi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmployeeLayout() {

  const { user, employee, loading, isPWA, hasOnboarding } = useAuth();
  const location = useLocation();
  const { locale } = useTranslation();
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOnline, setShowOnline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [empData, setEmpData] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('hrisync_dark_mode') === 'true');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [setupDone, setSetupDone] = useState(true); // optimistic: assume done

  // Pull-to-refresh state
  const [pullState, setPullState] = useState({ pulling: false, distance: 0, refreshing: false });
  const contentRef = useRef(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  // Dark mode sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('hrisync_dark_mode', darkMode.toString());
  }, [darkMode]);

  // Load employee data for header avatar + name + setup status
  useEffect(() => {
    if (!user?.email) return;
    supabase.from('employees').select('id,name,photo_url,division,position,profile_setup_done')
      .eq('email', user.email).single()
      .then(({ data }) => {
        if (data) {
          setEmpData(data);
          // profile_setup_done may not exist yet (old rows) â€” treat null as not done
          setSetupDone(data.profile_setup_done === true);
        }
      });
  }, [user]);

  // Load unread notifications count (graceful â€” table may not exist)
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('read', false)
      .then(({ count }) => setUnreadCount(count || 0))
      .catch(() => setUnreadCount(0));
  }, [user, location.pathname]);

  // Sync lang from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('hrisync_lang');
    if (savedLang) localStorage.setItem('hrisync_locale', savedLang);
    // Request persistent storage (prevents cache eviction)
    requestPersistentStorage();
  }, []);

  // Offline/online detection
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowOnline(true);
      setTimeout(() => setShowOnline(false), 3000);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Close menu on navigation
  useEffect(() => { setMenuOpen(false); setMenuSearch(''); }, [location.pathname]);

  // Track current path
  useEffect(() => {
    const founderUser = isFounder(user, employee);
    if (user && !founderUser && location.pathname !== '/') {
      localStorage.setItem('hrisync_last_path', location.pathname);
    }
  }, [location.pathname, user, employee]);

  // Pull-to-refresh
  const triggerRefresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent('emp:refresh'));
    setPullState({ pulling: false, distance: 0, refreshing: false });
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (contentRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current || pullState.refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && contentRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullState(prev => ({ ...prev, pulling: true, distance: Math.min(diff * 0.5, 80) }));
    }
  }, [pullState.refreshing]);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullState.distance > 60) {
      setPullState(prev => ({ ...prev, pulling: false, distance: 50, refreshing: true }));
      setTimeout(triggerRefresh, 600);
    } else {
      setPullState({ pulling: false, distance: 0, refreshing: false });
    }
  }, [pullState.distance, triggerRefresh]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMove);
  }, [handleTouchMove]);

  const menuCategories = getMenuCategories();
  const empRole = empData?.role || '';
  const isManagerOrAbove = ['manager','hr_admin','super_admin','founder'].includes(empRole);

  // Filter managerOnly items and search
  const filteredCategories = menuSearch.trim()
    ? menuCategories.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          (!item.managerOnly || isManagerOrAbove) &&
          (locale === 'en' ? item.labelEn : item.labelId).toLowerCase().includes(menuSearch.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : menuCategories.map(cat => ({
        ...cat,
        items: cat.items.filter(item => !item.managerOnly || isManagerOrAbove),
      }));

  // Header user display
  const userName = empData?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Karyawan';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarUrl = empData?.photo_url || user?.user_metadata?.avatar_url || null;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (locale === 'en') return h < 12 ? 'Good morning' : h < 15 ? 'Good afternoon' : h < 18 ? 'Good evening' : 'Good night';
    return h < 12 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  };

  // Guards
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{locale === 'en' ? 'Loading...' : 'Memuat...'}</p>
        </div>
      </div>
    );
  }

  // Demo mode — bypass all employee guards
  if (isDemoMode()) return <Outlet />;

  if (!user) return <Navigate to="/app/login" replace />;

  // Guard: Google user with no employee record:
  // hasOnboarding = true  â†’ registered a company but not in employees â†’ block
  // hasOnboarding = false â†’ brand new Google signup â†’ send to checkout
  if (!loading && !employee && user.app_metadata?.provider === 'google') {
    return <Navigate to={hasOnboarding ? '/not-registered' : '/checkout'} replace />;
  }

  // Guard: HR Admin / Manager / Super Admin who open PWA in a desktop browser
  // should be redirected to the HR portal. (Founders have full access to both.)
  if (!isFounder(user, employee) && !isPWA) {
    const empRole = getRole(employee);
    if (['super_admin', 'hr_admin', 'manager'].includes(empRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  if (!isFounder(user, employee)) {
    try {
      const raw = localStorage.getItem('founder_maintenance_settings');
      if (raw && JSON.parse(raw)?.is_maintenance) return <Navigate to="/maintenance" replace />;
    } catch { /* ignore */ }
  }

  if (employee) {
    const status = employee.account_status;
    if (status === 'pending_verification') return <Navigate to="/app/pending" replace />;
    if (status === 'rejected') return <Navigate to="/app/rejected" replace />;
  }

  // â”€â”€ Profile Setup Gate â”€â”€
  // Show mandatory form for new employees who haven't filled in locked data
  if (!setupDone && empData && !isFounder(user, employee)) {
    return (
      <EmpProfileSetup
        employeeId={empData?.id}
        employeeName={empData?.name || user?.email?.split('@')[0] || 'Karyawan'}
        onComplete={() => setSetupDone(true)}
      />
    );
  }


  return (
    <div className="emp-layout">
      {/* App Update Prompt */}
      <UpdatePrompt />
      {/* PWA Install Banner */}
      <InstallPrompt />
      {/* Offline banners */}
      {isOffline && (
        <div className="offline-banner">
          <HiSignalSlash size={14} />
          {locale === 'en' ? 'You are offline' : 'Anda sedang offline'}
        </div>
      )}
      {showOnline && !isOffline && (
        <div className="offline-banner online">
          <HiSignal size={14} />
          {locale === 'en' ? 'Back online!' : 'Kembali online!'}
        </div>
      )}

      {/* â”€â”€ Premium Header â”€â”€ */}
      <header className="emp-header" style={isOffline ? { marginTop: 32 } : {}}>
        <div className="emp-header-left">
          <div className="emp-header-avatar" onClick={() => navigate('/app/profile')}>
            {avatarUrl
              ? <img src={avatarUrl} alt={userName} />
              : <span>{userInitials}</span>}
          </div>
          <div className="emp-header-greeting">
            <div className="emp-header-greeting-text">{getGreeting()},</div>
            <div className="emp-header-name">{userName}</div>
            {(empData?.division || empData?.position) && (
              <div className="emp-header-dept">
                {empData.division}{empData.position ? ` Â· ${empData.position}` : ''}
              </div>
            )}
          </div>
        </div>
        <div className="emp-header-actions">
          <button
            onClick={() => { haptic(8); setScannerOpen(true); }}
            className="emp-header-icon-btn emp-scanner-btn"
            aria-label="QR Scanner"
          >
            <HiQrCode size={18} />
          </button>
          <NavLink to="/app/notifications" className="emp-header-icon-btn emp-notif-btn" aria-label="Notifications">
            <HiBell size={18} />
            {unreadCount > 0 && <span className="emp-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </NavLink>
        </div>
        {scannerOpen && <QRScannerModal onClose={() => setScannerOpen(false)} navigate={navigate} />}
      </header>

      {/* Pull-to-Refresh */}
      {(pullState.pulling || pullState.refreshing) && (
        <div className="ptr-indicator" style={{ height: pullState.distance }}>
          <HiArrowPath size={20} style={{
            animation: pullState.refreshing ? 'spin 0.8s linear infinite' : 'none',
            transform: `rotate(${pullState.distance * 4}deg)`,
            transition: pullState.pulling ? 'none' : 'transform 0.3s',
            color: 'var(--primary)',
          }} />
        </div>
      )}

      {/* Page Content */}
      <main className="emp-content" ref={contentRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <Outlet />
      </main>

      {/* â”€â”€ Bottom Navigation â”€â”€ */}
      <nav className="emp-bottom-nav">
        {navItems.map(item => {
          const label = locale === 'en' ? item.labelEn : item.labelId;
          const createRipple = (e) => {
            const btn = e.currentTarget;
            const circle = document.createElement('span');
            const diameter = Math.max(btn.clientWidth, btn.clientHeight);
            const rect = btn.getBoundingClientRect();
            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${e.clientX - rect.left - diameter / 2}px`;
            circle.style.top = `${e.clientY - rect.top - diameter / 2}px`;
            circle.className = 'ripple';
            btn.querySelector('.ripple')?.remove();
            btn.appendChild(circle);
          };

          if (item.path === '__menu__') {
            return (
              <button
                key="menu"
                className={`emp-nav-item ${menuOpen ? 'active' : ''}`}
                onClick={(e) => { createRipple(e); setMenuOpen(o => !o); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                aria-label="Menu"
              >
                <span className="emp-nav-icon">{menuOpen ? <HiXMark /> : <HiSquares2X2 />}</span>
                <span className="emp-nav-label">{menuOpen ? (locale === 'en' ? 'Close' : 'Tutup') : label}</span>
              </button>
            );
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `emp-nav-item ${isActive ? 'active' : ''}`}
              onClick={createRipple}
            >
              <span className="emp-nav-icon">{item.icon}</span>
              <span className="emp-nav-label">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* â”€â”€ Menu Drawer â”€â”€ */}
      {menuOpen && (
        <>
          <div className="emp-menu-overlay" onClick={() => setMenuOpen(false)} />
          <div className="emp-menu-drawer">
            {/* Header */}
            <div className="emp-menu-header">
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{locale === 'en' ? 'All Features' : 'Semua Fitur'}</h2>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>{locale === 'en' ? 'Quick access to all HRIS Loka features' : 'Akses cepat ke semua fitur HRIS Loka'}</p>
              </div>
              <button onClick={() => setMenuOpen(false)} className="emp-menu-close-btn" aria-label="Close menu">
                <HiXMark size={18} />
              </button>
            </div>
            {/* Search */}
            <div className="emp-menu-search">
              <HiMagnifyingGlass size={15} className="emp-menu-search-icon" />
              <input
                type="text"
                placeholder={locale === 'en' ? 'Search features...' : 'Cari fitur...'}
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                className="emp-menu-search-input"
              />
            </div>
            {/* Categories */}
            <div className="emp-menu-scroll">
              {filteredCategories.map(cat => (
                <div key={cat.labelId} style={{ marginBottom: 16 }}>
                  {/* Category Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 10px', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,71,171,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        {cat.items[0]?.icon && <span style={{ fontSize: 16 }}>{cat.labelId === 'Pekerjaan' ? <HiHome size={18}/> : cat.labelId === 'Keuangan' ? <HiCreditCard size={18}/> : cat.labelId === 'Pengembangan' ? <HiAcademicCap size={18}/> : <HiSquares2X2 size={18}/>}</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{locale === 'en' ? cat.labelEn : cat.labelId}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {cat.labelId === 'Pekerjaan' ? (locale === 'en' ? 'Manage work activities' : 'Kelola aktivitas dan waktu kerja') :
                           cat.labelId === 'Keuangan' ? (locale === 'en' ? 'Finance & compensation' : 'Kelola kompensasi dan keuangan') :
                           cat.labelId === 'Pengembangan' ? (locale === 'en' ? 'Career development' : 'Kembangkan diri dan karier Anda') :
                           (locale === 'en' ? 'More features' : 'Fitur-fitur lainnya')}
                        </div>
                      </div>
                    </div>
                    <HiChevronDown size={16} style={{ color: 'var(--muted)' }} />
                  </div>
                  {/* Items Grid */}
                  <div className="emp-menu-grid">
                    {cat.items.map(item => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className="emp-menu-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        <div className="emp-menu-icon" style={{ background: `${item.color}15`, color: item.color }}>
                          {item.icon}
                        </div>
                        <span className="emp-menu-label">
                          {locale === 'en' ? item.labelEn : item.labelId}
                        </span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
              {filteredCategories.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
                  {locale === 'en' ? 'No features found' : 'Fitur tidak ditemukan'}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
