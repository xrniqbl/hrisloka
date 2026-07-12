import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import * as employeeService from '../../services/employeeService';

vi.mock('../../lib/supabase');

describe('employeeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllEmployees', () => {
    it('should filter by company_id', async () => {
      const mockData = [{ id: 1, name: 'Test', company_id: 'abc' }];
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await employeeService.getAllEmployees(undefined, 'abc');
      expect(result.data).toEqual(mockData);
      expect(supabase.from).toHaveBeenCalledWith('employees');
    });

    it('should return empty array when guardCompanyId fails', async () => {
      const result = await employeeService.getAllEmployees(undefined, null);
      expect(result.data).toEqual([]);
    });
  });
});
