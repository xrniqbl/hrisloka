import { useState, useEffect, useCallback, useRef } from 'react';
import {
  HiArrowLeftOnRectangle,
  HiArrowPath,
  HiArrowRightOnRectangle,
  HiCalendarDays,
  HiCamera,
  HiCheck,
  HiChevronLeft,
  HiChevronRight,
  HiClipboardDocumentCheck,
  HiClock,
  HiExclamationTriangle,
  HiGlobeAlt,
  HiMapPin,
  HiShieldCheck,
  HiUser
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import {
  clockIn as serviceClockIn, clockOut as serviceClockOut,
  getTodayAttendance, getOfficeLocations, getAttendanceHistory,
  getEmployeeFaceDescriptors, hasRegisteredFace, saveTrustLog
} from '../../services/attendanceService';
import { getBranchById } from '../../services/branchService';
import { useTranslation } from '../../lib/i18n';
import {
  collectGPSSamples, analyzeGPSAccuracy, analyzeGPSSamples,
  getIPLocation, analyzeIPvsGPS, checkImpossibleTravel,
  analyzeDeviceMotion, calculateTrustScore, startMotionCollection,
  stopMotionCollection, haversineDistance
} from '../../lib/antiSpoofing';
import FaceScanner from '../../components/FaceScanner';
import FaceRegistration from '../../components/FaceRegistration';
import { isBackgroundSyncSupported, queueRequest } from '../../lib/backgroundSync';
import './EmpAbsen.css';
import '../../styles/shared.css';

// ——— Trust level badge helper ————————————————————————————————
function TrustBadge({ score, level, flags }) {
  const colors = {
    trusted: { bg: '#F0FDF4', color: '#16A34A', icon: '✅' },
    warning: { bg: '#FFFBEB', color: '#D97706', icon: '⚠️' },
    rejected: { bg: '#FEF2F2', color: '#DC2626', icon: '🚫' },
  };
  const style = colors[level] || colors.trusted;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 100,
      background: style.bg, color: style.color,
      fontSize: 12, fontWeight: 700, border: `1px solid ${style.color}30`
    }}>
      {style.icon} Trust Score: {score}/100
      {flags?.length > 0 && <span style={{ fontWeight: 400 }}>· {flags.length} flag</span>}
    </div>
  );
}

// ——— GPS distance helper ——————————————————————————————————————
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ——— Steps: gps → face → confirm → done —————————————————————
const STEPS = ['gps', 'face', 'confirm', 'done'];

