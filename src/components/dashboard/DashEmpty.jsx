import { useNavigate } from 'react-router-dom';

/**
 * Compact clean empty state for HR dashboard widgets.
 * Theme tokens — primary CTA + optional secondary.
 */
export default function DashEmpty({
  title = 'Belum ada data',
  description,
  ctaLabel,
  ctaTo,
  onCta,
  secondaryLabel,
  secondaryTo,
  onSecondary,
  icon,
}) {
  const navigate = useNavigate();

  const primary = () => {
    if (onCta) onCta();
    else if (ctaTo) navigate(ctaTo);
  };
  const secondary = () => {
    if (onSecondary) onSecondary();
    else if (secondaryTo) navigate(secondaryTo);
  };

  return (
    <div className="dash-empty dash-empty--cta" role="status">
      {icon != null && <div className="dash-empty-icon">{icon}</div>}
      <div className="dash-empty-title">{title}</div>
      {description && <div className="dash-empty-text">{description}</div>}
      {(ctaLabel || secondaryLabel) && (
        <div className="dash-empty-actions">
          {ctaLabel && (
            <button type="button" className="dash-empty-btn-primary" onClick={primary}>
              {ctaLabel}
            </button>
          )}
          {secondaryLabel && (
            <button type="button" className="dash-empty-btn-ghost" onClick={secondary}>
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
