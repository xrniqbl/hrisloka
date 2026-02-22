import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeProfile from './pages/EmployeeProfile';
import OrgChart from './pages/OrgChart';
import Documents from './pages/Documents';
import Attendance from './pages/Attendance';
import ShiftManagement from './pages/ShiftManagement';
import LeaveManagement from './pages/LeaveManagement';
import Overtime from './pages/Overtime';
import Payroll from './pages/Payroll';
import Payslips from './pages/Payslips';
import Reimbursement from './pages/Reimbursement';
import KPITracking from './pages/KPITracking';
import Appraisal from './pages/Appraisal';
import JobPosting from './pages/JobPosting';
import CandidatePipeline from './pages/CandidatePipeline';
import AssetManagement from './pages/AssetManagement';
import Helpdesk from './pages/Helpdesk';
import AICapability from './pages/AICapability';
import Offboarding from './pages/Offboarding';
import ApprovalDashboard from './pages/ApprovalDashboard';
import GeofenceAttendance from './pages/GeofenceAttendance';
import ExpenseOCR from './pages/ExpenseOCR';
import Settings from './pages/Settings';
import Announcements from './pages/Announcements';
import ProjectManagement from './pages/ProjectManagement';
import TimesheetAdmin from './pages/TimesheetAdmin';
import EmployeeLayout from './layouts/EmployeeLayout';
import EmpDashboard from './pages/employee/EmpDashboard';
import EmpAbsen from './pages/employee/EmpAbsen';
import EmpPayslip from './pages/employee/EmpPayslip';
import EmpProfile from './pages/employee/EmpProfile';
import CompanyDirectory from './pages/employee/CompanyDirectory';
import EmpAnnouncements from './pages/employee/EmpAnnouncements';
import EmpShift from './pages/employee/EmpShift';
import EmpSubmissions from './pages/employee/EmpSubmissions';
import EmpProjects from './pages/employee/EmpProjects';
import InstallPrompt from './components/InstallPrompt';

function App() {
  console.log('App: Rendering routes');
  return (
    <AuthProvider>
      <InstallPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="approvals" element={<ApprovalDashboard />} />

            {/* Employee Management */}
            <Route path="employees" element={<Employees />} />
            <Route path="employees/:id" element={<EmployeeProfile />} />
            <Route path="org-chart" element={<OrgChart />} />
            <Route path="documents" element={<Documents />} />

            {/* Time & Attendance */}
            <Route path="attendance" element={<Attendance />} />
            <Route path="shifts" element={<ShiftManagement />} />
            <Route path="leave" element={<LeaveManagement />} />
            <Route path="overtime" element={<Overtime />} />

            {/* Payroll & Finance */}
            <Route path="payroll" element={<Payroll />} />
            <Route path="payslips" element={<Payslips />} />
            <Route path="reimbursement" element={<Reimbursement />} />

            {/* Performance */}
            <Route path="kpi" element={<KPITracking />} />
            <Route path="appraisal" element={<Appraisal />} />

            {/* Recruitment */}
            <Route path="jobs" element={<JobPosting />} />
            <Route path="candidates" element={<CandidatePipeline />} />

            {/* IT & Support */}
            <Route path="assets" element={<AssetManagement />} />
            <Route path="helpdesk" element={<Helpdesk />} />

            {/* AI & Dev */}
            <Route path="ai-capability" element={<AICapability />} />

            {/* Offboarding */}
            <Route path="offboarding" element={<Offboarding />} />

            {/* Geofencing */}
            <Route path="geo-attendance" element={<GeofenceAttendance />} />

            {/* Expense OCR */}
            <Route path="expense-ocr" element={<ExpenseOCR />} />

            <Route path="settings" element={<Settings />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="projects" element={<ProjectManagement />} />
            <Route path="timesheets" element={<TimesheetAdmin />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />

          {/* Employee PWA Routes */}
          <Route path="/app" element={<EmployeeLayout />}>
            <Route index element={<Navigate to="/app/home" replace />} />
            <Route path="home" element={<EmpDashboard />} />
            <Route path="absen" element={<EmpAbsen />} />
            <Route path="payslip" element={<EmpPayslip />} />
            <Route path="profile" element={<EmpProfile />} />
            <Route path="directory" element={<CompanyDirectory />} />
            <Route path="announcements" element={<EmpAnnouncements />} />
            <Route path="shift" element={<EmpShift />} />
            <Route path="submissions" element={<EmpSubmissions />} />
            <Route path="projects" element={<EmpProjects />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: '0' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{title}</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        This page is under development.
      </p>
    </div>
  );
}

export default App;
