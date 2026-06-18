import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiCreditCard, FiAlertCircle, FiRefreshCw, FiBriefcase,
  FiArrowUpRight, FiArrowDownRight, FiTrendingUp,
} from 'react-icons/fi';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import * as founderService from '../../services/founderService';
import './founder.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend);

const chartFont = { family: 'Plus Jakarta Sans', weight: '500', size: 12 };

const tooltipConfig = {
  backgroundColor: 'rgba(10, 15, 30, 0.92)',
  titleFont: { ...chartFont, weight: '700', size: 12 },
  bodyFont: chartFont,
  cornerRadius: 8,
  padding: { top: 8, bottom: 8, left: 12, right: 12 },
  boxPadding: 3,
};

function formatIDR(n) {
  if (!n) return 'Rp 0';
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}k`;
  return `Rp ${n}`;
}

function SkeletonBox({ w = '60%', h = 28 }) {
  return (
    <div style={{
      height: h, background: 'var(--border)', borderRadius: 6,
      width: w, animation: 'fp-pulse 1.5s ease-in-out infinite',
    }} />
  );
}

function StatCard({ icon, label, value, change, changeType, iconBg, iconColor, loading }) {
  return (
    <div className="fp-stat">
      <div className="fp-stat-header">
        <div className="fp-stat-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
        {!loading && change && (
          <div className={`fp-stat-change ${changeType}`}>
            {changeType === 'up' && <FiArrowUpRight size={11} />}
            {changeType === 'down' && <FiArrowDownRight size={11} />}
            {change}
          </div>
        )}
      </div>
      {loading
        ? <SkeletonBox w="55%" h={28} />
        : <div className="fp-stat-value">{value}</div>}
      <div className="fp-stat-label" style={{ marginTop: 4 }}>{label}</div>
    </div>
  );
}

function EmptyChart({ text, sub }) {
  return (
    <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <FiTrendingUp size={32} style={{ color: 'var(--border)', strokeWidth: 1.5 }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{text}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

const PLAN_COLORS = { Free: '#94A3B8', Starter: '#3B82F6', Pro: '#8B5CF6', Enterprise: '#F59E0B' };

export default function FounderDashboard() {
  const [stats, setStats] = useState(null);
  const [revenueHistory, setRevenueHistory] = useState([]);
  const [subsHistory, setSubsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    try {
      const [statsRes, revRes, subsRes] = await Promise.all([
        founderService.getFounderDashboardStats(),
        founderService.getRevenueHistory(6),
        founderService.getSubscriberHistory(6),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (revRes.data) setRevenueHistory(revRes.data);
      if (subsRes.data) setSubsHistory(subsRes.data);
    } catch (err) {
      console.warn('[FounderDashboard] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  const handleRefresh = () => { setRefreshing(true); fetchAll(); };

  // Revenue chart
  const hasRevenue = revenueHistory.some(r => r.amount > 0);
  const revenueChartData = {
    labels: revenueHistory.map(r => r.label),
    datasets: [{
      label: 'Pendapatan',
      data: revenueHistory.map(r => r.amount),
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
      tension: 0.4, fill: true,
      pointRadius: 4, pointBackgroundColor: '#F59E0B',
      pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 2.5,
    }],
  };

  // Subscriber chart
  const hasSubs = subsHistory.some(s => s.count > 0);
  const subsChartData = {
    labels: subsHistory.map(s => s.label),
    datasets: [{
      label: 'Subscriber Aktif',
      data: subsHistory.map(s => s.count),
      borderColor: '#6366F1',
      backgroundColor: 'rgba(99, 102, 241, 0.08)',
      tension: 0.4, fill: true,
      pointRadius: 4, pointBackgroundColor: '#6366F1',
      pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 2.5,
    }],
  };

  const lineOptions = (yFormatter) => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: tooltipConfig },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        ticks: { font: chartFont, color: '#9CA3AF', padding: 6, callback: yFormatter || undefined },
        border: { display: false },
      },
      x: { grid: { display: false }, ticks: { font: chartFont, color: '#9CA3AF', padding: 4 }, border: { display: false } },
    },
  });

  // Plan distribution
  const planDist = stats?.planDist || {};
  const planLabels = Object.keys(planDist);
  const planData = Object.values(planDist);
  const planColors = planLabels.map(l => PLAN_COLORS[l] || '#94A3B8');

  const planChartData = {
    labels: planLabels.length > 0 ? planLabels : ['Belum ada data'],
    datasets: [{
      data: planData.length > 0 ? planData : [1],
      backgroundColor: planData.length > 0 ? planColors : ['#E2E8F0'],
      borderWidth: 0, hoverOffset: 6,
    }],
  };
  const planOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 8, boxHeight: 8, borderRadius: 4, useBorderRadius: true, font: { size: 12, ...chartFont }, color: '#9CA3AF', padding: 12 },
      },
      tooltip: { ...tooltipConfig, callbacks: { label: ctx => ` ${ctx.label}: ${planData.length > 0 ? ctx.parsed : 0} perusahaan` } },
    },
  };

  const totalSubs = stats?.activeSubs ?? 0;
  const openTickets = stats?.openComplaints ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Founder Dashboard</h1>
            <p className="fp-subtitle">Overview platform & metrik berlangganan secara real-time</p>
          </div>
          <div className="fp-actions">
            <div className="fp-realtime-dot" />
            <button className="fp-btn fp-btn-secondary fp-btn-sm" onClick={handleRefresh} disabled={refreshing}>
              <FiRefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
              {refreshing ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="fp-stats">
        <StatCard
          loading={loading}
          icon={<FiBriefcase />}
          label="Total Perusahaan"
          value={stats?.totalCompanies ?? 0}
          change={stats?.newThisMonth ? `+${stats.newThisMonth} bulan ini` : undefined}
          changeType="up"
          iconBg="rgba(99,102,241,0.1)" iconColor="#6366F1"
        />
        <StatCard
          loading={loading}
          icon={<FiUsers />}
          label="Subscriber Aktif"
          value={stats?.activeSubs ?? 0}
          change={stats?.activeCompanies ? `${stats.activeCompanies} perusahaan aktif` : undefined}
          changeType="up"
          iconBg="rgba(16,185,129,0.1)" iconColor="#10B981"
        />
        <StatCard
          loading={loading}
          icon={<FiCreditCard />}
          label="Total MRR"
          value={formatIDR(stats?.mrr ?? 0)}
          iconBg="rgba(245,158,11,0.1)" iconColor="#F59E0B"
        />
        <StatCard
          loading={loading}
          icon={<FiAlertCircle />}
          label="Tiket Support Terbuka"
          value={openTickets}
          change={openTickets > 0 ? 'Perlu perhatian' : 'Semua terselesaikan'}
          changeType={openTickets > 0 ? 'down' : 'up'}
          iconBg="rgba(239,68,68,0.1)" iconColor="#EF4444"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="fp-grid-2" style={{ marginBottom: 20 }}>
        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Tren Pendapatan</span>
            <span className="fp-card-badge">6 bulan terakhir</span>
          </div>
          <div className="fp-card-body">
            {loading
              ? <SkeletonBox w="100%" h={260} />
              : !hasRevenue
                ? <EmptyChart text="Belum ada pendapatan" sub="Data muncul saat ada pembayaran masuk" />
                : (
                  <div className="fp-chart-area">
                    <Line data={revenueChartData} options={lineOptions(v => formatIDR(v))} />
                  </div>
                )}
          </div>
        </div>
        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Pertumbuhan Subscriber</span>
            <span className="fp-card-badge">6 bulan terakhir</span>
          </div>
          <div className="fp-card-body">
            {loading
              ? <SkeletonBox w="100%" h={260} />
              : !hasSubs
                ? <EmptyChart text="Belum ada subscriber" sub="Data muncul saat perusahaan mendaftar" />
                : (
                  <div className="fp-chart-area">
                    <Line data={subsChartData} options={lineOptions()} />
                  </div>
                )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="fp-grid-2">
        {/* Plan distribution */}
        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Distribusi Paket</span>
            <span className="fp-card-badge">{totalSubs} total</span>
          </div>
          <div className="fp-card-body">
            {loading
              ? <SkeletonBox w="100%" h={220} />
              : (
                <div style={{ height: 220, position: 'relative' }}>
                  <Doughnut data={planChartData} options={planOptions} />
                  <div style={{
                    position: 'absolute', top: '42%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none',
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{totalSubs}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Perusahaan</div>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Aksi Cepat</span>
          </div>
          <div className="fp-card-body" style={{ padding: '12px 20px' }}>
            {[
              { label: 'Tambah Perusahaan', desc: 'Daftarkan tenant perusahaan baru', href: '/founder/companies', color: '#F59E0B' },
              { label: 'Kirim Broadcast', desc: 'Notifikasi ke semua subscriber aktif', href: '/founder/broadcast', color: '#6366F1' },
              { label: 'Tinjau Tiket Support', desc: `${openTickets} tiket terbuka`, href: '/founder/support', color: '#EF4444' },
              { label: 'Buat Voucher', desc: 'Generate kode diskon untuk klien', href: '/founder/vouchers', color: '#10B981' },
            ].map((item, i) => (
              <Link
                key={i}
                to={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 0',
                  borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.desc}</div>
                </div>
                <FiArrowUpRight size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
