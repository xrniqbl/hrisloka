import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import {
  Building2,
  Users,
  CreditCard,
  LifeBuoy,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Bell,
  Ticket,
  Tag,
} from 'lucide-react';
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
import { Line, Doughnut } from 'react-chartjs-2';
import MetricStatCards from '../../components/MetricStatCards';
import * as founderService from '../../services/founderService';
import './founder.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const BRAND = '#5654D4';
const chartFont = { family: 'Inter, Inter Tight, system-ui, sans-serif', weight: '500', size: 12 };

const tooltipConfig = {
  backgroundColor: 'rgba(17, 24, 39, 0.92)',
  titleFont: { ...chartFont, weight: '700', size: 12 },
  bodyFont: chartFont,
  cornerRadius: 8,
  padding: { top: 8, bottom: 8, left: 12, right: 12 },
  boxPadding: 3,
};

/** Soft monochrome plan palette (brand-aligned) */
const PLAN_COLORS = {
  Free: '#9CA3AF',
  Starter: '#5654D4',
  Pro: '#7C75FF',
  Enterprise: '#3730A3',
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
    <div
      className="fp-skeleton"
      style={{ height: h, width: w }}
      aria-hidden
    />
  );
}

function EmptyChart({ text, sub }) {
  return (
    <div className="fp-empty" style={{ padding: '40px 16px' }}>
      <div className="fp-empty-icon">
        <Icon icon={TrendingUp} size="md" color="inherit" />
      </div>
      <div className="fp-empty-title">{text}</div>
      {sub && <div className="fp-empty-desc">{sub}</div>}
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    label: 'Tambah Perusahaan',
    desc: 'Daftarkan tenant perusahaan baru',
    href: '/founder/companies',
    icon: Plus,
  },
  {
    label: 'Kirim Broadcast',
    desc: 'Notifikasi ke semua subscriber aktif',
    href: '/founder/broadcast',
    icon: Bell,
  },
  {
    label: 'Tinjau Tiket Support',
    desc: 'Kelola keluhan klien terbuka',
    href: '/founder/support',
    icon: Ticket,
  },
  {
    label: 'Buat Voucher',
    desc: 'Generate kode diskon untuk klien',
    href: '/founder/vouchers',
    icon: Tag,
  },
];

