// @refresh reset
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../lib/safeStorage';
import { getEmployeeByEmail } from '../services/employeeService';
import { trackEvent } from '../services/founderService';
import { isDemoMode, deactivateDemo, DEMO_USER, DEMO_EMPLOYEE } from '../lib/demoGuard';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Detect if running as installed PWA (standalone mode)
const getIsPWA = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  navigator.standalone === true;

function applyDemoSession(setUser, setEmployee, setSession, setIsDemo, setLoading, setHasOnboarding, setOnboardingLoading) {
  setIsDemo(true);
  setUser(DEMO_USER);
  setEmployee(DEMO_EMPLOYEE);
  setSession(null);
  setHasOnboarding(true);
  setOnboardingLoading(false);
  setLoading(false);
}

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

      if (!data) {
        setSubscription(null);
        return null;
      }

      // Enrich for guards: treat near-expiry as still active if status=active
      const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : null;
      const now = Date.now();
      const stillValid = data.status === 'active' && (!expiresAt || expiresAt > now);
      const enriched = {
        ...data,
        is_active: stillValid || data.status === 'trial',
        computed_status: stillValid ? 'active' : (data.status === 'active' ? 'expired' : data.status),
      };
      setSubscription(enriched);
      return enriched;
    } catch {
      // Table may not exist yet — treat as no subscription
      setSubscription(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Monotonic token so overlapping auth events never apply stale profile state
    let resolveGen = 0;

    /**
     * Resolve employee + subscription + onboarding before any guard reads them.
     * Never leave subscription/onboarding fire-and-forget — that caused checkout flash.
     */
    const loadProfile = async (u) => {
      if (!u?.id && !u?.email) {
        if (!cancelled) {
          setEmployee(null);
          setSubscription(null);
          setHasOnboarding(false);
          setOnboardingLoading(false);
        }
        return null;
      }
      try {
        let data = null;
        let error = null;

        if (u.email) {
          const res = await getEmployeeByEmail(u.email);
          data = res.data;
          error = res.error;
          // 406 = RLS blocked or no row → no employee for this account
          if (error && error.status !== 406) {
            console.warn('[AuthContext] employee fetch warning:', error.message);
          }
        }

        // Fallback: auth_user_id (founder / admin linked by id)
        if (!data && u.id) {
          const { data: byId } = await supabase
            .from('employees')
            .select('*')
            .eq('auth_user_id', u.id)
            .maybeSingle();
          data = byId ?? null;
        }

        if (cancelled) return data;

        setEmployee(data ?? null);
        // Await both so SubscriptionGuard never sees employee without subscription/onboarding
        await Promise.all([
          fetchSubscription(u.id),
          checkOnboarding(u.id),
        ]);
        return data ?? null;
      } catch (err) {
        console.warn('[AuthContext] loadProfile exception:', err?.message);
        if (!cancelled) {
          setEmployee(null);
          setSubscription(null);
          setHasOnboarding(false);
          setOnboardingLoading(false);
        }
        return null;
      }
    };

    const clearSessionState = () => {
      setSession(null);
      setUser(null);
      setEmployee(null);
      setSubscription(null);
      setHasOnboarding(false);
      setOnboardingLoading(false);
    };

    const applySession = async (s, { showLoading = false } = {}) => {
      const gen = ++resolveGen;
      if (showLoading && !cancelled) setLoading(true);

      try {
        if (isDemoMode()) {
          applyDemoSession(setUser, setEmployee, setSession, setIsDemo, setLoading, setHasOnboarding, setOnboardingLoading);
          return;
        }

        // Desktop: 12-hour session expiry
        if (s && !getIsPWA()) {
          const loginTime = safeGetItem('hrisync_login_time');
          if (loginTime && Date.now() - parseInt(loginTime, 10) > 12 * 60 * 60 * 1000) {
            await supabase.auth.signOut();
            safeRemoveItem('hrisync_login_time');
            safeRemoveItem('hrisync_role');
            if (!cancelled && gen === resolveGen) clearSessionState();
            return;
          }
        }

        if (cancelled || gen !== resolveGen) return;

        setSession(s);
        const newUser = s?.user ?? null;
        setUser(newUser);

        if (!newUser) {
          setEmployee(null);
          setSubscription(null);
          setHasOnboarding(false);
          setOnboardingLoading(false);
          return;
        }

        await loadProfile(newUser);
      } finally {
        if (!cancelled && gen === resolveGen) setLoading(false);
      }
    };

    // ── Session init ────────────────────────────────────────────────────────
    if (isDemoMode()) {
      applyDemoSession(setUser, setEmployee, setSession, setIsDemo, setLoading, setHasOnboarding, setOnboardingLoading);
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      applySession(s, { showLoading: false });
    });

    // ── Auth state changes ──────────────────────────────────────────────────
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event, s) => {
      // Never overwrite demo session with a null Supabase session
      if (isDemoMode()) {
        applyDemoSession(setUser, setEmployee, setSession, setIsDemo, setLoading, setHasOnboarding, setOnboardingLoading);
        return;
      }

      // Token refresh: keep existing employee/subscription; only refresh session object
      if (_event === 'TOKEN_REFRESHED') {
        setSession(s);
        return;
      }

      // INITIAL_SESSION is handled by getSession() bootstrap — avoid double-resolve race
      if (_event === 'INITIAL_SESSION') {
        return;
      }

      if (_event === 'SIGNED_OUT' || !s) {
        clearSessionState();
        setLoading(false);
        return;
      }

      // SIGNED_IN / USER_UPDATED — block guards until profile is ready
      (async () => {
        await applySession(s, { showLoading: true });

        if (_event === 'SIGNED_IN') {
          safeSetItem('hrisync_login_time', Date.now().toString());
          trackEvent('login', {
            path: window.location.pathname,
            deviceType: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
            sessionId: s?.access_token?.slice(-8) || null,
          });
        }

        // Google OAuth callback — route only after profile is loaded
        if (_event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
          const savedPath = safeGetItem('hrisync_last_path');
          const safeSavedPath = (
            savedPath
            && !savedPath.startsWith('/login')
            && !savedPath.startsWith('/register')
            && !savedPath.startsWith('/not-registered')
            && !savedPath.startsWith('/checkout')
          ) ? savedPath : null;

          try {
            const userEmail = s?.user?.email?.toLowerCase();
            const userId = s?.user?.id;
            const isPwa = getIsPWA();

            const founderEmail = (import.meta.env.VITE_FOUNDER_EMAIL || '').toLowerCase();
            if (founderEmail && userEmail === founderEmail) {
              window.location.replace('/founder/dashboard');
              return;
            }

            // Re-read employee from state path: loadProfile already ran; re-query for routing fields
            let resolvedEmp = null;
            if (userEmail) {
              const { data: empByEmail } = await supabase
                .from('employees')
                .select('role, auth_user_id, account_status, company_id')
                .eq('email', userEmail)
                .maybeSingle();
              resolvedEmp = empByEmail;
            }
            if (!resolvedEmp && userId) {
              const { data: empById } = await supabase
                .from('employees')
                .select('role, auth_user_id, account_status, company_id')
                .eq('auth_user_id', userId)
                .maybeSingle();
              resolvedEmp = empById;
            }

            if (resolvedEmp) {
              const status = resolvedEmp.account_status;
              if (status === 'pending_verification' || (status && String(status).includes('pending'))) {
                window.location.replace('/app/pending');
                return;
              }
              if (status === 'rejected') {
                window.location.replace('/app/rejected');
                return;
              }
              const empRole = resolvedEmp.role || 'employee';
              if (empRole === 'employee' && !isPwa) {
                window.location.replace('/employee-web-access');
              } else {
                const defaultDest = isPwa || empRole === 'employee' ? '/app/home' : '/dashboard';
                window.location.replace(safeSavedPath || defaultDest);
              }
              return;
            }

            const { data: onboarding } = await supabase
              .from('onboarding_profiles')
              .select('id')
              .eq('user_id', userId)
              .maybeSingle();

            if (onboarding) {
              window.location.replace('/not-registered');
            } else {
              window.location.replace('/checkout');
            }
          } catch {
            window.location.replace('/checkout');
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      authListener.unsubscribe();
    };
  }, [fetchSubscription, checkOnboarding]);

  // ── Exposed: force-refresh employee data after profile edits ──────────────
  const refreshEmployee = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u?.id && !u?.email) return null;
    try {
      let data = null;
      if (u.email) {
        const res = await getEmployeeByEmail(u.email);
        data = res.data;
      }
      if (!data && u.id) {
        const { data: byId } = await supabase
          .from('employees').select('*').eq('auth_user_id', u.id).maybeSingle();
        data = byId ?? null;
      }
      setEmployee(data);
      if (u.id) {
        await Promise.all([fetchSubscription(u.id), checkOnboarding(u.id)]);
      }
      return data;
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
        redirectTo: window.location.origin + (safeGetItem('hrisync_last_path') || '/dashboard'),
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
    const wasDemo = isDemoMode();
    // Clear demo mode if active
    deactivateDemo();
    setIsDemo(false);
    let error = null;
    if (!wasDemo) {
      ({ error } = await supabase.auth.signOut());
    }
    // Clear all localStorage session keys including grace period bypass
    safeRemoveItem('hrisync_role');
    safeRemoveItem('hrisync_login_time');
    safeRemoveItem('hrisync_last_path');
    safeRemoveItem('hrisync_sub_grace');
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
