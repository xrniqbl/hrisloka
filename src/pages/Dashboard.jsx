import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { useRealtimeMultiple } from '../hooks/useRealtime';
import * as employeeService from '../services/employeeService';
import * as attendanceService from '../services/attendanceService';
import * as leaveService from '../services/leaveService';
import * as overtimeService from '../services/overtimeService';
import * as billingService from '../services/billingService';
import * as reimbursementService from '../services/reimbursementService';
import * as jobService from '../services/jobService';
import * as trainingService from '../services/trainingService';
import BranchFilter from '../components/BranchFilter';
import {
  DashHeader, QuickActions, QuickActionsSkeleton, KPICards, ActivityTimeline,
  PendingApprovals, EmployeeDirectory, UpcomingEvents, EmployeeSlideOver,
  ChartsSection, BillingSection, RecentEmployeesTable, WidgetSettings, NotificationBoardV2,
} from '../components/dashboard';
import './DashboardV2.css';

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

export default function Dashboard() {
  const { user, employee } = useAuth();
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
      const [empRes, attRes, leaveRes, otRes, reimbRes, jobRes, trainRes] = await Promise.all([
        employeeService.getAllEmployees(selectedBranchId, companyId),
        attendanceService.getAllAttendanceToday(selectedBranchId, companyId),
        leaveService.getAllLeaves(selectedBranchId, companyId),
        overtimeService.getAllOvertime(selectedBranchId, companyId),
        reimbursementService.getAllReimbursements(companyId),
        jobService.getOpenJobs(companyId),
        trainingService.getAllTrainings(companyId),
      ]);
      setEmployees(empRes.data || []);
      setTodayAttendance(attRes.data || []);
      setLeaves(leaveRes.data || []);
      setOvertimeRecords(otRes.data || []);
      setReimbursements(reimbRes.data || []);
      setJobPostings(jobRes.data || []);
      setTrainings(trainRes.data || []);
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);
    }
    setLoading(false);
  }, [companyId, selectedBranchId]);

  // Billing fetch
  useEffect(() => {
    if (user?.id) {
      billingService.getBillingInfo(user.id).then(({ data }) => setBilling(data)).catch(() => {});
    }
  }, [user?.id]);

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
    }).catch(() => {});
  }, [companyId, selectedBranchId]);

  // Initial fetch + realtime
  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtimeMultiple([
    { table: 'employees', onRefresh: fetchData },
    { table: 'attendance', onRefresh: fetchData },
    { table: 'leave_requests', onRefresh: fetchData },
    { table: 'overtime_requests', onRefresh: fetchData },
    { table: 'reimbursements', onRefresh: fetchData },
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
  const handleApprove = async (type, id) => {
    try {
      if (type === 'leave') await leaveService.updateLeaveStatus(id, 'approved');
      else if (type === 'overtime') await overtimeService.approveOvertime(id, employee?.id);
      else if (type === 'reimbursement') await reimbursementService.updateReimbursement(id, { status: 'approved' });
      fetchData();
    } catch (err) { console.error('Approve error:', err); }
  };

  const handleReject = async (type, id) => {
    try {
      if (type === 'leave') await leaveService.updateLeaveStatus(id, 'rejected');
      else if (type === 'overtime') await overtimeService.rejectOvertime(id);
      else if (type === 'reimbursement') await reimbursementService.updateReimbursement(id, { status: 'rejected' });
      fetchData();
    } catch (err) { console.error('Reject error:', err); }
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setSlideoverOpen(true);
  };

  const userName = employee?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const today = new Date();
  const formattedDate = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="dashboard-v2">
        <DashHeader userName={userName.split(' ')[0]} date={formattedDate} />
        <QuickActionsSkeleton />
        <KPICards loading={true} />
      </div>
    );
  }

  return (
    <div className="dashboard-v2">
      {/* Header */}
      <DashHeader userName={userName.split(' ')[0]} date={formattedDate}>
        <BranchFilter />
        <WidgetSettings widgets={widgets} toggleWidget={toggleWidget} />
      </DashHeader>

      {/* Quick Actions */}
      <QuickActions onNavigate={navigate} />

      {/* KPI Cards */}
      <KPICards
        employees={employees}
        todayAttendance={todayAttendance}
        leaves={leaves}
        payrollTotal={payrollTotal}
        openJobs={jobPostings.length}
        expiringContracts={expiringContracts}
        loading={false}
      />

      {/* Activity Timeline */}
      <ActivityTimeline employees={employees} todayAttendance={todayAttendance} loading={false} />

      {/* Two Column: Approvals + Directory */}
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

      {/* Charts */}
      <ChartsSection
        trendData={trendData}
        employees={employees}
        todayAttendance={todayAttendance}
        demoTab={demoTab}
        setDemoTab={setDemoTab}
        widgets={widgets}
      />

      {/* Billing */}
      <BillingSection billing={billing} showPayment={showPayment} setShowPayment={setShowPayment} navigate={navigate} />

      {/* Recent Employees */}
      <RecentEmployeesTable recentEmployees={recentEmployees} todayAttendance={todayAttendance} />

      {/* Notifications */}
      <NotificationBoardV2 />

      {/* Employee Slide-Over */}
      <EmployeeSlideOver
        employee={selectedEmployee}
        isOpen={slideoverOpen}
        onClose={() => { setSlideoverOpen(false); setSelectedEmployee(null); }}
        todayAttendance={todayAttendance}
      />
    </div>
  );
}
