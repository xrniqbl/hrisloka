import { useState, useEffect } from 'react';
import {
  HiArrowPath,
  HiBellAlert,
  HiCalendarDays,
  HiCheck,
  HiClock,
  HiCurrencyDollar,
  HiPaperAirplane,
  HiPlus,
  HiXMark
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getMyLeaves, submitLeave, cancelLeave } from '../../services/leaveService';
import { getMyReimbursements, submitReimbursement } from '../../services/reimbursementService';
import { getMyOvertime, submitOvertime } from '../../services/overtimeService';
import { getEmployeeProjects } from '../../services/projectService';
import BottomSheet from '../../components/BottomSheet';
import { useRealtimeMultiple } from '../../hooks/useRealtime';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

const STATUS_MAP = {
  approved: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)'  },
  pending:  { color: '#D97706', bg: 'rgba(217,119,6,0.1)'  },
  rejected: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)'  },
};

function StatusBadge({ status, locale }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const labels = {
    en: { approved: 'Approved', pending: 'Pending', rejected: 'Rejected' },
    id: { approved: 'Disetujui', pending: 'Menunggu', rejected: 'Ditolak' },
  };
  return (
    <span style={{ fontSize: 10, fontWeight: 800, color: s.color, background: s.bg, padding: '3px 9px', borderRadius: 20, flexShrink: 0 }}>
      {(labels[locale] || labels.id)[status] || status}
    </span>
  );
}

