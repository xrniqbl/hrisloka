import { useState, useRef, useCallback, useEffect } from 'react';
import { FiMapPin, FiCamera, FiCheck, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { clockIn as serviceClockIn, getOfficeLocations, getAttendanceHistory } from '../../services/attendanceService';
import './EmpAbsen.css';

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function EmpAbsen() {
    const { user } = useAuth();
    const [emp, setEmp] = useState(null);
    const [office, setOffice] = useState(null);
    const [history, setHistory] = useState([]);
    const [pageLoading, setPageLoading] = useState(true);

    const [step, setStep] = useState('location');
    const [location, setLocation] = useState(null);
    const [locError, setLocError] = useState('');
    const [locLoading, setLocLoading] = useState(false);
    const [selfieData, setSelfieData] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);

    // Load employee + office data
    useEffect(() => {
        async function load() {
            const email = user?.email || user?.user_metadata?.email || 'ahmad.rizky@company.com';
            const { data: empData } = await getEmployeeByEmail(email);
            if (empData) {
                setEmp(empData);
                const { data: hist } = await getAttendanceHistory(empData.id, 7);
                setHistory(hist);
            }
            const { data: locs } = await getOfficeLocations();
            if (locs?.length) setOffice(locs[0]);
            setPageLoading(false);
        }
        load();
    }, [user]);

    const inRadius = location && office ? getDistance(location.lat, location.lng, parseFloat(office.latitude), parseFloat(office.longitude)) <= office.radius_meters : false;
    const distance = location && office ? Math.round(getDistance(location.lat, location.lng, parseFloat(office.latitude), parseFloat(office.longitude))) : null;

    const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    const requestLocation = () => {
        setLocLoading(true);
        setLocError('');
        if (!navigator.geolocation) {
            setLocError('Geolocation tidak didukung oleh browser ini.');
            setLocLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
                setLocLoading(false);
            },
            (err) => {
                setLocError(err.code === 1 ? 'Akses lokasi ditolak. Aktifkan GPS dan izinkan akses.' : 'Gagal mendapatkan lokasi. Coba lagi.');
                setLocLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const startCamera = async () => {
        setCameraError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setCameraActive(true);
        } catch {
            setCameraError('Akses kamera ditolak. Izinkan akses kamera untuk selfie absensi.');
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        setSelfieData(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
    };

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    }, []);

    const retakeSelfie = () => { setSelfieData(null); startCamera(); };

    useEffect(() => { return () => stopCamera(); }, [stopCamera]);

    // Submit clock-in to Supabase
    const handleConfirm = async () => {
        if (!emp || !location) return;
        setSubmitLoading(true);
        await serviceClockIn(emp.id, {
            latitude: location.lat,
            longitude: location.lng,
            inRadius,
            selfieVerified: !!selfieData,
            locationId: office?.id || 1,
        });
        setSubmitLoading(false);
        setStep('done');
    };

    if (pageLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
                <FiLoader size={28} style={{ animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>Memuat data...</span>
            </div>
        );
    }

    return (
        <div className="absen-page">
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Absensi Hari Ini</h1>

            {/* Step Indicator */}
            <div className="absen-steps">
                {['Lokasi', 'Selfie', 'Konfirmasi'].map((label, i) => {
                    const stepNames = ['location', 'selfie', 'confirm'];
                    const stepIdx = stepNames.indexOf(step);
                    const isDone = step === 'done' || i < stepIdx;
                    const isActive = i === stepIdx;
                    return (
                        <div key={label} className={`absen-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                            <div className="absen-step-circle">{isDone ? <FiCheck size={14} /> : i + 1}</div>
                            <span className="absen-step-label">{label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Step 1: Location */}
            {step === 'location' && (
                <div className="absen-card">
                    <div className="absen-card-icon" style={{ background: '#EFF6FF', color: 'var(--primary)' }}><FiMapPin size={28} /></div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Verifikasi Lokasi</h2>
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                        Pastikan Anda berada di area kantor ({office?.name || 'Kantor'}, radius {office?.radius_meters || 100}m)
                    </p>
                    {!location && !locLoading && <button className="absen-action-btn" onClick={requestLocation}><FiMapPin /> Ambil Lokasi Saya</button>}
                    {locLoading && <div className="absen-loading"><div className="absen-spinner" /><span>Mendapatkan lokasi GPS...</span></div>}
                    {locError && <div className="absen-alert danger"><FiAlertTriangle /> {locError}<button className="absen-retry" onClick={requestLocation}>Coba Lagi</button></div>}
                    {location && (
                        <div className="absen-result">
                            <div className="absen-coord">
                                <span>Lat: {location.lat.toFixed(6)}</span>
                                <span>Lng: {location.lng.toFixed(6)}</span>
                                <span>Akurasi: ±{Math.round(location.accuracy)}m</span>
                            </div>
                            <div className={`absen-radius-badge ${inRadius ? 'in' : 'out'}`}>
                                {inRadius ? <><FiCheck /> Dalam Radius ({distance}m)</> : <><FiAlertTriangle /> Di Luar Radius ({distance}m)</>}
                            </div>
                            <button className="absen-action-btn" onClick={() => { setStep('selfie'); startCamera(); }} style={{ marginTop: 16 }}>Lanjut ke Selfie →</button>
                        </div>
                    )}
                </div>
            )}

            {/* Step 2: Selfie */}
            {step === 'selfie' && (
                <div className="absen-card">
                    <div className="absen-card-icon" style={{ background: '#FFF7ED', color: 'var(--warning)' }}><FiCamera size={28} /></div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Selfie Verifikasi</h2>
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Ambil selfie untuk verifikasi kehadiran</p>
                    {cameraError && <div className="absen-alert danger"><FiAlertTriangle /> {cameraError}</div>}
                    <div className="selfie-container">
                        {!selfieData ? (
                            <>
                                <video ref={videoRef} className="selfie-video" playsInline muted />
                                <canvas ref={canvasRef} style={{ display: 'none' }} />
                                {cameraActive && <button className="selfie-capture-btn" onClick={capturePhoto}><div className="selfie-capture-ring" /></button>}
                                {!cameraActive && !cameraError && <button className="absen-action-btn" onClick={startCamera}><FiCamera /> Buka Kamera</button>}
                            </>
                        ) : (
                            <>
                                <img src={selfieData} alt="Selfie" className="selfie-preview" />
                                <div style={{ display: 'flex', gap: 10, marginTop: 12, width: '100%' }}>
                                    <button className="btn-secondary" style={{ flex: 1, padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontWeight: 600 }} onClick={retakeSelfie}>Ulangi</button>
                                    <button className="absen-action-btn" style={{ flex: 1 }} onClick={() => setStep('confirm')}>Lanjut →</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && (
                <div className="absen-card">
                    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Konfirmasi Clock-In</h2>
                    <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                        {[
                            ['Karyawan', emp?.name],
                            ['Waktu', new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })],
                        ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--muted)', fontSize: 13 }}>{k}</span>
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{v}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Lokasi</span>
                            <span className={`absen-radius-badge ${inRadius ? 'in' : 'out'}`} style={{ fontSize: 11 }}>{inRadius ? '✓ Dalam Radius' : '⚠ Di Luar'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Selfie</span>
                            <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: 13 }}>✓ Terverifikasi</span>
                        </div>
                    </div>
                    {selfieData && <img src={selfieData} alt="Selfie" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', margin: '0 auto 16px', display: 'block' }} />}
                    <button className="absen-action-btn success" onClick={handleConfirm} disabled={submitLoading} style={{ width: '100%' }}>
                        {submitLoading ? 'Mengirim...' : <><FiCheck /> Konfirmasi Clock-In</>}
                    </button>
                </div>
            )}

            {/* Step 4: Done */}
            {step === 'done' && (
                <div className="absen-card" style={{ textAlign: 'center' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <FiCheck size={32} color="#16A34A" />
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)', marginBottom: 6 }}>Clock-In Berhasil! ✅</h2>
                    <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 6 }}>Data sudah tersimpan di database.</p>
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                        {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} — {emp?.name}
                    </p>
                    <button className="absen-action-btn" onClick={() => { setStep('location'); setLocation(null); setSelfieData(null); }}>Kembali</button>
                </div>
            )}

            {/* History */}
            <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Riwayat Terbaru</div>
                {history.length > 0 ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                        {history.slice(0, 5).map(h => (
                            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 13 }}>
                                <span style={{ fontWeight: 600 }}>{h.date}</span>
                                <span style={{ color: 'var(--muted)' }}>{h.clock_in || '—'} — {h.clock_out || 'Belum'}</span>
                                <span style={{ color: h.in_radius ? 'var(--success)' : 'var(--danger)', fontSize: 11, fontWeight: 600 }}>
                                    {h.in_radius ? '✓' : '✗'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                        {weekDays.map((d, i) => (
                            <div key={d} style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>{d}</div>
                                <div style={{ fontSize: 14 }}>—</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
