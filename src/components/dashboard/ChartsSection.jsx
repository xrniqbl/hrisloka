import { useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend);

const chartFont = { family: 'Inter', weight: '500' };
const tooltipConfig = { backgroundColor: 'rgba(15, 23, 42, 0.92)', cornerRadius: 10, padding: { x: 10, y: 14 }, titleFont: { ...chartFont, weight: '600' }, bodyFont: chartFont };
const legendConfig = { position: 'top', align: 'end', labels: { boxWidth: 8, boxHeight: 8, borderRadius: 4, useBorderRadius: true, color: '#9CA3AF', font: { ...chartFont, size: 11 }, padding: 16 } };

export default function ChartsSection({ trendData, employees, todayAttendance, demoTab, setDemoTab, widgets }) {
  // Demographics computation
  const demographics = useMemo(() => {
    const permanent = employees.filter(e => e.status === 'permanent').length;
    const contract = employees.filter(e => e.status === 'contract').length;
    const male = employees.filter(e => (e.gender || '').toLowerCase().startsWith('l') || (e.gender || '').toLowerCase() === 'male').length;
    const female = employees.filter(e => (e.gender || '').toLowerCase().startsWith('p') || (e.gender || '').toLowerCase() === 'female').length;
    const unspecified = employees.length - male - female;
    return { permanent, contract, male, female, unspecified };
  }, [employees]);

  // Division distribution
  const divisionData = useMemo(() => {
    const counts = {};
    employees.forEach(e => { const d = e.division || 'Lainnya'; counts[d] = (counts[d] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const colors = ['#111111', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1', '#EF4444', '#0EA5E9'];
    return { labels: sorted.map(s => s[0]), datasets: [{ data: sorted.map(s => s[1]), backgroundColor: colors.slice(0, sorted.length), borderRadius: 6, barPercentage: 0.6 }] };
  }, [employees]);

  // Headcount trend
  const headcountData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('id-ID', { month: 'short' }) });
    }
    const counts = months.map(m => employees.filter(e => (e.join_date || e.joinDate || '').startsWith(m.key)).length);
    return { labels: months.map(m => m.label), datasets: [{ label: 'New Employees', data: counts, borderColor: '#111111', backgroundColor: 'rgba(17,17,17,0.05)', tension: 0.4, fill: true, pointRadius: 0, borderWidth: 2 }] };
  }, [employees]);

  const demoDatasets = {
    status: { labels: ['Permanent', 'Contract'], datasets: [{ data: [demographics.permanent, demographics.contract], backgroundColor: ['#111111', '#9CA3AF'], cutout: '70%' }] },
    gender: { labels: ['Male', 'Female', 'Unspecified'], datasets: [{ data: [demographics.male, demographics.female, demographics.unspecified], backgroundColor: ['#3B82F6', '#EC4899', '#D1D5DB'], cutout: '70%' }] },
  };

  const trendOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: legendConfig, tooltip: tooltipConfig }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false }, ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF' }, border: { display: false } }, x: { grid: { display: false }, ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', maxTicksLimit: 10 }, border: { display: false } } } };
  const barOptions = { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: tooltipConfig }, scales: { x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false }, ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', stepSize: 1 }, border: { display: false } }, y: { grid: { display: false }, ticks: { font: { size: 12, ...chartFont, weight: '600' }, color: '#64748B', padding: 8 }, border: { display: false } } } };

  return (
    <div className="dash-section">
      {/* Row 1: Attendance Trend + Demographics */}
      <div className="dash-grid-2" style={{ marginBottom: 16 }}>
        {widgets.trend && (
          <div className="dash-card dash-chart-card">
            <div className="dash-chart-header">
              <span className="dash-chart-title">Attendance Trend (30 Days)</span>
            </div>
            <div className="dash-chart-container">
              <Line data={trendData} options={trendOptions} />
            </div>
          </div>
        )}
        {widgets.demographics && (
          <div className="dash-card dash-chart-card">
            <div className="dash-chart-header">
              <span className="dash-chart-title">Demographics</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {['status', 'gender'].map(tab => (
                  <button key={tab} onClick={() => setDemoTab(tab)} style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--dash-font)',
                    background: demoTab === tab ? 'var(--dash-primary)' : 'var(--dash-primary-light)',
                    color: demoTab === tab ? 'var(--dash-card-bg)' : 'var(--dash-text-secondary)',
                    transition: 'all 0.15s ease',
                  }}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="dash-chart-container" style={{ position: 'relative' }}>
              <Doughnut data={demoDatasets[demoTab] || demoDatasets.status} options={{ responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { ...legendConfig, position: 'bottom' }, tooltip: tooltipConfig } }} />
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Headcount + Division */}
      <div className="dash-grid-2">
        {widgets.headcount && (
          <div className="dash-card dash-chart-card">
            <div className="dash-chart-header">
              <span className="dash-chart-title">Headcount Trend</span>
            </div>
            <div className="dash-chart-container">
              <Line data={headcountData} options={trendOptions} />
            </div>
          </div>
        )}
        {widgets.division && (
          <div className="dash-card dash-chart-card">
            <div className="dash-chart-header">
              <span className="dash-chart-title">Division Distribution</span>
            </div>
            <div className="dash-chart-container" style={{ height: Math.max(220, divisionData.labels.length * 38) }}>
              <Bar data={divisionData} options={barOptions} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
