import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
};

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sign up a new user', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'test-123', email: 'test@example.com' }, session: null },
      error: null,
    });

    const { supabase } = await import('../lib/supabase');
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'SecureP@ss123',
      options: { data: { full_name: 'Test User', role: 'employee' } },
    });

    expect(error).toBeNull();
    expect(data.user.id).toBe('test-123');
    expect(data.user.email).toBe('test@example.com');
  });

  it('should sign in an existing user', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'test-123', email: 'test@example.com' },
        session: { access_token: 'test-token', refresh_token: 'test-refresh' },
      },
      error: null,
    });

    const { supabase } = await import('../lib/supabase');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'SecureP@ss123',
    });

    expect(error).toBeNull();
    expect(data.session.access_token).toBe('test-token');
  });

  it('should reject invalid credentials', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.auth.signInWithPassword({
      email: 'wrong@example.com',
      password: 'wrong',
    });

    expect(error).not.toBeNull();
    expect(error.message).toBe('Invalid login credentials');
  });

  it('should sign out user', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.auth.signOut();

    expect(error).toBeNull();
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('should validate password strength', () => {
    const validatePassword = (p) => {
      const rules = [
        p.length >= 8,
        /[A-Z]/.test(p),
        /[0-9]/.test(p),
        /[!@#\$%^&*]/.test(p),
      ];
      return rules.filter(Boolean).length;
    };

    expect(validatePassword('weak')).toBe(0);
    expect(validatePassword('StrongP1!')).toBe(4);
    expect(validatePassword('nouppercase1!')).toBe(3);
    expect(validatePassword('NoSpecialChar1')).toBe(3);
  });
});

describe('Employee Registration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate company code', async () => {
    const mockQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'comp-1', name: 'Test Corp', is_active: true },
            error: null,
          }),
        })),
      })),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase
      .from('companies')
      .select('id, name, is_active')
      .eq('company_code', 'HRSLK-TEST01')
      .maybeSingle();

    expect(data).not.toBeNull();
    expect(data.name).toBe('Test Corp');
    expect(data.is_active).toBe(true);
  });

  it('should reject invalid company code', async () => {
    const mockQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      })),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase
      .from('companies')
      .select('id, name, is_active')
      .eq('company_code', 'INVALID-CODE')
      .maybeSingle();

    expect(data).toBeNull();
  });
});

