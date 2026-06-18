import '../styles/shared.css';

// ── ADMIN skeleton components ─────────────────────────────────────────────────

/**
 * PageSkeleton — Universal full-page loading skeleton.
 * Use when loading=true to replace the entire page content.
 */
export function PageSkeleton({ hasStats = true, tableRows = 6, tableCols = 5 }) {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Header skeleton */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="skeleton skeleton-text" style={{ height: 28, width: 220 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="skeleton" style={{ height: 38, width: 120, borderRadius: 8 }} />
        </div>
      </div>
      {/* Stat cards */}
      {hasStats && (
        <div className="stat-card-grid" style={{ marginBottom: 24 }}>
          {[120, 90, 110, 100].map((w, i) => (
            <div key={i} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow-card)' }}>
              <div className="skeleton skeleton-text" style={{ height: 10, width: w, marginBottom: 14 }} />
              <div className="skeleton skeleton-text" style={{ height: 28, width: '45%', marginBottom: 10 }} />
              <div className="skeleton skeleton-text" style={{ height: 8, width: '65%' }} />
            </div>
          ))}
        </div>
      )}
      {/* Filter bar skeleton */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="skeleton" style={{ height: 38, width: 260, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 38, width: 140, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 38, width: 140, borderRadius: 8 }} />
      </div>
      {/* Table skeleton */}
      <TableSkeleton rows={tableRows} cols={tableCols} />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="data-table-card">
      <div style={{ display: 'flex', gap: 24, padding: '16px 24px', background: 'var(--bg)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton skeleton-text" style={{ width: `${60 + (i * 15)}px`, height: 12 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="skeleton-row">
          <div className="skeleton skeleton-avatar" />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${cols - 1}, 1fr)`, gap: 20 }}>
            {Array.from({ length: cols - 1 }).map((_, ci) => (
              <div key={ci} className="skeleton skeleton-text" style={{ width: ci === 0 ? '85%' : '60%' }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="stat-card-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-card)' }}>
          <div className="skeleton skeleton-text short" style={{ height: 10, marginBottom: 14 }} />
          <div className="skeleton skeleton-text" style={{ height: 28, width: '45%', marginBottom: 10 }} />
          <div className="skeleton skeleton-text medium" style={{ height: 8 }} />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow-card)' }}>
      <div className="skeleton skeleton-text short" style={{ height: 14, marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)' }} />
    </div>
  );
}

export function FormSkeleton({ fields = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <div className="skeleton skeleton-text" style={{ height: 10, width: '40%', marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 42, borderRadius: 'var(--radius-md)' }} />
        </div>
      ))}
    </div>
  );
}

// ── PWA skeleton components ────────────────────────────────────────────────────

const pwaShimmer = {
  background: 'linear-gradient(90deg, var(--border,#e5e7eb) 25%, rgba(255,255,255,0.15) 50%, var(--border,#e5e7eb) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
};

export function SkeletonText({ width = '100%', height = 14, style = {} }) {
  return <div style={{ ...pwaShimmer, width, height, borderRadius: 6, ...style }} />;
}

export function SkeletonCircle({ size = 44 }) {
  return <div style={{ ...pwaShimmer, width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />;
}

export function SkeletonList({ count = 4, withImage = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: 'var(--surface,#fff)',
          borderRadius: 14,
          padding: '12px 14px',
          border: '1px solid var(--border,#e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          opacity: Math.max(0.4, 1 - i * 0.15),
        }}>
          {withImage && <SkeletonCircle size={40} />}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <SkeletonText width={`${55 + (i % 3) * 10}%`} height={14} />
            <SkeletonText width={`${30 + (i % 4) * 8}%`} height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <SkeletonCircle size={46} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonText width={100} height={12} />
            <SkeletonText width={140} height={18} />
          </div>
        </div>
        <SkeletonCircle size={38} />
      </div>
      <div style={{ ...pwaShimmer, height: 100, borderRadius: 20, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: 'var(--surface,#fff)', borderRadius: 14, padding: '14px 10px', border: '1px solid var(--border,#e5e7eb)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <SkeletonCircle size={28} />
            <SkeletonText width="70%" height={16} />
            <SkeletonText width="50%" height={10} />
          </div>
        ))}
      </div>
      <SkeletonText width={120} height={13} style={{ marginBottom: 10 }} />
      <SkeletonList count={3} />
    </div>
  );
}
