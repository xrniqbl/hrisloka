import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiUser, FiClock, FiFilter, FiAlertCircle } from 'react-icons/fi';
import { getAllUpdateRequests, approveRequest, rejectRequest } from '../services/profileUpdateService';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import '../styles/shared.css';

const fieldLabels = {
    gender: 'Jenis Kelamin',
    birth_date: 'Tanggal Lahir',
    religion: 'Agama',
    blood_type: 'Golongan Darah',
    marital_status: 'Status Pernikahan',
    ktp_address: 'Alamat KTP',
    emergency_contact: 'Kontak Darurat',
    bank_account: 'Informasi Bank',
    npwp: 'NPWP',
    bpjs_kesehatan: 'BPJS Kesehatan',
    bpjs_ketenagakerjaan: 'BPJS Ketenagakerjaan',
    education: 'Pendidikan',
    work_history: 'Riwayat Pekerjaan',
    certifications: 'Sertifikasi',
};

export default function ProfileRequests() {
    const { employee } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => { fetchRequests(); }, [filter]);

    const fetchRequests = async () => {
        setLoading(true);
        const { data } = await getAllUpdateRequests(filter || undefined);
        setRequests(data || []);
        setLoading(false);
    };

    const handleApprove = async (id) => {
        setActionLoading(id);
        await approveRequest(id, employee?.id);
        await fetchRequests();
        setActionLoading(null);
    };

    const handleReject = async (id) => {
        setActionLoading(id);
        await rejectRequest(id, employee?.id, '');
        await fetchRequests();
        setActionLoading(null);
    };

    const pending = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>Perubahan Profil Karyawan</h1>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <select
                        className="form-input"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        style={{ maxWidth: 160, padding: '8px 12px', fontSize: 13 }}
                    >
                        <option value="pending">⏳ Menunggu</option>
                        <option value="approved">✓ Disetujui</option>
                        <option value="rejected">✗ Ditolak</option>
                        <option value="">Semua</option>
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Menunggu', value: pending, color: '#F59E0B', icon: <FiClock /> },
                    { label: 'Total Request', value: requests.length, color: '#0047AB', icon: <FiUser /> },
                ].map(s => (
                    <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ color: s.color, fontSize: 20 }}>{s.icon}</span>
                            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {loading ? <TableSkeleton /> : requests.length === 0 ? (
                <EmptyState message="Tidak ada permintaan perubahan profil." />
            ) : (
                <div className="data-table-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Karyawan</th>
                                <th>Field</th>
                                <th>Nilai Baru</th>
                                <th>Tanggal</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(req => (
                                <tr key={req.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {req.employees?.photo_url ? (
                                                <img src={req.employees.photo_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                                    {req.employees?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{req.employees?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{req.employees?.nip} • {req.employees?.division}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'var(--bg)', color: 'var(--text)' }}>
                                            {req.field_label || fieldLabels[req.field_name] || req.field_name}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {req.new_value}
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                                        {new Date(req.requested_at).toLocaleDateString('id-ID')}
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                            color: req.status === 'pending' ? '#D97706' : req.status === 'approved' ? '#16A34A' : '#DC2626',
                                            background: req.status === 'pending' ? 'rgba(245,158,11,0.1)' : req.status === 'approved' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                                        }}>
                                            {req.status === 'pending' ? 'Menunggu' : req.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                                        </span>
                                    </td>
                                    <td>
                                        {req.status === 'pending' ? (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="action-btn"
                                                    title="Setujui"
                                                    disabled={actionLoading === req.id}
                                                    onClick={() => handleApprove(req.id)}
                                                    style={{ color: '#16A34A' }}
                                                >
                                                    <FiCheck />
                                                </button>
                                                <button
                                                    className="action-btn"
                                                    title="Tolak"
                                                    disabled={actionLoading === req.id}
                                                    onClick={() => handleReject(req.id)}
                                                    style={{ color: '#DC2626' }}
                                                >
                                                    <FiX />
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
