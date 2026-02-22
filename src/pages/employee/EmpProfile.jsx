import { useState, useEffect } from 'react';
import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiBriefcase, FiShield, FiLogOut, FiMessageSquare, FiSend, FiLoader, FiClock, FiFileText } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getMyLeaves } from '../../services/leaveService';
import { getMyTickets, submitTicket } from '../../services/ticketService';
import BottomSheet from '../../components/BottomSheet';
import FileUploader from '../../components/FileUploader';
import { getEmployeeDocuments } from '../../services/documentService';

export default function EmpProfile() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [emp, setEmp] = useState(null);
    const [leaves, setLeaves] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [helpdeskForm, setHelpdeskForm] = useState({ category: 'IT', subject: '', description: '' });

    useEffect(() => {
        async function load() {
            const email = user?.email || user?.user_metadata?.email || 'ahmad.rizky@company.com';
            const { data } = await getEmployeeByEmail(email);
            if (data) {
                setEmp(data);
                const { data: lv } = await getMyLeaves(data.id);
                setLeaves(lv || []);
                const { data: tk } = await getMyTickets(data.id);
                setTickets(tk || []);
                const { data: dc } = await getEmployeeDocuments(data.id);
                setDocs(dc || []);
            }
            setLoading(false);
        }
        load();
    }, [user]);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleSubmitHelpdesk = async () => {
        if (!helpdeskForm.subject) return;
        setSubmitting(true);
        await submitTicket(emp.id, { category: helpdeskForm.category, subject: helpdeskForm.subject, description: helpdeskForm.description });
        const { data: tk } = await getMyTickets(emp.id);
        setTickets(tk || []);
        setSubmitting(false);
        setSheetOpen(false);
        setHelpdeskForm({ category: 'IT', subject: '', description: '' });
    };

    const handleUploadSuccess = async () => {
        const { data: dc } = await getEmployeeDocuments(emp.id);
        setDocs(dc || []);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
                <FiLoader size={28} style={{ animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>Memuat data...</span>
            </div>
        );
    }

    if (!emp) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Data tidak ditemukan.</div>;

    const emergency = emp.emergency_contact || {};
    const bank = emp.bank_account || {};
    const education = emp.education || {};
    const leaveBalance = emp.leave_quota - emp.leave_used;

    const statusColor = (s) => s === 'approved' || s === 'resolved' ? 'var(--success)' : s === 'rejected' ? 'var(--danger)' : s === 'in-progress' ? 'var(--warning)' : 'var(--info)';

    return (
        <div>
            {/* Profile Header */}
            <div className="emp-card emp-card-gradient" style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28, fontWeight: 800, color: '#fff', border: '3px solid rgba(255,255,255,0.4)' }}>
                    {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{emp.name}</h2>
                <p style={{ fontSize: 13, opacity: 0.8 }}>{emp.position} — {emp.division}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                    <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{emp.nip}</span>
                    <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{emp.status === 'permanent' ? 'Tetap' : 'Kontrak'}</span>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 16, border: '1px solid var(--border)', overflowX: 'auto' }}>
                {[
                    { key: 'info', label: 'Info' },
                    { key: 'leave', label: 'Cuti' },
                    { key: 'docs', label: 'Dokumen' },
                    { key: 'tickets', label: 'Tiket' }
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: '0 0 auto', minWidth: 80, padding: '10px 8px', borderRadius: 'var(--radius-sm)', border: 'none', background: activeTab === t.key ? 'var(--primary)' : 'transparent', color: activeTab === t.key ? '#fff' : 'var(--muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Info Tab */}
            {activeTab === 'info' && (
                <div className="emp-card" style={{ marginBottom: 16 }}>
                    {[
                        { icon: <FiMail />, label: 'Email', value: emp.email },
                        { icon: <FiPhone />, label: 'Telepon', value: emp.phone },
                        { icon: <FiMapPin />, label: 'Alamat', value: emp.address || '—' },
                        { icon: <FiCalendar />, label: 'Bergabung', value: emp.join_date || '—' },
                        { icon: <FiCalendar />, label: 'Lahir', value: emp.birth_date || '—' },
                        { icon: <FiBriefcase />, label: 'Pendidikan', value: education.level ? `${education.level} ${education.major} — ${education.university}` : '—' },
                        { icon: <FiShield />, label: 'Darurat', value: emergency.name ? `${emergency.name} (${emergency.relation}) — ${emergency.phone}` : '—' },
                    ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--primary)', marginTop: 2 }}>{item.icon}</div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Leave Tab */}
            {activeTab === 'leave' && (
                <div>
                    <div className="emp-card" style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>{leaveBalance}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Sisa</div>
                            </div>
                            <div style={{ width: 1, background: 'var(--border)' }} />
                            <div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--danger)' }}>{emp.leave_used}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Terpakai</div>
                            </div>
                            <div style={{ width: 1, background: 'var(--border)' }} />
                            <div>
                                <div style={{ fontSize: 28, fontWeight: 800 }}>{emp.leave_quota}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Total</div>
                            </div>
                        </div>
                    </div>
                    {leaves.length > 0 ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {leaves.map(l => (
                                <div key={l.id} style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                    <div>
                                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{l.type}</div>
                                        <div style={{ color: 'var(--muted)', fontSize: 11 }}>{l.start_date} — {l.end_date} ({l.days} hari)</div>
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(l.status), textTransform: 'uppercase' }}>{l.status}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>Belum ada riwayat cuti</div>
                    )}
                </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'docs' && (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Unggah Dokumen Baru</div>
                        <div style={{ display: 'grid', gap: 10 }}>
                            <FileUploader employeeId={emp.id} type="KTP" onUploadSuccess={handleUploadSuccess} />
                            <FileUploader employeeId={emp.id} type="Ijazah" onUploadSuccess={handleUploadSuccess} />
                            <FileUploader employeeId={emp.id} type="Sertifikat" onUploadSuccess={handleUploadSuccess} />
                        </div>
                    </div>
                    {docs.length > 0 ? (
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Daftar Dokumen</div>
                            <div style={{ display: 'grid', gap: 8 }}>
                                {docs.map(d => (
                                    <div key={d.id} style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <FiFileText color="var(--primary)" />
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{d.type}</div>
                                                <div style={{ color: 'var(--muted)', fontSize: 11 }}>{new Date(d.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(d.status), textTransform: 'uppercase' }}>{d.status}</span>
                                            <a href={d.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 12 }}>Lihat</a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>Belum ada dokumen yang diunggah</div>
                    )}
                </div>
            )}

            {/* Logout Button */}
            <button onClick={handleLogout} style={{ width: '100%', marginTop: 24, padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <FiLogOut /> Logout
            </button>

            {/* Helpdesk Bottom Sheet */}
            <BottomSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                title="Buat Tiket Helpdesk"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setSheetOpen(false)}>Batal</button>
                        <button className="btn-primary" onClick={handleSubmitHelpdesk} disabled={submitting}>
                            {submitting ? 'Mengirim...' : <><FiSend style={{ marginRight: 6 }} /> Kirim</>}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'grid', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Kategori</label>
                        <select value={helpdeskForm.category} onChange={e => setHelpdeskForm({ ...helpdeskForm, category: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <option>IT</option>
                            <option>HR</option>
                            <option>Finance</option>
                            <option>Lainnya</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Judul</label>
                        <input type="text" placeholder="Masalah..." value={helpdeskForm.subject} onChange={e => setHelpdeskForm({ ...helpdeskForm, subject: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Deskripsi</label>
                        <textarea placeholder="Detail..." value={helpdeskForm.description} onChange={e => setHelpdeskForm({ ...helpdeskForm, description: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: 100 }} />
                    </div>
                </div>
            </BottomSheet>
        </div>
    );
}
