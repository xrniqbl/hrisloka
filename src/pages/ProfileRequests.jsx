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

 useEffect(() => { fetchRequests(); }, [filter]);

 const fetchRequests = async () => {
 setLoading(true);
 const { data } = await getAllUpdateRequests(filter || undefined);
 setRequests(data || []);
 setLoading(false);
 };

 // Realtime: auto-refresh when any request changes
 useRealtimeTable('profile_update_requests', fetchRequests);

 const handleApprove = async (req) => {
 setActionLoading(req.id);
 const { error } = await approveRequest(req.id, employee?.id);
 if (error) {
 alert('Gagal menyetujui: ' + error.message);
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
 const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
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
 style={{ maxWidth: 160, padding: '9px 12px', fontSize: 13 }}
 >
 <option value="pending"> Menunggu</option>
 <option value="approved"> Disetujui</option>
 <option value="rejected"> Ditolak</option>
 <option value=""> Semua</option>
 </select>
 </div>

 {/* Stats */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
 {[
 { label: 'Menunggu', value: pending, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: <FiClock /> },
 { label: 'Disetujui', value: approved, color: '#16A34A', bg: 'rgba(22,163,74,0.08)', icon: <FiCheck /> },
 { label: 'Ditolak', value: rejected, color: '#DC2626', bg: 'rgba(220,38,38,0.08)', icon: <FiX /> },
 { label: 'Total', value: requests.length, color: '#0047AB', bg: 'rgba(0,71,171,0.06)', icon: <FiUser /> },
 ].map(s => (
 <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
 <span style={{ color: s.color, fontSize: 16, padding: '6px', borderRadius: 8, background: s.bg }}>{s.icon}</span>
 <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{s.label}</span>
 </div>
 <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
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
 <th>Nilai Lama → Baru</th>
 <th>Tanggal</th>
 <th>Status</th>
 <th style={{ textAlign: 'center' }}>Aksi</th>
 </tr>
 </thead>
 <tbody>
 {requests.map(req => {
 const st = statusConfig[req.status] || statusConfig.pending;
 return (
 <tr key={req.id}>
 {/* Employee */}
 <td>
 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
 {req.employees?.photo_url ? (
 <img src={req.employees.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: '2px solid var(--border)' }} />
 ) : (
 <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
 {getInitials(req.employees?.name)}
 </div>
 )}
 <div>
 <div style={{ fontWeight: 700, fontSize: 13 }}>{req.employees?.name || '—'}</div>
 <div style={{ fontSize: 11, color: 'var(--muted)' }}>{req.employees?.nip} · {req.employees?.division || req.employees?.position || '-'}</div>
 </div>
 </div>
 </td>

 {/* Field */}
 <td>
 <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}>
 {getFieldLabel(req)}
 </span>
 </td>

 {/* Values */}
 <td style={{ fontSize: 12, maxWidth: 260 }}>
 {req.old_value && (
 <div style={{ color: 'var(--muted)', textDecoration: 'line-through', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
 {req.old_value.length > 50 ? req.old_value.slice(0, 50) + '…' : req.old_value}
 </div>
 )}
 <div style={{ fontWeight: 600, color: '#16A34A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
 {req.new_value?.length > 60 ? req.new_value.slice(0, 60) + '…' : req.new_value}
 </div>
 </td>

 {/* Date */}
 <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
 <FiCalendar size={11} /> {formatDate(req.requested_at)}
 </div>
 {req.reviewed_at && (
 <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
 Review: {formatDate(req.reviewed_at)}
 </div>
 )}
 </td>

 {/* Status */}
 <td>
 <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, whiteSpace: 'nowrap' }}>
 {st.label}
 </span>
 {req.review_note && req.status === 'rejected' && (
 <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, fontStyle: 'italic' }}>
 "{req.review_note}"
 </div>
 )}
 </td>

 {/* Actions */}
 <td>
 <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
 {/* Detail */}
 <button
 className="action-btn"
 title="Lihat Detail"
 onClick={() => setDetailReq(req)}
 style={{ color: 'var(--primary)' }}
 >
 <FiEye size={14} />
 </button>

 {req.status === 'pending' && (
 <>
 <button
 className="action-btn"
 title="Setujui & Terapkan"
 disabled={actionLoading === req.id}
 onClick={() => handleApprove(req)}
 style={{ color: '#16A34A' }}
 >
 <FiCheck size={14} />
 </button>
 <button
 className="action-btn"
 title="Tolak"
 disabled={actionLoading === req.id}
 onClick={() => { setRejectModal(req); setRejectNote(''); }}
 style={{ color: '#DC2626' }}
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
 <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px', background: 'var(--bg)', borderRadius: 12 }}>
 {detailReq.employees?.photo_url ? (
 <img src={detailReq.employees.photo_url} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
 ) : (
 <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
 {getInitials(detailReq.employees?.name)}
 </div>
 )}
 <div>
 <div style={{ fontWeight: 700, fontSize: 15 }}>{detailReq.employees?.name || '—'}</div>
 <div style={{ fontSize: 12, color: 'var(--muted)' }}>{detailReq.employees?.nip} · {detailReq.employees?.division}</div>
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
 <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 10 }}>
 <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Field</div>
 <div style={{ fontWeight: 700, fontSize: 13 }}>{getFieldLabel(detailReq)}</div>
 </div>
 <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 10 }}>
 <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Tanggal Request</div>
 <div style={{ fontWeight: 600, fontSize: 13 }}>{formatDate(detailReq.requested_at)}</div>
 </div>
 </div>

 {detailReq.old_value && (
 <div style={{ padding: '12px 14px', background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)', borderRadius: 10 }}>
 <div style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', marginBottom: 6 }}>Nilai Lama</div>
 <div style={{ fontSize: 13, color: 'var(--text)' }}>{detailReq.old_value}</div>
 </div>
 )}
 <div style={{ padding: '12px 14px', background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.15)', borderRadius: 10 }}>
 <div style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', marginBottom: 6 }}>Nilai Baru yang Diminta</div>
 <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{detailReq.new_value}</div>
 </div>

 {detailReq.review_note && (
 <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, display: 'flex', gap: 8 }}>
 <FiMessageSquare size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
 <div>
 <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', marginBottom: 4 }}>Catatan Review</div>
 <div style={{ fontSize: 13 }}>{detailReq.review_note}</div>
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
 >
 <FiCheck size={14} /> {actionLoading === detailReq.id ? 'Memproses...' : 'Setujui & Terapkan'}
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
 <h2 style={{ color: '#DC2626' }}><FiX style={{ marginRight: 8 }} /> Tolak Permintaan</h2>
 <button className="modal-close" onClick={() => setRejectModal(null)}><FiX /></button>
 </div>
 <div className="modal-body">
 <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(220,38,38,0.04)', borderRadius: 10, border: '1px solid rgba(220,38,38,0.12)', fontSize: 13 }}>
 <div style={{ fontWeight: 700, marginBottom: 4 }}>{getFieldLabel(rejectModal)}</div>
 <div style={{ color: 'var(--muted)', fontSize: 12 }}>dari: {rejectModal.employees?.name}</div>
 <div style={{ marginTop: 8, color: '#16A34A', fontWeight: 600 }}>Nilai baru: {rejectModal.new_value}</div>
 </div>
 <div className="form-group">
 <label className="form-label">Alasan Penolakan <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(opsional)</span></label>
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
