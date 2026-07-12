import { useState, useEffect } from 'react';
import {
  HiChatBubbleOvalLeft,
  HiEnvelope,
  HiMagnifyingGlass,
  HiPhone,
  HiUsers
} from 'react-icons/hi2';
import { getAllEmployees } from '../../services/employeeService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

export default function CompanyDirectory() {
  const { locale } = useTranslation();
  const { employee } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupByDept, setGroupByDept] = useState(true);

  useEffect(() => {
    async function load() {
      // Only show employees from the same company
      const { data } = await getAllEmployees(undefined, employee?.company_id);
      setEmployees((data || []).filter(e => e.account_status === 'active' || !e.account_status));
      setLoading(false);
    }
    load();
  }, [employee?.company_id]);

  const filtered = employees.filter(emp =>
    `${emp.name} ${emp.division} ${emp.position}`.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const getColor = (name = '') => {
    const colors = ['#635BFF', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#635BFF', '#EF4444', '#06B6D4'];
    let hash = 0;
    for (const ch of name) hash = ch.charCodeAt(0) + (hash << 5) - hash;
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) return (
    <div className="emp-page">
      <div className="mb">
        <div className="skeleton skeleton-text" style={{ width: 120, height: 22, marginBottom: 8 }} />
        <div className="skeleton skeleton-text-sm" style={{ width: 160 }} />
      </div>
      <div className="skeleton" style={{ height: 44, borderRadius: 'var(--radius-md)', marginBottom: 12 }} />
      {[1,2,3,4,5].map(i => <div key={i} className="emp-card" style={{ padding: '12px 14px', display: 'flex', gap: 14, alignItems: 'center', marginBottom: 8 }}>
        <div className="skeleton skeleton-circle" style={{ width: 44, height: 44, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '55%', marginBottom: 6 }} />
          <div className="skeleton skeleton-text-sm" style={{ width: '40%' }} />
        </div>
      </div>)}
    </div>
  );

  // Group by department/division
  const grouped = filtered.reduce((acc, emp) => {
    const dept = emp.division || 'Lainnya';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {});
  const sortedDepts = Object.keys(grouped).sort();

  const EmployeeCard = ({ emp }) => {
    const color = getColor(emp.name);
    return (
      <div className="emp-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14, animation: 'fadeInUp 0.25s ease' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: `${color}18`, color, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 15, fontWeight: 600,
          border: `2px solid ${color}30`,
        }}>
          {getInitials(emp.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.position}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {emp.phone && (
            <a href={`https://wa.me/${emp.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer"
               className="dir-contact-btn dir-contact-btn--green"
               title="WhatsApp">
              <HiChatBubbleOvalLeft size={15} />
            </a>
          )}
          {emp.phone && (
            <a href={`tel:${emp.phone}`}
               className="dir-contact-btn dir-contact-btn--green"
               title="Telepon">
              <HiPhone size={14} />
            </a>
          )}
          {emp.email && (
            <a href={`mailto:${emp.email}`}
               className="dir-contact-btn dir-contact-btn--blue"
               title="Email">
              <HiEnvelope size={14} />
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="emp-page">
      <div className="mb">
        <h1 className="emp-page-title">{locale === 'en' ? 'Company Directory' : 'Buku Kontak'}</h1>
        <p className="emp-page-subtitle">{filtered.length} {locale === 'en' ? 'employees found' : 'karyawan ditemukan'}</p>
      </div>

      {/* Search */}
      <div className="dir-search-wrap">
        <HiMagnifyingGlass className="dir-search-icon" />
        <input
          type="text"
          placeholder={locale === 'en' ? 'Search name, division, or position...' : 'Cari nama, divisi, atau jabatan...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input dir-search-input"
        />
      </div>

      {/* Group toggle */}
      <div className="dir-toggle-row">
        <button onClick={() => setGroupByDept(g => !g)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99,
          border: '1.5px solid var(--border)', background: groupByDept ? 'var(--primary)' : 'var(--surface)',
          color: groupByDept ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <HiUsers size={13} /> {groupByDept ? (locale === 'en' ? 'By Division' : 'Per Divisi') : (locale === 'en' ? 'List View' : 'Tampilan Daftar')}
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="emp-card emp-empty">
          <div className="emp-empty-title">{locale === 'en' ? 'No employees found.' : 'Tidak ada karyawan yang ditemukan.'}</div>
        </div>
      )}

      {groupByDept ? (
        <div className="dir-dept-grid">
          {sortedDepts.map(dept => (
            <div key={dept}>
              <div className="dir-dept-label">
                <div className="dir-dept-dot" />
                {dept} <span className="dir-dept-count">({grouped[dept].length})</span>
              </div>
              <div className="dir-card-grid">
                {grouped[dept].map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dir-card-grid">
          {filtered.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
        </div>
      )}
    </div>
  );
}
