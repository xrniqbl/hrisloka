import { useState, useEffect, useCallback } from 'react';
import { HiClipboardDocumentList, HiCheckCircle, HiExclamationCircle } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import EmpEmptyState from '../../components/EmpEmptyState';
import '../../styles/shared.css';

export default function EmpOffboarding() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState([]);

  const load = useCallback(async () => {
    if (!user?.email) return;
    const { data: e } = await supabase.from('employees').select('*').eq('email', user.email).single();
    if (e) {
      setEmp(e);
      const { data: c } = await supabase.from('offboarding').select('*').eq('employee_id', e.id).order('created_at', { ascending: true });
      setChecklist(c || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const toggleItem = async (id, done) => {
    await supabase.from('offboarding').update({ completed: !done, completed_at: !done ? new Date().toISOString() : null }).eq('id', id);
    load();
  };

  if (loading) return <div style={{ padding: 20 }}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 14, marginBottom: 8 }} />)}</div>;
  if (!emp) return <EmpEmptyState type="noemp" />;

  const completedCount = checklist.filter(c => c.completed).length;
  const progress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  return (
    <div className="emp-page">
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{locale === 'en' ? 'Offboarding' : 'Offboarding'}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{locale === 'en' ? 'Exit checklist & handover' : 'Checklist keluar & serah terima'}</div>

      {checklist.length === 0 ? (
        <div className="emp-card" style={{ padding: 32, textAlign: 'center' }}>
          <HiClipboardDocumentList size={40} color="var(--muted)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{locale === 'en' ? 'No Offboarding Tasks' : 'Tidak Ada Task Offboarding'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{locale === 'en' ? 'You have no active offboarding checklist.' : 'Anda tidak memiliki checklist offboarding aktif.'}</div>
        </div>
      ) : (
        <>
          <div className="emp-card" style={{ padding: 16, marginBottom: 16, borderLeft: `4px solid ${progress === 100 ? '#16A34A' : 'var(--primary)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{locale === 'en' ? 'Progress' : 'Progres'}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: progress === 100 ? '#16A34A' : 'var(--primary)' }}>{completedCount}/{checklist.length}</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--bg)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: progress === 100 ? '#16A34A' : 'var(--primary)', width: `${progress}%`, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {checklist.map(item => (
              <div key={item.id} className="emp-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: item.completed ? 0.7 : 1, cursor: 'pointer' }} onClick={() => toggleItem(item.id, item.completed)}>
                {item.completed ? <HiCheckCircle size={22} color="#16A34A" /> : <HiExclamationCircle size={22} color="var(--muted)" />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, textDecoration: item.completed ? 'line-through' : 'none' }}>{item.task || item.title}</div>
                  {item.description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
