import { useState, useEffect } from 'react';
import { FiBell, FiLoader, FiClock } from 'react-icons/fi';
import { supabase } from '../../lib/supabase';
import { subscribeToAnnouncements } from '../../services/broadcastService';

export default function EmpAnnouncements() {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error) setAnnouncements(data || []);
            setLoading(false);
        }
        load();

        // Subscribe to realtime new announcements
        const channel = subscribeToAnnouncements((payload) => {
            setAnnouncements(prev => [{ ...payload, id: Date.now(), created_at: new Date().toISOString() }, ...prev]);
        });

        return () => { supabase.removeChannel(channel); };
    }, []);

    const formatDate = (d) => {
        const date = new Date(d);
        const now = new Date();
        const diff = now - date;
        if (diff < 60000) return 'Baru saja';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
                <FiLoader size={28} style={{ animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>Memuat pengumuman...</span>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>📢 Pengumuman</h1>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Informasi terbaru dari perusahaan</p>
            </div>

            {announcements.length === 0 ? (
                <div className="emp-card" style={{ textAlign: 'center', padding: 40 }}>
                    <FiBell size={32} style={{ color: 'var(--muted)', marginBottom: 10 }} />
                    <div style={{ color: 'var(--muted)', fontSize: 14 }}>Belum ada pengumuman</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                    {announcements.map((a, i) => (
                        <div key={a.id || i} className="emp-card" style={{ position: 'relative', overflow: 'hidden' }}>
                            {i === 0 && (
                                <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--primary)', color: '#fff', padding: '3px 10px', borderRadius: '0 0 0 var(--radius-sm)', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>BARU</div>
                            )}
                            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, paddingRight: i === 0 ? 50 : 0 }}>{a.title}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{a.message}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                                <FiClock size={12} />
                                {formatDate(a.created_at)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
