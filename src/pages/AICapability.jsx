import { useState, useEffect } from 'react';
import { FiEye, FiX, FiZap, FiCpu, FiAward } from 'react-icons/fi';
import * as employeeService from '../services/employeeService';
import '../styles/shared.css';

const levelColors = { beginner: '#6D8196', intermediate: '#F59E0B', advanced: '#0047AB', expert: '#16A34A' };
const levelLabels = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' };

function getReadinessLabel(score) {
    if (score >= 80) return { label: 'Highly Adaptive', color: '#16A34A' };
    if (score >= 60) return { label: 'Adaptive', color: '#0047AB' };
    if (score >= 40) return { label: 'Developing', color: '#F59E0B' };
    return { label: 'Low Adoption', color: '#DC2626' };
}

// Generate demo AI capability data from real employees
function generateAICapabilities(employees) {
    const skills = [
        { name: 'Prompt Engineering', levels: ['beginner', 'intermediate', 'advanced', 'expert'] },
        { name: 'Data Analysis with AI', levels: ['beginner', 'intermediate', 'advanced'] },
        { name: 'AI-Assisted Writing', levels: ['beginner', 'intermediate', 'advanced', 'expert'] },
        { name: 'Machine Learning Basics', levels: ['beginner', 'intermediate'] },
        { name: 'AI Ethics & Governance', levels: ['beginner', 'intermediate', 'advanced'] },
    ];

    return employees.map((emp, idx) => {
        const seed = (emp.id || idx) * 7;
        const empSkills = skills.slice(0, 3 + (seed % 3)).map((s, i) => {
            const score = 30 + ((seed + i * 17) % 60);
            const levelIdx = Math.min(Math.floor(score / 25), s.levels.length - 1);
            return { name: s.name, score, level: s.levels[levelIdx] };
        });
        const certs = score => score > 70 ? ['Google AI Essentials'] : score > 50 ? ['Microsoft AI Fundamentals'] : [];
        const avgScore = Math.round(empSkills.reduce((s, sk) => s + sk.score, 0) / empSkills.length);
        return {
            employeeId: emp.id,
            emp,
            skills: empSkills,
            avgScore,
            certifications: certs(avgScore),
            lastAssessed: new Date(Date.now() - (seed % 30) * 86400000).toISOString().split('T')[0],
        };
    });
}

