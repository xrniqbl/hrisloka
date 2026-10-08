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
    const next = await loadFeatureFlags();
    setFlags(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadFeatureFlags().then((next) => {
      if (!cancelled) {
        setFlags(next);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({
    flags,
    loading,
    isEnabled: (key) => isFeatureEnabled(flags, key),
    isPathEnabled: (path) => isPathFeatureEnabled(flags, path, FEATURE_ROUTE_MAP),
    isEmpPathEnabled: (path) => isPathFeatureEnabled(flags, path, FEATURE_EMP_ROUTE_MAP),
    refresh,
  }), [flags, loading, refresh]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}
