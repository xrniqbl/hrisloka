import { useState, useEffect } from 'react';
import { FiUser, FiLock, FiGlobe, FiBell, FiMapPin, FiMoon, FiSun, FiSave, FiCheck, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import '../styles/shared.css';

const tabs = [
    { key: 'account', label: 'Profil Akun', icon: <FiUser /> },
    { key: 'security', label: 'Keamanan', icon: <FiLock /> },
    { key: 'company', label: 'Perusahaan', icon: <FiGlobe /> },
    { key: 'notifications', label: 'Notifikasi', icon: <FiBell /> },
    { key: 'appearance', label: 'Tampilan', icon: <FiMoon /> },
];

export default function Settings() {
    const { employee, user } = useAuth();
    const [activeTab, setActiveTab] = useState('account');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Account form
    const [accountForm, setAccountForm] = useState({
        name: '',
        email: '',
        phone: '',
        position: '',
    });

    // Company form
    const [companyForm, setCompanyForm] = useState({
        name: 'PT HRISync Indonesia',
        address: 'Jl. Sudirman No. 123, Jakarta Selatan',
        phone: '(021) 555-0123',
        website: 'hrisync.id',
    });

    // Notification toggles
    const [notifications, setNotifications] = useState({
        emailLeave: true,
        emailPayroll: true,
        emailReimbursement: true,
        pushAttendance: true,
        pushApproval: true,
        pushAnnouncement: true,
    });

    // Security form
    const [securityForm, setSecurityForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Theme
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        if (employee) {
            setAccountForm({
                name: employee.name || '',
                email: employee.email || user?.email || '',
                phone: employee.phone || '',
                position: employee.position || '',
            });
        }
    }, [employee, user]);

    const showSaved = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleSaveAccount = async () => {
        if (!employee) return;
        setSaving(true);
        await supabase
            .from('employees')
            .update({ name: accountForm.name, phone: accountForm.phone, position: accountForm.position })
            .eq('id', employee.id);
        setSaving(false);
        showSaved();
    };

    const handleChangePassword = async () => {
        if (securityForm.newPassword !== securityForm.confirmPassword) {
            alert('Password baru tidak cocok!');
            return;
        }
        if (securityForm.newPassword.length < 6) {
            alert('Password minimal 6 karakter.');
            return;
        }
        setSaving(true);
        const { error } = await supabase.auth.updateUser({ password: securityForm.newPassword });
        setSaving(false);
        if (error) {
            alert('Gagal mengubah password: ' + error.message);
        } else {
            setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showSaved();
        }
    };

    const cardStyle = {
        background: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        padding: 24,
        boxShadow: 'var(--shadow-sm)',
    };

    const labelStyle = { fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6, display: 'block' };
    const descStyle = { fontSize: 12, color: 'var(--muted)', marginBottom: 4 };

    return (
        <div>
            <div className="page-header">
                <h1>Settings</h1>
                {saved && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16A34A', fontWeight: 600, fontSize: 14 }}>
                        <FiCheck /> Tersimpan!
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                            borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                            background: activeTab === tab.key ? 'var(--primary)' : 'var(--surface)',
                            color: activeTab === tab.key ? '#fff' : 'var(--text)',
                            boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Account Tab */}
            {activeTab === 'account' && (
                <div style={cardStyle}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Informasi Akun</h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                        <div className="employee-avatar" style={{ width: 64, height: 64, fontSize: 22 }}>
                            {accountForm.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 18 }}>{accountForm.name}</div>
                            <div style={{ color: 'var(--muted)', fontSize: 13 }}>{accountForm.email}</div>
                            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{employee?.role?.toUpperCase() || 'EMPLOYEE'}</div>
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Nama Lengkap</label>
                            <input className="form-input" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-input" value={accountForm.email} disabled style={{ opacity: 0.6 }} />
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Email tidak dapat diubah dari sini.</div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">No. Telepon</label>
                            <input className="form-input" value={accountForm.phone} onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} placeholder="08xxx" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Jabatan</label>
                            <input className="form-input" value={accountForm.position} onChange={e => setAccountForm({ ...accountForm, position: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" onClick={handleSaveAccount} disabled={saving}>
                            <FiSave /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div style={cardStyle}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}><FiShield style={{ marginRight: 8 }} /> Keamanan Akun</h3>

                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label className="form-label">Password Baru</label>
                            <input
                                type="password"
                                className="form-input"
                                value={securityForm.newPassword}
                                onChange={e => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                                placeholder="Minimal 6 karakter"
                            />
                        </div>
                        <div className="form-group full-width">
                            <label className="form-label">Konfirmasi Password Baru</label>
                            <input
                                type="password"
                                className="form-input"
                                value={securityForm.confirmPassword}
                                onChange={e => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                                placeholder="Ketik ulang password baru"
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" onClick={handleChangePassword} disabled={saving || !securityForm.newPassword}>
                            <FiLock /> {saving ? 'Menyimpan...' : 'Ubah Password'}
                        </button>
                    </div>

                    <div style={{ marginTop: 32, padding: 20, background: '#FEFCE8', borderRadius: 'var(--radius-md)', border: '1px solid #FDE68A' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#92400E', marginBottom: 4 }}>Session Aktif</div>
                        <div style={{ fontSize: 12, color: '#78350F' }}>
                            Login terakhir: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            )}

            {/* Company Tab */}
            {activeTab === 'company' && (
                <div style={cardStyle}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Informasi Perusahaan</h3>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Nama Perusahaan</label>
                            <input className="form-input" value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Website</label>
                            <input className="form-input" value={companyForm.website} onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })} />
                        </div>
                        <div className="form-group full-width">
                            <label className="form-label">Alamat</label>
                            <input className="form-input" value={companyForm.address} onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telepon Kantor</label>
                            <input className="form-input" value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" onClick={showSaved}>
                            <FiSave /> Simpan
                        </button>
                    </div>
                </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
                <div style={{ display: 'grid', gap: 20 }}>
                    <div style={cardStyle}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Email Notifikasi</h3>
                        {[
                            { key: 'emailLeave', label: 'Pengajuan Cuti', desc: 'Dapat email saat ada pengajuan cuti baru' },
                            { key: 'emailPayroll', label: 'Payroll', desc: 'Dapat email saat slip gaji terbit' },
                            { key: 'emailReimbursement', label: 'Reimbursement', desc: 'Dapat email saat reimburse disetujui/ditolak' },
                        ].map(item => (
                            <div key={item.key} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 0', borderBottom: '1px solid var(--border)',
                            }}>
                                <div>
                                    <div style={labelStyle}>{item.label}</div>
                                    <div style={descStyle}>{item.desc}</div>
                                </div>
                                <label style={{ position: 'relative', width: 44, height: 24, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={notifications[item.key]}
                                        onChange={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        width: 44, height: 24, borderRadius: 12,
                                        background: notifications[item.key] ? 'var(--primary)' : '#D1D5DB',
                                        transition: 'background 0.2s ease',
                                    }}>
                                        <div style={{
                                            width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                            position: 'absolute', top: 3,
                                            left: notifications[item.key] ? 23 : 3,
                                            transition: 'left 0.2s ease',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }} />
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>

                    <div style={cardStyle}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Push Notifikasi</h3>
                        {[
                            { key: 'pushAttendance', label: 'Absensi', desc: 'Dapat notifikasi reminder clock-in' },
                            { key: 'pushApproval', label: 'Approval', desc: 'Dapat notifikasi saat ada item perlu disetujui' },
                            { key: 'pushAnnouncement', label: 'Pengumuman', desc: 'Dapat notifikasi pengumuman perusahaan' },
                        ].map(item => (
                            <div key={item.key} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 0', borderBottom: '1px solid var(--border)',
                            }}>
                                <div>
                                    <div style={labelStyle}>{item.label}</div>
                                    <div style={descStyle}>{item.desc}</div>
                                </div>
                                <label style={{ position: 'relative', width: 44, height: 24, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={notifications[item.key]}
                                        onChange={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        width: 44, height: 24, borderRadius: 12,
                                        background: notifications[item.key] ? 'var(--primary)' : '#D1D5DB',
                                        transition: 'background 0.2s ease',
                                    }}>
                                        <div style={{
                                            width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                            position: 'absolute', top: 3,
                                            left: notifications[item.key] ? 23 : 3,
                                            transition: 'left 0.2s ease',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }} />
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
                <div style={cardStyle}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Tampilan</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div
                            onClick={() => setDarkMode(false)}
                            style={{
                                padding: 20, borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                border: !darkMode ? '2px solid var(--primary)' : '2px solid var(--border)',
                                background: '#fff', textAlign: 'center',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <FiSun style={{ fontSize: 28, color: '#F59E0B', marginBottom: 8 }} />
                            <div style={{ fontWeight: 700, fontSize: 14 }}>Light Mode</div>
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Tema terang default</div>
                        </div>
                        <div
                            onClick={() => setDarkMode(true)}
                            style={{
                                padding: 20, borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                border: darkMode ? '2px solid var(--primary)' : '2px solid var(--border)',
                                background: '#1F2937', textAlign: 'center', color: '#fff',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <FiMoon style={{ fontSize: 28, color: '#818CF8', marginBottom: 8 }} />
                            <div style={{ fontWeight: 700, fontSize: 14 }}>Dark Mode</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Tema gelap (akan datang)</div>
                        </div>
                    </div>

                    <div style={{ marginTop: 24, padding: 16, background: '#EFF6FF', borderRadius: 'var(--radius-md)', border: '1px solid #BFDBFE' }}>
                        <div style={{ fontSize: 13, color: '#1E40AF' }}>
                            <strong>Bahasa:</strong> Indonesia (default)
                        </div>
                        <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 4 }}>
                            Saat ini hanya mendukung Bahasa Indonesia.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
