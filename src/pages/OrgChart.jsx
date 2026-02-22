import { useState, useEffect } from 'react';
import { FiEdit2, FiX, FiCheck, FiUsers } from 'react-icons/fi';
import * as employeeService from '../services/employeeService';
import '../styles/shared.css';

export default function OrgChart() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingEmp, setEditingEmp] = useState(null);
    const [editForm, setEditForm] = useState({ position: '', division: '' });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data } = await employeeService.getAllEmployees();
        setEmployees(data || []);
        setLoading(false);
    };

    // Build org tree from employees grouped by division
    const buildOrgTree = () => {
        const divisions = {};
        employees.forEach(emp => {
            const div = emp.division || 'Unassigned';
            if (!divisions[div]) divisions[div] = [];
            divisions[div].push(emp);
        });
        return divisions;
    };

    const divisions = buildOrgTree();
    const divisionNames = Object.keys(divisions).sort();

    const handleEdit = (emp) => {
        setEditingEmp(emp);
        setEditForm({ position: emp.position || '', division: emp.division || '' });
    };

    const handleSave = async () => {
        if (!editingEmp) return;
        await employeeService.updateEmployee(editingEmp.id, {
            position: editForm.position,
            division: editForm.division,
        });
        setEditingEmp(null);
        fetchData();
    };

    if (loading) {
        return (
            <div>
                <div className="page-header"><h1>Struktur Organisasi</h1></div>
                <div className="info-card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Memuat data...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1>Struktur Organisasi</h1>
            </div>

            {/* Company Top */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
                <div style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: '#fff', borderRadius: 'var(--radius-md)', padding: '16px 32px',
                    textAlign: 'center', boxShadow: 'var(--shadow-md)',
                }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>PT HRISync Indonesia</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{employees.length} Karyawan · {divisionNames.length} Divisi</div>
                </div>
            </div>

            {/* Connector line */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{ width: 2, height: 24, background: 'var(--border)' }} />
            </div>

            {/* Division Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {divisionNames.map(divName => (
                    <div key={divName} style={{
                        background: 'var(--surface)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                        overflow: 'hidden',
                    }}>
                        {/* Division Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
                            padding: '14px 20px', borderBottom: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                            <FiUsers style={{ color: 'var(--primary)' }} />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{divName}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{divisions[divName].length} orang</div>
                            </div>
                        </div>

                        {/* Division Members */}
                        <div style={{ padding: '8px 0' }}>
                            {divisions[divName].map(emp => (
                                <div key={emp.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                                    borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s',
                                }}>
                                    <div className="employee-avatar" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>
                                        {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {emp.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{emp.position || 'Belum diatur'}</div>
                                    </div>
                                    <button
                                        onClick={() => handleEdit(emp)}
                                        style={{
                                            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                                            padding: 4, borderRadius: 4, transition: 'color 0.15s',
                                        }}
                                        title="Edit posisi/divisi"
                                    >
                                        <FiEdit2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {employees.length === 0 && (
                <div className="info-card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    Belum ada data karyawan.
                </div>
            )}

            {/* Edit Modal */}
            {editingEmp && (
                <div className="modal-overlay" onClick={() => setEditingEmp(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><FiEdit2 style={{ marginRight: 8 }} /> Edit Posisi — {editingEmp.name}</h2>
                            <button className="modal-close" onClick={() => setEditingEmp(null)}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Divisi</label>
                                    <input
                                        className="form-input"
                                        value={editForm.division}
                                        onChange={e => setEditForm({ ...editForm, division: e.target.value })}
                                        placeholder="Contoh: Engineering, Finance, HR"
                                        list="division-suggestions"
                                    />
                                    <datalist id="division-suggestions">
                                        {divisionNames.map(d => <option key={d} value={d} />)}
                                    </datalist>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jabatan / Posisi</label>
                                    <input
                                        className="form-input"
                                        value={editForm.position}
                                        onChange={e => setEditForm({ ...editForm, position: e.target.value })}
                                        placeholder="Contoh: Software Engineer, HR Manager"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setEditingEmp(null)}>Batal</button>
                            <button className="btn-primary" onClick={handleSave}><FiCheck /> Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
