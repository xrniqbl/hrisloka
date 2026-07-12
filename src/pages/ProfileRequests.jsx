import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import {

 FiCheck, FiX, FiUser, FiClock, FiAlertCircle, FiMessageSquare,
 FiEye, FiCalendar, FiChevronDown,
} from 'react-icons/fi';
import { getAllUpdateRequests, approveRequest, rejectRequest } from '../services/profileUpdateService';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';


const fieldLabels = {
 gender: 'Jenis Kelamin',
 birth_date: 'Tanggal Lahir',
 religion: 'Agama',
 blood_type: 'Golongan Darah',
 marital_status: 'Status Pernikahan',
 ktp_address: 'Alamat KTP',
 emergency_contact: 'Kontak Darurat',
 bank_account: 'Informasi Bank',
 npwp: 'NPWP',
 bpjs_kesehatan: 'BPJS Kesehatan',
 bpjs_ketenagakerjaan: 'BPJS Ketenagakerjaan',
 education: 'Pendidikan',
 work_history: 'Riwayat Pekerjaan',
 certifications: 'Sertifikasi',
 name: 'Nama',
 phone: 'Telepon',
 address: 'Alamat Domisili',
 personal_email: 'Email Pribadi',
 whatsapp: 'WhatsApp',
};

const statusConfig = {
 pending: { label: 'Menunggu', color: '#D97706', bg: 'rgba(245,158,11,0.1)' },
 approved: { label: 'Disetujui', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
 rejected: { label: 'Ditolak', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
};

export default function ProfileRequests() {
 const { employee } = useAuth();
 const [requests, setRequests] = useState([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState('pending');
 const [actionLoading, setActionLoading] = useState(null);

 // Detail/reject modal
 const [detailReq, setDetailReq] = useState(null);
 const [rejectModal, setRejectModal] = useState(null);
 const [rejectNote, setRejectNote] = useState('');
 const [rejectLoading, setRejectLoading] = useState(false);

 const fetchRequests = async () => {
 setLoading(true);
 const { data } = await getAllUpdateRequests(filter || undefined);
 setRequests(data || []);
 setLoading(false);
 };

 useEffect(() => { fetchRequests(); }, [filter]);

 // Realtime: auto-refresh when any request changes
 useRealtimeTable('profile_update_requests', fetchRequests, { companyId: currentUser?.company_id });

 const handleApprove = async (req) => {
 setActionLoading(req.id);
 const { error } = await approveRequest(req.id, employee?.id);
 if (error) {
 console.error('[ProfileRequests] Approve error:', error.message);
 }
 await fetchRequests();
 setActionLoading(null);
 if (detailReq?.id === req.id) setDetailReq(null);
 };

 const handleRejectConfirm = async () => {
 if (!rejectModal) return;
 setRejectLoading(true);
 await rejectRequest(rejectModal.id, employee?.id, rejectNote);
 await fetchRequests();
 setRejectLoading(false);
 setRejectModal(null);
 setRejectNote('');
 if (detailReq?.id === rejectModal.id) setDetailReq(null);
 };

 const pending = requests.filter(r => r.status === 'pending').length;
 const approved = requests.filter(r => r.status === 'approved').length;
 const rejected = requests.filter(r => r.status === 'rejected').length;

 const getInitials = (name) => (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
 const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
 const getFieldLabel = (req) => req.field_label || fieldLabels[req.field_name] || req.field_name || 'Informasi Umum';

 return (
 <div className="animate-in">
 {/* Header */}
 <PageHeader titleKey="profile_requests.title" subtitleKey="profile_requests.subtitle" />
  <div className="page-header-actions">
 <select
 className="form-select"
 value={filter}
 onChange={e => setFilter(e.target.value)}
 style={{ maxWidth: 160 }}
 >
 <option value="pending"> Menunggu</option>
 <option value="approved"> Disetujui</option>
 <option value="rejected"> Ditolak</option>
 <option value=""> Semua</option>
 </select>
 </div>

 {/* Stats */}
 <div className="stats-grid">
 {[
 { label: 'Menunggu', value: pending, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: <FiClock /> },
 { label: 'Disetujui', value: approved, color: '#16A34A', bg: 'rgba(22,163,74,0.08)', icon: <FiCheck /> },
 { label: 'Ditolak', value: rejected, color: '#DC2626', bg: 'rgba(220,38,38,0.08)', icon: <FiX /> },
 { label: 'Total', value: requests.length, color: '#635BFF', bg: 'rgba(99,91,255,0.06)', icon: <FiUser /> },
 ].map(s => (
 <div key={s.label} className="info-card">
 <div className="info-card-header">
 <span style={{ color: s.color, padding: '6px', borderRadius: 8, background: s.bg }}>{s.icon}</span>
 <span className="info-card-label">{s.label}</span>
 </div>
 <div className="info-card-value" style={{ color: s.color }}>{s.value}</div>
 </div>
 ))}
 </div>

 {/* Table */}
 {loading ? <TableSkeleton /> : requests.length === 0 ? (
 <EmptyState
 message={filter === 'pending' ? 'Tidak ada permintaan yang menunggu persetujuan.' : 'Tidak ada data untuk filter ini.'}
 />
 ) : (
 <div className="data-table-card">
 <table className="data-table">
 <thead>
 <tr>
 <th>Karyawan</th>
 <th>Field</th>
 <th>Nilai Lama &rarr; Baru</th>
 <th>Tanggal</th>
 <th>Status</th>
 <th className="td-center">Aksi</th>
 </tr>
 </thead>
 <tbody>
 {requests.map(req => {
 const st = statusConfig[req.status] || statusConfig.pending;
 return (
 <tr key={req.id}>
 {/* Employee */}
 <td>
 <div className="btn-icon-row">
 {req.employees?.photo_url ? (
 <img src={req.employees.photo_url} alt="" className="employee-avatar sm" style={{ borderRadius: 10, objectFit: 'cover', border: '2px solid var(--border)' }} />
 ) : (
 <div className="employee-avatar sm" style={{ borderRadius: 10, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
 {getInitials(req.employees?.name)}
 </div>
 )}
 <div>
 <div className="td-semibold td-sm">{req.employees?.name || '-'}</div>
 <div className="td-muted-sm">{req.employees?.nip}  {req.employees?.division || req.employees?.position || '-'}</div>
 </div>
 </div>
 </td>

 {/* Field */}
 <td>
 <span className="badge-outline td-sm td-semibold">
 {getFieldLabel(req)}
 </span>
 </td>

 {/* Values */}
 <td className="td-sm td-truncate" style={{ maxWidth: 260 }}>
 {req.old_value && (
 <div className="td-muted-sm td-truncate" style={{ textDecoration: 'line-through', marginBottom: 2 }}>
 {req.old_value.length > 50 ? req.old_value.slice(0, 50) + '...' : req.old_value}
 </div>
 )}
 <div className="td-truncate" style={{ fontWeight: 600, color: '#16A34A' }}>
 {req.new_value?.length > 60 ? req.new_value.slice(0, 60) + '...' : req.new_value}
 </div>
 </td>

 {/* Date */}
 <td className="td-muted-sm" style={{ whiteSpace: 'nowrap' }}>
 <div className="btn-icon-row" style={{ gap: 5 }}>
 <FiCalendar size={11} /> {formatDate(req.requested_at)}
 </div>
 {req.reviewed_at && (
 <div className="td-muted-sm" style={{ marginTop: 2 }}>
 Review: {formatDate(req.reviewed_at)}
 </div>
 )}
 </td>

 {/* Status */}
 <td>
 <span className="badge" style={{ color: st.color, background: st.bg, whiteSpace: 'nowrap' }}>
 {st.label}
 </span>
 {req.review_note && req.status === 'rejected' && (
 <div className="td-muted-sm" style={{ marginTop: 3, fontStyle: 'italic' }}>
 "{req.review_note}"
 </div>
 )}
 </td>

 {/* Actions */}
 <td>
 <div className="btn-icon-row" style={{ justifyContent: 'center' }}>
 {/* Detail */}
 <button
 className="action-btn"
 title="Lihat Detail"
 onClick={() => setDetailReq(req)}
 ><FiEye size={14} />
 </button>

 {req.status === 'pending' && (
 <>
 <button
 className="action-btn success"
 title="Setujui & Terapkan"
 disabled={actionLoading === req.id}
 onClick={() => handleApprove(req)}
 ><FiCheck size={14} />
 </button>
 <button
 className="action-btn danger"
 title="Tolak"
 disabled={actionLoading === req.id}
 onClick={() => { setRejectModal(req); setRejectNote(''); }}
 >
 <FiX size={14} />
 </button>
 </>
 )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}

 {/* ── Detail Modal ── */}
 {detailReq && (
 <div className="modal-overlay" onClick={() => setDetailReq(null)}>
 <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
 <div className="modal-header">
 <h2><FiEye style={{ marginRight: 8 }} /> Detail Permintaan</h2>
 <button className="modal-close" onClick={() => setDetailReq(null)}><FiX /></button>
 </div>
 <div className="modal-body" style={{ display: 'grid', gap: 14 }}>
 {/* Employee info */}
 <div className="btn-icon-row" style={{ gap: 14, padding: '14px', background: 'var(--bg)', borderRadius: 12 }}>
 {detailReq.employees?.photo_url ? (
 <img src={detailReq.employees.photo_url} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
 ) : (
 <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
 {getInitials(detailReq.employees?.name)}
 </div>
 )}
 <div>
 <div className="td-semibold" style={{ fontSize: 15 }}>{detailReq.employees?.name || '-'}</div>
 <div className="td-muted-sm">{detailReq.employees?.nip}  {detailReq.employees?.division}</div>
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
 <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 10 }}>
 <div className="section-label" style={{ marginBottom: 4 }}>Field</div>
 <div className="td-semibold td-sm">{getFieldLabel(detailReq)}</div>
 </div>
 <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 10 }}>
 <div className="section-label" style={{ marginBottom: 4 }}>Tanggal Request</div>
 <div className="td-semibold td-sm">{formatDate(detailReq.requested_at)}</div>
 </div>
 </div>

 {detailReq.old_value && (
 <div style={{ padding: '12px 14px', background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)', borderRadius: 10 }}>
 <div className="section-label td-danger-bold" style={{ marginBottom: 6 }}>Nilai Lama</div>
 <div className="td-sm">{detailReq.old_value}</div>
 </div>
 )}
 <div style={{ padding: '12px 14px', background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.15)', borderRadius: 10 }}>
 <div className="section-label" style={{ color: '#16A34A', marginBottom: 6 }}>Nilai Baru yang Diminta</div>
 <div className="td-sm" style={{ whiteSpace: 'pre-wrap' }}>{detailReq.new_value}</div>
 </div>

 {detailReq.review_note && (
 <div className="btn-icon-row" style={{ gap: 8, padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10 }}>
 <FiMessageSquare size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
 <div>
 <div className="section-label" style={{ color: '#D97706', marginBottom: 4 }}>Catatan Review</div>
 <div className="td-sm">{detailReq.review_note}</div>
 </div>
 </div>
 )}
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => setDetailReq(null)}>Tutup</button>
 {detailReq.status === 'pending' && (
 <>
 <button
 className="btn-danger"
 onClick={() => { setRejectModal(detailReq); setRejectNote(''); setDetailReq(null); }}
 >
 <FiX size={14} /> Tolak
 </button>
 <button
 className="btn-primary"
 disabled={actionLoading === detailReq.id}
 onClick={() => handleApprove(detailReq)}
 ><FiCheck size={14} /> {actionLoading === detailReq.id ? 'Memproses...' : 'Setujui & Terapkan'}
 </button>
 </>
 )}
 </div>
 </div>
 </div>
 )}

 {/* ── Reject Modal with reason ── */}
 {rejectModal && (
 <div className="modal-overlay" onClick={() => setRejectModal(null)}>
 <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
 <div className="modal-header">
 <h2 className="td-danger-bold"><FiX style={{ marginRight: 8 }} /> Tolak Permintaan</h2>
 <button className="modal-close" onClick={() => setRejectModal(null)}><FiX /></button>
 </div>
 <div className="modal-body">
 <div className="mb" style={{ padding: '12px 14px', background: 'rgba(220,38,38,0.04)', borderRadius: 10, border: '1px solid rgba(220,38,38,0.12)' }}>
 <div className="td-semibold mb-sm">{getFieldLabel(rejectModal)}</div>
 <div className="td-muted-sm">dari: {rejectModal.employees?.name}</div>
 <div style={{ marginTop: 8, color: '#16A34A', fontWeight: 600 }}>Nilai baru: {rejectModal.new_value}</div>
 </div>
 <div className="form-group">
 <label className="form-label">Alasan Penolakan <span className="td-muted-sm" style={{ fontWeight: 400 }}>(opsional)</span></label>
 <textarea
 className="form-textarea"
 placeholder="Contoh: Data tidak sesuai format, silakan coba lagi..."
 value={rejectNote}
 onChange={e => setRejectNote(e.target.value)}
 rows={3}
 />
 <span className="form-hint">Karyawan akan melihat catatan ini di PWA mereka</span>
 </div>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => setRejectModal(null)}>Batal</button>
 <button className="btn-danger" onClick={handleRejectConfirm} disabled={rejectLoading}>
 {rejectLoading ? 'Menolak...' : <><FiX size={13} /> Konfirmasi Tolak</>}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}


