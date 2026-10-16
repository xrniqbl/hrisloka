import { Icon } from '@astryxdesign/core/Icon';
import { MoreHorizontal } from 'lucide-react';

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
          <button type="button" className="dash-card-menu-btn" onClick={onMenu} aria-label="Menu">
            <Icon icon={MoreHorizontal} size="sm" color="inherit" />
          </button>
        )}
      </div>
    </div>
  );
}
