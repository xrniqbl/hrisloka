import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMapPin, FiClock, FiBriefcase, FiCalendar, FiUsers, FiChevronRight } from 'react-icons/fi';
import { supabase } from '../../lib/supabase';
import './PublicCareers.css';

export default function PublicJobDetail() {
 const { slug, jobId } = useParams();
 const navigate = useNavigate();
 const [job, setJob] = useState(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetchJob();
 }, [jobId]);

 const fetchJob = async () => {
 setLoading(true);
 const { data } = await supabase
 .from('job_postings')
 .select('*')
 .eq('id', Number(jobId))
 .single();
 setJob(data);
 setLoading(false);
 };

 if (loading) {
 return (
 <div className="career-page">
 <div className="career-detail" style={{ textAlign: 'center', padding: '80px 24px', color: '#94A3B8' }}>
 Memuat detail lowongan...
 </div>
 </div>
 );
 }

 if (!job) {
 return (
 <div className="career-page">
 <div className="career-detail" style={{ textAlign: 'center', padding: '80px 24px' }}>
 <h2 style={{ marginBottom: 8, fontSize: 20, fontWeight: 700 }}>Lowongan tidak ditemukan</h2>
 <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 20 }}>Lowongan mungkin sudah ditutup atau dihapus.</p>
 <button className="career-back-btn" onClick={() => navigate(`/careers/${slug}`)}>
 <FiArrowLeft /> Kembali ke daftar lowongan
 </button>
 </div>
 </div>
 );
 }

 return (
 <div className="career-page">
 <div className="career-detail">
 <button className="career-back-btn" onClick={() => navigate(`/careers/${slug}`)}>
 <FiArrowLeft /> Kembali
 </button>

 {/* Header */}
 <div className="career-detail-header">
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
 <div>
 <h1>{job.title}</h1>
 <div style={{ color: 'var(--career-primary)', fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
 {job.department}
 </div>
 </div>
 <span className="career-job-type-badge" style={{ fontSize: 13, padding: '6px 18px' }}>{job.type}</span>
 </div>

 <div className="career-job-meta" style={{ marginBottom: 0 }}>
 {job.location && <span><FiMapPin size={14} /> {job.location}</span>}
 <span><FiClock size={14} /> {job.type}</span>
 {job.deadline && (
 <span><FiCalendar size={14} /> Deadline: {new Date(job.deadline).toLocaleDateString('id-ID')}</span>
 )}
 <span><FiUsers size={14} /> {job.applicants || 0} pelamar</span>
 </div>
 </div>

 {/* Description */}
 {job.description && (
 <div className="career-detail-section">
 <h3><FiBriefcase style={{ marginRight: 8 }} /> Deskripsi Pekerjaan</h3>
 <p style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
 </div>
 )}

 {/* Requirements */}
 {job.requirements && job.requirements.length > 0 && (
 <div className="career-detail-section">
 <h3>Persyaratan</h3>
 <ul>
 {job.requirements.map((req, i) => (
 <li key={i}>{req}</li>
 ))}
 </ul>
 </div>
 )}

 {/* Apply CTA */}
 <div className="career-detail-section" style={{ textAlign: 'center', padding: '32px 28px' }}>
 <h3 style={{ marginBottom: 8, fontSize: 20 }}>Tertarik dengan posisi ini?</h3>
 <p style={{ fontSize: 14, color: 'var(--career-text-secondary)', marginBottom: 20 }}>
 Kirim lamaran Anda sekarang dan jadilah bagian dari tim kami!
 </p>
 <button
 className="career-apply-btn"
 style={{ fontSize: 16, padding: '14px 40px' }}
 onClick={() => navigate(`/careers/${slug}/apply/${job.id}`)}
 >
 Lamar Sekarang <FiChevronRight size={16} />
 </button>
 </div>
 </div>

 <div className="career-footer">
 Powered by <a href="/">HRIS Loka</a> — Platform HRIS Modern
 </div>
 </div>
 );
}
