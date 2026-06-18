import { useState, useEffect } from 'react';
import { HiArrowPath } from 'react-icons/hi2';

/**
 * UpdatePrompt — Detects new Service Worker and shows a toast to reload.
 * Place this component inside EmployeeLayout (or App root).
 */
export default function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Listen for SW update messages
    const handleMessage = (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        setShowUpdate(true);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Also check for waiting SW on page load
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      setRegistration(reg);

      if (reg.waiting) {
        setShowUpdate(true);
        return;
      }

      // Listen for new SW installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setShowUpdate(true);
          }
        });
      });
    });

    // Detect controller change (new SW took over)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleUpdate = () => {
    const reg = registration;
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
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
      background: 'linear-gradient(135deg, #0047AB, #2563EB)',
      color: '#fff',
      borderRadius: 16,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 8px 32px rgba(0,71,171,0.4)',
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
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        Reload
      </button>
    </div>
  );
}
