import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiX, FiUser, FiUsers, FiBriefcase, FiCalendar, FiFileText, FiSettings, FiBook, FiBarChart2, FiGlobe, FiCpu } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { sanitizeFilterInput } from '../lib/tenantGuard';
import './GlobalSearch.css';

// Static feature pages for quick nav
const FEATURES = [
 { label: 'Dashboard', path: '/dashboard', icon: <FiBarChart2 />, category: 'Halaman' },
 { label: 'Manajemen Karyawan', path: '/employees', icon: <FiUsers />, category: 'Halaman' },
 { label: 'Absensi', path: '/attendance', icon: <FiCalendar />, category: 'Halaman' },
 { label: 'Penggajian', path: '/payroll', icon: <FiFileText />, category: 'Halaman' },
 { label: 'Cuti', path: '/leave', icon: <FiCalendar />, category: 'Halaman' },
 { label: 'Rekrutmen / Job Posting', path: '/jobs', icon: <FiBriefcase />, category: 'Halaman' },
 { label: 'Training & Learning', path: '/training', icon: <FiBook />, category: 'Halaman' },
 { label: 'Penilaian Kinerja', path: '/appraisal', icon: <FiBarChart2 />, category: 'Halaman' },
 { label: 'KPI Tracking', path: '/kpi', icon: <FiBarChart2 />, category: 'Halaman' },
 { label: 'AI Capability', path: '/ai-capability', icon: <FiCpu />, category: 'Halaman' },
 { label: 'Departemen', path: '/departments', icon: <FiUsers />, category: 'Halaman' },
 { label: 'Struktur Organisasi', path: '/org-chart', icon: <FiGlobe />, category: 'Halaman' },
 { label: 'Kebijakan Perusahaan', path: '/policies', icon: <FiFileText />, category: 'Halaman' },
 { label: 'Settings', path: '/settings', icon: <FiSettings />, category: 'Halaman' },
 { label: 'Career Page', path: '/jobs', icon: <FiGlobe />, category: 'Halaman' },
 { label: 'Candidate Pipeline', path: '/candidates', icon: <FiUsers />, category: 'Halaman' },
 { label: 'Analytics', path: '/analytics', icon: <FiBarChart2 />, category: 'Halaman' },
 { label: 'Audit Trail', path: '/audit-trail', icon: <FiFileText />, category: 'Halaman' },
];

