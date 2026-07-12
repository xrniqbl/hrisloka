import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Clock,
  Wallet,
  Settings,
  ChevronRight,
  Menu,
  X,
  List,
  FileText,
  CalendarDays,
  Network,
  Folder,
  RefreshCw,
  CreditCard,
  Target,
  Award,
  Briefcase,
  UserPlus,
  HardDrive,
  MessageSquare,
  Cpu,
  UserMinus,
  MapPin,
  Bell,
  GitBranch,
  PenLine,
  BookOpen,
  Star,
  Activity,
  ClipboardList,
  BarChart2,
  Link2,
  Eye,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { hasSidebarAccess, getRole, isFounder, ROLE_LABELS, ROLE_COLORS } from '../lib/rbac';
import { useTranslation } from '../lib/i18n';
import ProfileDrawer from './ProfileDrawer';
import { isDemoMode } from '../lib/demoGuard';
import { BRAND } from '../lib/brandPalette';
import './Sidebar.css';

/** Lucide component → Astryx Icon (theme-aligned stroke icons) */
function NavIcon({ icon: IconComp, size = 'sm' }) {
  if (!IconComp) return null;
  return (
    <span className="nav-link-icon" aria-hidden>
      <Icon icon={IconComp} size={size} color="inherit" />
    </span>
  );
}

