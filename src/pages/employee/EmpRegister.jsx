import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { validateCompanyCode, selfRegisterEmployee } from '../../services/companyService';
import './EmpRegister.css';

const STEPS = [
  { id: 1, label: 'Perusahaan' },
  { id: 2, label: 'Akun' },
  { id: 3, label: 'Data Diri' },
  { id: 4, label: 'Pekerjaan' },
  { id: 5, label: 'Konfirmasi' },
];

export default function EmpRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [companyCode, setCompanyCode] = useState('');
  const [companyInfo, setCompanyInfo] = useState(null);
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeError, setCodeError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

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

  const [division, setDivision] = useState('');
  const [position, setPosition] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);

  const pwRules = [
    { test: (p) => p.length >= 8, label: 'Min 8 karakter' },
    { test: (p) => /[A-Z]/.test(p), label: 'Huruf kapital' },
    { test: (p) => /[0-9]/.test(p), label: 'Angka' },
    { test: (p) => /[!@#$%^&*]/.test(p), label: 'Karakter spesial' },
  ];
  const pwStrength = pwRules.filter((r) => r.test(password)).length;

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
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran foto maksimal 5MB.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 5));
  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
    setGlobalError('');
  };

  const canGoStep2 = companyInfo !== null;
  const canGoStep3 = email && password.length >= 8 && password === confirmPass && pwStrength >= 3;
  const canGoStep4 = name && nik && birthDate && gender && phone && address && photoFile;
  const canGoStep5 = division && position && joinDate;
  const canSubmit = agreed && !submitting;

  const handleSubmit = async () => {
    if (!agreed) {
      setGlobalError('Centang persetujuan syarat & kebijakan terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    setGlobalError('');

    try {
      const { error, needsEmailConfirm } = await selfRegisterEmployee({
        companyId: companyInfo.id,
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        phone: phone.trim(),
        nik: nik.trim(),
        birth_date: birthDate,
        gender,
        marital_status: maritalStatus || undefined,
        address: address.trim(),
        division: division.trim(),
        position: position.trim(),
        join_date: joinDate,
        photoFile,
      });

      setSubmitting(false);

      if (error) {
        const msg = error.message || '';
        if (/already registered|already been registered|User already registered/i.test(msg)) {
          setGlobalError('Email ini sudah terdaftar. Silakan login atau gunakan email lain.');
        } else if (/company/i.test(msg)) {
          setGlobalError('Perusahaan tidak valid. Ulangi dari langkah kode perusahaan.');
        } else if (/duplicate|unique|nip/i.test(msg)) {
          setGlobalError('Data bentrok (NIK/email). Gunakan data lain atau hubungi HR.');
        } else {
          setGlobalError('Gagal mendaftar: ' + msg);
        }
        return;
      }

      // Mark splash seen so pending screen isn't blocked by welcome funnel
      try { sessionStorage.setItem('hrisloka_splash_seen', '1'); } catch { /* */ }
      if (needsEmailConfirm) {
        try { sessionStorage.setItem('hrisloka_reg_email_hint', email.trim().toLowerCase()); } catch { /* */ }
      }
      navigate('/app/pending', { replace: true });
    } catch (err) {
      setSubmitting(false);
      setGlobalError('Gagal mendaftar: ' + (err?.message || 'Kesalahan jaringan'));
    }
  };

  const pwColor =
    pwStrength <= 1 ? '#ef4444' : pwStrength <= 2 ? '#f59e0b' : pwStrength <= 3 ? '#635BFF' : '#22c55e';

  return (
    <div className="emp-reg">
      <div className="emp-reg__blob emp-reg__blob--tl" aria-hidden />
      <div className="emp-reg__blob emp-reg__blob--br" aria-hidden />

      <div className="emp-reg__inner">
        <div className="emp-reg__top">
          <Link to="/app/welcome" className="emp-reg__back">← Kembali</Link>
          <div>
            <img src="/landing/hrislokabluepanjang.png" alt="HRIS Loka" className="emp-reg__logo" />
          </div>
        </div>

        {/* Progress */}
        <div className="emp-reg__steps" aria-label="Langkah pendaftaran">
          {STEPS.map((s, i) => (
            <div key={s.id} className="emp-reg__step">
              <div className="emp-reg__step-dot">
                <div
                  className={
                    'emp-reg__step-num' +
                    (step > s.id ? ' is-done' : '') +
                    (step === s.id ? ' is-active' : '')
                  }
                >
                  {step > s.id ? '✓' : s.id}
                </div>
                <span className={'emp-reg__step-label' + (step === s.id ? ' is-active' : '')}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={'emp-reg__step-line' + (step > s.id ? ' is-done' : '')} />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1 — Company */}
        {step === 1 && (
          <div className="emp-reg__card">
            <div className="emp-reg__card-edge" aria-hidden />
            <div className="emp-reg__card-body">
              <h2 className="emp-reg__heading">Kode Perusahaan</h2>
              <p className="emp-reg__sub">
                Masukkan kode unik yang diberikan HR atau admin perusahaan Anda
              </p>

              <div className="emp-reg__field">
                <label className="emp-reg__label" htmlFor="company-code">Kode Unik Perusahaan *</label>
                <div className="emp-reg__code-row">
                  <input
                    id="company-code"
                    className="emp-reg__input"
                    value={companyCode}
                    onChange={(e) => {
                      setCompanyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''));
                      setCompanyInfo(null);
                      setCodeError('');
                    }}
                    placeholder="HRSLK-XXXXXX"
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckCode()}
                    maxLength={20}
                  />
                  <button
                    type="button"
                    className="emp-reg__btn-verify"
                    onClick={handleCheckCode}
                    disabled={codeChecking || companyCode.trim().length < 6}
                  >
                    {codeChecking ? <span className="emp-reg__spinner" /> : 'Verifikasi'}
                  </button>
                </div>
              </div>

              {codeError && (
                <div className="emp-reg__alert emp-reg__alert--error">
                  <strong>Kode tidak valid</strong>
                  <div style={{ marginTop: 4, fontSize: 12 }}>{codeError}</div>
                </div>
              )}

              {companyInfo && (
                <div className="emp-reg__alert emp-reg__alert--ok">
                  <div className="emp-reg__company">
                    {companyInfo.logo_url ? (
                      <img src={companyInfo.logo_url} alt="" className="emp-reg__company-logo" />
                    ) : (
                      <div className="emp-reg__company-logo">{companyInfo.name?.[0] || 'C'}</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{companyInfo.name}</div>
                      <div style={{ fontSize: 12, marginTop: 2 }}>Perusahaan terverifikasi</div>
                    </div>
                  </div>
                </div>
              )}

              {!companyInfo && (
                <div className="emp-reg__alert emp-reg__alert--info">
                  Kode diperoleh dari HR/admin. Format: <strong>HRSLK-XXXXXX</strong>. Hanya untuk
                  perusahaan terdaftar di HRIS Loka.
                </div>
              )}

              <button
                type="button"
                className="emp-reg__btn-primary"
                disabled={!canGoStep2}
                onClick={nextStep}
              >
                {canGoStep2 ? 'Lanjut →' : 'Verifikasi kode terlebih dahulu'}
              </button>

              <div className="emp-reg__meta">
                Sudah punya akun? <Link to="/app/login">Masuk</Link>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Account */}
        {step === 2 && (
          <div className="emp-reg__card">
            <div className="emp-reg__card-edge" aria-hidden />
            <div className="emp-reg__card-body">
              <h2 className="emp-reg__heading">Buat Akun</h2>
              <p className="emp-reg__sub">Email dan password untuk login</p>

              <div className="emp-reg__field">
                <label className="emp-reg__label" htmlFor="reg-email">Email Kerja *</label>
                <input
                  id="reg-email"
                  type="email"
                  className="emp-reg__input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  autoComplete="email"
                />
              </div>

              <div className="emp-reg__field">
                <label className="emp-reg__label" htmlFor="reg-pass">Password *</label>
                <div className="emp-reg__pass-wrap">
                  <input
                    id="reg-pass"
                    type={showPass ? 'text' : 'password'}
                    className="emp-reg__input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 karakter"
                    autoComplete="new-password"
                  />
                  <button type="button" className="emp-reg__eye" onClick={() => setShowPass((s) => !s)}>
                    {showPass ? 'Sembunyi' : 'Lihat'}
                  </button>
                </div>
                {password && (
                  <>
                    <div className="emp-reg__pw-bar">
                      <div
                        className="emp-reg__pw-fill"
                        style={{ width: `${pwStrength * 25}%`, background: pwColor }}
                      />
                    </div>
                    <div className="emp-reg__pw-rules">
                      {pwRules.map((r) => (
                        <span
                          key={r.label}
                          className={'emp-reg__pw-rule' + (r.test(password) ? ' is-ok' : '')}
                        >
                          {r.test(password) ? '✓' : '○'} {r.label}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="emp-reg__field">
                <label className="emp-reg__label" htmlFor="reg-pass2">Konfirmasi Password *</label>
                <input
                  id="reg-pass2"
                  type="password"
                  className="emp-reg__input"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Ketik ulang password"
                  autoComplete="new-password"
                />
                {confirmPass && confirmPass !== password && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>Password tidak cocok</p>
                )}
              </div>

              <div className="emp-reg__nav">
                <button type="button" className="emp-reg__btn-ghost" onClick={prevStep}>← Kembali</button>
                <button type="button" className="emp-reg__btn-primary" disabled={!canGoStep3} onClick={nextStep}>
                  Lanjut →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Personal */}
        {step === 3 && (
          <div className="emp-reg__card">
            <div className="emp-reg__card-edge" aria-hidden />
            <div className="emp-reg__card-body">
              <h2 className="emp-reg__heading">Data Pribadi</h2>
              <p className="emp-reg__sub">Lengkapi data pribadi Anda</p>

              <div className="emp-reg__photo">
                <button
                  type="button"
                  className={'emp-reg__photo-btn' + (photoPreview ? ' has-photo' : '')}
                  onClick={() => photoInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" />
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#493ee5', padding: 8 }}>
                      Upload Foto
                    </span>
                  )}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
                <p className="emp-reg__photo-hint">Foto wajib · Maks 5MB</p>
                {!photoFile && (
                  <p className="emp-reg__photo-hint" style={{ color: '#ef4444', fontWeight: 600 }}>
                    * Foto profil wajib
                  </p>
                )}
              </div>

              <div className="emp-reg__field">
                <label className="emp-reg__label">Nama Lengkap (sesuai KTP) *</label>
                <input className="emp-reg__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap Anda" />
              </div>

              <div className="emp-reg__row">
                <div className="emp-reg__field">
                  <label className="emp-reg__label">NIK (KTP) *</label>
                  <input className="emp-reg__input" value={nik} onChange={(e) => setNik(e.target.value)} placeholder="16 digit" maxLength={16} />
                </div>
                <div className="emp-reg__field">
                  <label className="emp-reg__label">Tanggal Lahir *</label>
                  <input type="date" className="emp-reg__input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </div>
              </div>

              <div className="emp-reg__row">
                <div className="emp-reg__field">
                  <label className="emp-reg__label">Jenis Kelamin *</label>
                  <select className="emp-reg__select" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Pilih</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>
                <div className="emp-reg__field">
                  <label className="emp-reg__label">Status Pernikahan</label>
                  <select className="emp-reg__select" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
                    <option value="">Pilih</option>
                    <option value="single">Belum Menikah</option>
                    <option value="married">Menikah</option>
                    <option value="divorced">Cerai</option>
                  </select>
                </div>
              </div>

              <div className="emp-reg__field">
                <label className="emp-reg__label">No. HP / WhatsApp *</label>
                <input type="tel" className="emp-reg__input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>

              <div className="emp-reg__field">
                <label className="emp-reg__label">Alamat Lengkap *</label>
                <textarea className="emp-reg__textarea" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. ..." rows={3} />
              </div>

              <div className="emp-reg__nav">
                <button type="button" className="emp-reg__btn-ghost" onClick={prevStep}>← Kembali</button>
                <button type="button" className="emp-reg__btn-primary" disabled={!canGoStep4} onClick={nextStep}>
                  Lanjut →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — Work */}
        {step === 4 && (
          <div className="emp-reg__card">
            <div className="emp-reg__card-edge" aria-hidden />
            <div className="emp-reg__card-body">
              <h2 className="emp-reg__heading">Data Pekerjaan</h2>
              <p className="emp-reg__sub">Informasi posisi Anda di perusahaan</p>

              <div className="emp-reg__field">
                <label className="emp-reg__label">Divisi / Departemen *</label>
                <input className="emp-reg__input" value={division} onChange={(e) => setDivision(e.target.value)} placeholder="Contoh: Engineering, Marketing, HR" />
              </div>
              <div className="emp-reg__field">
                <label className="emp-reg__label">Jabatan / Posisi *</label>
                <input className="emp-reg__input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Contoh: Staff, Senior, Manager" />
              </div>
              <div className="emp-reg__field">
                <label className="emp-reg__label">Tanggal Bergabung *</label>
                <input type="date" className="emp-reg__input" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
              </div>

              <div className="emp-reg__alert emp-reg__alert--warn">
                Data pekerjaan akan diverifikasi HR sebelum akun diaktifkan. Pastikan sesuai kontrak kerja.
              </div>

              <div className="emp-reg__nav">
                <button type="button" className="emp-reg__btn-ghost" onClick={prevStep}>← Kembali</button>
                <button type="button" className="emp-reg__btn-primary" disabled={!canGoStep5} onClick={nextStep}>
                  Review Data →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Confirm + Agreement */}
        {step === 5 && (
          <div className="emp-reg__card">
            <div className="emp-reg__card-edge" aria-hidden />
            <div className="emp-reg__card-body">
              <h2 className="emp-reg__heading">Konfirmasi Data</h2>
              <p className="emp-reg__sub">Periksa data dan setujui ketentuan sebelum mendaftar</p>

              {photoPreview && (
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <img
                    src={photoPreview}
                    alt="Foto Profil"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #493ee5',
                    }}
                  />
                </div>
              )}

              {[
                { label: 'Perusahaan', value: companyInfo?.name },
                { label: 'Email', value: email },
                { label: 'Nama', value: name },
                { label: 'NIK', value: nik },
                { label: 'Tgl Lahir', value: birthDate },
                { label: 'Jenis Kelamin', value: gender === 'male' ? 'Laki-laki' : gender === 'female' ? 'Perempuan' : '-' },
                { label: 'No. HP', value: phone },
                { label: 'Alamat', value: address },
                { label: 'Divisi', value: division },
                { label: 'Posisi', value: position },
                { label: 'Tgl Bergabung', value: joinDate },
              ].map((item) => (
                <div key={item.label} className="emp-reg__summary-row">
                  <span className="emp-reg__summary-label">{item.label}</span>
                  <span className="emp-reg__summary-value">{item.value || '-'}</span>
                </div>
              ))}

              <label className="emp-reg__agree">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setGlobalError('');
                  }}
                />
                <span className="emp-reg__agree-text">
                  Saya menyetujui{' '}
                  <Link to="/privacy" target="_blank" rel="noreferrer">
                    Kebijakan Privasi
                  </Link>{' '}
                  dan menyatakan data yang diisi benar. Saya memahami akun akan aktif setelah
                  diverifikasi HR perusahaan.
                </span>
              </label>

              {globalError && (
                <div className="emp-reg__alert emp-reg__alert--error">{globalError}</div>
              )}

              <div className="emp-reg__nav">
                <button type="button" className="emp-reg__btn-ghost" onClick={prevStep}>← Edit</button>
                <button
                  type="button"
                  className="emp-reg__btn-primary is-success"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <><span className="emp-reg__spinner" /> Mendaftar...</>
                  ) : (
                    'Kirim Pendaftaran'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
