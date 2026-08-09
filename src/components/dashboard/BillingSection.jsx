import { FiChevronDown, FiChevronUp, FiExternalLink } from 'react-icons/fi';

export default function BillingSection({ billing, showPayment, setShowPayment, navigate }) {
  // Always show a card — Free / plan from subscription
  const plan = billing?.plan || 'Free';
  const next = billing?.next_billing || billing?.renewal_date || null;
  const status = billing?.status || 'none';

  return (
    <div className="dash-section">
      <div className="dash-card dash-billing-card" style={{ cursor: 'pointer' }} onClick={() => setShowPayment(!showPayment)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 600, marginBottom: 4 }}>BILLING</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{plan}</div>
            {status && status !== 'none' && (
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2, textTransform: 'capitalize' }}>
                {String(status).replace(/_/g, ' ')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {next && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, opacity: 0.6 }}>Next billing</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{next}</div>
              </div>
            )}
            {showPayment ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
          </div>
        </div>
        {showPayment && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate('/settings'); }}
              style={{ fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--dash-font)' }}
            >
              Kelola Langganan <FiExternalLink size={12} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate('/checkout'); }}
              style={{ fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.95)', color: '#5654D4', cursor: 'pointer', fontFamily: 'var(--dash-font)' }}
            >
              {['active', 'trial', 'warning_7', 'warning_3', 'critical'].includes(status) ? 'Perpanjang' : 'Upgrade'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
