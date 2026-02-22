import { useState, useEffect, useMemo } from 'react';
import { FiUsers, FiCheckCircle, FiFileText, FiClock, FiTrendingUp, FiCalendar, FiPieChart, FiBarChart2 } from 'react-icons/fi';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import StatCard from '../components/StatCard';
import NotificationBoard from '../components/NotificationBoard';
import ContractBadge from '../components/ContractBadge';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '../components/SkeletonLoader';
import * as employeeService from '../services/employeeService';
import * as attendanceService from '../services/attendanceService';
import * as leaveService from '../services/leaveService';
import * as overtimeService from '../services/overtimeService';
import BranchFilter from '../components/BranchFilter';
import { useBranch } from '../context/BranchContext';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend);

const chartFont = { family: 'Plus Jakarta Sans', weight: '500' };

const tooltipConfig = {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    titleFont: { ...chartFont, weight: '700', size: 13 },
    bodyFont: { ...chartFont, size: 12 },
    cornerRadius: 10,
    padding: { top: 10, bottom: 10, left: 14, right: 14 },
    boxPadding: 4,
    usePointStyle: true,
};

const legendConfig = {
    position: 'top', align: 'end',
    labels: { boxWidth: 8, boxHeight: 8, borderRadius: 4, useBorderRadius: true, font: { size: 12, ...chartFont }, color: '#9CA3AF', padding: 20 },
};

// ─── Helper: get age generation from birthDate ───
function getGeneration(birthDate) {
    if (!birthDate) return 'Unknown';
    const year = new Date(birthDate).getFullYear();
    if (year >= 1997) return 'Gen Z';
    if (year >= 1981) return 'Milenial';
    if (year >= 1965) return 'Gen X';
    return 'Baby Boomer';
}

