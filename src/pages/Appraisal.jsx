import { useState, useEffect } from 'react';
import * as appraisalService from '../services/appraisalService';
import '../styles/shared.css';

const ratingStars = (score) => {
    const full = Math.floor(score);
    const half = score % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return (
        <span style={{ fontSize: 16, letterSpacing: 2 }}>
            {'★'.repeat(full)}
            {half ? '½' : ''}
            {'☆'.repeat(empty)}
        </span>
    );
};

export default function Appraisal() {
    const [appraisals, setAppraisals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data } = await appraisalService.getAllAppraisals();
        setAppraisals(data || []);
        setLoading(false);
    };

    return (
        <div>
            <div className="page-header">
                <h1>Appraisal & Review</h1>
            </div>

            {loading ? (
                <div style={{ padding: 20 }}>Loading...</div>
            ) : appraisals.length === 0 ? (
                <div className="info-card" style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Belum ada data appraisal</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>Data appraisal akan muncul setelah review dilakukan.</div>
                </div>
            ) : (
                <div className="data-table-card">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Karyawan</th>
                                    <th>Periode</th>
                                    <th style={{ textAlign: 'center' }}>Rating</th>
                                    <th>Reviewer</th>
                                    <th>Komentar</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appraisals.map((ap) => {
                                    const emp = ap.employee;
                                    const reviewer = ap.reviewer;
                                    return (
                                        <tr key={ap.id}>
                                            <td>
                                                <div className="employee-cell">
                                                    <div className="employee-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                                                        {(emp?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="employee-name">{emp?.name || '—'}</div>
                                                        <div className="employee-dept">{emp?.division || ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="chart-card-badge">{ap.period}</span></td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ color: '#F59E0B' }}>{ratingStars(ap.rating)}</div>
                                                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{ap.rating}/5</div>
                                            </td>
                                            <td style={{ fontSize: 13 }}>{reviewer?.name || '—'}</td>
                                            <td style={{ maxWidth: 220, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{ap.comments}</td>
                                            <td><span className={`status-badge ${ap.status}`}>
                                                {ap.status === 'completed' ? 'Selesai' : ap.status === 'in-progress' ? 'Berlangsung' : 'Draft'}
                                            </span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
