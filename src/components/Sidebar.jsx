import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
 FiGrid, FiUsers, FiCheckSquare, FiClock, FiDollarSign, FiSettings,
 FiChevronRight, FiMenu, FiX,
 FiList, FiFileText, FiCalendar, FiMap, FiFolder,
 FiRepeat, FiCreditCard, FiRefreshCw,
 FiTarget, FiAward, FiBriefcase, FiUserPlus,
 FiHardDrive, FiMessageSquare, FiCpu, FiUserMinus, FiMapPin, FiBell, FiGitBranch, FiEdit3,
 FiBook, FiStar, FiActivity, FiClipboard, FiBarChart2, FiLink, FiBookOpen,
 FiEye, FiChevronDown, FiCheck,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { hasAccess, hasSidebarAccess, getRole, isFounder, ROLE_LABELS, ROLE_COLORS } from '../lib/rbac';
import { useTranslation } from '../lib/i18n';
import ProfileDrawer from './ProfileDrawer';
import { isDemoMode } from '../lib/demoGuard';
import './Sidebar.css';

// Navigation items with i18n keys
const getNavItems = (t) => [
 { label: t('nav.dashboard'), icon: <FiGrid />, path: '/dashboard' },
 { label: t('nav.approvals'), icon: <FiCheckSquare />, path: '/approvals' },
 {
 label: t('nav.employees'), icon: <FiUsers />,
 children: [
 { label: t('nav.employee_data'), path: '/employees', icon: <FiList /> },
 { label: t('nav.departments'), path: '/departments', icon: <FiBriefcase /> },
 { label: t('nav.org_chart'), path: '/org-chart', icon: <FiMap /> },
 { label: t('nav.documents'), path: '/documents', icon: <FiFolder /> },
 { label: t('nav.profile_requests'), path: '/profile-requests', icon: <FiEdit3 /> },
 { label: t('nav.branches'), path: '/branches', icon: <FiGitBranch /> },
 { label: t('nav.onboarding'), path: '/onboarding', icon: <FiClipboard /> },
 { label: t('nav.offboarding'), path: '/offboarding', icon: <FiUserMinus /> },
 ],
 },
 {
 label: t('nav.attendance'), icon: <FiCheckSquare />,
 children: [
 { label: t('nav.daily_attendance'), path: '/attendance', icon: <FiCalendar /> },
 { label: t('nav.shift_management'), path: '/shifts', icon: <FiRepeat /> },
 { label: t('nav.leave'), path: '/leave', icon: <FiFileText /> },
 { label: t('nav.geo_attendance'), path: '/geo-attendance', icon: <FiMapPin /> },
 ],
 },
 { label: t('nav.overtime'), icon: <FiClock />, path: '/overtime' },
 {
 label: t('nav.payroll'), icon: <FiDollarSign />,
 children: [
 { label: t('nav.salary_list'), path: '/payroll', icon: <FiList /> },
 { label: t('nav.payslips'), path: '/payslips', icon: <FiCreditCard /> },
 { label: t('nav.reimbursement'), path: '/reimbursement', icon: <FiRefreshCw /> },
 { label: t('nav.loans'), path: '/loans', icon: <FiDollarSign /> },
 ],
 },
 {
 label: t('nav.projects'), icon: <FiFolder />,
 children: [
 { label: t('nav.project_management'), path: '/projects', icon: <FiFolder /> },
 { label: t('nav.timesheets'), path: '/timesheets', icon: <FiClock /> },
 ],
 },
 {
 label: t('nav.performance'), icon: <FiTarget />,
 children: [
 { label: t('nav.kpi'), path: '/kpi', icon: <FiTarget /> },
 { label: t('nav.appraisal'), path: '/appraisal', icon: <FiAward /> },
 ],
 },
 {
 label: t('nav.recruitment'), icon: <FiBriefcase />,
 children: [
 { label: t('nav.job_postings'), path: '/jobs', icon: <FiBriefcase /> },
 { label: t('nav.candidates'), path: '/candidates', icon: <FiUserPlus /> },
 ],
 },
 {
 label: t('nav.it_support'), icon: <FiHardDrive />,
 children: [
 { label: t('nav.assets'), path: '/assets', icon: <FiHardDrive /> },
 { label: t('nav.helpdesk'), path: '/helpdesk', icon: <FiMessageSquare /> },
 ],
 },
 { label: t('nav.training'), icon: <FiBook />, path: '/training' },
 { label: t('nav.ai_capability'), icon: <FiCpu />, path: '/ai-capability' },
 { label: t('nav.calendar'), icon: <FiCalendar />, path: '/calendar' },
 { label: t('nav.holidays'), icon: <FiStar />, path: '/holidays' },
 { label: t('nav.announcements'), icon: <FiBell />, path: '/announcements' },
 { label: t('nav.audit_trail'), icon: <FiActivity />, path: '/audit-trail' },
 { label: t('nav.analytics'), icon: <FiBarChart2 />, path: '/analytics' },
 { label: t('nav.integrations'), icon: <FiLink />, path: '/integrations' },
 { label: t('nav.policies'), icon: <FiBookOpen />, path: '/policies' },
 { label: t('nav.contracts'), icon: <FiFileText />, path: '/contracts' },
];

