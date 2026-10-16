import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { useRealtimeMultiple } from '../hooks/useRealtime';
import { useTranslation } from '../lib/i18n';
import * as employeeService from '../services/employeeService';
import * as attendanceService from '../services/attendanceService';
import * as leaveService from '../services/leaveService';
import * as overtimeService from '../services/overtimeService';
import * as billingService from '../services/billingService';
import * as reimbursementService from '../services/reimbursementService';
import * as jobService from '../services/jobService';
import * as trainingService from '../services/trainingService';
import * as projectService from '../services/projectService';
import BranchFilter from '../components/BranchFilter';
import UserAvatar from '../components/UserAvatar';
import { useToast } from '../components/Toast';
import {
  KPICards, ActivityTimeline,
  PendingApprovals, EmployeeDirectory, UpcomingEvents, EmployeeSlideOver,
  ChartsSection, BillingSection, RecentEmployeesTable, WidgetSettings, NotificationBoardV2,
} from '../components/dashboard';
import TimeOffCard from '../components/dashboard/TimeOffCard';
import RunningProjectCard from '../components/dashboard/RunningProjectCard';
import MeetingsCard from '../components/dashboard/MeetingsCard';
import MyTaskCard from '../components/dashboard/MyTaskCard';
import EmployeeCard from '../components/dashboard/EmployeeCard';
import './DashboardV2.css';

