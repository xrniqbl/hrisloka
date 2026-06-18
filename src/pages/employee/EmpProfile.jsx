import { useState, useEffect, useRef } from 'react';
import {
  HiArrowLeftOnRectangle,
  HiArrowPath,
  HiBellAlert,
  HiBookOpen,
  HiBriefcase,
  HiCalendarDays,
  HiCamera,
  HiChatBubbleLeftRight,
  HiCheck,
  HiChevronDown,
  HiCurrencyDollar,
  HiDocumentText,
  HiEnvelope,
  HiGlobeAlt,
  HiHeart,
  HiLockClosed,
  HiMapPin,
  HiMoon,
  HiPaperAirplane,
  HiPencilSquare,
  HiPhone,
  HiShieldCheck,
  HiUser,
  HiUsers,
  HiXMark
} from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getEmployeeByEmail, updateEmployeeDirectFields, uploadProfilePhoto } from '../../services/employeeService';
import { getMyLeaves } from '../../services/leaveService';
import { getMyTickets, submitTicket } from '../../services/ticketService';
import { submitUpdateRequest, getMyUpdateRequests } from '../../services/profileUpdateService';
import { getEmployeeDocuments } from '../../services/documentService';
import { hasRegisteredFace, getEmployeeFaceDescriptors } from '../../services/attendanceService';
import BottomSheet from '../../components/BottomSheet';
import FileUploader from '../../components/FileUploader';
import ProfileCompletionBar from '../../components/ProfileCompletionBar';
import FaceRegistration from '../../components/FaceRegistration';
import { useTranslation } from '../../lib/i18n';
import './EmpProfile.css';

