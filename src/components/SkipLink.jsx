/**
 * SkipLink component for keyboard navigation accessibility.
 * Allows screen reader users to skip repetitive navigation elements.
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      aria-label="Skip to main content"
      style={{
        position: 'absolute',
        top: '-100px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100000,
        padding: '12px 24px',
        background: '#635BFF',
        color: '#fff',
        fontWeight: 700,
        fontSize: '14px',
        borderRadius: '0 0 8px 8px',
        textDecoration: 'none',
        transition: 'top 0.2s ease',
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = '0';
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = '-100px';
      }}
    >
      Skip to main content
    </a>
  );
}
