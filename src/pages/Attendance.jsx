import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../lib/i18n';
import { FiClock, FiMapPin, FiCamera, FiCheckCircle, FiDownload, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import * as attendanceService from '../services/attendanceService';
import { exportToExcel, formatAttendanceForExport } from '../lib/excelExport';
import BranchFilter from '../components/BranchFilter';
import { useBranch } from '../context/BranchContext';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

export default function Attendance() {
  const { t } = useTranslation();
  const { employee } = useAuth();
  const [clockedIn, setClockedIn] = useState(false);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myTodayAttendance, setMyTodayAttendance] = useState(null);
  // GPS state: 'idle' | 'loading' | 'ok' | 'denied'
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsCoords, setGpsCoords] = useState(null);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const { selectedBranchId } = useBranch();

  // Request GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsStatus('ok');
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Admin view: show all today attendance
      const { data: allAtt } = await attendanceService.getAllAttendanceToday(selectedBranchId, employee?.company_id);
      if (allAtt && allAtt.length > 0) {
        setTodayLogs(allAtt);
      }
      // My attendance
      if (employee) {
        const { data: myAtt } = await attendanceService.getTodayAttendance(employee.id);
        if (myAtt) {
          setMyTodayAttendance(myAtt);
          setClockedIn(!!myAtt.clock_in && !myAtt.clock_out);
        }
      }
    } catch (e) {
      console.error('Attendance fetch error:', e);
    }
    setLoading(false);
  }, [employee, selectedBranchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: auto-refresh on attendance changes
  useRealtimeTable('attendance', fetchData);

  const handleClockToggle = async () => {
    if (!employee) return;

    if (!clockedIn && !myTodayAttendance?.clock_in) {
      // Use real GPS if available, otherwise fall back gracefully
      const lat = gpsCoords?.lat ?? null;
      const lng = gpsCoords?.lng ?? null;
      const inRadius = gpsStatus === 'ok'; // Only mark in-radius if GPS confirmed

      const { error } = await attendanceService.clockIn(employee.id, {
        latitude: lat,
        longitude: lng,
        inRadius,
        locationId: employee?.branch_id || 1,
      });
      if (!error) fetchData();
    } else if (clockedIn) {
      const { error } = await attendanceService.clockOut(myTodayAttendance.id);
      if (!error) fetchData();
    }
  };

  // GPS status indicator config
  const gpsIndicator = {
    idle:    { icon: <FiMapPin />,      color: 'var(--muted)',    label: 'GPS Menunggu' },
    loading: { icon: <FiLoader />,      color: '#F59E0B',         label: 'GPS Loading...' },
    ok:      { icon: <FiMapPin />,      color: 'var(--success)',  label: 'GPS Aktif' },
    denied:  { icon: <FiAlertCircle />, color: 'var(--danger)',   label: 'GPS Tidak Aktif' },
  }[gpsStatus];

  if (loading && !todayLogs.length) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>{t('attendance.title')}</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <BranchFilter />
          <button
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => exportToExcel(formatAttendanceForExport(todayLogs), `Absensi_${new Date().toISOString().split('T')[0]}.xlsx`)}
          >
            <FiDownload /> Export Excel
          </button>
        </div>
      </div>

      {/* Clock In/Out Widget */}
      <div className="info-card" style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>{timeStr}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Waktu saat ini</div>
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {!myTodayAttendance?.clock_out ? (
            <button
              className={clockedIn ? 'btn-danger' : 'btn-primary'}
              style={{ padding: '14px 32px', fontSize: 14 }}
              onClick={handleClockToggle}
            >
              <FiClock /> {clockedIn ? 'Clock Out' : 'Clock In'}
            </button>
          ) : (
            <div style={{ padding: '14px 32px', background: 'var(--bg-secondary)', borderRadius: 8, color: 'var(--muted)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiCheckCircle /> Absensi Selesai
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
            {/* Real GPS status indicator */}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: gpsIndicator.color }}>
              {gpsIndicator.icon} {gpsIndicator.label}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
              <FiCamera /> Selfie Ready
            </span>
          </div>
          {gpsStatus === 'denied' && (
            <div style={{ width: '100%', fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.06)', padding: '6px 10px', borderRadius: 6 }}>
              GPS tidak tersedia. Clock-in akan dicatat tanpa validasi lokasi.
            </div>
          )}
        </div>
        {myTodayAttendance?.clock_in && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontWeight: 600, fontSize: 14 }}>
            <FiCheckCircle /> Sudah Clock In pukul {myTodayAttendance.clock_in}
          </div>
        )}
      </div>

      {/* Attendance Log */}
      <div className="data-table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Log Kehadiran Hari Ini ({todayLogs.length} entries)</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Status</th>
                <th>Lokasi</th>
              </tr>
            </thead>
            <tbody>
              {todayLogs.map((att) => {
                const empName = att.employees?.name || employee?.name || '—';
                const empDiv = att.employees?.division || employee?.division || '';
                return (
                  <tr key={att.id}>
                    <td>
                      <div className="employee-cell">
                        <div className="employee-avatar">{empName.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                        <div>
                          <div className="employee-name">{empName}</div>
                          <div className="employee-dept">{empDiv}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{att.clock_in || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{att.clock_out || '-'}</td>
                    <td>
                      <span className={`status-badge ${att.status}`}>
                        {att.status === 'present' ? 'Hadir' : att.status === 'late' ? 'Terlambat' : att.status === 'leave' ? 'Cuti' : 'Tidak Hadir'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{att.location || '-'}</td>
                  </tr>
                );
              })}
              {todayLogs.length === 0 && (
                <tr><td colSpan={5} className="empty-state">Belum ada data kehadiran hari ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
