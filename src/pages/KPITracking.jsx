import { useState, useEffect } from 'react';
import * as kpiService from '../services/kpiService';
import '../styles/shared.css';

export default function KPITracking() {
    const [kpiData, setKpiData] = useState([]);
    const [loading, setLoading] = useState(true);

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
                <div className="cards-grid">
                    {kpiData.map((kpi) => {
                        const emp = kpi.employees;
                        const metrics = kpi.kpi_metrics || [];
                        return (
                            <div className="info-card" key={kpi.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700 }}>{emp?.name || '—'}</div>
                                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{emp?.position || ''} — {emp?.division || ''}</div>
                                    </div>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 15, fontWeight: 700, color: getColor(kpi.overall_score),
                                        background: `${getColor(kpi.overall_score)}12`, border: `2px solid ${getColor(kpi.overall_score)}`,
                                    }}>
                                        {kpi.overall_score}
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

                                <div style={{ marginTop: 14, padding: '10px 0 0', borderTop: '1px solid var(--border)', fontSize: 12 }}>
                                    <span style={{ color: 'var(--muted)' }}>Periode:</span>{' '}
                                    <strong>{kpi.period}</strong>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
