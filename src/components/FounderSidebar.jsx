import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiGrid, FiUsers, FiCreditCard, FiTag, FiGlobe, FiBarChart2,
  FiBell, FiMessageCircle, FiSettings, FiMenu, FiX, FiChevronRight,
  FiLogOut, FiExternalLink, FiShield, FiDatabase,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import './FounderSidebar.css';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <FiGrid />, path: '/founder/dashboard' },
  { label: 'Subscribers', icon: <FiUsers />, path: '/founder/subscribers' },
  { label: 'Manage Subscriptions', icon: <FiCreditCard />, path: '/founder/subscriptions' },
  { label: 'Voucher Management', icon: <FiTag />, path: '/founder/vouchers' },
  { label: 'Company Management', icon: <FiGlobe />, path: '/founder/companies' },
];

const SYSTEM_ITEMS = [
  { label: 'Website Analytics', icon: <FiBarChart2 />, path: '/founder/analytics' },
  { label: 'Broadcast Notifications', icon: <FiBell />, path: '/founder/broadcast' },
  { label: 'Client Support', icon: <FiMessageCircle />, path: '/founder/support', badge: true },
  { label: 'Backup & Security', icon: <FiDatabase />, path: '/founder/backup' },
  { label: 'Platform Settings', icon: <FiSettings />, path: '/founder/platform-settings' },
];

export default function FounderSidebar({ openComplaints = 0 }) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('founder_sidebar_collapsed') === 'true'
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
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'F';
  const avatarUrl = employee?.photo_url || user?.user_metadata?.avatar_url || null;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

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
      {/* Mobile Header */}
      <div className="founder-mobile-header">
        <button className="founder-mobile-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <FiX /> : <FiMenu />}
        </button>
        <span className="founder-mobile-brand">HRIS Loka</span>
      </div>

      {/* Overlay */}
      <div
        className={`founder-sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`founder-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* Brand */}
        <div className="founder-sidebar-brand">
          <img src="/landing/hrislokalogo.jpeg" alt="HRIS Loka" className="founder-sidebar-logo" />
          {!collapsed && (
            <>
              <div>
                <div className="founder-sidebar-brand-text">HRIS Loka</div>
                <div className="founder-sidebar-badge">
                  <FiShield size={8} />
                  Founder Portal
                </div>
              </div>
            </>
          )}
          <button
            className="founder-sidebar-collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <FiMenu size={14} />
          </button>
        </div>

        {/* User Card */}
        <div className={`founder-user-card ${collapsed ? 'collapsed' : ''}`}>
          <div className="founder-user-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : userInitials}
          </div>
          {!collapsed && (
            <div className="founder-user-info">
              <div className="founder-user-name">{userName}</div>
              <div className="founder-user-role">Founder</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="founder-nav">
          {!collapsed && <div className="founder-nav-section">Main</div>}

          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`founder-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNav(item.path)}
              title={collapsed ? item.label : ''}
            >
              <span className="founder-nav-icon">{item.icon}</span>
              {!collapsed && <span className="founder-nav-label">{item.label}</span>}
            </button>
          ))}

          {!collapsed && <div className="founder-nav-section">System</div>}
          {collapsed && <div className="founder-nav-divider" />}

          {SYSTEM_ITEMS.map(item => (
            <button
              key={item.path}
              className={`founder-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNav(item.path)}
              title={collapsed ? item.label : ''}
            >
              <span className="founder-nav-icon">{item.icon}</span>
              {!collapsed && <span className="founder-nav-label">{item.label}</span>}
              {!collapsed && item.badge && openComplaints > 0 && (
                <span className="founder-nav-badge">{openComplaints}</span>
              )}
              {collapsed && item.badge && openComplaints > 0 && (
                <span className="founder-nav-badge">{openComplaints}</span>
              )}
            </button>
          ))}

          <div className="founder-nav-divider" />

          {/* Switch to Admin View */}
          <button
            className="founder-switch-btn"
            onClick={() => handleNav('/dashboard')}
            title={collapsed ? 'Switch to Admin View' : ''}
          >
            <span className="founder-nav-icon"><FiExternalLink /></span>
            {!collapsed && <span className="founder-nav-label">Switch to Admin View</span>}
          </button>
        </nav>

        {/* Footer */}
        <div className="founder-sidebar-footer">
          <button
            className="founder-nav-item"
            style={{ color: 'rgba(255,255,255,0.35)', width: '100%' }}
            onClick={handleSignOut}
            title={collapsed ? 'Sign Out' : ''}
          >
            <span className="founder-nav-icon"><FiLogOut /></span>
            {!collapsed && <span className="founder-nav-label">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
