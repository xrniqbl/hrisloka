import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { validateCompanyCode, selfRegisterEmployee } from '../../services/companyService';

const STEPS = [
  { id: 1, label: 'Perusahaan', icon: '' },
  { id: 2, label: 'Akun', icon: '' },
  { id: 3, label: 'Data Diri', icon: '' },
  { id: 4, label: 'Pekerjaan', icon: '' },
  { id: 5, label: 'Konfirmasi', icon: '✅' },
];

export default function EmpRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Step 1: Company Code
  const [companyCode, setCompanyCode] = useState('');
  const [companyInfo, setCompanyInfo] = useState(null);
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Step 2: Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Step 3: Personal Data
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [name, setName] = useState('');
  const [nik, setNik] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const photoInputRef = useRef(null);

  // Step 4: Work Data
  const [division, setDivision] = useState('');
  const [position, setPosition] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);

  // Password strength
  const pwRules = [
    { test: p => p.length >= 8, label: 'Min 8 karakter' },
    { test: p => /[A-Z]/.test(p), label: 'Huruf kapital' },
    { test: p => /[0-9]/.test(p), label: 'Angka' },
    { test: p => /[!@#$%^&*]/.test(p), label: 'Karakter spesial' },
  ];
  const pwStrength = pwRules.filter(r => r.test(password)).length;

  // ── Step Handlers ────────────────────────────────────
  const handleCheckCode = async () => {
    if (!companyCode.trim()) return;
    setCodeChecking(true);
    setCodeError('');
    const { valid, company, error } = await validateCompanyCode(companyCode);
    setCodeChecking(false);
    if (!valid) {
      setCodeError(error || 'Kode perusahaan tidak valid. Hubungi HR perusahaan Anda.');
      setCompanyInfo(null);
    } else {
      setCompanyInfo(company);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran foto maksimal 5MB.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 5));
  const prevStep = () => { setStep(s => Math.max(s - 1, 1)); setGlobalError(''); };

  const canGoStep2 = companyInfo !== null;
  const canGoStep3 = email && password.length >= 8 && password === confirmPass && pwStrength >= 3;
  const canGoStep4 = name && nik && birthDate && gender && phone && address && photoFile;
  const canGoStep5 = division && position && joinDate;

  const handleSubmit = async () => {
    setSubmitting(true);
    setGlobalError('');

    const { data, error } = await selfRegisterEmployee({
      companyId: companyInfo.id,
      email,
      password,
      name,
      phone,
      nik,
      birth_date: birthDate,
      gender,
      address,
      division,
      position,
      join_date: joinDate,
      photoFile,
    });

    setSubmitting(false);

    if (error) {
      if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
        setGlobalError('Email ini sudah terdaftar. Silakan login atau gunakan email lain.');
      } else {
        setGlobalError('Gagal mendaftar: ' + error.message);
      }
      return;
    }

    navigate('/app/pending');
  };

  const cardStyle = {
    background: 'var(--surface, #fff)', borderRadius: 24,
    padding: '28px 24px',
    boxShadow: '0 20px 60px rgba(0,71,171,0.1), 0 4px 16px rgba(0,0,0,0.06)',
    border: '1px solid var(--border, #e5e7eb)',
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg, #f0f4ff)',
      padding: '24px 16px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <img src="/landing/hrislokabluepanjang.png" alt="HRIS Loka" style={{ height: 30, objectFit: 'contain', maxWidth: '160px' }} />
      </div>

      {/* Progress Steps — scrollable on mobile */}
      <div style={{ overflowX: 'auto', marginBottom: 24, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, minWidth: 'max-content', padding: '4px 8px 8px' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 52 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: step > s.id ? '#22c55e' : step === s.id ? '#0047AB' : 'var(--border, #e5e7eb)',
                  color: step >= s.id ? '#fff' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: step > s.id ? 13 : 11, fontWeight: 800,
                  transition: 'all 0.3s', flexShrink: 0,
                }}>
                  {step > s.id ? '✓' : s.id}
                </div>
                <span style={{ fontSize: 9, color: step === s.id ? '#0047AB' : 'var(--muted)', fontWeight: step === s.id ? 700 : 400, whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 16, height: 2, background: step > s.id ? '#22c55e' : 'var(--border, #e5e7eb)', margin: '0 1px', marginTop: -14, transition: 'all 0.3s', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div style={{ maxWidth: 440, margin: '0 auto' }}>

        {/* ── STEP 1: Company Code ── */}
        {step === 1 && (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#0047AB,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 20px rgba(0,71,171,0.3)' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>Kode Perusahaan</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                  Masukkan kode unik yang diberikan HR atau admin perusahaan Anda
                </p>
              </div>

              <label className="emp-field-label">Kode Unik Perusahaan *</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={companyCode}
                  onChange={e => { setCompanyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')); setCompanyInfo(null); setCodeError(''); }}
                  placeholder="HRSLK-XXXXXX"
                  onKeyDown={e => e.key === 'Enter' && handleCheckCode()}
                  maxLength={20}
                  className="emp-field-input"
                />
                <button
                  onClick={handleCheckCode}
                  disabled={codeChecking || companyCode.trim().length < 6}
                  style={{
                    padding: '12px 18px', borderRadius: 10, border: 'none',
                    background: '#0047AB', color: '#fff', fontFamily: 'inherit',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
                    opacity: codeChecking || companyCode.trim().length < 6 ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {codeChecking ? (
                    <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /></>
                  ) : 'Verifikasi'}
                </button>
              </div>

              {/* Error */}
              {codeError && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.06)', color: '#DC2626', fontSize: 13, marginBottom: 12, border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ flexShrink: 0 }}>❌</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>Kode tidak valid</div>
                    <div style={{ fontSize: 12, marginTop: 2, opacity: 0.8 }}>{codeError}</div>
                  </div>
                </div>
              )}

              {/* Success */}
              {companyInfo && (
                <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.06)', border: '1.5px solid rgba(34,197,94,0.3)', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {companyInfo.logo_url ? (
                      <img src={companyInfo.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#0047AB,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                        {companyInfo.name[0]}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{companyInfo.name}</div>
                      <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, marginTop: 2 }}>✓ Perusahaan terverifikasi</div>
                    </div>
                    <div style={{ marginLeft: 'auto', background: '#22c55e', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Info box */}
              {!companyInfo && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(0,71,171,0.04)', border: '1px solid rgba(0,71,171,0.1)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  💡 Kode perusahaan diperoleh dari HR atau admin. Format: <strong>HRSLK-XXXXXX</strong>
                  <br/>Kode hanya berlaku untuk perusahaan yang terdaftar di HRIS Loka.
                </div>
              )}

              <button
                onClick={nextStep}
                disabled={!canGoStep2}
                style={{
                  width: '100%', marginTop: 20, padding: '14px', borderRadius: 12, border: 'none',
                  background: canGoStep2 ? 'linear-gradient(135deg,#0047AB,#2563eb)' : 'var(--border)',
                  color: canGoStep2 ? '#fff' : 'var(--muted)', fontFamily: 'inherit',
                  fontWeight: 800, fontSize: 15, cursor: canGoStep2 ? 'pointer' : 'not-allowed',
                  boxShadow: canGoStep2 ? '0 4px 14px rgba(0,71,171,0.35)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {canGoStep2 ? 'Lanjut →' : '⬆ Verifikasi kode perusahaan terlebih dahulu'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
                Sudah punya akun?{' '}
                <Link to="/app/login" style={{ color: '#0047AB', fontWeight: 700, textDecoration: 'none' }}>Masuk</Link>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Account ── */}
        {step === 2 && (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}></div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>Buat Akun</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Email dan password untuk login</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="emp-field-label">Email Kerja *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@perusahaan.com" className="emp-field-input" />
              </div>

              <div>
                <label className="emp-field-label">Password *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 karakter" className="emp-field-input" />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                    {showPass ? '' : '️'}
                  </button>
                </div>
                {password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 4, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${pwStrength * 25}%`, background: pwStrength <= 1 ? '#ef4444' : pwStrength <= 2 ? '#f59e0b' : pwStrength <= 3 ? '#3b82f6' : '#22c55e', transition: 'all 0.3s', borderRadius: 4 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {pwRules.map((r, i) => (
                        <span key={i} style={{ fontSize: 11, color: r.test(password) ? '#22c55e' : 'var(--muted)', fontWeight: 600 }}>
                          {r.test(password) ? '✓' : '○'} {r.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="emp-field-label">Konfirmasi Password *</label>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Ketik ulang password" className="emp-field-input" />
                {confirmPass && confirmPass !== password && (
                  <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Password tidak cocok</p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={prevStep} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>← Kembali</button>
              <button onClick={nextStep} disabled={!canGoStep3} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: canGoStep3 ? 'linear-gradient(135deg,#0047AB,#2563eb)' : 'var(--border)', color: canGoStep3 ? '#fff' : 'var(--muted)', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: canGoStep3 ? 'pointer' : 'not-allowed' }}>Lanjut →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Personal Data ── */}
        {step === 3 && (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}></div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>Data Pribadi</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Lengkapi data pribadi Anda</p>
            </div>

            {/* Photo Upload */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: 90, height: 90, borderRadius: '50%', margin: '0 auto 10px',
                  background: photoPreview ? 'transparent' : 'rgba(0,71,171,0.08)',
                  border: `2.5px ${photoPreview ? 'solid #22c55e' : 'dashed rgba(0,71,171,0.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22 }}></div>
                    <div style={{ fontSize: 10, color: '#0047AB', fontWeight: 600, marginTop: 2 }}>Upload Foto</div>
                  </div>
                )}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>Foto wajib diunggah · Maks 5MB</p>
              {!photoFile && <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>* Foto profil wajib</p>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="emp-field-label">Nama Lengkap (sesuai KTP) *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap Anda" className="emp-field-input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="emp-field-label">NIK (KTP) *</label>
                  <input value={nik} onChange={e => setNik(e.target.value)} placeholder="16 digit NIK" maxLength={16} className="emp-field-input" />
                </div>
                <div>
                  <label className="emp-field-label">Tanggal Lahir *</label>
                  <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="emp-field-input" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="emp-field-label">Jenis Kelamin *</label>
                  <select value={gender} onChange={e => setGender(e.target.value)} className="emp-field-select">
                    <option value="">Pilih</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="emp-field-label">Status Pernikahan</label>
                  <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="emp-field-select">
                    <option value="">Pilih</option>
                    <option value="single">Belum Menikah</option>
                    <option value="married">Menikah</option>
                    <option value="divorced">Cerai</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="emp-field-label">No. HP / WhatsApp *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" className="emp-field-input" />
              </div>
              <div>
                <label className="emp-field-label">Alamat Lengkap *</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Jl. ..." rows={3} className="emp-field-input" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={prevStep} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>← Kembali</button>
              <button onClick={nextStep} disabled={!canGoStep4} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: canGoStep4 ? 'linear-gradient(135deg,#0047AB,#2563eb)' : 'var(--border)', color: canGoStep4 ? '#fff' : 'var(--muted)', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: canGoStep4 ? 'pointer' : 'not-allowed' }}>Lanjut →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Work Data ── */}
        {step === 4 && (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}></div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>Data Pekerjaan</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Informasi posisi Anda di perusahaan</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="emp-field-label">Divisi / Departemen *</label>
                <input value={division} onChange={e => setDivision(e.target.value)} placeholder="Contoh: Engineering, Marketing, HR" className="emp-field-input" />
              </div>
              <div>
                <label className="emp-field-label">Jabatan / Posisi *</label>
                <input value={position} onChange={e => setPosition(e.target.value)} placeholder="Contoh: Staff, Senior, Manager" className="emp-field-input" />
              </div>
              <div>
                <label className="emp-field-label">Tanggal Bergabung *</label>
                <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className="emp-field-input" />
              </div>
            </div>

            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
              ⚠️ Data pekerjaan akan diverifikasi oleh HR sebelum akun diaktifkan. Pastikan data sesuai dengan kontrak kerja.
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={prevStep} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>← Kembali</button>
              <button onClick={nextStep} disabled={!canGoStep5} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: canGoStep5 ? 'linear-gradient(135deg,#0047AB,#2563eb)' : 'var(--border)', color: canGoStep5 ? '#fff' : 'var(--muted)', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: canGoStep5 ? 'pointer' : 'not-allowed' }}>Review Data →</button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Confirmation ── */}
        {step === 5 && (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}></div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>Konfirmasi Data</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Periksa data sebelum mendaftar</p>
            </div>

            {/* Photo preview */}
            {photoPreview && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img src={photoPreview} alt="Foto Profil" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #0047AB' }} />
              </div>
            )}

            {/* Summary */}
            {[
              { label: 'Perusahaan', value: companyInfo?.name },
              { label: 'Email', value: email },
              { label: 'Nama', value: name },
              { label: 'NIK', value: nik },
              { label: 'Tgl Lahir', value: birthDate },
              { label: 'Jenis Kelamin', value: gender === 'male' ? 'Laki-laki' : 'Perempuan' },
              { label: 'No. HP', value: phone },
              { label: 'Alamat', value: address },
              { label: 'Divisi', value: division },
              { label: 'Posisi', value: position },
              { label: 'Tgl Bergabung', value: joinDate },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, minWidth: 100, flexShrink: 0 }}>{item.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, wordBreak: 'break-all' }}>{item.value || '-'}</span>
              </div>
            ))}

            {globalError && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(220,38,38,0.08)', color: '#DC2626', fontSize: 13, marginTop: 16, border: '1px solid rgba(220,38,38,0.2)' }}>
                ❌ {globalError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={prevStep} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>← Edit</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 2, padding: '13px', borderRadius: 12, border: 'none',
                  background: submitting ? 'var(--border)' : 'linear-gradient(135deg,#22c55e,#16a34a)',
                  color: submitting ? 'var(--muted)' : '#fff', fontFamily: 'inherit',
                  fontWeight: 800, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting ? (
                  <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Mendaftar...</>
                ) : '✅ Kirim Pendaftaran'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        input:focus, select:focus, textarea:focus {
          border-color: #0047AB !important;
          box-shadow: 0 0 0 3px rgba(0,71,171,0.1);
        }
      `}</style>
    </div>
  );
}