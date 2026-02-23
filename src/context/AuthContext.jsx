import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getEmployeeByEmail } from '../services/employeeService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Detect if running as installed PWA (standalone mode)
const getIsPWA = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [employee, setEmployee] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPWA] = useState(getIsPWA);

    useEffect(() => {
        const fetchEmployee = async (u) => {
            if (u?.email) {
                const { data } = await getEmployeeByEmail(u.email);
                setEmployee(data);
            } else {
                setEmployee(null);
            }
        };

        supabase.auth.getSession().then(({ data: { session: s } }) => {
            // Desktop: check 12-hour session expiry
            if (s && !getIsPWA()) {
                const loginTime = localStorage.getItem('hrisync_login_time');
                if (loginTime && Date.now() - parseInt(loginTime) > 12 * 60 * 60 * 1000) {
                    // Session expired on desktop — sign out
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

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            const newUser = session?.user ?? null;
            setUser(newUser);
            fetchEmployee(newUser);

            // Record login time for desktop session expiry
            if (_event === 'SIGNED_IN') {
                localStorage.setItem('hrisync_login_time', Date.now().toString());
            }

            // Auto-redirect after OAuth callback (token in hash)
            if (_event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
                window.location.replace(getIsPWA() ? '/app/home' : '/dashboard');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

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
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
        });
        return { data, error };
    };

    const signInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard',
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
        return { data, error };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        localStorage.removeItem('hrisync_role');
        localStorage.removeItem('hrisync_login_time');
        setUser(null);
        setSession(null);
        setEmployee(null);
        return { error };
    };

    const value = {
        user,
        employee,
        session,
        loading,
        isPWA,
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
