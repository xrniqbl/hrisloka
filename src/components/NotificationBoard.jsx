import { useState, useEffect } from 'react';
import { FiGift, FiAlertTriangle, FiInbox, FiClock, FiBell } from 'react-icons/fi';
import * as employeeService from '../services/employeeService';
import * as leaveService from '../services/leaveService';
import './NotificationBoard.css';

function getContractDaysRemaining(contractEnd) {
    if (!contractEnd) return Infinity;
    return Math.ceil((new Date(contractEnd) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function NotificationBoard() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const { data: empData } = await employeeService.getAllEmployees();
                const { data: leaveData } = await leaveService.getAllLeaves();
                const employees = empData || [];
                const leaves = leaveData || [];
                const items = [];
                const now = new Date();
                const weekFromNow = new Date(now);
                weekFromNow.setDate(weekFromNow.getDate() + 7);

                // Birthdays this week
                employees.forEach((emp) => {
                    const bdStr = emp.birth_date || emp.birthDate;
                    if (!bdStr) return;
                    const bd = new Date(bdStr);
                    const bday = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
                    if (bday >= now && bday <= weekFromNow) {
                        const daysUntil = Math.ceil((bday - now) / (1000 * 60 * 60 * 24));
                        items.push({
                            type: 'birthday',
                            icon: <FiGift />,
                            text: <><strong>{emp.name}</strong> berulang tahun {daysUntil === 0 ? 'hari ini!' : `dalam ${daysUntil} hari`}</>,
                            time: bday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                        });
                    }
                });

                // Expiring contracts (within 60 days)
                employees.filter((e) => e.status === 'contract' && (e.contract_end || e.contractEnd)).forEach((emp) => {
                    const days = getContractDaysRemaining(emp.contract_end || emp.contractEnd);
                    if (days !== null && days <= 60) {
                        items.push({
                            type: 'contract',
                            icon: <FiAlertTriangle />,
                            text: <>Kontrak <strong>{emp.name}</strong> berakhir dalam <strong>{days} hari</strong></>,
                            time: new Date(emp.contract_end || emp.contractEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                        });
                    }
                });

                // Pending leave approvals
                leaves.filter((l) => l.status === 'pending').forEach((leave) => {
                    const emp = employees.find((e) => e.id === leave.employee_id);
                    if (emp) {
                        const typeLabel = leave.type === 'cuti' ? 'Cuti' : leave.type === 'sakit' ? 'Sakit' : 'Izin';
                        items.push({
                            type: 'leave',
                            icon: <FiInbox />,
                            text: <><strong>{emp.name}</strong> mengajukan {typeLabel} ({leave.days} hari) — menunggu approval</>,
                            time: leave.start_date || leave.startDate,
                        });
                    }
                });

                setNotifications(items);
            } catch (err) {
                console.error('NotificationBoard error:', err);
            }
            setLoading(false);
        }
        load();
    }, []);

    return (
        <div className="notification-board">
            <div className="notification-board-header">
                <span className="notification-board-title">
                    <FiBell style={{ marginRight: 6, opacity: 0.6 }} />
                    Notifikasi
                    {notifications.length > 0 && (
                        <span className="notification-board-count">{notifications.length}</span>
                    )}
                </span>
            </div>
            <div className="notification-list">
                {loading ? (
                    <div style={{ padding: '24px 20px' }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div className="skeleton skeleton-text" style={{ width: '90%', height: 12, marginBottom: 6 }} />
                                    <div className="skeleton skeleton-text short" style={{ height: 10 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                        <FiBell style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }} />
                        <div>Tidak ada notifikasi saat ini.</div>
                    </div>
                ) : (
                    notifications.map((n, i) => (
                        <div className="notification-item" key={i}>
                            <div className={`notification-icon ${n.type}`}>{n.icon}</div>
                            <div className="notification-content">
                                <div className="notification-text">{n.text}</div>
                                <div className="notification-time">{n.time}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
