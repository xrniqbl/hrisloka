import { describe, it, expect } from 'vitest';
import { sanitizeAppPath } from '../lib/safePath';

describe('sanitizeAppPath', () => {
  it('keeps valid dashboard path', () => {
    expect(sanitizeAppPath('/dashboard')).toBe('/dashboard');
  });

  it('strips hash but preserves safe query', () => {
    expect(sanitizeAppPath('/dashboard#foo')).toBe('/dashboard');
    expect(sanitizeAppPath('/employees?id=1')).toBe('/employees?id=1');
    expect(sanitizeAppPath("/employees?id=1';DROP")).toBe('/employees');
  });

  it('rejects absolute URLs and maps pathname', () => {
    expect(sanitizeAppPath('http://localhost:5173/dashboard')).toBe('/dashboard');
  });

  it('maps legacy /assets to /it-assets (Vite collision)', () => {
    expect(sanitizeAppPath('/assets')).toBe('/it-assets');
    expect(sanitizeAppPath('/assets#')).toBe('/it-assets');
  });

  it('rejects vite asset file paths', () => {
    expect(sanitizeAppPath('/assets/index-abc.js', '/dashboard')).toBe('/dashboard');
  });

  it('falls back for junk', () => {
    expect(sanitizeAppPath('', '/login')).toBe('/login');
    expect(sanitizeAppPath('//evil.com', '/dashboard')).toBe('/dashboard');
  });
});
