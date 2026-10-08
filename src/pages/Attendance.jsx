import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../lib/i18n';
import { FiClock, FiMapPin, FiCamera, FiCheckCircle, FiDownload, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import * as attendanceService from '../services/attendanceService';
import { exportToExcel, formatAttendanceForExport } from '../lib/excelExport';
import { toLocalDateKey } from '../lib/dateFormat';
import BranchFilter from '../components/BranchFilter';
import { useBranch } from '../context/BranchContext';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

export default function Attendance() {
  const { t } = useTranslation();
  const { employee } = useAuth();
  const [clockedIn, setClockedIn] = useState(false);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myTodayAttendance, setMyTodayAttendance] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsCoords, setGpsCoords] = useState(null);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const { selectedBranchId } = useBranch();

  useEffect(() => {
    if (!navigator.geolocation) { setGpsStatus('denied'); return; }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsStatus('ok');
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: allAtt } = await attendanceService.getAllAttendanceToday(selectedBranchId, employee?.company_id);
      if (allAtt && allAtt.length > 0) setTodayLogs(allAtt);
      if (employee) {
        const { data: myAtt } = await attendanceService.getTodayAttendance(employee.id);
        if (myAtt) { setMyTodayAttendance(myAtt); setClockedIn(!!myAtt.clock_in && !myAtt.clock_out); }
      }
    } catch (e) { console.error('Attendance fetch error:', e); }
    setLoading(false);
  }, [employee, selectedBranchId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeTable('attendance', fetchData, { companyId: employee?.company_id, enabled: !!employee?.company_id });

  const handleClockToggle = async () => {
    if (!employee) return;
    if (!clockedIn && !myTodayAttendance?.clock_in) {
      const { error } = await attendanceService.clockIn(employee.id, {
        latitude: gpsCoords?.lat ?? null,
        longitude: gpsCoords?.lng ?? null,
        inRadius: gpsStatus === 'ok',
        locationId: employee?.branch_id || 1,
      });
      if (!error) fetchData();
    } else if (clockedIn) {
      const { error } = await attendanceService.clockOut(myTodayAttendance.id, employee.id);
      if (!error) fetchData();
    }
  };

  const gpsIndicator = {
    idle:    { icon: <FiMapPin />,      color: 'var(--text-secondary)', label: 'GPS Menunggu' },
    loading: { icon: <FiLoader />,      color: '#F59E0B',               label: 'GPS Loading...' },
    ok:      { icon: <FiMapPin />,      color: 'var(--success)',        label: 'GPS Aktif' },
    denied:  { icon: <FiAlertCircle />, color: 'var(--danger)',         label: 'GPS Tidak Aktif' },
  }[gpsStatus];

  if (loading && !todayLogs.length) return <div className="loading-fallback"><PageSkeleton tableRows={5} tableCols={5} /></div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>{t('attendance.title')}</h1>
        <div className="page-header-actions">
          <BranchFilter />
          <Button
            type="button"
            variant="outline"
            className="btn-header-export"
            onClick={() => exportToExcel(formatAttendanceForExport(todayLogs), `Absensi_${toLocalDateKey()}.xlsx`)}
          >
            <FiDownload /> Export Excel
          </Button>
        </div>
      </div>

      {/* Clock In/Out Widget */}
      <div className="info-card attendance-widget">
        <div className="attendance-time-col">
          <div className="attendance-time">{timeStr}</div>
          <div className="attendance-time-label">Waktu saat ini</div>
        </div>
        <div className="attendance-actions-col">
          {!myTodayAttendance?.clock_out ? (
            <Button variant={clockedIn ? 'destructive' : 'default'} size="lg" onClick={handleClockToggle}>
              <FiClock /> {clockedIn ? 'Clock Out' : 'Clock In'}
            </Button>
          ) : (
            <div className="attendance-done-badge">
              <FiCheckCircle /> Absensi Selesai
            </div>
          )}
          <div className="attendance-indicators">
            <span className="attendance-gps-indicator" style={{ color: gpsIndicator.color }}>
              {gpsIndicator.icon} {gpsIndicator.label}
            </span>
            <span className="attendance-indicator-item">
              <FiCamera /> Selfie Ready
            </span>
          </div>
          {gpsStatus === 'denied' && (
            <div className="attendance-gps-warning">
              GPS tidak tersedia. Clock-in akan dicatat tanpa validasi lokasi.
            </div>
          )}
        </div>
        {myTodayAttendance?.clock_in && (
          <div className="attendance-checkin-notice">
            <FiCheckCircle /> Sudah Clock In pukul {myTodayAttendance.clock_in}
          </div>
        )}
      </div>

      {/* Attendance Log */}
      <div className="data-table-card">
        <div className="data-table-header">
          <span className="section-label">Log Kehadiran Hari Ini ({todayLogs.length} entries)</span>
        </div>
        <div className="table-responsive">
          <Table>
            <TableHeader>
              <TableRow>
            
              <tr>
                                <TableHead>Karyawan</TableHead>
                                <TableHead>Clock In</TableHead>
                                <TableHead>Clock Out</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Lokasi</TableHead>
              </tr>
            
                          </TableRow>
            </TableHeader>
            <TableBody>
              {todayLogs.map((att) => {
                const empName = att.employees?.name || employee?.name || '-';
                const empDiv  = att.employees?.division || employee?.division || '';
                return (
              <TableRow key={att.id}>
                <TableCell>
                  <div className="employee-cell">
                        <div className="employee-avatar">{empName.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                        <div>
                          <div className="employee-name">{empName}</div>
                          <div className="employee-dept">{empDiv}</div>
                        </div>
                  </div>
                </TableCell>
                <TableCell className="td-mono-bold">{att.clock_in || '-'}</TableCell>
                <TableCell className="td-mono-bold">{att.clock_out || '-'}</TableCell>
                <TableCell>
                  <span className={`status-badge ${att.status}`}>
                        {att.status === 'present' ? 'Hadir' : att.status === 'late' ? 'Terlambat' : att.status === 'leave' ? 'Cuti' : 'Tidak Hadir'}
                  </span>
                </TableCell>
                <TableCell className="td-muted-sm">{att.location || '-'}</TableCell>
              </TableRow>
                );
              })}
              {todayLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} style={{ padding: 0, border: 'none' }}>
                    <EmptyState
                      title="Belum ada kehadiran hari ini"
                      description="Clock-in karyawan dari PWA akan muncul di sini secara realtime."
                      ctaLabel="Muat ulang"
                      onCta={fetchData}
                      size="sm"
                    />
                  </TableCell>
                </TableRow>
              )}
                        </TableBody>
          </Table>
          
        </div>
      </div>
    </div>
  );
}
