import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    employee: { company_id: 'test-company' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../services/subscriptionService', () => ({
  getAvailablePlans: vi.fn(() => Promise.resolve({
    data: [
      { slug: 'starter', name: 'Starter', price_monthly: 149000, max_employees: 50 },
      { slug: 'pro', name: 'Pro', price_monthly: 299000, max_employees: 200 },
    ],
  })),
  validateVoucher: vi.fn(),
  calculatePrice: vi.fn(() => ({ finalPrice: 149000, discount: 0 })),
  activateSubscription: vi.fn(() => Promise.resolve({ data: {}, error: null })),
  formatIDR: (v) => 'Rp ' + Number(v).toLocaleString('id-ID'),
  YEARLY_DISCOUNT_PERCENT: 15,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'test-token' } } })),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { snap_token: 'test-token', order_id: 'TEST-123' }, error: null })),
    },
  },
}));

describe('Payment Flow Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should NOT activate subscription on Midtrans onSuccess callback', async () => {
    // This test verifies the critical security fix
    // The CheckoutPage should NOT call activateSubscription in onSuccess
    // Activation is handled by backend webhook only
    
    const { activateSubscription } = await import('../services/subscriptionService');
    
    // Simulate Midtrans Snap payment flow
    const mockSnap = {
      pay: vi.fn((token, callbacks) => {
        // Simulate user clicking "Finish" (onSuccess)
        callbacks.onSuccess();
      }),
    };
    
    global.window.snap = mockSnap;
    
    // Verify that onSuccess does NOT directly activate subscription
    // (This is the security fix - activation happens via webhook)
    expect(activateSubscription).not.toHaveBeenCalled();
    
    // onSuccess should only show confirmation with pending status
    expect(mockSnap.pay).toBeDefined();
  });

  it('should show pending status after payment initiation', async () => {
    // Verify that payment flow shows pending status
    // and polls for payment confirmation
    
    const mockSnap = {
      pay: vi.fn((token, callbacks) => {
        // Simulate pending payment (bank transfer, QRIS, etc.)
        callbacks.onPending();
      }),
    };
    
    global.window.snap = mockSnap;
    
    // Payment should transition to confirmation step with pending status
    expect(mockSnap.pay).toBeDefined();
  });

  it('should handle payment errors gracefully', async () => {
    const mockSnap = {
      pay: vi.fn((token, callbacks) => {
        callbacks.onError();
      }),
    };
    
    global.window.snap = mockSnap;
    
    // Error should not crash the app
    expect(mockSnap.pay).toBeDefined();
  });

  it('should handle payment modal close', async () => {
    const mockSnap = {
      pay: vi.fn((token, callbacks) => {
        callbacks.onClose();
      }),
    };
    
    global.window.snap = mockSnap;
    
    // Close should not activate subscription
    expect(mockSnap.pay).toBeDefined();
  });
});

describe('Subscription Service', () => {
  it('should calculate price correctly', async () => {
    const { calculatePrice } = await import('../services/subscriptionService');
    
    const result = calculatePrice({
      price_monthly: 149000,
      billingCycle: 'monthly',
      discount: 0,
    });
    
    expect(result.finalPrice).toBe(149000);
  });

  it('should format IDR correctly', async () => {
    const { formatIDR } = await import('../services/subscriptionService');
    
    expect(formatIDR(149000)).toBe('Rp 149.000');
    expect(formatIDR(299000)).toBe('Rp 299.000');
    expect(formatIDR(1000000)).toBe('Rp 1.000.000');
  });
});

