import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiCalendar, FiFileText, FiMessageSquare, FiSend, FiMapPin, FiLoader, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getTodayAttendance } from '../../services/attendanceService';
import { getMyLeaves, submitLeave } from '../../services/leaveService';
import { submitTicket } from '../../services/ticketService';
import { formatCurrency } from '../../lib/utils';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import BottomSheet from '../../components/BottomSheet';
import '../../styles/shared.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function EmpDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [emp, setEmp] = useState(null);
    const [todayAtt, setTodayAtt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetType, setSheetType] = useState('');
    const [cutiForm, setCutiForm] = useState({ type: 'Cuti Tahunan', startDate: '', endDate: '', reason: '' });
    const [helpdeskForm, setHelpdeskForm] = useState({ category: 'IT Support', subject: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    // Load employee data from Supabase
    useEffect(() => {
        async function load() {
            const email = user?.email || user?.user_metadata?.email || 'ahmad.rizky@company.com';
            const { data } = await getEmployeeByEmail(email);
            if (data) {
                setEmp(data);
                const { data: att } = await getTodayAttendance(data.id);
                setTodayAtt(att);
            }
            setLoading(false);
        }
        load();
    }, [user]);

    // Live clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
                <FiLoader size={28} className="absen-spinner" style={{ animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>Memuat data...</span>
            </div>
        );
    }

    if (!emp) {
        return (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                <p>Data karyawan tidak ditemukan.</p>
                <p style={{ fontSize: 12 }}>Email: {user?.email}</p>
            </div>
        );
    }

    const leaveBalance = emp.leave_quota - emp.leave_used;
    const clockedIn = todayAtt?.clock_in && !todayAtt?.clock_out;

    const formatTime = (d) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatDate = (d) => d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const openSheet = (type) => { setSheetType(type); setSheetOpen(true); };
    const closeSheet = () => { setSheetOpen(false); setSheetType(''); };

    const handleSubmitCuti = async () => {
        if (!cutiForm.startDate || !cutiForm.endDate) return;
        setSubmitting(true);
        const days = Math.ceil((new Date(cutiForm.endDate) - new Date(cutiForm.startDate)) / 86400000) + 1;
        await submitLeave(emp.id, {
            type: cutiForm.type,
            startDate: cutiForm.startDate,
            endDate: cutiForm.endDate,
            days,
            reason: cutiForm.reason,
        });
        setSubmitting(false);
        closeSheet();
        setCutiForm({ type: 'Cuti Tahunan', startDate: '', endDate: '', reason: '' });
    };

    const handleSubmitHelpdesk = async () => {
        if (!helpdeskForm.subject) return;
        setSubmitting(true);
        await submitTicket(emp.id, {
            category: helpdeskForm.category,
            subject: helpdeskForm.subject,
            description: helpdeskForm.description,
        });
        setSubmitting(false);
        closeSheet();
        setHelpdeskForm({ category: 'IT Support', subject: '', description: '' });
    };

    return (
        <div>
            {/* Greeting */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 2 }}>
                    {formatDate(currentTime)}
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>
                    Halo, {emp.name.split(' ')[0]}! 👋
                </h1>
            </div>

            {/* Clock-In Card */}
            <div className="emp-card emp-card-gradient" style={{ marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
                    {clockedIn ? 'Anda sudah Clock-In' : todayAtt?.clock_out ? 'Sudah Clock-Out' : 'Belum Clock-In Hari Ini'}
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'monospace', marginBottom: 16 }}>
                    {formatTime(currentTime)}
                </div>
                <button
                    onClick={() => navigate('/app/absen')}
                    style={{
                        width: 120, height: 120, borderRadius: '50%',
                        background: clockedIn ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.2)',
                        border: '4px solid rgba(255,255,255,0.4)',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 4, margin: '0 auto', cursor: 'pointer',
                        boxShadow: clockedIn ? 'none' : '0 0 0 12px rgba(255,255,255,0.08), 0 0 0 24px rgba(255,255,255,0.04)',
                        transition: 'all 0.3s ease',
                    }}
                >
                    <FiMapPin size={24} />
                    <span>{clockedIn ? 'Clock Out' : 'Clock In'}</span>
                </button>
                {todayAtt && todayAtt.clock_in && (
                    <div style={{ marginTop: 12, fontSize: 13, opacity: 0.8 }}>
                        Clock-In: {todayAtt.clock_in} {todayAtt.clock_out ? `— Out: ${todayAtt.clock_out}` : ''}
                    </div>
                )}
            </div>

            {/* Widgets & Visualizer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="emp-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '100%', height: 120, position: 'relative' }}>
                        <Doughnut
                            data={{
                                labels: ['Terpakai', 'Sisa'],
                                datasets: [{
                                    data: [emp.leave_used, leaveBalance],
                                    backgroundColor: ['#E2E8F0', '#0047AB'],
                                    borderWidth: 0,
                                    cutout: '75%'
                                }]
                            }}
                            options={{
                                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                                maintainAspectRatio: false,
                            }}
                        />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 800 }}>{leaveBalance}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>Sisa</div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 12 }}>
                    <div className="emp-card" style={{ padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Status</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
                            {emp.status === 'permanent' ? '✓ Tetap' : '⏳ Kontrak'}
                        </div>
                    </div>
                    <div className="emp-card" style={{ padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Divisi</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{emp.division}</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Aksi Cepat</div>
            <div className="emp-quick-actions">
                <button className="emp-quick-btn" onClick={() => openSheet('cuti')}>
                    <div className="emp-quick-icon" style={{ background: 'var(--primary)' }}><FiCalendar /></div>
                    Ajukan Cuti
                </button>
                <button className="emp-quick-btn" onClick={() => openSheet('helpdesk')}>
                    <div className="emp-quick-icon" style={{ background: 'var(--warning)' }}><FiMessageSquare /></div>
                    Helpdesk
                </button>
                <button className="emp-quick-btn" onClick={() => navigate('/app/payslip')}>
                    <div className="emp-quick-icon" style={{ background: 'var(--success)' }}><FiFileText /></div>
                    Payslip
                </button>
                <button className="emp-quick-btn" onClick={() => navigate('/app/directory')}>
                    <div className="emp-quick-icon" style={{ background: '#6366F1' }}><FiUsers /></div>
                    Kontak
                </button>
            </div>

            {/* Leave Request Bottom Sheet */}
            <BottomSheet
                open={sheetOpen && sheetType === 'cuti'}
                onClose={closeSheet}
                title="Ajukan Cuti"
                footer={
                    <>
                        <button className="btn-secondary" onClick={closeSheet}>Batal</button>
                        <button className="btn-primary" onClick={handleSubmitCuti} disabled={submitting}>
                            {submitting ? 'Mengirim...' : <><FiSend style={{ marginRight: 6 }} /> Kirim</>}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'grid', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Jenis Cuti</label>
                        <select value={cutiForm.type} onChange={e => setCutiForm({ ...cutiForm, type: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <option>Cuti Tahunan</option>
                            <option>Sakit</option>
                            <option>Izin</option>
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

            {/* Helpdesk Bottom Sheet */}
            <BottomSheet
                open={sheetOpen && sheetType === 'helpdesk'}
                onClose={closeSheet}
                title="Tiket Helpdesk"
                footer={
                    <>
                        <button className="btn-secondary" onClick={closeSheet}>Batal</button>
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
                            <option>IT Support</option>
                            <option>HR</option>
                            <option>Fasilitas</option>
                            <option>Lainnya</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Judul</label>
                        <input type="text" placeholder="Ringkasan masalah..." value={helpdeskForm.subject} onChange={e => setHelpdeskForm({ ...helpdeskForm, subject: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Deskripsi</label>
                        <textarea placeholder="Detail masalah..." value={helpdeskForm.description} onChange={e => setHelpdeskForm({ ...helpdeskForm, description: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minHeight: 100 }} />
                    </div>
                </div>
            </BottomSheet>
        </div>
    );
}
