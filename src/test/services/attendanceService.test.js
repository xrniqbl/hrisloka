import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import * as attendanceService from '../../services/attendanceService';

vi.mock('../../lib/supabase');
vi.mock('../../lib/tenantGuard', async (importOriginal) => ({
  ...(await importOriginal()),
  resolveMyEmployee: vi.fn(),
}));
import { resolveMyEmployee } from '../../lib/tenantGuard';

describe('attendanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveMyEmployee.mockResolvedValue({ id: 'emp-1' });
  });

  describe('getAttendanceByDate', () => {
    it('should filter by company_id via employees join', async () => {
      const mockData = [{ id: 1, employee_id: 10, clock_in: '08:00' }];
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await attendanceService.getAttendanceByDate('2026-07-06', null, 'company-123');
      expect(result.data).toEqual(mockData);
    });

    it('should return empty array when guardCompanyId fails', async () => {
      const result = await attendanceService.getAttendanceByDate('2026-07-06', null, null);
      expect(result.data).toEqual([]);
    });
  });

  describe('getOfficeLocations', () => {
    it('should filter by company_id', async () => {
      const mockData = [{ id: 1, name: 'HQ', company_id: 'abc' }];
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await attendanceService.getOfficeLocations('abc');
      expect(result.data).toEqual(mockData);
    });

    it('should return empty when company_id missing', async () => {
      const result = await attendanceService.getOfficeLocations(null);
      expect(result.data).toEqual([]);
    });
  });

  describe('clockIn', () => {
    it('should reject when employeeId missing', async () => {
      const result = await attendanceService.clockIn(null, { latitude: 1, longitude: 1 });
      expect(result.error?.message).toMatch(/employeeId/i);
    });

    it('should reject a different employee identity before querying attendance', async () => {
      const result = await attendanceService.clockIn('emp-other', { latitude: -6.2, longitude: 106.8 });
      expect(result.error?.code).toBe('IDENTITY_MISMATCH');
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should block duplicate open clock-in', async () => {
      const existing = { id: 'a1', clock_in: '08:00', clock_out: null };
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
      };
      supabase.from.mockReturnValue(chain);

      const result = await attendanceService.clockIn('emp-1', { latitude: -6.2, longitude: 106.8 });
      expect(result.error?.message).toMatch(/Sudah clock-in/i);
      expect(result.data).toEqual(existing);
    });
  });

  describe('hasRegisteredFace', () => {
    it('should return false without employeeId', async () => {
      const result = await attendanceService.hasRegisteredFace(null);
      expect(result.hasface).toBe(false);
    });
  });
});