export default function GlobalSearch() {
 const navigate = useNavigate();
 const { employee } = useAuth();
 const companyId = employee?.company_id ?? null;
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState('');
 const [employees, setEmployees] = useState([]);
 const [loading, setLoading] = useState(false);
 const inputRef = useRef(null);
 const containerRef = useRef(null);

 // Keyboard shortcut: Ctrl+K or Cmd+K
 useEffect(() => {
 const handler = (e) => {
 if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
 e.preventDefault();
 setOpen(o => !o);
 }
 if (e.key === 'Escape') setOpen(false);
 };
 window.addEventListener('keydown', handler);
 return () => window.removeEventListener('keydown', handler);
 }, []);

 // Focus input when open
 useEffect(() => {
 if (open) {
 setTimeout(() => inputRef.current?.focus(), 50);
 setQuery('');
 }
 }, [open]);

 // Close on outside click
 useEffect(() => {
 const handler = (e) => {
 if (containerRef.current && !containerRef.current.contains(e.target)) {
 setOpen(false);
 }
 };
 if (open) document.addEventListener('mousedown', handler);
 return () => document.removeEventListener('mousedown', handler);
 }, [open]);

 // Search employees — scoped to this company only (multi-tenant safety)
 const searchEmployees = useCallback(async (q) => {
  if (!q || q.length < 2) { setEmployees([]); return; }
  // Skip search if no company context
  if (!companyId) { setEmployees([]); return; }
  // Sanitize input to prevent PostgREST filter injection
  const safe = sanitizeFilterInput(q);
  if (!safe) { setEmployees([]); return; }
  setLoading(true);
  const { data } = await supabase
  .from('employees')
  .select('id, name, position, division, email')
  .eq('company_id', companyId)
  .or(`name.ilike.%${safe}%,email.ilike.%${safe}%,position.ilike.%${safe}%,division.ilike.%${safe}%`)
  .limit(6);
  setEmployees(data || []);
  setLoading(false);
 }, [companyId]);

 useEffect(() => {
 const timer = setTimeout(() => searchEmployees(query), 250);
 return () => clearTimeout(timer);
 }, [query, searchEmployees]);

 // Filter features
 const matchedFeatures = query.length >= 1
 ? FEATURES.filter(f => f.label.toLowerCase().includes(query.toLowerCase()))
 : FEATURES.slice(0, 6);

 const hasResults = employees.length > 0 || matchedFeatures.length > 0;

 const go = (path) => {
 navigate(path);
 setOpen(false);
 setQuery('');
 };

 return (
 <>
 {/* Trigger button */}
 <button
 id="global-search-btn"
 onClick={() => setOpen(true)}
 style={{
 display: 'flex', alignItems: 'center', gap: 8,
 padding: '7px 14px', borderRadius: 10,
 border: '1.5px solid var(--border)',
 background: 'var(--bg)', color: 'var(--text-secondary)',
 cursor: 'pointer', fontSize: 13, fontWeight: 500,
 fontFamily: 'inherit', transition: 'all 0.2s',
 minWidth: 200,
 }}
 onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
 onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
 >
 <FiSearch size={14} />
 <span style={{ flex: 1, textAlign: 'left' }}>Cari karyawan, fitur...</span>
 </button>

 {/* Modal overlay */}
 {open && (
 <div className="gs-overlay">
 <div className="gs-modal" ref={containerRef}>
 {/* Search input */}
 <div className="gs-input-wrap">
 <FiSearch className="gs-input-icon" />
 <input
 ref={inputRef}
 className="gs-input"
 placeholder="Cari karyawan, fitur, halaman..."
 value={query}
 onChange={e => setQuery(e.target.value)}
 />
 {query && (
 <button className="gs-clear" onClick={() => setQuery('')}><FiX size={14} /></button>
 )}
 {loading && <div className="gs-spinner" />}
 </div>

 {/* Results */}
 <div className="gs-results">
 {/* Employees */}
 {employees.length > 0 && (
 <div className="gs-section">
 <div className="gs-section-title">Karyawan</div>
 {employees.map(emp => (
 <button key={emp.id} className="gs-item" onClick={() => go(`/employees/${emp.id}`)}>
 <div className="gs-item-icon emp">
 {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
 </div>
 <div className="gs-item-body">
 <div className="gs-item-label">{emp.name}</div>
 <div className="gs-item-sub">{emp.position} — {emp.division}</div>
 </div>
 <div className="gs-item-tag">Karyawan</div>
 </button>
 ))}
 </div>
 )}

 {/* Features */}
 {matchedFeatures.length > 0 && (
 <div className="gs-section">
 <div className="gs-section-title">{query ? 'Fitur & Halaman' : 'Akses Cepat'}</div>
 <div className="gs-features-grid">
 {matchedFeatures.slice(0, 9).map((f, i) => (
 <button key={i} className="gs-feature-btn" onClick={() => go(f.path)}>
 <span className="gs-feature-icon">{f.icon}</span>
 <span className="gs-feature-label">{f.label}</span>
 </button>
 ))}
 </div>
 </div>
 )}

 {!hasResults && query.length >= 2 && (
 <div className="gs-empty">
 <FiSearch size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
 <div>Tidak ada hasil untuk "<strong>{query}</strong>"</div>
 </div>
 )}

 {!query && (
 <div className="gs-hint">
 Ketik nama karyawan atau fitur • <kbd>Esc</kbd> untuk tutup
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </>
 );
}
