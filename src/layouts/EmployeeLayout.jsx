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
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { useTranslation } from '../lib/i18n';
import { isFounder, getRole } from '../lib/rbac';
import { supabase } from '../lib/supabase';
import { requestPersistentStorage } from '../lib/backgroundSync';
import EmpProfileSetup from '../pages/employee/EmpProfileSetup';
import './EmployeeLayout.css';
import { isDemoMode, DEMO_EMPLOYEE } from '../lib/demoGuard';
import { markNoIndex } from '../lib/seo';
import { safeGetItem, safeSetItem } from '../lib/safeStorage';
import { sanitizeAppPath } from '../lib/safePath';

const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch { /* intentionally empty */ } };

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
      { labelId: 'Dashboard', labelEn: 'Dashboard', icon: <HiHome size={24} />, path: '/app/home', color: '#635BFF' },
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
      { labelId: 'Kalender', labelEn: 'Calendar', icon: <HiCalendarDays size={24} />, path: '/app/calendar', color: '#635BFF' },
      { labelId: 'Kontak', labelEn: 'Directory', icon: <HiUsers size={24} />, path: '/app/directory', color: '#4F46E5' },
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

/* ***************************************
   QR SCANNER MODAL - BarcodeDetector API
*************************************** */
function QRScannerModal({ onClose, navigate }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const handleResultRef = useRef(null);
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

  // Handle scanned result — hentikan loop saja (stream tetap hidup agar
  // "Scan Lagi" tanpa reload). Stream hanya dimatikan saat modal ditutup.
  const handleResult = useCallback((raw) => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setResult(raw);
    setStatus('result');
    haptic(40);
  }, []);

  // Simpan handler terbaru agar scan loop (yg hidup di ref) selalu memanggil versi fresh
  useEffect(() => { handleResultRef.current = handleResult; }, [handleResult]);

  // Start camera + scan loop
  useEffect(() => {
    let cancelled = false;
    // Scan ulang tanpa reload: hentikan loop lama, pakai ulang stream/detector
    const startScanLoop = () => {
      if (cancelled || !detectorRef.current || !videoRef.current) return;
      const detector = detectorRef.current;
      const scan = async () => {
        if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(scan);
          return;
        }
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0 && !cancelled) {
            handleResultRef.current?.(barcodes[0].rawValue);
            return;
          }
        } catch { /* intentionally empty */ }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    };

    const start = async () => {
      try {
        // getUserMedia tidak ada di konteks non-secure / browser lama — pesan ramah
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus('error');
          setErrorMsg('Kamera tidak tersedia. Buka via HTTPS atau gunakan browser modern (Chrome terbaru).');
          return;
        }
        // Check BarcodeDetector support
        const supported = 'BarcodeDetector' in window;
        let detector = null;
        if (supported) {
          const formats = await BarcodeDetector.getSupportedFormats().catch(() => ['qr_code']);
          detector = new BarcodeDetector({ formats: formats.includes('qr_code') ? ['qr_code'] : formats });
          detectorRef.current = detector;
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
          // BarcodeDetector tidak ada — kamera tetap dimatikan agar lampu tidak menyala
          stream.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          setStatus('error');
          setErrorMsg('BarcodeDetector tidak didukung browser ini. Coba Chrome terbaru.');
          return;
        }

        startScanLoop();

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

  // "Scan Lagi": reset state + mulai ulang loop pada stream yang sama (tanpa reload)
  const handleRescan = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setResult(null);
    setErrorMsg('');
    setStatus('scanning');
    if (streamRef.current && detectorRef.current && videoRef.current) {
      const detector = detectorRef.current;
      const scan = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(scan);
          return;
        }
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            handleResultRef.current?.(barcodes[0].rawValue);
            return;
          }
        } catch { /* intentionally empty */ }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    } else {
      // Stream hilang (mis. izin dicabut) — tutup agar kamera dibuka ulang bersih
      handleClose();
    }
  }, [handleClose]);

  // Try to route based on scanned URL — only to known in-app paths.
  // Unknown / non-app paths are refused (open in-app redirect guard);
  // external URLs open in a new tab.
  const handleAction = () => {
    if (!result) return;
    try {
      const url = new URL(result);
      // Internal app link
      if (url.hostname === window.location.hostname) {
        const safe = sanitizeAppPath(url.pathname + url.search, '');
        if (safe && (safe.startsWith('/app/') || safe === '/app')) {
          navigate(safe);
          handleClose();
          return;
        }
        // Same-host but outside the PWA shell (e.g. /founder/..., /dashboard)
        // — do NOT navigate in-app; open as a normal link instead.
        window.open(url.pathname + url.search, '_blank', 'noopener');
        handleClose();
        return;
      }
    } catch { /* intentionally empty */ }
    // External URL - open in new tab
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
                <button className="qr-btn-secondary" onClick={handleRescan}>
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

  const { user, employee, loading, isPWA, hasOnboarding, onboardingLoading } = useAuth();
  const { isEmpPathEnabled, loading: flagsLoading } = useFeatureFlags();
  const location = useLocation();
  const { locale } = useTranslation();
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOnline, setShowOnline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [empData, setEmpData] = useState(null);
  const [darkMode] = useState(() => safeGetItem('hrisync_dark_mode') === 'true');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [setupDone, setSetupDone] = useState(true); // optimistic: assume done

  // Pull-to-refresh state
  const [pullState, setPullState] = useState({ pulling: false, distance: 0, refreshing: false });
  const contentRef = useRef(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  // Private employee PWA — no search indexing
  useEffect(() => {
    markNoIndex('KiniKerja — Employee');
  }, []);

  // Dark mode sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    safeSetItem('hrisync_dark_mode', darkMode.toString());
  }, [darkMode]);

  // Load employee data for header avatar + name + setup status
  useEffect(() => {
    // Design QA: full PWA chrome with fake employee (no Supabase)
    if (isDemoMode()) {
      setEmpData({
        id: DEMO_EMPLOYEE.id,
        name: DEMO_EMPLOYEE.name,
        photo_url: DEMO_EMPLOYEE.photo_url,
        division: DEMO_EMPLOYEE.division,
        position: DEMO_EMPLOYEE.position,
        profile_setup_done: true,
        role: DEMO_EMPLOYEE.role,
      });
      setSetupDone(true);
      return;
    }
    if (!user?.email && !user?.id) return;
    // Prefer AuthContext employee when available (production session)
    if (employee?.id) {
      setEmpData({
        id: employee.id,
        name: employee.name,
        photo_url: employee.photo_url,
        division: employee.division,
        position: employee.position,
        profile_setup_done: employee.profile_setup_done,
        role: employee.role,
        company_id: employee.company_id,
      });
      // Self-register already collected core fields → treat null as done for active accounts
      const done = employee.profile_setup_done === true
        || employee.account_status === 'active'
        || employee.account_status === 'approved';
      setSetupDone(done);
      return;
    }
    const email = String(user.email || '').trim().toLowerCase();
    const userKey = user.id || email;
    let query = supabase
      .from('employees')
      .select('id,name,photo_url,division,position,profile_setup_done,account_status,company_id,role');
    if (email) query = query.eq('email', email);
    else query = query.eq('auth_user_id', user.id);
    // Race guard: abaikan respons milik user lama bila login berganti cepat (A→B)
    query.maybeSingle().then(({ data }) => {
      if (!data) return;
      const stillMe = (user.id || String(user.email || '').trim().toLowerCase()) === userKey;
      if (!stillMe) return;
      setEmpData(data);
      const done = data.profile_setup_done === true
        || data.account_status === 'active'
        || data.account_status === 'approved';
      setSetupDone(done);
    });
  }, [user, employee]);

  // Unread notifications for this employee only (production)
  useEffect(() => {
    const empId = employee?.id || empData?.id;
    if (!empId) return;
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('employee_id', empId)
      .eq('read', false)
      .then(({ count, error }) => {
        if (error) return; // table missing or RLS denied - don't fake 0
        setUnreadCount(count || 0);
      })
      .catch(() => {});
  }, [employee?.id, empData?.id, location.pathname]);

  // Sync lang from localStorage
  useEffect(() => {
    const savedLang = safeGetItem('hrisync_lang');
    if (savedLang) safeSetItem('hrisync_locale', savedLang);
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
      safeSetItem('hrisync_last_path', location.pathname);
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
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const menuCategories = getMenuCategories();
  const empRole = empData?.role || '';
  const isManagerOrAbove = ['manager','hr_admin','super_admin','founder'].includes(empRole);

  // Filter managerOnly items, feature flags, and search
  const filterMenuItem = (item) =>
    (!item.managerOnly || isManagerOrAbove) && isEmpPathEnabled(item.path);

  const filteredCategories = menuSearch.trim()
    ? menuCategories.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          filterMenuItem(item) &&
          (locale === 'en' ? item.labelEn : item.labelId).toLowerCase().includes(menuSearch.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : menuCategories.map(cat => ({
        ...cat,
        items: cat.items.filter(filterMenuItem),
      }));

  // Header user display
  const userName = empData?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Karyawan';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const avatarUrl = empData?.photo_url || user?.user_metadata?.avatar_url || null;
  useEffect(() => { setAvatarBroken(false); }, [avatarUrl]);

  // Maintenance mode: read live from platform_settings (public read policy),
  // not just the founder device's localStorage cache.
  const [maintenanceOn, setMaintenanceOn] = useState(() => {
    try {
      return Boolean(JSON.parse(safeGetItem('founder_maintenance_settings') || 'null')?.is_maintenance);
    } catch { return false; }
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('key, value')
          .eq('key', 'is_maintenance')
          .maybeSingle();
        if (!cancelled && data) {
          setMaintenanceOn(String(data.value).toLowerCase() === 'true');
        }
      } catch { /* fail open on network errors */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (locale === 'en') return h < 12 ? 'Good morning' : h < 15 ? 'Good afternoon' : h < 18 ? 'Good evening' : 'Good night';
    return h < 12 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  };

  const demo = isDemoMode();

  // Guards
  if (!demo && loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{locale === 'en' ? 'Loading...' : 'Memuat...'}</p>
        </div>
      </div>
    );
  }

  // Demo mode keeps full PWA shell (header + bottom nav) for design QA
  if (!demo) {
    if (!user) {
    // First open this session → splash, else welcome (login / register)
    let splashSeen = true;
    try {
      splashSeen = Boolean(sessionStorage.getItem('kinikerja_splash_seen'));
    } catch { /* ignore */ }
    if (!splashSeen) {
      return <Navigate to="/app/splash" replace />;
    }
    return <Navigate to="/app/welcome" replace />;
  }

    // Guard: Google user with no employee record:
    // hasOnboarding = true  → registered a company but not in employees → block
    // hasOnboarding = false → brand new Google signup → send to checkout
    // Wait for onboarding resolution to avoid a /checkout → /not-registered flash.
    if (onboardingLoading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      );
    }
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

    if (!isFounder(user, employee) && maintenanceOn) {
      return <Navigate to="/maintenance" replace />;
    }

    if (employee) {
      const status = String(employee.account_status || '');
      // Catch-all: pending_verification, pending, pending_approval, ... —
      // mirrors AuthRedirect in App.jsx (exact match would let
      // e.g. pending_approval slip into the app).
      if (status.includes('pending')) {
        return <Navigate to="/app/pending" replace />;
      }
      if (status === 'rejected') {
        return <Navigate to="/app/rejected" replace />;
      }
      if (!employee.company_id) {
        // Incomplete registration / orphaned account
        return <Navigate to="/app/pending" replace />;
      }
    }

    // Feature flag gate (platform-level disable).
    // Tunggu flags dimuat dulu (fail-closed tanpa flicker lockout).
    if (!isFounder(user, employee) && flagsLoading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      );
    }
    if (!isFounder(user, employee) && !flagsLoading && !isEmpPathEnabled(location.pathname)) {
      return <Navigate to="/app/home" replace />;
    }

    // -- Profile Setup Gate --
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
  }


  return (
    <div className="emp-layout">
      {/* UpdatePrompt already mounted at App root — do NOT mount twice
          (double listeners → double reload paths on controllerchange). */}
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

      {/* -- Premium Header -- */}
      <header className="emp-header" style={isOffline ? { marginTop: 32 } : {}}>
        <div className="emp-header-left">
          <div className="emp-header-avatar" onClick={() => navigate('/app/profile')}>
            {avatarUrl && !avatarBroken
              ? <img src={avatarUrl} alt={userName} onError={() => setAvatarBroken(true)} />
              : <span>{userInitials}</span>}
          </div>
          <div className="emp-header-greeting">
            <div className="emp-header-greeting-text">{getGreeting()},</div>
            <div className="emp-header-name">{userName}</div>
            {(empData?.division || empData?.position) && (
              <div className="emp-header-dept">
                {empData.division}{empData.position ? `  ${empData.position}` : ''}
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

      {/* Page Content — must use .emp-content for padding + bottom-nav clearance */}
      <main id="main-content" className="emp-content" role="main" tabIndex={-1}>
        <Outlet />
      </main>

      {/* -- Bottom Navigation -- */}
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

      {/* -- Menu Drawer -- */}
      {menuOpen && (
        <>
          <div className="emp-menu-overlay" onClick={() => setMenuOpen(false)} />
          <div className="emp-menu-drawer">
            {/* Header */}
            <div className="emp-menu-header">
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{locale === 'en' ? 'All Features' : 'Semua Fitur'}</h2>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>{locale === 'en' ? 'Quick access to all KiniKerja features' : 'Akses cepat ke semua fitur KiniKerja'}</p>
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
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,91,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
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
