import { FiInbox } from 'react-icons/fi';

/**
 * Reusable EmptyState component with premium illustration
 * @param {string} title - Main message
 * @param {string} description - Sub message 
 * @param {ReactNode} icon - Custom icon (optional)
 * @param {ReactNode} action - Action button (optional)
 * @param {string} size - 'sm' | 'md' | 'lg' (default: 'md')
 */
export default function EmptyState({ title = 'Belum ada data', description, icon, action, size = 'md' }) {
 const sizes = {
 sm: { padding: '32px 16px', iconBox: 56, iconSize: 22, titleSize: 14, descSize: 12 },
 md: { padding: '60px 24px', iconBox: 80, iconSize: 32, titleSize: 16, descSize: 13 },
 lg: { padding: '80px 32px', iconBox: 96, iconSize: 38, titleSize: 18, descSize: 14 },
 };
 const s = sizes[size] || sizes.md;

 return (
 <div style={{
 display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
 padding: s.padding, textAlign: 'center', animation: 'fadeInUp 0.4s ease',
 }}>
 <div style={{
 width: s.iconBox, height: s.iconBox, borderRadius: s.iconBox * 0.3,
 background: 'linear-gradient(135deg, var(--primary-light), rgba(0,71,171,0.04))',
 color: 'var(--primary)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: s.iconSize, marginBottom: 20,
 border: '1.5px solid rgba(0,71,171,0.08)',
 }}>
 {icon || <FiInbox />}
 </div>
 {/* Decorative shadow */}
 <svg width="100" height="6" viewBox="0 0 100 6" style={{ marginBottom: 20, opacity: 0.08 }}>
 <ellipse cx="50" cy="3" rx="50" ry="3" fill="var(--text)" />
 </svg>
 <div style={{ fontSize: s.titleSize, fontWeight: 700, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.3px' }}>{title}</div>
 {description && <div style={{ fontSize: s.descSize, color: 'var(--text-tertiary)', maxWidth: 320, lineHeight: 1.7 }}>{description}</div>}
 {action && <div style={{ marginTop: 20 }}>{action}</div>}
 </div>
 );
}
