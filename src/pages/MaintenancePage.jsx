import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isFounder } from '../lib/rbac';
import './MaintenancePage.css';

export default function MaintenancePage() {
  const navigate = useNavigate();
  const { user, employee } = useAuth();
  const founderUser = isFounder(user, employee);

  const [settings, setSettings] = useState(() => {
    try {
      const s = localStorage.getItem('founder_maintenance_settings');
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });

  const [platform, setPlatform] = useState(() => {
    try {
      const s = localStorage.getItem('founder_platform_settings');
      return s ? JSON.parse(s) : { name: 'HRIS Loka', support_email: 'support@hrisloka.id' };
    } catch {
      return { name: 'HRIS Loka', support_email: 'support@hrisloka.id' };
    }
  });

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (s) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m < 60) return `${m}m ${sec}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };

  return (
    <div className="mnt-root">
      {/* Animated background */}
      <div className="mnt-bg">
        <div className="mnt-orb mnt-orb-1" />
        <div className="mnt-orb mnt-orb-2" />
        <div className="mnt-orb mnt-orb-3" />
        <div className="mnt-grid" />
      </div>

      {/* Content */}
      <div className="mnt-wrapper">
        {/* Logo */}
        <div className="mnt-logo-wrap">
          <img src="/landing/hrislokalogo.jpeg" alt={platform.name} className="mnt-logo" />
          <span className="mnt-brand">{platform.name}</span>
        </div>

        {/* Main card */}
        <div className="mnt-card">
          {/* Status indicator */}
          <div className="mnt-status-row">
            <div className="mnt-pulse-dot" />
            <span className="mnt-status-label">System Maintenance</span>
          </div>

          {/* Icon */}
          <div className="mnt-icon-wrap">
            <svg className="mnt-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="28" width="48" height="28" rx="4" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
              <path d="M20 28V20C20 13.373 25.373 8 32 8C38.627 8 44 13.373 44 20V28" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="32" cy="42" r="5" fill="currentColor"/>
              <line x1="32" y1="47" x2="32" y2="52" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>

          <h1 className="mnt-title">We are under maintenance</h1>
          <p className="mnt-desc">
            {settings.message || 'Platform sedang dalam pemeliharaan terjadwal. Kami sedang melakukan peningkatan sistem untuk memberikan pengalaman yang lebih baik.'}
          </p>

          {/* Details grid */}
          <div className="mnt-details-grid">
            <div className="mnt-detail-item">
              <div className="mnt-detail-label">Status</div>
              <div className="mnt-detail-value mnt-value-warning">In Progress</div>
            </div>
            <div className="mnt-detail-item">
              <div className="mnt-detail-label">Elapsed</div>
              <div className="mnt-detail-value">{formatElapsed(elapsed)}</div>
            </div>
            {settings.expected_duration && (
              <div className="mnt-detail-item">
                <div className="mnt-detail-label">Estimated</div>
                <div className="mnt-detail-value">{settings.expected_duration}</div>
              </div>
            )}
            <div className="mnt-detail-item">
              <div className="mnt-detail-label">Incident</div>
              <div className="mnt-detail-value">Scheduled</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mnt-progress-wrap">
            <div className="mnt-progress-bar">
              <div className="mnt-progress-fill" />
            </div>
            <div className="mnt-progress-labels">
              <span>Starting up</span>
              <span>Finalizing</span>
            </div>
          </div>

          {/* Contact */}
          <div className="mnt-contact">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>For urgent matters, contact <a href={`mailto:${platform.support_email || 'support@hrisloka.id'}`}>{platform.support_email || 'support@hrisloka.id'}</a></span>
          </div>
        </div>

        {/* Founder bypass */}
        {founderUser && (
          <div className="mnt-bypass">
            <div className="mnt-bypass-card">
              <div className="mnt-bypass-badge">Founder Access</div>
              <p className="mnt-bypass-text">You have administrative access and can bypass maintenance mode.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="mnt-bypass-btn" onClick={() => navigate('/founder/platform-settings')}>
                  Manage Maintenance
                </button>
                <button className="mnt-bypass-btn mnt-bypass-btn-outline" onClick={() => navigate('/founder/dashboard')}>
                  Go to Portal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mnt-footer">
          <span>{platform.name} — All rights reserved</span>
          <span>·</span>
          <a href={`mailto:${platform.support_email || 'support@hrisloka.id'}`}>Contact Support</a>
        </div>
      </div>
    </div>
  );
}
