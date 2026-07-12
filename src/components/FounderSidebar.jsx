import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Tag,
  Globe,
  BarChart2,
  Bell,
  MessageCircle,
  Settings,
  Menu,
  X,
  LogOut,
  ExternalLink,
  Shield,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './FounderSidebar.css';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/founder/dashboard' },
  { label: 'Subscribers', icon: Users, path: '/founder/subscribers' },
  { label: 'Manage Subscriptions', icon: CreditCard, path: '/founder/subscriptions' },
  { label: 'Voucher Management', icon: Tag, path: '/founder/vouchers' },
  { label: 'Company Management', icon: Globe, path: '/founder/companies' },
];

const SYSTEM_ITEMS = [
  { label: 'Website Analytics', icon: BarChart2, path: '/founder/analytics' },
  { label: 'Broadcast Notifications', icon: Bell, path: '/founder/broadcast' },
  { label: 'Client Support', icon: MessageCircle, path: '/founder/support', badge: true },
  { label: 'Backup & Security', icon: Database, path: '/founder/backup' },
  { label: 'Platform Settings', icon: Settings, path: '/founder/platform-settings' },
];

function NavIcon({ icon: IconComp }) {
  if (!IconComp) return null;
  return (
    <span className="founder-nav-icon" aria-hidden>
      <Icon icon={IconComp} size="sm" color="inherit" />
    </span>
  );
}

export default function FounderSidebar({ openComplaints = 0 }) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('founder_sidebar_collapsed') === 'true',
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, employee, signOut } = useAuth();

  useEffect(() => {
    const w = collapsed ? '66px' : '260px';
    document.documentElement.style.setProperty('--founder-sidebar-width', w);
    localStorage.setItem('founder_sidebar_collapsed', collapsed);
  }, [collapsed]);

  const userName =
    employee?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Founder';
  const userInitials =
    userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'F';
  const avatarUrl = employee?.photo_url || user?.user_metadata?.avatar_url || null;

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <div className="founder-mobile-header">
        <button
          type="button"
          className="founder-mobile-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={mobileOpen}
        >
          <Icon icon={mobileOpen ? X : Menu} size="md" color="inherit" />
        </button>
        <span className="founder-mobile-brand">HRIS Loka</span>
      </div>

      <div
        className={`founder-sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={`founder-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        aria-label="Founder navigation"
      >
        <div className="founder-sidebar-brand">
          <img
            src="/landing/hrislokalogo.jpeg"
            alt="HRIS Loka"
            className="founder-sidebar-logo"
          />
          {!collapsed && (
            <div>
              <div className="founder-sidebar-brand-text">HRIS Loka</div>
              <div className="founder-sidebar-badge">
                <Icon icon={Shield} size="xsm" color="inherit" />
                Founder Portal
              </div>
            </div>
          )}
          <button
            type="button"
            className="founder-sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon icon={Menu} size="sm" color="inherit" />
          </button>
        </div>

        <div className={`founder-user-card ${collapsed ? 'collapsed' : ''}`}>
          <div className="founder-user-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : userInitials}
          </div>
          {!collapsed && (
            <div className="founder-user-info">
              <div className="founder-user-name">{userName}</div>
              <div className="founder-user-role">Founder</div>
            </div>
          )}
        </div>

        <nav className="founder-nav">
          {!collapsed && <div className="founder-nav-section">Main</div>}

          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.path}
              className={`founder-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNav(item.path)}
              title={collapsed ? item.label : ''}
            >
              <NavIcon icon={item.icon} />
              {!collapsed && <span className="founder-nav-label">{item.label}</span>}
            </button>
          ))}

          {!collapsed && <div className="founder-nav-section">System</div>}
          {collapsed && <div className="founder-nav-divider" />}

          {SYSTEM_ITEMS.map((item) => (
            <button
              type="button"
              key={item.path}
              className={`founder-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNav(item.path)}
              title={collapsed ? item.label : ''}
            >
              <NavIcon icon={item.icon} />
              {!collapsed && <span className="founder-nav-label">{item.label}</span>}
              {item.badge && openComplaints > 0 && (
                <span className="founder-nav-badge">{openComplaints}</span>
              )}
            </button>
          ))}

          <div className="founder-nav-divider" />

          <button
            type="button"
            className="founder-switch-btn"
            onClick={() => handleNav('/dashboard')}
            title={collapsed ? 'Switch to Admin View' : ''}
          >
            <NavIcon icon={ExternalLink} />
            {!collapsed && (
              <span className="founder-nav-label">Switch to Admin View</span>
            )}
          </button>
        </nav>

        <div className="founder-sidebar-footer">
          <button
            type="button"
            className="founder-nav-item founder-signout"
            onClick={handleSignOut}
            title={collapsed ? 'Sign Out' : ''}
          >
            <NavIcon icon={LogOut} />
            {!collapsed && <span className="founder-nav-label">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
