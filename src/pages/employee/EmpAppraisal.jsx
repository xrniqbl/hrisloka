import { useState, useEffect, useCallback } from 'react';
import { HiArrowTrendingUp, HiChevronRight, HiClipboardDocumentCheck, HiStar, HiPaperAirplane } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useTranslation } from '../../lib/i18n';
import { sendAppraisalPush } from '../../services/pushService';
import EmpEmptyState from '../../components/EmpEmptyState';
import '../../styles/shared.css';

export default function EmpAppraisal() {
  const { user } = useAuth();
  const toast = useToast();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appraisals, setAppraisals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ achievements: '', challenges: '', goals: '', self_rating: 3, strengths: '', improvements: '' });

  const load = useCallback(async () => {
    if (!user?.email) return;
    const { data: e } = await supabase.from('employees').select('*').eq('email', user.email).single();
    if (e) {
      setEmp(e);
      const { data: a } = await supabase.from('appraisals').select('*').eq('employee_id', e.id).order('created_at', { ascending: false });
      setAppraisals(a || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.achievements.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('self_assessments').insert({
      employee_id: emp.id,
      period: new Date().toISOString().slice(0, 7),
      ...form,
      status: 'submitted',
    });
    if (!error) {
      toast?.success('Self-assessment berhasil dikirim!');
      // Notify HR/manager via push (fire-and-forget)
      sendAppraisalPush(emp.id, emp.name).catch(() => {});
      setShowForm(false);
      setForm({ achievements: '', challenges: '', goals: '', self_rating: 3, strengths: '', improvements: '' });
      load();
    } else {
      toast?.error('Gagal mengirim self-assessment. Coba lagi.');
      console.error('[EmpAppraisal] insert error:', error);
    }
    setSubmitting(false);
  };

  if (loading) return <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 120, borderRadius: 20, marginBottom: 16 }} />{[1,2].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 10 }} />)}</div>;
  if (!emp) return <EmpEmptyState type="noemp" />;

  const ratingColors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#7C3AED'];
  const ratingLabels = ['Kurang', 'Cukup', 'Rata-rata', 'Baik', 'Sangat Baik'];
  const iS = { width: '100%', padding: '12px 14px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' };

  return (
    <div className="emp-page">
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{locale === 'en' ? 'Performance Appraisal' : 'Penilaian Kinerja'}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{locale === 'en' ? 'Self-assessment & review results' : 'Self-assessment & hasil review'}</div>

      <div className="emp-card" style={{ padding: 20, marginBottom: 16, borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0047AB' }}><HiClipboardDocumentCheck size={22} /></div>
            <div><div style={{ fontSize: 14, fontWeight: 800 }}>Self Assessment</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{locale === 'en' ? 'Submit your self-evaluation' : 'Kirim evaluasi diri Anda'}</div></div>
          </div>
          <button onClick={() => setShowForm(true)} style={{ padding: '8px 16px', borderRadius: 12, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}><HiPaperAirplane size={14} />{locale === 'en' ? 'Submit' : 'Isi'}</button>
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><HiArrowTrendingUp size={16} style={{ color: 'var(--primary)' }} />{locale === 'en' ? 'Review Results' : 'Hasil Review'}</div>
      {appraisals.length === 0 ? (
        <div className="emp-card" style={{ padding: 24, textAlign: 'center' }}><div style={{ fontSize: 13, color: 'var(--muted)' }}>{locale === 'en' ? 'No appraisal results yet' : 'Belum ada hasil penilaian'}</div></div>
      ) : appraisals.map(a => (
        <div key={a.id} className="emp-card" style={{ padding: '14px 16px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div style={{ fontSize: 13, fontWeight: 700 }}>{a.period || 'Review'}</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{new Date(a.created_at).toLocaleDateString('id-ID')}</div></div>
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: (a.score||0) >= 80 ? '#F0FDF4' : '#FFFBEB', color: (a.score||0) >= 80 ? '#16A34A' : '#D97706' }}>{a.score||'—'}/100</span>
          </div>
        </div>
      ))}

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Form Self-Assessment</div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div><label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 8 }}>Penilaian Diri</label>
                <div style={{ display: 'flex', gap: 6 }}>{[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setForm({ ...form, self_rating: s })} style={{ flex: 1, padding: '8px 2px', borderRadius: 10, border: 'none', cursor: 'pointer', background: s <= form.self_rating ? ratingColors[form.self_rating-1]+'22' : 'var(--bg)', color: s <= form.self_rating ? ratingColors[form.self_rating-1] : 'var(--muted)', fontWeight: 700, fontSize: 10, fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><HiStar size={20} />{ratingLabels[s-1]}</button>
                ))}</div>
              </div>
              <div><label className="emp-field-label">Pencapaian Utama *</label><textarea value={form.achievements} onChange={e => setForm({ ...form, achievements: e.target.value })} placeholder="Apa yang Anda capai?" style={{ ...iS, minHeight: 70, resize: 'none' }} /></div>
              <div><label className="emp-field-label">Tantangan</label><textarea value={form.challenges} onChange={e => setForm({ ...form, challenges: e.target.value })} placeholder="Tantangan yang dihadapi..." style={{ ...iS, minHeight: 50, resize: 'none' }} /></div>
              <div><label className="emp-field-label">Kekuatan</label><input value={form.strengths} onChange={e => setForm({ ...form, strengths: e.target.value })} placeholder="Kekuatan utama..." style={iS} /></div>
              <div><label className="emp-field-label">Area Pengembangan</label><input value={form.improvements} onChange={e => setForm({ ...form, improvements: e.target.value })} placeholder="Apa yang bisa ditingkatkan?" style={iS} /></div>
              <div><label className="emp-field-label">Target Berikutnya</label><textarea value={form.goals} onChange={e => setForm({ ...form, goals: e.target.value })} placeholder="Target selanjutnya..." style={{ ...iS, minHeight: 50, resize: 'none' }} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{locale === 'en' ? 'Cancel' : 'Batal'}</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><HiPaperAirplane size={16} />{submitting ? '...' : 'Kirim'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
