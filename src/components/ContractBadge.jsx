import { getContractDaysRemaining } from '../lib/utils';

export default function ContractBadge({ contractEnd, status }) {
    if (status === 'permanent') {
        return <span className="status-badge permanent">Karyawan Tetap</span>;
    }

    const days = getContractDaysRemaining(contractEnd);
    if (days === null) return <span className="status-badge contract">Kontrak</span>;

    const months = Math.floor(days / 30);
    const remainingDays = days % 30;

    let urgency = 'normal';
    if (days <= 30) urgency = 'critical';
    else if (days <= 90) urgency = 'warning';

    const colors = {
        critical: { background: 'rgba(220,38,38,0.08)', color: '#DC2626' },
        warning: { background: 'rgba(245,158,11,0.08)', color: '#D97706' },
        normal: { background: 'rgba(0,71,171,0.06)', color: '#0047AB' },
    };

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
            <span className="status-badge contract">Kontrak</span>
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    ...colors[urgency],
                }}
            >
                {days === 0
                    ? 'Kontrak habis hari ini'
                    : months > 0
                        ? `${months} bln ${remainingDays} hari lagi`
                        : `${days} hari lagi`}
            </span>
        </div>
    );
}
