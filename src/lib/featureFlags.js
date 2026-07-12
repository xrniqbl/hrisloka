/**
 * Platform feature flags — loaded from Supabase platform_settings (key: feature_flags).
 * Founder Portal writes these; the rest of the app must enforce them.
 */

import { supabase } from './supabase';

export const DEFAULT_FEATURE_FLAGS = {
  face_attendance: true,
  ai_ocr: true,
  push_notifications: true,
  geofence: true,
  public_careers: true,
  multi_branch: true,
  // Default ON so existing tenants keep access; founder can disable globally
  integrations: true,
}

/** Admin (and shared) routes gated by a feature flag key */
export const FEATURE_ROUTE_MAP = {
  '/geo-attendance': 'geofence',
  '/expense-ocr': 'ai_ocr',
  '/branches': 'multi_branch',
  '/integrations': 'integrations',
};

/** Employee PWA paths gated by feature flag */
export const FEATURE_EMP_ROUTE_MAP = {
  '/app/expense-ocr': 'ai_ocr',
};

const CACHE_KEY = 'founder_feature_flags';

/**
 * Load feature flags from Supabase, with localStorage cache fallback.
 */
export async function loadFeatureFlags() {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'feature_flags')
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (parsed && typeof parsed === 'object') {
        const merged = { ...DEFAULT_FEATURE_FLAGS, ...parsed };
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
        return merged;
      }
    }
  } catch {
    /* fall through to cache */
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_FEATURE_FLAGS, ...parsed };
      }
    }
  } catch { /* ignore */ }

  return { ...DEFAULT_FEATURE_FLAGS };
}

/**
 * Check if a feature is enabled.
 * Unknown keys default to true (safe: don't block unmapped features).
 */
export function isFeatureEnabled(flags, key) {
  if (!key) return true;
  if (!flags || typeof flags !== 'object') return DEFAULT_FEATURE_FLAGS[key] !== false;
  if (flags[key] === undefined) return DEFAULT_FEATURE_FLAGS[key] !== false;
  return flags[key] !== false;
}

/**
 * Resolve feature flag required for a path (exact match or prefix).
 */
export function getFeatureKeyForPath(path, map = FEATURE_ROUTE_MAP) {
  if (!path) return null;
  if (map[path]) return map[path];
  // longest prefix match
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const route of keys) {
    if (path === route || path.startsWith(route + '/')) return map[route];
  }
  return null;
}

export function isPathFeatureEnabled(flags, path, map = FEATURE_ROUTE_MAP) {
  const key = getFeatureKeyForPath(path, map);
  if (!key) return true;
  return isFeatureEnabled(flags, key);
}
