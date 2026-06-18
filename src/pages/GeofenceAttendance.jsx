import { useState, useEffect, useCallback } from 'react';
import { FiEye, FiX, FiMapPin, FiSettings, FiCheck, FiAlertTriangle, FiShield, FiAlertCircle, FiNavigation } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as attendanceService from '../services/attendanceService';
import { supabase } from '../lib/supabase';
import BranchFilter from '../components/BranchFilter';
import { useBranch } from '../context/BranchContext';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

// Fix Leaflet default marker icon (webpack/vite bundler issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Map click handler component
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

function TrustScoreBadge({ score, level }) {
  if (score === undefined || score === null) return <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>;
  const colors = {
    trusted: { bg: '#F0FDF4', color: '#16A34A' },
    warning: { bg: '#FFFBEB', color: '#D97706' },
    rejected: { bg: '#FEF2F2', color: '#DC2626' },
  };
  const s = colors[level] || colors.trusted;
  if (loading) return <PageSkeleton hasStats={false} tableRows={6} tableCols={4} />;
  return (
    <span style={{ padding: '3px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      <FiShield style={{ marginRight: 3, verticalAlign: 'middle' }} size={10} />{score}
    </span>
  );
}

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
 const faceVerifiedCount = logs.filter(l => l.face_verified).length;
 const suspiciousCount = logs.filter(l => l.trust_level === 'warning' || l.trust_level === 'rejected').length;

 const stats = [
 { label: 'Total Clock-In', value: logs.length, color: '#0047AB', icon: <FiMapPin /> },
 { label: 'Dalam Radius', value: inRadius, color: '#16A34A', icon: <FiCheck /> },
 { label: 'Di Luar Radius', value: outRadius, color: '#DC2626', icon: <FiAlertTriangle /> },
 { label: 'Face Verified', value: faceVerifiedCount, color: '#7C3AED', icon: <FiShield /> },
 { label: 'Suspicious', value: suspiciousCount, color: '#DC2626', icon: <FiAlertCircle /> },
 ];

 const openDetail = (log) => { setSelected(log); setModal('detail'); };
 const openSettings = () => {
 const loc = locations[0] || { name: '', latitude: '', longitude: '', radius_meters: 100 };
 setLocationForm({ name: loc.name, latitude: String(loc.latitude), longitude: String(loc.longitude), radiusMeters: loc.radius_meters });
 setModal('settings');
 };
 const closeModal = () => { setModal(null); setSelected(null); };

 const saveSettings = async () => {
 const payload = {
 name: locationForm.name,
 latitude: parseFloat(locationForm.latitude),
 longitude: parseFloat(locationForm.longitude),
 radius_meters: parseInt(locationForm.radiusMeters),
 };
 if (locations[0]?.id) {
 await supabase.from('office_locations').update(payload).eq('id', locations[0].id);
 } else {
 await supabase.from('office_locations').insert(payload);
 }
 fetchData();
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
 <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Office Radius Zone</div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
 <div style={{ position: 'relative', width: 180, height: 180 }}>
 <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0, 71, 171, 0.08)', border: '2px dashed rgba(0, 71, 171, 0.3)' }} />
 <div style={{ position: 'absolute', inset: 30, borderRadius: '50%', background: 'rgba(0, 71, 171, 0.12)' }} />
 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 16, height: 16, borderRadius: '50%', background: '#0047AB', boxShadow: '0 0 0 4px rgba(0, 71, 171, 0.2)' }} />
 {logs.slice(0, 7).map((l, i) => {
 const angle = (i / 7) * Math.PI * 2;
 // Deterministic positioning based on id to avoid flickering on re-render
 const seed = (l.id || i) * 137 % 100;
 const dist = l.in_radius ? 30 + (seed / 100) * 30 : 75 + (seed / 100) * 10;
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
 <th>Face ID</th>
 <th>Trust Score</th>
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
 {l.in_radius ? 'In Zone' : 'Out of Zone'}
 </span>
 </td>
 <td>
 <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: l.face_verified ? '#7C3AED' : '#F59E0B', background: l.face_verified ? '#F5F3FF' : '#FFFBEB' }}>
 {l.face_verified ? 'Verified' : 'Selfie'}
 </span>
 </td>
 <td><TrustScoreBadge score={l.trust_score} level={l.trust_level} /></td>
 <td><button className="action-btn" onClick={() => openDetail(l)}><FiEye /></button></td>
 </tr>
 ))}
 {logs.length === 0 && (
 <tr><td colSpan={7} className="empty-state">Tidak ada data untuk tanggal ini.</td></tr>
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
 {selected.in_radius ? 'Dalam zona kantor' : 'Di luar zona kantor'}
 </span>
 </div>
 <div className="form-group">
 <label className="form-label" style={{ color: 'var(--muted)' }}>Face ID</label>
 <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: selected.face_verified ? '#7C3AED' : '#F59E0B', background: selected.face_verified ? '#F5F3FF' : '#FFFBEB', display: 'inline-block' }}>
 {selected.face_verified ? `Face Verified (${selected.face_confidence ? Math.round(selected.face_confidence) + '%' : '—'})` : 'Selfie Only'}
 </span>
 </div>
 <div className="form-group">
 <label className="form-label" style={{ color: 'var(--muted)' }}>Trust Score</label>
 <TrustScoreBadge score={selected.trust_score} level={selected.trust_level} />
 </div>
 {selected.anti_spoof_flags?.length > 0 && (
 <div className="form-group full-width">
 <label className="form-label" style={{ color: 'var(--muted)' }}>Security Flags</label>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
 {selected.anti_spoof_flags.map(f => (
 <span key={f} style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, background: '#FEF2F2', color: '#DC2626', fontWeight: 600 }}>
 {f.replaceAll('_', ' ')}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>
 {!selected.in_radius && (
 <div style={{ marginTop: 16, padding: 12, background: '#FEF2F2', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8 }}>
 <FiAlertTriangle /> Karyawan clock-in dari lokasi di luar radius kantor. Perlu verifikasi lebih lanjut.
 </div>
 )}
 {(selected.trust_level === 'warning' || selected.trust_level === 'rejected') && (
 <div style={{ marginTop: 12, padding: 12, background: '#FFFBEB', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#D97706', display: 'flex', alignItems: 'center', gap: 8 }}>
 <FiAlertTriangle /> Terdeteksi anomali keamanan. Trust score: {selected.trust_score}/100. Harap diverifikasi manual.
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Office Location Settings Modal — with Interactive Mini-Map */}
 {modal === 'settings' && (
 <div className="modal-overlay" onClick={closeModal}>
 <div className="modal-box modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
 <div className="modal-header">
 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
   <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
     <FiMapPin size={16} />
   </div>
   <div>
     <h2 style={{ margin: 0, fontSize: 15 }}>Pengaturan Lokasi Kantor</h2>
     <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Klik pada peta untuk menentukan lokasi kantor</p>
   </div>
 </div>
 <button className="modal-close" onClick={closeModal}><FiX /></button>
 </div>
 <div className="modal-body" style={{ padding: 0 }}>

   {/* Interactive Mini-Map */}
   <div style={{ position: 'relative', height: 320, background: '#e8f0fe' }}>
     <MapContainer
       key={`${locationForm.latitude}-${locationForm.longitude}`}
       center={[
         parseFloat(locationForm.latitude) || -6.2088,
         parseFloat(locationForm.longitude) || 106.8456,
       ]}
       zoom={16}
       style={{ height: '100%', width: '100%', zIndex: 0 }}
       zoomControl={true}
     >
       <TileLayer
         attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
         url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
       />
       <MapClickHandler onMapClick={(latlng) => {
         setLocationForm(f => ({
           ...f,
           latitude: latlng.lat.toFixed(6),
           longitude: latlng.lng.toFixed(6),
         }));
       }} />
       {locationForm.latitude && locationForm.longitude && (
         <>
           <Marker position={[parseFloat(locationForm.latitude), parseFloat(locationForm.longitude)]} />
           <Circle
             center={[parseFloat(locationForm.latitude), parseFloat(locationForm.longitude)]}
             radius={parseInt(locationForm.radiusMeters) || 100}
             pathOptions={{ color: '#0047AB', fillColor: '#0047AB', fillOpacity: 0.12, weight: 2, dashArray: '6 4' }}
           />
         </>
       )}
     </MapContainer>

     {/* Map overlay hint */}
     <div style={{
       position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
       background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, fontWeight: 700,
       padding: '5px 14px', borderRadius: 99, zIndex: 999, whiteSpace: 'nowrap',
       backdropFilter: 'blur(4px)', pointerEvents: 'none',
     }}>
       Klik pada peta untuk memilih lokasi kantor
     </div>

     {/* Use My Location button */}
     <button
       onClick={() => {
         if (navigator.geolocation) {
           navigator.geolocation.getCurrentPosition(pos => {
             setLocationForm(f => ({
               ...f,
               latitude: pos.coords.latitude.toFixed(6),
               longitude: pos.coords.longitude.toFixed(6),
             }));
           }, () => alert('Tidak dapat mengakses lokasi. Pastikan izin lokasi aktif.'));
         }
       }}
       style={{
         position: 'absolute', top: 10, right: 10, zIndex: 999,
         background: '#fff', border: '1.5px solid var(--border)',
         borderRadius: 10, padding: '7px 13px', fontSize: 12, fontWeight: 700,
         color: 'var(--primary)', cursor: 'pointer', display: 'flex',
         alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-md)',
         fontFamily: 'inherit',
       }}
     >
       <FiNavigation size={13} /> Lokasi Saya
     </button>
   </div>

   {/* Form fields below map */}
   <div style={{ padding: '20px 24px' }}>
     <div className="form-group" style={{ marginBottom: 16 }}>
       <label className="form-label">Nama Lokasi</label>
       <input
         className="form-input"
         placeholder="Contoh: Kantor Pusat Jakarta"
         value={locationForm.name}
         onChange={e => setLocationForm({ ...locationForm, name: e.target.value })}
       />
     </div>

     {/* Koordinat — read from map, editable manual */}
     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
       <div className="form-group" style={{ marginBottom: 0 }}>
         <label className="form-label">Latitude</label>
         <input
           type="number" step="0.000001" className="form-input"
           value={locationForm.latitude}
           onChange={e => setLocationForm({ ...locationForm, latitude: e.target.value })}
           placeholder="-6.208800"
         />
       </div>
       <div className="form-group" style={{ marginBottom: 0 }}>
         <label className="form-label">Longitude</label>
         <input
           type="number" step="0.000001" className="form-input"
           value={locationForm.longitude}
           onChange={e => setLocationForm({ ...locationForm, longitude: e.target.value })}
           placeholder="106.845600"
         />
       </div>
     </div>

     {/* Radius slider */}
     <div className="form-group" style={{ marginBottom: 0 }}>
       <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
         <span>Radius Geofence</span>
         <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{locationForm.radiusMeters} meter</span>
       </label>
       <input
         type="range" min="50" max="1000" step="10"
         value={locationForm.radiusMeters}
         onChange={e => setLocationForm({ ...locationForm, radiusMeters: e.target.value })}
         style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer', marginBottom: 6 }}
       />
       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
         <span>50m (Ketat)</span>
         <span>Karyawan harus clock-in dari dalam area ini</span>
         <span>1km (Longgar)</span>
       </div>
     </div>
   </div>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={closeModal}>Batal</button>
 <button className="btn-primary" onClick={saveSettings}>
   <FiMapPin size={14} /> Simpan Lokasi
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