// Navigation — icons as Lucide components (Astryx Icon wrapper)
const getNavItems = (t) => [
  { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/dashboard' },
  { label: t('nav.approvals'), icon: ListChecks, path: '/approvals' },
  {
    label: t('nav.employees'),
    icon: Users,
    children: [
      { label: t('nav.employee_data'), path: '/employees', icon: List },
      { label: t('nav.departments'), path: '/departments', icon: Briefcase },
      { label: t('nav.org_chart'), path: '/org-chart', icon: Network },
      { label: t('nav.documents'), path: '/documents', icon: Folder },
      { label: t('nav.profile_requests'), path: '/profile-requests', icon: PenLine },
      { label: t('nav.branches'), path: '/branches', icon: GitBranch },
      { label: t('nav.onboarding'), path: '/onboarding', icon: ClipboardList },
      { label: t('nav.offboarding'), path: '/offboarding', icon: UserMinus },
    ],
  },
  {
    label: t('nav.attendance'),
    icon: ListChecks,
    children: [
      { label: t('nav.daily_attendance'), path: '/attendance', icon: CalendarDays },
      { label: t('nav.shift_management'), path: '/shifts', icon: RefreshCw },
      { label: t('nav.leave'), path: '/leave', icon: FileText },
      { label: t('nav.geo_attendance'), path: '/geo-attendance', icon: MapPin },
    ],
  },
  { label: t('nav.overtime'), icon: Clock, path: '/overtime' },
  {
    label: t('nav.payroll'),
    icon: Wallet,
    children: [
      { label: t('nav.salary_list'), path: '/payroll', icon: List },
      { label: t('nav.payslips'), path: '/payslips', icon: CreditCard },
      { label: t('nav.reimbursement'), path: '/reimbursement', icon: RefreshCw },
      { label: t('nav.expense_ocr'), path: '/expense-ocr', icon: FileText },
      { label: t('nav.loans'), path: '/loans', icon: Wallet },
    ],
  },
  {
    label: t('nav.projects'),
    icon: Folder,
    children: [
      { label: t('nav.project_management'), path: '/projects', icon: Folder },
      { label: t('nav.timesheets'), path: '/timesheets', icon: Clock },
    ],
  },
  {
    label: t('nav.performance'),
    icon: Target,
    children: [
      { label: t('nav.kpi'), path: '/kpi', icon: Target },
      { label: t('nav.appraisal'), path: '/appraisal', icon: Award },
    ],
  },
  {
    label: t('nav.recruitment'),
    icon: Briefcase,
    children: [
      { label: t('nav.job_postings'), path: '/jobs', icon: Briefcase },
      { label: t('nav.candidates'), path: '/candidates', icon: UserPlus },
    ],
  },
  {
    label: t('nav.it_support'),
    icon: HardDrive,
    children: [
      { label: t('nav.assets'), path: '/it-assets', icon: HardDrive },
      { label: t('nav.helpdesk'), path: '/helpdesk', icon: MessageSquare },
    ],
  },
  { label: t('nav.training'), icon: BookOpen, path: '/training' },
  { label: t('nav.ai_capability'), icon: Cpu, path: '/ai-capability' },
  { label: t('nav.calendar'), icon: CalendarDays, path: '/calendar' },
  { label: t('nav.holidays'), icon: Star, path: '/holidays' },
  { label: t('nav.announcements'), icon: Bell, path: '/announcements' },
  { label: t('nav.audit_trail'), icon: Activity, path: '/audit-trail' },
  { label: t('nav.analytics'), icon: BarChart2, path: '/analytics' },
  { label: t('nav.integrations'), icon: Link2, path: '/integrations' },
  { label: t('nav.policies'), icon: BookOpen, path: '/policies' },
  { label: t('nav.contracts'), icon: FileText, path: '/contracts' },
  { label: t('nav.settings'), icon: Settings, path: '/settings' },
]

const ROLE_LABELS_ID = {
  super_admin: 'Super Admin',
  hr_admin: 'HR Admin',
};

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('hris_sidebar_collapsed') === 'true',
  );
  const [expandedMenus, setExpandedMenus] = useState({});
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, employee } = useAuth();
  const { isPathEnabled } = useFeatureFlags();
  const { t } = useTranslation();

  const actualRole = getRole(employee);
  const founderUser = isFounder(user, employee);

  const [viewAsRole, setViewAsRole] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('HRIS Loka_viewAs');
      if (!saved || !['super_admin', 'hr_admin'].includes(saved)) {
        localStorage.setItem('HRIS Loka_viewAs', 'super_admin');
        return 'super_admin';
      }
      return saved;
    }
    return 'super_admin';
  });

  const activeRole = founderUser ? viewAsRole : actualRole;

  useEffect(() => {
    const update = () => {
      const isMobile = window.innerWidth <= 768;
      const width = isMobile ? '0px' : collapsed ? '64px' : '260px';
      document.documentElement.style.setProperty('--sidebar-width', width);
    };
    update();
    localStorage.setItem('hris_sidebar_collapsed', collapsed);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [collapsed]);

  const handleViewAs = (role) => {
    setViewAsRole(role);
    localStorage.setItem('HRIS Loka_viewAs', role);
    setShowRoleSwitcher(false);
  };

  const navItems = getNavItems(t);

  const filterByRole = (items) =>
    items.reduce((acc, item) => {
      if (item.children) {
        const filtered = item.children.filter(
          (child) => hasSidebarAccess(activeRole, child.path) && isPathEnabled(child.path),
        );
        if (filtered.length > 0) acc.push({ ...item, children: filtered });
      } else if (hasSidebarAccess(activeRole, item.path) && isPathEnabled(item.path)) {
        acc.push(item);
      }
      return acc;
    }, []);

  const visibleNav = filterByRole(navItems);

  const toggleSubmenu = (label) => {
    if (collapsed) {
      setCollapsed(false);
      setTimeout(() => setExpandedMenus((prev) => ({ ...prev, [label]: true })), 50);
    } else {
      setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
    }
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const isChildActive = (children) => children?.some((c) => location.pathname.startsWith(c.path));

  const isDemo = isDemoMode();
  const userName = isDemo
    ? 'Demo'
    : employee?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitials = isDemo
    ? 'DM'
    : userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';
  const [avatarBroken, setAvatarBroken] = useState(false);
  const avatarUrl = isDemo ? null : employee?.photo_url || user?.user_metadata?.avatar_url || null;
  useEffect(() => {
    setAvatarBroken(false);
  }, [avatarUrl]);

  // Role accent stays primary-family (founder/demo) except true role colors only if needed
  const roleDotColor = founderUser
    ? BRAND.primary
    : ROLE_COLORS[actualRole] || BRAND.primary;

  return (
    <>
      <div className="mobile-header">
        <button
          type="button"
          className="mobile-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={mobileOpen}
        >
          <Icon icon={mobileOpen ? X : Menu} size="md" color="inherit" />
        </button>
        <span className="mobile-brand">HRIS Loka</span>
      </div>

      <div
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={`sidebar ${mobileOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <img
            src="/landing/hrislokalogo.jpeg"
            alt="HRIS Loka"
            className="sidebar-brand-logo"
          />
          {!collapsed && <span className="sidebar-brand-text">HRIS Loka</span>}
          <button
            type="button"
            className="sidebar-brand-btn"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon icon={Menu} size="sm" color="inherit" />
          </button>
        </div>

        <div
          className={`sidebar-company-card ${collapsed ? 'collapsed-card' : ''}`}
          onClick={() => setProfileOpen(true)}
          title="Buka Profil"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setProfileOpen(true)}
        >
          <div className="sidebar-company-avatar-wrap">
            {avatarUrl && !avatarBroken ? (
              <img
                src={avatarUrl}
                alt=""
                className="sidebar-company-photo"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <div className="sidebar-company-avatar">{userInitials}</div>
            )}
            <span
              className="sidebar-company-role-dot"
              style={{ background: roleDotColor }}
            />
          </div>
          {!collapsed && (
            <>
              <div className="sidebar-company-info">
                <div className="sidebar-company-name">{userName}</div>
                <div className="sidebar-company-plan">
                  <span
                    className={`sidebar-plan-badge${isDemo ? ' is-demo' : ''}${founderUser ? ' is-founder' : ''}`}
                  >
                    {isDemo
                      ? 'DEMO'
                      : founderUser
                        ? 'Founder'
                        : ROLE_LABELS_ID[actualRole] || 'User'}
                  </span>
                </div>
              </div>
              <Icon icon={ChevronRight} size="sm" color="inherit" className="sidebar-card-chevron" />
            </>
          )}
        </div>

        <nav className="sidebar-nav">
          {!collapsed && (
            <div className="nav-section-label">{t('nav.main_menu')}</div>
          )}

          {visibleNav.map((item) => (
            <div className="nav-item" key={item.label}>
              {item.children ? (
                <>
                  <button
                    type="button"
                    className={`nav-link ${isChildActive(item.children) ? 'active' : ''}`}
                    onClick={() => toggleSubmenu(item.label)}
                    title={collapsed ? item.label : ''}
                    aria-expanded={!!expandedMenus[item.label]}
                  >
                    <NavIcon icon={item.icon} />
                    {!collapsed && <span className="nav-link-text">{item.label}</span>}
                    {!collapsed && (
                      <span
                        className={`nav-link-arrow ${expandedMenus[item.label] ? 'open' : ''}`}
                      >
                        <Icon icon={ChevronRight} size="sm" color="inherit" />
                      </span>
                    )}
                  </button>
                  {!collapsed && (
                    <div
                      className={`nav-submenu ${expandedMenus[item.label] ? 'open' : ''}`}
                    >
                      {item.children.map((child) => (
                        <button
                          type="button"
                          key={child.path}
                          className={`nav-submenu-link ${location.pathname === child.path ? 'active' : ''}`}
                          onClick={() => handleNavClick(child.path)}
                        >
                          {child.icon && (
                            <span className="nav-submenu-icon">
                              <Icon icon={child.icon} size="sm" color="inherit" />
                            </span>
                          )}
                          <span>{child.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.path)}
                  title={collapsed ? item.label : ''}
                >
                  <NavIcon icon={item.icon} />
                  {!collapsed && <span className="nav-link-text">{item.label}</span>}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {founderUser && !collapsed && (
            <div className="role-switcher">
              <button
                type="button"
                className="role-switcher-btn"
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              >
                <Icon icon={Eye} size="sm" color="inherit" />
                <span>
                  View As: <strong>{ROLE_LABELS[viewAsRole]}</strong>
                </span>
                <span
                  className="role-switcher-chevron"
                  style={{
                    transform: showRoleSwitcher ? 'rotate(180deg)' : 'none',
                  }}
                >
                  <Icon icon={ChevronDown} size="sm" color="inherit" />
                </span>
              </button>
              {showRoleSwitcher && (
                <div className="role-switcher-dropdown">
                  {['super_admin', 'hr_admin'].map((r) => (
                    <button
                      type="button"
                      key={r}
                      className={`role-switcher-option ${viewAsRole === r ? 'active' : ''}`}
                      onClick={() => handleViewAs(r)}
                    >
                      <span
                        className="role-dot"
                        style={{ background: ROLE_COLORS[r] || BRAND.primary }}
                      />
                      {ROLE_LABELS[r]}
                      {viewAsRole === r && (
                        <span className="role-check">
                          <Icon icon={Check} size="sm" color="inherit" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
