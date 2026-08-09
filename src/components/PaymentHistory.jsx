import { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';
import { getMyPaymentHistory, formatIDR } from '../services/subscriptionService';
import { downloadInvoicePdf } from '../lib/invoicePdf';
import { useAuth } from '../context/AuthContext';

const STATUS_META = {
  paid:    { label: 'Lunas',    color: '#16A34A', bg: 'rgba(22,163,74,0.12)' },
  pending: { label: 'Menunggu', color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  failed:  { label: 'Gagal',    color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
  expired: { label: 'Kadaluarsa', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
};

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function PaymentHistory({ companyName }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await getMyPaymentHistory();
    if (err) setError('Gagal memuat riwayat pembayaran.');
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          title="Muat ulang"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
            border: '1px solid var(--border, #e5e7eb)', background: 'transparent',
            color: 'var(--text-secondary, #6b7280)', cursor: 'pointer',
          }}
        >
          <FiRefreshCw size={12} /> Refresh
        </button>
      </div>

      {loading && (
        <p className="settings-card-desc" style={{ margin: 0 }}>Memuat riwayat…</p>
      )}

      {!loading && error && (
        <p className="settings-card-desc" style={{ margin: 0, color: '#DC2626' }}>{error}</p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="settings-card-desc" style={{ margin: 0 }}>
          Belum ada transaksi. Pembayaran pertama Anda akan muncul di sini.
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row) => {
            const meta = STATUS_META[row.status] || STATUS_META.pending;
            const cycle = row.billing_cycle === 'yearly' ? 'Tahunan' : 'Bulanan';
            return (
              <div
                key={row.order_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--border, #e5e7eb)',
                }}
              >
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {row.plan_name || row.plan_slug || 'Langganan'} · {cycle}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                    {formatDate(row.created_at)} · {row.order_id}
                  </div>
                </div>

                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                  color: meta.color, background: meta.bg,
                }}>
                  {meta.label}
                </span>

                <div style={{ fontSize: 13, fontWeight: 700, minWidth: 90, textAlign: 'right' }}>
                  {formatIDR(row.amount)}
                </div>

                {row.status === 'paid' && (
                  <button
                    type="button"
                    onClick={() => downloadInvoicePdf(row, { companyName, userEmail: user?.email })}
                    title="Unduh invoice PDF"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                      border: 'none', background: '#5654D4', color: '#fff', cursor: 'pointer',
                    }}
                  >
                    <FiDownload size={12} /> Invoice
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
