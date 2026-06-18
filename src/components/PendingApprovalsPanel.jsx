import { useState, useEffect } from 'react';
import { getPendingRegistrations, acceptEmployeeRegistration, rejectEmployeeRegistration } from '../services/companyService';
import { useAuth } from '../context/AuthContext';

export default function PendingApprovalsPanel() {
  const { employee } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [assignRole, setAssignRole] = useState('employee');

  const fetchPending = async () => {
    setLoading(true);
    const { data } = await getPendingRegistrations();
    setPending(data);
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAccept = async () => {
    if (!selected || !employee) return;
    setProcessing(true);
    const { error } = await acceptEmployeeRegistration(selected.id, employee.id, assignRole);
    setProcessing(false);
    if (!error) {
      setPending(p => p.filter(x => x.id !== selected.id));
      setSelected(null);
    }
  };

  const handleReject = async () => {
    if (!selected || !employee || !rejectReason.trim()) return;
    setProcessing(true);
    const { error } = await rejectEmployeeRegistration(selected.id, employee.id, rejectReason);
    setProcessing(false);
    if (!error) {
      setPending(p => p.filter(x => x.id !== selected.id));
      setSelected(null);
      setRejectMode(false);
      setRejectReason('');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Menunggu Verifikasi</h3>
        {pending.length > 0 && (
          <span style={{ padding: '2px 10px', borderRadius: 100, background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 700 }}>
            {pending.length}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Memuat...</div>
      ) : pending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Tidak ada yang menunggu verifikasi</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Semua pendaftaran karyawan sudah diproses</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {pending.map(emp => (
            <div
              key={emp.id}
              onClick={() => { setSelected(emp); setRejectMode(false); setAssignRole('employee'); }}
              style={{
                padding: '16px', borderRadius: 12, border: '1.5px solid var(--border)',
                background: 'var(--surface)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'all 0.2s',
                boxShadow: selected?.id === emp.id ? '0 0 0 2px #0047AB' : 'none',
              }}
            >
              {emp.photo_url ? (
                <img src={emp.photo_url} alt={emp.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#0047AB,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                  {emp.name?.[0] || '?'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{emp.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>{emp.email}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(0,71,171,0.08)', color: '#0047AB', fontWeight: 600 }}>{emp.position || '-'}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(245,158,11,0.08)', color: '#d97706', fontWeight: 600 }}>{emp.division || '-'}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>
                {formatDate(emp.registered_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ background: 'var(--surface)', borderRadius: '24px 24px 0 0', padding: '24px 24px 32px', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              {selected.photo_url ? (
                <img src={selected.photo_url} alt={selected.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#0047AB,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24 }}>
                  {selected.name?.[0]}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{selected.email}</div>
                <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600, marginTop: 2 }}>Menunggu Verifikasi</div>
              </div>
            </div>

            {/* Data rows */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {[
                ['Perusahaan', selected.company_name || '-'],
                ['Kode Perusahaan', selected.company_code || '-'],
                ['NIK', selected.nik || '-'],
                ['Tgl Lahir', formatDate(selected.birth_date)],
                ['Jenis Kelamin', selected.gender === 'male' ? 'Laki-laki' : selected.gender === 'female' ? 'Perempuan' : '-'],
                ['No. HP', selected.phone || '-'],
                ['Divisi', selected.division || '-'],
                ['Posisi', selected.position || '-'],
                ['Tgl Bergabung', formatDate(selected.join_date)],
                ['Alamat', selected.address || '-'],
                ['Tgl Daftar', formatDate(selected.registered_at)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, minWidth: 130, flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', wordBreak: 'break-all' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Assign Role */}
            {!rejectMode && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block', color: 'var(--text)' }}>
                  Assign Role Karyawan
                </label>
                <select value={assignRole} onChange={e => setAssignRole(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)' }}>
                  <option value="employee">Employee (Karyawan Biasa)</option>
                  <option value="manager">Manager</option>
                  <option value="hr_admin">HR Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            )}

            {/* Reject Reason */}
            {rejectMode && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block', color: '#DC2626' }}>
                  Alasan Penolakan *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Jelaskan alasan penolakan agar karyawan mengetahui..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #ef4444', background: 'var(--bg)', fontFamily: 'inherit', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Action Buttons */}
            {!rejectMode ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setRejectMode(true)}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #ef4444', background: 'transparent', color: '#ef4444', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Tolak
                </button>
                <button onClick={handleAccept} disabled={processing}
                  style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: processing ? 'var(--border)' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: processing ? 'var(--muted)' : '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: processing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {processing ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Memproses...</> : 'Accept & Aktifkan'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setRejectMode(false); setRejectReason(''); }}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Batal
                </button>
                <button onClick={handleReject} disabled={processing || !rejectReason.trim()}
                  style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: !rejectReason.trim() ? 'var(--border)' : 'linear-gradient(135deg,#dc2626,#b91c1c)', color: !rejectReason.trim() ? 'var(--muted)' : '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: !rejectReason.trim() ? 'not-allowed' : 'pointer' }}>
                  {processing ? 'Memproses...' : 'Konfirmasi Tolak'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
