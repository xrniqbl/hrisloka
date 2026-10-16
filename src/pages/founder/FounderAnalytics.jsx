import { useState, useEffect, useMemo, useCallback } from 'react';
import { FiMonitor, FiSmartphone, FiTablet, FiTrendingUp, FiBarChart2, FiRefreshCw } from 'react-icons/fi';
import { Eye, LogIn, UserPlus, Smartphone } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import MetricStatCards from '../../components/MetricStatCards';
import * as founderService from '../../services/founderService';
import './founder.css';

const BRAND = '#5654D4';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend);

const chartFont = { family: 'Inter Tight', weight: '500', size: 12 };
const tooltipConfig = {
  backgroundColor: 'rgba(10,15,30,0.92)', titleFont: { ...chartFont, weight: '700' }, bodyFont: chartFont,
  cornerRadius: 8, padding: { top: 8, bottom: 8, left: 12, right: 12 },
};

const PERIOD_OPTIONS = [
  { label: '7 hari', value: 7 },
  { label: '30 hari', value: 30 },
  { label: '90 hari', value: 90 },
];

function SkeletonBox({ w = '100%', h = 28 }) {
  return (
    <div style={{
      height: h, background: 'var(--border)', borderRadius: 8,
      width: w, animation: 'fp-pulse 1.5s ease-in-out infinite',
    }} />
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div className="ep-empty-wrap">
      <div className="ep-empty-icon">{icon}</div>
      <div className="ep-empty-title">{title}</div>
      {sub && <div className="ep-empty-desc">{sub}</div>}
    </div>
  );
}

