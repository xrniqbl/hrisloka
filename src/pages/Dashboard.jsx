import { useState, useEffect, useMemo } from 'react';
import { FiUsers, FiCheckCircle, FiFileText, FiClock, FiTrendingUp, FiCalendar } from 'react-icons/fi';
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
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend);

const chartFont = { family: 'Plus Jakarta Sans', weight: '500' };

// Elegant tooltip config
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

export default function Dashboard() {
    const [employees, setEmployees] = useState([]);
    const [todayAttendance, setTodayAttendance] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const today = new Date();
    const formattedDate = today.toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: empData } = await employeeService.getAllEmployees();
            const { data: attData } = await attendanceService.getAllAttendanceToday();
            const { data: leaveData } = await leaveService.getAllLeaves();
            setEmployees(empData || []);
            setTodayAttendance(attData || []);
            setLeaves(leaveData || []);
        } catch (e) {
            console.error('Dashboard fetch error:', e);
        }
        setLoading(false);
    };

    const getContractDaysRemaining = (contractEnd) => {
        if (!contractEnd) return Infinity;
        return Math.ceil((new Date(contractEnd) - new Date()) / (1000 * 60 * 60 * 24));
    };

    // Stats
    const activeEmployees = employees.length;
    const onLeaveToday = todayAttendance.filter((a) => a.status === 'leave').length;
    const presentToday = todayAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
    const attendancePercent = activeEmployees > 0 ? Math.round((presentToday / activeEmployees) * 100) : 0;
    const expiringContracts = employees.filter(
        (e) => e.status === 'contract' && e.contract_end && getContractDaysRemaining(e.contract_end) <= 60
    ).length;
    const pendingLeaves = leaves.filter((l) => l.status === 'pending').length;

    // 30-day trend data
    const trendData = useMemo(() => {
        const data = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const presentCount = Math.floor(Math.random() * 10) + (activeEmployees > 0 ? Math.floor(activeEmployees * 0.7) : 20);
            const lateCount = Math.floor(Math.random() * 5);
            data.push({ date: d.toISOString().split('T')[0], present: presentCount, late: lateCount });
        }
        if (data.length > 0) {
            data[data.length - 1].present = presentToday;
            data[data.length - 1].late = todayAttendance.filter(a => a.status === 'late').length;
        }
        return data;
    }, [activeEmployees, presentToday, todayAttendance]);

    // ─── Elegant Chart: Line with Fill ───
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
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#0047AB',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: 2.5,
            },
            {
                label: 'Terlambat',
                data: trendData.map((d) => d.late),
                borderColor: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#F59E0B',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: 2.5,
            },
        ],
    };

    const trendOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: legendConfig, tooltip: tooltipConfig },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false },
                ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', padding: 8 },
                border: { display: false },
            },
            x: {
                grid: { display: false },
                ticks: { font: { size: 10, ...chartFont }, color: '#9CA3AF', maxTicksLimit: 10, padding: 4 },
                border: { display: false },
            },
        },
    };

    // Salary doughnut
    const salaryData = {
        labels: ['Gaji Pokok', 'Tunjangan', 'Lembur', 'BPJS', 'PPh 21'],
        datasets: [{
            data: [55, 18, 10, 9, 8],
            backgroundColor: ['#0047AB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'],
            borderWidth: 0,
            hoverOffset: 8,
            borderRadius: 4,
        }],
    };

    const salaryOptions = {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, borderRadius: 4, useBorderRadius: true, font: { size: 11, ...chartFont }, color: '#9CA3AF', padding: 14 } },
            tooltip: { ...tooltipConfig, callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%` } },
        },
    };

    // Monthly attendance bar
    const attendanceBar = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            { label: 'Hadir', data: [220, 215, 230, 228, 225, 234, 231, 229, 226, 232, 228, 231], backgroundColor: '#0047AB', borderRadius: 6, barPercentage: 0.5, borderSkipped: false },
            { label: 'Absen', data: [28, 33, 18, 20, 23, 14, 17, 19, 22, 16, 20, 17], backgroundColor: '#93C5FD', borderRadius: 6, barPercentage: 0.5, borderSkipped: false },
        ],
    };

    const barOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: legendConfig, tooltip: tooltipConfig },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false },
                ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', padding: 8 },
                border: { display: false },
            },
            x: {
                grid: { display: false },
                ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', padding: 4 },
                border: { display: false },
            },
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
                    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-card)' }}>
                        <div className="skeleton skeleton-text short" style={{ height: 14, marginBottom: 16 }} />
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                                <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
                                <div className="skeleton skeleton-text" style={{ width: `${50 + Math.random() * 40}%`, height: 12, marginBottom: 0 }} />
                            </div>
                        ))}
                    </div>
                </div>
                <TableSkeleton rows={4} cols={4} />
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
            </div>

            {/* Stats */}
            <div className="dashboard-stats">
                <StatCard icon={<FiUsers />} label="Total Karyawan Aktif" value={activeEmployees} change={`${employees.filter(e => e.status === 'permanent').length} tetap`} changeType="up" color="blue" />
                <StatCard icon={<FiCalendar />} label="Sedang Cuti Hari Ini" value={onLeaveToday} change={`${pendingLeaves} pending`} changeType="down" color="orange" />
                <StatCard icon={<FiCheckCircle />} label="Kehadiran Harian" value={`${attendancePercent}%`} change={`${presentToday} dari ${activeEmployees}`} changeType="up" color="green" />
                <StatCard icon={<FiFileText />} label="Kontrak Segera Habis" value={expiringContracts} change="dalam 60 hari" changeType="down" color="cyan" />
            </div>

            {/* 30-day Trend + Notification */}
            <div className="dashboard-charts-row">
                <div className="chart-card chart-card-wide">
                    <div className="chart-card-header">
                        <span className="chart-card-title"><FiTrendingUp style={{ marginRight: 8 }} />Tren Kehadiran 30 Hari Terakhir</span>
                        <span className="chart-card-badge">Real-time</span>
                    </div>
                    <div className="chart-container">
                        <Line data={trendChartData} options={trendOptions} />
                    </div>
                </div>
                <NotificationBoard />
            </div>

            {/* Charts Row */}
            <div className="dashboard-charts">
                <div className="chart-card">
                    <div className="chart-card-header">
                        <span className="chart-card-title">Kehadiran Bulanan</span>
                        <span className="chart-card-badge">2026</span>
                    </div>
                    <div className="chart-container">
                        <Bar data={attendanceBar} options={barOptions} />
                    </div>
                </div>
                <div className="chart-card">
                    <div className="chart-card-header">
                        <span className="chart-card-title">Komposisi Gaji</span>
                        <span className="chart-card-badge">Bulan Ini</span>
                    </div>
                    <div className="chart-container">
                        <Doughnut data={salaryData} options={salaryOptions} />
                    </div>
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
    );
}
