import { Component } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import { captureException } from '../lib/sentry';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Reset saat navigasi: error satu halaman tidak boleh mengunci seluruh Routes.
  // Pakai resetKey (mis. pathname) agar boundary per-layout/per-route pulih otomatis.
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  componentDidCatch(error, errorInfo) {    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
    captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo?.componentStack,
        },
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    try {
      localStorage.removeItem('hrisync_last_path');
    } catch { /* ignore */ }
    // Root boundary also wraps /login — go to '/' (not /login) to avoid login-crash loop.
    window.location.href = '/';
  };

  handleClearAndReload = () => {
    try {
      localStorage.removeItem('hrisync_last_path');
      // Clear broken hash navigation
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const isDevelopment = import.meta.env.DEV;
      const errorText = error?.message || error?.toString?.() || 'Unknown error';

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '20px',
          fontFamily: "'Inter Tight', sans-serif",
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '24px',
            padding: '48px 40px',
            maxWidth: '560px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FiAlertTriangle size={40} style={{ color: '#ef4444' }} />
            </div>

            <h1 style={{
              fontSize: '28px',
              fontWeight: '800',
              color: '#f1f5f9',
              margin: '0 0 12px 0',
              letterSpacing: '-0.02em',
            }}>
              Oops! Terjadi Kesalahan
            </h1>

            <p style={{
              fontSize: '15px',
              color: '#94a3b8',
              margin: '0 0 16px 0',
              lineHeight: '1.6',
            }}>
              Aplikasi mengalami masalah yang tidak terduga. Tenang, data Anda aman. Silakan muat ulang halaman atau kembali ke login.
            </p>

            {isDevelopment && errorText && (
              <div style={{
                textAlign: 'left',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 20,
                fontSize: 12,
                color: '#fca5a5',
                fontFamily: 'ui-monospace, monospace',
                wordBreak: 'break-word',
                maxHeight: 120,
                overflow: 'auto',
              }}>
                {errorText}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: isDevelopment && error ? '24px' : '0',
            }}>
              <button
                onClick={this.handleClearAndReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #5654D4 0%, #4543C0 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 12px rgba(86, 84, 212, 0.4)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(86, 84, 212, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(86, 84, 212, 0.4)';
                }}
              >
                <FiRefreshCw size={16} />
                Muat Ulang
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 28px',
                  background: 'rgba(71, 85, 105, 0.5)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(71, 85, 105, 0.7)';
                  e.target.style.borderColor = 'rgba(148, 163, 184, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(71, 85, 105, 0.5)';
                  e.target.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                }}
              >
                <FiHome size={16} />
                Beranda
              </button>
            </div>

            {isDevelopment && error && (
              <details style={{
                textAlign: 'left',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '24px',
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#f87171',
                  marginBottom: '12px',
                  userSelect: 'none',
                }}>
                  Detail Error (Development Only)
                </summary>
                <div style={{
                  fontSize: '12px',
                  color: '#cbd5e1',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: '1.5',
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ color: '#f87171' }}>Error:</strong>
                    <div style={{ marginTop: '4px', color: '#fca5a5' }}>
                      {error.toString()}
                    </div>
                  </div>
                  {errorInfo?.componentStack && (
                    <div>
                      <strong style={{ color: '#f87171' }}>Component Stack:</strong>
                      <div style={{ marginTop: '4px', color: '#94a3b8' }}>
                        {errorInfo.componentStack}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(148, 163, 184, 0.2)',
              fontSize: '12px',
              color: '#64748b',
            }}>
              Jika masalah berlanjut, hubungi support: 
              <a 
                href="mailto:support@kinikerja.id" 
                style={{ 
                  color: '#818CF8', 
                  textDecoration: 'none',
                  marginLeft: '4px',
                }}
              >
                support@kinikerja.id
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
