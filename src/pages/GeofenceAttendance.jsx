import { useState, useEffect } from 'react';
import { FiEye, FiX, FiMapPin, FiSettings, FiCamera, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import * as attendanceService from '../services/attendanceService';
import BranchFilter from '../components/BranchFilter';
import { useBranch } from '../context/BranchContext';
import '../styles/shared.css';

export default function GeofenceAttendance() {
    const [logs, setLogs] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [locationForm, setLocationForm] = useState({ name: '', latitude: '', longitude: '', radiusMeters: 100 });

    const { selectedBranchId, branches } = useBranch();

    useEffect(() => { fetchData(); }, [filterDate, selectedBranchId]);

    const fetchData = async () => {
        setLoading(true);
        const { data: attData } = await attendanceService.getAttendanceByDate(filterDate, selectedBranchId);
        const { data: locData } = await attendanceService.getOfficeLocations();
        setLogs(attData || []);
        setLocations(locData || []);
        setLoading(false);
    };

    const inRadius = logs.filter(l => l.in_radius).length;
    const outRadius = logs.filter(l => !l.in_radius).length;
    const selfieOk = logs.filter(l => l.selfie_verified).length;

    const stats = [
        { label: 'Total Clock-In', value: logs.length, color: '#0047AB', icon: <FiMapPin /> },
        { label: 'Dalam Radius', value: inRadius, color: '#16A34A', icon: <FiCheck /> },
        { label: 'Di Luar Radius', value: outRadius, color: '#DC2626', icon: <FiAlertTriangle /> },
        { label: 'Selfie Verified', value: selfieOk, color: '#0047AB', icon: <FiCamera /> },
    ];

    const openDetail = (log) => { setSelected(log); setModal('detail'); };
    const openSettings = () => {
        const loc = locations[0] || { name: '', latitude: '', longitude: '', radius_meters: 100 };
        setLocationForm({ name: loc.name, latitude: String(loc.latitude), longitude: String(loc.longitude), radiusMeters: loc.radius_meters });
        setModal('settings');
    };
    const closeModal = () => { setModal(null); setSelected(null); };

    const saveSettings = async () => {
        // TODO: Add Supabase update for office_locations
        closeModal();
    };

    return (
        <div>
            <div className="page-header">
                <h1>Geofencing & Liveness Detection</h1>
                <div className="page-header-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <BranchFilter />
                    <button className="btn-secondary" onClick={openSettings}><FiSettings /> Office Location</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ color: s.color, fontSize: 20 }}>{s.icon}</span>
                            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Geo Radius Visualization */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 24, marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📍 Office Radius Zone</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: 180, height: 180 }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0, 71, 171, 0.08)', border: '2px dashed rgba(0, 71, 171, 0.3)' }} />
                        <div style={{ position: 'absolute', inset: 30, borderRadius: '50%', background: 'rgba(0, 71, 171, 0.12)' }} />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 16, height: 16, borderRadius: '50%', background: '#0047AB', boxShadow: '0 0 0 4px rgba(0, 71, 171, 0.2)' }} />
                        {logs.slice(0, 7).map((l, i) => {
                            const angle = (i / 7) * Math.PI * 2;
                            const dist = l.in_radius ? 30 + Math.random() * 30 : 75 + Math.random() * 10;
                            const x = 90 + Math.cos(angle) * dist;
                            const y = 90 + Math.sin(angle) * dist;
                            return (
                                <div key={l.id} style={{
                                    position: 'absolute', left: x - 5, top: y - 5,
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: l.in_radius ? '#16A34A' : '#DC2626',
                                    border: '2px solid #fff', boxShadow: 'var(--shadow-sm)',
                                    cursor: 'pointer', zIndex: 1
                                }} title={l.employees?.name || '—'} />
                            );
                        })}
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{locations[0]?.name || 'Kantor Utama'}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>Lat: {locations[0]?.latitude || '-'}, Lng: {locations[0]?.longitude || '-'}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Radius: {locations[0]?.radius_meters || 100}m</div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16A34A' }} /> In Zone
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#DC2626' }} /> Out of Zone
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <input type="date" className="form-input" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ maxWidth: 200 }} />
            </div>

            {/* Table */}
            <div className="data-table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Karyawan</th>
                            <th>Clock-In</th>
                            <th>Koordinat</th>
                            <th>Radius</th>
                            <th>Selfie</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(l => (
                            <tr key={l.id}>
                                <td style={{ fontWeight: 600 }}>{l.employees?.name || '—'}</td>
                                <td>{l.clock_in || '—'}</td>
                                <td style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                    {l.latitude ? `${Number(l.latitude).toFixed(4)}, ${Number(l.longitude).toFixed(4)}` : '—'}
                                </td>
                                <td>
                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: l.in_radius ? '#16A34A' : '#DC2626' }}>
                                        {l.in_radius ? '✓ In Zone' : '⚠ Out of Zone'}
                                    </span>
                                </td>
                                <td>
                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: l.selfie_verified ? '#16A34A' : '#F59E0B', background: l.selfie_verified ? '#F0FDF4' : '#FFFBEB' }}>
                                        {l.selfie_verified ? '✓ Verified' : '⚠ Pending'}
                                    </span>
                                </td>
                                <td><button className="action-btn" onClick={() => openDetail(l)}><FiEye /></button></td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr><td colSpan={6} className="empty-state">Tidak ada data untuk tanggal ini.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            {modal === 'detail' && selected && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detail Clock-In</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Karyawan</label>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.employees?.name || '—'}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Clock-In</label>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.clock_in}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Latitude</label>
                                    <div style={{ fontSize: 14, fontFamily: 'monospace' }}>{selected.latitude}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Longitude</label>
                                    <div style={{ fontSize: 14, fontFamily: 'monospace' }}>{selected.longitude}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Dalam Radius?</label>
                                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff', background: selected.in_radius ? '#16A34A' : '#DC2626', display: 'inline-block' }}>
                                        {selected.in_radius ? '✓ Ya — Dalam zona kantor' : '✗ Tidak — Di luar zona kantor'}
                                    </span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--muted)' }}>Selfie Verification</label>
                                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: selected.selfie_verified ? '#16A34A' : '#F59E0B', background: selected.selfie_verified ? '#F0FDF4' : '#FFFBEB', display: 'inline-block' }}>
                                        {selected.selfie_verified ? '✓ Selfie Terverifikasi' : '⚠ Selfie Belum Terverifikasi'}
                                    </span>
                                </div>
                            </div>
                            {!selected.in_radius && (
                                <div style={{ marginTop: 16, padding: 12, background: '#FEF2F2', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FiAlertTriangle /> Karyawan clock-in dari lokasi di luar radius kantor. Perlu verifikasi lebih lanjut.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Office Location Settings Modal */}
            {modal === 'settings' && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><FiSettings style={{ marginRight: 8 }} /> Pengaturan Lokasi Kantor</h2>
                            <button className="modal-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label className="form-label">Nama Lokasi</label>
                                    <input className="form-input" value={locationForm.name} onChange={e => setLocationForm({ ...locationForm, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Latitude</label>
                                    <input type="number" step="0.0001" className="form-input" value={locationForm.latitude} onChange={e => setLocationForm({ ...locationForm, latitude: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Longitude</label>
                                    <input type="number" step="0.0001" className="form-input" value={locationForm.longitude} onChange={e => setLocationForm({ ...locationForm, longitude: e.target.value })} />
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Radius (meter)</label>
                                    <input type="number" className="form-input" value={locationForm.radiusMeters} onChange={e => setLocationForm({ ...locationForm, radiusMeters: e.target.value })} />
                                    <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Default: 100 meter. Karyawan harus clock-in dari dalam radius ini.</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModal}>Batal</button>
                            <button className="btn-primary" onClick={saveSettings}>Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
