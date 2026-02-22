import './StatCard.css';

export default function StatCard({ icon, label, value, change, changeType = 'up', color = 'blue' }) {
    return (
        <div className="stat-card">
            <div className={`stat-card-icon ${color}`}>
                {icon}
            </div>
            <div className="stat-card-content">
                <div className="stat-card-label">{label}</div>
                <div className="stat-card-value">{value}</div>
                {change && (
                    <div className={`stat-card-change ${changeType}`}>
                        {changeType === 'up' ? '↑' : '↓'} {change}
                    </div>
                )}
            </div>
        </div>
    );
}