export default function AICapability() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [reviewEmpId, setReviewEmpId] = useState('');
    const [reviewResult, setReviewResult] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        (async () => {
            const { data } = await employeeService.getAllEmployees();
            setEmployees(data || []);
            setLoading(false);
        })();
    }, []);

    const aiCapabilities = generateAICapabilities(employees);
    const divisions = [...new Set(employees.map(e => e.division).filter(Boolean))];

    function getDivisionScore(division) {
        const divCaps = aiCapabilities.filter(ac => ac.emp?.division === division);
        if (!divCaps.length) return 0;
        return Math.round(divCaps.reduce((sum, ac) => sum + ac.avgScore, 0) / divCaps.length);
    }

    const filtered = aiCapabilities.filter(m => (m.emp?.name || '').toLowerCase().includes(search.toLowerCase()));

    const openProfile = (ac) => { setSelected(ac); setModal('profile'); };
    const openSmartReview = () => { setReviewEmpId(''); setReviewResult(''); setModal('review'); };
    const closeModal = () => { setModal(null); setSelected(null); setReviewResult(''); };

    const generateReview = () => {
        const emp = employees.find(e => e.id === Number(reviewEmpId) || e.id === reviewEmpId);
        const aiCap = aiCapabilities.find(ac => ac.employeeId === emp?.id);

        if (!emp) { setReviewResult('Pilih karyawan terlebih dahulu.'); return; }

        const aiInfo = aiCap ? `AI Skills: ${aiCap.skills.map(s => `${s.name} (${s.level}, ${s.score}%)`).join(', ')}. Sertifikasi: ${aiCap.certifications.length ? aiCap.certifications.join(', ') : 'Belum ada'}.` : 'Belum ada data AI Capability.';

        const draft = `📋 DRAF EVALUASI KINERJA BULANAN
═══════════════════════════════════

Karyawan: ${emp.name}
Divisi: ${emp.division || '-'} — ${emp.position || '-'}
Periode: ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}

─── AI Readiness ───
${aiInfo}

─── Ringkasan ───
${emp.name} menunjukkan performa yang baik di posisi ${emp.position || '-'}. ${aiCap ? `Dari sisi adopsi teknologi AI, karyawan ini berada di level ${aiCap.skills[0]?.level || 'beginner'} untuk Prompt Engineering.` : ''} 

─── Rekomendasi ───
${aiCap && aiCap.skills.some(s => s.score < 50) ? '• Sertakan dalam program pelatihan AI perusahaan\n' : ''}• Lanjutkan pengembangan kompetensi melalui mentoring
• Evaluasi ulang target untuk kuartal berikutnya

─── Status: DRAFT — Perlu review HR Manager ───`;

        setReviewResult(draft);
    };

    if (loading) return <div className="animate-in"><h1>AI Capability Mapping</h1><p style={{ color: 'var(--muted)' }}>Memuat data...</p></div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>AI Capability Mapping</h1>
                <div className="page-header-actions">
                    <button className="btn-primary" onClick={openSmartReview}><FiZap /> Smart Review Generator</button>
                </div>
            </div>

            {/* Division AI Readiness Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
                {divisions.map(div => {
                    const score = getDivisionScore(div);
                    const readiness = getReadinessLabel(score);
                    return (
                        <div key={div} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, boxShadow: 'var(--shadow-card)' }}>
                            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{div}</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: readiness.color, marginBottom: 8 }}>{score}%</div>
                            <div className="progress-bar" style={{ marginBottom: 8 }}>
                                <div className="progress-fill" style={{ width: `${score}%`, background: readiness.color }} />
                            </div>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: readiness.color }}>{readiness.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Employee AI Skills Table */}
            <div className="filters-bar">
                <input className="filter-search" placeholder="Cari karyawan..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="data-table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Karyawan</th>
                            <th>Divisi</th>
                            <th>Avg Score</th>
                            <th>Top Skill</th>
                            <th>Sertifikasi</th>
                            <th>Last Assessed</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Belum ada data karyawan.</td></tr>
                        ) : filtered.map(m => {
                            const topSkill = m.skills.reduce((a, b) => a.score > b.score ? a : b);
                            return (
                                <tr key={m.employeeId}>
                                    <td style={{ fontWeight: 600 }}>{m.emp?.name}</td>
                                    <td>{m.emp?.division}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div className="progress-bar" style={{ width: 60 }}>
                                                <div className="progress-fill" style={{ width: `${m.avgScore}%`, background: getReadinessLabel(m.avgScore).color }} />
                                            </div>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{m.avgScore}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: levelColors[topSkill.level] }}>
                                            {topSkill.name}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12 }}>{m.certifications.length ? m.certifications.join(', ') : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                                    <td style={{ fontSize: 12 }}>{m.lastAssessed}</td>
                                    <td><button className="action-btn" onClick={() => openProfile(m)}><FiEye /></button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Employee AI Profile Modal */}
            {modal === 'profile' && selected && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><FiCpu style={{ marginRight: 8 }} /> AI Profile — {selected.emp?.name}</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{selected.emp?.division} — {selected.emp?.position}</div>
                                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Last assessed: {selected.lastAssessed}</div>
                            </div>
                            <div style={{ display: 'grid', gap: 12 }}>
                                {selected.skills.map(sk => (
                                    <div key={sk.name} style={{ padding: 14, background: 'var(--bg)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{sk.name}</div>
                                            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: levelColors[sk.level] }}>{levelLabels[sk.level]}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 }}>
                                            <div className="progress-bar" style={{ flex: 1 }}>
                                                <div className="progress-fill" style={{ width: `${sk.score}%`, background: levelColors[sk.level] }} />
                                            </div>
                                            <span style={{ fontWeight: 700, fontSize: 14, minWidth: 36, textAlign: 'right' }}>{sk.score}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {selected.certifications.length > 0 && (
                                <div style={{ marginTop: 20 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Sertifikasi</div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {selected.certifications.map(c => (
                                            <span key={c} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#EFF6FF', color: '#0047AB', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <FiAward size={14} /> {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Smart Review Generator Modal */}
            {modal === 'review' && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><FiZap style={{ marginRight: 8 }} /> Smart Review Generator</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Pilih karyawan untuk men-generate draf evaluasi kinerja bulanan secara otomatis berdasarkan data AI Capability.</p>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                <select className="form-select" style={{ flex: 1 }} value={reviewEmpId} onChange={e => setReviewEmpId(e.target.value)}>
                                    <option value="">— Pilih Karyawan —</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.division || '-'}</option>)}
                                </select>
                                <button className="btn-primary" onClick={generateReview} disabled={!reviewEmpId}><FiZap /> Generate</button>
                            </div>
                            {reviewResult && (
                                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: 20, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
                                    {reviewResult}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
