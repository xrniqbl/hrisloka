/**
 * UserAvatar — profile photo with safe fallback to initials.
 * Avoids broken-image icon when storage URL 403 / missing / invalid.
 */
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

function initialsFrom(name = '') {
  const s = String(name || '').trim();
  if (!s) return '?';
  return s
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Normalize storage / relative paths to a usable src */
function resolvePhotoUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  if (!u || u === 'null' || u === 'undefined') return null;
  if (
    u.startsWith('http://') ||
    u.startsWith('https://') ||
    u.startsWith('data:') ||
    u.startsWith('blob:') ||
    u.startsWith('/')
  ) {
    return u;
  }
  return u.startsWith('avataricon') ? `/${u}` : `/${u.replace(/^\//, '')}`;
}

export default function UserAvatar({
  src,
  name = '',
  alt = '',
  className = '',
  size = 48,
  style,
}) {
  const resolved = resolvePhotoUrl(src);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [resolved]);

  const showImg = resolved && !broken;
  const initials = initialsFrom(name);
  const dim = typeof size === 'number' ? size : undefined;

  return (
    <div
      className={cn('user-avatar', className)}
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--primary, #5654D4), #7C75FF)',
        color: '#fff',
        fontWeight: 700,
        fontSize: dim ? Math.max(11, Math.round(dim * 0.32)) : 14,
        lineHeight: 1,
        ...style,
      }}
      aria-hidden={!alt}
      title={alt || name || undefined}
    >
      {showImg ? (
        <img
          src={resolved}
          alt={alt || name || ''}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
