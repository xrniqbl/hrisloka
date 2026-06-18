import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './OnboardingForm.css';

// ── Indonesia Region API ──────────────────────────────────────────────────────
const API_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api';

// ── Icons ─────────────────────────────────────────────────────────────────────
function Icon({ path, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const EMPLOYEE_OPTIONS = [
  '1–10 karyawan', '11–50 karyawan', '51–100 karyawan',
  '101–500 karyawan', '501–1000 karyawan', '1000+ karyawan',
];

// ── Validation ────────────────────────────────────────────────────────────────
function validate(form) {
  const errors = {};
  if (!form.full_name.trim() || form.full_name.trim().length < 3)
    errors.full_name = 'Nama lengkap minimal 3 karakter';
  if (!form.company_name.trim() || form.company_name.trim().length < 2)
    errors.company_name = 'Nama perusahaan wajib diisi';
  const phoneClean = form.phone.replace(/\D/g, '');
  if (!phoneClean || phoneClean.length < 9 || phoneClean.length > 15)
    errors.phone = 'Nomor HP tidak valid (9–15 digit)';
  if (!form.province) errors.province = 'Pilih provinsi';
  if (!form.city) errors.city = 'Pilih kota/kabupaten';
  if (!form.gender) errors.gender = 'Pilih jenis kelamin';
  if (!form.employee_count) errors.employee_count = 'Pilih jumlah karyawan';
  return errors;
}

// ── Field wrapper component ───────────────────────────────────────────────────
function Field({ label, error, required, children }) {
  return (
    <div className="ob-field">
      <label className="ob-label">
        {label} {required && <span className="ob-required">*</span>}
      </label>
      {children}
      {error && <p className="ob-error">{error}</p>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function OnboardingForm() {
  const navigate = useNavigate();
  const { user, employee } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    company_name: '',
    phone: '',
    province: '',
    city: '',
    gender: '',
    employee_count: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Region data
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  // Pre-fill name from auth
  useEffect(() => {
    const name = employee?.name || user?.user_metadata?.full_name || '';
    if (name) setForm(f => ({ ...f, full_name: name }));
  }, [user, employee]);

  // Load provinces from API
  useEffect(() => {
    fetch(`${API_BASE}/provinces.json`)
      .then(r => r.json())
      .then(data => { setProvinces(data); setLoadingProvinces(false); })
      .catch(() => setLoadingProvinces(false));
  }, []);

  // Load cities when province changes
  const loadCities = useCallback(async (provinceId) => {
    if (!provinceId) { setCities([]); return; }
    setLoadingCities(true);
    try {
      const r = await fetch(`${API_BASE}/regencies/${provinceId}.json`);
      const data = await r.json();
      setCities(data);
    } catch { setCities([]); }
    setLoadingCities(false);
  }, []);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const handleProvinceChange = (e) => {
    const selected = provinces.find(p => p.id === e.target.value);
    set('province', selected?.name || '');
    set('city', '');
    setCities([]);
    if (e.target.value) loadCities(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    if (!user?.id) { setSubmitError('Sesi tidak valid. Silakan login ulang.'); return; }
    setSubmitting(true);

    const { error } = await supabase.from('onboarding_profiles').upsert({
      user_id:        user.id,
      full_name:      form.full_name.trim(),
      company_name:   form.company_name.trim(),
      phone:          form.phone.trim(),
      province:       form.province,
      city:           form.city,
      gender:         form.gender,
      employee_count: form.employee_count,
      completed_at:   new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) {
      setSubmitError('Gagal menyimpan data: ' + error.message);
      setSubmitting(false);
      return;
    }

    // Also update employee name if exists
    if (employee?.id) {
      await supabase.from('employees').update({
        name: form.full_name.trim(),
        phone: form.phone.trim(),
      }).eq('id', employee.id);
    }

    navigate('/checkout', { replace: true });
  };

  return (
    <div className="ob-root">
      {/* Background */}
      <div className="ob-bg">
        <div className="ob-bg-orb ob-bg-orb-1" />
        <div className="ob-bg-orb ob-bg-orb-2" />
      </div>

      <div className="ob-container">
        {/* Header */}
        <div className="ob-header">
          <picture>
            <img src="/landing/hrislokawhitepanjang.png" alt="HRIS Loka" className="ob-logo" />
          </picture>
          <div className="ob-header-badge">Langkah 1 dari 2</div>
        </div>

        {/* Card */}
        <div className="ob-card">
          <div className="ob-card-intro">
            <div className="ob-card-icon">
              <Icon path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={28} />
            </div>
            <div>
              <h1 className="ob-title">Lengkapi Profil Anda</h1>
              <p className="ob-subtitle">
                Sebelum memulai, kami perlu beberapa informasi untuk menyesuaikan pengalaman Anda.
              </p>
            </div>
          </div>

          {submitError && (
            <div className="ob-submit-error">
              <Icon path="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" size={16} />
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="ob-form-grid">

              {/* Full name */}
              <Field label="Nama Lengkap" error={errors.full_name} required>
                <div className={`ob-input-wrap ${errors.full_name ? 'error' : ''}`}>
                  <Icon path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={15} />
                  <input
                    type="text"
                    className="ob-input"
                    placeholder="contoh: Iqbal Saputra"
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    maxLength={100}
                  />
                </div>
              </Field>

              {/* Company name */}
              <Field label="Nama Perusahaan" error={errors.company_name} required>
                <div className={`ob-input-wrap ${errors.company_name ? 'error' : ''}`}>
                  <Icon path="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" size={15} />
                  <input
                    type="text"
                    className="ob-input"
                    placeholder="contoh: PT Maju Jaya Indonesia"
                    value={form.company_name}
                    onChange={e => set('company_name', e.target.value)}
                    maxLength={150}
                  />
                </div>
              </Field>

              {/* Phone */}
              <Field label="Nomor HP / WhatsApp" error={errors.phone} required>
                <div className={`ob-input-wrap ${errors.phone ? 'error' : ''}`}>
                  <Icon path="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" size={15} />
                  <input
                    type="tel"
                    className="ob-input"
                    placeholder="contoh: 08123456789"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    maxLength={20}
                  />
                </div>
              </Field>

              {/* Gender */}
              <Field label="Jenis Kelamin" error={errors.gender} required>
                <div className="ob-radio-group">
                  {[{ v: 'male', l: '👨 Laki-laki' }, { v: 'female', l: '👩 Perempuan' }].map(g => (
                    <label
                      key={g.v}
                      className={`ob-radio-card ${form.gender === g.v ? 'active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g.v}
                        checked={form.gender === g.v}
                        onChange={() => set('gender', g.v)}
                      />
                      {g.l}
                    </label>
                  ))}
                </div>
                {errors.gender && <p className="ob-error">{errors.gender}</p>}
              </Field>

              {/* Province */}
              <Field label="Provinsi" error={errors.province} required>
                <div className={`ob-input-wrap ${errors.province ? 'error' : ''}`}>
                  <Icon path="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" size={15} />
                  <select
                    className="ob-select"
                    value={provinces.find(p => p.name === form.province)?.id || ''}
                    onChange={handleProvinceChange}
                    disabled={loadingProvinces}
                  >
                    <option value="">{loadingProvinces ? 'Memuat...' : 'Pilih Provinsi'}</option>
                    {provinces.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </Field>

              {/* City */}
              <Field label="Kota / Kabupaten" error={errors.city} required>
                <div className={`ob-input-wrap ${errors.city ? 'error' : ''} ${!form.province ? 'disabled' : ''}`}>
                  <Icon path="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" size={15} />
                  <select
                    className="ob-select"
                    value={cities.find(c => c.name === form.city)?.id || ''}
                    onChange={e => {
                      const c = cities.find(x => x.id === e.target.value);
                      set('city', c?.name || '');
                    }}
                    disabled={!form.province || loadingCities}
                  >
                    <option value="">
                      {!form.province ? 'Pilih provinsi dulu' : loadingCities ? 'Memuat...' : 'Pilih Kota/Kabupaten'}
                    </option>
                    {cities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </Field>

              {/* Employee count - full width */}
              <Field label="Jumlah Karyawan" error={errors.employee_count} required>
                <div className="ob-chip-group">
                  {EMPLOYEE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`ob-chip ${form.employee_count === opt ? 'active' : ''}`}
                      onClick={() => set('employee_count', opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {errors.employee_count && <p className="ob-error">{errors.employee_count}</p>}
              </Field>

            </div>

            {/* Submit */}
            <button
              type="submit"
              className="ob-submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <><span className="ob-spinner" /> Menyimpan...</>
              ) : (
                <>
                  Lanjutkan ke Pilih Paket
                  <Icon path="M5 12h14M12 5l7 7-7 7" size={18} />
                </>
              )}
            </button>

            <p className="ob-privacy-note">
              🔒 Data Anda aman dan tidak akan dibagikan ke pihak ketiga.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
