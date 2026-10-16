import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import { FiEdit2, FiX, FiCheck, FiUsers, FiChevronDown, FiChevronRight, FiSearch } from 'react-icons/fi';
import * as employeeService from '../services/employeeService';
import * as departmentService from '../services/departmentService';
import { useAuth } from '../context/AuthContext';
import { isFounder, getRole } from '../lib/rbac';
import { TableSkeleton } from '../components/SkeletonLoader';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import EmptyState from '../components/EmptyState';

export default function OrgChart() {
  const { user, employee } = useAuth();
 const currentEmp = employee;
 const [employees, setEmployees] = useState([]);
 const [departments, setDepartments] = useState([]);
 const [loading, setLoading] = useState(true);
 const [editingEmp, setEditingEmp] = useState(null);
 const [editForm, setEditForm] = useState({ position: '', division: '', manager_id: '' });
 const [expandedDivs, setExpandedDivs] = useState({});
 const [search, setSearch] = useState('');
 const [view, setView] = useState('tree');

 const role = getRole(currentEmp);
 const isSuperAdmin = role === 'super_admin' || isFounder(user, currentEmp);

 const fetchData = useCallback(async () => {
 setLoading(true);
 const [empRes, deptRes] = await Promise.all([
 employeeService.getAllEmployees(undefined, employee?.company_id),
 departmentService.getActiveDepartments(employee?.company_id),
 ]);
 setEmployees(empRes.data || []);
 setDepartments(deptRes.data || []);
 const divs = {};
 (empRes.data || []).forEach(e => { divs[e.division || 'Unassigned'] = true; });
 setExpandedDivs(divs);
 setLoading(false);
 }, [employee?.company_id]);

 useEffect(() => { fetchData(); }, [fetchData]);

 // Realtime updates
 useRealtimeTable('employees', fetchData, { companyId: employee?.company_id });
 useRealtimeTable('departments', fetchData, { companyId: employee?.company_id });

 const buildOrgTree = () => {
 const divisions = {};
 employees.forEach(emp => {
 const div = emp.division || 'Unassigned';
 if (!divisions[div]) divisions[div] = [];
 divisions[div].push(emp);
 });
 const managerKeywords = ['director', 'manager', 'head', 'lead', 'chief', 'vp', 'direktur', 'kepala'];
 Object.keys(divisions).forEach(div => {
 divisions[div].sort((a, b) => {
 const aM = managerKeywords.some(k => (a.position || '').toLowerCase().includes(k));
 const bM = managerKeywords.some(k => (b.position || '').toLowerCase().includes(k));
 if (aM && !bM) return -1;
 if (!aM && bM) return 1;
 return (a.name || '').localeCompare(b.name || '');
 });
 });
 return divisions;
 };

 const divisions = buildOrgTree();
 const divisionNames = Object.keys(divisions).sort();
 const managerKeywords = ['director', 'manager', 'head', 'lead', 'chief', 'vp', 'direktur', 'kepala'];
 const isManager = (emp) => managerKeywords.some(k => (emp.position || '').toLowerCase().includes(k));

 // All dept names for the edit dropdown (from departments table + existing divisions)
 const allDeptNames = [...new Set([
 ...departments.map(d => d.name),
 ...divisionNames.filter(d => d !== 'Unassigned'),
 ])].sort();

 const filteredDivs = search
 ? divisionNames.filter(d =>
 d.toLowerCase().includes(search.toLowerCase()) ||
 divisions[d].some(e => e.name.toLowerCase().includes(search.toLowerCase()) ||
 (e.position || '').toLowerCase().includes(search.toLowerCase()))
 )
 : divisionNames;

 const toggleDiv = (div) => setExpandedDivs(prev => ({ ...prev, [div]: !prev[div] }));

 const handleEdit = (emp) => {
 setEditingEmp(emp);
 setEditForm({ position: emp.position || '', division: emp.division || '', manager_id: emp.manager_id || '' });
 };

 const handleSave = async () => {
 if (!editingEmp) return;
 await employeeService.updateEmployee(editingEmp.id, {
 position: editForm.position,
 division: editForm.division,
 manager_id: editForm.manager_id ? Number(editForm.manager_id) : null,
 });
 setEditingEmp(null);
 fetchData();
 };

 const getInitials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
 const divColors = ['#635BFF', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#F97316'];

 if (loading) return (
 <div>
 <PageHeader titleKey="orgchart.title" subtitleKey="orgchart.subtitle" />
 <div className="chart-card">
 <TableSkeleton rows={6} cols={4} />
 </div>
 </div>
 );

 const companyName = (() => {
 try { return JSON.parse(localStorage.getItem('KiniKerja_company_settings') || '{}').name || 'Perusahaan'; }
 catch { return 'Perusahaan'; }
 })();

 return (
 <div>
 <div className="page-header">
 <h1><FiUsers style={{ marginRight: 10 }} />Struktur Organisasi</h1>
 <div className="page-header-actions">
 <div style={{ position: 'relative' }}>
 <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }} />
 <input
 className="form-input"
 placeholder="Cari karyawan atau divisi..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 style={{ paddingLeft: 36, minWidth: 220 }}
 />
 </div>
 {/* View toggle */}
 <div className="view-toggle">
 {['tree', 'grid'].map(v => (
 <button key={v} onClick={() => setView(v)} style={{
 background: view === v ? 'var(--primary)' : 'var(--surface)',
 color: view === v ? '#fff' : 'var(--text-secondary)',
 }}>{v === 'tree' ? 'Tree' : 'Grid'}</button>
 ))}
 </div>
 </div>
 </div>

 {/* Superadmin note */}
 {isSuperAdmin && (
 <div className="info-banner mb">
 <FiEdit2 size={13} />
 Klik ikon edit di setiap karyawan untuk mengatur jabatan, divisi, dan atasan langsung mereka.
 Untuk mengelola daftar departemen, pergi ke menu <strong>Karyawan ? Departemen</strong>.
 </div>
 )}

 {/* Company top node */}
 <div className="chart-company-node-wrap">
 <div className="chart-company-node">
 <div className="chart-company-name">{companyName}</div>
 <div className="chart-company-meta">{employees.length} Karyawan - {divisionNames.length} Divisi</div>
 </div>
 </div>

 <div className="chart-connector-wrap">
 <div className="chart-connector-line" />
 </div>

 {/* Tree View */}
 {view === 'tree' ? (
 <div className="chart-tree-list">
 {filteredDivs.map((divName, idx) => {
 const color = divColors[idx % divColors.length];
 const emps = search
 ? divisions[divName].filter(e =>
 e.name.toLowerCase().includes(search.toLowerCase()) ||
 (e.position || '').toLowerCase().includes(search.toLowerCase()) ||
 divName.toLowerCase().includes(search.toLowerCase())
 )
 : divisions[divName];
 const managers = emps.filter(isManager);
 const members = emps.filter(e => !isManager(e));
 return (
 <div key={divName} className="mb-sm">
 <div onClick={() => toggleDiv(divName)} className="chart-div-row" style={{ borderLeft: `4px solid ${color}` }}>
 {expandedDivs[divName] ? <FiChevronDown style={{ color }} /> : <FiChevronRight style={{ color }} />}
 <FiUsers style={{ color, fontSize: 18 }} />
 <div className="chart-div-info">
 <div className="td-semibold">{divName}</div>
 <div className="td-muted-sm">{emps.length} orang</div>
 </div>
 <div className="chart-div-badge" style={{ background: `${color}15`, color }}>
 {managers.length} lead - {members.length} staff
 </div>
 </div>

 {expandedDivs[divName] && (
 <div className="chart-emp-list" style={{ borderLeft: `2px solid ${color}20` }}>
 {[...managers, ...members].map(emp => (
 <div key={emp.id} className={`chart-emp-row${isManager(emp) ? ' is-manager' : ''}`}>
 <div className="chart-emp-dot" style={{ background: isManager(emp) ? color : `${color}60`, width: isManager(emp) ? 8 : 6, height: isManager(emp) ? 8 : 6 }} />
 <div className="chart-emp-avatar" style={{
 width: isManager(emp) ? 38 : 32,
 height: isManager(emp) ? 38 : 32,
 background: isManager(emp) ? `${color}20` : 'var(--primary-light)',
 color: isManager(emp) ? color : 'var(--primary)',
 fontSize: isManager(emp) ? 13 : 11,
 border: isManager(emp) ? `2px solid ${color}` : 'none',
 }}>
 {getInitials(emp.name)}
 </div>
 <div className="chart-emp-info">
 <div className="td-semibold btn-icon-row">
 {emp.name}
 {isManager(emp) && <span className="chart-lead-badge" style={{ background: `${color}15`, color }}>LEAD</span>}
 </div>
 <div className="td-muted-sm">
 {emp.position || 'Belum diatur'}
 </div>
 </div>
 {isSuperAdmin && (
 <button onClick={() => handleEdit(emp)} className="action-btn" title="Edit jabatan & divisi" aria-label="Edit jabatan dan divisi"><FiEdit2 size={13} />
 </button>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 );
 })}
 </div>
 ) : (
 /* Grid View */
 <div className="stats-grid mb">
 {filteredDivs.map((divName, idx) => {
 const color = divColors[idx % divColors.length];
 const emps = divisions[divName];
 return (
 <div key={divName} className="chart-card chart-card-overflow">
 <div className="chart-card-header" style={{ background: `linear-gradient(135deg, ${color}15, ${color}08)` }}>
 <FiUsers style={{ color }} />
 <div>
 <div className="td-semibold chart-div-name" style={{ color }}>{divName}</div>
 <div className="td-muted-sm">{emps.length} orang</div>
 </div>
 </div>
 <div className="chart-grid-body">
 {emps.map(emp => (
 <div key={emp.id} className="chart-grid-emp-row">
 <div className="chart-emp-avatar" style={{
 width: 34, height: 34,
 background: isManager(emp) ? `${color}20` : 'var(--primary-light)',
 color: isManager(emp) ? color : 'var(--primary)',
 fontSize: 12,
 border: isManager(emp) ? `2px solid ${color}` : 'none',
 }}>
 {getInitials(emp.name)}
 </div>
 <div className="chart-emp-info">
 <div className="td-truncate td-semibold td-sm">
 {emp.name}
 {isManager(emp) && <span className="chart-lead-badge" style={{ background: `${color}15`, color }}>LEAD</span>}
 </div>
 <div className="td-muted-sm">{emp.position || 'Belum diatur'}</div>
 </div>
 {isSuperAdmin && (
 <button onClick={() => handleEdit(emp)} className="action-btn" title="Edit jabatan & divisi" aria-label="Edit jabatan dan divisi"><FiEdit2 size={14} />
 </button>
 )}
 </div>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {employees.length === 0 && (
 <EmptyState
  title="Belum ada data karyawan"
  description="Tambahkan karyawan agar struktur organisasi bisa ditampilkan."
  ctaLabel="Kelola karyawan"
  onCta={() => { window.location.href = '/employees'; }}
 />
 )}

 {/* -- Edit Employee Position/Division Modal (SuperAdmin only) -- */}
 {editingEmp && (
 <div className="modal-overlay" onClick={() => setEditingEmp(null)}>
 <div className="modal-box" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2><FiEdit2 style={{ marginRight: 8 }} /> Edit Struktur - {editingEmp.name}</h2>
 <button className="modal-close" onClick={() => setEditingEmp(null)}><FiX /></button>
 </div>
 <div className="modal-body">
 <div className="info-banner mb-sm">
 Perubahan ini akan langsung terlihat di Struktur Organisasi secara realtime.
 </div>
 <div className="form-grid">
 <div className="form-group">
 <label className="form-label">Divisi / Departemen</label>
 <select className="form-select" value={editForm.division} onChange={e => setEditForm({ ...editForm, division: e.target.value })}>
 <option value="">-- Pilih Departemen --</option>
 {allDeptNames.map(d => <option key={d} value={d}>{d}</option>)}
 </select>
 </div>
 <div className="form-group">
 <label className="form-label">Jabatan / Posisi</label>
 <input className="form-input" value={editForm.position} onChange={e => setEditForm({ ...editForm, position: e.target.value })} placeholder="Software Engineer, HR Manager..." />
 </div>
 <div className="form-group full-width">
 <label className="form-label">Atasan Langsung (Manager)</label>
 <select className="form-select" value={editForm.manager_id} onChange={e => setEditForm({ ...editForm, manager_id: e.target.value })}>
 <option value="">-- Tidak ada atasan --</option>
 {employees
 .filter(e => e.id !== editingEmp.id)
 .sort((a, b) => {
 const aM = isManager(a), bM = isManager(b);
 if (aM && !bM) return -1; if (!aM && bM) return 1;
 return (a.name || '').localeCompare(b.name || '');
 })
 .map(e => (
 <option key={e.id} value={e.id}>
 {e.name} - {e.position || 'Staff'} ({e.division || 'Unassigned'})
 {isManager(e) ? ' [Lead]' : ''}
 </option>
 ))}
 </select>
 </div>
 </div>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => setEditingEmp(null)}>Batal</button>
 <button className="btn-primary" onClick={handleSave} aria-label="Simpan perubahan"><FiCheck /> Simpan Perubahan</button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}









