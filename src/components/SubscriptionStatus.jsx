import { useState, useEffect, useCallback } from 'react';
import { HiBolt, HiArrowPath, HiExclamationTriangle, HiCheckCircle, HiXCircle, HiClock, HiCalendarDays, HiCreditCard, HiChevronRight } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import {
  getMySubscription,
  checkAndExpireSubscription,
  getDaysRemaining,
  getExpiryWarning,
  getSubscriptionStatus,
  formatIDR,
} from '../services/subscriptionService';
import './SubscriptionStatus.css';

const STATUS_META = {
  active:     { color: '#10B981', bg: '#D1FAE5', icon: HiCheckCircle,       label: 'Aktif' },
  free:       { color: '#64748B', bg: '#F1F5F9', icon: HiCheckCircle,       label: 'Gratis' },
  warning_7:  { color: '#3B82F6', bg: '#DBEAFE', icon: HiClock,             label: 'Aktif' },
  warning_3:  { color: '#F59E0B', bg: '#FEF3C7', icon: HiExclamationTriangle, label: 'Segera Habis' },
  critical:   { color: '#EF4444', bg: '#FEE2E2', icon: HiExclamationTriangle, label: 'Kritis' },
  expired:    { color: '#DC2626', bg: '#FEE2E2', icon: HiXCircle,           label: 'Kadaluarsa' },
  cancelled:  { color: '#9CA3AF', bg: '#F3F4F6', icon: HiXCircle,           label: 'Dibatalkan' },
  none:       { color: '#9CA3AF', bg: '#F3F4F6', icon: HiXCircle,           label: 'Tidak Ada' },
};

const PLAN_COLORS = {
  free:       '#64748B',
  starter:    '#3B82F6',
  pro:        '#7C3AED',
  enterprise: '#D97706',
};

export default function SubscriptionStatus({ compact = false }) {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const enriched = await checkAndExpireSubscription();
    setSub(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh every hour to keep days_remaining accurate
  useEffect(() => {
    const id = setInterval(load, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return (
    <div className="sub-status-skeleton">
      <div className="sub-skeleton-bar" style={{ width: 120 }} />
      <div className="sub-skeleton-bar" style={{ width: 80, marginTop: 6 }} />
    </div>
  );

  if (!sub) return (
    <div className="sub-status-none" onClick={() => navigate('/checkout')}>
      <HiBolt size={16} />
      <span>Mulai Berlangganan</span>
      <HiChevronRight size={14} />
    </div>
  );

  const status   = sub.computed_status || getSubscriptionStatus(sub);
  const meta     = STATUS_META[status] || STATUS_META.active;
  const days     = sub.days_remaining ?? getDaysRemaining(sub.expires_at);
  const warning  = getExpiryWarning(sub);
  const planColor = PLAN_COLORS[sub.plan_slug] || '#3B82F6';

  const expiryDate = sub.expires_at
    ? new Date(sub.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // Compute progress bar width (days used / total days)
  let progressPct = 100;
  if (sub.plan_slug !== 'free' && sub.starts_at && sub.expires_at) {
    const totalMs = new Date(sub.expires_at) - new Date(sub.starts_at);
    const usedMs  = Date.now() - new Date(sub.starts_at).getTime();
    const remainPct = Math.max(0, Math.min(100, ((totalMs - usedMs) / totalMs) * 100));
    progressPct = Math.round(remainPct);
  }

  if (compact) {
    return (
      <div className="sub-status-compact" style={{ borderColor: meta.color }} onClick={() => navigate('/settings')}>
        <meta.icon size={14} color={meta.color} />
        <span style={{ color: meta.color, fontWeight: 700, fontSize: 12 }}>
          {sub.plan_label || sub.plan_slug}
        </span>
        {days !== Infinity && (
          <span style={{ fontSize: 11, color: '#64748B' }}>· {days} hari</span>
        )}
      </div>
    );
  }

  return (
    <div className="sub-status-card">
      {/* Header */}
      <div className="sub-status-header">
        <div className="sub-plan-badge" style={{ background: `${planColor}15`, borderColor: `${planColor}30` }}>
          <HiBolt size={14} color={planColor} />
          <span style={{ color: planColor, fontWeight: 800, fontSize: 13 }}>
            {sub.plan_label || sub.plan_name || sub.plan_slug}
          </span>
          <span className="sub-cycle-badge" style={{ background: planColor }}>
            {sub.billing_label || (sub.billing_cycle === 'yearly' ? 'Tahunan' : 'Bulanan')}
          </span>
        </div>
        <div className="sub-status-badge" style={{ background: meta.bg, color: meta.color }}>
          <meta.icon size={12} />
          <span>{meta.label}</span>
        </div>
      </div>

      {/* Days remaining hero */}
      {sub.plan_slug !== 'free' && (
        <div className="sub-days-hero">
          <div className="sub-days-number" style={{ color: meta.color }}>
            {days === 0 ? (
              <span style={{ fontSize: 18 }}>Kadaluarsa</span>
            ) : (
              <>
                <span>{days}</span>
                <span className="sub-days-label">hari tersisa</span>
              </>
            )}
          </div>

          {/* Progress bar */}
          <div className="sub-progress-wrap">
            <div
              className="sub-progress-bar"
              style={{
                width: `${progressPct}%`,
                background: progressPct > 30
                  ? `linear-gradient(90deg, ${planColor}, ${planColor}BB)`
                  : 'linear-gradient(90deg, #EF4444, #F87171)',
              }}
            />
          </div>
          <div className="sub-progress-labels">
            <span>Mulai: {sub.starts_at ? new Date(sub.starts_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
            <span>Berakhir: {expiryDate || '-'}</span>
          </div>
        </div>
      )}

      {/* Warning banner */}
      {warning && ['error', 'warning'].includes(warning.level) && (
        <div className="sub-warning-banner" style={{
          background: warning.level === 'error' ? '#FEF2F2' : '#FFFBEB',
          borderColor: warning.level === 'error' ? '#FCA5A5' : '#FCD34D',
          color: warning.level === 'error' ? '#DC2626' : '#D97706',
        }}>
          <HiExclamationTriangle size={14} />
          <span>{warning.message}</span>
        </div>
      )}

      {/* Details row */}
      <div className="sub-details-row">
        {[
          { icon: HiCreditCard,    label: 'Metode', value: sub.payment_method || '-' },
          { icon: HiCalendarDays,  label: 'Siklus',  value: sub.billing_label || '-' },
          ...(sub.price_paid !== undefined ? [{ icon: HiBolt, label: 'Bayar', value: formatIDR(sub.price_paid) }] : []),
        ].map((item, i) => (
          <div key={i} className="sub-detail-item">
            <item.icon size={12} style={{ color: '#94A3B8' }} />
            <div>
              <div className="sub-detail-label">{item.label}</div>
              <div className="sub-detail-value">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Buttons */}
      <div className="sub-cta-row">
        {(status === 'expired' || status === 'critical' || status === 'warning_3') && (
          <button className="sub-btn-renew" onClick={() => navigate('/checkout')}>
            <HiArrowPath size={14} />
            Perpanjang Sekarang
          </button>
        )}
        {status === 'warning_7' && (
          <button className="sub-btn-renew-soft" onClick={() => navigate('/checkout')}>
            <HiArrowPath size={14} />
            Perpanjang
          </button>
        )}
        <button className="sub-btn-refresh" onClick={load} title="Refresh">
          <HiArrowPath size={13} />
        </button>
      </div>
    </div>
  );
}
