/**
 * SkeletonFounder — Shared skeleton components for Founder Portal pages
 */

export function SkeletonBox({ w = '100%', h = 28, style = {} }) {
  return (
    <div style={{
      height: h, background: 'var(--border)', borderRadius: 8,
      width: w, animation: 'fp-pulse 1.5s ease-in-out infinite', ...style
    }} />
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><SkeletonBox w={i === 0 ? '80%' : '60%'} h={14} /></td>
      ))}
    </tr>
  );
}

export function SkeletonPage({ cols = 5, rows = 6, hasStats = false }) {
  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div><SkeletonBox w={200} h={28} /><SkeletonBox w={300} h={14} style={{ marginTop: 8 }} /></div>
          <SkeletonBox w={120} h={38} style={{ borderRadius: 10 }} />
        </div>
      </div>
      {hasStats && (
        <div className="fp-stats" style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="fp-stat">
              <SkeletonBox w={40} h={40} style={{ borderRadius: 10, marginBottom: 14 }} />
              <SkeletonBox w="55%" h={28} style={{ marginBottom: 8 }} />
              <SkeletonBox w="70%" h={12} />
            </div>
          ))}
        </div>
      )}
      <div className="fp-card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
          <SkeletonBox w={260} h={36} style={{ borderRadius: 8 }} />
          <SkeletonBox w={120} h={36} style={{ borderRadius: 8 }} />
        </div>
        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead>
              <tr>{Array.from({ length: cols }).map((_, i) => <th key={i}><SkeletonBox w={i === 0 ? 100 : 80} h={12} /></th>)}</tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => <TableRowSkeleton key={i} cols={cols} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
