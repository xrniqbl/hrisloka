import { useState, useEffect } from 'react';
import { FiPlus, FiX, FiTrash2 } from 'react-icons/fi';
import * as shiftService from '../services/shiftService';
import * as employeeService from '../services/employeeService';
import '../styles/shared.css';

const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default function ShiftManagement() {
    const [shifts, setShifts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', startTime: '', endTime: '', color: '#0047AB' });
    const [activeCell, setActiveCell] = useState(null); // { empId, day }

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: shiftData } = await shiftService.getAllShifts();
        const { data: empData } = await employeeService.getAllEmployees();
        const { data: assignData } = await shiftService.getShiftAssignments();
        setShifts(shiftData || []);
        setEmployees(empData || []);
        setAssignments(assignData || []);
        setLoading(false);
    };

    const handleAddShift = async () => {
        if (!form.name || !form.startTime || !form.endTime) return;
        await shiftService.createShift(form);
        setShowForm(false);
        setForm({ name: '', startTime: '', endTime: '', color: '#0047AB' });
        fetchData();
    };

    const handleDeleteShift = async (id) => {
        if (!confirm('Hapus shift ini? Semua assignment terkait juga akan dihapus.')) return;
        await shiftService.deleteShift(id);
        fetchData();
    };

    const handleAssignShift = async (empId, day, shiftId) => {
        await shiftService.assignShift(empId, shiftId, day);
        setActiveCell(null);
        fetchData();
    };

    const handleRemoveAssignment = async (empId, day) => {
        const existing = assignments.find(a => a.employee_id === empId && a.day_of_week === day);
        if (existing) {
            await shiftService.removeShiftAssignment(existing.id);
            fetchData();
        }
        setActiveCell(null);
    };

    const getAssignment = (empId, day) => {
        return assignments.find(a => a.employee_id === empId && a.day_of_week === day);
    };

    const toggleCell = (empId, day) => {
        if (activeCell && activeCell.empId === empId && activeCell.day === day) {
            setActiveCell(null);
        } else {
            setActiveCell({ empId, day });
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Manajemen Shift</h1>
                <button className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> Tambah Shift</button>
            </div>

            {/* Shift Legend */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                {shifts.map((s) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: 'var(--surface)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})</span>
                        <button onClick={() => handleDeleteShift(s.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2, display: 'flex' }}><FiTrash2 size={13} /></button>
                    </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 14px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#E5E7EB' }} />
                    <span style={{ fontWeight: 600, color: 'var(--muted)' }}>OFF / Belum diatur</span>
                </div>
            </div>

            {shifts.length === 0 && (
                <div className="info-card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    Belum ada shift. Buat shift terlebih dahulu sebelum mengatur jadwal karyawan.
                </div>
            )}

            {/* Schedule Grid — Shows ALL employees */}
            {shifts.length > 0 && (
                <div className="data-table-card">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ minWidth: 180 }}>Karyawan</th>
                                    {dayNames.map((d) => <th key={d} style={{ textAlign: 'center', minWidth: 100 }}>{d}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp) => (
                                    <tr key={emp.id}>
                                        <td>
                                            <div className="employee-cell">
                                                <div className="employee-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                                                    {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="employee-name">{emp.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{emp.division}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {dayNames.map((_, dayIdx) => {
                                            const assignment = getAssignment(emp.id, dayIdx);
                                            const shift = assignment?.shifts;
                                            const isActive = activeCell?.empId === emp.id && activeCell?.day === dayIdx;

                                            return (
                                                <td key={dayIdx} style={{ textAlign: 'center', position: 'relative', padding: 4 }}>
                                                    {/* Cell Button */}
                                                    <div
                                                        onClick={() => toggleCell(emp.id, dayIdx)}
                                                        style={{
                                                            padding: '8px 6px', borderRadius: 6, cursor: 'pointer',
                                                            background: shift ? `${shift.color}18` : '#F3F4F6',
                                                            border: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                                                            color: shift ? shift.color : '#9CA3AF',
                                                            fontSize: 11, fontWeight: 600, transition: 'all 0.15s ease',
                                                            minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        }}
                                                    >
                                                        {shift ? shift.name : 'OFF'}
                                                    </div>

                                                    {/* Dropdown Picker */}
                                                    {isActive && (
                                                        <div style={{
                                                            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                                                            zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)',
                                                            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                                                            padding: 6, minWidth: 140, display: 'grid', gap: 4,
                                                        }}>
                                                            {shifts.map(s => (
                                                                <button
                                                                    key={s.id}
                                                                    onClick={(e) => { e.stopPropagation(); handleAssignShift(emp.id, dayIdx, s.id); }}
                                                                    style={{
                                                                        padding: '6px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                                                                        background: shift?.id === s.id ? `${s.color}30` : 'transparent',
                                                                        color: s.color, fontWeight: 600, fontSize: 12, textAlign: 'left',
                                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                                    }}
                                                                >
                                                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                                                                    {s.name}
                                                                </button>
                                                            ))}
                                                            {shift && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(emp.id, dayIdx); }}
                                                                    style={{
                                                                        padding: '6px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                                                                        background: '#FEF2F2', color: '#DC2626', fontWeight: 600, fontSize: 12,
                                                                        textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                                                                        borderTop: '1px solid var(--border)', marginTop: 2, paddingTop: 8,
                                                                    }}
                                                                >
                                                                    <FiX size={12} /> Hapus
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {employees.length === 0 && (
                                    <tr><td colSpan={8} className="empty-state">Belum ada data karyawan.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Shift Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Tambah Shift Baru</h2>
                            <button className="modal-close" onClick={() => setShowForm(false)}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Nama Shift</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Shift Pagi" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Warna</label>
                                    <input type="color" className="form-input" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ height: 40 }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jam Mulai</label>
                                    <input className="form-input" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jam Selesai</label>
                                    <input className="form-input" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
                            <button className="btn-primary" onClick={handleAddShift} disabled={!form.name || !form.startTime || !form.endTime}>Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
