import { FiInbox } from 'react-icons/fi';

/**
 * Clean empty state for HR desktop web.
 * Theme tokens only — optional primary/secondary action nodes or labels.
 *
 * @param {string} title
 * @param {string} [description]
 * @param {React.ReactNode} [icon]
 * @param {React.ReactNode} [action] Custom action node (preferred for complex CTAs)
 * @param {string} [ctaLabel] Simple primary button label
 * @param {() => void} [onCta]
 * @param {string} [secondaryLabel]
 * @param {() => void} [onSecondary]
 * @param {'sm'|'md'|'lg'} [size]
 */
export default function EmptyState({
  title = 'Belum ada data',
  description,
  icon,
  action,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  size = 'md',
}) {
  const sizes = {
    sm: { padding: '28px 16px', iconBox: 52, iconSize: 22, titleSize: 14, descSize: 12 },
    md: { padding: '48px 24px', iconBox: 64, iconSize: 26, titleSize: 15, descSize: 13 },
    lg: { padding: '64px 28px', iconBox: 72, iconSize: 30, titleSize: 17, descSize: 14 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div
      className="empty-state-clean"
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: s.padding,
        textAlign: 'center',
        animation: 'fadeInUp 0.35s ease',
      }}
    >
      <div
        style={{
          width: s.iconBox,
          height: s.iconBox,
          borderRadius: 18,
          background: 'color-mix(in srgb, var(--primary, #635BFF) 10%, transparent)',
          color: 'var(--primary, #635BFF)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: s.iconSize,
          marginBottom: 16,
          border: '1.5px solid color-mix(in srgb, var(--primary, #635BFF) 16%, transparent)',
        }}
      >
        {icon || <FiInbox size={s.iconSize} />}
      </div>
      <div
        style={{
          fontSize: s.titleSize,
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 6,
          letterSpacing: '-0.2px',
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: s.descSize,
            color: 'var(--muted)',
            maxWidth: 300,
            lineHeight: 1.6,
            marginBottom: action || ctaLabel || secondaryLabel ? 18 : 0,
          }}
        >
          {description}
        </div>
      )}
      {action ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>{action}</div>
      ) : (
        (ctaLabel || secondaryLabel) && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {ctaLabel && (
              <button type="button" className="btn-primary" onClick={onCta}>
                {ctaLabel}
              </button>
            )}
            {secondaryLabel && (
              <button type="button" className="btn-ghost" onClick={onSecondary}>
                {secondaryLabel}
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
