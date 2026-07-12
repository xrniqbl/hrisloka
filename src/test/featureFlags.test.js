import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FEATURE_FLAGS,
  isFeatureEnabled,
  isPathFeatureEnabled,
  getFeatureKeyForPath,
  FEATURE_ROUTE_MAP,
} from '../lib/featureFlags';

describe('featureFlags', () => {
  it('defaults are safe and complete', () => {
    expect(DEFAULT_FEATURE_FLAGS.face_attendance).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.ai_ocr).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.geofence).toBe(true);
  });

  it('isFeatureEnabled respects explicit false', () => {
    const flags = { ...DEFAULT_FEATURE_FLAGS, geofence: false };
    expect(isFeatureEnabled(flags, 'geofence')).toBe(false);
    expect(isFeatureEnabled(flags, 'ai_ocr')).toBe(true);
  });

  it('maps admin paths to feature keys', () => {
    expect(getFeatureKeyForPath('/geo-attendance', FEATURE_ROUTE_MAP)).toBe('geofence');
    expect(getFeatureKeyForPath('/expense-ocr', FEATURE_ROUTE_MAP)).toBe('ai_ocr');
    expect(getFeatureKeyForPath('/branches', FEATURE_ROUTE_MAP)).toBe('multi_branch');
    expect(getFeatureKeyForPath('/dashboard', FEATURE_ROUTE_MAP)).toBe(null);
  });

  it('isPathFeatureEnabled blocks disabled routes', () => {
    const flags = { ...DEFAULT_FEATURE_FLAGS, integrations: false };
    expect(isPathFeatureEnabled(flags, '/integrations')).toBe(false);
    expect(isPathFeatureEnabled(flags, '/employees')).toBe(true);
  });
});