export default function EmpAbsen() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [office, setOffice] = useState(null);
  const [history, setHistory] = useState([]);
  const [todayAtt, setTodayAtt] = useState(null);
  const [mode, setMode] = useState('in'); // 'in' | 'out' | 'done_both'
  const [pageLoading, setPageLoading] = useState(true);
  const [step, setStep] = useState('gps');
  const [registeredFaces, setRegisteredFaces] = useState([]);
  const [hasFaceReg, setHasFaceReg] = useState(null); // null = checking

  // GPS state
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState('');
  const [gpsSamples, setGpsSamples] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [trustResult, setTrustResult] = useState(null);
  const [antiSpoofRunning, setAntiSpoofRunning] = useState(false);
  const [antiSpoofStep, setAntiSpoofStep] = useState('');

  // Face state
  const [faceResult, setFaceResult] = useState(null);
  const [showFaceReg, setShowFaceReg] = useState(false);

  // Submit
  const [submitLoading, setSubmitLoading] = useState(false);

  // Recap
  const [monthlyHistory, setMonthlyHistory] = useState([]);
  const [recapMonth, setRecapMonth] = useState(0);
  const [showRecap, setShowRecap] = useState(false);

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const PULL_THRESHOLD = 70;

  const weekDays = locale === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  function t(en, id) { return locale === 'en' ? en : id; }

  // ——— Load employee, office, attendance —————————————————————
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const email = user?.email || user?.user_metadata?.email;
      const { data: empData } = await getEmployeeByEmail(email);
      if (cancelled || !empData) { setPageLoading(false); return; }

      setEmp(empData);

      const [histResult, todayResult, faceResult] = await Promise.all([
        getAttendanceHistory(empData.id, 7),
        getTodayAttendance(empData.id),
        hasRegisteredFace(empData.id),
      ]);

      if (cancelled) return;
      setHistory(histResult.data || []);
      setHasFaceReg(faceResult.hasface);

      if (todayResult.data) {
        setTodayAtt(todayResult.data);
        if (todayResult.data.clock_in && !todayResult.data.clock_out) setMode('out');
        else if (todayResult.data.clock_in && todayResult.data.clock_out) setMode('done_both');
      }

      // Load face descriptors for verification
      if (faceResult.hasface) {
        const { data: descriptors } = await getEmployeeFaceDescriptors(empData.id);
        setRegisteredFaces(descriptors || []);
      }

      // Branch-specific geofence
      if (empData.branch_id) {
        const { data: branchData } = await getBranchById(empData.branch_id);
        if (branchData) setOffice({ id: branchData.id, name: branchData.name, latitude: branchData.latitude, longitude: branchData.longitude, radius_meters: branchData.radius_meters });
      }
      const { data: locs } = await getOfficeLocations();
      if (locs?.length) setOffice(prev => prev || locs[0]);

      setPageLoading(false);
    }
    load();
    startMotionCollection();
    return () => { cancelled = true; stopMotionCollection(); };
  }, [user]);

  useEffect(() => {
    if (emp && showRecap) loadMonthlyData();
  }, [emp, recapMonth, showRecap]);

  const loadMonthlyData = async () => {
    if (!emp) return;
    const { data } = await getAttendanceHistory(emp.id, 31);
    const now = new Date();
    now.setMonth(now.getMonth() + recapMonth);
    const m = now.getMonth(), y = now.getFullYear();
    setMonthlyHistory((data || []).filter(h => { const d = new Date(h.date); return d.getMonth() === m && d.getFullYear() === y; }));
  };

  // ——— Step 1: GPS + Anti-Spoofing ——————————————————————————————
  const runGPSVerification = useCallback(async () => {
    setGpsLoading(true);
    setLocError('');
    setTrustResult(null);
    setAntiSpoofRunning(true);

    if (!navigator.geolocation) {
      setLocError(t('Geolocation not supported', 'Geolocation tidak didukung browser ini'));
      setGpsLoading(false);
      setAntiSpoofRunning(false);
      return;
    }

    try {
      // Get initial position quickly
      const quickPos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      });

      const primary = {
        lat: quickPos.coords.latitude,
        lng: quickPos.coords.longitude,
        accuracy: quickPos.coords.accuracy,
        altitude: quickPos.coords.altitude,
      };
      setLocation(primary);

      // Run full anti-spoofing pipeline
      setAntiSpoofStep(t('Analyzing GPS quality...', 'Menganalisis kualitas GPS...'));
      const accuracyResult = analyzeGPSAccuracy(primary.accuracy);

      setAntiSpoofStep(t('Collecting GPS samples...', 'Mengumpulkan sampel GPS...'));
      const samples = await collectGPSSamples(3, 1500);
      setGpsSamples(samples);
      const samplesResult = analyzeGPSSamples(samples);

      setAntiSpoofStep(t('Cross-checking network location...', 'Memverifikasi lokasi via jaringan...'));
      const ipLocation = await getIPLocation();
      const ipResult = analyzeIPvsGPS(primary.lat, primary.lng, ipLocation);

      setAntiSpoofStep(t('Checking travel history...', 'Memeriksa riwayat perjalanan...'));
      const travelResult = checkImpossibleTravel(
        { lat: primary.lat, lng: primary.lng, timestamp: Date.now() },
        todayAtt || null
      );

      setAntiSpoofStep(t('Analyzing device sensors...', 'Menganalisis sensor perangkat...'));
      const motionResult = analyzeDeviceMotion(0);

      const trust = calculateTrustScore({
        accuracyResult, samplesResult, ipResult, travelResult, motionResult,
        faceVerified: null, // Not yet verified at this stage
      });

      trust.ipLocation = ipLocation;
      trust.allSamples = samples;
      trust.finalLocation = primary;

      setTrustResult(trust);
      setAntiSpoofRunning(false);
      setGpsLoading(false);
    } catch (err) {
      setLocError(err.code === 1
        ? t('GPS access denied. Enable location permissions.', 'Akses GPS ditolak. Aktifkan izin lokasi.')
        : t('Failed to get location. Please try again.', 'Gagal mendapatkan lokasi. Coba lagi.')
      );
      setGpsLoading(false);
      setAntiSpoofRunning(false);
    }
  }, [todayAtt, locale]);

  const inRadius = location && office
    ? getDistance(location.lat, location.lng, parseFloat(office.latitude), parseFloat(office.longitude)) <= office.radius_meters
    : false;

  const distance = location && office
    ? Math.round(getDistance(location.lat, location.lng, parseFloat(office.latitude), parseFloat(office.longitude)))
    : null;

  // ——— Step 2: Face result callback ————————————————————————————
  const handleFaceSuccess = useCallback((result) => {
    setFaceResult(result);
    setStep('confirm');
  }, []);

  const handleFaceError = useCallback((msg) => {
    console.warn('[Face]', msg);
    // Don't auto-advance —” user will retry via FaceScanner's own retry button
  }, []);

  // ——— Step 3: Submit attendance ——————————————————————————————
  const handleConfirm = async () => {
    if (!emp || !location) return;
    setSubmitLoading(true);

    const finalTrust = trustResult ? {
      ...trustResult,
      faceVerified: faceResult?.matchResult?.match || false,
      faceDistance: faceResult?.matchResult?.distance,
      faceConfidence: faceResult?.matchResult?.confidence,
      livenessResult: faceResult?.livenessResult,
    } : null;

    // Recalculate trust score with face result included
    let finalTrustResult = finalTrust;
    if (finalTrust && trustResult) {
      finalTrustResult = calculateTrustScore({
        ...trustResult.details,
        faceVerified: finalTrust.faceVerified,
      });
      finalTrustResult.allSamples = trustResult.allSamples;
      finalTrustResult.ipLocation = trustResult.ipLocation;
    }

    try {
      if (mode === 'out' && todayAtt?.id) {
        await serviceClockOut(todayAtt.id);
      } else {
        const clockInPayload = {
          employee_id: emp.id,
          latitude: location.lat,
          longitude: location.lng,
          inRadius,
          selfieVerified: true,
          locationId: office?.id || 1,
          faceVerified: finalTrust?.faceVerified || false,
          faceDistance: finalTrust?.faceDistance,
          faceConfidence: finalTrust?.faceConfidence,
          trustScore: finalTrustResult?.trustScore ?? 100,
          trustLevel: finalTrustResult?.level || 'trusted',
          antiSpoofFlags: finalTrustResult?.flags || [],
        };

        let attRecord = null;
        try {
          const { data } = await serviceClockIn(emp.id, clockInPayload);
          attRecord = data;
        } catch (networkErr) {
          // Offline fallback: queue for background sync
          if (isBackgroundSyncSupported()) {
            const queued = await queueRequest(
              '/api/attendance/clock-in',
              'POST',
              { 'Content-Type': 'application/json' },
              JSON.stringify(clockInPayload)
            );
            if (queued) {
              console.log('[EmpAbsen] Queued clock-in for background sync');
              setStep('done');
              if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
              setSubmitLoading(false);
              return;
            }
          }
          throw networkErr;
        }

        // Save detailed trust log async (non-blocking)
        if (attRecord?.id && finalTrustResult) {
          saveTrustLog(attRecord.id, {
            ...finalTrustResult,
            faceVerified: finalTrust?.faceVerified || false,
            faceDistance: finalTrust?.faceDistance,
            faceConfidence: finalTrust?.faceConfidence,
            livenessResult: faceResult?.livenessResult,
          }).catch(console.error);
        }
      }

      setStep('done');
      if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
    } catch (err) {
      console.error('Submit error:', err);
    }
    setSubmitLoading(false);
  };

  // ——— Reset to start ——————————————————————————————————————————
  const resetFlow = () => {
    setStep('gps');
    setLocation(null);
    setGpsSamples([]);
    setTrustResult(null);
    setFaceResult(null);
    setLocError('');
  };

  // ——— Skeleton loading ————————————————————————————————————————
  if (pageLoading) {
    return (
      <div style={{ animation: 'fadeInUp 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div><div className="skeleton skeleton-text" style={{ width: 140, marginBottom: 6 }} />
            <div className="skeleton skeleton-text-sm" style={{ width: 100 }} /></div>
        </div>
        <div className="absen-card"><div className="skeleton" style={{ height: 220, borderRadius: 8 }} /></div>
      </div>
    );
  }

  // ——— No face registered banner ——————————————————————————————
  const noFaceBanner = hasFaceReg === false && (
    <div style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
      <HiCamera size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>
          {t('Face not registered yet', 'Wajah belum terdaftar')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
          {t('Register your face to enable Face ID attendance.', 'Daftarkan wajah Anda untuk absensi Face ID.')}
        </div>
        <button
          onClick={() => setShowFaceReg(true)}
          style={{ fontSize: 12, fontWeight: 700, color: '#D97706', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 100, padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
           {t('Register Now', 'Daftar Sekarang')}
        </button>
      </div>
    </div>
  );

  // ——— Face registration modal ————————————————————————————————
  if (showFaceReg) {
    return (
      <div className="absen-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setShowFaceReg(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
            <HiChevronLeft size={22} />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            {t('Face Registration', 'Registrasi Wajah')}
          </h1>
        </div>
        <div className="absen-card" style={{ padding: 20 }}>
          <FaceRegistration
            employeeId={emp?.id}
            employeeName={emp?.name}
            locale={locale}
            onComplete={async (descriptors) => {
              setHasFaceReg(true);
              const { data } = await getEmployeeFaceDescriptors(emp.id);
              setRegisteredFaces(data || []);
              setShowFaceReg(false);
            }}
            onClose={() => setShowFaceReg(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="absen-page"
      onTouchStart={e => {
        if (window.scrollY === 0) {
          touchStartY.current = e.touches[0].clientY;
          isPulling.current = true;
        }
      }}
      onTouchMove={e => {
        if (!isPulling.current || isRefreshing) return;
        const dy = e.touches[0].clientY - touchStartY.current;
        if (dy > 0 && window.scrollY === 0) {
          setPullY(Math.min(dy * 0.5, PULL_THRESHOLD));
        }
      }}
      onTouchEnd={async () => {
        if (!isPulling.current) return;
        isPulling.current = false;
        if (pullY >= PULL_THRESHOLD && !isRefreshing) {
          setIsRefreshing(true);
          setPullY(60);
          // Reload page data
          window.dispatchEvent(new Event('emp:refresh'));
          await new Promise(r => setTimeout(r, 1000));
          window.location.reload();
        } else {
          setPullY(0);
        }
      }}
    >
      {/* Pull-to-refresh indicator */}
      {(pullY > 0 || isRefreshing) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: isRefreshing ? 60 : pullY,
          overflow: 'hidden',
          transition: isRefreshing ? 'height 0.2s ease' : 'none',
          marginBottom: 4,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(0,71,171,0.1)', border: '2px solid rgba(0,71,171,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary)',
            animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
            transform: `rotate(${Math.min(pullY / PULL_THRESHOLD, 1) * 180}deg)`,
          }}>
            <HiArrowPath size={16} />
          </div>
        </div>
      )}

      {/* ---- HRIS Loka Header ---- */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #1565C0, #1976D2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="15" rx="2" fill="white" fillOpacity="0.9"/><rect x="9" y="12" width="6" height="10" rx="1" fill="#1565C0"/><rect x="4" y="2" width="16" height="8" rx="1" fill="white" fillOpacity="0.6"/></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>HRIS Loka</span>
        </div>
      </div>

      {/* ——— Title + Step Badge ——— */}
      {mode !== 'done_both' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-0.3px' }}>
              {t('Biometric Attendance', 'Absensi Biometrik Loka')}
            </h1>
            {step !== 'done' && (
              <div style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(0,71,171,0.08)', border: '1px solid rgba(0,71,171,0.15)', fontSize: 12, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
                {t(`Step ${['gps','face','confirm'].indexOf(step)+1} / 3`, `Tahap ${['gps','face','confirm'].indexOf(step)+1} / 3`)}
              </div>
            )}
          </div>
          {/* 3-Segment Progress Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 22 }}>
            {['gps','face','confirm'].map((s, i) => {
              const stepIdx = step === 'done' ? 3 : ['gps','face','confirm'].indexOf(step);
              return (
                <div key={s} style={{ height: 5, borderRadius: 3, background: i <= stepIdx ? 'var(--primary)' : 'var(--border)', transition: 'background 0.4s ease' }} />
              );
            })}
          </div>
        </>
      )}

      {/* No face banner */}
      {noFaceBanner}

      {/* All done state */}
      {mode === 'done_both' && (
        <div className="emp-card" style={{ textAlign: 'center', padding: 40, marginBottom: 16 }}>
          <div className="absen-check-icon"><HiCheck size={28} /></div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{t("Today's Attendance Complete", 'Absensi Hari Ini Selesai')}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
            {t('In', 'Masuk')}: {todayAtt?.clock_in} &nbsp;·&nbsp; {t('Out', 'Keluar')}: {todayAtt?.clock_out}
          </div>
          {todayAtt?.trust_score && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <TrustBadge score={todayAtt.trust_score} level={todayAtt.trust_level} flags={todayAtt.anti_spoof_flags} />
            </div>
          )}
        </div>
      )}

      {/* ——— STEP: GPS ————————————————————————————————————————————— */}
      {mode !== 'done_both' && step === 'gps' && (
        <div className="absen-card" style={{ textAlign: 'center' }}>
          {/* Feature chips - icon based */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              <HiMapPin size={12} style={{ color: 'var(--primary)' }} /> {t('Accurate', 'Akurat')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              <HiClock size={12} style={{ color: 'var(--primary)' }} /> Real-time
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              <HiShieldCheck size={12} style={{ color: 'var(--primary)' }} /> {t('Safe', 'Aman')}
            </div>
          </div>

          {/* Map visual */}
          <div style={{ width: 140, height: 140, borderRadius: '50%', background: 'linear-gradient(135deg, #EEF2FF 0%, #E8F4FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', position: 'relative', boxShadow: '0 0 0 16px rgba(0,71,171,0.04), 0 0 0 32px rgba(0,71,171,0.02)' }}>
            <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '1.5px solid rgba(0,71,171,0.12)', animation: 'pulseDot 2s ease-in-out infinite' }} />
            <HiMapPin size={40} style={{ color: 'var(--primary)', filter: 'drop-shadow(0 4px 8px rgba(0,71,171,0.25))' }} />
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            {t('GPS Coordinate Detection', 'Deteksi Koordinat GPS')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18, lineHeight: 1.6 }}>
            {t(
              `System verifies you're within ${office?.radius_meters || 50}m of ${office?.name || 'Office'}.`,
              `Sistem memverifikasi Anda berada dalam radius ${office?.radius_meters || 50}m dari ${office?.name || 'Kantor'}.`
            )}
          </p>

          {/* Anti-spoofing progress */}
          {antiSpoofRunning && (
            <div style={{ marginBottom: 16 }}>
              <div className="absen-loading">
                <div className="absen-spinner" />
                <span style={{ fontSize: 13 }}>{antiSpoofStep}</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), #8B5CF6)', width: '100%', animation: 'slideProgress 1.5s ease-in-out infinite' }} />
              </div>
            </div>
          )}

          {!location && !gpsLoading && (
            <button className="absen-action-btn" style={{ width: '100%' }} onClick={runGPSVerification}>
              <HiShieldCheck size={16} /> {t('Start GPS Verification', 'Mulai Verifikasi GPS')}
            </button>
          )}

          {locError && (
            <div className="absen-alert danger">
              <HiExclamationTriangle /> {locError}
              <button className="absen-retry" onClick={runGPSVerification}>{t('Retry', 'Coba Lagi')}</button>
            </div>
          )}

          {location && trustResult && !antiSpoofRunning && (
            <div style={{ width: '100%' }}>
              {/* Coordinate card */}
              <div style={{ background: 'var(--bg)', borderRadius: 14, padding: '14px 16px', marginBottom: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  {t('Your location now', 'Lokasi Anda sekarang')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                  <HiMapPin size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)} {office?.name ? `(${office.name})` : ''}
                  </span>
                </div>
                <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />
                <div className={`absen-radius-badge ${inRadius ? 'in' : 'out'}`} style={{ margin: '0 auto' }}>
                  {inRadius ? <><HiCheck size={14}/> {t(`Office Radius Verified (Safe)`, `Radius Kantor Terverifikasi (Aman)`)}</> : <><HiExclamationTriangle size={14}/> {t(`Outside Radius (${distance}m)`, `Di Luar Radius (${distance}m)`)}</>}
                </div>
              </div>

              {/* 3 stat badges */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { label: t('Radius', 'Radius'), val: `${office?.radius_meters || 50}m` },
                  { label: t('Updated', 'Diperbarui'), val: t('Now', 'Sekarang') },
                  { label: 'Status', val: inRadius ? t('Safe', 'Aman') : t('Outside', 'Luar') },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {trustResult.flags?.length > 0 && (
                <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)', textAlign: 'left' }}>
                  {trustResult.flags.map(f => (
                    <div key={f} style={{ fontSize: 11, color: '#D97706' }}>⚠️ {f.replaceAll('_', ' ')}</div>
                  ))}
                </div>
              )}

              {trustResult.level === 'rejected' ? (
                <div style={{ padding: 12, background: '#FEF2F2', borderRadius: 10, fontSize: 13, color: '#DC2626', display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left' }}>
                  <HiExclamationTriangle style={{ flexShrink: 0, marginTop: 2 }} />
                  <div><div style={{ fontWeight: 700 }}>{t('Attendance Blocked', 'Absensi Diblokir')}</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>{t('Contact HR.', 'Hubungi HR.')}</div></div>
                </div>
              ) : !hasFaceReg ? (
                <div style={{ padding: 12, background: 'rgba(245,158,11,0.08)', borderRadius: 10, fontSize: 13, color: '#D97706', textAlign: 'left' }}>
                  {t('Register your face first to continue.', 'Daftarkan wajah Anda terlebih dahulu.')}
                </div>
              ) : (
                <button className="absen-action-btn" style={{ width: '100%' }} onClick={() => setStep('face')}>
                  <HiCamera size={16} /> {t('Continue to Face Scan', 'Lanjut ke Pemindaian Wajah')} →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ——— STEP: FACE ID —————————————————————————————————————————— */}
      {mode !== 'done_both' && step === 'face' && (
        <div className="absen-card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
             Face ID
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            {t('Complete the liveness challenges to verify your identity.', 'Selesaikan tantangan untuk memverifikasi identitas Anda.')}
          </p>
          <FaceScanner
            mode="verify"
            registeredFaces={registeredFaces}
            locale={locale}
            strict={true}
            onSuccess={handleFaceSuccess}
            onError={handleFaceError}
          />
        </div>
      )}

      {/* ——— STEP: CONFIRM —————————————————————————————————————————— */}
      {mode !== 'done_both' && step === 'confirm' && (
        <div className="absen-card" style={{ textAlign: 'center' }}>
          {/* Icon header */}
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,71,171,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <HiClipboardDocumentCheck size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
            {t('Attendance Confirmation', 'Konfirmasi Absensi')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
            {t('Check your attendance details before finishing.', 'Periksa detail absensi Anda sebelum menyelesaikan.')}
          </p>

          {/* Detail rows */}
          <div style={{ textAlign: 'left', marginBottom: 16 }}>
            {[
              { icon: <HiCalendarDays size={18} />, label: t('Date', 'Tanggal'), val: new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), iconBg: 'rgba(0,71,171,0.08)', iconColor: 'var(--primary)' },
              { icon: <HiClock size={18} />, label: t('Time', 'Waktu'), val: `${new Date().toLocaleTimeString(locale === 'en' ? 'en-US' : 'id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB`, iconBg: 'rgba(0,71,171,0.08)', iconColor: 'var(--primary)' },
              { icon: <HiMapPin size={18} />, label: t('Location', 'Lokasi'), val: office?.name || 'HQ', iconBg: 'rgba(0,71,171,0.08)', iconColor: 'var(--primary)' },
              { icon: <HiShieldCheck size={18} />, label: t('Office Radius', 'Radius Kantor'), val: inRadius ? t('✓ Verified (Safe)', '✓ Terverifikasi (Aman)') : t('⚠ Outside Radius', '⚠ Di Luar Radius'), valColor: inRadius ? '#16A34A' : '#DC2626', iconBg: inRadius ? 'rgba(16,185,129,0.1)' : 'rgba(220,38,38,0.08)', iconColor: inRadius ? '#10B981' : '#DC2626' },
              { icon: <HiUser size={18} />, label: t('Name', 'Nama'), val: emp?.name, iconBg: 'rgba(0,71,171,0.08)', iconColor: 'var(--primary)', valBold: true },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: row.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: row.iconColor, flexShrink: 0 }}>
                  {row.icon}
                </div>
                <span style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: row.valBold ? 800 : 700, color: row.valColor || 'var(--text)', textAlign: 'right' }}>{row.val}</span>
              </div>
            ))}
          </div>

          {/* Security notice */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(0,71,171,0.06)', borderRadius: 12, marginBottom: 16, textAlign: 'left' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HiShieldCheck size={18} style={{ color: '#fff' }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, lineHeight: 1.5 }}>
              {t('Your attendance data will be recorded securely and cannot be changed.', 'Data absensi Anda akan terekam secara aman dan tidak dapat diubah.')}
            </span>
          </div>

          <button className={`absen-action-btn ${mode === 'out' ? 'danger' : ''}`} onClick={handleConfirm} disabled={submitLoading} style={{ width: '100%', marginBottom: 10, borderRadius: 100, padding: '16px', fontSize: 15 }}>
            {submitLoading ? t('Submitting...', 'Mengirim...') : <><HiCheck size={18} /> {mode === 'out' ? t('Confirm Clock Out', 'Konfirmasi Absen Keluar') : t('Confirm & Finish Attendance', 'Konfirmasi & Selesaikan Absensi')}</>}
          </button>
          <button onClick={() => setStep('gps')} style={{ width: '100%', padding: '14px', borderRadius: 100, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 14, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('Back', 'Kembali')}
          </button>
        </div>
      )}

      {/* â”€â”€â”€â”€ STEP: DONE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {mode !== 'done_both' && step === 'done' && (
        <div className="absen-card" style={{ textAlign: 'center' }}>
          <div className="absen-done-icon"><HiCheck size={32} /></div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)', marginBottom: 6 }}>
            {mode === 'out' ? t('Clock Out Successful!', 'Absen Keluar Berhasil!') : t('Clock In Successful!', 'Absen Masuk Berhasil!')}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>
            {t('Attendance recorded securely.', 'Absensi tercatat dengan aman.')}
          </p>
          {trustResult && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <TrustBadge score={trustResult.trustScore} level={trustResult.level} flags={trustResult.flags} />
            </div>
          )}
          <button className="absen-action-btn" onClick={resetFlow}>{t('Back', 'Kembali')}</button>
        </div>
      )}

      {/* History */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t('Recent History', 'Riwayat Terbaru')}</div>
          <button onClick={() => setShowRecap(r => !r)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {showRecap ? t('Hide Recap', 'Sembunyikan Rekap') : t('Monthly Summary', 'Rekap Bulanan')}
          </button>
        </div>

        {showRecap && (
          <div className="emp-card" style={{ marginBottom: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button onClick={() => setRecapMonth(m => m - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}><HiChevronLeft size={18} /></button>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                {(() => { const d = new Date(); d.setMonth(d.getMonth() + recapMonth); return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' }); })()}
              </span>
              <button onClick={() => setRecapMonth(m => Math.min(m + 1, 0))} disabled={recapMonth >= 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: recapMonth >= 0 ? 'var(--border)' : 'var(--primary)' }}><HiChevronRight size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
              {[
                { label: t('Present', 'Hadir'), count: monthlyHistory.filter(h => h.in_radius).length, color: 'var(--success)', bg: 'rgba(16,185,129,0.06)' },
                { label: t('Outside', 'Di Luar'), count: monthlyHistory.filter(h => !h.in_radius && h.clock_in).length, color: '#F59E0B', bg: 'rgba(245,158,11,0.06)' },
                { label: 'Total', count: monthlyHistory.length, color: 'var(--primary)', bg: 'rgba(59,130,246,0.06)' },
              ].map(s => (
                <div key={s.label} style={{ padding: 12, background: s.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length > 0 ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {history.slice(0, 7).map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{h.date}</span>
                <span style={{ color: 'var(--muted)' }}>{h.clock_in || '--'} - {h.clock_out || t('Not out', 'Belum')}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {h.face_verified !== undefined && (
                    <span style={{ fontSize: 10 }}>{h.face_verified ? '' : ''}</span>
                  )}
                  <span style={{ color: h.in_radius ? 'var(--success)' : 'var(--danger)', fontSize: 11, fontWeight: 600 }}>
                    {h.in_radius ? 'OK' : t('Out', 'Luar')}
                  </span>
                  {h.trust_score && (
                    <span style={{ fontSize: 10, color: h.trust_level === 'trusted' ? '#22c55e' : h.trust_level === 'warning' ? '#F59E0B' : '#DC2626', fontWeight: 700 }}>
                      {h.trust_score}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            {weekDays.map((d) => (
              <div key={d} style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>{d}</div>
                <div style={{ fontSize: 14 }}>--</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



