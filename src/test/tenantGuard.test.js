import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { guardCompanyId, sanitizeFilterInput } from '../lib/tenantGuard';

describe('tenantGuard', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks missing company_id', () => {
    expect(guardCompanyId(null, 'test')).toBe(false);
    expect(guardCompanyId(undefined, 'test')).toBe(false);
    expect(guardCompanyId('', 'test')).toBe(false);
  });

  it('allows valid company_id', () => {
    expect(guardCompanyId('uuid-company-1', 'test')).toBe(true);
    expect(guardCompanyId(42, 'test')).toBe(true);
  });

  it('sanitizes filter injection characters', () => {
    expect(sanitizeFilterInput('a%b_c')).toBe('a\\%b\\_c');
    expect(sanitizeFilterInput('foo(bar),baz')).toBe('foobarbaz');
    expect(sanitizeFilterInput(null)).toBe('');
    expect(sanitizeFilterInput('x'.repeat(500)).length).toBe(200);
  });
});
