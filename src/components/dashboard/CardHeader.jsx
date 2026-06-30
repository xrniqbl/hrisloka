import { FiMoreHorizontal } from 'react-icons/fi';

export default function CardHeader({ icon, title, badge, badgeColor = 'purple', rightContent, onMenu }) {
  return (
    <div className="dash-card-header">
      <div className="dash-card-header-left">
        {icon && <div className="dash-card-header-icon">{icon}</div>}
        <span className="dash-card-header-title">{title}</span>
        {badge && (
          <span className={`dash-badge dash-badge-${badgeColor}`}>{badge}</span>
        )}
      </div>
      <div className="dash-card-header-right">
        {rightContent}
        {onMenu !== false && (
          <button className="dash-card-menu-btn" onClick={onMenu}>
            <FiMoreHorizontal size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
