import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiHome, FiMapPin, FiFileText, FiUser, FiBell } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import './EmployeeLayout.css';

const navItems = [
    { label: 'Home', icon: <FiHome />, path: '/app/home' },
    { label: 'Absen', icon: <FiMapPin />, path: '/app/absen' },
    { label: 'Payslip', icon: <FiFileText />, path: '/app/payslip' },
    { label: 'Profil', icon: <FiUser />, path: '/app/profile' },
];

export default function EmployeeLayout() {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <div className="emp-layout">
            {/* Top Header */}
            <header className="emp-header">
                <div className="emp-header-brand">
                    <div className="emp-logo">HR</div>
                    <span className="emp-brand-text">HRISync</span>
                </div>
                <button className="emp-header-bell" onClick={() => { }} aria-label="Notifikasi">
                    <FiBell />
                    <span className="emp-bell-dot" />
                </button>
            </header>

            {/* Page Content */}
            <main className="emp-content">
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="emp-bottom-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `emp-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="emp-nav-icon">{item.icon}</span>
                        <span className="emp-nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
