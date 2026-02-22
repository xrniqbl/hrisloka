import { useState, useEffect } from 'react';
import { FiSearch, FiPhone, FiMail, FiUser, FiArrowLeft, FiLoader } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { getAllEmployees } from '../../services/employeeService';
import '../../styles/shared.css';

export default function CompanyDirectory() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        async function load() {
            const { data } = await getAllEmployees();
            setEmployees(data || []);
            setLoading(false);
        }
        load();
    }, []);

    const filtered = employees.filter(emp =>
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.division.toLowerCase().includes(search.toLowerCase()) ||
        emp.position.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
                <FiLoader size={28} className="absen-spinner" style={{ animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>Memuat data...</span>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text)' }}>
                    <FiArrowLeft />
                </button>
                <h1 style={{ fontSize: 20, fontWeight: 800 }}>Buku Kontak</h1>
            </div>

            <div style={{ position: 'relative', marginBottom: 20 }}>
                <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                    type="text"
                    placeholder="Cari nama, divisi, atau jabatan..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14 }}
                />
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
                {filtered.map(emp => (
                    <div key={emp.id} className="emp-card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--primary)', border: '2px solid var(--border)' }}>
                            {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{emp.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{emp.position}</div>
                            <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>{emp.division}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <a href={`tel:${emp.phone}`} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F0FDF4', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FiPhone size={14} />
                            </a>
                            <a href={`mailto:${emp.email}`} style={{ width: 32, height: 32, borderRadius: '50%', background: '#EFF6FF', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FiMail size={14} />
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    Tidak ada karyawan yang ditemukan.
                </div>
            )}
        </div>
    );
}
