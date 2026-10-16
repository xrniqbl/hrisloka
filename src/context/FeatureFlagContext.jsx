import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  DEFAULT_FEATURE_FLAGS,
  loadFeatureFlags,
  isFeatureEnabled,
  isPathFeatureEnabled,
  FEATURE_ROUTE_MAP,
  FEATURE_EMP_ROUTE_MAP,
} from '../lib/featureFlags';

const FeatureFlagContext = createContext({
  flags: DEFAULT_FEATURE_FLAGS,
  loading: true,
  // Fail-closed: sebelum flags dimuat, anggap fitur MATI agar halaman yang
  // dimatikan platform tidak sempat ter-render saat first paint/offline.
  isEnabled: () => false,
  isPathEnabled: () => false,
  isEmpPathEnabled: () => false,
  refresh: async () => {},
});

export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}

export function FeatureFlagProvider({ children }) {
  const [flags, setFlags] = useState(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await loadFeatureFlags();
      setFlags(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Fail-open timeout: a hung platform_settings query must never trap the
    // app on an infinite spinner (guards render PageLoader while loading).
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 15000);
    loadFeatureFlags().then((next) => {
      if (!cancelled) {
        setFlags(next);
        setLoading(false);
        clearTimeout(timeout);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
        clearTimeout(timeout);
      }
    });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  const value = useMemo(() => ({
    flags,
    loading,
    // Fail-closed while loading: provider default is all-true, so gate on
    // loading to avoid leaking features on first paint.
    isEnabled: (key) => (loading ? false : isFeatureEnabled(flags, key)),
    isPathEnabled: (path) => (loading ? false : isPathFeatureEnabled(flags, path, FEATURE_ROUTE_MAP)),
    isEmpPathEnabled: (path) => (loading ? false : isPathFeatureEnabled(flags, path, FEATURE_EMP_ROUTE_MAP)),
    refresh,
  }), [flags, loading, refresh]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}
