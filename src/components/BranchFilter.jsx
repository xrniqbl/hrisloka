import { useBranch } from '../context/BranchContext';
import { FiMapPin, FiChevronDown } from 'react-icons/fi';

export default function BranchFilter({ style }) {
    const { branches, selectedBranchId, setSelectedBranchId, isBranchAdmin } = useBranch();

    return (
        <div style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            ...style,
        }}>
            <FiMapPin style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: selectedBranchId ? 'var(--primary)' : 'var(--text-tertiary)',
                fontSize: 14, pointerEvents: 'none', zIndex: 1,
            }} />
            <select
                value={selectedBranchId || ''}
                onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
                disabled={isBranchAdmin}
                style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    padding: '8px 36px 8px 34px',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    color: 'var(--text)',
                    background: 'var(--card)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    cursor: isBranchAdmin ? 'not-allowed' : 'pointer',
                    outline: 'none',
                    minWidth: 180,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    opacity: isBranchAdmin ? 0.7 : 1,
                    boxShadow: selectedBranchId ? '0 0 0 2px rgba(0, 71, 171, 0.1)' : 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            >
                <option value="">🏢 Semua Cabang</option>
                {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                        📍 {b.name}
                    </option>
                ))}
            </select>
            <FiChevronDown style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)', fontSize: 14, pointerEvents: 'none',
            }} />
        </div>
    );
}