export default function EmpProfile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { locale, toggleLocale } = useTranslation();
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

  // Face ID state
  const [hasFaceReg, setHasFaceReg] = useState(null);
  const [faceCount, setFaceCount] = useState(0);
  const [showFaceRegSheet, setShowFaceRegSheet] = useState(false);

  // Collapsible sections
  const [openSections, setOpenSections] = useState({ personal: true, contact: true, financial: false, education: false, documents: false });
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Update request bottom sheet
  const [updateSheet, setUpdateSheet] = useState(null);
  const [updateValue, setUpdateValue] = useState('');
  const [updateSubmitting, setUpdateSubmitting] = useState(false);

  // Direct edit states (restricted: name, position, phone only)
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [savingDirect, setSavingDirect] = useState(false);

  // Quick Edit Sheet (name / jabatan / telepon)
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [qeName, setQeName] = useState('');
  const [qePosition, setQePosition] = useState('');
  const [qePhone, setQePhone] = useState('');
  const [qeSaving, setQeSaving] = useState(false);

  // Account editing
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountMsg, setAccountMsg] = useState({ text: '', type: '' });
  const [savingAccount, setSavingAccount] = useState(false);

  const L = {
    loading: { id: 'Memuat data...', en: 'Loading data...' },
    not_found: { id: 'Data tidak ditemukan.', en: 'Data not found.' },
    profile: { id: locale === 'en' ? 'Profile' : 'Profil', en: 'Profile' },
    leave: { id: 'Cuti', en: 'Leave' },
    docs: { id: 'Dokumen', en: 'Documents' },
    tickets: { id: 'Tiket', en: 'Tickets' },
    account: { id: 'Akun', en: 'Account' },
  };
  const t = (key) => L[key]?.[locale] || L[key]?.id || key;

  useEffect(() => {
    async function load() {
      const email = user?.email || user?.user_metadata?.email;
      const { data } = await getEmployeeByEmail(email);
      if (data) {
        setEmp(data);
        const [lv, tk, dc, pr, faceCheck] = await Promise.all([
          getMyLeaves(data.id),
          getMyTickets(data.id),
          getEmployeeDocuments(data.id),
          getMyUpdateRequests(data.id),
          hasRegisteredFace(data.id),
        ]);
        setLeaves(lv.data || []);
        setTickets(tk.data || []);
        setDocs(dc.data || []);
        setPendingRequests(pr.data || []);
        setHasFaceReg(faceCheck.hasface);
        if (faceCheck.hasface) {
          const { data: fd } = await getEmployeeFaceDescriptors(data.id);
          setFaceCount((fd || []).length);
        }
      }
      setLoading(false);
    }
    load();
  }, [user]);

  // Realtime: when admin approves, PWA auto-syncs employee profile
  useEffect(() => {
    if (!emp?.id) return;
    const ch = supabase
      .channel(`emp-profile-rt-${emp.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profile_update_requests', filter: `employee_id=eq.${emp.id}` },
        async (payload) => {
          const { data: pr } = await getMyUpdateRequests(emp.id);
          setPendingRequests(pr || []);
          if (payload.new?.status === 'approved') {
            const { data: freshEmp } = await getEmployeeByEmail(emp.email);
            if (freshEmp) setEmp(freshEmp);
          }
        })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [emp?.id]);

  // Pull-to-refresh support
  useEffect(() => {
    const handler = async () => {
      if (!emp) return;
      const email = user?.email || user?.user_metadata?.email;
      const { data } = await getEmployeeByEmail(email);
      if (data) setEmp(data);
    };
    window.addEventListener('emp:refresh', handler);
    return () => window.removeEventListener('emp:refresh', handler);
  }, [emp, user]);

  const handleLogout = async () => { await signOut(); navigate('/app/login'); };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !emp) return;
    setUploadingPhoto(true);
    const { url } = await uploadProfilePhoto(emp.id, file);
    if (url) setEmp(prev => ({ ...prev, photo_url: url }));
    setUploadingPhoto(false);
  };

  const handleDirectSave = async (fieldName) => {
    if (!emp) return;
    setSavingDirect(true);
    const { data } = await updateEmployeeDirectFields(emp.id, { [fieldName]: editValue });
    if (data) setEmp(data);
    setSavingDirect(false);
    setEditingField(null);
  };

  // Quick edit save — only name / position / whatsapp
  const handleQuickEditSave = async () => {
    if (!emp) return;
    setQeSaving(true);
    const { data } = await updateEmployeeDirectFields(emp.id, {
      name: qeName,
      position: qePosition,
      whatsapp: qePhone,
    });
    if (data) setEmp(data);
    setQeSaving(false);
    setQuickEditOpen(false);
  };

  const openQuickEdit = () => {
    setQeName(emp?.name || '');
    setQePosition(emp?.position || '');
    setQePhone(emp?.whatsapp || emp?.phone || '');
    setQuickEditOpen(true);
  };

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
      <HiArrowPath size={28} style={{ animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--muted)', fontSize: 14 }}>{t('loading')}</span>
    </div>
  );

  if (!emp) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>{t('not_found')}</div>;

  const emergency = emp.emergency_contact || {};
  const bank = emp.bank_account || {};
  const education = emp.education || {};
  const workHistory = Array.isArray(emp.work_history) ? emp.work_history : [];
  const certs = Array.isArray(emp.certifications) ? emp.certifications : [];
  const leaveBalance = (emp.leave_quota || 0) - (emp.leave_used || 0);

  const statusColor = (s) => s === 'approved' || s === 'resolved' ? 'var(--success)' : s === 'rejected' ? 'var(--danger)' : s === 'in-progress' ? 'var(--warning)' : 'var(--primary)';

  const InfoRow = ({ icon, label, value, fieldName, freeEdit, locked }) => {
    const isEditing = editingField === fieldName;
    const displayValue = value || '\u2014';
    return (
      <div className="profile-info-row">
        <div className="profile-info-icon">{icon}</div>
        <div style={{ flex: 1 }}>
          <div className="profile-info-label">
            {label}
            {locked && <span className="profile-locked-badge"><HiLockClosed size={9} /> {locale === 'en' ? 'Needs Approval' : 'Perlu Persetujuan'}</span>}
          </div>
          {isEditing ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                autoFocus
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)' }}
              />
              <button onClick={() => handleDirectSave(fieldName)} disabled={savingDirect} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700 }}>
                {savingDirect ? '...' : '\u2713'}
              </button>
              <button onClick={() => setEditingField(null)} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text)' }}>\u2715</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className={`profile-info-value ${!value ? 'empty' : ''}`}>{displayValue}</div>
              {freeEdit && fieldName && (
                <button onClick={() => { setEditingField(fieldName); setEditValue(value || ''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 4 }}>
                  <HiPencilSquare size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const SectionCard = ({ id, icon, iconBg, title, children }) => (
    <div className="profile-section">
      <div className="profile-section-header" onClick={() => toggleSection(id)}>
        <div className="profile-section-title">
          <div className="profile-section-icon" style={{ background: iconBg }}>{icon}</div>
          {title}
        </div>
        <HiChevronDown className={`profile-section-chevron ${openSections[id] ? 'open' : ''}`} />
      </div>
      {openSections[id] && (
        <div className="profile-section-body">
          {children}
        </div>
      )}
    </div>
  );

  const TABS = [
    { key: 'info', label: t('profile') },
    { key: 'leave', label: t('leave') },
    { key: 'docs', label: t('docs') },
    { key: 'tickets', label: t('tickets') },
    { key: 'face', label: 'Face ID' },
    { key: 'account', label: t('account') },
  ];

  return (
    <>
    <div className="emp-page">
      {/* Page Title + Settings */}
      <div className="emp-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="emp-page-title">{locale === 'en' ? 'Profile' : locale === 'en' ? 'Profile' : 'Profil'}</h1>
        <button
          onClick={() => navigate('/app/settings')}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--muted)',
          }}
        >
          <HiPencilSquare size={17} />
        </button>
      </div>

      {/* ── Hero Profile Card ── */}
      <div style={{ background: 'linear-gradient(145deg, #EEF4FF 0%, #F0F7FF 50%, #E8F0FE 100%)', borderRadius: 20, padding: '28px 20px 22px', marginBottom: 16, border: '1px solid rgba(0,71,171,0.08)', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(0,71,171,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(0,71,171,0.03)' }} />
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,71,171,0.1)', border: '3px solid rgba(0,71,171,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {emp.photo_url ? (
                <img src={emp.photo_url} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <HiUser size={44} style={{ color: 'var(--primary)' }} />
              )}
              {uploadingPhoto && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,71,171,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HiArrowPath size={20} style={{ animation: 'spin 0.8s linear infinite', color: '#fff' }} />
                </div>
              )}
            </div>
            <button onClick={() => photoInputRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <HiCamera size={13} />
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{emp.name}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>{emp.position}{emp.division ? ` — ${emp.division}` : ''}</div>
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button
              onClick={openQuickEdit}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 0', borderRadius: 12, background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <HiPencilSquare size={16} /> {locale === 'en' ? 'Edit Profile' : 'Edit Profil'}
            </button>
            <button onClick={() => setActiveTab('face')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 0', borderRadius: 12, background: 'var(--surface)', color: 'var(--primary)', border: '1.5px solid var(--border)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              <HiCamera size={16} /> {locale === 'en' ? 'Face ID' : 'Daftar Wajah'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Profile Completion ── */}
      <ProfileCompletionBar employee={emp} />

      {/* ── Profil Karyawan Section ── */}
      <div className="emp-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>{locale === 'en' ? 'Employee Profile' : 'Profil Karyawan'}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
          <HiLockClosed size={11} />
          {locale === 'en' ? 'These fields can only be changed by HR Admin' : 'Data ini hanya bisa diubah oleh HR Admin'}
        </div>
        {[
          { icon: <HiShieldCheck size={18}/>, label: 'NIK', value: emp.nip ? `NIK-****${emp.nip.slice(-4)}` : '—' },
          { icon: <HiEnvelope size={18}/>, label: locale === 'en' ? 'Email Address' : 'Alamat Email', value: emp.email ? emp.email.replace(/(.{2}).*(@.*)/, '$1***$2') : '—' },
          { icon: <HiPhone size={18}/>, label: locale === 'en' ? 'Phone Number' : 'Nomor Telepon', value: emp.whatsapp || emp.phone ? `+62 **** ${(emp.whatsapp || emp.phone).slice(-4)}` : '—' },
          { icon: <HiCurrencyDollar size={18}/>, label: locale === 'en' ? 'Bank Account' : 'Rekening Bank', value: emp.bank_account?.bank_name ? `${emp.bank_account.bank_name} - ****${String(emp.bank_account.account_number).slice(-4)}` : '—' },
          { icon: <HiUsers size={18}/>, label: locale === 'en' ? 'Emergency Contact' : 'Kontak Darurat', value: emp.emergency_contact?.name ? `${emp.emergency_contact.name} **** ${emp.emergency_contact.phone?.slice(-4) || ''}` : '—' },
          { icon: <HiCalendarDays size={18}/>, label: locale === 'en' ? 'Start Date' : 'Mulai Kerja', value: emp.join_date || '—' },
        ].map((row, i, arr) => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,71,171,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>{row.icon}</div>
            <span style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{row.value}</span>
            <HiLockClosed size={13} style={{ color: 'var(--muted)', flexShrink: 0, opacity: 0.5 }} />
          </div>
        ))}
      </div>

      {/* ── Pengaturan Section ── */}
      <div className="emp-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', marginBottom: 16 }}>{locale === 'en' ? 'Settings' : 'Pengaturan'}</div>
        {/* Dark Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,71,171,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}><HiMoon size={18}/></div>
          <span style={{ fontSize: 13, color: 'var(--text)', flex: 1, fontWeight: 500 }}>{locale === 'en' ? 'Dark Mode' : 'Mode Gelap'}</span>
          <button onClick={() => { const dm = localStorage.getItem('hrisync_dark_mode') !== 'true'; localStorage.setItem('hrisync_dark_mode', dm); document.documentElement.setAttribute('data-theme', dm ? 'dark' : 'light'); }} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: document.documentElement.getAttribute('data-theme') === 'dark' ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: document.documentElement.getAttribute('data-theme') === 'dark' ? 23 : 3, transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
          </button>
        </div>
        {/* Notifications */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,71,171,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}><HiBellAlert size={18}/></div>
          <span style={{ fontSize: 13, color: 'var(--text)', flex: 1, fontWeight: 500 }}>{locale === 'en' ? 'Notifications' : 'Notifikasi'}</span>
          <button style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--primary)', position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: 23, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
          </button>
        </div>
        {/* Language */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,71,171,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}><HiGlobeAlt size={18}/></div>
          <span style={{ fontSize: 13, color: 'var(--text)', flex: 1, fontWeight: 500 }}>{locale === 'en' ? 'Language' : 'Bahasa'}</span>
          <button
            onClick={toggleLocale}
            style={{
              display: 'flex', alignItems: 'center', gap: 0,
              borderRadius: 16, overflow: 'hidden',
              border: '1.5px solid var(--border)', background: 'var(--bg)',
              cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
              padding: 0, height: 28, flexShrink: 0,
            }}
          >
            <span style={{ padding: '0 9px', height: '100%', display: 'flex', alignItems: 'center', background: locale === 'id' ? 'var(--primary)' : 'transparent', color: locale === 'id' ? '#fff' : 'var(--muted)', transition: 'all 0.2s' }}>ID</span>
            <span style={{ padding: '0 9px', height: '100%', display: 'flex', alignItems: 'center', background: locale === 'en' ? 'var(--primary)' : 'transparent', color: locale === 'en' ? '#fff' : 'var(--muted)', transition: 'all 0.2s' }}>EN</span>
          </button>
        </div>
        {/* Security */}
        <div onClick={() => navigate('/app/settings')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', cursor: 'pointer' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,71,171,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}><HiShieldCheck size={18}/></div>
          <span style={{ fontSize: 13, color: 'var(--text)', flex: 1, fontWeight: 500 }}>{locale === 'en' ? 'Account Security' : 'Keamanan Akun'}</span>
          <HiChevronDown size={14} style={{ color: 'var(--muted)', transform: 'rotate(-90deg)', flexShrink: 0 }} />
        </div>
      </div>

      {/* ── TABS (hidden, for deeper access) ── */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 16, border: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex: '0 0 auto', minWidth: 64, padding: '10px 8px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
            color: activeTab === tab.key ? '#fff' : 'var(--muted)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s ease',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* PROFIL TAB */}
      {activeTab === 'info' && (
        <div>
          {pendingRequests.filter(r => r.status === 'pending').length > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-sm)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#D97706', fontWeight: 600 }}>
              <HiBellAlert /> {pendingRequests.filter(r => r.status === 'pending').length} {locale === 'en' ? 'change request(s) awaiting approval' : 'permintaan perubahan menunggu persetujuan'}
            </div>
          )}

          <SectionCard id="personal" icon={<HiUser />} iconBg="#6366F1" title={locale === 'en' ? 'Personal Info' : 'Informasi Pribadi'}>
            <InfoRow icon={<HiUser />} label={locale === 'en' ? 'Gender' : 'Jenis Kelamin'} value={emp.gender === 'male' ? (locale === 'en' ? 'Male' : 'Laki-laki') : emp.gender === 'female' ? (locale === 'en' ? 'Female' : 'Perempuan') : emp.gender} locked />
            <InfoRow icon={<HiCalendarDays />} label={locale === 'en' ? 'Date of Birth' : 'Tanggal Lahir'} value={emp.birth_date} locked />
            <InfoRow icon={<HiHeart />} label={locale === 'en' ? 'Religion' : 'Agama'} value={emp.religion} locked />
            <InfoRow icon={<HiShieldCheck />} label={locale === 'en' ? 'Blood Type' : 'Golongan Darah'} value={emp.blood_type} locked />
            <InfoRow icon={<HiUser />} label={locale === 'en' ? 'Marital Status' : 'Status Pernikahan'} value={emp.marital_status === 'single' ? (locale === 'en' ? 'Single' : 'Lajang') : emp.marital_status === 'married' ? (locale === 'en' ? 'Married' : 'Menikah') : emp.marital_status} locked />
            <InfoRow icon={<HiMapPin />} label={locale === 'en' ? 'Domicile Address' : 'Alamat Domisili'} value={emp.address} fieldName="address" freeEdit />
            <InfoRow icon={<HiMapPin />} label={locale === 'en' ? 'ID Card Address' : 'Alamat KTP'} value={emp.ktp_address} locked />
            <button className="profile-request-btn" onClick={() => { setUpdateSheet({ fieldName: null, fieldLabel: locale === 'en' ? 'Personal Info' : 'Informasi Pribadi', oldValue: '' }); setUpdateValue(''); }}>
              <HiPencilSquare size={14} /> {locale === 'en' ? 'Request Personal Data Change' : 'Request Perubahan Data Pribadi'}
            </button>
          </SectionCard>

          <SectionCard id="contact" icon={<HiPhone />} iconBg="#0EA5E9" title={locale === 'en' ? 'Contact & Emergency' : 'Kontak & Darurat'}>
            <InfoRow icon={<HiPhone />} label="WhatsApp / Telepon" value={emp.whatsapp || emp.phone} fieldName="whatsapp" freeEdit />
            <InfoRow icon={<HiEnvelope />} label={locale === 'en' ? 'Personal Email' : 'Email Pribadi'} value={emp.personal_email} fieldName="personal_email" freeEdit />
            <InfoRow icon={<HiEnvelope />} label={locale === 'en' ? 'Company Email' : 'Email Perusahaan'} value={emp.email} />
            <InfoRow icon={<HiShieldCheck />} label={locale === 'en' ? 'Emergency Contact' : 'Kontak Darurat'} value={emergency.name ? `${emergency.name} (${emergency.relation}) \u2014 ${emergency.phone}` : null} locked />
            <button className="profile-request-btn" onClick={() => { setUpdateSheet({ fieldName: 'emergency_contact', fieldLabel: locale === 'en' ? 'Emergency Contact' : 'Kontak Darurat', oldValue: JSON.stringify(emergency) }); setUpdateValue(''); }}>
              <HiPencilSquare size={14} /> {locale === 'en' ? 'Request Emergency Contact Change' : 'Request Ubah Kontak Darurat'}
            </button>
          </SectionCard>

          <SectionCard id="financial" icon={<HiCurrencyDollar />} iconBg="#16A34A" title={locale === 'en' ? 'Financial & Legal' : 'Data Finansial & Legal'}>
            <InfoRow icon={<HiCurrencyDollar />} label={locale === 'en' ? 'Bank Account' : 'Rekening Bank'} value={bank.bank_name ? `${bank.bank_name} \u2014 ${bank.account_number} (${bank.account_name})` : null} locked />
            <InfoRow icon={<HiDocumentText />} label="NPWP" value={emp.npwp} locked />
            <InfoRow icon={<HiShieldCheck />} label="BPJS Kesehatan" value={emp.bpjs_kesehatan} locked />
            <InfoRow icon={<HiShieldCheck />} label="BPJS Ketenagakerjaan" value={emp.bpjs_ketenagakerjaan} locked />
            <button className="profile-request-btn" onClick={() => { setUpdateSheet({ fieldName: null, fieldLabel: locale === 'en' ? 'Financial Data' : 'Data Finansial', oldValue: '' }); setUpdateValue(''); }}>
              <HiPencilSquare size={14} /> {locale === 'en' ? 'Request Financial Data Change' : 'Request Perubahan Data Finansial'}
            </button>
          </SectionCard>

          <SectionCard id="education" icon={<HiBookOpen />} iconBg="#8B5CF6" title={locale === 'en' ? 'Education & Experience' : 'Pendidikan & Pengalaman'}>
            <InfoRow icon={<HiBriefcase />} label={locale === 'en' ? 'Last Education' : 'Pendidikan Terakhir'} value={education.level ? `${education.level} ${education.major} \u2014 ${education.university}` : null} locked />
            {workHistory.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="profile-info-label">{locale === 'en' ? 'WORK HISTORY' : 'RIWAYAT PEKERJAAN'}</div>
                <div className="profile-timeline">
                  {workHistory.map((w, i) => (
                    <div key={i} className="profile-timeline-item">
                      <div className="profile-timeline-title">{w.position}</div>
                      <div className="profile-timeline-sub">{w.company} &bull; {w.duration}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {certs.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="profile-info-label">{locale === 'en' ? 'CERTIFICATIONS' : 'SERTIFIKASI'}</div>
                {certs.map((c, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: i < certs.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.issuer} &bull; {c.year}</div>
                  </div>
                ))}
              </div>
            )}
            {!education.level && workHistory.length === 0 && certs.length === 0 && (
              <div className="profile-info-value empty" style={{ padding: '8px 0' }}>{locale === 'en' ? 'No education data yet' : 'Belum ada data pendidikan'}</div>
            )}
            <button className="profile-request-btn" onClick={() => { setUpdateSheet({ fieldName: 'education', fieldLabel: locale === 'en' ? 'Education & Experience' : 'Pendidikan & Pengalaman', oldValue: JSON.stringify(education) }); setUpdateValue(''); }}>
              <HiPencilSquare size={14} /> {locale === 'en' ? 'Request Education Data Change' : 'Request Perubahan Data Pendidikan'}
            </button>
          </SectionCard>

          <SectionCard id="documents" icon={<HiDocumentText />} iconBg="#F59E0B" title={`${locale === 'en' ? 'Documents' : 'Dokumen'} (${docs.length})`}>
            {docs.length > 0 ? docs.slice(0, 5).map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HiDocumentText color="var(--primary)" size={14} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{d.type}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(d.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <a href={d.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}>{locale === 'en' ? 'View' : 'Lihat'}</a>
              </div>
            )) : (
              <div className="profile-info-value empty" style={{ padding: '8px 0' }}>{locale === 'en' ? 'No documents yet' : 'Belum ada dokumen'}</div>
            )}
            {docs.length > 5 && (
              <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 8, cursor: 'pointer' }} onClick={() => setActiveTab('docs')}>
                {locale === 'en' ? 'View all \u2192' : 'Lihat semua \u2192'}
              </div>
            )}
          </SectionCard>

          {pendingRequests.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{locale === 'en' ? 'Change Request History' : 'Riwayat Permintaan Perubahan'}</div>
              {pendingRequests.slice(0, 8).map(r => (
                <div key={r.id} className="profile-pending-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.field_label || r.field_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(r.requested_at).toLocaleDateString()}</div>
                  </div>
                  <span className={`profile-pending-badge ${r.status}`}>
                    {r.status === 'pending' ? (locale === 'en' ? 'Pending' : 'Menunggu') : r.status === 'approved' ? (locale === 'en' ? 'Approved' : 'Disetujui') : (locale === 'en' ? 'Rejected' : 'Ditolak')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LEAVE TAB */}
      {activeTab === 'leave' && (
        <div>
          <div className="emp-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>{leaveBalance}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{locale === 'en' ? 'Remaining' : 'Sisa'}</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--danger)' }}>{emp.leave_used || 0}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{locale === 'en' ? 'Used' : 'Terpakai'}</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{emp.leave_quota || 0}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{locale === 'en' ? 'Total' : 'Total'}</div>
              </div>
            </div>
          </div>
          {leaves.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {leaves.map(l => (
                <div key={l.id} style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{l.type}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>{l.start_date} &mdash; {l.end_date} ({l.days} {locale === 'en' ? 'days' : 'hari'})</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(l.status), textTransform: 'uppercase' }}>{l.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>{locale === 'en' ? 'No leave history yet' : 'Belum ada riwayat cuti'}</div>
          )}
        </div>
      )}

      {/* DOCS TAB */}
      {activeTab === 'docs' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{locale === 'en' ? 'Upload New Document' : 'Unggah Dokumen Baru'}</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {['KTP', 'NPWP', 'Ijazah', 'Paklaring', 'Sertifikat', 'SKS (Surat Keterangan Sehat)'].map(type => (
                <FileUploader key={type} employeeId={emp.id} type={type} onUploadSuccess={handleUploadSuccess} />
              ))}
            </div>
          </div>
          {docs.length > 0 ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{locale === 'en' ? 'Document List' : 'Daftar Dokumen'}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {docs.map(d => (
                  <div key={d.id} style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <HiDocumentText color="var(--primary)" />
                      <div>
                        <div style={{ fontWeight: 600 }}>{d.type}</div>
                        <div style={{ color: 'var(--muted)', fontSize: 11 }}>{new Date(d.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(d.status), textTransform: 'uppercase' }}>{d.status}</span>
                      <a href={d.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 12 }}>{locale === 'en' ? 'View' : 'Lihat'}</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>
              {locale === 'en' ? 'No documents uploaded yet' : 'Belum ada dokumen yang diunggah'}
            </div>
          )}
        </div>
      )}

      {/* TICKETS TAB */}
      {activeTab === 'tickets' && (
        <div>
          <button className="profile-request-btn" style={{ marginTop: 0, marginBottom: 16 }} onClick={() => setSheetOpen(true)}>
            <HiChatBubbleLeftRight size={14} /> {locale === 'en' ? 'Create Helpdesk Ticket' : 'Buat Tiket Helpdesk'}
          </button>
          {tickets.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {tickets.map(tk => (
                <div key={tk.id} style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{tk.subject}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(tk.status), textTransform: 'uppercase' }}>{tk.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{tk.category} &bull; {new Date(tk.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>{locale === 'en' ? 'No tickets yet' : 'Belum ada tiket'}</div>
          )}
        </div>
      )}

      {/* FACE ID TAB */}
      {activeTab === 'face' && (
        <div>
          {!showFaceRegSheet ? (
            <div className="emp-card" style={{ marginBottom: 14 }}>
              {/* Status header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: hasFaceReg ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#f59e0b,#d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: hasFaceReg ? '0 4px 14px rgba(34,197,94,0.35)' : '0 4px 14px rgba(245,158,11,0.35)',
                  flexShrink: 0,
                }}>
                  {hasFaceReg ? <HiCheck size={22} color="#fff" strokeWidth={3} /> : <HiCamera size={22} color="#fff" />}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    {hasFaceReg
                      ? (locale === 'en' ? 'Face ID Active' : 'Face ID Aktif')
                      : (locale === 'en' ? 'Face ID Not Registered' : 'Face ID Belum Terdaftar')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {hasFaceReg
                      ? (locale === 'en' ? `${faceCount} angle(s) registered · Attendance secured` : `${faceCount} sudut wajah terdaftar · Absensi terlindungi`)
                      : (locale === 'en' ? 'Register your face to enable secure attendance' : 'Daftarkan wajah untuk absensi yang aman')}
                  </div>
                </div>
              </div>

              {/* Feature list */}
              <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                {[
                  { ok: hasFaceReg, label: locale === 'en' ? 'Face Recognition (128-point AI)' : 'Pengenalan Wajah (AI 128-titik)' },
                  { ok: hasFaceReg, label: locale === 'en' ? 'Liveness Detection (3 challenges)' : 'Deteksi Keaktifan (3 tantangan)' },
                  { ok: true, label: locale === 'en' ? 'Multi-layer GPS verification' : 'Verifikasi GPS berlapis' },
                  { ok: true, label: locale === 'en' ? 'Anti-Fake GPS Trust Score' : 'Skor Kepercayaan Anti-Fake GPS' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ color: f.ok ? '#22c55e' : 'var(--muted)', fontWeight: 700 }}>{f.ok ? '✓' : '○'}</span>
                    <span style={{ color: f.ok ? 'var(--text)' : 'var(--muted)' }}>{f.label}</span>
                  </div>
                ))}
              </div>

              {/* Privacy note */}
              <div style={{ padding: '10px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 4 }}> {locale === 'en' ? 'Privacy First' : 'Privasi Utama'}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {locale === 'en'
                    ? 'Face data is stored as mathematical vectors (128 numbers), not photos. Processing is done on-device. Your biometric data never leaves your phone.'
                    : 'Data wajah disimpan sebagai angka matematis (128 nilai), bukan foto. Pemrosesan dilakukan di perangkat. Data biometrik tidak pernah dikirim ke server.'}
                </div>
              </div>

              {/* Register / Re-register button */}
              <button
                onClick={() => setShowFaceRegSheet(true)}
                style={{
                  width: '100%', padding: '14px 20px',
                  background: hasFaceReg ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'linear-gradient(135deg,#3b82f6,#0047ab)',
                  color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <HiCamera size={16} />
                {hasFaceReg
                  ? (locale === 'en' ? 'Update Face Registration' : 'Perbarui Registrasi Wajah')
                  : (locale === 'en' ? 'Register Face Now' : 'Daftar Wajah Sekarang')}
              </button>
            </div>
          ) : (
            <div className="emp-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setShowFaceRegSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                  <HiXMark size={20} />
                </button>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{locale === 'en' ? 'Face ID Registration' : 'Registrasi Face ID'}</div>
              </div>
              <div style={{ padding: 16 }}>
                <FaceRegistration
                  employeeId={emp.id}
                  employeeName={emp.name}
                  locale={locale}
                  onComplete={async (descriptors) => {
                    setHasFaceReg(true);
                    setFaceCount(descriptors.length);
                    setShowFaceRegSheet(false);
                  }}
                  onClose={() => setShowFaceRegSheet(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACCOUNT TAB */}
      {activeTab === 'account' && (
        <div>
          {accountMsg.text && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14, fontSize: 13, fontWeight: 600, background: accountMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: accountMsg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
              {accountMsg.text}
            </div>
          )}
          <div className="emp-card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiEnvelope size={16} /> {locale === 'en' ? 'Change Email' : 'Ubah Email'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{locale === 'en' ? 'Current email:' : 'Email saat ini:'} {user?.email}</div>
            <input type="email" placeholder={locale === 'en' ? 'New email' : 'Email baru'} value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 10, fontSize: 13, background: 'var(--bg)', color: 'var(--text)' }} />
            <button
              disabled={savingAccount || !newEmail}
              onClick={async () => {
                setSavingAccount(true); setAccountMsg({ text: '', type: '' });
                const { error } = await supabase.auth.updateUser({ email: newEmail });
                setAccountMsg(error ? { text: error.message, type: 'error' } : { text: locale === 'en' ? 'Confirmation link sent to new email.' : 'Link konfirmasi dikirim ke email baru.', type: 'success' });
                if (!error) setNewEmail('');
                setSavingAccount(false);
              }}
              style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: savingAccount || !newEmail ? 0.5 : 1 }}
            >
              {savingAccount ? (locale === 'en' ? 'Saving...' : 'Menyimpan...') : (locale === 'en' ? 'Update Email' : 'Update Email')}
            </button>
          </div>

          <div className="emp-card">
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiLockClosed size={16} /> {locale === 'en' ? 'Change Password' : 'Ubah Password'}
            </div>
            <input type="password" placeholder={locale === 'en' ? 'New password' : 'Password baru'} value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 10, fontSize: 13, background: 'var(--bg)', color: 'var(--text)' }} />
            {newPassword && (
              <div style={{ marginBottom: 10, display: 'grid', gap: 3 }}>
                {[
                  { label: locale === 'en' ? 'Min 8 characters' : 'Min 8 karakter', ok: newPassword.length >= 8 },
                  { label: locale === 'en' ? 'Min 1 uppercase letter' : 'Min 1 huruf kapital', ok: /[A-Z]/.test(newPassword) },
                  { label: locale === 'en' ? 'Min 1 number' : 'Min 1 angka', ok: /[0-9]/.test(newPassword) },
                  { label: locale === 'en' ? 'Min 1 special char' : 'Min 1 karakter spesial', ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: r.ok ? 'var(--success)' : 'var(--muted)' }}>
                    <span>{r.ok ? '\u2713' : '\u25cf'}</span> {r.label}
                  </div>
                ))}
              </div>
            )}
            <input type="password" placeholder={locale === 'en' ? 'Confirm password' : 'Konfirmasi password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 4, fontSize: 13, background: 'var(--bg)', color: 'var(--text)' }} />
            {confirmPassword && newPassword !== confirmPassword && (
              <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 8 }}>{locale === 'en' ? 'Passwords do not match' : 'Password tidak cocok'}</div>
            )}
            <button
              disabled={savingAccount || !newPassword || !(newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) || newPassword !== confirmPassword}
              onClick={async () => {
                setSavingAccount(true); setAccountMsg({ text: '', type: '' });
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                setAccountMsg(error ? { text: error.message, type: 'error' } : { text: locale === 'en' ? 'Password changed successfully!' : 'Password berhasil diubah!', type: 'success' });
                if (!error) { setNewPassword(''); setConfirmPassword(''); }
                setSavingAccount(false);
              }}
              style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 6, opacity: savingAccount ? 0.5 : 1 }}
            >
              {savingAccount ? (locale === 'en' ? 'Saving...' : 'Menyimpan...') : (locale === 'en' ? 'Change Password' : 'Ubah Password')}
            </button>
          </div>
        </div>
      )}

      {/* LOGOUT */}
      <button onClick={handleLogout} style={{ width: '100%', marginTop: 24, padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--danger)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <HiArrowLeftOnRectangle /> {locale === 'en' ? 'Sign Out' : 'Logout'}
      </button>

      {/* UPDATE REQUEST BOTTOM SHEET */}
      <BottomSheet
        open={!!updateSheet}
        onClose={() => setUpdateSheet(null)}
        title={`${locale === 'en' ? 'Request Change' : 'Request Perubahan'}: ${updateSheet?.fieldLabel || ''}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setUpdateSheet(null)}>{locale === 'en' ? 'Cancel' : 'Batal'}</button>
            <button className="btn-primary" onClick={handleSubmitUpdateRequest} disabled={updateSubmitting || !updateValue}>
              {updateSubmitting ? (locale === 'en' ? 'Sending...' : 'Mengirim...') : <><HiPaperAirplane style={{ marginRight: 6 }} /> {locale === 'en' ? 'Send Request' : 'Kirim Request'}</>}
            </button>
          </>
        }
      >
        <div className="profile-update-form">
          <label>{locale === 'en' ? 'New Value / Description' : 'Nilai Baru / Keterangan'}</label>
          <textarea
            placeholder={locale === 'en' ? 'Enter new data...' : 'Masukkan data baru...'}
            value={updateValue}
            onChange={e => setUpdateValue(e.target.value)}
            style={{ minHeight: 80 }}
          />
        </div>
      </BottomSheet>

      {/* HELPDESK BOTTOM SHEET */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={locale === 'en' ? 'Create Helpdesk Ticket' : 'Buat Tiket Helpdesk'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setSheetOpen(false)}>{locale === 'en' ? 'Cancel' : 'Batal'}</button>
            <button className="btn-primary" onClick={handleSubmitHelpdesk} disabled={submitting}>
              {submitting ? (locale === 'en' ? 'Sending...' : 'Mengirim...') : <><HiPaperAirplane style={{ marginRight: 6 }} /> {locale === 'en' ? 'Submit' : 'Kirim'}</>}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>{locale === 'en' ? 'Category' : 'Kategori'}</label>
            <select value={helpdeskForm.category} onChange={e => setHelpdeskForm({ ...helpdeskForm, category: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
              <option>IT</option>
              <option>HR</option>
              <option>Finance</option>
              <option>{locale === 'en' ? 'Other' : 'Lainnya'}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>{locale === 'en' ? 'Subject' : 'Judul'}</label>
            <input type="text" placeholder={locale === 'en' ? 'Issue...' : 'Masalah...'} value={helpdeskForm.subject} onChange={e => setHelpdeskForm({ ...helpdeskForm, subject: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>{locale === 'en' ? 'Description' : 'Deskripsi'}</label>
            <textarea placeholder={locale === 'en' ? 'Details...' : 'Detail...'} value={helpdeskForm.description} onChange={e => setHelpdeskForm({ ...helpdeskForm, description: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: 100, background: 'var(--bg)', color: 'var(--text)' }} />
          </div>
        </div>
      </BottomSheet>
    </div>

      {/* ── QUICK EDIT SHEET (name / jabatan / telepon only) ── */}
      {quickEditOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}
          onClick={e => e.target === e.currentTarget && setQuickEditOpen(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 480, boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{locale === 'en' ? 'Edit Profile' : 'Edit Profil'}</div>
              <button onClick={() => setQuickEditOpen(false)} style={{ background: 'var(--bg)', border: 'none', cursor: 'pointer', color: 'var(--muted)', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiXMark size={18} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#D97706', marginBottom: 20, padding: '8px 12px', background: 'rgba(245,158,11,0.07)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HiLockClosed size={11} />
              {locale === 'en' ? 'Only Name, Position, and Phone can be changed by employees.' : 'Hanya Nama, Jabatan, dan Telepon yang dapat diubah oleh karyawan.'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {[
                { label: locale === 'en' ? 'Full Name' : 'Nama Lengkap', val: qeName, set: setQeName, type: 'text', ph: 'Nama lengkap' },
                { label: locale === 'en' ? 'Position / Job Title' : 'Jabatan', val: qePosition, set: setQePosition, type: 'text', ph: 'Staff, Senior Engineer...' },
                { label: locale === 'en' ? 'Phone / WhatsApp' : 'No. HP / WhatsApp', val: qePhone, set: setQePhone, type: 'tel', ph: '08xxxxxxxxxx' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>{f.label}</label>
                  <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setQuickEditOpen(false)} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {locale === 'en' ? 'Cancel' : 'Batal'}
              </button>
              <button onClick={handleQuickEditSave} disabled={qeSaving || !qeName}
                style={{ flex: 2, padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#0047AB,#2563eb)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: qeSaving || !qeName ? 'not-allowed' : 'pointer', opacity: qeSaving || !qeName ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {qeSaving
                  ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> {locale === 'en' ? 'Saving...' : 'Menyimpan...'}</>
                  : <><HiCheck size={16} /> {locale === 'en' ? 'Save Changes' : 'Simpan'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