export default function EmpSubmissions() {
  const { user  } = useAuth();
  const toast = useToast();
  const { locale } = useTranslation();
  const [emp, setEmp]           = useState(null);
  const [leaves, setLeaves]     = useState([]);
  const [reimburses, setReimburses] = useState([]);
  const [overtimes, setOvertimes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab]   = useState('cuti');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [sheetType, setSheetType]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [myProjects, setMyProjects] = useState([]);

  const [cutiForm, setCutiForm]     = useState({ type: 'Cuti Tahunan', startDate: '', endDate: '', reason: '' });
  const [reimbForm, setReimbForm]   = useState({ category: 'Transportasi', amount: '', notes: '', date: '' });
  const [lemburForm, setLemburForm] = useState({ date: '', hours: '', reason: '', projectId: '' });

  const load = async () => {
    const email = user?.email || user?.user_metadata?.email || '';
    const { data: empData } = await getEmployeeByEmail(email);
    if (empData) {
      setEmp(empData);
      const [lv, rb, ot, pj] = await Promise.all([
        getMyLeaves(empData.id),
        getMyReimbursements(empData.id),
        getMyOvertime(empData.id),
        getEmployeeProjects(empData.id),
      ]);
      setLeaves(lv.data || []);
      setReimburses(rb.data || []);
      setOvertimes(ot.data || []);
      setMyProjects((pj.data || []).filter(a => a.projects?.status === 'active'));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const refresh = async () => {
    if (!emp) return;
    const [lv, rb, ot] = await Promise.all([getMyLeaves(emp.id), getMyReimbursements(emp.id), getMyOvertime(emp.id)]);
    setLeaves(lv.data || []);
    setReimburses(rb.data || []);
    setOvertimes(ot.data || []);
  };

  useRealtimeMultiple([
    { table: 'leave_requests', onRefresh: refresh },
    { table: 'reimbursements', onRefresh: refresh },
    { table: 'overtime_requests', onRefresh: refresh },
  ]);

  useEffect(() => {
    const handler = () => { setLoading(true); load().then(() => setLoading(false)); };
    window.addEventListener('emp:refresh', handler);
    return () => window.removeEventListener('emp:refresh', handler);
  }, [emp]);

  const openSheet = (type) => { setSheetType(type); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setSheetType(''); };

  const handleSubmitCuti = async () => {
    if (!cutiForm.startDate || !cutiForm.endDate) return;
    setSubmitting(true);
    const days = Math.ceil((new Date(cutiForm.endDate) - new Date(cutiForm.startDate)) / 86400000) + 1;
    await submitLeave(emp.id, { type: cutiForm.type, startDate: cutiForm.startDate, endDate: cutiForm.endDate, days, reason: cutiForm.reason });
    setCutiForm({ type: 'Cuti Tahunan', startDate: '', endDate: '', reason: '' });
    await refresh(); setSubmitting(false); closeSheet();
    toast?.success(locale === 'en' ? 'Leave request submitted!' : 'Pengajuan cuti berhasil dikirim!');
  };

  const handleSubmitReimburse = async () => {
    if (!reimbForm.amount) return;
    setSubmitting(true);
    await submitReimbursement(emp.id, { category: reimbForm.category, amount: reimbForm.amount, notes: reimbForm.notes, date: reimbForm.date || new Date().toISOString().split('T')[0] });
    setReimbForm({ category: 'Transportasi', amount: '', notes: '', date: '' });
    await refresh(); setSubmitting(false); closeSheet();
    toast?.success(locale === 'en' ? 'Reimbursement submitted!' : 'Pengajuan reimburse berhasil!');
  };

  const handleSubmitLembur = async () => {
    if (!lemburForm.date || !lemburForm.hours) return;
    setSubmitting(true);
    await submitOvertime(emp.id, { date: lemburForm.date, hours: parseFloat(lemburForm.hours), reason: lemburForm.reason, projectId: lemburForm.projectId || null });
    setLemburForm({ date: '', hours: '', reason: '', projectId: '' });
    await refresh(); setSubmitting(false); closeSheet();
    toast?.success(locale === 'en' ? 'Overtime submitted!' : 'Pengajuan lembur berhasil!');
  };

  const handleCancelLeave = async (id) => {
    if (!window.confirm(locale === 'en' ? 'Cancel this leave request?' : 'Batalkan pengajuan cuti ini?')) return;
    setCancellingId(id);
    await cancelLeave(id);
    await refresh(); setCancellingId(null);
    toast?.success(locale === 'en' ? 'Leave cancelled.' : 'Pengajuan dibatalkan.');
  };

  const tabs = [
    { key: 'cuti',      label: locale === 'en' ? 'Leave' : 'Cuti',       icon: <HiCalendarDays size={14} />, count: leaves.length,     color: '#0047AB', sheetType: 'cuti' },
    { key: 'reimburse', label: locale === 'en' ? 'Reimburse' : 'Reimburse', icon: <HiCurrencyDollar size={14} />, count: reimburses.length, color: '#059669', sheetType: 'reimburse' },
    { key: 'lembur',    label: locale === 'en' ? 'Overtime' : 'Lembur',  icon: <HiClock size={14} />,    count: overtimes.length,  color: '#EF4444', sheetType: 'lembur' },
  ];

  const filterChips = [
    { key: 'all',      label: locale === 'en' ? 'All' : 'Semua' },
    { key: 'pending',  label: locale === 'en' ? 'Pending' : 'Menunggu' },
    { key: 'approved', label: locale === 'en' ? 'Approved' : 'Disetujui' },
    { key: 'rejected', label: locale === 'en' ? 'Rejected' : 'Ditolak' },
  ];

  if (loading) {
    return (
      <div style={{ animation: 'fadeInUp 0.3s ease' }}>
        <div className="skeleton" style={{ width: 130, height: 28, borderRadius: 8, marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ flex: 1, height: 64, borderRadius: 14 }} />)}
        </div>
        <div className="skeleton" style={{ height: 42, borderRadius: 12, marginBottom: 16 }} />
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14, marginBottom: 10 }} />)}
      </div>
    );
  }

  if (!emp) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>{locale === 'en' ? 'Employee data not found.' : 'Data karyawan tidak ditemukan.'}</div>;

  const activeTabData = tabs.find(t => t.key === activeTab);
  const currentList =
    activeTab === 'cuti'      ? leaves :
    activeTab === 'reimburse' ? reimburses :
    overtimes;
  const filteredList = currentList.filter(i => statusFilter === 'all' || i.status === statusFilter);

  // Count pending across all types
  const totalPending = leaves.filter(l => l.status === 'pending').length
    + reimburses.filter(r => r.status === 'pending').length
    + overtimes.filter(o => o.status === 'pending').length;

  return (
    <div className="emp-page">
      <div style={{ marginBottom: 20 }}>
        <h1 className="emp-page-title">
          {locale === 'en' ? 'Submissions' : 'Pengajuan'}
        </h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'Manage leave, reimbursement, and overtime' : 'Kelola cuti, reimburse, dan lembur'}
          {totalPending > 0 && (
            <span style={{ marginLeft: 8, background: '#EF4444', color: '#fff', padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
              {totalPending} {locale === 'en' ? 'pending' : 'menunggu'}
            </span>
          )}
        </p>
      </div>

      {/* Tab Cards � click to switch + quick submit */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          const pendingCount = currentList.filter(i => i.status === 'pending').length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '14px 8px',
                borderRadius: 16,
                border: isActive ? `2px solid ${tab.color}` : '1.5px solid var(--border-light)',
                background: isActive ? `${tab.color}10` : 'var(--surface)',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                transition: 'all 0.2s ease',
                boxShadow: isActive ? `0 4px 14px ${tab.color}22` : 'var(--shadow-sm)',
              }}
            >
              <div style={{ color: isActive ? tab.color : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, background: isActive ? `${tab.color}18` : 'var(--bg)' }}>
                {tab.icon}
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: isActive ? tab.color : 'var(--text-secondary)' }}>{tab.label}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: isActive ? tab.color : 'var(--muted)' }}>{tab.count}</div>
            </button>
          );
        })}
      </div>

      {/* Submit Button */}
      <button
        onClick={() => openSheet(activeTabData?.sheetType || activeTab)}
        style={{
          width: '100%', padding: '13px', marginBottom: 16,
          borderRadius: 'var(--radius-md)', border: 'none',
          background: activeTabData?.color || 'var(--primary)',
          color: '#fff', fontWeight: 800, fontSize: 14,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 6px 20px ${activeTabData?.color || 'var(--primary)'}33`,
          transition: 'all 0.2s ease',
        }}
      >
        <HiPlus size={16} />
        {locale === 'en' ? `New ${activeTabData?.label}` : `Ajukan ${activeTabData?.label}`}
      </button>

      {/* Status Filter Chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none' }}>
        {filterChips.map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{
            padding: '6px 14px', borderRadius: 99, border: '1.5px solid',
            borderColor: statusFilter === f.key ? activeTabData?.color || 'var(--primary)' : 'transparent',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            background: statusFilter === f.key ? `${activeTabData?.color || 'var(--primary)'}10` : 'var(--surface)',
            color: statusFilter === f.key ? activeTabData?.color || 'var(--primary)' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}>{f.label}</button>
        ))}
      </div>

      {/* List */}
      {filteredList.length === 0 ? (
        <div className="emp-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <HiBellAlert size={30} style={{ color: 'var(--border)', marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{locale === 'en' ? 'No submissions found' : 'Belum ada pengajuan'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{locale === 'en' ? 'Use the button above to submit.' : 'Gunakan tombol di atas untuk mengajukan.'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredList.map(item => {
            const sc = STATUS_MAP[item.status] || STATUS_MAP.pending;
            return (
              <div key={item.id} className="emp-card" style={{ padding: '14px 16px', borderLeft: `3px solid ${sc.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Cuti */}
                    {activeTab === 'cuti' && <><div style={{ fontSize: 14, fontWeight: 800 }}>{item.type}</div><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{item.start_date} � {item.end_date} � {item.days} {locale === 'en' ? 'days' : 'hari'}</div>{item.reason && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, fontStyle: 'italic' }}>{item.reason}</div>}</>}
                    {/* Reimburse */}
                    {activeTab === 'reimburse' && <><div style={{ fontSize: 14, fontWeight: 800 }}>{item.category}</div><div style={{ fontSize: 15, fontWeight: 900, color: 'var(--primary)', marginTop: 2 }}>Rp {(item.amount || 0).toLocaleString('id-ID')}</div>{item.notes && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.notes}</div>}<div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.date}</div></>}
                    {/* Overtime */}
                    {activeTab === 'lembur' && <><div style={{ fontSize: 14, fontWeight: 800 }}>{item.date}</div><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{item.hours} {locale === 'en' ? 'hrs' : 'jam'}{item.rate ? ` � ${item.rate}x` : ''}</div>{item.reason && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontStyle: 'italic' }}>{item.reason}</div>}</>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <StatusBadge status={item.status} locale={locale} />
                    {activeTab === 'cuti' && item.status === 'pending' && (
                      <button
                        onClick={() => handleCancelLeave(item.id)}
                        disabled={cancellingId === item.id}
                        style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(220,38,38,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#DC2626' }}
                      >
                        {cancellingId === item.id ? <HiArrowPath size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <HiXMark size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* -- Leave Bottom Sheet -- */}
      <BottomSheet open={sheetOpen && sheetType === 'cuti'} onClose={closeSheet}
        title={locale === 'en' ? 'Apply for Leave' : 'Ajukan Cuti'}
        footer={<><button className="btn-secondary" onClick={closeSheet}>{locale === 'en' ? 'Cancel' : 'Batal'}</button><button className="btn-primary" onClick={handleSubmitCuti} disabled={submitting}>{submitting ? <HiArrowPath size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><HiPaperAirplane style={{ marginRight: 6 }} />{locale === 'en' ? 'Submit' : 'Kirim'}</>}</button></>}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div><label className="emp-field-label">{locale === 'en' ? 'Leave Type' : 'Jenis Cuti'}</label>
            <select value={cutiForm.type} onChange={e => setCutiForm({ ...cutiForm, type: e.target.value })} className="emp-field-input">
              <option>{locale === 'en' ? 'Annual Leave' : 'Cuti Tahunan'}</option>
              <option>{locale === 'en' ? 'Sick Leave' : 'Sakit'}</option>
              <option>{locale === 'en' ? 'Permission' : 'Izin'}</option>
              <option>{locale === 'en' ? 'Emergency' : 'Darurat'}</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="emp-field-label">{locale === 'en' ? 'From' : 'Dari'}</label><input type="date" value={cutiForm.startDate} onChange={e => setCutiForm({ ...cutiForm, startDate: e.target.value })} className="emp-field-input" /></div>
            <div><label className="emp-field-label">{locale === 'en' ? 'Until' : 'Sampai'}</label><input type="date" value={cutiForm.endDate} onChange={e => setCutiForm({ ...cutiForm, endDate: e.target.value })} className="emp-field-input" /></div>
          </div>
          {cutiForm.startDate && cutiForm.endDate && (
            <div style={{ padding: '8px 12px', background: 'rgba(0,71,171,0.06)', borderRadius: 10, fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
              {Math.ceil((new Date(cutiForm.endDate) - new Date(cutiForm.startDate)) / 86400000) + 1} {locale === 'en' ? 'working days' : 'hari kerja'}
            </div>
          )}
          <div><label className="emp-field-label">{locale === 'en' ? 'Reason' : 'Alasan'}</label><textarea placeholder={locale === 'en' ? 'Reason...' : 'Alasan...'} value={cutiForm.reason} onChange={e => setCutiForm({ ...cutiForm, reason: e.target.value })} className="emp-field-textarea" /></div>
        </div>
      </BottomSheet>

      {/* -- Reimburse Bottom Sheet -- */}
      <BottomSheet open={sheetOpen && sheetType === 'reimburse'} onClose={closeSheet}
        title={locale === 'en' ? 'Submit Reimbursement' : 'Ajukan Reimburse'}
        footer={<><button className="btn-secondary" onClick={closeSheet}>{locale === 'en' ? 'Cancel' : 'Batal'}</button><button className="btn-primary" onClick={handleSubmitReimburse} disabled={submitting}>{submitting ? <HiArrowPath size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><HiPaperAirplane style={{ marginRight: 6 }} />{locale === 'en' ? 'Submit' : 'Kirim'}</>}</button></>}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div><label className="emp-field-label">{locale === 'en' ? 'Category' : 'Kategori'}</label>
            <select value={reimbForm.category} onChange={e => setReimbForm({ ...reimbForm, category: e.target.value })} className="emp-field-input">
              <option>Transportasi</option><option>Makan</option><option>Kesehatan</option><option>Operasional</option><option>{locale === 'en' ? 'Other' : 'Lainnya'}</option>
            </select>
          </div>
          <div><label className="emp-field-label">{locale === 'en' ? 'Amount (Rp)' : 'Jumlah (Rp)'}</label><input type="number" placeholder="0" value={reimbForm.amount} onChange={e => setReimbForm({ ...reimbForm, amount: e.target.value })} className="emp-field-input" /></div>
          <div><label className="emp-field-label">{locale === 'en' ? 'Date' : 'Tanggal'}</label><input type="date" value={reimbForm.date} onChange={e => setReimbForm({ ...reimbForm, date: e.target.value })} className="emp-field-input" /></div>
          <div><label className="emp-field-label">{locale === 'en' ? 'Description' : 'Catatan'}</label><textarea placeholder={locale === 'en' ? 'Expense detail...' : 'Detail pengeluaran...'} value={reimbForm.notes} onChange={e => setReimbForm({ ...reimbForm, notes: e.target.value })} className="emp-field-textarea" /></div>
        </div>
      </BottomSheet>

      {/* -- Overtime Bottom Sheet -- */}
      <BottomSheet open={sheetOpen && sheetType === 'lembur'} onClose={closeSheet}
        title={locale === 'en' ? 'Request Overtime' : 'Ajukan Lembur'}
        footer={<><button className="btn-secondary" onClick={closeSheet}>{locale === 'en' ? 'Cancel' : 'Batal'}</button><button className="btn-primary" onClick={handleSubmitLembur} disabled={submitting}>{submitting ? <HiArrowPath size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><HiPaperAirplane style={{ marginRight: 6 }} />{locale === 'en' ? 'Submit' : 'Kirim'}</>}</button></>}>
        <div style={{ display: 'grid', gap: 14 }}>
          {myProjects.length > 0 && (
            <div><label className="emp-field-label">{locale === 'en' ? 'Project (optional)' : 'Proyek (opsional)'}</label>
              <select value={lemburForm.projectId} onChange={e => setLemburForm({ ...lemburForm, projectId: e.target.value })} className="emp-field-input">
                <option value="">{locale === 'en' ? '� No Project �' : '� Tanpa Proyek �'}</option>
                {myProjects.map(a => <option key={a.projects?.id} value={a.projects?.id}>{a.projects?.name}</option>)}
              </select>
            </div>
          )}
          <div><label className="emp-field-label">{locale === 'en' ? 'Date' : 'Tanggal'}</label><input type="date" value={lemburForm.date} onChange={e => setLemburForm({ ...lemburForm, date: e.target.value })} className="emp-field-input" /></div>
          <div><label className="emp-field-label">{locale === 'en' ? 'Hours' : 'Jumlah Jam'}</label><input type="number" step="0.5" min="0.5" placeholder="2" value={lemburForm.hours} onChange={e => setLemburForm({ ...lemburForm, hours: e.target.value })} className="emp-field-input" /></div>
          <div><label className="emp-field-label">{locale === 'en' ? 'Reason' : 'Alasan'}</label><textarea placeholder={locale === 'en' ? 'Reason for overtime...' : 'Alasan lembur...'} value={lemburForm.reason} onChange={e => setLemburForm({ ...lemburForm, reason: e.target.value })} className="emp-field-textarea" /></div>
        </div>
      </BottomSheet>
    </div>
  );
}
