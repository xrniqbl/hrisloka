import { useState, useEffect, useRef } from 'react';
import {
    FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiBriefcase, FiShield,
    FiLogOut, FiMessageSquare, FiSend, FiLoader, FiClock, FiFileText,
    FiLock, FiCheck, FiChevronDown, FiCamera, FiEdit3, FiDollarSign,
    FiBook, FiHeart, FiAlertCircle, FiX
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getEmployeeByEmail, updateEmployeeDirectFields, uploadProfilePhoto } from '../../services/employeeService';
import { getMyLeaves } from '../../services/leaveService';
import { getMyTickets, submitTicket } from '../../services/ticketService';
import { submitUpdateRequest, getMyUpdateRequests } from '../../services/profileUpdateService';
import { getEmployeeDocuments } from '../../services/documentService';
import BottomSheet from '../../components/BottomSheet';
import FileUploader from '../../components/FileUploader';
import ProfileCompletionBar from '../../components/ProfileCompletionBar';
import './EmpProfile.css';

export default function EmpProfile() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [emp, setEmp] = useState(null);
    const [leaves, setLeaves] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [docs, setDocs] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [helpdeskForm, setHelpdeskForm] = useState({ category: 'IT', subject: '', description: '' });
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const photoInputRef = useRef(null);

    // Collapsible sections
    const [openSections, setOpenSections] = useState({ personal: true, contact: true, financial: false, education: false, documents: false });
    const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

    // Update request bottom sheet
    const [updateSheet, setUpdateSheet] = useState(null); // { fieldName, fieldLabel, oldValue }
    const [updateValue, setUpdateValue] = useState('');
    const [updateSubmitting, setUpdateSubmitting] = useState(false);

    // Direct edit states
    const [editingField, setEditingField] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [savingDirect, setSavingDirect] = useState(false);

    // Account editing
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');


    const [accountMsg, setAccountMsg] = useState({ text: '', type: '' });
    const [savingAccount, setSavingAccount] = useState(false);

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
                const { data: pr } = await getMyUpdateRequests(data.id);
                setPendingRequests(pr || []);
            }
            setLoading(false);
        }
        load();
    }, [user]);

    const handleLogout = async () => { await signOut(); navigate('/login'); };

    // Photo upload
    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !emp) return;
        setUploadingPhoto(true);
        const { url } = await uploadProfilePhoto(emp.id, file);
        if (url) setEmp(prev => ({ ...prev, photo_url: url }));
        setUploadingPhoto(false);
    };

    // Direct save (free edit fields)
    const handleDirectSave = async (fieldName) => {
        if (!emp) return;
        setSavingDirect(true);
        const { data } = await updateEmployeeDirectFields(emp.id, { [fieldName]: editValue });
        if (data) setEmp(data);
        setSavingDirect(false);
        setEditingField(null);
    };

    // Submit update request (locked fields)
    const handleSubmitUpdateRequest = async () => {
        if (!emp || !updateSheet || !updateValue) return;
        setUpdateSubmitting(true);
        await submitUpdateRequest(emp.id, updateSheet.fieldName, updateSheet.fieldLabel, updateSheet.oldValue, updateValue);
        const { data: pr } = await getMyUpdateRequests(emp.id);
        setPendingRequests(pr || []);
        setUpdateSubmitting(false);
        setUpdateSheet(null);
        setUpdateValue('');
    };

    // Helpdesk ticket
    const handleSubmitHelpdesk = async () => {
        if (!helpdeskForm.subject) return;
        setSubmitting(true);
        await submitTicket(emp.id, helpdeskForm);
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

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
            <FiLoader size={28} style={{ animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>Memuat data...</span>
        </div>
    );

    if (!emp) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Data tidak ditemukan.</div>;

    const emergency = emp.emergency_contact || {};
    const bank = emp.bank_account || {};
    const education = emp.education || {};
    const workHistory = Array.isArray(emp.work_history) ? emp.work_history : [];
    const certs = Array.isArray(emp.certifications) ? emp.certifications : [];
    const leaveBalance = emp.leave_quota - emp.leave_used;


    const statusColor = (s) => s === 'approved' || s === 'resolved' ? 'var(--success)' : s === 'rejected' ? 'var(--danger)' : s === 'in-progress' ? 'var(--warning)' : 'var(--info)';

    // Render helpers
    const InfoRow = ({ icon, label, value, fieldName, freeEdit, locked }) => {
        const isEditing = editingField === fieldName;
        const displayValue = value || '—';
        return (
            <div className="profile-info-row">
                <div className="profile-info-icon">{icon}</div>
                <div style={{ flex: 1 }}>
                    <div className="profile-info-label">
                        {label}
                        {locked && <span className="profile-locked-badge"><FiLock size={9} /> Perlu Persetujuan</span>}
                    </div>
                    {isEditing ? (
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                            />
                            <button onClick={() => handleDirectSave(fieldName)} disabled={savingDirect} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700 }}>
                                {savingDirect ? '...' : '✓'}
                            </button>
                            <button onClick={() => setEditingField(null)} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 12 }}>✕</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={`profile-info-value ${!value ? 'empty' : ''}`}>{displayValue}</div>
                            {freeEdit && fieldName && (
                                <button onClick={() => { setEditingField(fieldName); setEditValue(value || ''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 4 }}>
                                    <FiEdit3 size={13} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const SectionCard = ({ id, icon, iconBg, title, children, requestFields }) => (
        <div className="profile-section">
            <div className="profile-section-header" onClick={() => toggleSection(id)}>
                <div className="profile-section-title">
                    <div className="profile-section-icon" style={{ background: iconBg }}>{icon}</div>
                    {title}
                </div>
                <FiChevronDown className={`profile-section-chevron ${openSections[id] ? 'open' : ''}`} />
            </div>
            {openSections[id] && (
                <div className="profile-section-body">
                    {children}
                    {requestFields && (
                        <button className="profile-request-btn" onClick={() => { setUpdateSheet(requestFields); setUpdateValue(''); }}>
                            <FiEdit3 size={14} /> Request Perubahan Data
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div>
            {/* ═══ PROFILE HEADER ═══ */}
            <div className="emp-card emp-card-gradient profile-header" style={{ marginBottom: 16 }}>
                <div className="profile-avatar-wrap">
                    <div className="profile-avatar">
                        {uploadingPhoto && (
                            <div className="profile-upload-overlay"><FiLoader size={24} style={{ animation: 'spin 0.8s linear infinite', color: '#fff' }} /></div>
                        )}
                        {emp.photo_url ? (
                            <img src={emp.photo_url} alt={emp.name} />
                        ) : (
                            emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)
                        )}
                    </div>
                    <button className="profile-avatar-edit" onClick={() => photoInputRef.current?.click()}>
                        <FiCamera />
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handlePhotoChange} />
                </div>
                <div className="profile-name">{emp.name}</div>
                <div className="profile-title">{emp.position} — {emp.division}</div>
                <div className="profile-badges">
                    <span className="profile-badge">{emp.nip}</span>
                    <span className={`profile-badge status-${emp.status === 'permanent' ? 'permanent' : 'contract'}`}>
                        {emp.status === 'permanent' ? '● Tetap' : '● Kontrak'}
                    </span>
                </div>
            </div>

            {/* Profile Completion Progress Bar */}
            <ProfileCompletionBar employee={emp} />

            {/* TABS */}
            <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 16, border: '1px solid var(--border)', overflowX: 'auto' }}>
                {[
                    { key: 'info', label: 'Profil' },
                    { key: 'leave', label: 'Cuti' },
                    { key: 'docs', label: 'Dokumen' },
                    { key: 'tickets', label: 'Tiket' },
                    { key: 'account', label: 'Akun' }
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: '0 0 auto', minWidth: 64, padding: '10px 8px', borderRadius: 'var(--radius-sm)', border: 'none', background: activeTab === t.key ? 'var(--primary)' : 'transparent', color: activeTab === t.key ? '#fff' : 'var(--muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ═══════ PROFIL TAB ═══════ */}
            {activeTab === 'info' && (
                <div>
                    {/* Pending requests banner */}
                    {pendingRequests.filter(r => r.status === 'pending').length > 0 && (
                        <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-sm)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#D97706', fontWeight: 600 }}>
                            <FiAlertCircle /> {pendingRequests.filter(r => r.status === 'pending').length} permintaan perubahan menunggu persetujuan
                        </div>
                    )}

                    {/* ─── Section 2: Personal Details ─── */}
                    <SectionCard id="personal" icon={<FiUser />} iconBg="#6366F1" title="Informasi Pribadi">
                        <InfoRow icon={<FiUser />} label="Jenis Kelamin" value={emp.gender === 'male' ? 'Laki-laki' : emp.gender === 'female' ? 'Perempuan' : emp.gender} locked />
                        <InfoRow icon={<FiCalendar />} label="Tanggal Lahir" value={emp.birth_date} locked />
                        <InfoRow icon={<FiHeart />} label="Agama" value={emp.religion} locked />
                        <InfoRow icon={<FiShield />} label="Golongan Darah" value={emp.blood_type} locked />
                        <InfoRow icon={<FiUser />} label="Status Pernikahan" value={
                            emp.marital_status === 'single' ? 'Lajang' : emp.marital_status === 'married' ? 'Menikah' : emp.marital_status
                        } locked />
                        <InfoRow icon={<FiMapPin />} label="Alamat Domisili" value={emp.address} fieldName="address" freeEdit />
                        <InfoRow icon={<FiMapPin />} label="Alamat KTP" value={emp.ktp_address} locked />
                        <button className="profile-request-btn" onClick={() => { setUpdateSheet({ fieldName: null, fieldLabel: 'Informasi Pribadi', oldValue: '' }); setUpdateValue(''); }}>
                            <FiEdit3 size={14} /> Request Perubahan Data Pribadi
                        </button>
                    </SectionCard>

                    {/* ─── Section 3: Contact & Emergency ─── */}
                    <SectionCard id="contact" icon={<FiPhone />} iconBg="#0EA5E9" title="Kontak & Darurat">
                        <InfoRow icon={<FiPhone />} label="WhatsApp / Telepon" value={emp.whatsapp || emp.phone} fieldName="whatsapp" freeEdit />
                        <InfoRow icon={<FiMail />} label="Email Pribadi" value={emp.personal_email} fieldName="personal_email" freeEdit />
                        <InfoRow icon={<FiMail />} label="Email Perusahaan" value={emp.email} />
                        <InfoRow icon={<FiShield />} label="Kontak Darurat" value={emergency.name ? `${emergency.name} (${emergency.relation}) — ${emergency.phone}` : null} locked />
                        <button className="profile-request-btn" onClick={() => { setUpdateSheet({ fieldName: 'emergency_contact', fieldLabel: 'Kontak Darurat', oldValue: JSON.stringify(emergency) }); setUpdateValue(''); }}>
                            <FiEdit3 size={14} /> Request Ubah Kontak Darurat
                        </button>
                    </SectionCard>

                    {/* ─── Section 4: Financial & Legal ─── */}
                    <SectionCard id="financial" icon={<FiDollarSign />} iconBg="#16A34A" title="Data Finansial & Legal">
                        <InfoRow icon={<FiDollarSign />} label="Bank" value={bank.bank_name ? `${bank.bank_name} — ${bank.account_number} (${bank.account_name})` : null} locked />


                        <InfoRow icon={<FiFileText />} label="NPWP" value={emp.npwp} locked />
                        <InfoRow icon={<FiShield />} label="BPJS Kesehatan" value={emp.bpjs_kesehatan} locked />
                        <InfoRow icon={<FiShield />} label="BPJS Ketenagakerjaan" value={emp.bpjs_ketenagakerjaan} locked />
                        <button className="profile-request-btn" onClick={() => { setUpdateSheet({ fieldName: null, fieldLabel: 'Data Finansial', oldValue: '' }); setUpdateValue(''); }}>
                            <FiEdit3 size={14} /> Request Perubahan Data Finansial
                        </button>
                    </SectionCard>

                    {/* ─── Section 5: Education & Experience ─── */}
                    <SectionCard id="education" icon={<FiBook />} iconBg="#8B5CF6" title="Pendidikan & Pengalaman">
                        <InfoRow icon={<FiBriefcase />} label="Pendidikan Terakhir" value={education.level ? `${education.level} ${education.major} — ${education.university}` : null} locked />

                        {workHistory.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <div className="profile-info-label">RIWAYAT PEKERJAAN</div>
                                <div className="profile-timeline">
                                    {workHistory.map((w, i) => (
                                        <div key={i} className="profile-timeline-item">
                                            <div className="profile-timeline-title">{w.position}</div>
                                            <div className="profile-timeline-sub">{w.company} • {w.duration}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {certs.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <div className="profile-info-label">SERTIFIKASI</div>
                                {certs.map((c, i) => (
                                    <div key={i} style={{ padding: '8px 0', borderBottom: i < certs.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.issuer} • {c.year}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!education.level && workHistory.length === 0 && certs.length === 0 && (
                            <div className="profile-info-value empty" style={{ padding: '8px 0' }}>Belum ada data pendidikan</div>
                        )}

                        <button className="profile-request-btn" onClick={() => { setUpdateSheet({ fieldName: 'education', fieldLabel: 'Pendidikan & Pengalaman', oldValue: JSON.stringify(education) }); setUpdateValue(''); }}>
                            <FiEdit3 size={14} /> Request Perubahan Data Pendidikan
                        </button>
                    </SectionCard>

                    {/* ─── Section 6: Documents Quick View ─── */}
                    <SectionCard id="documents" icon={<FiFileText />} iconBg="#F59E0B" title={`Dokumen (${docs.length})`}>
                        {docs.length > 0 ? docs.slice(0, 5).map(d => (
                            <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FiFileText color="var(--primary)" size={14} />
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{d.type}</div>
                                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(d.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <a href={d.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}>Lihat</a>
                            </div>
                        )) : (
                            <div className="profile-info-value empty" style={{ padding: '8px 0' }}>Belum ada dokumen</div>
                        )}
                        {docs.length > 5 && <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 8, cursor: 'pointer' }} onClick={() => setActiveTab('docs')}>Lihat semua →</div>}
                    </SectionCard>

                    {/* Pending Update Requests */}
                    {pendingRequests.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Riwayat Permintaan Perubahan</div>
                            {pendingRequests.slice(0, 5).map(r => (
                                <div key={r.id} className="profile-pending-item">
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{r.field_label || r.field_name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(r.requested_at).toLocaleDateString()}</div>
                                    </div>
                                    <span className={`profile-pending-badge ${r.status}`}>{r.status === 'pending' ? 'Menunggu' : r.status === 'approved' ? 'Disetujui' : 'Ditolak'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════ LEAVE TAB ═══════ */}
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

            {/* ═══════ DOCS TAB ═══════ */}
            {activeTab === 'docs' && (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Unggah Dokumen Baru</div>
                        <div style={{ display: 'grid', gap: 10 }}>
                            <FileUploader employeeId={emp.id} type="KTP" onUploadSuccess={handleUploadSuccess} />
                            <FileUploader employeeId={emp.id} type="NPWP" onUploadSuccess={handleUploadSuccess} />
                            <FileUploader employeeId={emp.id} type="Ijazah" onUploadSuccess={handleUploadSuccess} />
                            <FileUploader employeeId={emp.id} type="Paklaring" onUploadSuccess={handleUploadSuccess} />
                            <FileUploader employeeId={emp.id} type="Sertifikat" onUploadSuccess={handleUploadSuccess} />
                            <FileUploader employeeId={emp.id} type="SKS (Surat Keterangan Sehat)" onUploadSuccess={handleUploadSuccess} />
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

            {/* ═══════ TICKETS TAB ═══════ */}
            {activeTab === 'tickets' && (
                <div>
                    <button className="profile-request-btn" style={{ marginTop: 0, marginBottom: 16 }} onClick={() => setSheetOpen(true)}>
                        <FiMessageSquare size={14} /> Buat Tiket Helpdesk
                    </button>
                    {tickets.length > 0 ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {tickets.map(t => (
                                <div key={t.id} style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 13 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{t.subject}</div>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(t.status), textTransform: 'uppercase' }}>{t.status}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.category} • {new Date(t.created_at).toLocaleDateString()}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>Belum ada tiket</div>
                    )}
                </div>
            )}

            {/* ═══════ ACCOUNT TAB ═══════ */}
            {activeTab === 'account' && (
                <div>
                    {accountMsg.text && (
                        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14, fontSize: 13, fontWeight: 600, background: accountMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: accountMsg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
                            {accountMsg.text}
                        </div>
                    )}
                    <div className="emp-card" style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FiMail size={16} /> Ubah Email
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Email saat ini: {user?.email}</div>
                        <input type="email" placeholder="Email baru" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 10, fontSize: 13 }} />
                        <button
                            disabled={savingAccount || !newEmail}
                            onClick={async () => {
                                setSavingAccount(true); setAccountMsg({ text: '', type: '' });
                                const { error } = await supabase.auth.updateUser({ email: newEmail });
                                setAccountMsg(error ? { text: error.message, type: 'error' } : { text: 'Link konfirmasi dikirim ke email baru.', type: 'success' });
                                if (!error) setNewEmail('');
                                setSavingAccount(false);
                            }}
                            style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: savingAccount || !newEmail ? 0.5 : 1 }}
                        >
                            {savingAccount ? 'Menyimpan...' : 'Update Email'}
                        </button>
                    </div>
                    <div className="emp-card">
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FiLock size={16} /> Ubah Password
                        </div>
                        <input type="password" placeholder="Password baru" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 10, fontSize: 13 }} />
                        {newPassword && (
                            <div style={{ marginBottom: 10, display: 'grid', gap: 3 }}>
                                {[
                                    { label: 'Min 8 karakter', ok: newPassword.length >= 8 },
                                    { label: 'Min 1 huruf kapital', ok: /[A-Z]/.test(newPassword) },
                                    { label: 'Min 1 angka', ok: /[0-9]/.test(newPassword) },
                                    { label: 'Min 1 karakter spesial', ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) },
                                ].map((r, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: r.ok ? 'var(--success)' : 'var(--muted)' }}>
                                        <span style={{ fontSize: 12 }}>{r.ok ? '✓' : '○'}</span> {r.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        <input type="password" placeholder="Konfirmasi password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 4, fontSize: 13 }} />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 8 }}>Password tidak cocok</div>
                        )}
                        <button
                            disabled={savingAccount || !newPassword || !(newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) || newPassword !== confirmPassword}
                            onClick={async () => {
                                setSavingAccount(true); setAccountMsg({ text: '', type: '' });
                                const { error } = await supabase.auth.updateUser({ password: newPassword });
                                setAccountMsg(error ? { text: error.message, type: 'error' } : { text: 'Password berhasil diubah!', type: 'success' });
                                if (!error) { setNewPassword(''); setConfirmPassword(''); }
                                setSavingAccount(false);
                            }}
                            style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 6, opacity: savingAccount ? 0.5 : 1 }}
                        >
                            {savingAccount ? 'Menyimpan...' : 'Ubah Password'}
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ LOGOUT ═══ */}
            <button onClick={handleLogout} style={{ width: '100%', marginTop: 24, padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <FiLogOut /> Logout
            </button>

            {/* ═══ UPDATE REQUEST BOTTOM SHEET ═══ */}
            <BottomSheet
                open={!!updateSheet}
                onClose={() => setUpdateSheet(null)}
                title={`Request Perubahan: ${updateSheet?.fieldLabel || ''}`}
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setUpdateSheet(null)}>Batal</button>
                        <button className="btn-primary" onClick={handleSubmitUpdateRequest} disabled={updateSubmitting || !updateValue}>
                            {updateSubmitting ? 'Mengirim...' : <><FiSend style={{ marginRight: 6 }} /> Kirim Request</>}
                        </button>
                    </>
                }
            >
                <div className="profile-update-form">
                    {updateSheet?.fieldName ? (
                        <div>
                            <label>Field: {updateSheet.fieldLabel}</label>
                            {updateSheet.oldValue && (
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, background: 'var(--bg)', padding: 10, borderRadius: 8 }}>
                                    Data saat ini: {updateSheet.oldValue}
                                </div>
                            )}
                            <label>Nilai Baru</label>
                            <textarea
                                placeholder="Masukkan data baru..."
                                value={updateValue}
                                onChange={e => setUpdateValue(e.target.value)}
                                style={{ minHeight: 80 }}
                            />
                        </div>
                    ) : (
                        <div>
                            <label>Pilih field yang ingin diubah</label>
                            <select value={updateValue ? updateValue.split('||')[0] : ''} onChange={e => {
                                const field = e.target.value;
                                setUpdateValue(field);
                                if (updateSheet) setUpdateSheet({ ...updateSheet, fieldName: field });
                            }}>
                                <option value="">— Pilih —</option>
                                {updateSheet?.fieldLabel === 'Informasi Pribadi' && (
                                    <>
                                        <option value="gender">Jenis Kelamin</option>
                                        <option value="birth_date">Tanggal Lahir</option>
                                        <option value="religion">Agama</option>
                                        <option value="blood_type">Golongan Darah</option>
                                        <option value="marital_status">Status Pernikahan</option>
                                        <option value="ktp_address">Alamat KTP</option>
                                    </>
                                )}
                                {updateSheet?.fieldLabel === 'Data Finansial' && (
                                    <>
                                        <option value="bank_account">Informasi Bank</option>
                                        <option value="npwp">NPWP</option>
                                        <option value="bpjs_kesehatan">BPJS Kesehatan</option>
                                        <option value="bpjs_ketenagakerjaan">BPJS Ketenagakerjaan</option>
                                    </>
                                )}
                            </select>
                            {updateValue && (
                                <div style={{ marginTop: 4 }}>
                                    <label>Nilai Baru</label>
                                    <textarea
                                        placeholder="Masukkan data baru yang diinginkan..."
                                        value={updateValue.includes('||') ? updateValue.split('||')[1] : ''}
                                        onChange={e => {
                                            const field = updateValue.split('||')[0];
                                            setUpdateValue(`${field}||${e.target.value}`);
                                        }}
                                        style={{ minHeight: 80 }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </BottomSheet>

            {/* ═══ HELPDESK BOTTOM SHEET ═══ */}
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