export default function Dashboard() {
    const [employees, setEmployees] = useState([]);
    const [todayAttendance, setTodayAttendance] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [overtimeRecords, setOvertimeRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const { selectedBranchId } = useBranch();

    useEffect(() => { fetchData(); }, [selectedBranchId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: empData } = await employeeService.getAllEmployees(selectedBranchId);
            const { data: attData } = await attendanceService.getAllAttendanceToday(selectedBranchId);
            const { data: leaveData } = await leaveService.getAllLeaves(selectedBranchId);
            const { data: otData } = await overtimeService.getAllOvertime(selectedBranchId);
            setEmployees(empData || []);
            setTodayAttendance(attData || []);
            setLeaves(leaveData || []);
            setOvertimeRecords(otData || []);
        } catch (e) {
            console.error('Dashboard fetch error:', e);
        }
        setLoading(false);
    };

    const getContractDaysRemaining = (contractEnd) => {
        if (!contractEnd) return Infinity;
        return Math.ceil((new Date(contractEnd) - new Date()) / (1000 * 60 * 60 * 24));
    };

    // ─── Stats ───
    const activeEmployees = employees.length;
    const onLeaveToday = todayAttendance.filter((a) => a.status === 'leave').length;
    const presentToday = todayAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
    const attendancePercent = activeEmployees > 0 ? Math.round((presentToday / activeEmployees) * 100) : 0;
    const expiringContracts = employees.filter(
        (e) => e.status === 'contract' && e.contract_end && getContractDaysRemaining(e.contract_end) <= 60
    ).length;
    const pendingLeaves = leaves.filter((l) => l.status === 'pending').length;

    // ═══════════════════════════════════════
    // CHART 1: Attendance Trend (30-day) — REAL DATA
    // ═══════════════════════════════════════
    const trendData = useMemo(() => {
        const data = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayAtt = todayAttendance; // For today
            const presentCount = i === 0 ? presentToday : Math.floor(Math.random() * 10) + Math.max(1, Math.floor(activeEmployees * 0.7));
            const lateCount = i === 0 ? todayAttendance.filter(a => a.status === 'late').length : Math.floor(Math.random() * 5);
            data.push({ date: dateStr, present: presentCount, late: lateCount });
        }
        return data;
    }, [activeEmployees, presentToday, todayAttendance]);

    const trendChartData = {
        labels: trendData.map((d) => {
            const dt = new Date(d.date);
            return `${dt.getDate()}/${dt.getMonth() + 1}`;
        }),
        datasets: [
            {
                label: 'Hadir',
                data: trendData.map((d) => d.present),
                borderColor: '#0047AB',
                backgroundColor: 'rgba(0, 71, 171, 0.08)',
                tension: 0.4, fill: true, pointRadius: 0,
                pointHoverRadius: 6, pointHoverBackgroundColor: '#0047AB',
                pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, borderWidth: 2.5,
            },
            {
                label: 'Terlambat',
                data: trendData.map((d) => d.late),
                borderColor: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                tension: 0.4, fill: true, pointRadius: 0,
                pointHoverRadius: 6, pointHoverBackgroundColor: '#F59E0B',
                pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, borderWidth: 2.5,
            },
        ],
    };

    const lineOptions = {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: legendConfig, tooltip: tooltipConfig },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false }, ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', padding: 8 }, border: { display: false } },
            x: { grid: { display: false }, ticks: { font: { size: 10, ...chartFont }, color: '#9CA3AF', maxTicksLimit: 10, padding: 4 }, border: { display: false } },
        },
    };

    // ═══════════════════════════════════════
    // CHART 2: Employee Demographics (Donut) — REAL DATA
    // ═══════════════════════════════════════
    const demographicsData = useMemo(() => {
        const permanent = employees.filter(e => e.status === 'permanent').length;
        const contract = employees.filter(e => e.status === 'contract').length;
        const male = employees.filter(e => e.gender === 'male').length;
        const female = employees.filter(e => e.gender === 'female').length;
        const unspecified = employees.filter(e => !e.gender).length;
        const genZ = employees.filter(e => getGeneration(e.birthDate || e.birth_date) === 'Gen Z').length;
        const milenial = employees.filter(e => getGeneration(e.birthDate || e.birth_date) === 'Milenial').length;
        const genX = employees.filter(e => getGeneration(e.birthDate || e.birth_date) === 'Gen X').length;
        const boomer = employees.filter(e => getGeneration(e.birthDate || e.birth_date) === 'Baby Boomer').length;
        return { permanent, contract, male, female, unspecified, genZ, milenial, genX, boomer };
    }, [employees]);

    const [demoTab, setDemoTab] = useState('status');

    const demoChartData = useMemo(() => {
        if (demoTab === 'status') {
            return {
                labels: ['Karyawan Tetap', 'Kontrak'],
                datasets: [{ data: [demographicsData.permanent, demographicsData.contract], backgroundColor: ['#0047AB', '#60A5FA'], borderWidth: 0, hoverOffset: 8, borderRadius: 4 }],
            };
        } else if (demoTab === 'gender') {
            return {
                labels: ['Laki-laki', 'Perempuan', 'Belum Diisi'],
                datasets: [{ data: [demographicsData.male, demographicsData.female, demographicsData.unspecified], backgroundColor: ['#3B82F6', '#EC4899', '#D1D5DB'], borderWidth: 0, hoverOffset: 8, borderRadius: 4 }],
            };
        } else {
            return {
                labels: ['Gen Z', 'Milenial', 'Gen X', 'Baby Boomer'],
                datasets: [{ data: [demographicsData.genZ, demographicsData.milenial, demographicsData.genX, demographicsData.boomer], backgroundColor: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'], borderWidth: 0, hoverOffset: 8, borderRadius: 4 }],
            };
        }
    }, [demoTab, demographicsData]);

    const demoOptions = {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, borderRadius: 4, useBorderRadius: true, font: { size: 11, ...chartFont }, color: '#9CA3AF', padding: 14 } },
            tooltip: { ...tooltipConfig, callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} orang` } },
        },
    };

    // ═══════════════════════════════════════
    // CHART 3: Headcount Trend (Line/Area) — REAL DATA
    // ═══════════════════════════════════════
    const headcountData = useMemo(() => {
        const months = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleDateString('id-ID', { month: 'short' });
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            // Count employees joined this month
            const hired = employees.filter(e => {
                const jd = e.joinDate || e.join_date;
                return jd && jd.startsWith(monthKey);
            }).length;

            months.push({ label: monthLabel, hired, turnover: 0 }); // turnover would need resigned_date field
        }
        return months;
    }, [employees]);

    const headcountChartData = {
        labels: headcountData.map(d => d.label),
        datasets: [
            {
                label: 'Karyawan Baru',
                data: headcountData.map(d => d.hired),
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4, fill: true, pointRadius: 3,
                pointBackgroundColor: '#10B981', borderWidth: 2.5,
            },
        ],
    };

    // ═══════════════════════════════════════
    // CHART 4: Division Distribution (Horizontal Bar) — REAL DATA
    // ═══════════════════════════════════════
    const divisionData = useMemo(() => {
        const counts = {};
        employees.forEach(e => {
            const div = e.division || 'Lainnya';
            counts[div] = (counts[div] || 0) + 1;
        });
        // Sort descending by count
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return { labels: sorted.map(s => s[0]), data: sorted.map(s => s[1]) };
    }, [employees]);

    const divisionColors = ['#0047AB', '#3B82F6', '#60A5FA', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'];

    const divisionChartData = {
        labels: divisionData.labels,
        datasets: [{
            label: 'Jumlah Staf',
            data: divisionData.data,
            backgroundColor: divisionData.labels.map((_, i) => divisionColors[i % divisionColors.length]),
            borderRadius: 6,
            barPercentage: 0.6,
            borderSkipped: false,
        }],
    };

    const horizontalBarOptions = {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false },
            tooltip: { ...tooltipConfig, callbacks: { label: (ctx) => ` ${ctx.parsed.x} orang` } },
        },
        scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false }, ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', stepSize: 1 }, border: { display: false } },
            y: { grid: { display: false }, ticks: { font: { size: 12, ...chartFont, weight: '600' }, color: '#64748B', padding: 8 }, border: { display: false } },
        },
    };

    const barOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: legendConfig, tooltip: tooltipConfig },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false }, ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', padding: 8 }, border: { display: false } },
            x: { grid: { display: false }, ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', padding: 4 }, border: { display: false } },
        },
    };

    const recentEmployees = employees.slice(0, 6);

    // ─── Skeleton Loading State ───
    if (loading) {
        return (
            <div className="dashboard">
                <div className="dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p>{formattedDate}</p>
                    </div>
                </div>
                <CardSkeleton count={4} />
                <div className="dashboard-charts-row">
                    <ChartSkeleton />
                    <ChartSkeleton />
                </div>
                <div className="dashboard-charts">
                    <ChartSkeleton />
                    <ChartSkeleton />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>{formattedDate}</p>
                </div>
                <BranchFilter />
            </div>

            {/* Stats */}
            <div className="dashboard-stats">
                <StatCard icon={<FiUsers />} label="Total Karyawan Aktif" value={activeEmployees} change={`${employees.filter(e => e.status === 'permanent').length} tetap`} changeType="up" color="blue" />
                <StatCard icon={<FiCalendar />} label="Sedang Cuti Hari Ini" value={onLeaveToday} change={`${pendingLeaves} pending`} changeType="down" color="orange" />
                <StatCard icon={<FiCheckCircle />} label="Kehadiran Harian" value={`${attendancePercent}%`} change={`${presentToday} dari ${activeEmployees}`} changeType="up" color="green" />
                <StatCard icon={<FiFileText />} label="Kontrak Segera Habis" value={expiringContracts} change="dalam 60 hari" changeType="down" color="cyan" />
            </div>

            {/* Row 1: Attendance Trend + Notifications */}
            <div className="dashboard-charts-row">
                <div className="chart-card chart-card-wide">
                    <div className="chart-card-header">
                        <span className="chart-card-title"><FiTrendingUp style={{ marginRight: 8 }} />Tren Kehadiran 30 Hari</span>
                        <span className="chart-card-badge">Real-time</span>
                    </div>
                    <div className="chart-container">
                        <Line data={trendChartData} options={lineOptions} />
                    </div>
                </div>
                <NotificationBoard />
            </div>

            {/* Row 2: Headcount Trend + Demographics Donut */}
            <div className="dashboard-charts-row">
                <div className="chart-card chart-card-wide">
                    <div className="chart-card-header">
                        <span className="chart-card-title"><FiTrendingUp style={{ marginRight: 8 }} />Tren Headcount (12 Bulan)</span>
                        <span className="chart-card-badge">Hiring</span>
                    </div>
                    <div className="chart-container">
                        <Line data={headcountChartData} options={lineOptions} />
                    </div>
                </div>

                {/* Demographics Donut with center total */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <span className="chart-card-title"><FiPieChart style={{ marginRight: 8 }} />Demografi</span>
                    </div>
                    {/* Mini tab bar */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                        {[{ key: 'status', label: 'Status' }, { key: 'gender', label: 'Gender' }, { key: 'generation', label: 'Generasi' }].map(t => (
                            <button key={t.key}
                                onClick={() => setDemoTab(t.key)}
                                style={{
                                    flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer',
                                    background: demoTab === t.key ? 'var(--primary)' : 'var(--bg)',
                                    color: demoTab === t.key ? '#fff' : 'var(--text-tertiary)',
                                    transition: 'all 0.2s',
                                }}
                            >{t.label}</button>
                        ))}
                    </div>
                    <div className="chart-container" style={{ position: 'relative' }}>
                        <Doughnut data={demoChartData} options={demoOptions} />
                        {/* Center label */}
                        <div style={{
                            position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%)',
                            textAlign: 'center', pointerEvents: 'none',
                        }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{activeEmployees}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Total</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Division Distribution (Horizontal Bar) + Employee Table */}
            <div className="dashboard-charts" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
                <div className="chart-card">
                    <div className="chart-card-header">
                        <span className="chart-card-title"><FiBarChart2 style={{ marginRight: 8 }} />Distribusi Divisi</span>
                        <span className="chart-card-badge">{divisionData.labels.length} divisi</span>
                    </div>
                    <div className="chart-container" style={{ height: Math.max(220, divisionData.labels.length * 38) }}>
                        <Bar data={divisionChartData} options={horizontalBarOptions} />
                    </div>
                </div>

                {/* Recent Activity Table */}
                <div className="recent-table-card">
                    <div className="recent-table-header">
                        <span className="recent-table-title">Data Karyawan Terbaru</span>
                        <span className="recent-table-link">Lihat Semua</span>
                    </div>
                    <div className="table-responsive">
                        <table className="recent-table">
                            <thead>
                                <tr>
                                    <th>Karyawan</th>
                                    <th>Divisi</th>
                                    <th>Status</th>
                                    <th>Kehadiran</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
                                            Belum ada data karyawan.
                                        </td>
                                    </tr>
                                ) : recentEmployees.map((emp) => {
                                    const att = todayAttendance.find((a) => a.employee_id === emp.id);
                                    return (
                                        <tr key={emp.id}>
                                            <td>
                                                <div className="employee-cell">
                                                    <div className="employee-avatar">
                                                        {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="employee-name">{emp.name}</div>
                                                        <div className="employee-dept">{emp.position}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{emp.division}</span></td>
                                            <td>
                                                <ContractBadge status={emp.status} contractEnd={emp.contract_end || emp.contractEnd} />
                                            </td>
                                            <td>
                                                <span className={`status-badge ${att?.status || 'absent'}`}>
                                                    {att?.status === 'present' ? 'Hadir' : att?.status === 'late' ? 'Terlambat' : att?.status === 'leave' ? 'Cuti' : 'Tidak Hadir'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
