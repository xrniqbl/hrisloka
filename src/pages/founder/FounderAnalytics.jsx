import { useState, useEffect } from 'react';
import { FiMonitor, FiSmartphone, FiTablet, FiTrendingUp, FiBarChart2, FiRefreshCw } from 'react-icons/fi';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import * as founderService from '../../services/founderService';
import './founder.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend);

const chartFont = { family: 'Plus Jakarta Sans', weight: '500', size: 12 };
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
    <div style={{
      height: 200, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <div style={{ fontSize: 36, color: 'var(--border)' }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

export default function FounderAnalytics() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
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
  };

  useEffect(() => { fetchData(); }, [period]);
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
      borderColor: '#6366F1',
      backgroundColor: 'rgba(99, 102, 241, 0.08)',
      tension: 0.4, fill: true,
      pointRadius: dailyLabels.length > 20 ? 0 : 3,
      pointBackgroundColor: '#6366F1',
      pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 2.5,
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
      backgroundColor: ['#6366F1', '#F59E0B', '#10B981'],
      borderWidth: 0, hoverOffset: 6,
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
      backgroundColor: '#6366F1',
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

  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Website Analytics</h1>
            <p className="fp-subtitle">Track platform usage and user engagement — data real dari Supabase</p>
          </div>
          <div className="fp-actions">
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: 3 }}>
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className="fp-btn fp-btn-sm"
                  style={{
                    background: period === opt.value ? '#6366F1' : 'none',
                    color: period === opt.value ? '#fff' : 'var(--text-secondary)',
                    border: 'none', padding: '5px 12px',
                  }}
                  onClick={() => setPeriod(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button className="fp-btn fp-btn-secondary fp-btn-sm" onClick={handleRefresh} disabled={refreshing}>
              <FiRefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', fontSize: 13, marginBottom: 20 }}>
          ⚠️ {error} — Menampilkan data kosong, bukan data palsu.
        </div>
      )}

      {/* No data notice (when analytics table is empty — users haven't generated events yet) */}
      {!loading && !error && pageViews === 0 && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#6366F1', fontSize: 13, marginBottom: 20 }}>
          ℹ️ Belum ada event analytics tercatat dalam {period} hari terakhir. Data akan muncul setelah pengguna aktif menggunakan platform.
        </div>
      )}

      {/* Stats */}
      <div className="fp-stats">
        {[
          { icon: <FiTrendingUp />, label: 'Page Views', value: pageViews.toLocaleString('id-ID'), iconBg: 'rgba(99,102,241,0.1)', iconColor: '#6366F1' },
          { icon: <FiBarChart2 />, label: 'Total Logins', value: logins.toLocaleString('id-ID'), iconBg: 'rgba(245,158,11,0.1)', iconColor: '#F59E0B' },
          { icon: <FiTrendingUp />, label: 'New Sign-ups', value: signups.toString(), iconBg: 'rgba(16,185,129,0.1)', iconColor: '#10B981' },
          { icon: <FiSmartphone />, label: 'Mobile Usage', value: `${mobilePercent}%`, iconBg: 'rgba(239,68,68,0.1)', iconColor: '#EF4444' },
        ].map(s => (
          <div key={s.label} className="fp-stat">
            <div className="fp-stat-header">
              <div className="fp-stat-icon" style={{ background: s.iconBg, color: s.iconColor }}>{s.icon}</div>
            </div>
            {loading ? <SkeletonBox w="55%" h={28} /> : <div className="fp-stat-value">{s.value}</div>}
            <div className="fp-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Traffic chart */}
      <div className="fp-card" style={{ marginBottom: 20 }}>
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
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{totalDevices.toLocaleString('id-ID')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12 }}>
                  {[
                    { icon: <FiMonitor />, label: 'Desktop', val: desktopCount, color: '#6366F1' },
                    { icon: <FiSmartphone />, label: 'Mobile', val: mobileCount, color: '#F59E0B' },
                    { icon: <FiTablet />, label: 'Tablet', val: tabletCount, color: '#10B981' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, color: item.color }}>{item.icon}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{item.val.toLocaleString('id-ID')}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.label}</div>
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
