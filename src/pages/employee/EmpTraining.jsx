import { useState, useEffect, useCallback } from 'react';
import {
  HiArrowTopRightOnSquare,
  HiBookOpen,
  HiCalendarDays,
  HiCheck,
  HiClock,
  HiMapPin,
  HiPlayCircle,
  HiTrophy,
  HiUserPlus,
  HiUsers
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';




function getYouTubeId(url) {
 if (!url) return null;
 const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
 return match ? match[1] : null;
}

export default function EmpTraining() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const toast = useToast();
  const [emp, setEmp] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [tab, setTab] = useState('my'); // 'my' | 'all' | 'materials'
  const [enrollingId, setEnrollingId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const email = user?.email || user?.user_metadata?.email;
    const { data: empData } = await getEmployeeByEmail(email);
    setEmp(empData);
    const { data: trainingData } = await supabase
      .from('trainings')
      .select('*, training_participants(*, employees(name, division)), training_materials(*)')
      .order('start_date', { ascending: false });
    setTrainings(trainingData || []);
    const allMaterials = (trainingData || []).flatMap(t =>
      (t.training_materials || []).map(m => ({ ...m, trainingTitle: t.title, trainingCategory: t.category }))
    );
    setMaterials(allMaterials);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  if (loading) return (
    <div style={{ animation: "fadeInUp 0.3s ease" }}>
      <div style={{ marginBottom: 16 }}>
        <div className="skeleton skeleton-text" style={{ width: 160, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 200 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[1,2,3].map(i => <div key={i} className="emp-card" style={{ padding: 14, textAlign: 'center' }}><div className="skeleton" style={{ height: 44, borderRadius: 8 }} /></div>)}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 36, width: 110, borderRadius: 99 }} />)}
      </div>
      {[1,2,3].map(i => <div key={i} className="emp-card" style={{ height: 90, marginBottom: 10 }}><div className="skeleton" style={{ height: '100%', borderRadius: 8 }} /></div>)}
    </div>
  );

  const catColors = { technical: '#3B82F6', soft_skill: '#10B981', compliance: '#F59E0B', leadership: '#8B5CF6', certification: '#EC4899' };
  const catLabels = locale === 'en'
    ? { technical: 'Technical', soft_skill: 'Soft Skill', compliance: 'Compliance', leadership: 'Leadership', certification: 'Certification' }
    : { technical: 'Technical', soft_skill: 'Soft Skill', compliance: 'Compliance', leadership: 'Leadership', certification: 'Certification' };
  const statusColors = { upcoming: '#3B82F6', ongoing: '#F59E0B', completed: '#16A34A', cancelled: '#DC2626' };
  const statusLabels = locale === 'en'
    ? { upcoming: 'Upcoming', ongoing: 'Ongoing', completed: 'Completed', cancelled: 'Cancelled' }
    : { upcoming: 'Akan Datang', ongoing: 'Berlangsung', completed: 'Selesai', cancelled: 'Dibatalkan' };

  const myTrainings = trainings.filter(t =>
    (t.training_participants || []).some(p => p.employee_id === emp?.id)
  );
  const availableTrainings = trainings.filter(t => t.status === 'upcoming' || t.status === 'ongoing');

  return (
    <div className="emp-page">
      <div style={{ marginBottom: 16 }}>
        <h1 className="emp-page-title">Training & Learning</h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'Your training programs and learning materials' : 'Pelatihan dan materi pembelajaran Anda'}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div className="emp-card" style={{ padding: 14, textAlign: 'center' }}>
          <div className="emp-stat-number" style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{myTrainings.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{locale === 'en' ? 'My Trainings' : 'Training Saya'}</div>
        </div>
        <div className="emp-card" style={{ padding: 14, textAlign: 'center' }}>
          <div className="emp-stat-number" style={{ fontSize: 20, fontWeight: 800, color: '#16A34A' }}>
            {myTrainings.filter(t => t.status === 'completed').length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{locale === 'en' ? 'Completed' : 'Selesai'}</div>
        </div>
        <div className="emp-card" style={{ padding: 14, textAlign: 'center' }}>
          <div className="emp-stat-number" style={{ fontSize: 20, fontWeight: 800, color: '#8B5CF6' }}>{materials.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{locale === 'en' ? 'Materials' : 'Materi'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="emp-chips" style={{ marginBottom: 16 }}>
        {[
          { key: 'my', label: locale === 'en' ? 'My Trainings' : 'Training Saya', icon: <HiTrophy size={13} /> },
          { key: 'all', label: locale === 'en' ? 'All Trainings' : 'Semua Training', icon: <HiBookOpen size={13} /> },
          { key: 'materials', label: locale === 'en' ? 'Materials' : 'Materi', icon: <HiPlayCircle size={13} /> },
        ].map(t => (
          <button
            key={t.key}
            className={`emp-chip ${tab === t.key ? 'active' : ''}`}
            onClick={() => { setTab(t.key); setSelectedTraining(null); }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* My Trainings */}
      {tab === 'my' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {myTrainings.length === 0 ? (
            <div className="emp-card emp-empty">
              <div className="emp-empty-icon"><HiBookOpen size={24} /></div>
              <div className="emp-empty-title">{locale === 'en' ? 'No trainings yet' : 'Belum ada training'}</div>
              <div className="emp-empty-desc">{locale === 'en' ? "You haven't enrolled in any training yet." : 'Anda belum terdaftar di training manapun.'}</div>
            </div>
          ) : myTrainings.map(t => (
            <div
              key={t.id}
              className="emp-card emp-card-interactive emp-card-stagger"
              style={{ padding: 16, borderLeft: `4px solid ${catColors[t.category] || '#6D8196'}` }}
              onClick={() => setSelectedTraining(selectedTraining?.id === t.id ? null : t)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.instructor || ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, color: '#fff', background: catColors[t.category] }}>
                    {catLabels[t.category]}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, color: '#fff', background: statusColors[t.status] }}>
                    {statusLabels[t.status]}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                {t.start_date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HiCalendarDays size={11} /> {t.start_date}</span>}
                {t.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HiMapPin size={11} /> {t.location}</span>}
              </div>
              {selectedTraining?.id === t.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  {t.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>{t.description}</p>}
                  {(t.training_materials || []).length > 0 ? (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{locale === 'en' ? 'Learning Materials' : 'Materi Pembelajaran'}</div>
                      {t.training_materials.map(m => {
                        const ytId = getYouTubeId(m.url);
                        return (
                          <div key={m.id} style={{ marginBottom: 12 }}>
                            {ytId && <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}><iframe width="100%" height="180" src={`https://www.youtube.com/embed/${ytId}`} title={m.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ borderRadius: 10 }} /></div>}
                            <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, textDecoration: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, border: '1px solid var(--border)' }}>
                              {ytId ? <HiPlayCircle size={14} /> : <HiArrowTopRightOnSquare size={14} />}{m.title}
                            </a>
                            {m.description && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, marginLeft: 4 }}>{m.description}</p>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{locale === 'en' ? 'No materials for this training yet.' : 'Belum ada materi untuk pelatihan ini.'}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* All Trainings */}
      {tab === 'all' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {availableTrainings.length === 0 ? (
            <div className="emp-card emp-empty">
              <div className="emp-empty-icon"><HiBookOpen size={24} /></div>
              <div className="emp-empty-title">{locale === 'en' ? 'No trainings available' : 'Tidak ada training tersedia saat ini.'}</div>
            </div>
          ) : availableTrainings.map(t => {
            const alreadyEnrolled = (t.training_participants || []).some(p => p.employee_id === emp?.id);
            const isFull = t.max_participants && (t.training_participants || []).length >= t.max_participants;
            return (
              <div key={t.id} className="emp-card emp-card-stagger" style={{ padding: 16, borderLeft: `4px solid ${catColors[t.category] || '#6D8196'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.instructor}</div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, color: '#fff', background: catColors[t.category], flexShrink: 0, marginLeft: 8 }}>{catLabels[t.category]}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 12 }}>
                  {t.start_date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HiCalendarDays size={11} /> {t.start_date}</span>}
                  {t.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HiMapPin size={11} /> {t.location}</span>}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HiUsers size={11} /> {(t.training_participants || []).length}/{t.max_participants || '8'}</span>
                </div>
                <button
                  disabled={alreadyEnrolled || isFull || enrollingId === t.id}
                  onClick={async () => {
                    if (!emp) return;
                    setEnrollingId(t.id);
                    const { error } = await supabase.from('training_participants').insert({ training_id: t.id, employee_id: emp.id, status: 'enrolled' });
                    if (!error) { toast.success(locale === 'en' ? 'Successfully enrolled!' : 'Berhasil mendaftar training!'); loadData(); }
                    else toast.error(locale === 'en' ? 'Failed to enroll. You may already be registered.' : 'Gagal mendaftar. Mungkin sudah terdaftar.');
                    setEnrollingId(null);
                  }}
                  style={{
                    width: '100%', padding: '10px', border: 'none', borderRadius: 'var(--radius-md)',
                    fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: alreadyEnrolled || isFull ? 'default' : 'pointer',
                    background: alreadyEnrolled ? 'rgba(16,185,129,0.1)' : isFull ? 'rgba(107,114,128,0.08)' : 'var(--primary)',
                    color: alreadyEnrolled ? '#10B981' : isFull ? 'var(--muted)' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {enrollingId === t.id ? (locale === 'en' ? 'Enrolling...' : 'Mendaftar...')
                    : alreadyEnrolled ? <><HiCheck size={14} /> {locale === 'en' ? 'Already Enrolled' : 'Sudah Terdaftar'}</>
                    : isFull ? (locale === 'en' ? 'Full' : 'Peserta Penuh')
                    : <><HiUserPlus size={14} /> {locale === 'en' ? 'Enroll Now' : 'Daftar Sekarang'}</>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Materials */}
      {tab === 'materials' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {materials.length === 0 ? (
            <div className="emp-card emp-empty">
              <div className="emp-empty-icon"><HiPlayCircle size={24} /></div>
              <div className="emp-empty-title">{locale === 'en' ? 'No materials yet' : 'Belum ada materi'}</div>
            </div>
          ) : materials.map(m => {
            const ytId = getYouTubeId(m.url);
            return (
              <div key={m.id} className="emp-card emp-card-stagger" style={{ padding: 16 }}>
                {ytId && <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}><iframe width="100%" height="180" src={`https://www.youtube.com/embed/${ytId}`} title={m.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ borderRadius: 10 }} /></div>}
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{m.trainingTitle}</div>
                {m.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>{m.description}</p>}
                <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, background: 'var(--primary)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                  {ytId ? <HiPlayCircle size={12} /> : <HiArrowTopRightOnSquare size={12} />} {locale === 'en' ? 'Open Material' : 'Buka Materi'}
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
