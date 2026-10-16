import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  guardCompanyId,
  sanitizeFilterInput,
  normalizeCompanyId,
  withCompanyId,
  blockedList,
} from '../lib/tenantGuard';

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

  it('blocks object company_id', () => {
    expect(guardCompanyId({ id: 1 }, 'test')).toBe(false);
  });

  it('allows valid company_id', () => {
    expect(guardCompanyId('uuid-company-1', 'test')).toBe(true);
    expect(guardCompanyId(42, 'test')).toBe(true);
  });

  it('normalizes company ids', () => {
    expect(normalizeCompanyId(42)).toBe('42');
    expect(normalizeCompanyId(' 7 ')).toBe('7');
    expect(normalizeCompanyId(null)).toBe(null);
  });

  it('withCompanyId attaches tenant', () => {
    expect(withCompanyId({ name: 'A' }, 9, 't')).toEqual({ name: 'A', company_id: 9 });
    expect(withCompanyId({ name: 'A' }, null, 't')).toBe(null);
  });

  it('blockedList returns tenant error shape', () => {
    const r = blockedList('x');
    expect(r.data).toEqual([]);
    expect(r.error.code).toBe('TENANT_BLOCKED');
  });

  it('sanitizes filter injection characters', () => {
    expect(sanitizeFilterInput('a%b_c')).toBe('a\\%b\\_c');
    expect(sanitizeFilterInput('foo(bar),baz')).toBe('foobarbaz');
    expect(sanitizeFilterInput(null)).toBe('');
    expect(sanitizeFilterInput('x'.repeat(500)).length).toBe(200);
  });
});
