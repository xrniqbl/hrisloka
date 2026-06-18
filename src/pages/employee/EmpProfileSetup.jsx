import { useState, useRef } from 'react';
import {
  HiArrowRight, HiCalendarDays, HiCamera, HiCheck,
  HiCreditCard, HiExclamationTriangle, HiIdentification,
  HiPhone, HiShieldCheck, HiUser, HiUsers, HiXMark
} from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import FaceRegistration from '../../components/FaceRegistration';
import './EmpProfileSetup.css';

const STEPS = [
  { id: 1, label: 'Data Diri', icon: <HiIdentification size={16} /> },
  { id: 2, label: 'Keuangan', icon: <HiCreditCard size={16} /> },
  { id: 3, label: 'Darurat', icon: <HiUsers size={16} /> },
  { id: 4, label: 'Konfirmasi', icon: <HiShieldCheck size={16} /> },
  { id: 5, label: 'Wajah', icon: <HiCamera size={16} /> },
];

const inp = {
  width: '100%', padding: '13px 14px', borderRadius: 12,
  border: '1.5px solid var(--border)', background: 'var(--bg)',
  fontFamily: 'inherit', fontSize: 14, color: 'var(--text)',
  outline: 'none', boxSizing: 'border-box',
};
const sel = { ...inp, cursor: 'pointer', appearance: 'none' };
const lbl = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 };

