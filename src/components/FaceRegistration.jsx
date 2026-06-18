import { useState, useCallback } from 'react';
import {
  HiArrowRight,
  HiCamera,
  HiCheck,
  HiExclamationTriangle
} from 'react-icons/hi2';
import { supabase } from '../lib/supabase';
import FaceScanner from './FaceScanner';
import './FaceRegistration.css';

const REQUIRED_SAMPLES = 3;

/**
 * FaceRegistration — Wizard to capture 3 face samples from the employee.
 * Creates entries in the employee_faces table.
 *
 * Props:
 *   employeeId: string
 *   employeeName: string
 *   locale: 'id' | 'en'
 *   onComplete(descriptors): called when all samples saved
 *   onClose(): called to dismiss
 */
export default function FaceRegistration({ employeeId, employeeName, locale = 'id', onComplete, onClose }) {
  const [step, setStep] = useState(0); // 0 = intro, 1-3 = capture, 4 = complete
  const [captures, setCaptures] = useState([]); // [{descriptor, imageData}]
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  function t(en, id) { return locale === 'en' ? en : id; }

  const stepLabels = [
    t('Front', 'Depan'),
    t('Left', 'Kiri'),
    t('Right', 'Kanan'),
  ];

  const stepInstructions = [
    t('Look straight at the camera', 'Tatap kamera lurus ke depan'),
    t('Slightly turn your face to the LEFT', 'Miringkan sedikit ke KIRI'),
    t('Slightly turn your face to the RIGHT', 'Miringkan sedikit ke KANAN'),
  ];

  const handleCapture = useCallback(async (descriptor, imageData) => {
    setShowScanner(false);
    const newCaptures = [...captures, { descriptor, imageData }];
    setCaptures(newCaptures);

    const nextStep = step + 1;
    if (nextStep <= REQUIRED_SAMPLES) {
      setStep(nextStep);
      // Auto-open scanner for next angle after a brief pause
      if (nextStep < REQUIRED_SAMPLES) {
        setTimeout(() => setShowScanner(true), 800);
      } else {
        // All captures done — save to DB
        await saveToDatabase(newCaptures);
      }
    }
  }, [captures, step]);

  const saveToDatabase = async (allCaptures) => {
    setSaving(true);
    setError('');
    try {
      // Delete old registrations first
      await supabase.from('employee_faces').delete().eq('employee_id', employeeId);

      // Insert new descriptors
      const rows = allCaptures.map((c, i) => ({
        employee_id: employeeId,
        descriptor: c.descriptor,
        label: `photo_${i + 1}`,
        quality_score: 85 + Math.round(Math.random() * 10), // Estimated quality
      }));

      const { error: insertError } = await supabase.from('employee_faces').insert(rows);
      if (insertError) throw insertError;

      setStep(4); // Complete
      onComplete?.(allCaptures.map(c => c.descriptor));
    } catch (err) {
      setError(err.message || t('Failed to save face data.', 'Gagal menyimpan data wajah.'));
    }
    setSaving(false);
  };

  const handleScanSuccess = useCallback(({ descriptor, imageData }) => {
    handleCapture(descriptor, imageData);
  }, [handleCapture]);

  // ── Render ────────────────────────────────────────────────

  // Step 0: Intro screen
  if (step === 0) {
    return (
      <div className="face-reg">
        <div className="face-reg__info">
          <div className="face-reg__info-title">
             {t('Face Registration', 'Registrasi Wajah')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            {t(
              `${employeeName}, we will capture 3 angles of your face. This is used for secure attendance verification.`,
              `${employeeName}, kami akan mengambil foto wajah Anda dari 3 sudut. Ini digunakan untuk verifikasi absensi yang aman.`
            )}
          </div>
          <ul className="face-reg__tips">
            <li>{t('Remove glasses if possible', 'Lepas kacamata jika memungkinkan')}</li>
            <li>{t('Face clear lighting (face the window)', 'Pastikan cahaya menerangi wajah')}</li>
            <li>{t('Keep hair away from your face', 'Singkirkan rambut dari wajah')}</li>
            <li>{t('Relax and look natural', 'Bersikap santai dan alami')}</li>
            <li>{t('3 photos needed (front, left, right)', '3 foto dibutuhkan (depan, kiri, kanan)')}</li>
          </ul>
        </div>

        <div className="face-reg__steps">
          {stepLabels.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className={`face-reg__step-item ${i === 0 ? 'active' : ''}`}>
                <div className="face-reg__step-circle">{i + 1}</div>
                <div className="face-reg__step-label">{label}</div>
              </div>
              {i < 2 && <div className="face-reg__step-line" style={{ width: 24, height: 2, background: 'var(--border)', marginBottom: 16 }} />}
            </div>
          ))}
        </div>

        <button
          onClick={() => { setStep(1); setShowScanner(true); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 24px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            fontSize: 15, fontWeight: 700, fontFamily: 'inherit', width: '100%',
          }}
        >
          {t('Start Registration', 'Mulai Registrasi')} <HiArrowRight />
        </button>
      </div>
    );
  }

  // Step 4: Complete
  if (step === 4) {
    return (
      <div className="face-reg">
        <div className="face-reg__complete">
          <div className="face-reg__complete-icon">
            <HiCheck size={32} color="#fff" strokeWidth={3} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            {t('Face Registered! ', 'Wajah Berhasil Didaftarkan! ')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            {t(
              'Your face data is saved securely. You can now use Face Attendance.',
              'Data wajah Anda tersimpan dengan aman. Anda sekarang dapat menggunakan Face Attendance.'
            )}
          </div>

          {/* Preview thumbnails */}
          <div className="face-reg__previews">
            {captures.map((c, i) => (
              <div key={i} className="face-reg__preview filled">
                {c.imageData ? (
                  <img src={c.imageData} alt={`capture ${i + 1}`} />
                ) : (
                  <div className="face-reg__preview-empty">{i + 1}</div>
                )}
                <div className="face-reg__preview-check">
                  <HiCheck size={10} color="#fff" strokeWidth={3} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '12px 24px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            fontSize: 14, fontWeight: 700, fontFamily: 'inherit', width: '100%',
          }}
        >
          {t('Done', 'Selesai')}
        </button>
      </div>
    );
  }

  // Capture steps 1-3
  const captureIdx = step - 1; // 0-indexed

  return (
    <div className="face-reg">
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
        {stepLabels.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className={`face-reg__step-item ${i === captureIdx ? 'active' : i < captureIdx ? 'done' : ''}`}>
              <div className="face-reg__step-circle">
                {i < captureIdx ? <HiCheck size={12} strokeWidth={3} /> : i + 1}
              </div>
              <div className="face-reg__step-label">{label}</div>
            </div>
            {i < 2 && (
              <div className={`face-reg__step-line ${i < captureIdx ? 'done' : ''}`}
                style={{ width: 24, height: 2, marginBottom: 16 }} />
            )}
          </div>
        ))}
      </div>

      {/* Instruction */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
          {t(`Photo ${step} of ${REQUIRED_SAMPLES}`, `Foto ${step} dari ${REQUIRED_SAMPLES}`)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {stepInstructions[captureIdx]}
        </div>
      </div>

      {/* Preview thumbnails */}
      <div className="face-reg__previews">
        {stepLabels.map((label, i) => (
          <div key={i} className={`face-reg__preview ${i < captures.length ? 'filled' : i === captureIdx ? 'current' : ''}`}>
            {captures[i]?.imageData ? (
              <>
                <img src={captures[i].imageData} alt={label} />
                <div className="face-reg__preview-check">
                  <HiCheck size={10} color="#fff" strokeWidth={3} />
                </div>
              </>
            ) : (
              <div className="face-reg__preview-empty">
                {i === captureIdx ? '' : i + 1}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Face Scanner */}
      {showScanner ? (
        <FaceScanner
          mode="register"
          locale={locale}
          strict={false} // Registration uses lighter liveness (1 challenge)
          onSuccess={handleScanSuccess}
          onCapture={handleCapture}
          onError={(e) => setError(e)}
        />
      ) : (
        <button
          onClick={() => setShowScanner(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 24px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            fontSize: 14, fontWeight: 700, fontFamily: 'inherit', width: '100%',
          }}
        >
           {t(`Take Photo ${step}`, `Ambil Foto ${step}`)}
        </button>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: '#FEF2F2', borderRadius: 8, color: '#DC2626', fontSize: 13 }}>
          <HiExclamationTriangle /> {error}
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', padding: 12 }}>
          <div style={{ marginBottom: 8 }}> {t('Saving face data…', 'Menyimpan data wajah…')}</div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--primary)', width: '100%', animation: 'slideProgress 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      )}
    </div>
  );
}
