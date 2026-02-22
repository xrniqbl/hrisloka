import '../styles/shared.css';

/**
 * TableSkeleton — Renders shimmer rows that mimic a data table loading.
 * @param {{ rows?: number, cols?: number }} props
 */
export function TableSkeleton({ rows = 5, cols = 4 }) {
    return (
        <div className="data-table-card">
            {/* Header skeleton */}
            <div style={{ display: 'flex', gap: 24, padding: '16px 24px', background: 'var(--bg)' }}>
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="skeleton skeleton-text" style={{ width: `${60 + Math.random() * 40}px`, height: 12 }} />
                ))}
            </div>
            {/* Rows */}
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

/**
 * CardSkeleton — Grid of shimmer cards (for dashboard stat cards).
 * @param {{ count?: number }} props
 */
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

/**
 * ChartSkeleton — Placeholder for chart area.
 */
export function ChartSkeleton() {
    return (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow-card)' }}>
            <div className="skeleton skeleton-text short" style={{ height: 14, marginBottom: 24 }} />
            <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)' }} />
        </div>
    );
}

/**
 * FormSkeleton — Placeholder for form/modal content.
 * @param {{ fields?: number }} props
 */
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
