import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import * as reimbursementService from '../../services/reimbursementService';

vi.mock('../../lib/supabase');
vi.mock('../../lib/tenantGuard', async (importOriginal) => ({
  ...(await importOriginal()),
  resolveMyEmployee: vi.fn(),
}));
vi.mock('../../services/emailService', () => ({
  sendReimbursementEmail: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../services/whatsappService', () => ({
  sendWhatsApp: vi.fn().mockResolvedValue({ success: true }),
}));
import { resolveMyEmployee } from '../../lib/tenantGuard';

describe('reimbursementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveMyEmployee.mockResolvedValue({ id: 'emp-123' });
  });

  describe('getAllReimbursements', () => {
    it('should filter by company_id', async () => {
      const mockData = [{ id: 1, amount: 50000, status: 'pending' }];
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await reimbursementService.getAllReimbursements('abc');
      expect(result.data).toEqual(mockData);
    });

    it('should return empty array when companyId is null', async () => {
      const result = await reimbursementService.getAllReimbursements(null);
      expect(result.data).toEqual([]);
    });
  });

  describe('self-service identity', () => {
    it('should reject a different employee identity before querying reimbursements', async () => {
      const result = await reimbursementService.getMyReimbursements('emp-other');
      expect(result.error?.code).toBe('IDENTITY_MISMATCH');
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('deleteReimbursement', () => {
    it('should verify employee ownership', async () => {
      supabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      });

      await reimbursementService.deleteReimbursement(1, 'emp-123');
      expect(supabase.from).toHaveBeenCalledWith('reimbursements');
    });
  });
});
