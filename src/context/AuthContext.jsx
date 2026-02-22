import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getEmployeeByEmail } from '../services/employeeService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [employee, setEmployee] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployee = async (u) => {
            if (u?.email) {
                const { data } = await getEmployeeByEmail(u.email);
                setEmployee(data);
            } else {
                setEmployee(null);
            }
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            fetchEmployee(session?.user);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            const newUser = session?.user ?? null;
            setUser(newUser);
            fetchEmployee(newUser);

            // Auto-redirect after OAuth callback (token in hash)
            if (_event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
                const role = localStorage.getItem('hrisync_role');
                window.location.replace(role === 'employee' ? '/app/home' : '/dashboard');
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
        localStorage.removeItem('hrisync_demo_user');
        setUser(null);
        setSession(null);
        return { error };
    };

    // Demo login for PWA testing (no Supabase auth needed)
    const demoLogin = () => {
        const demoUser = {
            id: 'demo-employee-001',
            email: 'ahmad.rizky@company.com',
            user_metadata: { full_name: 'Ahmad Rizky Pratama', role: 'employee' },
        };
        setUser(demoUser);
        setSession({ user: demoUser });
        localStorage.setItem('hrisync_role', 'employee');
        localStorage.setItem('hrisync_demo_user', JSON.stringify(demoUser));
    };

    // Restore demo session on reload
    useEffect(() => {
        const saved = localStorage.getItem('hrisync_demo_user');
        if (saved && !user) {
            const parsed = JSON.parse(saved);
            setUser(parsed);
            setSession({ user: parsed });
        }
    }, []);

    const value = {
        user,
        employee,
        session,
        loading,
        signInWithOtp,
        signInWithPassword,
        resetPassword,
        verifyOtp,
        signInWithGoogle,
        signUp,
        signOut,
        demoLogin,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
