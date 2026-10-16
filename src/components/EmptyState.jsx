import { Inbox } from 'lucide-react';
import { Icon } from '@astryxdesign/core/Icon';

/**
 * Clean empty state for HR desktop web — compact, no icon border box.
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
    sm: { padding: '24px 14px', iconSize: 'md', titleSize: 13.5, descSize: 12, gap: 8 },
    md: { padding: '36px 20px', iconSize: 'md', titleSize: 14, descSize: 12.5, gap: 10 },
    lg: { padding: '48px 24px', iconSize: 'lg', titleSize: 15, descSize: 13, gap: 12 },
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
        gap: s.gap,
      }}
    >
      {/* Plain icon only — no border / background box */}
      <span
        className="empty-state-clean-icon"
        style={{
          color: '#9CA3AF',
          display: 'inline-flex',
          lineHeight: 0,
        }}
        aria-hidden
      >
        {icon || <Icon icon={Inbox} size={s.iconSize} color="inherit" />}
      </span>

      <div>
        <div
          style={{
            fontSize: s.titleSize,
            fontWeight: 600,
            color: 'var(--text, #111827)',
            marginBottom: description ? 4 : 0,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              fontSize: s.descSize,
              color: 'var(--muted, #9CA3AF)',
              maxWidth: 280,
              lineHeight: 1.5,
              margin: '0 auto',
            }}
          >
            {description}
          </div>
        ) : null}
      </div>

      {action ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
          {action}
        </div>
      ) : (
        (ctaLabel || secondaryLabel) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
            {ctaLabel && (
              <button type="button" className="btn-primary" onClick={onCta} style={{ padding: '7px 14px', fontSize: 13 }}>
                {ctaLabel}
              </button>
            )}
            {secondaryLabel && (
              <button type="button" className="btn-ghost" onClick={onSecondary} style={{ padding: '7px 14px', fontSize: 13 }}>
                {secondaryLabel}
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
