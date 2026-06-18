import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSearch, FiMapPin, FiClock, FiBriefcase, FiChevronRight, FiUsers, FiArrowRight } from 'react-icons/fi';
import { supabase } from '../../lib/supabase';
import './PublicCareers.css';

export default function PublicCareers() {
 const { slug } = useParams();
 const navigate = useNavigate();
 const [jobs, setJobs] = useState([]);
 const [settings, setSettings] = useState(null);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [filterDept, setFilterDept] = useState('all');
 const [filterType, setFilterType] = useState('all');

 useEffect(() => {
 fetchData();
 }, [slug]);

 const fetchData = async () => {
 setLoading(true);

 // Try to fetch career settings, fallback gracefully
 let settingsData = null;
 try {
 const { data } = await supabase
 .from('career_settings')
 .select('*')
 .eq('slug', slug || 'informasilowongan')
 .eq('is_active', true)
 .maybeSingle();
 settingsData = data;
 } catch (e) {
 // Table might not exist yet — use defaults
 console.log('career_settings not available, using defaults');
 }

 // Use defaults if no settings found
 setSettings(settingsData || {
 slug: slug || 'informasilowongan',
 company_name: 'HRIS Loka',
 company_description: 'Platform HRIS Modern untuk Perusahaan Indonesia',
 accent_color: '#0047AB',
 is_active: true,
 });

 // Fetch open jobs
 try {
 const { data: jobsData } = await supabase
 .from('job_postings')
 .select('*')
 .eq('status', 'open')
 .order('created_at', { ascending: false });
 setJobs(jobsData || []);
 } catch (e) {
 console.log('Could not fetch jobs:', e);
 setJobs([]);
 }

 setLoading(false);
 };

 // Dynamic accent color
 useEffect(() => {
 if (settings?.accent_color) {
 document.documentElement.style.setProperty('--career-primary', settings.accent_color);
 }
 return () => {
 document.documentElement.style.removeProperty('--career-primary');
 };
 }, [settings]);

 // Filters
 const departments = [...new Set(jobs.map(j => j.department).filter(Boolean))];
 const types = [...new Set(jobs.map(j => j.type).filter(Boolean))];

 const filtered = jobs.filter(j => {
 const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) ||
 (j.department || '').toLowerCase().includes(search.toLowerCase());
 const matchDept = filterDept === 'all' || j.department === filterDept;
 const matchType = filterType === 'all' || j.type === filterType;
 return matchSearch && matchDept && matchType;
 });

 const companyName = settings?.company_name || 'HRIS Loka';
 const companyDesc = settings?.company_description || 'Bergabunglah bersama kami dan kembangkan karir Anda.';

 if (loading) {
 return (
 <div className="career-page">
 <div className="career-hero">
 <div className="career-hero-content">
 <h1 style={{ opacity: 0.7 }}>Memuat...</h1>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="career-page">
 {/* Hero */}
 <div className="career-hero">
 <div className="career-hero-particles">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="career-particle" style={{ '--i': i }} />
 ))}
 </div>
 <div className="career-hero-content">
 <div className="career-hero-badge">Kami Sedang Merekrut!</div>
 <h1>Karir di {companyName}</h1>
 <p>{companyDesc}</p>

 <div className="career-search-bar">
 <FiSearch className="search-icon" />
 <input
 type="text"
 placeholder="Cari posisi, departemen, atau lokasi..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 />
 </div>

 <div className="career-stats">
 <div className="career-stat">
 <div className="career-stat-value">{jobs.length}</div>
 <div className="career-stat-label">Posisi Tersedia</div>
 </div>
 <div className="career-stat">
 <div className="career-stat-value">{departments.length}</div>
 <div className="career-stat-label">Departemen</div>
 </div>
 <div className="career-stat">
 <div className="career-stat-value">{types.length}</div>
 <div className="career-stat-label">Tipe Kerja</div>
 </div>
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="career-content">
 {/* Filters */}
 {(departments.length > 0 || types.length > 0) && (
 <div className="career-filters">
 <button
 className={`career-filter-btn ${filterDept === 'all' ? 'active' : ''}`}
 onClick={() => setFilterDept('all')}
 >
 Semua Dept
 </button>
 {departments.map(d => (
 <button
 key={d}
 className={`career-filter-btn ${filterDept === d ? 'active' : ''}`}
 onClick={() => setFilterDept(d)}
 >
 {d}
 </button>
 ))}
 {types.length > 0 && (
 <>
 <span style={{ width: 1, background: '#E2E8F0', margin: '0 4px' }} />
 {types.map(t => (
 <button
 key={t}
 className={`career-filter-btn ${filterType === t ? 'active' : ''}`}
 onClick={() => setFilterType(filterType === t ? 'all' : t)}
 >
 {t}
 </button>
 ))}
 </>
 )}
 </div>
 )}

 {/* Job List */}
 {filtered.length === 0 ? (
 <div className="career-empty">
 <div className="career-empty-icon"><FiBriefcase /></div>
 <h3>{jobs.length === 0 ? 'Belum ada lowongan tersedia' : 'Tidak ada lowongan ditemukan'}</h3>
 <p>{jobs.length === 0 ? 'Lowongan baru akan segera tersedia. Kunjungi halaman ini secara berkala.' : 'Coba ubah filter atau kata kunci pencarian Anda.'}</p>
 </div>
 ) : (
 <div className="career-job-list">
 {filtered.map(job => (
 <div
 key={job.id}
 className="career-job-card"
 onClick={() => navigate(`/careers/${slug}/job/${job.id}`)}
 >
 <div className="career-job-top">
 <div>
 <div className="career-job-title">{job.title}</div>
 <div className="career-job-dept">{job.department}</div>
 </div>
 <span className="career-job-type-badge">{job.type}</span>
 </div>

 <div className="career-job-meta">
 {job.location && (
 <span><FiMapPin size={14} /> {job.location}</span>
 )}
 <span><FiClock size={14} /> {job.type}</span>
 </div>

 {job.description && (
 <div className="career-job-desc">{job.description}</div>
 )}

 {job.requirements && job.requirements.length > 0 && (
 <div className="career-job-tags">
 {job.requirements.slice(0, 4).map((req, i) => (
 <span key={i} className="career-job-tag">{req}</span>
 ))}
 {job.requirements.length > 4 && (
 <span className="career-job-tag" style={{ opacity: 0.6 }}>+{job.requirements.length - 4} lainnya</span>
 )}
 </div>
 )}

 <div className="career-job-footer">
 <span>
 Diposting: {new Date(job.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
 {job.deadline && ` | Deadline: ${new Date(job.deadline).toLocaleDateString('id-ID')}`}
 </span>
 <button className="career-apply-btn" onClick={e => { e.stopPropagation(); navigate(`/careers/${slug}/apply/${job.id}`); }}>
 Lamar <FiArrowRight size={14} />
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="career-footer">
 <div style={{ marginBottom: 6 }}>{companyName} &mdash; Career Portal</div>
 <div>Powered by <a href="/">HRIS Loka</a></div>
 </div>
 </div>
 );
}
