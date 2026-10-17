/**
 * AvatarPicker — pilih icon preset atau upload foto.
 * Upload memakai employeeService (bucket profile_photos → fallback avatars).
 */
import { useState, useRef, useEffect } from 'react';
import { AVATARS } from '../lib/avatarConfig';
import { FiUpload, FiX, FiCheck, FiUsers } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { uploadProfilePhoto } from '../services/employeeService';
import { isDemoMode } from '../lib/demoGuard';

export default function AvatarPicker({ open, onClose, onSelect, currentAvatar, gender }) {
  const { user, employee } = useAuth();
  const [tab, setTab] = useState('avatars');
  const [genderFilter, setGenderFilter] = useState('all');
  const [selected, setSelected] = useState(currentAvatar || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSelected(currentAvatar || null);
    setError('');
    setTab('avatars');
    const g = (gender || '').toLowerCase();
    if (g === 'perempuan' || g === 'female' || g === 'wanita' || g === 'f') setGenderFilter('female');
    else if (g === 'laki-laki' || g === 'male' || g === 'pria' || g === 'm') setGenderFilter('male');
    else setGenderFilter('all');
  }, [open, currentAvatar, gender]);

  if (!open) return null;

  const avatarList = genderFilter === 'all'
    ? AVATARS.all
    : genderFilter === 'female'
      ? AVATARS.female
      : AVATARS.male;

  const handleFileUpload = async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      // Demo: local preview only
      if (isDemoMode()) {
        const reader = new FileReader();
        reader.onload = () => {
          onSelect?.(reader.result);
          onClose?.();
        };
        reader.readAsDataURL(file);
        setUploading(false);
        return;
      }

      if (!user?.id && !employee?.id) {
        setError('Sesi tidak valid. Login ulang lalu coba lagi.');
        setUploading(false);
        return;
      }

      const id = employee?.id || user.id;
      const { url, error: upErr } = await uploadProfilePhoto(id, file, {
        updateEmployee: !!employee?.id,
      });
      if (upErr || !url) {
        setError(upErr?.message || 'Gagal mengunggah foto. Cek bucket Storage Supabase.');
        setUploading(false);
        return;
      }
      onSelect?.(url);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Gagal mengunggah foto.');
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    // Explicit allowlist (uploadProfilePhoto enforces the same server-side):
    // image/svg+xml executes script on direct navigation.
    if (file && /^(image\/(jpeg|jpg|png|webp))$/i.test(file.type || '')) handleFileUpload(file);
    else if (file) setError('File harus berupa gambar (JPG/PNG/WEBP).');
  };

  const handleConfirm = () => {
    if (!selected) {
      setError('Pilih avatar terlebih dahulu.');
      return;
    }
    onSelect?.(selected);
    onClose?.();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        }}
      />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
        <div
          role="dialog"
          aria-label="Foto profil"
          style={{
            background: 'var(--surface)',
            borderRadius: 20,
            boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
            width: '100%',
            maxWidth: 540,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '20px 24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Foto Profil</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Pilih avatar atau unggah foto sendiri
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: 'var(--border)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--muted)',
              }}
            >
              <FiX size={15} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0' }}>
            {[
              { key: 'avatars', label: 'Pilih Avatar', icon: <FiUsers size={13} /> },
              { key: 'upload', label: 'Upload Foto', icon: <FiUpload size={13} /> },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setTab(t.key); setError(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 10, border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: tab === t.key ? 'var(--primary)' : 'var(--bg)',
                  color: tab === t.key ? '#fff' : 'var(--muted)',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
            {error && (
              <div style={{
                marginBottom: 12, padding: '10px 12px', borderRadius: 10,
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
                color: '#DC2626', fontSize: 12, fontWeight: 600,
              }}>
                {error}
              </div>
            )}

            {tab === 'avatars' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { key: 'all', label: 'Semua' },
                    { key: 'male', label: 'Laki-laki' },
                    { key: 'female', label: 'Perempuan' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setGenderFilter(f.key)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                        borderColor: genderFilter === f.key ? 'var(--primary)' : 'var(--border)',
                        background: genderFilter === f.key ? 'rgba(99,91,255,0.08)' : 'transparent',
                        color: genderFilter === f.key ? 'var(--primary)' : 'var(--muted)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))',
                  gap: 12,
                }}>
                  {avatarList.map((url) => {
                    const isSelected = selected === url;
                    return (
                      <button
                        key={url}
                        type="button"
                        onClick={() => { setSelected(url); setError(''); }}
                        style={{
                          position: 'relative',
                          border: `2.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: 16,
                          padding: 8,
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(99,91,255,0.08)' : 'var(--bg)',
                          transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                        }}
                      >
                        <img
                          src={url}
                          alt=""
                          style={{ width: '100%', aspectRatio: '1', display: 'block', borderRadius: 10 }}
                          onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
                        />
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 18, height: 18, borderRadius: '50%',
                            background: 'var(--primary)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <FiCheck size={11} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {tab === 'upload' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 16,
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: uploading ? 'wait' : 'pointer',
                  background: dragOver ? 'rgba(99,91,255,0.06)' : 'var(--bg)',
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(99,91,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <FiUpload size={22} color="var(--primary)" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>
                  {uploading ? 'Mengunggah...' : 'Klik atau seret foto ke sini'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  JPG, PNG, atau WEBP · Maks. 5MB
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />
              </div>
            )}
          </div>

          {tab === 'avatars' && (
            <div style={{
              padding: '12px 24px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex', gap: 10, justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: '1.5px solid var(--border)',
                  background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  color: 'var(--text)',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selected}
                style={{
                  padding: '10px 18px', borderRadius: 10, border: 'none',
                  background: selected ? 'var(--primary)' : 'var(--border)',
                  color: selected ? '#fff' : 'var(--muted)',
                  cursor: selected ? 'pointer' : 'not-allowed',
                  fontWeight: 700, fontSize: 13,
                }}
              >
                Simpan Avatar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
