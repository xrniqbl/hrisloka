import { useState, useEffect } from 'react';
import { FiCalendar, FiDollarSign, FiClock, FiSend, FiLoader, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getMyLeaves, submitLeave } from '../../services/leaveService';
import { getMyReimbursements, submitReimbursement } from '../../services/reimbursementService';
import { getMyOvertime, submitOvertime } from '../../services/overtimeService';
import { getEmployeeProjects } from '../../services/projectService';
import BottomSheet from '../../components/BottomSheet';
import '../../styles/shared.css';

export default function EmpSubmissions() {
    const { user } = useAuth();
    const [emp, setEmp] = useState(null);
    const [leaves, setLeaves] = useState([]);
    const [reimburses, setReimburses] = useState([]);
    const [overtimes, setOvertimes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('cuti');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetType, setSheetType] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [myProjects, setMyProjects] = useState([]);

    // Forms
    const [cutiForm, setCutiForm] = useState({ type: 'Cuti Tahunan', startDate: '', endDate: '', reason: '' });
    const [reimbForm, setReimbForm] = useState({ category: 'Transportasi', amount: '', notes: '', date: '' });
    const [lemburForm, setLemburForm] = useState({ date: '', hours: '', reason: '', projectId: '' });

    useEffect(() => {
        async function load() {
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
        }
        load();
    }, [user]);

    const refresh = async () => {
        if (!emp) return;
        const [lv, rb, ot] = await Promise.all([
            getMyLeaves(emp.id),
            getMyReimbursements(emp.id),
            getMyOvertime(emp.id),
        ]);
        setLeaves(lv.data || []);
        setReimburses(rb.data || []);
        setOvertimes(ot.data || []);
    };

    const openSheet = (type) => { setSheetType(type); setSheetOpen(true); };
    const closeSheet = () => { setSheetOpen(false); setSheetType(''); };

    const handleSubmitCuti = async () => {
        if (!cutiForm.startDate || !cutiForm.endDate) return;
        setSubmitting(true);
        const days = Math.ceil((new Date(cutiForm.endDate) - new Date(cutiForm.startDate)) / 86400000) + 1;
        await submitLeave(emp.id, { type: cutiForm.type, startDate: cutiForm.startDate, endDate: cutiForm.endDate, days, reason: cutiForm.reason });
        setCutiForm({ type: 'Cuti Tahunan', startDate: '', endDate: '', reason: '' });
        await refresh();
        setSubmitting(false);
        closeSheet();
    };

    const handleSubmitReimburse = async () => {
        if (!reimbForm.amount) return;
        setSubmitting(true);
        await submitReimbursement(emp.id, { category: reimbForm.category, amount: reimbForm.amount, notes: reimbForm.notes, date: reimbForm.date || new Date().toISOString().split('T')[0] });
        setReimbForm({ category: 'Transportasi', amount: '', notes: '', date: '' });
        await refresh();
        setSubmitting(false);
        closeSheet();
    };

    const handleSubmitLembur = async () => {
        if (!lemburForm.date || !lemburForm.hours || !lemburForm.projectId) return;
        setSubmitting(true);
        await submitOvertime(emp.id, { date: lemburForm.date, hours: parseFloat(lemburForm.hours), reason: lemburForm.reason, projectId: lemburForm.projectId });
        setLemburForm({ date: '', hours: '', reason: '', projectId: '' });
        await refresh();
        setSubmitting(false);
        closeSheet();
    };

    const statusColor = (s) => s === 'approved' ? 'var(--success)' : s === 'rejected' ? 'var(--danger)' : 'var(--warning)';
    const statusLabel = (s) => s === 'approved' ? 'Disetujui' : s === 'rejected' ? 'Ditolak' : 'Menunggu';

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
                <FiLoader size={28} style={{ animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>Memuat pengajuan...</span>
            </div>
        );
    }

    if (!emp) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Data tidak ditemukan.</div>;

    const sections = [
        { key: 'cuti', label: 'Cuti', icon: <FiCalendar />, count: leaves.length, color: '#2563EB' },
        { key: 'reimburse', label: 'Reimburse', icon: <FiDollarSign />, count: reimburses.length, color: '#10B981' },
        { key: 'lembur', label: 'Lembur', icon: <FiClock />, count: overtimes.length, color: '#F59E0B' },
    ];

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>📋 Pengajuan</h1>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Kelola pengajuan cuti, reimburse, dan lembur</p>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {sections.map(s => (
                    <button key={s.key} onClick={() => openSheet(s.key)} style={{
                        padding: '14px 8px', borderRadius: 'var(--radius-md)',
                        background: s.color, color: '#fff', border: 'none',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        boxShadow: `0 4px 12px ${s.color}33`,
                    }}>
                        <div style={{ fontSize: 20 }}>{s.icon}</div>
                        + {s.label}
                    </button>
                ))}
            </div>

            {/* Section Tabs */}
            <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 16, border: '1px solid var(--border)' }}>
                {sections.map(s => (
                    <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
                        flex: 1, padding: '10px 6px', borderRadius: 'var(--radius-sm)', border: 'none',
                        background: activeSection === s.key ? 'var(--primary)' : 'transparent',
                        color: activeSection === s.key ? '#fff' : 'var(--muted)',
                        fontWeight: 600, fontSize: 12, cursor: 'pointer',
                    }}>
                        {s.label} ({s.count})
                    </button>
                ))}
            </div>

            {/* Cuti List */}
            {activeSection === 'cuti' && (
                <div style={{ display: 'grid', gap: 8 }}>
                    {leaves.length === 0 ? (
                        <div className="emp-card" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>Belum ada pengajuan cuti</div>
                    ) : leaves.map(l => (
                        <div key={l.id} className="emp-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>{l.type}</div>
                                <div style={{ color: 'var(--muted)', fontSize: 11 }}>{l.start_date} — {l.end_date} ({l.days} hari)</div>
                                {l.reason && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{l.reason}</div>}
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(l.status), textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{statusLabel(l.status)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Reimbursement List */}
            {activeSection === 'reimburse' && (
                <div style={{ display: 'grid', gap: 8 }}>
                    {reimburses.length === 0 ? (
                        <div className="emp-card" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>Belum ada pengajuan reimburse</div>
                    ) : reimburses.map(r => (
                        <div key={r.id} className="emp-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.category}</div>
                                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Rp {(r.amount || 0).toLocaleString('id-ID')} — {r.date}</div>
                                {r.notes && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{r.notes}</div>}
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(r.status), textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{statusLabel(r.status)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Overtime List */}
            {activeSection === 'lembur' && (
                <div style={{ display: 'grid', gap: 8 }}>
                    {overtimes.length === 0 ? (
                        <div className="emp-card" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>Belum ada pengajuan lembur</div>
                    ) : overtimes.map(o => (
                        <div key={o.id} className="emp-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{o.date}</div>
                                <div style={{ color: 'var(--muted)', fontSize: 11 }}>{o.hours} jam • Rate {o.rate}x</div>
                                {o.reason && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{o.reason}</div>}
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(o.status), textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{statusLabel(o.status)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Leave BottomSheet */}
            <BottomSheet open={sheetOpen && sheetType === 'cuti'} onClose={closeSheet} title="Ajukan Cuti"
                footer={<><button className="btn-secondary" onClick={closeSheet}>Batal</button><button className="btn-primary" onClick={handleSubmitCuti} disabled={submitting}>{submitting ? 'Mengirim...' : <><FiSend style={{ marginRight: 6 }} /> Kirim</>}</button></>}>
                <div style={{ display: 'grid', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Jenis Cuti</label>
                        <select value={cutiForm.type} onChange={e => setCutiForm({ ...cutiForm, type: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <option>Cuti Tahunan</option><option>Sakit</option><option>Izin</option>
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Dari</label>
                            <input type="date" value={cutiForm.startDate} onChange={e => setCutiForm({ ...cutiForm, startDate: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Sampai</label>
                            <input type="date" value={cutiForm.endDate} onChange={e => setCutiForm({ ...cutiForm, endDate: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Alasan</label>
                        <textarea placeholder="Alasan cuti..." value={cutiForm.reason} onChange={e => setCutiForm({ ...cutiForm, reason: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: 80 }} />
                    </div>
                </div>
            </BottomSheet>

            {/* Reimbursement BottomSheet */}
            <BottomSheet open={sheetOpen && sheetType === 'reimburse'} onClose={closeSheet} title="Ajukan Reimburse"
                footer={<><button className="btn-secondary" onClick={closeSheet}>Batal</button><button className="btn-primary" onClick={handleSubmitReimburse} disabled={submitting}>{submitting ? 'Mengirim...' : <><FiSend style={{ marginRight: 6 }} /> Kirim</>}</button></>}>
                <div style={{ display: 'grid', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Kategori</label>
                        <select value={reimbForm.category} onChange={e => setReimbForm({ ...reimbForm, category: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <option>Transportasi</option><option>Makan</option><option>Kesehatan</option><option>Operasional</option><option>Lainnya</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Jumlah (Rp)</label>
                        <input type="number" placeholder="0" value={reimbForm.amount} onChange={e => setReimbForm({ ...reimbForm, amount: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tanggal</label>
                        <input type="date" value={reimbForm.date} onChange={e => setReimbForm({ ...reimbForm, date: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Catatan</label>
                        <textarea placeholder="Detail pengeluaran..." value={reimbForm.notes} onChange={e => setReimbForm({ ...reimbForm, notes: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: 80 }} />
                    </div>
                </div>
            </BottomSheet>

            {/* Overtime BottomSheet */}
            <BottomSheet open={sheetOpen && sheetType === 'lembur'} onClose={closeSheet} title="Ajukan Lembur"
                footer={<><button className="btn-secondary" onClick={closeSheet}>Batal</button><button className="btn-primary" onClick={handleSubmitLembur} disabled={submitting || !lemburForm.projectId}>{submitting ? 'Mengirim...' : <><FiSend style={{ marginRight: 6 }} /> Kirim</>}</button></>}>
                <div style={{ display: 'grid', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Proyek *</label>
                        <select value={lemburForm.projectId} onChange={e => setLemburForm({ ...lemburForm, projectId: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <option value="">— Pilih Proyek —</option>
                            {myProjects.map(a => (
                                <option key={a.projects?.id} value={a.projects?.id}>{a.projects?.name}{a.projects?.client ? ` (${a.projects.client})` : ''}</option>
                            ))}
                        </select>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Lembur harus dikaitkan dengan proyek aktif</div>
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tanggal</label>
                        <input type="date" value={lemburForm.date} onChange={e => setLemburForm({ ...lemburForm, date: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Jumlah Jam</label>
                        <input type="number" step="0.5" min="0.5" placeholder="2" value={lemburForm.hours} onChange={e => setLemburForm({ ...lemburForm, hours: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Alasan</label>
                        <textarea placeholder="Alasan lembur..." value={lemburForm.reason} onChange={e => setLemburForm({ ...lemburForm, reason: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: 80 }} />
                    </div>
                </div>
            </BottomSheet>
        </div>
    );
}