export default function Dashboard() {
  const { employee: currentUser, user, employee, subscription } = useAuth();
  const { selectedBranchId } = useBranch();
  const navigate = useNavigate();
  const companyId = employee?.company_id;

  // State
  const [employees, setEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [overtimeRecords, setOvertimeRecords] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [jobPostings, setJobPostings] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [demoTab, setDemoTab] = useState('status');
  const [trendData, setTrendData] = useState({ labels: [], datasets: [] });

  // Widget visibility
  const [widgets, setWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem('hrisync_dashboard_widgets');
      return saved ? JSON.parse(saved) : { trend: true, demographics: true, headcount: true, division: true };
    } catch { return { trend: true, demographics: true, headcount: true, division: true }; }
  });

  const toggleWidget = useCallback((key) => {
    setWidgets(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('hrisync_dashboard_widgets', JSON.stringify(next));
      return next;
    });
  }, []);

  // Main data fetch
  const fetchData = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [empRes, attRes, leaveRes, otRes, reimbRes, jobRes, trainRes, projRes] = await Promise.all([
        employeeService.getAllEmployees(selectedBranchId, companyId),
        attendanceService.getAllAttendanceToday(selectedBranchId, companyId),
        leaveService.getAllLeaves(selectedBranchId, companyId),
        overtimeService.getAllOvertime(selectedBranchId, companyId),
        reimbursementService.getAllReimbursements(companyId),
        jobService.getOpenJobs(companyId),
        trainingService.getAllTrainings(companyId),
        projectService.getAllProjects(companyId),
      ]);
      setEmployees(empRes.data || []);
      setTodayAttendance(attRes.data || []);
      setLeaves(leaveRes.data || []);
      setOvertimeRecords(otRes.data || []);
      setReimbursements(reimbRes.data || []);
      setJobPostings(jobRes.data || []);
      setTrainings(trainRes.data || []);
      setProjects(projRes.data || []);
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);
    }
    setLoading(false);
  }, [companyId, selectedBranchId]);

  // Billing: prefer billing_info, else real subscription (never fake Pro)
  useEffect(() => {
    if (!user?.id) return;
    billingService
      .getBillingForUser(user.id, subscription)
      .then(({ data }) => setBilling(data))
      .catch((e) => {
        console.warn('[Dashboard] billing fetch failed:', e?.message);
        setBilling(
          billingService.billingFromSubscription(subscription) ||
            billingService.getDefaultBillingInfo(),
        );
      });
  }, [user?.id, subscription]);

  // Attendance trend fetch
  useEffect(() => {
    if (!companyId) return;
    attendanceService.getAttendanceSummary30Days(companyId, selectedBranchId).then(({ data }) => {
      if (!data) return;
      const labels = Object.keys(data).sort();
      const present = labels.map(d => data[d]?.present || 0);
      const late = labels.map(d => data[d]?.late || 0);
      setTrendData({
        labels: labels.map(d => { const dt = new Date(d); return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); }),
        datasets: [
          { label: 'Present', data: present, borderColor: '#111111', backgroundColor: 'rgba(17,17,17,0.04)', tension: 0.4, fill: true, pointRadius: 0, borderWidth: 2 },
          { label: 'Late', data: late, borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.04)', tension: 0.4, fill: true, pointRadius: 0, borderWidth: 2 },
        ],
      });
    }).catch((e) => console.warn('[Dashboard] attendance trend fetch failed:', e?.message));
  }, [companyId, selectedBranchId]);

  // Initial fetch + realtime
  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtimeMultiple([
    { table: 'employees', onRefresh: fetchData , companyId: currentUser?.company_id },
    { table: 'attendance', onRefresh: fetchData , companyId: currentUser?.company_id },
    { table: 'leave_requests', onRefresh: fetchData , companyId: currentUser?.company_id },
    { table: 'overtime_requests', onRefresh: fetchData , companyId: currentUser?.company_id },
    { table: 'reimbursements', onRefresh: fetchData , companyId: currentUser?.company_id },
  ]);

  // Computed values
  const expiringContracts = useMemo(() =>
    employees.filter(e => e.status === 'contract' && e.contract_end && Math.ceil((new Date(e.contract_end) - new Date()) / (1000 * 60 * 60 * 24)) <= 60).length,
    [employees]
  );

  const payrollTotal = useMemo(() =>
    employees.reduce((sum, e) => sum + (e.base_salary || e.baseSalary || 0) + (e.allowance || 0), 0),
    [employees]
  );

  const recentEmployees = useMemo(() => employees.slice(0, 8), [employees]);

  // Handlers
  const { toast } = useToast();
  const handleApprove = async (type, id) => {
    const companyId = employee?.company_id;
    if (!companyId) return;
    try {
      if (type === 'leave') await leaveService.updateLeaveStatus(id, 'approved', employee?.id, companyId);
      else if (type === 'overtime') await overtimeService.approveOvertime(id, employee?.id, companyId);
      else if (type === 'reimbursement') await reimbursementService.updateReimbursement(id, { status: 'approved', approved_by: employee?.id }, companyId);
      await fetchData();
      toast.success('Pengajuan disetujui.');
    } catch (err) { console.error('Approve error:', err); toast.error('Gagal menyetujui pengajuan. Coba lagi.'); }
  };

  const handleReject = async (type, id) => {
    const companyId = employee?.company_id;
    if (!companyId) return;
    try {
      if (type === 'leave') await leaveService.updateLeaveStatus(id, 'rejected', employee?.id, companyId);
      else if (type === 'overtime') await overtimeService.rejectOvertime(id, companyId);
      else if (type === 'reimbursement') await reimbursementService.updateReimbursement(id, { status: 'rejected', approved_by: employee?.id }, companyId);
      await fetchData();
      toast.success('Pengajuan ditolak.');
    } catch (err) { console.error('Reject error:', err); toast.error('Gagal menolak pengajuan. Coba lagi.'); }
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setSlideoverOpen(true);
  };

  const { t } = useTranslation();
  const greetingName =
    employee?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('dashboard.greeting_fallback');
  const greetingHour = new Date().getHours();
  const greetingText =
    greetingHour < 12
      ? t('dashboard.good_morning')
      : greetingHour < 17
        ? t('dashboard.good_afternoon')
        : t('dashboard.good_evening');
  const greetingAvatar = employee?.photo_url || user?.user_metadata?.avatar_url || null;

  if (loading) {
    return (
      <div className="dashboard-v2">
        <div className="dash-greeting dash-greeting--skeleton">
          <div className="dash-skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
          <div>
            <div className="dash-skeleton" style={{ width: 100, height: 14, marginBottom: 8 }} />
            <div className="dash-skeleton" style={{ width: 160, height: 22 }} />
          </div>
        </div>
        <KPICards loading={true} />
      </div>
    );
  }

  return (
    <div className="dashboard-v2">
      {/* Greeting — avatar with safe fallback (no broken image icon) */}
      <div className="dash-greeting-row">
        <div className="dash-greeting">
          <UserAvatar
            src={greetingAvatar}
            name={greetingName}
            alt={greetingName}
            size={48}
            className="dash-greeting-avatar"
          />
          <div className="dash-greeting-text">
            <p className="dash-greeting-sub">{greetingText}</p>
            <h2 className="dash-greeting-name">{greetingName}</h2>
          </div>
        </div>
        <div className="dash-toolbar">
          <BranchFilter />
          <WidgetSettings widgets={widgets} toggleWidget={toggleWidget} />
        </div>
      </div>

      {/* KPI strip */}
      <KPICards
        employees={employees}
        todayAttendance={todayAttendance}
        leaves={leaves}
        payrollTotal={payrollTotal}
        openJobs={jobPostings.length}
        expiringContracts={expiringContracts}
        loading={false}
      />

      {/* Row 1: Time Off | Running Project | Meetings — photo 3-col */}
      <div className="dash-section">
        <div className="dash-grid-3col">
          <TimeOffCard leaves={leaves} loading={false} />
          <RunningProjectCard projects={projects} loading={false} />
          <MeetingsCard trainings={trainings} loading={false} />
        </div>
      </div>

      {/* Row 2: My Task (wide) | Employee — photo layout */}
      <div className="dash-section">
        <div className="dash-grid-2col-tasks">
          <MyTaskCard
            leaves={leaves}
            overtimeRecords={overtimeRecords}
            reimbursements={reimbursements}
            onApprove={handleApprove}
            onReject={handleReject}
            loading={false}
          />
          <EmployeeCard
            employees={employees}
            todayAttendance={todayAttendance}
            onSelectEmployee={handleSelectEmployee}
            loading={false}
          />
        </div>
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline employees={employees} todayAttendance={todayAttendance} loading={false} />

      {/* Approvals + Directory */}
      <div className="dash-section">
        <div className="dash-grid-2col">
          <PendingApprovals
            leaves={leaves}
            overtimeRecords={overtimeRecords}
            reimbursements={reimbursements}
            onApprove={handleApprove}
            onReject={handleReject}
            loading={false}
          />
          <div>
            <EmployeeDirectory
              employees={employees}
              todayAttendance={todayAttendance}
              onSelectEmployee={handleSelectEmployee}
              onViewAll={() => navigate('/employees')}
              loading={false}
            />
            <UpcomingEvents trainings={trainings} employees={employees} loading={false} />
          </div>
        </div>
      </div>

      <ChartsSection
        trendData={trendData}
        employees={employees}
        todayAttendance={todayAttendance}
        demoTab={demoTab}
        setDemoTab={setDemoTab}
        widgets={widgets}
      />

      <BillingSection billing={billing} showPayment={showPayment} setShowPayment={setShowPayment} navigate={navigate} />

      <RecentEmployeesTable recentEmployees={recentEmployees} todayAttendance={todayAttendance} onSelectEmployee={handleSelectEmployee} />

      <NotificationBoardV2 />

      <EmployeeSlideOver
        employee={selectedEmployee}
        isOpen={slideoverOpen}
        onClose={() => { setSlideoverOpen(false); setSelectedEmployee(null); }}
        todayAttendance={todayAttendance}
      />
    </div>
  );
}

