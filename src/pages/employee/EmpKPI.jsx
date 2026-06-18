import { useState, useEffect, useCallback } from 'react';
import {
  HiArrowTrendingUp,
  HiChevronDown,
  HiTrophy
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getEmployeeKPI } from '../../services/kpiService';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

function calcScore(actual, target) {
  if (!target || target === 0) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

function calcOverallScore(metrics) {
  if (!metrics || metrics.length === 0) return 0;
  let totalWeighted = 0, totalWeight = 0;
  metrics.forEach(m => {
    const score = calcScore(m.actual, m.target);
    const weight = m.weight || 1;
    totalWeighted += score * weight;
    totalWeight += weight;
  });
  return totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;
}

const getColor = (score) => {
  if (score >= 90) return '#16A34A';
  if (score >= 70) return '#0047AB';
  if (score >= 50) return '#F59E0B';
  return '#DC2626';
};

const getGrade = (score) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
};

export default function EmpKPI() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const email = user?.email || user?.user_metadata?.email;
    const { data: empData } = await getEmployeeByEmail(email);
    if (empData) {
      setEmp(empData);
      const { data: kpiData } = await getEmployeeKPI(empData.id);
      setKpis(kpiData || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  const getFeedback = (score) => {
    if (locale === 'en') {
      return score >= 90 ? 'Outstanding!' : score >= 70 ? 'Good, keep it up!' : score >= 50 ? 'Fair, room for improvement.' : 'Needs significant improvement.';
    }
    return score >= 90 ? 'Luar Biasa!' : score >= 70 ? 'Baik, terus tingkatkan!' : score >= 50 ? 'Cukup, masih bisa lebih baik.' : 'Perlu peningkatan signifikan.';
  };

  if (loading) return (
    <div style={{ animation: "fadeInUp 0.3s ease" }}>
      <div style={{ marginBottom: 16 }}>
        <div className="skeleton skeleton-text" style={{ width: 150, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 200 }} />
      </div>
      {/* Score hero skeleton */}
      <div className="emp-card" style={{ textAlign: 'center', marginBottom: 20, padding: '28px 20px' }}>
        <div className="skeleton skeleton-circle" style={{ width: 110, height: 110, margin: '0 auto 12px' }} />
        <div className="skeleton skeleton-text" style={{ width: 80, margin: '0 auto 6px' }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 140, margin: '0 auto' }} />
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {[1, 2].map(i => (
          <div key={i} className="emp-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="skeleton skeleton-text" style={{ width: 100, marginBottom: 6 }} />
              <div className="skeleton skeleton-text-sm" style={{ width: 60 }} />
            </div>
            <div className="skeleton skeleton-circle" style={{ width: 44, height: 44 }} />
          </div>
        ))}
      </div>
    </div>
  );

  if (!emp) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Data tidak ditemukan.</div>;

  const latestKpi = kpis[0];
  const latestScore = latestKpi ? calcOverallScore(latestKpi.kpi_metrics || []) : null;

  return (
    <div className="emp-page">
      <div style={{ marginBottom: 16 }}>
        <h1 className="emp-page-title">{locale === 'en' ? 'KPI & Performance' : 'KPI & Kinerja'}</h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'Your performance targets and achievements' : 'Target dan pencapaian kinerja Anda'}
        </p>
      </div>

      {/* Score Hero Card */}
      {latestKpi ? (
        <div className="emp-card emp-card-gradient" style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8, marginBottom: 8 }}>
            {locale === 'en' ? 'Latest Score' : 'Skor Terbaru'} — {latestKpi.period}
          </div>
          <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 12px' }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#fff" strokeWidth="8"
                strokeDasharray={`${(latestScore / 100) * 264} 264`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{latestScore}</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>/ 100</div>
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Grade {getGrade(latestScore)}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{getFeedback(latestScore)}</div>
        </div>
      ) : (
        <div className="emp-card emp-empty" style={{ marginBottom: 20 }}>
          <div className="emp-empty-icon"><HiArrowTrendingUp size={24} /></div>
          <div className="emp-empty-title">{locale === 'en' ? 'No KPI data yet' : 'Belum ada KPI'}</div>
          <div className="emp-empty-desc">{locale === 'en' ? 'Admin has not set KPI targets for you yet.' : 'Admin belum menetapkan KPI untuk Anda.'}</div>
        </div>
      )}

      {/* KPI List */}
      {kpis.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {kpis.map((kpi, idx) => {
            const metrics = kpi.kpi_metrics || [];
            const overall = calcOverallScore(metrics);
            const isExpanded = expandedId === kpi.id;
            const color = getColor(overall);
            return (
              <div key={kpi.id} className="emp-card emp-card-interactive emp-card-stagger" style={{ padding: 16 }}
                onClick={() => setExpandedId(isExpanded ? null : kpi.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{kpi.period}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {metrics.length} {locale === 'en' ? 'metrics' : 'metrik'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color, background: `${color}12`, border: `2px solid ${color}` }}>
                        {overall}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color, marginTop: 2 }}>Grade {getGrade(overall)}</span>
                    </div>
                    <HiChevronDown size={16} style={{ color: 'var(--muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    {metrics.map((m, i) => {
                      const score = calcScore(m.actual, m.target);
                      const barColor = getColor(score);
                      return (
                        <div key={i} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {m.name}
                              {m.weight && m.weight !== 1 && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>({locale === 'en' ? 'weight' : 'bobot'}: {m.weight}x)</span>}
                            </span>
                            <span style={{ fontWeight: 700, color: barColor }}>{score}%</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginBottom: 4 }}>
                            <div className="emp-progress-fill" style={{ height: '100%', width: `${Math.min(100, score)}%`, borderRadius: 4, background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)` }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                            <span>{locale === 'en' ? 'Actual' : 'Aktual'}: {m.actual}</span>
                            <span>Target: {m.target}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ padding: '12px 14px', background: `${color}08`, borderRadius: 8, border: `1px solid ${color}20`, textAlign: 'center', marginTop: 4 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Overall Score</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color }}>{overall}%</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color }}>Grade {getGrade(overall)}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
