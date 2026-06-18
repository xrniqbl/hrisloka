import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/**
 * Reusable Pagination component
 * @param {number} total - Total items
 * @param {number} page - Current page (1-indexed)
 * @param {number} pageSize - Items per page
 * @param {function} onPageChange - (newPage) => void
 * @param {function} onPageSizeChange - (newSize) => void
 */
export default function Pagination({ total = 0, page = 1, pageSize = 10, onPageChange, onPageSizeChange }) {
 const totalPages = Math.max(1, Math.ceil(total / pageSize));
 const from = Math.min((page - 1) * pageSize + 1, total);
 const to = Math.min(page * pageSize, total);

 if (total <= 0) return null;

 const pages = [];
 for (let i = 1; i <= totalPages; i++) {
 if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
 pages.push(i);
 } else if (pages[pages.length - 1] !== '...') {
 pages.push('...');
 }
 }

 return (
 <div style={{
 display: 'flex', alignItems: 'center', justifyContent: 'space-between',
 padding: '14px 20px', borderTop: '1px solid var(--border-light)',
 fontSize: 13, flexWrap: 'wrap', gap: 12,
 }}>
 {/* Info */}
 <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
 Menampilkan {from}–{to} dari {total}
 </div>

 {/* Controls */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
 {/* Page size selector */}
 {onPageSizeChange && (
 <select
 value={pageSize}
 onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
 style={{
 padding: '5px 8px', borderRadius: 'var(--radius-sm)',
 border: '1px solid var(--border)', fontSize: 12, color: 'var(--text)',
 background: 'var(--surface)', marginRight: 10, cursor: 'pointer',
 }}
 >
 {[10, 25, 50].map(s => <option key={s} value={s}>{s}/page</option>)}
 </select>
 )}

 {/* Prev */}
 <button
 onClick={() => onPageChange(page - 1)}
 disabled={page <= 1}
 style={{
 width: 30, height: 30, borderRadius: 'var(--radius-sm)', display: 'flex',
 alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)',
 background: 'var(--surface)', cursor: page <= 1 ? 'not-allowed' : 'pointer',
 color: page <= 1 ? 'var(--text-tertiary)' : 'var(--text)', fontSize: 14,
 transition: 'all 0.15s',
 }}
 >
 <FiChevronLeft />
 </button>

 {/* Page numbers */}
 {pages.map((p, i) => (
 p === '...' ? (
 <span key={`dot-${i}`} style={{ padding: '0 4px', color: 'var(--text-tertiary)' }}>…</span>
 ) : (
 <button
 key={p}
 onClick={() => onPageChange(p)}
 style={{
 width: 30, height: 30, borderRadius: 'var(--radius-sm)', display: 'flex',
 alignItems: 'center', justifyContent: 'center',
 border: page === p ? '1px solid var(--primary)' : '1px solid transparent',
 background: page === p ? 'var(--primary)' : 'transparent',
 color: page === p ? '#fff' : 'var(--text-secondary)',
 fontSize: 12, fontWeight: 600, cursor: 'pointer',
 transition: 'all 0.15s',
 }}
 >
 {p}
 </button>
 )
 ))}

 {/* Next */}
 <button
 onClick={() => onPageChange(page + 1)}
 disabled={page >= totalPages}
 style={{
 width: 30, height: 30, borderRadius: 'var(--radius-sm)', display: 'flex',
 alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)',
 background: 'var(--surface)', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
 color: page >= totalPages ? 'var(--text-tertiary)' : 'var(--text)', fontSize: 14,
 transition: 'all 0.15s',
 }}
 >
 <FiChevronRight />
 </button>
 </div>
 </div>
 );
}