export default function FounderDashboard() {
  const [stats, setStats] = useState(null);
  const [revenueHistory, setRevenueHistory] = useState([]);
  const [subsHistory, setSubsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
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
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const openTickets = stats?.openComplaints ?? 0;
  const totalSubs = stats?.activeSubs ?? 0;

  const kpiItems = useMemo(
    () => [
      {
        key: 'companies',
        label: 'Perusahaan',
        value: loading ? '…' : (stats?.totalCompanies ?? 0),
        icon: Building2,
      },
      {
        key: 'subs',
        label: 'Subscriber Aktif',
        value: loading ? '…' : (stats?.activeSubs ?? 0),
        icon: Users,
      },
      {
        key: 'mrr',
        label: 'Total MRR',
        value: loading ? '…' : formatIDR(stats?.mrr ?? 0),
        icon: CreditCard,
      },
      {
        key: 'tickets',
        label: 'Tiket Terbuka',
        value: loading ? '…' : openTickets,
        icon: LifeBuoy,
      },
    ],
    [stats, loading, openTickets],
  );

  const hasRevenue = revenueHistory.some((r) => r.amount > 0);
  const revenueChartData = {
    labels: revenueHistory.map((r) => r.label),
    datasets: [
      {
        label: 'Pendapatan',
        data: revenueHistory.map((r) => r.amount),
        borderColor: BRAND,
        backgroundColor: 'rgba(86, 84, 212, 0.08)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: BRAND,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2,
      },
    ],
  };

  const hasSubs = subsHistory.some((s) => s.count > 0);
  const subsChartData = {
    labels: subsHistory.map((s) => s.label),
    datasets: [
      {
        label: 'Subscriber Aktif',
        data: subsHistory.map((s) => s.count),
        borderColor: '#7C75FF',
        backgroundColor: 'rgba(124, 117, 255, 0.08)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#7C75FF',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2,
      },
    ],
  };

  const lineOptions = (yFormatter) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: tooltipConfig },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        ticks: {
          font: chartFont,
          color: '#9CA3AF',
          padding: 6,
          callback: yFormatter || undefined,
        },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { font: chartFont, color: '#9CA3AF', padding: 4 },
        border: { display: false },
      },
    },
  });

  const planDist = stats?.planDist || {};
  const planLabels = Object.keys(planDist);
  const planData = Object.values(planDist);
  const planColors = planLabels.map((l) => PLAN_COLORS[l] || '#9CA3AF');

  const planChartData = {
    labels: planLabels.length > 0 ? planLabels : ['Belum ada data'],
    datasets: [
      {
        data: planData.length > 0 ? planData : [1],
        backgroundColor: planData.length > 0 ? planColors : ['#E5E7EB'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const planOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          borderRadius: 4,
          useBorderRadius: true,
          font: { size: 12, ...chartFont },
          color: '#9CA3AF',
          padding: 12,
        },
      },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          label: (ctx) =>
            ` ${ctx.label}: ${planData.length > 0 ? ctx.parsed : 0} perusahaan`,
        },
      },
    },
  };

  const ticketHint =
    openTickets > 0 ? `${openTickets} tiket terbuka` : 'Semua terselesaikan';

  return (
    <div className="fp-page">
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Dashboard</h1>
            <p className="fp-subtitle">
              Overview platform & metrik berlangganan
              {stats?.newThisMonth
                ? ` · +${stats.newThisMonth} perusahaan bulan ini`
                : ''}
            </p>
          </div>
          <div className="fp-actions">
            <span className="fp-realtime-dot" title="Live" aria-hidden />
            <button
              type="button"
              className="fp-btn fp-btn-secondary fp-btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <span className={refreshing ? 'fp-spin' : undefined} style={{ display: 'inline-flex' }}>
                <Icon icon={RefreshCw} size="sm" color="inherit" />
              </span>
              {refreshing ? 'Memuat…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <MetricStatCards items={kpiItems} className="fp-metric-strip" />

      <div className="fp-grid-2 mb-sm">
        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Tren Pendapatan</span>
            <span className="fp-card-badge">6 bulan</span>
          </div>
          <div className="fp-card-body">
            {loading ? (
              <SkeletonBox w="100%" h={220} />
            ) : !hasRevenue ? (
              <EmptyChart
                text="Belum ada pendapatan"
                sub="Data muncul saat ada pembayaran masuk"
              />
            ) : (
              <div className="fp-chart-area">
                <Line
                  data={revenueChartData}
                  options={lineOptions((v) => formatIDR(v))}
                />
              </div>
            )}
          </div>
        </div>

        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Pertumbuhan Subscriber</span>
            <span className="fp-card-badge">6 bulan</span>
          </div>
          <div className="fp-card-body">
            {loading ? (
              <SkeletonBox w="100%" h={220} />
            ) : !hasSubs ? (
              <EmptyChart
                text="Belum ada subscriber"
                sub="Data muncul saat perusahaan mendaftar"
              />
            ) : (
              <div className="fp-chart-area">
                <Line data={subsChartData} options={lineOptions()} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fp-grid-2">
        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Distribusi Paket</span>
            <span className="fp-card-badge">{totalSubs} total</span>
          </div>
          <div className="fp-card-body">
            {loading ? (
              <SkeletonBox w="100%" h={200} />
            ) : (
              <div className="fp-doughnut-wrap">
                <Doughnut data={planChartData} options={planOptions} />
                <div className="fp-doughnut-center">
                  <div className="fp-doughnut-value">{totalSubs}</div>
                  <div className="fp-doughnut-label">Perusahaan</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Aksi Cepat</span>
          </div>
          <div className="fp-card-body fp-quick-actions">
            {QUICK_ACTIONS.map((item) => (
              <Link key={item.href} to={item.href} className="fp-quick-item">
                <span className="fp-quick-icon" aria-hidden>
                  <Icon icon={item.icon} size="sm" color="inherit" />
                </span>
                <span className="fp-quick-text">
                  <span className="fp-quick-label">
                    {item.label}
                    {item.href === '/founder/support' ? (
                      <span className="fp-quick-meta"> · {ticketHint}</span>
                    ) : null}
                  </span>
                  <span className="fp-quick-desc">{item.desc}</span>
                </span>
                <Icon icon={ArrowUpRight} size="sm" color="inherit" className="fp-quick-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
