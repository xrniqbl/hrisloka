import { useLocation, Link } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';

const ROUTE_LABELS = {
 'dashboard': 'Dashboard',
 'employees': 'Karyawan',
 'attendance': 'Kehadiran',
 'leave': 'Cuti',
 'overtime': 'Lembur',
 'payroll': 'Payroll',
 'payslips': 'Payslip',
 'reimbursement': 'Reimbursement',
 'expense-ocr': 'OCR Expense',
 'shifts': 'Shift',
 'approvals': 'Persetujuan',
 'documents': 'Dokumen',
 'kpi': 'KPI',
 'appraisal': 'Appraisal',
 'jobs': 'Lowongan',
 'candidates': 'Kandidat',
 'assets': 'Aset IT',
 'helpdesk': 'Helpdesk',
 'projects': 'Proyek',
 'timesheets': 'Timesheet',
 'org-chart': 'Org Chart',
 'geo-attendance': 'GPS Absensi',
 'branches': 'Cabang',
 'profile-requests': 'Permintaan Profil',
 'departments': 'Departemen',
 'audit-trail': 'Audit Trail',
 'onboarding': 'Onboarding',
 'training': 'Pelatihan',
 'calendar': 'Kalender',
 'loans': 'Pinjaman',
 'holidays': 'Hari Libur',
 'announcements': 'Pengumuman',
 'settings': 'Settings',
 'analytics': 'Analytics',
 'integrations': 'Integrasi',
 'policies': 'Kebijakan',
 'ai-capability': 'AI & Dev',
 'offboarding': 'Offboarding',
};

export default function Breadcrumb() {
 const location = useLocation();
 const segments = location.pathname.split('/').filter(Boolean);

 if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) return null;

 return (
 <nav style={{
 display: 'flex', alignItems: 'center', gap: 6,
 fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16,
 animation: 'fadeInUp 0.2s ease',
 }}>
 <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)', transition: 'color 0.15s' }}
 onMouseEnter={e => e.target.style.color = 'var(--primary)'}
 onMouseLeave={e => e.target.style.color = 'var(--text-tertiary)'}
 >
 <FiHome size={13} />
 </Link>
 {segments.map((seg, i) => {
 const path = '/' + segments.slice(0, i + 1).join('/');
 const label = ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
 const isLast = i === segments.length - 1;

 return (
 <span key={path} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
 <FiChevronRight size={11} style={{ opacity: 0.5 }} />
 {isLast ? (
 <span style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</span>
 ) : (
 <Link to={path} style={{ color: 'var(--text-tertiary)', transition: 'color 0.15s' }}
 onMouseEnter={e => e.target.style.color = 'var(--primary)'}
 onMouseLeave={e => e.target.style.color = 'var(--text-tertiary)'}
 >
 {label}
 </Link>
 )}
 </span>
 );
 })}
 </nav>
 );
}