export default function FounderAnalytics() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async  () => {
    try {
      setError(null);
      const { data, error: err } = await founderService.getAnalyticsSummary(period);
      if (err) throw err;
      setSummary(data || { pageViews: 0, logins: 0, signups: 0, deviceCounts: {}, topPages: [], dailyMap: {}, total: 0 });
    } catch (err) {
      console.error('[FounderAnalytics] fetch error:', err);
      setError('Gagal memuat data analytics.');
      setSummary({ pageViews: 0, logins: 0, signups: 0, deviceCounts: {}, topPages: [], dailyMap: {}, total: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  // Real data (zero when no events tracked yet)
  const pageViews = summary?.pageViews || 0;
  const logins = summary?.logins || 0;
  const signups = summary?.signups || 0;

  // Daily traffic chart
  const dailyMap = summary?.dailyMap || {};
  const dailyEntries = Object.entries(dailyMap).slice(-period);
  const dailyLabels = dailyEntries.map(([d]) => {
    const dt = new Date(d);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  });
  const dailyValues = dailyEntries.map(([, v]) => v);
  const hasTraffic = dailyValues.some(v => v > 0);

  const trafficChartData = {
    labels: dailyLabels,
    datasets: [{
      label: 'Page Views',
      data: dailyValues,
      borderColor: BRAND,
      backgroundColor: 'rgba(86, 84, 212, 0.08)',
      tension: 0.4, fill: true,
      pointRadius: dailyLabels.length > 20 ? 0 : 3,
      pointBackgroundColor: BRAND,
      pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 2,
    }],
  };

  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: tooltipConfig },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }, ticks: { font: chartFont, color: '#9CA3AF', padding: 6 }, border: { display: false } },
      x: { grid: { display: false }, ticks: { font: chartFont, color: '#9CA3AF', maxTicksLimit: 10 }, border: { display: false } },
    },
  };

  // Device chart
  const dev = summary?.deviceCounts || {};
  const desktopCount = dev.desktop || 0;
  const mobileCount = dev.mobile || 0;
  const tabletCount = dev.tablet || 0;
  const totalDevices = desktopCount + mobileCount + tabletCount;
  const mobilePercent = totalDevices > 0 ? Math.round((mobileCount / totalDevices) * 100) : 0;

  const deviceChartData = {
    labels: ['Desktop', 'Mobile', 'Tablet'],
    datasets: [{
      data: [desktopCount, mobileCount, tabletCount],
      backgroundColor: [BRAND, '#7C75FF', '#A5A3E8'],
      borderWidth: 0, hoverOffset: 4,
    }],
  };
  const deviceOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, borderRadius: 4, useBorderRadius: true, font: chartFont, color: '#9CA3AF', padding: 12 } },
      tooltip: { ...tooltipConfig, callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}${totalDevices > 0 ? ` (${Math.round((ctx.parsed / totalDevices) * 100)}%)` : ''}` } },
    },
  };

  // Top pages bar chart
  const topPages = (summary?.topPages || []).slice(0, 8);
  const hasTopPages = topPages.length > 0;
  const topPagesData = {
    labels: topPages.map(p => p[0]),
    datasets: [{
      label: 'Views',
      data: topPages.map(p => p[1]),
      backgroundColor: BRAND,
      borderRadius: 5,
      barPercentage: 0.6,
    }],
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: { ...tooltipConfig, callbacks: { label: ctx => ` ${ctx.parsed.x} views` } } },
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }, ticks: { font: chartFont, color: '#9CA3AF' }, border: { display: false } },
      y: { grid: { display: false }, ticks: { font: chartFont, color: '#64748B', padding: 6 }, border: { display: false } },
    },
  };

  const kpiItems = useMemo(
    () => [
      { key: 'views', label: 'Page Views', value: loading ? '…' : pageViews.toLocaleString('id-ID'), icon: Eye },
      { key: 'logins', label: 'Total Logins', value: loading ? '…' : logins.toLocaleString('id-ID'), icon: LogIn },
      { key: 'signups', label: 'New Sign-ups', value: loading ? '…' : signups.toString(), icon: UserPlus },
      { key: 'mobile', label: 'Mobile Usage', value: loading ? '…' : `${mobilePercent}%`, icon: Smartphone },
    ],
    [loading, pageViews, logins, signups, mobilePercent],
  );

  return (
    <div className="fp-page">
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Website Analytics</h1>
            <p className="fp-subtitle">Usage & engagement platform · data real-time</p>
          </div>
          <div className="fp-actions">
            <div className="fp-seg">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`fp-seg-btn ${period === opt.value ? 'active' : ''}`}
                  onClick={() => setPeriod(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="fp-btn fp-btn-secondary fp-btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FiRefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="fp-notice fp-notice-error">
          {error} — Menampilkan data kosong, bukan data palsu.
        </div>
      )}

      {!loading && !error && pageViews === 0 && (
        <div className="fp-notice fp-notice-info">
          Belum ada event analytics dalam {period} hari terakhir. Data muncul setelah pengguna aktif.
        </div>
      )}

      <MetricStatCards items={kpiItems} className="fp-metric-strip" />

      {/* Traffic chart */}
      <div className="fp-card mb-sm">
        <div className="fp-card-header">
          <span className="fp-card-title">Traffic Overview</span>
          <span className="fp-card-badge">Last {period} days</span>
        </div>
        <div className="fp-card-body">
          {loading
            ? <SkeletonBox w="100%" h={240} />
            : !hasTraffic
            ? <EmptyState icon={<FiTrendingUp />} title="Belum ada data traffic" sub="Data muncul setelah pengguna mengunjungi halaman" />
            : (
              <div style={{ height: 240 }}>
                <Line data={trafficChartData} options={lineOptions} />
              </div>
            )}
        </div>
      </div>

      {/* Device + Top pages */}
      <div className="fp-grid-2">
        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Device Distribution</span>
          </div>
          <div className="fp-card-body">
            {loading ? <SkeletonBox w="100%" h={220} /> : totalDevices === 0 ? (
              <EmptyState icon={<FiMonitor />} title="Belum ada data device" sub="Muncul saat ada kunjungan tercatat" />
            ) : (
              <>
                <div style={{ height: 220, position: 'relative' }}>
                  <Doughnut data={deviceChartData} options={deviceOptions} />
                  <div style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%,-55%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{totalDevices.toLocaleString('id-ID')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12 }}>
                  {[
                    { icon: <FiMonitor />, label: 'Desktop', val: desktopCount },
                    { icon: <FiSmartphone />, label: 'Mobile', val: mobileCount },
                    { icon: <FiTablet />, label: 'Tablet', val: tabletCount },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, color: 'var(--muted, #6B7280)', marginBottom: 4 }}>{item.icon}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{item.val.toLocaleString('id-ID')}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted, #6B7280)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-title">Top Pages</span>
            <span className="fp-card-badge">by views</span>
          </div>
          <div className="fp-card-body">
            {loading ? <SkeletonBox w="100%" h={240} /> : !hasTopPages ? (
              <EmptyState icon={<FiBarChart2 />} title="Belum ada halaman teratas" sub="Muncul setelah ada page views tercatat" />
            ) : (
              <div style={{ height: 240 }}>
                <Bar data={topPagesData} options={barOptions} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

