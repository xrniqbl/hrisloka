import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { FiEdit2, FiX, FiCheck, FiUsers, FiChevronDown, FiChevronRight, FiSearch } from 'react-icons/fi';
import * as employeeService from '../services/employeeService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { isFounder, getRole } from '../lib/rbac';
import { TableSkeleton } from '../components/SkeletonLoader';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';

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

 useEffect(() => { fetchData(); }, []);

 const fetchData = async () => {
 setLoading(true);
 const [empRes, deptRes] = await Promise.all([
 employeeService.getAllEmployees(undefined, employee?.company_id),
 supabase.from('departments').select('id, name, code').eq('is_active', true).order('name'),
 ]);
 setEmployees(empRes.data || []);
 setDepartments(deptRes.data || []);
 const divs = {};
 (empRes.data || []).forEach(e => { divs[e.division || 'Unassigned'] = true; });
 setExpandedDivs(divs);
 setLoading(false);
 };

 // Realtime updates
 useRealtimeTable('employees', fetchData);
 useRealtimeTable('departments', fetchData);

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
 const divColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#F97316'];

 if (loading) return (
 <div>
 <PageHeader titleKey="orgchart.title" subtitleKey="orgchart.subtitle" />
 <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 24 }}>
 <TableSkeleton rows={6} cols={4} />
 </div>
 </div>
 );

 const companyName = (() => {
 try { return JSON.parse(localStorage.getItem('HRIS Loka_company_settings') || '{}').name || 'Perusahaan'; }
 catch { return 'Perusahaan'; }
 })();

 return (
 <div>
 <div className="page-header">
 <h1><FiUsers style={{ marginRight: 10 }} />Struktur Organisasi</h1>
 <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
 <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
 {['tree', 'grid'].map(v => (
 <button key={v} onClick={() => setView(v)} style={{
 padding: '8px 14px', fontSize: 12, fontWeight: 600,
 background: view === v ? 'var(--primary)' : 'var(--surface)',
 color: view === v ? '#fff' : 'var(--text-secondary)',
 border: 'none', cursor: 'pointer', textTransform: 'capitalize',
 }}>{v === 'tree' ? 'Tree' : 'Grid'}</button>
 ))}
 </div>
 </div>
 </div>

 {/* Superadmin note */}
 {isSuperAdmin && (
 <div style={{
 marginBottom: 16, padding: '10px 16px', borderRadius: 10,
 background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
 fontSize: 12.5, color: '#3B82F6', fontWeight: 600,
 display: 'flex', alignItems: 'center', gap: 8,
 }}>
 <FiEdit2 size={13} />
 Klik ikon edit di setiap karyawan untuk mengatur jabatan, divisi, dan atasan langsung mereka.
 Untuk mengelola daftar departemen, pergi ke menu <strong style={{ marginLeft: 4 }}>Karyawan ? Departemen</strong>.
 </div>
 )}

 {/* Company top node */}
 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
 <div style={{
 background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
 color: '#fff', borderRadius: 'var(--radius-md)', padding: '16px 40px',
 textAlign: 'center', boxShadow: 'var(--shadow-md)',
 }}>
 <div style={{ fontSize: 18, fontWeight: 700 }}>{companyName}</div>
 <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{employees.length} Karyawan - {divisionNames.length} Divisi</div>
 </div>
 </div>

 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
 <div style={{ width: 2, height: 24, background: 'var(--border)' }} />
 </div>

 {/* Tree View */}
 {view === 'tree' ? (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 8 }}>
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
 <div key={divName} style={{ marginBottom: 12 }}>
 <div onClick={() => toggleDiv(divName)} style={{
 background: 'var(--surface)', borderRadius: 'var(--radius-md)',
 border: '1px solid var(--border)', padding: '14px 20px',
 display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
 boxShadow: 'var(--shadow-xs)', borderLeft: `4px solid ${color}`,
 transition: 'all 0.15s',
 }}>
 {expandedDivs[divName] ? <FiChevronDown style={{ color }} /> : <FiChevronRight style={{ color }} />}
 <FiUsers style={{ color, fontSize: 18 }} />
 <div style={{ flex: 1 }}>
 <div style={{ fontWeight: 700, fontSize: 14 }}>{divName}</div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>{emps.length} orang</div>
 </div>
 <div style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: `${color}15`, color }}>
 {managers.length} lead - {members.length} staff
 </div>
 </div>

 {expandedDivs[divName] && (
 <div style={{ marginLeft: 30, borderLeft: `2px solid ${color}20`, paddingLeft: 20, paddingTop: 8 }}>
 {[...managers, ...members].map(emp => (
 <div key={emp.id} style={{
 display: 'flex', alignItems: 'center', gap: 12,
 padding: isManager(emp) ? '10px 16px' : '8px 16px',
 background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
 border: '1px solid var(--border)', marginBottom: 6,
 boxShadow: isManager(emp) ? 'var(--shadow-xs)' : 'none',
 }}>
 <div style={{ width: isManager(emp) ? 8 : 6, height: isManager(emp) ? 8 : 6, borderRadius: '50%', background: isManager(emp) ? color : `${color}60`, flexShrink: 0 }} />
 <div style={{
 width: isManager(emp) ? 38 : 32, height: isManager(emp) ? 38 : 32, borderRadius: '50%',
 background: isManager(emp) ? `${color}20` : 'var(--primary-light)',
 color: isManager(emp) ? color : 'var(--primary)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontWeight: 700, fontSize: isManager(emp) ? 13 : 11, flexShrink: 0,
 border: isManager(emp) ? `2px solid ${color}` : 'none',
 }}>
 {getInitials(emp.name)}
 </div>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ fontWeight: isManager(emp) ? 700 : 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
 {emp.name}
 {isManager(emp) && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: `${color}15`, color, fontWeight: 700 }}>LEAD</span>}
 </div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>
 {emp.position || 'Belum diatur'}
 </div>
 </div>
 {isSuperAdmin && (
 <button onClick={() => handleEdit(emp)} className="action-btn" title="Edit jabatan & divisi">
 <FiEdit2 size={13} />
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
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginTop: 16 }}>
 {filteredDivs.map((divName, idx) => {
 const color = divColors[idx % divColors.length];
 const emps = divisions[divName];
 return (
 <div key={divName} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
 <div style={{ background: `linear-gradient(135deg, ${color}15, ${color}08)`, padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
 <FiUsers style={{ color }} />
 <div>
 <div style={{ fontWeight: 700, fontSize: 14, color }}>{divName}</div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>{emps.length} orang</div>
 </div>
 </div>
 <div style={{ padding: '8px 0' }}>
 {emps.map(emp => (
 <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-light)' }}>
 <div style={{ width: 34, height: 34, borderRadius: '50%', background: isManager(emp) ? `${color}20` : 'var(--primary-light)', color: isManager(emp) ? color : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0, border: isManager(emp) ? `2px solid ${color}` : 'none' }}>
 {getInitials(emp.name)}
 </div>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
 {emp.name}
 {isManager(emp) && <span style={{ fontSize: 9, marginLeft: 6, padding: '1px 6px', borderRadius: 10, background: `${color}15`, color, fontWeight: 700 }}>LEAD</span>}
 </div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>{emp.position || 'Belum diatur'}</div>
 </div>
 {isSuperAdmin && (
 <button onClick={() => handleEdit(emp)} className="action-btn" title="Edit jabatan & divisi">
 <FiEdit2 size={14} />
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
 <div className="info-card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
 Belum ada data karyawan. Tambahkan karyawan di menu <strong>Karyawan ? Data Karyawan</strong>.
 </div>
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
 <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', fontSize: 12.5, color: '#3B82F6' }}>
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
 <button className="btn-primary" onClick={handleSave}><FiCheck /> Simpan Perubahan</button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
