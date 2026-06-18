import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../lib/i18n';
import {
 Chart as ChartJS,
 RadialLinearScale,
 PointElement,
 LineElement,
 Filler,
 Tooltip,
 Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { FiPlus, FiX, FiCheck, FiTrash2 } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import * as kpiService from '../services/kpiService';
import { useAuth } from '../context/AuthContext';
import * as employeeService from '../services/employeeService';

import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const chartFont = { family: 'Plus Jakarta Sans', weight: '500' };

const defaultMetrics = [
 { name: 'Disiplin', target: 100, actual: 0, weight: 1 },
 { name: 'Kerjasama Tim', target: 100, actual: 0, weight: 1 },
 { name: 'Inisiatif', target: 100, actual: 0, weight: 1 },
 { name: 'Kualitas Kerja', target: 100, actual: 0, weight: 1 },
 { name: 'Produktivitas', target: 100, actual: 0, weight: 1 },
];

// Dynamic periods based on current year
const _currentYear = new Date().getFullYear();
const periods = [
 `Q1 ${_currentYear}`, `Q2 ${_currentYear}`, `Q3 ${_currentYear}`, `Q4 ${_currentYear}`,
 `H1 ${_currentYear}`, `H2 ${_currentYear}`, `Annual ${_currentYear}`,
];

// Calculate score from actual/target with cap at 100
function calcScore(actual, target) {
 if (!target || target === 0) return 0;
 return Math.min(100, Math.round((actual / target) * 100));
}

// Calculate weighted overall score
function calcOverallScore(metrics) {
 if (!metrics || metrics.length === 0) return 0;
 let totalWeighted = 0;
 let totalWeight = 0;
 metrics.forEach(m => {
 const score = calcScore(m.actual, m.target);
 const weight = m.weight || 1;
 totalWeighted += score * weight;
 totalWeight += weight;
 });
 return totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;
}

export default function KPITracking() {
  const { t } = useTranslation();
  const { employee } = useAuth();
 const [kpiData, setKpiData] = useState([]);
 const [employees, setEmployees] = useState([]);
 const [loading, setLoading] = useState(true);
 const [selectedEmployee, setSelectedEmployee] = useState(null);
 const [modal, setModal] = useState(null);

 // Create KPI form
 const [kpiForm, setKpiForm] = useState({
 employeeId: '',
 period: `Q1 ${_currentYear}`,
 metrics: defaultMetrics.map(m => ({ ...m })),
 });

 useEffect(() => { if (employee?.company_id) fetchData(); }, [employee?.company_id]);

 const fetchData = async () => {
 setLoading(true);
 const [kpiRes, empRes] = await Promise.all([
 kpiService.getAllKPIs(),
 employeeService.getAllEmployees(undefined, employee?.company_id),
 ]);
 setKpiData(kpiRes.data || []);
 setEmployees(empRes.data || []);
 setLoading(false);
 };

 // Realtime: auto-refresh
 useRealtimeTable('kpi_records', fetchData);

 const getColor = (score) => {
 if (score >= 90) return 'var(--success)';
 if (score >= 70) return 'var(--primary)';
 if (score >= 50) return 'var(--warning)';
 return 'var(--danger)';
 };

 const getGrade = (score) => {
 if (score >= 90) return 'A';
 if (score >= 80) return 'B+';
 if (score >= 70) return 'B';
 if (score >= 60) return 'C';
 return 'D';
 };

 // Average scores for radar overview
 const avgMetrics = useMemo(() => {
 if (kpiData.length === 0) return null;
 const metricNames = ['Disiplin', 'Kerjasama Tim', 'Inisiatif', 'Kualitas Kerja', 'Produktivitas'];
 const scores = metricNames.map(name => {
 let total = 0, count = 0;
 kpiData.forEach(kpi => {
 const metrics = kpi.kpi_metrics || [];
 const match = metrics.find(m => m.name === name);
 if (match) {
 total += calcScore(match.actual, match.target);
 count++;
 }
 });
 return count > 0 ? Math.round(total / count) : 0;
 });
 return { labels: metricNames, scores };
 }, [kpiData]);

 // Selected employee radar
 const selectedRadar = useMemo(() => {
 if (!selectedEmployee) return null;
 const kpi = kpiData.find(k => k.id === selectedEmployee);
 if (!kpi) return null;
 const metrics = kpi.kpi_metrics || [];
 return {
 labels: metrics.map(m => m.name),
 scores: metrics.map(m => calcScore(m.actual, m.target)),
 employee: kpi.employees,
 overall: calcOverallScore(metrics),
 };
 }, [selectedEmployee, kpiData]);

 const radarData = (labels, scores, label, color) => ({
 labels,
 datasets: [{
 label,
 data: scores,
 backgroundColor: `${color}20`,
 borderColor: color,
 borderWidth: 2.5,
 pointBackgroundColor: color,
 pointBorderColor: '#fff',
 pointBorderWidth: 2,
 pointRadius: 5,
 pointHoverRadius: 7,
 }],
 });

 const radarOptions = {
 responsive: true, maintainAspectRatio: false,
 plugins: {
 legend: { display: false },
 tooltip: {
 backgroundColor: 'rgba(15, 23, 42, 0.92)',
 titleFont: { ...chartFont, weight: '700', size: 13 },
 bodyFont: { ...chartFont, size: 12 },
 cornerRadius: 10,
 padding: 12,
 callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed.r}%` },
 },
 },
 scales: {
 r: {
 beginAtZero: true,
 max: 100,
 ticks: { stepSize: 20, font: { size: 10, ...chartFont }, color: '#9CA3AF', backdropColor: 'transparent' },
 grid: { color: 'rgba(0,0,0,0.06)' },
 pointLabels: { font: { size: 12, ...chartFont, weight: '600' }, color: '#475569' },
 angleLines: { color: 'rgba(0,0,0,0.06)' },
 },
 },
 };

 // Create KPI
 const openCreateKPI = () => {
 setKpiForm({
 employeeId: '',
 period: `Q1 ${_currentYear}`,
 metrics: defaultMetrics.map(m => ({ ...m })),
 });
 setModal('create');
 };

 const handleMetricChange = (index, field, value) => {
 setKpiForm(prev => {
 const metrics = [...prev.metrics];
 metrics[index] = { ...metrics[index], [field]: Number(value) || 0 };
 return { ...prev, metrics };
 });
 };

 const addMetric = () => {
 setKpiForm(prev => ({
 ...prev,
 metrics: [...prev.metrics, { name: '', target: 100, actual: 0, weight: 1 }],
 }));
 };

 const removeMetric = (index) => {
 setKpiForm(prev => ({
 ...prev,
 metrics: prev.metrics.filter((_, i) => i !== index),
 }));
 };

 const handleCreateKPI = async () => {
 if (!kpiForm.employeeId || kpiForm.metrics.length === 0) return;

 const metricsWithScore = kpiForm.metrics.filter(m => m.name).map(m => ({
 name: m.name,
 target: m.target,
 actual: m.actual,
 score: calcScore(m.actual, m.target),
 weight: m.weight,
 }));

 const overallScore = calcOverallScore(metricsWithScore);

 await kpiService.createKPI(
 Number(kpiForm.employeeId),
 kpiForm.period,
 overallScore,
 metricsWithScore
 );

 setModal(null);
 fetchData();
 };

 // Delete KPI
 const handleDeleteKPI = async (id) => {
 if (!confirm('Hapus KPI record ini?')) return;
 await kpiService.deleteKPI(id);
 fetchData();
 };

 // Computed overall for each KPI (re-calculate from actual metrics)
 const getComputedOverall = (kpi) => {
 const metrics = kpi.kpi_metrics || [];
 return calcOverallScore(metrics);
 };

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={5} />;
 return (
 <div>
 <div className="page-header">
 <h1>{t('kpi.title')}</h1>
 <div className="page-header-actions">
 <button className="btn-primary" onClick={openCreateKPI}><FiPlus /> Buat KPI</button>
 </div>
 </div>

 {loading ? (
 <div style={{ padding: 20 }}>Loading...</div>
 ) : kpiData.length === 0 ? (
 <div className="info-card" style={{ textAlign: 'center', padding: 40 }}>
 <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Belum ada data KPI</div>
 <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Klik "Buat KPI" untuk membuat record KPI pertama.</div>
 <button className="btn-primary" onClick={openCreateKPI}><FiPlus /> Buat KPI</button>
 </div>
 ) : (
 <>
 {/* Radar Overview */}
 <div style={{ display: 'grid', gridTemplateColumns: selectedRadar ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 28 }}>
 {/* Company-wide average radar */}
 {avgMetrics && (
 <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow-card)' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
 <div>
 <div style={{ fontSize: 15, fontWeight: 700 }}>Radar Kinerja Perusahaan</div>
 <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Rata-rata semua karyawan</div>
 </div>
 </div>
 <div style={{ height: 300 }}>
 <Radar data={radarData(avgMetrics.labels, avgMetrics.scores, 'Rata-rata', '#0047AB')} options={radarOptions} />
 </div>
 </div>
 )}

 {/* Individual employee radar */}
 {selectedRadar && (
 <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow-card)' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
 <div>
 <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedRadar.employee?.name || 'Karyawan'}</div>
 <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
 {selectedRadar.employee?.position} - {selectedRadar.employee?.division}
 </div>
 </div>
 <div style={{
 width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: 16, fontWeight: 700, color: getColor(selectedRadar.overall),
 background: `${getColor(selectedRadar.overall)}12`, border: `2px solid ${getColor(selectedRadar.overall)}`,
 }}>
 {selectedRadar.overall}
 </div>
 </div>
 <div style={{ height: 300 }}>
 <Radar data={radarData(selectedRadar.labels, selectedRadar.scores, selectedRadar.employee?.name || '', '#8B5CF6')} options={radarOptions} />
 </div>
 </div>
 )}
 </div>

 {/* Performance Formula Info */}
 <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '14px 20px', marginBottom: 20, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
 <strong>Formula Perhitungan:</strong> Score per metrik = (Actual / Target) x 100 (max 100). Overall Score = rata-rata tertimbang semua metrik berdasarkan bobot (weight).
 </div>

 {/* Employee KPI Cards */}
 <div className="cards-grid">
 {kpiData.map((kpi) => {
 const emp = kpi.employees;
 const metrics = kpi.kpi_metrics || [];
 const computedOverall = getComputedOverall(kpi);
 const isSelected = selectedEmployee === kpi.id;
 return (
 <div
 className="info-card"
 key={kpi.id}
 onClick={() => setSelectedEmployee(isSelected ? null : kpi.id)}
 style={{
 cursor: 'pointer',
 border: isSelected ? '2px solid var(--primary)' : undefined,
 transition: 'all 0.2s',
 }}
 >
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
 <div>
 <div style={{ fontSize: 14, fontWeight: 700 }}>{emp?.name || '-'}</div>
 <div style={{ fontSize: 12, color: 'var(--muted)' }}>{emp?.position || ''} - {emp?.division || ''}</div>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
 <div style={{
 width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: 15, fontWeight: 700, color: getColor(computedOverall),
 background: `${getColor(computedOverall)}12`, border: `2px solid ${getColor(computedOverall)}`,
 }}>
 {computedOverall}
 </div>
 <span style={{ fontSize: 10, fontWeight: 700, color: getColor(computedOverall), marginTop: 4 }}>
 Grade {getGrade(computedOverall)}
 </span>
 </div>
 <button className="action-btn danger" onClick={(e) => { e.stopPropagation(); handleDeleteKPI(kpi.id); }} title="Hapus KPI">
 <FiTrash2 size={13} />
 </button>
 </div>
 </div>

 {metrics.map((m, i) => {
 const score = calcScore(m.actual, m.target);
 return (
 <div key={i} style={{ marginBottom: 12 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
 <span style={{ color: 'var(--text-secondary)' }}>
 {m.name}
 {m.weight && m.weight !== 1 && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>(w:{m.weight})</span>}
 </span>
 <span style={{ fontWeight: 600 }}>{m.actual} / {m.target} ({score}%)</span>
 </div>
 <div className="progress-bar">
 <div className="progress-fill" style={{ width: `${Math.min(100, score)}%`, background: getColor(score) }} />
 </div>
 </div>
 );
 })}

 <div style={{ marginTop: 14, padding: '10px 0 0', borderTop: '1px solid var(--border)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
 <div>
 <span style={{ color: 'var(--muted)' }}>Periode:</span>{' '}
 <strong>{kpi.period}</strong>
 </div>
 <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>
 {isSelected ? 'Tutup Radar' : 'Lihat Radar'}
 </span>
 </div>
 </div>
 );
 })}
 </div>
 </>
 )}

 {/* Create KPI Modal */}
 {modal === 'create' && (
 <div className="modal-overlay" onClick={() => setModal(null)}>
 <div className="modal-box large" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2>Buat KPI Baru</h2>
 <button className="modal-close" onClick={() => setModal(null)}><FiX /></button>
 </div>
 <div className="modal-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
 <div className="form-grid">
 <div className="form-group">
 <label className="form-label">Karyawan *</label>
 <select className="form-select" value={kpiForm.employeeId} onChange={e => setKpiForm({ ...kpiForm, employeeId: e.target.value })}>
 <option value="">-- Pilih Karyawan --</option>
 {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} - {emp.division || ''}</option>)}
 </select>
 </div>
 <div className="form-group">
 <label className="form-label">Periode *</label>
 <select className="form-select" value={kpiForm.period} onChange={e => setKpiForm({ ...kpiForm, period: e.target.value })}>
 {periods.map(p => <option key={p} value={p}>{p}</option>)}
 </select>
 </div>
 </div>

 <div style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 12 }}>Metrik KPI</div>
 <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
 Score = (Actual / Target) x 100 (max 100). Overall = weighted average.
 </div>

 {kpiForm.metrics.map((m, i) => {
 const score = calcScore(m.actual, m.target);
 return (
 <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10, padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
 <div style={{ flex: 2 }}>
 <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Nama Metrik</label>
 <input className="form-input" value={m.name} onChange={e => {
 const metrics = [...kpiForm.metrics];
 metrics[i].name = e.target.value;
 setKpiForm({ ...kpiForm, metrics });
 }} placeholder="Nama metrik" />
 </div>
 <div style={{ flex: 1 }}>
 <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Target</label>
 <input className="form-input" type="number" value={m.target} onChange={e => handleMetricChange(i, 'target', e.target.value)} />
 </div>
 <div style={{ flex: 1 }}>
 <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Aktual</label>
 <input className="form-input" type="number" value={m.actual} onChange={e => handleMetricChange(i, 'actual', e.target.value)} />
 </div>
 <div style={{ flex: 0.6 }}>
 <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Bobot</label>
 <input className="form-input" type="number" step="0.1" min="0.1" value={m.weight} onChange={e => handleMetricChange(i, 'weight', e.target.value)} />
 </div>
 <div style={{ flex: 0.5, textAlign: 'center' }}>
 <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Score</label>
 <div style={{ fontSize: 16, fontWeight: 700, color: getColor(score) }}>{score}%</div>
 </div>
 <button className="action-btn danger" onClick={() => removeMetric(i)} style={{ marginBottom: 2 }}><FiTrash2 size={13} /></button>
 </div>
 );
 })}

 <button className="btn-secondary" style={{ marginTop: 8 }} onClick={addMetric}><FiPlus /> Tambah Metrik</button>

 {/* Overall Preview */}
 <div style={{ marginTop: 20, padding: 16, background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '2px solid var(--border)', textAlign: 'center' }}>
 <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Overall Score (Preview)</div>
 <div style={{ fontSize: 36, fontWeight: 800, color: getColor(calcOverallScore(kpiForm.metrics)) }}>
 {calcOverallScore(kpiForm.metrics)}%
 </div>
 <div style={{ fontSize: 14, fontWeight: 700, color: getColor(calcOverallScore(kpiForm.metrics)) }}>
 Grade {getGrade(calcOverallScore(kpiForm.metrics))}
 </div>
 </div>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
 <button className="btn-primary" onClick={handleCreateKPI} disabled={!kpiForm.employeeId || kpiForm.metrics.length === 0}>
 <FiCheck /> Simpan KPI
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
