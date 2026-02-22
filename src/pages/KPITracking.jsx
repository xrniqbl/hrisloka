import { useState, useEffect, useMemo } from 'react';
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
import * as kpiService from '../services/kpiService';
import '../styles/shared.css';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const chartFont = { family: 'Plus Jakarta Sans', weight: '500' };

export default function KPITracking() {
    const [kpiData, setKpiData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data } = await kpiService.getAllKPIs();
        setKpiData(data || []);
        setLoading(false);
    };

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

    // ─── Average scores for radar overview ───
    const avgMetrics = useMemo(() => {
        if (kpiData.length === 0) return null;
        const metricNames = ['Disiplin', 'Kerjasama Tim', 'Inisiatif', 'Kualitas Kerja', 'Produktivitas'];
        const scores = metricNames.map(name => {
            let total = 0, count = 0;
            kpiData.forEach(kpi => {
                const metrics = kpi.kpi_metrics || [];
                const match = metrics.find(m => m.name === name);
                if (match) { total += match.score; count++; }
            });
            return count > 0 ? Math.round(total / count) : 0;
        });
        return { labels: metricNames, scores };
    }, [kpiData]);

    // ─── Selected employee radar ───
    const selectedRadar = useMemo(() => {
        if (!selectedEmployee) return null;
        const kpi = kpiData.find(k => k.id === selectedEmployee);
        if (!kpi) return null;
        const metrics = kpi.kpi_metrics || [];
        return {
            labels: metrics.map(m => m.name),
            scores: metrics.map(m => m.score),
            employee: kpi.employees,
            overall: kpi.overall_score,
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

    return (
        <div>
            <div className="page-header">
                <h1>KPI Tracking</h1>
            </div>

            {loading ? (
                <div style={{ padding: 20 }}>Loading...</div>
            ) : kpiData.length === 0 ? (
                <div className="info-card" style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Belum ada data KPI</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>KPI records akan muncul setelah data diinput ke database.</div>
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
                                        <div style={{ fontSize: 15, fontWeight: 700 }}>🕸️ Radar Kinerja Perusahaan</div>
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
                                        <div style={{ fontSize: 15, fontWeight: 700 }}>👤 {selectedRadar.employee?.name || 'Karyawan'}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                            {selectedRadar.employee?.position} — {selectedRadar.employee?.division}
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

                    {/* Employee KPI Cards */}
                    <div className="cards-grid">
                        {kpiData.map((kpi) => {
                            const emp = kpi.employees;
                            const metrics = kpi.kpi_metrics || [];
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
                                            <div style={{ fontSize: 14, fontWeight: 700 }}>{emp?.name || '—'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{emp?.position || ''} — {emp?.division || ''}</div>
                                        </div>
                                        <div style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        }}>
                                            <div style={{
                                                width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 15, fontWeight: 700, color: getColor(kpi.overall_score),
                                                background: `${getColor(kpi.overall_score)}12`, border: `2px solid ${getColor(kpi.overall_score)}`,
                                            }}>
                                                {kpi.overall_score}
                                            </div>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: getColor(kpi.overall_score), marginTop: 4 }}>
                                                Grade {getGrade(kpi.overall_score)}
                                            </span>
                                        </div>
                                    </div>

                                    {metrics.map((m, i) => (
                                        <div key={i} style={{ marginBottom: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                                                <span style={{ fontWeight: 600 }}>{m.actual} / {m.target} ({m.score}%)</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: `${Math.min(100, m.score)}%`, background: getColor(m.score) }} />
                                            </div>
                                        </div>
                                    ))}

                                    <div style={{ marginTop: 14, padding: '10px 0 0', borderTop: '1px solid var(--border)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <span style={{ color: 'var(--muted)' }}>Periode:</span>{' '}
                                            <strong>{kpi.period}</strong>
                                        </div>
                                        <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: 11 }}>
                                            {isSelected ? '✕ Tutup Radar' : '📊 Lihat Radar'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
