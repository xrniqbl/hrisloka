import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { FiUser, FiMail, FiPhone, FiX } from 'react-icons/fi';
import * as jobService from '../services/jobService';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

const stages = ['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'];
const stageLabels = {
  applied: 'Lamaran Masuk',
  screening: 'Screening',
  interview: 'Interview',
  offered: 'Offering',
  hired: 'Diterima',
  rejected: 'Ditolak',
};
const stageColors = {
  applied: '#6D8196',
  screening: '#0891b2',
  interview: '#635BFF',
  offered: '#D97706',
  hired: '#16A34A',
  rejected: '#DC2626',
};

export default function CandidatePipeline() {
  const { employee } = useAuth();
  const [candidatesList, setCandidatesList] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [draggedId, setDraggedId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: candData } = await jobService.getAllCandidates(employee?.company_id);
    const { data: jobData } = await jobService.getAllJobs(employee?.company_id);
    setCandidatesList(candData || []);
    setJobs(jobData || []);
    setLoading(false);
  }, [employee?.company_id]);

  useEffect(() => {
    // Don't fetch until the tenant (employee.company_id) is known, otherwise
    // we'd query cross-company data while employee is still null on mount.
    if (!employee?.company_id) return;
    fetchData();
  }, [employee?.company_id]);

  useRealtimeTable('candidates', fetchData, { companyId: employee?.company_id });

  const handleDragStart = (id) => setDraggedId(id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (stage) => {
    if (draggedId !== null) {
      await jobService.updateCandidate(draggedId, { stage });
      setDraggedId(null);
      fetchData();
    }
  };

  const handleAdvance = async () => {
    if (!selected) return;
    const currentIdx = stages.indexOf(selected.stage);
    if (currentIdx < stages.length - 2) {
      await jobService.updateCandidate(selected.id, { stage: stages[currentIdx + 1] });
      setSelected(null);
      fetchData();
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    await jobService.updateCandidate(selected.id, { stage: 'rejected' });
    setSelected(null);
    fetchData();
  };

  const pipelineStages = stages.filter((s) => s !== 'rejected');

  return (
    <div className="admin-page">
      <PageHeader titleKey="candidates.title" subtitleKey="candidates.subtitle" />

      {loading ? (
        <>
          <div className="page-header"><div className="skeleton skeleton-text" style={{ height: 28, width: 200 }} /></div>
          <CardSkeleton count={4} />
          <TableSkeleton rows={6} cols={5} />
        </>
      ) : candidatesList.length === 0 ? (
        <EmptyState
          title="Belum ada kandidat"
          description="Kandidat muncul saat ada lamaran masuk dari lowongan publik."
          ctaLabel="Kelola lowongan"
          onCta={() => { window.location.href = '/jobs'; }}
          secondaryLabel="Muat ulang"
          onSecondary={fetchData}
        />
      ) : (
        <>
          {/* Kanban Board */}
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 20 }}>
            {pipelineStages.map((stage) => {
              const stageCandidates = candidatesList.filter((c) => c.stage === stage);
              return (
                <div
                  key={stage}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage)}
                  className="chart-card"
                  style={{ flex: '0 0 260px', minHeight: 400 }}
                >
                  <div className="chart-card-header" style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: stageColors[stage] }}>{stageLabels[stage]}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: `${stageColors[stage]}15`, color: stageColors[stage],
                    }}>
                      {stageCandidates.length}
                    </span>
                  </div>

                  {stageCandidates.map((c) => {
                    const job = jobs.find((j) => j.id === c.job_id);
                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => handleDragStart(c.id)}
                        onClick={() => setSelected(c)}
                        className="info-card"
                        style={{ marginBottom: 10, cursor: 'grab' }}
                        onMouseOver={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                        onMouseOut={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                      >
                        <div className="td-semibold" style={{ marginBottom: 4 }}>{c.name}</div>
                        <div className="td-muted-sm" style={{ marginBottom: 6 }}>{job?.title || '-'}</div>
                        {c.skills && c.skills.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                            {c.skills.slice(0, 3).map((sk, i) => (
                              <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>{sk}</span>
                            ))}
                            {c.skills.length > 3 && <span className="td-muted-sm">+{c.skills.length - 3}</span>}
                          </div>
                        )}
                        <div className="td-muted-sm">
                          {new Date(c.applied_date || c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          {c.ref_number && <span style={{ marginLeft: 6, opacity: 0.6 }}>#{c.ref_number}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Candidate Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Kandidat</h2>
              <button className="modal-close" onClick={() => setSelected(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div className="employee-avatar" style={{ width: 60, height: 60, fontSize: 20, margin: '0 auto' }}>
                  {selected.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <h3 className="chart-card-title" style={{ marginTop: 12 }}>{selected.name}</h3>
                <p className="td-muted-sm">{(selected.job_postings || jobs.find(j => j.id === selected.job_id))?.title || '-'}</p>
              </div>

              <div className="form-grid">
                <div className="info-card">
                  <div className="info-row"><span className="info-row-label"><FiMail style={{ marginRight: 6 }} />Email</span><span className="info-row-value">{selected.email}</span></div>
                  <div className="info-row"><span className="info-row-label"><FiPhone style={{ marginRight: 6 }} />Telepon</span><span className="info-row-value">{selected.phone}</span></div>
                  <div className="info-row"><span className="info-row-label"><FiUser style={{ marginRight: 6 }} />Gender</span><span className="info-row-value">{selected.gender || '-'}</span></div>
                  {selected.address && <div className="info-row"><span className="info-row-label">Alamat</span><span className="info-row-value">{selected.address}</span></div>}
                </div>
                <div className="info-card">
                  <div className="info-row"><span className="info-row-label">Stage</span><span className={`status-badge ${selected.stage === 'hired' ? 'approved' : selected.stage === 'rejected' ? 'rejected' : 'pending'}`}>{stageLabels[selected.stage]}</span></div>
                  <div className="info-row"><span className="info-row-label">Applied</span><span className="info-row-value">{new Date(selected.applied_date || selected.created_at).toLocaleDateString('id-ID')}</span></div>
                  <div className="info-row"><span className="info-row-label">Ref</span><span className="info-row-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{selected.ref_number || '-'}</span></div>
                  {selected.expected_salary && <div className="info-row"><span className="info-row-label">Exp. Gaji</span><span className="info-row-value">Rp {Number(selected.expected_salary).toLocaleString('id-ID')}</span></div>}
                </div>
              </div>
              {selected.education?.level && (
                <div className="info-card mb-sm" style={{ fontSize: 13 }}>
                  <strong>Pendidikan:</strong> {selected.education.level} - {selected.education.major || ''} {selected.education.university ? `@ ${selected.education.university}` : ''} {selected.education.year ? `(${selected.education.year})` : ''}
                </div>
              )}
              {selected.skills && selected.skills.length > 0 && (
                <div className="btn-icon-row mb-sm" style={{ flexWrap: 'wrap' }}>
                  {selected.skills.map((sk, i) => (
                    <span key={i} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)' }}>{sk}</span>
                  ))}
                </div>
              )}
              {selected.cover_letter && (
                <div className="info-card mb-sm" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong>Cover Letter:</strong><br />{selected.cover_letter}
                </div>
              )}
              {(selected.linkedin_url || selected.portfolio_url || selected.resume_url) && (
                <div className="btn-icon-row" style={{ flexWrap: 'wrap' }}>
                  {selected.resume_url && <a href={selected.resume_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>Resume/CV</a>}
                  {selected.linkedin_url && <a href={selected.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>LinkedIn</a>}
                  {selected.portfolio_url && <a href={selected.portfolio_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>Portfolio</a>}
                </div>
              )}
              {selected.notes && (
                <div className="info-card" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong>Catatan:</strong> {selected.notes}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-danger" onClick={handleReject}>Reject</button>
              <button className="btn-primary" onClick={handleAdvance}>Advance Stage</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
