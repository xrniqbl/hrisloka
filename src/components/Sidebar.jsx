import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    FiGrid, FiUsers, FiCheckSquare, FiClock, FiDollarSign, FiSettings,
    FiChevronRight, FiLogOut, FiMenu, FiX,
    FiList, FiFileText, FiCalendar, FiMap, FiFolder,
    FiRepeat, FiCreditCard, FiRefreshCw,
    FiTarget, FiAward, FiBriefcase, FiUserPlus,
    FiHardDrive, FiMessageSquare, FiCpu, FiUserMinus, FiMapPin, FiCamera, FiBell, FiGitBranch, FiEdit3,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const navItems = [
    {
        label: 'Dashboard',
        icon: <FiGrid />,
        path: '/dashboard',
    },
    {
        label: 'Persetujuan',
        icon: <FiCheckSquare />,
        path: '/approvals',
    },
    {
        label: 'Karyawan',
        icon: <FiUsers />,
        children: [
            { label: 'Data Karyawan', path: '/employees', icon: <FiList /> },
            { label: 'Departemen', path: '/departments', icon: <FiBriefcase /> },
            { label: 'Struktur Organisasi', path: '/org-chart', icon: <FiMap /> },
            { label: 'Dokumen', path: '/documents', icon: <FiFolder /> },
            { label: 'Perubahan Profil', path: '/profile-requests', icon: <FiEdit3 /> },
            { label: 'Cabang', path: '/branches', icon: <FiGitBranch /> },
            { label: 'Exit Clearance', path: '/offboarding', icon: <FiUserMinus /> },
        ],
    },
    {
        label: 'Kehadiran',
        icon: <FiCheckSquare />,
        children: [
            { label: 'Absensi Harian', path: '/attendance', icon: <FiCalendar /> },
            { label: 'Manajemen Shift', path: '/shifts', icon: <FiRepeat /> },
            { label: 'Cuti & Izin', path: '/leave', icon: <FiFileText /> },
            { label: 'Geo-Absensi', path: '/geo-attendance', icon: <FiMapPin /> },
        ],
    },
    {
        label: 'Lembur',
        icon: <FiClock />,
        path: '/overtime',
    },
    {
        label: 'Payroll',
        icon: <FiDollarSign />,
        children: [
            { label: 'Daftar Gaji', path: '/payroll', icon: <FiList /> },
            { label: 'E-Payslip', path: '/payslips', icon: <FiCreditCard /> },
            { label: 'Reimbursement', path: '/reimbursement', icon: <FiRefreshCw /> },
            { label: 'Expense OCR', path: '/expense-ocr', icon: <FiCamera /> },
        ],
    },
    {
        label: 'Proyek',
        icon: <FiFolder />,
        children: [
            { label: 'Manajemen Proyek', path: '/projects', icon: <FiFolder /> },
            { label: 'Timesheet', path: '/timesheets', icon: <FiClock /> },
        ],
    },
    {
        label: 'Performa',
        icon: <FiTarget />,
        children: [
            { label: 'KPI Tracking', path: '/kpi', icon: <FiTarget /> },
            { label: 'Appraisal', path: '/appraisal', icon: <FiAward /> },
        ],
    },
    {
        label: 'Rekrutmen',
        icon: <FiBriefcase />,
        children: [
            { label: 'Lowongan', path: '/jobs', icon: <FiBriefcase /> },
            { label: 'Pipeline Kandidat', path: '/candidates', icon: <FiUserPlus /> },
        ],
    },
    {
        label: 'IT & Support',
        icon: <FiHardDrive />,
        children: [
            { label: 'Aset IT', path: '/assets', icon: <FiHardDrive /> },
            { label: 'Helpdesk', path: '/helpdesk', icon: <FiMessageSquare /> },
        ],
    },
    {
        label: 'AI & Dev',
        icon: <FiCpu />,
        path: '/ai-capability',
    },
    {
        label: 'Pengumuman',
        icon: <FiBell />,
        path: '/announcements',
    },
    {
        label: 'Settings',
        icon: <FiSettings />,
        path: '/settings',
    },
];

export default function Sidebar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState({});
    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    const toggleSubmenu = (label) => {
        setExpandedMenus((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    const handleNavClick = (path) => {
        navigate(path);
        setMobileOpen(false);
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const isChildActive = (children) => {
        return children?.some((child) => location.pathname.startsWith(child.path));
    };

    const userInitials = user?.user_metadata?.full_name
        ? user.user_metadata.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
        : user?.email?.[0]?.toUpperCase() || 'A';

    return (
        <>
            {/* Mobile Header */}
            <div className="mobile-header">
                <button className="mobile-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
                    {mobileOpen ? <FiX /> : <FiMenu />}
                </button>
                <span className="mobile-brand">HRISync</span>
            </div>

            {/* Overlay */}
            <div
                className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">HR</div>
                    <h2>HRISync</h2>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section-label">Main Menu</div>

                    {navItems.map((item) => (
                        <div className="nav-item" key={item.label}>
                            {item.children ? (
                                <>
                                    <button
                                        className={`nav-link ${isChildActive(item.children) ? 'active' : ''}`}
                                        onClick={() => toggleSubmenu(item.label)}
                                    >
                                        <span className="nav-link-icon">{item.icon}</span>
                                        <span className="nav-link-text">{item.label}</span>
                                        <span className={`nav-link-arrow ${expandedMenus[item.label] ? 'open' : ''}`}>
                                            <FiChevronRight />
                                        </span>
                                    </button>
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
                                </>
                            ) : (
                                <div
                                    className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={() => handleNavClick(item.path)}
                                >
                                    <span className="nav-link-icon">{item.icon}</span>
                                    <span className="nav-link-text">{item.label}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar">{userInitials}</div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">
                                {user?.user_metadata?.full_name || user?.email || 'User'}
                            </div>
                            <div className="sidebar-user-role">{user?.user_metadata?.role || 'Admin'}</div>
                        </div>
                        <button className="sidebar-logout" onClick={handleLogout} title="Sign Out">
                            <FiLogOut />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
