import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './DashboardLayout.css';

export default function DashboardLayout() {
    return (
        <div className="layout-wrapper">
            <Sidebar />
            <main className="layout-content">
                <Outlet />
            </main>
        </div>
    );
}
