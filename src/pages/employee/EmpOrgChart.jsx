import { useState, useEffect, useCallback } from 'react';
import {
  HiBuildingOffice2,
  HiMagnifyingGlass,
  HiUsers,
  HiChevronDown,
  HiChevronRight,
  HiEnvelope,
  HiPhone,
  HiIdentification,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getEmployeeByEmail } from '../../services/employeeService';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

const MANAGER_KEYWORDS = ['director', 'manager', 'head', 'lead', 'chief', 'vp', 'direktur', 'kepala', 'supervisor'];
const isManager = (emp) => MANAGER_KEYWORDS.some(k => (emp.position || '').toLowerCase().includes(k));

const DIV_COLORS = [
  '#0047AB','#10B981','#8B5CF6','#F59E0B','#EF4444',
  '#EC4899','#06B6D4','#F97316','#84CC16','#A855F7',
];

function Avatar({ name, size = 38, color, isLead }) {
  const initials = (name || '--')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: isLead ? `${color}18` : 'var(--bg)',
      color: isLead ? color : 'var(--text-secondary)',
      border: isLead ? `2px solid ${color}40` : '1.5px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: Math.round(size * 0.33),
      letterSpacing: '-0.5px',
      userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}

export default function EmpOrgChart() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedDivs, setExpandedDivs] = useState({});
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [myEmp, setMyEmp] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: me } = await getEmployeeByEmail(user?.email);
    setMyEmp(me);
    if (!me?.company_id) { setLoading(false); return; }
    const { data } = await supabase
      .from('employees')
      .select('id, name, position, division, email, phone, nip, company_id')
      .eq('company_id', me.company_id)
      .eq('account_status', 'active')
      .order('name');
    setEmployees(data || []);
    const divs = {};
    (data || []).forEach(e => { divs[e.division || 'Belum Diatur'] = true; });
    setExpandedDivs(divs);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build division groups
  const divisions = {};
  employees.forEach(e => {
    const div = e.division || (locale === 'en' ? 'Unassigned' : 'Belum Diatur');
    if (!divisions[div]) divisions[div] = [];
    divisions[div].push(e);
  });

  // Managers first within each division
  Object.values(divisions).forEach(emps => {
    emps.sort((a, b) => {
      if (isManager(a) && !isManager(b)) return -1;
      if (!isManager(a) && isManager(b)) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  });

  const divisionNames = Object.keys(divisions).sort();

  const filteredDivs = search.trim()
    ? divisionNames.filter(d =>
        d.toLowerCase().includes(search.toLowerCase()) ||
        divisions[d].some(e =>
          e.name?.toLowerCase().includes(search.toLowerCase()) ||
          (e.position || '').toLowerCase().includes(search.toLowerCase())
        )
      )
    : divisionNames;

  if (loading) return (
    <div style={{ animation: 'fadeInUp 0.3s ease' }}>
      <div className="skeleton" style={{ height: 24, width: 180, borderRadius: 6, marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 14, width: 120, borderRadius: 4, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 44, borderRadius: 12, marginBottom: 16 }} />
      {[1, 2, 3].map(i => (
        <div key={i} className="emp-card" style={{ marginBottom: 10 }}>
          <div className="skeleton" style={{ height: 18, width: '45%', borderRadius: 5, marginBottom: 16 }} />
          {[1, 2].map(j => (
            <div key={j} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div className="skeleton skeleton-circle" style={{ width: 36, height: 36, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '55%', marginBottom: 6 }} />
                <div className="skeleton skeleton-text-sm" style={{ width: '38%' }} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="emp-page">
      {/* Page Header */}
      <div className="emp-page-header">
        <h1 className="emp-page-title">
          {locale === 'en' ? 'Org Chart' : 'Struktur Organisasi'}
        </h1>
        <p className="emp-page-subtitle">
          {employees.length} {locale === 'en' ? 'employees' : 'karyawan'}
          {' · '}
          {divisionNames.length} {locale === 'en' ? 'divisions' : 'divisi'}
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <HiMagnifyingGlass
          size={15}
          style={{
            position: 'absolute',
            left: 13,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          className="emp-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={locale === 'en' ? 'Search name, position or division...' : 'Cari nama, posisi, atau divisi...'}
          style={{ paddingLeft: 38 }}
        />
      </div>

      {/* Division Cards */}
      {filteredDivs.length === 0 ? (
        <div className="emp-card emp-empty">
          <div className="emp-empty-icon"><HiUsers size={22} /></div>
          <div className="emp-empty-title">
            {locale === 'en' ? 'No results found' : 'Tidak ada hasil ditemukan'}
          </div>
          <div className="emp-empty-desc">
            {locale === 'en' ? 'Try a different search term' : 'Coba kata kunci yang berbeda'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredDivs.map((divName, idx) => {
            const color = DIV_COLORS[idx % DIV_COLORS.length];
            const emps = search.trim()
              ? divisions[divName].filter(e =>
                  e.name?.toLowerCase().includes(search.toLowerCase()) ||
                  (e.position || '').toLowerCase().includes(search.toLowerCase()) ||
                  divName.toLowerCase().includes(search.toLowerCase())
                )
              : divisions[divName];
            const managers = emps.filter(isManager);
            const members = emps.filter(e => !isManager(e));
            const isExpanded = expandedDivs[divName];

            return (
              <div key={divName} className="emp-card emp-card-stagger" style={{ overflow: 'hidden', padding: 0 }}>
                {/* Division header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedDivs(p => ({ ...p, [divName]: !p[divName] }))}
                  onKeyDown={e => e.key === 'Enter' && setExpandedDivs(p => ({ ...p, [divName]: !p[divName] }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderLeft: `3px solid ${color}`,
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${color}12`,
                    color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <HiBuildingOffice2 size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {divName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {managers.length > 0 && `${managers.length} lead · `}
                      {members.length} anggota
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: `${color}12`,
                    color,
                    flexShrink: 0,
                  }}>
                    {emps.length}
                  </span>
                  {isExpanded
                    ? <HiChevronDown size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    : <HiChevronRight size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  }
                </div>

                {/* Members list */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {[...managers, ...members].map((emp, ei) => {
                      const isLead = isManager(emp);
                      const isMe = emp.id === myEmp?.id;
                      const isSelected = selectedEmp?.id === emp.id;

                      return (
                        <div
                          key={emp.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedEmp(isSelected ? null : emp)}
                          onKeyDown={e => e.key === 'Enter' && setSelectedEmp(isSelected ? null : emp)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            padding: '12px 16px',
                            borderBottom: ei < emps.length - 1 ? '1px solid var(--border)' : 'none',
                            background: isMe
                              ? `${color}06`
                              : isSelected
                                ? 'var(--bg)'
                                : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          <Avatar name={emp.name} size={isLead ? 40 : 34} color={color} isLead={isLead} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              marginBottom: 2,
                            }}>
                              <span style={{
                                fontSize: 13,
                                fontWeight: isLead ? 700 : 600,
                                color: 'var(--text)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                              }}>
                                {emp.name}
                              </span>
                              {isLead && (
                                <span style={{
                                  fontSize: 9,
                                  padding: '2px 7px',
                                  borderRadius: 6,
                                  background: `${color}15`,
                                  color,
                                  fontWeight: 800,
                                  letterSpacing: '0.4px',
                                  flexShrink: 0,
                                  textTransform: 'uppercase',
                                }}>
                                  Lead
                                </span>
                              )}
                              {isMe && (
                                <span style={{
                                  fontSize: 9,
                                  padding: '2px 7px',
                                  borderRadius: 6,
                                  background: 'var(--primary)',
                                  color: '#fff',
                                  fontWeight: 800,
                                  letterSpacing: '0.4px',
                                  flexShrink: 0,
                                  textTransform: 'uppercase',
                                }}>
                                  {locale === 'en' ? 'You' : 'Saya'}
                                </span>
                              )}
                            </div>

                            <div style={{
                              fontSize: 11,
                              color: 'var(--muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {emp.position || (locale === 'en' ? 'No position set' : 'Jabatan belum diatur')}
                            </div>

                            {/* Expanded contact info */}
                            {isSelected && (emp.email || emp.phone) && (
                              <div style={{
                                marginTop: 10,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                paddingTop: 10,
                                borderTop: '1px solid var(--border)',
                              }}>
                                {emp.email && (
                                  <a
                                    href={`mailto:${emp.email}`}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 7,
                                      fontSize: 12,
                                      color: 'var(--primary)',
                                      textDecoration: 'none',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <HiEnvelope size={13} />
                                    {emp.email}
                                  </a>
                                )}
                                {emp.phone && (
                                  <a
                                    href={`tel:${emp.phone}`}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 7,
                                      fontSize: 12,
                                      color: '#10B981',
                                      textDecoration: 'none',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <HiPhone size={13} />
                                    {emp.phone}
                                  </a>
                                )}
                                {emp.nip && (
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 7,
                                    fontSize: 12,
                                    color: 'var(--muted)',
                                    fontWeight: 500,
                                  }}>
                                    <HiIdentification size={13} />
                                    NIP {emp.nip}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <HiChevronRight
                            size={14}
                            style={{
                              color: 'var(--muted)',
                              transform: isSelected ? 'rotate(90deg)' : 'none',
                              transition: 'transform 0.2s',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
