import { FiInbox, FiCalendar, FiFileText, FiUsers, FiDollarSign, FiClipboard, FiClock, FiPackage, FiTrendingUp } from 'react-icons/fi';

const defaultIcons = {
    leave: FiCalendar,
    document: FiFileText,
    employee: FiUsers,
    payroll: FiDollarSign,
    expense: FiClipboard,
    attendance: FiClock,
    asset: FiPackage,
    default: FiInbox,
    appraisal: FiTrendingUp,
};

/**
 * EmptyState — Elegant empty state with large icon + friendly message.
 * @param {{ icon?: string, title?: string, description?: string, children?: React.ReactNode }} props
 */
export default function EmptyState({
    icon = 'default',
    title = 'Belum ada data',
    description = 'Data akan muncul di sini setelah tersedia.',
    children,
}) {
    const IconComponent = defaultIcons[icon] || defaultIcons.default;

    return (
        <div className="empty-state-container">
            <div className="empty-state-icon">
                <IconComponent />
            </div>
            <div className="empty-state-title">{title}</div>
            <div className="empty-state-desc">{description}</div>
            {children && <div style={{ marginTop: 20 }}>{children}</div>}
        </div>
    );
}
