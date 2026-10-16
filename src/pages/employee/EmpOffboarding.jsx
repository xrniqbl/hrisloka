import { useState, useEffect, useCallback } from 'react';
import { HiClipboardDocumentList, HiCheckCircle, HiExclamationCircle } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getMyOffboarding, toggleMyOffboardingItem } from '../../services/offboardingService';
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
    const { data: e } = await getEmployeeByEmail(user.email);
    if (e) {
      setEmp(e);
      const { data: c } = await getMyOffboarding(e.id, e.company_id);
      setChecklist(c || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const toggleItem = async (id, done) => {
    await toggleMyOffboardingItem(id, !done, emp?.id, emp?.company_id);
    load();
  };

  if (loading) return <div className="ep-loading-wrap">{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 14, marginBottom: 8 }} />)}</div>;
  if (!emp) return <EmpEmptyState type="noemp" />;

  const completedCount = checklist.filter(c => c.completed).length;
  const progress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  return (
    <div className="emp-page">
      <h1 className="emp-page-title">{locale === 'en' ? 'Offboarding' : 'Offboarding'}</h1>
      <p className="emp-page-subtitle mb">{locale === 'en' ? 'Exit checklist & handover' : 'Checklist keluar & serah terima'}</p>

      {checklist.length === 0 ? (
        <EmpEmptyState
          type="nodata"
          title={locale === 'en' ? 'No offboarding tasks' : 'Tidak ada task offboarding'}
          subtitle={locale === 'en' ? 'You have no active offboarding checklist.' : 'Anda tidak memiliki checklist offboarding aktif.'}
          cta={locale === 'en' ? 'Home' : 'Beranda'}
          ctaHref="/app/home"
        />
      ) : (
        <>
          <div className="emp-card" style={{ padding: 16, marginBottom: 12, borderLeft: `4px solid ${progress === 100 ? '#16A34A' : 'var(--primary)'}` }}>
            <div className="btn-icon-row mb-sm">
              <span className="td-semibold">{locale === 'en' ? 'Progress' : 'Progres'}</span>
              <span className="td-semibold" style={{ color: progress === 100 ? '#16A34A' : 'var(--primary)' }}>{completedCount}/{checklist.length}</span>
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
                  <div className="td-semibold" style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>{item.task || item.title}</div>
                  {item.description && <div className="td-muted-sm" style={{ marginTop: 2 }}>{item.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

