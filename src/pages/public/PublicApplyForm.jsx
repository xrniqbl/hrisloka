import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
 FiArrowLeft, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar,
 FiBook, FiBriefcase, FiPlus, FiX, FiCheck, FiFileText, FiLink, FiSend, FiDollarSign,
 FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { supabase } from '../../lib/supabase';
import './PublicCareers.css';

const educationLevels = ['SMA/SMK', 'D3', 'S1', 'S2', 'S3'];
const genderOptions = [{ value: 'Laki-laki', label: '♂ Laki-laki' }, { value: 'Perempuan', label: '♀ Perempuan' }];
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS_ID = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

function DatePicker({ value, onChange, placeholder = 'Pilih Tanggal' }) {
 const [open, setOpen] = useState(false);
 const [view, setView] = useState(() => value ? new Date(value) : new Date());
 const [popupPos, setPopupPos] = useState({ top: 0, left: 0, width: 300 });
 const ref = useRef();
 const inputRef = useRef();
 useEffect(() => {
  const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
  document.addEventListener('mousedown', h);
  return () => document.removeEventListener('mousedown', h);
 }, []);
 const openPicker = () => {
  if (inputRef.current) {
   const r = inputRef.current.getBoundingClientRect();
   // position:fixed = viewport coords, do NOT add scrollY
   setPopupPos({ top: r.bottom + 8, left: r.left, width: Math.max(r.width, 300) });
  }
  setOpen(o => !o);
 };
 const yr = view.getFullYear(), mo = view.getMonth();
 const firstDay = new Date(yr, mo, 1).getDay();
 const daysInMo = new Date(yr, mo + 1, 0).getDate();
 const sel = value ? new Date(value) : null;
 const today = new Date();
 const fmt = d => new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
 const pick = day => {
  onChange(new Date(yr, mo, day).toISOString().split('T')[0]);
  setOpen(false);
 };
 return (
  <div className="cf-datepicker" ref={ref}>
   <div className={`cf-datepicker-input${open ? ' open' : ''}`} ref={inputRef} onClick={openPicker}>
    <FiCalendar size={15} className="cf-dp-icon" />
    <span className={value ? 'cf-date-value' : 'cf-date-placeholder'}>{value ? fmt(value) : placeholder}</span>
    {value && <button type="button" className="cf-date-clear" onClick={e => { e.stopPropagation(); onChange(''); }}><FiX size={13} /></button>}
   </div>
   {open && (
    <div className="cf-datepicker-popup" style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, width: 300, zIndex: 9999 }}>
     <div className="cf-dp-header">
      <button type="button" className="cf-dp-nav" onClick={() => setView(new Date(yr, mo - 1, 1))}><FiChevronLeft size={16} /></button>
      <span className="cf-dp-title">{MONTHS_ID[mo]} {yr}</span>
      <button type="button" className="cf-dp-nav" onClick={() => setView(new Date(yr, mo + 1, 1))}><FiChevronRight size={16} /></button>
     </div>
     <div className="cf-dp-days-header">{DAYS_ID.map(d => <div key={d} className="cf-dp-day-name">{d}</div>)}</div>
     <div className="cf-dp-grid">
      {Array.from({ length: firstDay }).map((_, i) => <div key={i} className="cf-dp-cell empty" />)}
      {Array.from({ length: daysInMo }, (_, i) => i + 1).map(day => {
       const isSel = sel && sel.getFullYear()===yr && sel.getMonth()===mo && sel.getDate()===day;
       const isTdy = today.getFullYear()===yr && today.getMonth()===mo && today.getDate()===day;
       return <button type="button" key={day} className={`cf-dp-cell${isSel?' selected':''}${isTdy&&!isSel?' today':''}`} onClick={() => pick(day)}>{day}</button>;
      })}
     </div>
     <div className="cf-dp-footer">
      <button type="button" className="cf-dp-today" onClick={() => { const t=new Date(); setView(t); onChange(t.toISOString().split('T')[0]); setOpen(false); }}>Hari Ini</button>
     </div>
    </div>
   )}
  </div>
 );
}