export default function EmpProfileSetup({ employeeId, employeeName, onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [error, setError] = useState('');
  const photoRef = useRef(null);

  // Step 1 — Data Diri
  const [nik, setNik] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [religion, setReligion] = useState('');
  const [marital, setMarital] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const joinDate = new Date().toISOString().split('T')[0]; // auto-detect

  // Step 2 — Rekening Bank
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');

  // Step 3 — Kontak Darurat
  const [emergName, setEmergName] = useState('');
  const [emergRelation, setEmergRelation] = useState('');
  const [emergPhone, setEmergPhone] = useState('');

  // Validation per step
  const canNext1 = nik.length >= 16 && gender && birthDate && phone && address;
  const canNext2 = bankName && bankAccount && bankHolder;
  const canNext3 = emergName && emergRelation && emergPhone;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase.from('employees').update({
        nip: nik,
        gender,
        birth_date: birthDate,
        religion,
        marital_status: marital,
        address,
        whatsapp: phone,
        join_date: joinDate,
        bank_account: { bank_name: bankName, account_number: bankAccount, account_name: bankHolder },
        emergency_contact: { name: emergName, relation: emergRelation, phone: emergPhone },
        profile_setup_done: true,
      }).eq('id', employeeId);
      if (err) throw err;
      setStep(5); // go to face registration
    } catch (e) {
      setError(e.message || 'Gagal menyimpan data.');
    }
    setSaving(false);
  };

  const StepDot = ({ n }) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
        background: step > n ? '#22c55e' : step === n ? 'var(--primary)' : 'var(--border)',
        color: step >= n ? '#fff' : 'var(--muted)', transition: 'all 0.3s',
      }}>
        {step > n ? <HiCheck size={14} /> : n}
      </div>
      <span style={{ fontSize: 10, color: step === n ? 'var(--primary)' : 'var(--muted)', fontWeight: step === n ? 700 : 400 }}>
        {STEPS[n - 1].label}
      </span>
    </div>
  );

  return (
    <div className="eps-overlay">
      <div className="eps-container">
        {/* Header */}
        <div className="eps-header">
          <div className="eps-logo">
            <div className="eps-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="7" width="20" height="15" rx="2" fill="white" fillOpacity="0.9"/>
                <rect x="9" y="12" width="6" height="10" rx="1" fill="#1565C0"/>
                <rect x="4" y="2" width="16" height="8" rx="1" fill="white" fillOpacity="0.6"/>
              </svg>
            </div>
            <span className="eps-logo-text">HRIS Loka</span>
          </div>
          <div className="eps-header-title">Lengkapi Profil Anda</div>
          <p className="eps-header-sub">
            Data ini wajib diisi sekali dan tidak dapat diubah sendiri.<br/>
            Perubahan data hanya bisa dilakukan melalui HR Admin.
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 4px', marginBottom: 28, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 15, left: '10%', right: '10%', height: 2, background: 'var(--border)', zIndex: 0 }} />
          {STEPS.map(s => <StepDot key={s.id} n={s.id} />)}
        </div>

        {/* ── STEP 1: Data Diri ── */}
        {step === 1 && (
          <div className="eps-card">
            <div className="eps-section-title">
              <HiIdentification size={18} /> Data Pribadi (Tidak Dapat Diubah)
            </div>
            <div className="eps-lock-note">
              <HiShieldCheck size={12} /> Data ini terkunci setelah disimpan. Hanya HR Admin yang bisa mengubahnya.
            </div>

            <div className="eps-form-grid">
              <div className="eps-form-group eps-full">
                <label style={lbl}>NIK (Nomor Induk Kependudukan) *</label>
                <input value={nik} onChange={e => setNik(e.target.value.replace(/\D/g, ''))} maxLength={16} placeholder="16 digit NIK sesuai KTP" style={{ ...inp, borderColor: nik && nik.length !== 16 ? '#ef4444' : undefined }} />
                {nik && nik.length !== 16 && <span style={{ fontSize: 11, color: '#ef4444' }}>NIK harus 16 digit</span>}
              </div>

              <div className="eps-form-group">
                <label style={lbl}>Jenis Kelamin *</label>
                <select value={gender} onChange={e => setGender(e.target.value)} style={sel}>
                  <option value="">Pilih</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>

              <div className="eps-form-group">
                <label style={lbl}>Tanggal Lahir *</label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={inp} />
              </div>

              <div className="eps-form-group">
                <label style={lbl}>Agama</label>
                <select value={religion} onChange={e => setReligion(e.target.value)} style={sel}>
                  <option value="">Pilih</option>
                  {['Islam','Kristen','Katolik','Hindu','Buddha','Konghucu','Lainnya'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="eps-form-group">
                <label style={lbl}>Status Pernikahan</label>
                <select value={marital} onChange={e => setMarital(e.target.value)} style={sel}>
                  <option value="">Pilih</option>
                  <option value="single">Belum Menikah</option>
                  <option value="married">Menikah</option>
                  <option value="divorced">Cerai</option>
                </select>
              </div>

              <div className="eps-form-group eps-full">
                <label style={lbl}>No. HP / WhatsApp *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" style={inp} />
              </div>

              <div className="eps-form-group eps-full">
                <label style={lbl}>Alamat Lengkap (sesuai KTP) *</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Jl. ..." rows={3} style={{ ...inp, resize: 'none', minHeight: 80 }} />
              </div>

              <div className="eps-form-group eps-full">
                <label style={lbl}>Mulai Kerja (Otomatis Terdeteksi)</label>
                <div className="eps-readonly-field">
                  <HiCalendarDays size={15} />
                  {joinDate}
                  <span className="eps-auto-badge">Auto-detect</span>
                </div>
              </div>
            </div>

            <button disabled={!canNext1} onClick={() => setStep(2)} className="eps-btn-primary" style={{ opacity: canNext1 ? 1 : 0.5 }}>
              Lanjut — Rekening Bank <HiArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Rekening Bank ── */}
        {step === 2 && (
          <div className="eps-card">
            <div className="eps-section-title">
              <HiCreditCard size={18} /> Rekening Bank (Untuk Penggajian)
            </div>
            <div className="eps-lock-note">
              <HiShieldCheck size={12} /> Data rekening digunakan untuk transfer gaji. Hanya HR yang bisa mengubah.
            </div>

            <div className="eps-form-grid">
              <div className="eps-form-group eps-full">
                <label style={lbl}>Nama Bank *</label>
                <select value={bankName} onChange={e => setBankName(e.target.value)} style={sel}>
                  <option value="">Pilih Bank</option>
                  {['BCA','BNI','BRI','Mandiri','BSI','CIMB Niaga','Permata','Danamon','BTN','Maybank','OCBC NISP'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="eps-form-group eps-full">
                <label style={lbl}>Nomor Rekening *</label>
                <input type="text" inputMode="numeric" value={bankAccount} onChange={e => setBankAccount(e.target.value.replace(/\D/g, ''))} placeholder="Nomor rekening" style={inp} />
              </div>

              <div className="eps-form-group eps-full">
                <label style={lbl}>Nama Pemilik Rekening *</label>
                <input value={bankHolder} onChange={e => setBankHolder(e.target.value.toUpperCase())} placeholder="Nama sesuai buku tabungan" style={{ ...inp, textTransform: 'uppercase' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} className="eps-btn-secondary">← Kembali</button>
              <button disabled={!canNext2} onClick={() => setStep(3)} className="eps-btn-primary" style={{ flex: 2, opacity: canNext2 ? 1 : 0.5 }}>
                Lanjut — Kontak Darurat <HiArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Kontak Darurat ── */}
        {step === 3 && (
          <div className="eps-card">
            <div className="eps-section-title">
              <HiUsers size={18} /> Kontak Darurat
            </div>
            <div className="eps-lock-note">
              <HiShieldCheck size={12} /> Digunakan untuk kondisi darurat. Perubahan hanya via HR Admin.
            </div>

            <div className="eps-form-grid">
              <div className="eps-form-group eps-full">
                <label style={lbl}>Nama Kontak Darurat *</label>
                <input value={emergName} onChange={e => setEmergName(e.target.value)} placeholder="Nama lengkap" style={inp} />
              </div>

              <div className="eps-form-group">
                <label style={lbl}>Hubungan *</label>
                <select value={emergRelation} onChange={e => setEmergRelation(e.target.value)} style={sel}>
                  <option value="">Pilih</option>
                  {['Suami','Istri','Ayah','Ibu','Kakak','Adik','Anak','Saudara','Lainnya'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="eps-form-group">
                <label style={lbl}>No. Telepon *</label>
                <input type="tel" value={emergPhone} onChange={e => setEmergPhone(e.target.value)} placeholder="08xxxxxxxxxx" style={inp} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} className="eps-btn-secondary">← Kembali</button>
              <button disabled={!canNext3} onClick={() => setStep(4)} className="eps-btn-primary" style={{ flex: 2, opacity: canNext3 ? 1 : 0.5 }}>
                Review Data <HiArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Konfirmasi ── */}
        {step === 4 && (
          <div className="eps-card">
            <div className="eps-section-title">
              <HiShieldCheck size={18} /> Konfirmasi — Pastikan Data Benar
            </div>

            <div className="eps-warning-box">
              <HiExclamationTriangle size={16} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Perhatian Penting!</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  Data di bawah ini <strong>tidak dapat diubah sendiri</strong> setelah disimpan.
                  Jika ada yang salah, hubungi HR Admin perusahaan Anda.
                </div>
              </div>
            </div>

            <div className="eps-review-list">
              {[
                { label: 'NIK', value: nik },
                { label: 'Jenis Kelamin', value: gender === 'male' ? 'Laki-laki' : 'Perempuan' },
                { label: 'Tanggal Lahir', value: birthDate },
                { label: 'No. HP', value: phone },
                { label: 'Mulai Kerja', value: joinDate },
                { label: 'Bank', value: bankName },
                { label: 'No. Rekening', value: bankAccount },
                { label: 'Nama Rekening', value: bankHolder },
                { label: 'Kontak Darurat', value: `${emergName} (${emergRelation})` },
                { label: 'No. Darurat', value: emergPhone },
              ].map(row => (
                <div key={row.label} className="eps-review-row">
                  <span className="eps-review-label">{row.label}</span>
                  <span className="eps-review-value">{row.value || '—'}</span>
                </div>
              ))}
            </div>

            {/* Checkbox confirm */}
            <label className="eps-confirm-check">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
              <span>Saya menyatakan bahwa semua data di atas <strong>sudah benar</strong> dan memahami bahwa perubahan harus melalui HR Admin.</span>
            </label>

            {error && (
              <div className="eps-error-box"><HiExclamationTriangle size={14} /> {error}</div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setStep(3)} className="eps-btn-secondary">← Edit</button>
              <button
                disabled={!confirmed || saving}
                onClick={handleSave}
                className="eps-btn-success"
                style={{ flex: 2, opacity: confirmed && !saving ? 1 : 0.5 }}
              >
                {saving ? (
                  <><span className="eps-spinner" /> Menyimpan...</>
                ) : (
                  <><HiCheck size={16} /> Simpan & Lanjut Daftar Wajah</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Daftar Wajah ── */}
        {step === 5 && (
          <div className="eps-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="eps-face-header">
              <HiCamera size={20} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Daftar Wajah — Face ID</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Scan wajah untuk absensi yang aman & akurat</div>
              </div>
            </div>

            {/* Apple/Android Face ID style tips */}
            <div className="eps-face-tips">
              {[
                { icon: '💡', text: 'Pastikan wajah terang dan tidak terhalang' },
                { icon: '🕶️', text: 'Lepas kacamata jika memungkinkan' },
                { icon: '📐', text: 'Posisikan wajah di tengah frame' },
                { icon: '🔄', text: '3 sudut dibutuhkan: depan, kiri, kanan' },
              ].map(t => (
                <div key={t.icon} className="eps-face-tip-item">
                  <span>{t.icon}</span>
                  <span style={{ fontSize: 12 }}>{t.text}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '0 16px 16px' }}>
              {!faceRegistered ? (
                <FaceRegistration
                  employeeId={employeeId}
                  employeeName={employeeName}
                  locale="id"
                  onComplete={() => setFaceRegistered(true)}
                  onClose={() => setFaceRegistered(true)}
                />
              ) : (
                <div className="eps-face-done">
                  <div className="eps-face-done-icon">
                    <HiCheck size={36} color="#fff" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Wajah Berhasil Didaftarkan!</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
                    Data wajah tersimpan aman. Absensi Anda kini terlindungi Face ID.
                  </div>
                  <button onClick={onComplete} className="eps-btn-primary">
                    Masuk ke Dashboard <HiArrowRight size={16} />
                  </button>
                </div>
              )}
              {!faceRegistered && (
                <button onClick={onComplete} style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--muted)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                  Lewati untuk sekarang, daftar wajah nanti
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
