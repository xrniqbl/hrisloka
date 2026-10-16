/**
 * Service worker registration (external file for CSP without script unsafe-inline).
 *
 * Update flow (user-triggered, never forced):
 * 1. Periodic reg.update() checks for a new SW (every 60 min + on visibility).
 * 2. When a new SW reaches "waiting", we DON'T auto-reload — UpdatePrompt.jsx
 *    renders a toast and only posts SKIP_WAITING after the user clicks update.
 * 3. register-sw emits window events so React can listen:
 *    - 'sw:update-available' (detail: { registration }) → show toast
 *    - 'sw:updated' → new SW activated
 */
(function () {
  if (!('serviceWorker' in navigator)) return;

  var UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  var pendingReg = null;

  function askUserToUpdate(reg) {
    pendingReg = reg;
    window.dispatchEvent(new CustomEvent('sw:update-available', { detail: { registration: reg } }));
    if (typeof console !== 'undefined' && console.log) {
      console.log('[SW] update available — waiting for user accept');
    }
  }

  // Called by UpdatePrompt when the user clicks "Muat Ulang".
  window.__applyServiceWorkerUpdate = function () {
    var reg = pendingReg;
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    }
    if (typeof console !== 'undefined' && console.log) {
      console.log('[SW] no waiting worker to activate');
    }
    return false;
  };

  function trackWaiting(reg) {
    if (reg.waiting) {
      askUserToUpdate(reg);
      return;
    }
    reg.addEventListener('updatefound', function () {
      var sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', function () {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          // New version installed, old page still controlled → ask user
          askUserToUpdate(reg);
        }
      });
    });
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/sw.js')
      .then(function (reg) {
        if (typeof console !== 'undefined' && console.log) {
          console.log('SW registered:', reg.scope);
        }
        trackWaiting(reg);

        // Periodic update check (hourly)
        setInterval(function () {
          reg.update().catch(function () { /* offline — ignore */ });
        }, UPDATE_CHECK_INTERVAL_MS);

        // Check immediately when tab becomes visible again
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') {
            reg.update().catch(function () { /* offline — ignore */ });
          }
        });

        // Notify React when the new SW takes over (after user-accepted SKIP_WAITING)
        var reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (reloaded) return;
          reloaded = true;
          window.dispatchEvent(new CustomEvent('sw:updated'));
        });
      })
      .catch(function (err) {
        if (typeof console !== 'undefined' && console.log) {
          console.log('SW registration failed:', err);
        }
      });
  });
})();
