import { useState, useEffect, useCallback } from 'react';
import {
  HiCheckCircle,
  HiCircleStack,
  HiClipboardDocumentList
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { isDemoMode, DEMO_EMPLOYEE, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import '../../styles/shared.css';
import EmpEmptyState from '../../components/EmpEmptyState';

export default function EmpOnboarding() {
  const { user, employee: authEmployee } = useAuth();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (isDemoMode()) {
      setEmp({ ...DEMO_EMPLOYEE });
      setChecklist([...(DEMO_PROFILE_DATA.onboardingTasks || [])]);
      setLoading(false);
      return;
    }
    let empData = authEmployee;
    if (!empData?.id) {
      const email = user?.email || user?.user_metadata?.email;
      const res = await getEmployeeByEmail(email);
      empData = res.data;
    }
    if (empData) {
      setEmp(empData);
      const { data } = await supabase
        .from('onboarding_tasks')
        .select('*')
        .eq('employee_id', empData.id)
        .order('sort_order', { ascending: true });
      setChecklist(data || []);
    }
    setLoading(false);
  }, [user, authEmployee]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  const toggleTask = async (task) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    if (isDemoMode()) {
      setChecklist((prev) => prev.map((t) => (
        t.id === task.id
          ? { ...t, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null }
          : t
      )));
      return;
    }
    const { error } = await supabase
      .from('onboarding_tasks')
      .update({ status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null })
      .eq('id', task.id)
      .eq('employee_id', emp?.id);
    if (error) {
      console.warn('[EmpOnboarding] toggle failed:', error.message);
      return;
    }
    setChecklist((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
  };

  if (loading) return (
    <div className="ep-loading-wrap">
      <div className="mb">
        <div className="skeleton skeleton-text" style={{ width: 120, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 200 }} />
      </div>
      <div className="emp-card emp-card-gradient" style={{ marginBottom: 14, textAlign: 'center', padding: 16 }}>
        <div className="skeleton" style={{ height: 80, borderRadius: 12, opacity: 0.3 }} />
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-md)' }} />)}
      </div>
    </div>
  );

  if (!emp) return (
    <EmpEmptyState
      type="noemp"
      title={locale === 'en' ? 'Profile not found' : 'Profil tidak ditemukan'}
      subtitle={locale === 'en' ? 'Your account is not linked as an employee yet.' : 'Akun belum terhubung sebagai karyawan.'}
      cta={locale === 'en' ? 'Home' : 'Beranda'}
      ctaHref="/app/home"
    />
  );

  const doneCount = checklist.filter(t => t.status === 'done').length;
  const total = checklist.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="emp-page">
      <div className="mb">
        <h1 className="emp-page-title">{locale === 'en' ? 'Onboarding' : 'Onboarding'}</h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'New employee orientation checklist' : 'Checklist orientasi karyawan baru'}
        </p>
      </div>

      {/* Progress Card */}
      <div className="emp-card emp-card-gradient" style={{ marginBottom: 14, textAlign: 'center' }}>
        <div className="period-label">
          {locale === 'en' ? 'Onboarding Progress' : 'Progress Onboarding'}
        </div>
        <div className="info-card-value">{progress}%</div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.2)', overflow: 'hidden', margin: '12px auto 8px', maxWidth: 240 }}>
          <div style={{ height: '100%', width: `${progress}%`, borderRadius: 4, background: '#fff', transition: 'width 0.5s ease' }} />
        </div>
        <div className="td-muted-sm" style={{ opacity: 0.8 }}>
          {locale === 'en' ? `${doneCount} of ${total} tasks completed` : `${doneCount} dari ${total} tugas selesai`}
        </div>
      </div>

      {/* Checklist */}
      {checklist.length === 0 ? (
        <EmpEmptyState
          type="nodata"
          title={locale === 'en' ? 'No onboarding checklist' : 'Tidak ada checklist onboarding'}
          subtitle={locale === 'en' ? 'Admin has not created onboarding tasks for you yet.' : 'Admin belum membuat tugas onboarding untuk Anda.'}
          cta={locale === 'en' ? 'Home' : 'Beranda'}
          ctaHref="/app/home"
        />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {checklist.map((task) => {
            const isDone = task.status === 'done';
            return (
              <div
                key={task.id}
                className="emp-card emp-card-interactive emp-card-stagger"
                onClick={() => toggleTask(task)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                  border: `1px solid ${isDone ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
                  background: isDone ? 'rgba(16,185,129,0.03)' : 'var(--surface)',
                  opacity: isDone ? 0.8 : 1,
                }}
              >
                <div style={{ marginTop: 2, flexShrink: 0, color: isDone ? '#16A34A' : 'var(--border)' }}>
                  {isDone ? <HiCheckCircle size={20} /> : <HiCircleStack size={20} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--muted)' : 'var(--text)' }}>
                    {task.title || task.task}
                  </div>
                  {task.description && (
                    <div className="td-muted-sm" style={{ marginTop: 2, lineHeight: 1.4 }}>{task.description}</div>
                  )}
                  {isDone && task.completed_at && (
                    <div className="td-muted-sm" style={{ color: 'var(--success)', marginTop: 4, fontWeight: 600, fontSize: 10 }}>
                      {locale === 'en' ? 'Completed' : 'Selesai'}: {new Date(task.completed_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

