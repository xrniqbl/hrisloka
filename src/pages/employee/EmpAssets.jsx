import { useState, useEffect, useCallback } from 'react';
import {
  HiArchiveBox,
  HiComputerDesktop,
  HiDevicePhoneMobile,
  HiTruck
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

const CATEGORY_ICONS = {
  Laptop: <HiComputerDesktop size={18} />,
  Desktop: <HiComputerDesktop size={18} />,
  Smartphone: <HiDevicePhoneMobile size={18} />,
  Vehicle: <HiTruck size={18} />,
};
const CATEGORY_COLORS = { Laptop: '#3B82F6', Desktop: '#8B5CF6', Smartphone: '#10B981', Vehicle: '#F59E0B' };
const CONDITION_COLORS = { Good: '#16A34A', Fair: '#F59E0B', Poor: '#DC2626' };

export default function EmpAssets() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const email = user?.email || user?.user_metadata?.email;
    const { data: empData } = await getEmployeeByEmail(email);
    if (empData) {
      setEmp(empData);
      const { data } = await supabase
        .from('assets')
        .select('*')
        .eq('assigned_to', empData.id)
        .order('created_at', { ascending: false });
      setAssets(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    window.addEventListener('emp:refresh', loadData);
    return () => window.removeEventListener('emp:refresh', loadData);
  }, [loadData]);

  const conditionLabel = (c) => {
    if (locale === 'en') return c;
    return c === 'Good' ? 'Baik' : c === 'Fair' ? 'Cukup' : c === 'Poor' ? 'Rusak' : c;
  };

  if (loading) return (
    <div style={{ animation: "fadeInUp 0.3s ease" }}>
      <div style={{ marginBottom: 16 }}>
        <div className="skeleton skeleton-text" style={{ width: 110, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 240 }} />
      </div>
      <div className="emp-card emp-card-gradient" style={{ marginBottom: 20, textAlign: 'center', padding: 28 }}>
        <div className="skeleton" style={{ height: 60, borderRadius: 12, opacity: 0.3 }} />
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {[1,2,3].map(i => <div key={i} className="emp-card" style={{ height: 90 }}><div className="skeleton" style={{ height: '100%', borderRadius: 8 }} /></div>)}
      </div>
    </div>
  );

  if (!emp) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Data tidak ditemukan.</div>;

  return (
    <div className="emp-page">
      <div style={{ marginBottom: 16 }}>
        <h1 className="emp-page-title">{locale === 'en' ? 'My Assets' : 'Aset Saya'}</h1>
        <p className="emp-page-subtitle">
          {locale === 'en' ? 'Company equipment and assets assigned to you' : 'Peralatan dan aset perusahaan yang dipinjamkan'}
        </p>
      </div>

      {/* Summary */}
      <div className="emp-card emp-card-gradient" style={{ marginBottom: 20, textAlign: 'center' }}>
        <div className="emp-stat-number" style={{ fontSize: 36, fontWeight: 800 }}>{assets.length}</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          {locale === 'en' ? 'Assets on Loan' : 'Aset yang Dipinjamkan'}
        </div>
      </div>

      {/* Asset List */}
      {assets.length === 0 ? (
        <div className="emp-card emp-empty">
          <div className="emp-empty-icon"><HiArchiveBox size={24} /></div>
          <div className="emp-empty-title">{locale === 'en' ? 'No assets assigned' : 'Tidak ada aset'}</div>
          <div className="emp-empty-desc">{locale === 'en' ? 'No assets have been assigned to you yet.' : 'Belum ada aset yang di-assign ke Anda.'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {assets.map(a => {
            const catColor = CATEGORY_COLORS[a.category] || '#6D8196';
            const condColor = CONDITION_COLORS[a.condition] || '#6D8196';
            return (
              <div key={a.id} className="emp-card emp-card-stagger" style={{ padding: 16, borderLeft: `4px solid ${catColor}` }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${catColor}12`, color: catColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {CATEGORY_ICONS[a.category] || <HiArchiveBox size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{a.name}</div>
                    {a.brand && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.brand}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${catColor}12`, color: catColor }}>{a.category}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${condColor}12`, color: condColor }}>{conditionLabel(a.condition)}</span>
                      {a.serial && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--bg)', color: 'var(--muted)' }}>SN: {a.serial}</span>}
                    </div>
                    {a.purchase_date && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                        {locale === 'en' ? 'Purchased' : 'Tgl beli'}: {a.purchase_date}
                      </div>
                    )}
                    {a.notes && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>"{a.notes}"</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