const ROLE_LABELS_ID = {
 super_admin: 'Super Admin',
 hr_admin: 'HR Admin',
};

export default function Sidebar() {
 const [mobileOpen, setMobileOpen] = useState(false);
 const [collapsed, setCollapsed] = useState(() => localStorage.getItem('hris_sidebar_collapsed') === 'true');
 const [expandedMenus, setExpandedMenus] = useState({});
 const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
 const [profileOpen, setProfileOpen] = useState(false);
 const location = useLocation();
 const navigate = useNavigate();
 const { user, employee } = useAuth();
 const { t } = useTranslation();

 const actualRole = getRole(employee);
 const founderUser = isFounder(user, employee);

 // Founder can view as different roles
 const [viewAsRole, setViewAsRole] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('HRIS Loka_viewAs');
    // manager and employee removed from View As � reset to super_admin
    if (!saved || !['super_admin', 'hr_admin'].includes(saved)) {
      localStorage.setItem('HRIS Loka_viewAs', 'super_admin');
      return 'super_admin';
    }
    return saved;
  }
  return 'super_admin';
  });

 const activeRole = founderUser ? viewAsRole : actualRole;

 // Sync collapsed width to CSS variable for layout adjustment
 useEffect(() => {
 const width = collapsed ? '64px' : '260px';
 document.documentElement.style.setProperty('--sidebar-width', width);
 localStorage.setItem('hris_sidebar_collapsed', collapsed);
 }, [collapsed]);

 const handleViewAs = (role) => {
 setViewAsRole(role);
 localStorage.setItem('HRIS Loka_viewAs', role);
 setShowRoleSwitcher(false);
 };

 const navItems = getNavItems(t);

 const filterByRole = (items) => {
 return items.reduce((acc, item) => {
 if (item.children) {
 const filtered = item.children.filter(child => hasSidebarAccess(activeRole, child.path));
 if (filtered.length > 0) acc.push({ ...item, children: filtered });
 } else {
 if (hasSidebarAccess(activeRole, item.path)) acc.push(item);
 }
 return acc;
 }, []);
 };

 const visibleNav = filterByRole(navItems);

 const toggleSubmenu = (label) => {
 if (collapsed) {
 setCollapsed(false);
 setTimeout(() => setExpandedMenus(prev => ({ ...prev, [label]: true })), 50);
 } else {
 setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
 }
 };

 const handleNavClick = (path) => {
 navigate(path);
 setMobileOpen(false);
 };

 const isChildActive = (children) => children?.some(c => location.pathname.startsWith(c.path));

 // userName must be declared first � userInitials references it (avoid TDZ crash)
 const isDemo = isDemoMode();
 const userName = isDemo ? 'Demo' : (employee?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User');
 const userInitials = isDemo ? 'DM' : (userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U');
 const avatarUrl = isDemo ? null : (employee?.photo_url || user?.user_metadata?.avatar_url || null);

 return (
 <>
 {/* Mobile Header */}
 <div className="mobile-header">
 <button className="mobile-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
 {mobileOpen ? <FiX /> : <FiMenu />}
 </button>
 <span className="mobile-brand">HRIS Loka</span>
 </div>

 {/* Overlay */}
 <div
 className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
 onClick={() => setMobileOpen(false)}
 />

 {/* Sidebar */}
 <aside className={`sidebar ${mobileOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>

 {/* ── Brand row ── */}
 <div className="sidebar-brand">
 <img src="/landing/hrislokalogo.jpeg" alt="HRIS Loka" className="sidebar-brand-logo" />
 {!collapsed && <span className="sidebar-brand-text">HRIS Loka</span>}
 <button
 className="sidebar-brand-btn"
 title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
 onClick={() => setCollapsed(c => !c)}
 >
 <FiMenu size={15} />
 </button>
 </div>

 {/* ── Profile / Company card ── */}
 <div
 className={`sidebar-company-card ${collapsed ? 'collapsed-card' : ''}`}
 onClick={() => setProfileOpen(true)}
 title="Buka Profil"
 >
 <div className="sidebar-company-avatar-wrap">
 {avatarUrl ? (
 <img src={avatarUrl} alt="Avatar" className="sidebar-company-photo" />
 ) : (
 <div className="sidebar-company-avatar">{userInitials}</div>
 )}
 <span
 className="sidebar-company-role-dot"
 style={{ background: founderUser ? 'var(--primary, #0047AB)' : (ROLE_COLORS[actualRole] || '#3B82F6') }}
 />
 </div>
 {!collapsed && (
 <>
 <div className="sidebar-company-info">
 <div className="sidebar-company-name">{userName}</div>
 <div className="sidebar-company-plan">
 <span className="sidebar-plan-badge" style={isDemo ? { background: '#0f766e', color: '#fff' } : founderUser ? { background: 'var(--primary,#0047AB)', color: '#fff' } : {}}>
 {isDemo ? 'DEMO' : (founderUser ? 'Founder' : (ROLE_LABELS_ID[actualRole] || 'User'))}
 </span>
 </div>
 </div>
 <FiChevronRight size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
 </>
 )}
 </div>

 {/* ── Nav ── */}
 <nav className="sidebar-nav">
 {!collapsed && <div className="nav-section-label">{t('nav.main_menu')}</div>}

 {visibleNav.map((item) => (
 <div className="nav-item" key={item.label}>
 {item.children ? (
 <>
 <button
 className={`nav-link ${isChildActive(item.children) ? 'active' : ''}`}
 onClick={() => toggleSubmenu(item.label)}
 title={collapsed ? item.label : ''}
 >
 <span className="nav-link-icon">{item.icon}</span>
 {!collapsed && <span className="nav-link-text">{item.label}</span>}
 {!collapsed && (
 <span className={`nav-link-arrow ${expandedMenus[item.label] ? 'open' : ''}`}>
 <FiChevronRight />
 </span>
 )}
 </button>
 {!collapsed && (
 <div className={`nav-submenu ${expandedMenus[item.label] ? 'open' : ''}`}>
 {item.children.map((child) => (
 <div
 key={child.path}
 className={`nav-submenu-link ${location.pathname === child.path ? 'active' : ''}`}
 onClick={() => handleNavClick(child.path)}
 >
 {child.label}
 </div>
 ))}
 </div>
 )}
 </>
 ) : (
 <div
 className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
 onClick={() => handleNavClick(item.path)}
 title={collapsed ? item.label : ''}
 >
 <span className="nav-link-icon">{item.icon}</span>
 {!collapsed && <span className="nav-link-text">{item.label}</span>}
 </div>
 )}
 </div>
 ))}
 </nav>

 {/* ── Footer �� Founder role switcher only ── */}
 <div className="sidebar-footer">
 {founderUser && !collapsed && (
 <div className="role-switcher">
 <button className="role-switcher-btn" onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}>
 <FiEye style={{ fontSize: 14 }} />
 <span>View As: <strong>{ROLE_LABELS[viewAsRole]}</strong></span>
 <FiChevronDown style={{ fontSize: 12, marginLeft: 'auto', transform: showRoleSwitcher ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
 </button>
 {showRoleSwitcher && (
 <div className="role-switcher-dropdown">
 {['super_admin', 'hr_admin'].map(r => (
 <button
 key={r}
 className={`role-switcher-option ${viewAsRole === r ? 'active' : ''}`}
 onClick={() => handleViewAs(r)}
 >
 <span className="role-dot" style={{ background: ROLE_COLORS[r] }} />
 {ROLE_LABELS[r]}
 {viewAsRole === r && <FiCheck style={{ marginLeft: 'auto', fontSize: 14 }} />}
 </button>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 </aside>

 {/* Profile Drawer */}
 <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
 </>
 );
}
