import { useState, useEffect, useCallback, useRef } from 'react';
import { FiEye, FiX, FiMapPin, FiSettings, FiCheck, FiAlertTriangle, FiShield, FiAlertCircle, FiNavigation } from 'react-icons/fi';
import { MapPin, Check, AlertTriangle, Shield, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as attendanceService from '../services/attendanceService';
import { supabase } from '../lib/supabase';
import BranchFilter from '../components/BranchFilter';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import FormDateField from '../components/FormDateField';
import MetricStatCards from '../components/MetricStatCards';

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

const DEFAULT_CENTER = [-6.2088, 106.8456]; // Jakarta fallback

function pinIcon(color) {
  return L.divIcon({
    className: 'geo-pin',
    html: `<span style="
      display:block;width:12px;height:12px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.25);
    "></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

const officeIcon = L.divIcon({
  className: 'geo-office-pin',
  html: `<span style="
    display:block;width:16px;height:16px;border-radius:50%;
    background:#5654D4;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(86,84,212,.4);
  "></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/** Compact Leaflet map: office radius + clock-in points */
function OfficeRadiusMap({ office, logs = [], inRadius = 0, outRadius = 0, onOpenSettings, onSelectLog }) {
  const lat = office?.latitude != null ? Number(office.latitude) : null;
  const lng = office?.longitude != null ? Number(office.longitude) : null;
  const hasOffice = Number.isFinite(lat) && Number.isFinite(lng);
  const radius = Number(office?.radius_meters) || 100;
  const center = hasOffice ? [lat, lng] : DEFAULT_CENTER;

  const clockPins = logs.filter(
    (l) => Number.isFinite(Number(l.latitude)) && Number.isFinite(Number(l.longitude)),
  );

  return (
    <div className="chart-card geo-zone-card mb">
      <div className="geo-zone-header">
        <div>
          <div className="chart-card-title" style={{ marginBottom: 2 }}>Office Radius Zone</div>
          <div className="td-muted-sm">
            {office?.name || 'Kantor Utama'}
            {hasOffice
              ? ` · ${lat.toFixed(5)}, ${lng.toFixed(5)} · radius ${radius}m`
              : ' · Lokasi belum diatur'}
          </div>
        </div>
        <div className="geo-zone-legend">
          <span className="geo-legend-item">
            <span className="geo-dot geo-dot--in" /> In Zone ({inRadius})
          </span>
          <span className="geo-legend-item">
            <span className="geo-dot geo-dot--out" /> Out of Zone ({outRadius})
          </span>
        </div>
      </div>

      <div className="geo-zone-map-wrap">
        {!hasOffice ? (
          <div className="geo-zone-empty">
            <FiMapPin size={22} style={{ opacity: 0.5 }} />
            <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8 }}>Lokasi kantor belum diset</div>
            <div className="td-muted-sm" style={{ marginBottom: 12, textAlign: 'center', maxWidth: 280 }}>
              Atur koordinat & radius agar zona geofence tampil di peta.
            </div>
            <button type="button" className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={onOpenSettings}>
              Atur Office Location
            </button>
          </div>
        ) : (
          <MapContainer
            key={`zone-${lat}-${lng}-${radius}-${filterDateKey(logs)}`}
            center={center}
            zoom={radius > 300 ? 15 : 16}
            className="geo-zone-map"
            scrollWheelZoom={false}
            dragging
            zoomControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Circle
              center={center}
              radius={radius}
              pathOptions={{
                color: '#5654D4',
                fillColor: '#5654D4',
                fillOpacity: 0.12,
                weight: 2,
                dashArray: '6 4',
              }}
            />
            <Marker position={center} icon={officeIcon} title={office?.name || 'Kantor'} />
            {clockPins.map((l) => (
              <Marker
                key={l.id}
                position={[Number(l.latitude), Number(l.longitude)]}
                icon={pinIcon(l.in_radius ? '#16A34A' : '#DC2626')}
                eventHandlers={{
                  click: () => onSelectLog?.(l),
                }}
                title={l.employees?.name || 'Clock-in'}
              />
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}

function filterDateKey(logs) {
  return `${logs.length}-${logs[0]?.id || 0}-${logs[logs.length - 1]?.id || 0}`;
}

function TrustScoreBadge({ score, level }) {
  if (score === undefined || score === null) return <span style={{ color: 'var(--muted)', fontSize: 11 }}>-</span>;
  const colors = {
    trusted: { bg: '#F0FDF4', color: '#16A34A' },
    warning: { bg: '#FFFBEB', color: '#D97706' },
    rejected: { bg: '#FEF2F2', color: '#DC2626' },
  };
  const s = colors[level] || colors.trusted;
  return (
    <span style={{ padding: '3px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      <FiShield style={{ marginRight: 3, verticalAlign: 'middle' }} size={10} />{score}
    </span>
  );
}

export default function GeofenceAttendance() {
 const { toast } = useToast();
 const toastRef = useRef(toast);
 useEffect(() => { toastRef.current = toast; }, [toast]);
 const [logs, setLogs] = useState([]);
 const [locations, setLocations] = useState([]);
 const [, setLoading] = useState(true);
 const [modal, setModal] = useState(null);
 const [selected, setSelected] = useState(null);
 const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
 const [locationForm, setLocationForm] = useState({ name: '', latitude: '', longitude: '', radiusMeters: 100 });

 const { selectedBranchId } = useBranch();
  const { employee } = useAuth();

 const fetchData = useCallback(async () => {
 setLoading(true);
 if (!employee?.company_id) {
  setLogs([]);
  setLocations([]);
  setLoading(false);
  return;
 }
 try {
 const { data: attData, error: attError } = await attendanceService.getAttendanceByDate(
  filterDate,
  selectedBranchId,
  employee.company_id,
 );
 if (attError) throw attError;
 const { data: locData, error: locError } = await attendanceService.getOfficeLocations(employee.company_id);
 if (locError) throw locError;
 setLogs(attData || []);
 setLocations(locData || []);
 } catch (e) {
  console.error('[Geofence] fetch failed:', e?.message || e);
  toastRef.current.error('Gagal memuat data geofence. Coba muat ulang.');
 } finally {
 setLoading(false);
 }
 }, [filterDate, selectedBranchId, employee]);

 useEffect(() => { fetchData(); }, [fetchData]);

 const inRadius = logs.filter(l => l.in_radius).length;
 const outRadius = logs.filter(l => !l.in_radius).length;
 const faceVerifiedCount = logs.filter(l => l.face_verified).length;
 const suspiciousCount = logs.filter(l => l.trust_level === 'warning' || l.trust_level === 'rejected').length;

 const metricItems = [
 { key: 'total', label: 'Total Clock-In', value: logs.length, icon: MapPin },
 { key: 'in', label: 'Dalam Radius', value: inRadius, icon: Check },
 { key: 'out', label: 'Di Luar Radius', value: outRadius, icon: AlertTriangle },
 { key: 'face', label: 'Face Verified', value: faceVerifiedCount, icon: Shield },
 { key: 'suspicious', label: 'Suspicious', value: suspiciousCount, icon: AlertCircle },
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
 await supabase.from('office_locations').update(payload).eq('id', locations[0].id).eq('company_id', employee?.company_id);
 } else {
 await supabase.from('office_locations').insert({ ...payload, company_id: employee?.company_id });
 }
 fetchData();
 closeModal();
 };

 return (
 <div className="admin-page">
 <div className="page-header">
 <h1>Geofencing & Liveness Detection</h1>
 <div className="page-header-actions">
 <BranchFilter />
 <button className="btn-secondary" onClick={openSettings} aria-label="Office location"><FiSettings /> Office Location</button>
 </div>
 </div>

 <MetricStatCards items={metricItems} />

 {/* Office radius — real map (compact + responsive) */}
 <OfficeRadiusMap
   office={locations[0]}
   logs={logs}
   inRadius={inRadius}
   outRadius={outRadius}
   onOpenSettings={openSettings}
   onSelectLog={openDetail}
 />

 {/* Filters */}
 <div className="filters-bar">
 <div style={{ maxWidth: 220 }}><FormDateField value={filterDate} onChange={setFilterDate} placeholder="Filter tanggal" /></div>
 </div>

 {/* Table */}
 <div className="data-table-card">
 <div className="table-responsive">
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
 <td className="td-semibold">{l.employees?.name || '-'}</td>
 <td>{l.clock_in || '-'}</td>
 <td className="td-mono-bold" style={{ fontSize: 12 }}>
 {l.latitude ? `${Number(l.latitude).toFixed(4)}, ${Number(l.longitude).toFixed(4)}` : '�'}
 </td>
 <td>
 <span className={`status-badge ${l.in_radius ? 'active' : 'inactive'}`}>
 {l.in_radius ? 'In Zone' : 'Out of Zone'}
 </span>
 </td>
 <td>
 <span className={`status-badge ${l.face_verified ? 'approved' : 'pending'}`}>
 {l.face_verified ? 'Verified' : 'Selfie'}
 </span>
 </td>
 <td><TrustScoreBadge score={l.trust_score} level={l.trust_level} /></td>
 <td><button className="action-btn" onClick={() => openDetail(l)} aria-label="Lihat detail"><FiEye /></button></td>
 </tr>
 ))}
 {logs.length === 0 && (
 <tr><td colSpan={7} style={{ padding: 0, border: 'none' }}>
  <EmptyState
    title="Tidak ada data untuk tanggal ini"
    description="Clock-in dalam radius geofence akan muncul di sini."
    ctaLabel="Muat ulang"
    onCta={fetchData}
    secondaryLabel="Atur lokasi kantor"
    onSecondary={openSettings}
    size="sm"
  />
 </td></tr>
 )}
 </tbody>
 </table>
 </div>
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
 <label className="form-label">Karyawan</label>
 <div className="td-semibold">{selected.employees?.name || '�'}</div>
 </div>
 <div className="form-group">
 <label className="form-label">Clock-In</label>
 <div className="td-semibold">{selected.clock_in}</div>
 </div>
 <div className="form-group">
 <label className="form-label">Latitude</label>
 <div className="td-mono-bold">{selected.latitude}</div>
 </div>
 <div className="form-group">
 <label className="form-label">Longitude</label>
 <div className="td-mono-bold">{selected.longitude}</div>
 </div>
 <div className="form-group">
 <label className="form-label">Dalam Radius?</label>
 <span className={`status-badge ${selected.in_radius ? 'active' : 'inactive'}`}>
 {selected.in_radius ? 'Dalam zona kantor' : 'Di luar zona kantor'}
 </span>
 </div>
 <div className="form-group">
 <label className="form-label" style={{ color: 'var(--muted)' }}>Face ID</label>
 <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: selected.face_verified ? '#7C3AED' : '#F59E0B', background: selected.face_verified ? '#F5F3FF' : '#FFFBEB', display: 'inline-block' }}>
 {selected.face_verified ? `Face Verified (${selected.face_confidence ? Math.round(selected.face_confidence) + '%' : '-'})` : 'Selfie Only'}
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

 {/* Office Location Settings Modal - with Interactive Mini-Map */}
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
             pathOptions={{ color: '#635BFF', fillColor: '#635BFF', fillOpacity: 0.12, weight: 2, dashArray: '6 4' }}
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
           }, () => {
             console.error('[Geofence] Location access denied');
             toastRef.current.error('Akses lokasi ditolak. Isi koordinat manual.');
           });
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

     {/* Koordinat - read from map, editable manual */}
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
         <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{locationForm.radiusMeters} meter</span>
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
 <button className="btn-primary" onClick={saveSettings} aria-label="Simpan lokasi"><FiMapPin size={14} /> Simpan Lokasi
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}