export default function PublicApplyForm() {
 const { slug, jobId } = useParams();
 const navigate = useNavigate();
 const [job, setJob] = useState(null);
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);
 const [success, setSuccess] = useState(false);
 const [refNumber, setRefNumber] = useState('');

 // Form state
 const [form, setForm] = useState({
 name: '',
 email: '',
 phone: '',
 gender: '',
 birthDate: '',
 address: '',
 // Education
 eduLevel: 'S1',
 eduMajor: '',
 eduUniversity: '',
 eduYear: '',
 // Experience
 experiences: [{ company: '', position: '', startYear: '', endYear: '', description: '' }],
 // Skills
 skills: '',
 // Files
 resumeFile: null,
 coverLetter: '',
 linkedinUrl: '',
 portfolioUrl: '',
 expectedSalary: '',
 });

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

 const handleChange = (field, value) => {
 setForm(prev => ({ ...prev, [field]: value }));
 };

 const handleExpChange = (index, field, value) => {
 setForm(prev => {
 const experiences = [...prev.experiences];
 experiences[index] = { ...experiences[index], [field]: value };
 return { ...prev, experiences };
 });
 };

 const addExperience = () => {
 setForm(prev => ({
 ...prev,
 experiences: [...prev.experiences, { company: '', position: '', startYear: '', endYear: '', description: '' }]
 }));
 };

 const removeExperience = (index) => {
 setForm(prev => ({
 ...prev,
 experiences: prev.experiences.filter((_, i) => i !== index)
 }));
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!form.name || !form.email || !form.phone) return;
 setSubmitting(true);
 try {
 // Upload resume if provided
 let resumeUrl = null;
 if (form.resumeFile) {
 const ext = form.resumeFile.name.split('.').pop();
 const fileName = `${Date.now()}_${form.name.replace(/\s+/g, '_')}.${ext}`;
 const { data: uploadData, error: uploadError } = await supabase.storage
 .from('resumes').upload(fileName, form.resumeFile);
 if (!uploadError && uploadData) {
 const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(fileName);
 resumeUrl = urlData?.publicUrl || null;
 }
 }
 const ref = `APP-${Date.now().toString(36).toUpperCase()}`;
 const education = { level: form.eduLevel, major: form.eduMajor, university: form.eduUniversity, year: form.eduYear };
 const experience = form.experiences.filter(exp => exp.company || exp.position);
 const skillsArray = form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

 // Insert candidate into pipeline
 const { data: candidateData, error } = await supabase.from('candidates').insert({
 job_id: Number(jobId), name: form.name, email: form.email, phone: form.phone,
 gender: form.gender || null, birth_date: form.birthDate || null, address: form.address || null,
 education, experience, skills: skillsArray, resume_url: resumeUrl,
 cover_letter: form.coverLetter || null, linkedin_url: form.linkedinUrl || null,
 portfolio_url: form.portfolioUrl || null,
 expected_salary: form.expectedSalary ? Number(form.expectedSalary) : null,
 stage: 'applied', source: 'Career Page', rating: 0, ref_number: ref, notes: null,
 applied_date: new Date().toISOString().split('T')[0],
 }).select().single();

 if (error) {
 console.error('Submit error:', error);
 const msg = error.code === '23505' ? 'Email ini sudah pernah melamar posisi ini.' : `Gagal mengirim: ${error.message}`;
 alert(msg);
 setSubmitting(false);
 return;
 }

 // Audit Trail (non-blocking)
 supabase.from('audit_trails').insert({
 user_id: null, action: 'APPLICATION_SUBMITTED', target_table: 'candidates',
 target_id: String(candidateData?.id || ''),
 new_value: JSON.stringify({ name: form.name, email: form.email, job_id: jobId, job_title: job?.title, ref_number: ref }),
 }).catch(() => {});

 // Analytics (non-blocking)
 supabase.from('website_analytics').insert({
 event_type: 'job_application', page: `/careers/${slug}/apply/${jobId}`,
 metadata: JSON.stringify({ job_id: jobId, job_title: job?.title, department: job?.department, ref }),
 }).catch(() => {});

 // Update applicant count
 if (job) {
 await supabase.from('job_postings').update({ applicants: (job.applicants || 0) + 1 }).eq('id', job.id);
 }
 setRefNumber(ref);
 setSuccess(true);
 } catch (err) {
 console.error(err);
 alert('Terjadi kesalahan. Silakan coba lagi.');
 }
 setSubmitting(false);
 };

 if (loading) {
 return (
 <div className="career-page">
 <div className="career-form-page" style={{ textAlign: 'center', padding: '80px 24px', color: '#94A3B8' }}>
 Memuat form lamaran...
 </div>
 </div>
 );
 }

 if (!job) {
 return (
 <div className="career-page">
 <div className="career-form-page" style={{ textAlign: 'center', padding: '80px 24px' }}>
 <h2 style={{ marginBottom: 8, fontSize: 20, fontWeight: 700 }}>Lowongan tidak ditemukan</h2>
 <button className="career-back-btn" onClick={() => navigate(`/careers/${slug}`)}>
 <FiArrowLeft /> Kembali
 </button>
 </div>
 </div>
 );
 }

 if (success) {
 return (
 <div className="career-page">
 <div className="career-form-page">
 <div className="career-form-card">
 <div className="career-success">
 <div className="career-success-icon"><FiCheck /></div>
 <h2>Lamaran Terkirim!</h2>
 <p>
 Terima kasih telah melamar posisi <strong>{job.title}</strong>.
 Lamaran Anda sedang kami review.
 </p>
 <div style={{
 background: '#F0FDF4',
 padding: '14px 20px',
 borderRadius: 10,
 margin: '20px auto 0',
 maxWidth: 320,
 fontSize: 13,
 fontWeight: 600,
 color: '#16A34A',
 }}>
 Nomor Referensi: {refNumber}
 </div>
 <button
 className="career-back-btn"
 style={{ margin: '24px auto 0', display: 'inline-flex' }}
 onClick={() => navigate(`/careers/${slug}`)}
 >
 <FiArrowLeft /> Lihat Lowongan Lain
 </button>
 </div>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="career-page">
 <div className="career-form-page">
 <button className="career-back-btn" onClick={() => navigate(`/careers/${slug}/job/${jobId}`)}>
 <FiArrowLeft /> Kembali ke Detail
 </button>

 {/* Job Info */}
 <div className="career-form-card career-job-info-card" style={{ background: 'linear-gradient(135deg, #0047AB, #1a237e)', color: '#fff', border: 'none', padding: '20px 24px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
 <FiBriefcase size={20} style={{ color: '#fff' }} />
 <div>
 <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Lamar: {job.title}</div>
 <div style={{ fontSize: 13, opacity: 0.8, color: '#fff' }}>{job.department} — {job.location || 'Indonesia'}</div>
 </div>
 </div>
 </div>

 <form onSubmit={handleSubmit}>
 {/* Data Diri */}
 <div className="career-form-card">
 <h2><span className="cf-section-icon blue"><FiUser size={15} /></span> Data Diri</h2>
 <div className="career-form-body">
 <div className="career-form-grid">
 <div className="career-form-group">
 <label className="career-form-label">Nama Lengkap <span className="required">*</span></label>
 <input className="career-form-input" required value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Ahmad Rizky Pratama" />
 </div>
 <div className="career-form-group">
 <label className="career-form-label">Email <span className="required">*</span></label>
 <input className="career-form-input" type="email" required value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="ahmad@email.com" />
 </div>
 <div className="career-form-group">
 <label className="career-form-label">No. Telepon <span className="required">*</span></label>
 <input className="career-form-input" required value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="0812-xxxx-xxxx" />
 </div>
 <div className="career-form-group">
 <label className="career-form-label">Jenis Kelamin</label>
 <div className="cf-radio-group">
  {genderOptions.map(g => (
   <button type="button" key={g.value} className={`cf-radio-btn${form.gender===g.value?' selected':''}`} onClick={() => handleChange('gender', g.value)}>{g.label}</button>
  ))}
 </div>
 </div>
 <div className="career-form-group">
 <label className="career-form-label">Tanggal Lahir</label>
 <DatePicker value={form.birthDate} onChange={v => handleChange('birthDate', v)} placeholder="Pilih tanggal lahir" />
 </div>
 <div className="career-form-group full">
 <label className="career-form-label">Alamat</label>
 <textarea className="career-form-textarea" value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="Alamat lengkap Anda..." rows={3} />
 </div>
 </div>
 </div>
 </div>

 {/* Pendidikan */}
 <div className="career-form-card">
 <h2><span className="cf-section-icon green"><FiBook size={15} /></span> Pendidikan Terakhir</h2>
 <div className="career-form-body">
 <div className="career-form-grid">
 <div className="career-form-group">
 <label className="career-form-label">Jenjang</label>
 <div className="cf-pill-group">
  {educationLevels.map(l => (
   <button type="button" key={l} className={`cf-pill${form.eduLevel===l?' selected':''}`} onClick={() => handleChange('eduLevel', l)}>{l}</button>
  ))}
 </div>
 </div>
 <div className="career-form-group">
 <label className="career-form-label">Jurusan</label>
 <input className="career-form-input" value={form.eduMajor} onChange={e => handleChange('eduMajor', e.target.value)} placeholder="Teknik Informatika" />
 </div>
 <div className="career-form-group">
 <label className="career-form-label">Universitas/Institusi</label>
 <input className="career-form-input" value={form.eduUniversity} onChange={e => handleChange('eduUniversity', e.target.value)} placeholder="Universitas Indonesia" />
 </div>
 <div className="career-form-group">
 <label className="career-form-label">Tahun Lulus</label>
 <input className="career-form-input" type="number" min="1980" max="2030" value={form.eduYear} onChange={e => handleChange('eduYear', e.target.value)} placeholder="2020" />
 </div>
 </div>
 </div>
 </div>

 {/* Pengalaman Kerja */}
 <div className="career-form-card">
 <h2><span className="cf-section-icon amber"><FiBriefcase size={15} /></span> Pengalaman Kerja</h2>
 <div className="career-form-body">
 {form.experiences.map((exp, i) => (
 <div key={i} className="career-exp-entry">
 {form.experiences.length > 1 && (
 <button type="button" className="career-exp-remove" onClick={() => removeExperience(i)}>
 <FiX />
 </button>
 )}
 <div className="career-form-grid" style={{ marginBottom: 0 }}>
 <div className="career-form-group">
 <label className="career-form-label">Perusahaan</label>
 <input className="career-form-input" value={exp.company} onChange={e => handleExpChange(i, 'company', e.target.value)} placeholder="PT Contoh Indonesia" />
 </div>
 <div className="career-form-group">
 <label className="career-form-label">Posisi/Jabatan</label>
 <input className="career-form-input" value={exp.position} onChange={e => handleExpChange(i, 'position', e.target.value)} placeholder="Frontend Developer" />
 </div>
 <div className="career-form-group">
 <label className="career-form-label">Tahun Mulai</label>
 <input className="career-form-input" type="text" inputMode="numeric" maxLength="4" value={exp.startYear} onChange={e => handleExpChange(i, 'startYear', e.target.value.replace(/\D/g,''))} placeholder="2020" />
 </div>
 <div className="career-form-group">
 <label className="career-form-label">Tahun Selesai</label>
 <input className="career-form-input" type="text" inputMode="numeric" maxLength="4" value={exp.endYear} onChange={e => handleExpChange(i, 'endYear', e.target.value.replace(/\D/g,''))} placeholder="2024 atau kosongkan" />
 </div>
 <div className="career-form-group full">
 <label className="career-form-label">Deskripsi Pekerjaan</label>
 <textarea className="career-form-textarea" value={exp.description} onChange={e => handleExpChange(i, 'description', e.target.value)} placeholder="Tanggung jawab dan pencapaian utama..." rows={3} />
 </div>
 </div>
 </div>
 ))}
 <button type="button" className="career-add-btn" onClick={addExperience}>
 <FiPlus /> Tambah Pengalaman Kerja
 </button>
 </div>
 </div>

 {/* Skills + Resume + Links */}
 <div className="career-form-card">
 <h2><span className="cf-section-icon purple"><FiFileText size={15} /></span> Keahlian & Dokumen</h2>
 <div className="career-form-body">
 <div className="career-form-grid">
 <div className="career-form-group full">
 <label className="career-form-label">Keahlian (pisahkan dengan koma)</label>
 <input className="career-form-input" value={form.skills} onChange={e => handleChange('skills', e.target.value)} placeholder="React, JavaScript, Figma, Project Management" />
 {form.skills && (
 <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
 {form.skills.split(',').map((s, i) => s.trim() && (
 <span key={i} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#E8F0FE', color: '#0047AB' }}>
 {s.trim()}
 </span>
 ))}
 </div>
 )}
 </div>
 <div className="career-form-group full">
 <label className="career-form-label">Resume/CV (PDF, DOC, DOCX)</label>
 <div className="career-form-file">
 <div className={`career-file-zone${form.resumeFile ? ' has-file' : ''}`}>
 <input
 type="file"
 accept=".pdf,.doc,.docx"
 onChange={e => handleChange('resumeFile', e.target.files?.[0] || null)}
 />
 <div className="career-file-icon"><FiFileText /></div>
 {form.resumeFile ? (
 <div className="career-file-name">✓ {form.resumeFile.name}</div>
 ) : (
 <>
 <div className="career-file-label">Klik atau seret file ke sini</div>
 <div className="career-file-hint">PDF, DOC, atau DOCX — Maks. 5MB</div>
 </>
 )}
 </div>
 </div>
 </div>
 <div className="career-form-group full">
 <label className="career-form-label">Cover Letter</label>
 <textarea
 className="career-form-textarea"
 value={form.coverLetter}
 onChange={e => handleChange('coverLetter', e.target.value)}
 placeholder="Ceritakan mengapa Anda tertarik dengan posisi ini dan apa yang membuat Anda cocok..."
 rows={4}
 />
 </div>
 <div className="career-form-group">
 <label className="career-form-label"><FiLink size={13} /> LinkedIn URL</label>
 <input className="career-form-input" type="url" value={form.linkedinUrl} onChange={e => handleChange('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/nama" />
 </div>
 <div className="career-form-group">
 <label className="career-form-label"><FiLink size={13} /> Portfolio URL</label>
 <input className="career-form-input" type="url" value={form.portfolioUrl} onChange={e => handleChange('portfolioUrl', e.target.value)} placeholder="https://portfolio.com" />
 </div>
 <div className="career-form-group">
 <label className="career-form-label"><FiDollarSign size={13} /> Ekspektasi Gaji (Rp)</label>
 <input className="career-form-input" type="number" value={form.expectedSalary} onChange={e => handleChange('expectedSalary', e.target.value)} placeholder="10000000" />
 </div>
 </div>
 </div>
 </div>

 {/* Submit */}
 <button type="submit" className="career-submit-btn" disabled={submitting || !form.name || !form.email || !form.phone}>
 {submitting ? 'Mengirim Lamaran...' : (
 <><FiSend style={{ marginRight: 8 }} /> Kirim Lamaran</>
 )}
 </button>
 </form>
 </div>

 <div className="career-footer">
 Powered by <a href="/">HRIS Loka</a> — Platform HRIS Modern
 </div>
 </div>
 );
}
