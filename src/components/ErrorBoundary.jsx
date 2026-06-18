import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
              background: 'rgba(220, 38, 38, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text, #1A1D21)', marginBottom: 8 }}>
              Terjadi Kesalahan
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #6B7280)', lineHeight: 1.6, marginBottom: 24 }}>
              Halaman ini mengalami error. Coba muat ulang atau kembali ke halaman sebelumnya.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 22px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #0047AB, #0052CC)',
                  color: '#fff', fontSize: 13, fontWeight: 700, border: 'none',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,71,171,0.25)',
                }}
              >
                Coba Lagi
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                style={{
                  padding: '10px 22px', borderRadius: 10,
                  background: 'var(--surface, #fff)', color: 'var(--text, #1A1D21)',
                  fontSize: 13, fontWeight: 600,
                  border: '1.5px solid var(--border, #EAECF0)',
                  cursor: 'pointer',
                }}
              >
                Ke Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
