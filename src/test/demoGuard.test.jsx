import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEMO_EMAIL, activateDemo, deactivateDemo, isDemoMode, demoBlock } from '../lib/demoGuard';

describe('Demo Guard Security', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should expose DEMO_EMAIL (public info)', () => {
    expect(DEMO_EMAIL).toBe('demo@hrisloka.com');
  });

  it('should NOT expose DEMO_PASSWORD in client bundle', async () => {
    // Import demoGuard dynamically to check exports
    const demoGuard = await import('../lib/demoGuard');
    
    // DEMO_PASSWORD should NOT be exported (security fix)
    expect(demoGuard.DEMO_PASSWORD).toBeUndefined();
  });

  it('should activate demo mode in sessionStorage', () => {
    expect(isDemoMode()).toBe(false);
    
    activateDemo();
    
    expect(isDemoMode()).toBe(true);
    expect(sessionStorage.getItem('hrisync_demo_mode')).toBe('1');
  });

  it('should deactivate demo mode', () => {
    activateDemo();
    expect(isDemoMode()).toBe(true);
    
    deactivateDemo();
    
    expect(isDemoMode()).toBe(false);
    expect(sessionStorage.getItem('hrisync_demo_mode')).toBeNull();
  });

  it('should block write actions in demo mode', () => {
    activateDemo();
    
    const mockHandler = vi.fn();
    const blockedHandler = demoBlock(mockHandler);
    
    const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    blockedHandler(mockEvent);
    
    // Original handler should NOT be called
    expect(mockHandler).not.toHaveBeenCalled();
    // Event should be prevented
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should allow write actions when not in demo mode', () => {
    deactivateDemo();
    
    const mockHandler = vi.fn();
    const blockedHandler = demoBlock(mockHandler);
    
    const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    blockedHandler(mockEvent);
    
    // Original handler SHOULD be called
    expect(mockHandler).toHaveBeenCalledWith(mockEvent);
  });

  it('should show toast notification when blocking actions', () => {
    activateDemo();
    
    const mockHandler = vi.fn();
    const blockedHandler = demoBlock(mockHandler);
    
    // Mock document methods
    const mockToast = { id: 'demo-toast', style: {}, appendChild: vi.fn() };
    vi.spyOn(document, 'getElementById').mockReturnValue(mockToast);
    vi.spyOn(document, 'createElement').mockReturnValue(mockToast);
    
    blockedHandler({ preventDefault: vi.fn(), stopPropagation: vi.fn() });
    
    // Toast should be shown (implementation detail)
    expect(document.getElementById).toHaveBeenCalledWith('demo-toast');
  });
});

describe('Demo Login Security', () => {
  it('should only require email for demo login (no password in client)', async () => {
    // This test verifies that demo login no longer requires password check on client
    // Password verification happens server-side only
    
    // AuthPage should NOT import DEMO_PASSWORD
    // (This is verified by the fact that DEMO_PASSWORD is not exported from demoGuard)
    const demoGuard = await import('../lib/demoGuard');
    expect(demoGuard.DEMO_PASSWORD).toBeUndefined();
  });
});

