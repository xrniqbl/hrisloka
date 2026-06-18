import { useMemo } from 'react';
import {
  HiBellAlert,
  HiCheckCircle,
  HiExclamationTriangle
} from 'react-icons/hi2';

/**
 * Profile Completion Progress Bar
 * Checks mandatory fields and shows color-coded completion percentage.
 * Red (<50%), Yellow (<80%), Green (>=80%), Full green (100%)
 */

const MANDATORY_FIELDS = [
 { key: 'photo_url', label: 'Foto Profil', group: 'personal' },
 { key: 'gender', label: 'Jenis Kelamin', group: 'personal' },
 { key: 'birth_date', label: 'Tanggal Lahir', group: 'personal' },
 { key: 'religion', label: 'Agama', group: 'personal' },
 { key: 'marital_status', label: 'Status Pernikahan', group: 'personal' },
 { key: 'address', label: 'Alamat Domisili', group: 'contact' },
 { key: 'phone', label: 'No. Telepon', group: 'contact' },
 { key: 'emergency_contact', label: 'Kontak Darurat', group: 'contact', isJson: true },
 { key: 'bank_account', label: 'Rekening Bank', group: 'financial', isJson: true },
 { key: 'npwp', label: 'NPWP', group: 'financial' },
 { key: 'bpjs_kesehatan', label: 'BPJS Kesehatan', group: 'financial' },
 { key: 'education', label: 'Pendidikan', group: 'education', isJson: true },
 { key: 'nik', label: 'NIK/KTP', group: 'personal' },
];

function isFieldFilled(emp, field) {
 const val = emp[field.key];
 if (field.isJson) {
 if (!val) return false;
 if (typeof val === 'object' && Object.keys(val).length === 0) return false;
 if (typeof val === 'object' && field.key === 'emergency_contact') return !!val.name;
 if (typeof val === 'object' && field.key === 'bank_account') return !!val.bank_name;
 if (typeof val === 'object' && field.key === 'education') return !!val.level;
 return true;
 }
 return val !== null && val !== undefined && val !== '';
}

export default function ProfileCompletionBar({ employee }) {
 const { percentage, filled, total, missing } = useMemo(() => {
 const filledList = MANDATORY_FIELDS.filter(f => isFieldFilled(employee, f));
 const missingList = MANDATORY_FIELDS.filter(f => !isFieldFilled(employee, f));
 return {
 percentage: Math.round((filledList.length / MANDATORY_FIELDS.length) * 100),
 filled: filledList.length,
 total: MANDATORY_FIELDS.length,
 missing: missingList,
 };
 }, [employee]);

 // Color: red <50%, yellow <80%, green >=80%
 const barColor = percentage >= 80 ? '#16A34A' : percentage >= 50 ? '#F59E0B' : '#DC2626';
 const bgColor = percentage >= 80 ? 'rgba(22,163,74,0.08)' : percentage >= 50 ? 'rgba(245,158,11,0.08)' : 'rgba(220,38,38,0.08)';
 const Icon = percentage >= 80 ? HiCheckCircle : percentage >= 50 ? HiExclamationTriangle : HiBellAlert;

 return (
 <div style={{
 background: bgColor,
 borderRadius: 'var(--radius-md)',
 padding: '12px 16px',
 marginBottom: 16,
 border: `1px solid ${barColor}20`,
 }}>
 {/* Header */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: barColor }}>
 <Icon size={16} />
 Kelengkapan Profil
 </div>
 <div style={{ fontSize: 14, fontWeight: 800, color: barColor }}>
 {percentage}%
 </div>
 </div>

 {/* Progress Bar */}
 <div style={{
 width: '100%',
 height: 8,
 borderRadius: 4,
 background: 'rgba(0,0,0,0.06)',
 overflow: 'hidden',
 }}>
 <div style={{
 width: `${percentage}%`,
 height: '100%',
 borderRadius: 4,
 background: `linear-gradient(90deg, ${barColor}, ${barColor}CC)`,
 transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
 }} />
 </div>

 {/* Details */}
 <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
 {filled}/{total} data terisi
 </div>

 {/* Missing fields (show max 4) */}
 {missing.length > 0 && (
 <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
 {missing.slice(0, 4).map(f => (
 <span key={f.key} style={{
 fontSize: 10, fontWeight: 600,
 padding: '3px 8px', borderRadius: 10,
 background: `${barColor}15`, color: barColor,
 }}>
 {f.label}
 </span>
 ))}
 {missing.length > 4 && (
 <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: `${barColor}15`, color: barColor }}>
 +{missing.length - 4} lainnya
 </span>
 )}
 </div>
 )}
 </div>
 );
}
