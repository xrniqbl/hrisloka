// @refresh reset
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getEmployeeByEmail } from '../services/employeeService';
import { trackEvent } from '../services/founderService';
import { isDemoMode, deactivateDemo } from '../lib/demoGuard';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Detect if running as installed PWA (standalone mode)
const getIsPWA = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  navigator.standalone === true;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPWA] = useState(getIsPWA);
  const [hasOnboarding, setHasOnboarding] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(isDemoMode);

  // ── Check onboarding completion ──────────────────────────────────────────
  const checkOnboarding = useCallback(async (userId) => {
    if (!userId) { setHasOnboarding(false); setOnboardingLoading(false); return false; }
    try {
      const { data } = await supabase
        .from('onboarding_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      const done = !!data;
      setHasOnboarding(done);
      setOnboardingLoading(false);
      return done;
    } catch {
      setHasOnboarding(false);
      setOnboardingLoading(false);
      return false;
    }
  }, []);

  // ── Fetch subscription record ────────────────────────────────────────────
  const fetchSubscription = useCallback(async (userId) => {
    if (!userId) { setSubscription(null); return null; }
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setSubscription(data ?? null);
      return data ?? null;
    } catch {
      // Table may not exist yet — treat as no subscription
      setSubscription(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // ── Fetch employee record robustly ──────────────────────────────────────
    const fetchEmployee = async (u) => {
      if (!u?.email) {
        setEmployee(null);
        setSubscription(null);
        return null;
      }
      try {
        // Primary: look up by email
        const { data, error } = await getEmployeeByEmail(u.email);

        // 406 = RLS blocked or no row → no employee record for this account
        if (error && error.status !== 406) {
          console.warn('[AuthContext] employee fetch warning:', error.message);
        }

        if (data) {
          setEmployee(data);
          fetchSubscription(u.id);
          checkOnboarding(u.id);
          return data;
        }

        // Fallback: look up by auth_user_id (founder / admin accounts)
        try {
          const { data: byId } = await supabase
            .from('employees')
            .select('*')
            .eq('auth_user_id', u.id)
            .maybeSingle();
          setEmployee(byId ?? null);
          fetchSubscription(u.id);
          checkOnboarding(u.id);
          return byId ?? null;
        } catch {
          setEmployee(null);
          return null;
        }
      } catch (err) {
        console.warn('[AuthContext] fetchEmployee exception:', err?.message);
        setEmployee(null);
        return null;
      }
    };

    // ── Session init ────────────────────────────────────────────────────────
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      // Desktop: check 12-hour session expiry
      if (s && !getIsPWA()) {
        const loginTime = localStorage.getItem('hrisync_login_time');
        if (loginTime && Date.now() - parseInt(loginTime) > 12 * 60 * 60 * 1000) {
          supabase.auth.signOut();
          localStorage.removeItem('hrisync_login_time');
          localStorage.removeItem('hrisync_role');
          setLoading(false);
          return;
        }
      }
      setSession(s);
      setUser(s?.user ?? null);
      fetchEmployee(s?.user);
      setLoading(false);
    });

    // ── Auth state changes ──────────────────────────────────────────────────
    // NOTE: renamed to authListener to avoid shadowing the 'subscription' state var
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      const newUser = s?.user ?? null;
      setUser(newUser);
      fetchEmployee(newUser);

      if (_event === 'SIGNED_IN') {
        localStorage.setItem('hrisync_login_time', Date.now().toString());
        trackEvent('login', {
          path: window.location.pathname,
          deviceType: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
          sessionId: s?.access_token?.slice(-8) || null,
        });
      }
      if (_event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
        // Google OAuth callback — CRITICAL: gate access based on registration status
        const savedPath = localStorage.getItem('hrisync_last_path');
        const safeSavedPath = (savedPath && !savedPath.startsWith('/login') && !savedPath.startsWith('/register') && !savedPath.startsWith('/not-registered') && !savedPath.startsWith('/checkout')) ? savedPath : null;
        (async () => {
          try {
            const userEmail = s?.user?.email?.toLowerCase();
            const userId    = s?.user?.id;
            const isPwa     = getIsPWA();

            // ── STEP 1: Platform founder shortcut ──────────────────────────
            if (userEmail === 'hrisloka@gmail.com') {
              window.location.replace('/founder/dashboard');
              return;
            }

            // ── STEP 2: Look up employee record (by email then by user id) ─
            let resolvedEmp = null;
            const { data: empByEmail } = await supabase
              .from('employees')
              .select('role, auth_user_id')
              .eq('email', userEmail)
              .maybeSingle();
            resolvedEmp = empByEmail;

            if (!resolvedEmp && userId) {
              const { data: empById } = await supabase
                .from('employees')
                .select('role, auth_user_id')
                .eq('auth_user_id', userId)
                .maybeSingle();
              resolvedEmp = empById;
            }

            // ── STEP 3: Registered employee/admin — route by role ──────────
            if (resolvedEmp) {
              const empRole = resolvedEmp.role || 'employee';
              if (empRole === 'employee' && !isPwa) {
                // Employee must use PWA, not desktop browser
                window.location.replace('/employee-web-access');
              } else {
                const defaultDest = isPwa ? '/app/home' : '/dashboard';
                window.location.replace(safeSavedPath || defaultDest);
              }
              return;
            }

            // ── STEP 4: No employee record — check if already onboarded ────
            // If they have an onboarding_profiles row, they already registered
            // a company but their email isn't in the employees table.
            // → Block with "not registered" screen.
            // If they have NO onboarding profile, they are truly new (first
            // Google sign-up) → send to /checkout just like email signup.
            const { data: onboarding } = await supabase
              .from('onboarding_profiles')
              .select('id')
              .eq('user_id', userId)
              .maybeSingle();

            if (onboarding) {
              // Already completed onboarding but no employee record → blocked
              window.location.replace('/not-registered');
            } else {
              // Truly new Google user — send to checkout/onboarding
              window.location.replace('/checkout');
            }
          } catch {
            // On unexpected error, send to checkout (safer than blocking)
            window.location.replace('/checkout');
          }
        })();
      }
    });

    return () => authListener.unsubscribe();
  }, []);

  // ── Exposed: force-refresh employee data after profile edits ──────────────
  const refreshEmployee = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u?.email) return null;
    try {
      const { data } = await getEmployeeByEmail(u.email);
      if (data) { setEmployee(data); return data; }
      const { data: byId } = await supabase
        .from('employees').select('*').eq('auth_user_id', u.id).maybeSingle();
      setEmployee(byId ?? null);
      return byId ?? null;
    } catch {
      return null;
    }
  };

  const signInWithOtp = async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({ email });
    return { data, error };
  };

  const signInWithPassword = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    });
    return { data, error };
  };

  const verifyOtp = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    return { data, error };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + (localStorage.getItem('hrisync_last_path') || '/dashboard'),
      },
    });
    return { data, error };
  };

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    // Analytics: track signup event
    if (!error) {
      trackEvent('signup', { path: window.location.pathname }).catch(() => {});
    }
    return { data, error };
  };

  const signOut = async () => {
    trackEvent('logout', { path: window.location.pathname }).catch(() => {});
    // Clear demo mode if active
    deactivateDemo();
    setIsDemo(false);
    const { error } = await supabase.auth.signOut();
    // Clear all localStorage session keys including grace period bypass
    localStorage.removeItem('hrisync_role');
    localStorage.removeItem('hrisync_login_time');
    localStorage.removeItem('hrisync_last_path');
    localStorage.removeItem('hrisync_sub_grace');
    setUser(null);
    setSession(null);
    setEmployee(null);
    setSubscription(null);
    setHasOnboarding(false);
    setOnboardingLoading(false);
    return { error };
  };

  const value = {
    user,
    employee,
    subscription,
    session,
    loading,
    isPWA,
    hasOnboarding,
    onboardingLoading,
    isDemo,
    setIsDemo,
    refreshEmployee,
    refreshOnboarding: () => checkOnboarding(user?.id),
    fetchSubscription,
    signInWithOtp,
    signInWithPassword,
    resetPassword,
    verifyOtp,
    signInWithGoogle,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
