import { useState, useEffect, useRef } from 'react';
import { HiArrowPath } from 'react-icons/hi2';

/**
 * UpdatePrompt - Detects a waiting Service Worker and shows a toast so the
 * USER can trigger the update. Mounted in App root (see App.jsx).
 *
 * Flow (no forced reloads — sw.js never calls skipWaiting on install; the
 * waiting worker activates only after the user clicks "Muat Ulang"):
 * 1. register-sw.js detects a waiting SW → dispatches 'sw:update-available'.
 * 2. This toast appears. On "Muat Ulang" click → __applyServiceWorkerUpdate()
 *    posts SKIP_WAITING to the waiting worker.
 * 3. controllerchange fires → reload once to serve fresh assets.
 * 4. Legacy SW_UPDATED postMessage (from activate) also shows the toast.
 */
export default function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const reloadOnce = () => {
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    };

    // New SW available (waiting) — show the toast, wait for user accept
    const handleUpdateAvailable = () => {
      setShowUpdate(true);
    };
    window.addEventListener('sw:update-available', handleUpdateAvailable);

    // New SW took over after user-accepted SKIP_WAITING — reload once
    const handleUpdated = () => {
      reloadOnce();
    };
    window.addEventListener('sw:updated', handleUpdated);

    // Legacy: SW posts SW_UPDATED on activate — also surface the toast
    const handleMessage = (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        setShowUpdate(true);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Safety net: any controller change reloads once (guarded by ref)
    const handleControllerChange = () => {
      // Only reload if the user already accepted (toast was shown)
      setShowUpdate((shown) => {
        if (shown) reloadOnce();
        return shown;
      });
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      window.removeEventListener('sw:update-available', handleUpdateAvailable);
      window.removeEventListener('sw:updated', handleUpdated);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    if (reloadedRef.current) return;
    // Ask the waiting SW to activate; controllerchange/sw:updated reloads us.
    try {
      if (typeof window.__applyServiceWorkerUpdate === 'function') {
        const accepted = window.__applyServiceWorkerUpdate();
        if (!accepted) {
          // No waiting worker (edge race) — just reload
          reloadFallback();
        }
        return;
      }
    } catch {
      /* fall through to reload */
    }
    reloadFallback();

    function reloadFallback() {
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    }
  };

  if (!showUpdate) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100000,
      background: 'linear-gradient(135deg, #635BFF, #4F46E5)',
      color: '#fff',
      borderRadius: 16,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 8px 32px rgba(99,91,255,0.4)',
      fontSize: 13,
      fontWeight: 700,
      fontFamily: 'inherit',
      maxWidth: 340,
      animation: 'fadeInUp 0.4s ease',
    }}>
      <HiArrowPath size={16} />
      <span style={{ flex: 1 }}>Update tersedia!</span>
      <button
        onClick={handleUpdate}
        style={{
          background: 'rgba(255,255,255,0.25)',
          border: '1.5px solid rgba(255,255,255,0.4)',
          borderRadius: 10,
          color: '#fff',
          padding: '6px 14px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        Muat Ulang
      </button>
    </div>
  );
}
