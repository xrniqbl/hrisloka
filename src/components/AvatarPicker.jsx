/**
 * AvatarPicker.jsx
 * Modal for choosing an avatar icon or uploading a custom photo.
 * Usage:
 *   <AvatarPicker
 *     open={showPicker}
 *     onClose={() => setShowPicker(false)}
 *     onSelect={(url) => handleAvatarChange(url)}
 *     currentAvatar={avatarUrl}
 *     gender={employee?.gender}  // optional — pre-filters avatars
 *   />
 */
import { useState, useRef } from 'react';
import { AVATARS } from '../lib/avatarConfig';
import { FiUpload, FiX, FiCheck, FiUser, FiUsers } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AvatarPicker({ open, onClose, onSelect, currentAvatar, gender }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('avatars'); // 'avatars' | 'upload'
  const [genderFilter, setGenderFilter] = useState(() => {
    const g = (gender || '').toLowerCase();
    if (g === 'perempuan' || g === 'female' || g === 'wanita' || g === 'f') return 'female';
    if (g === 'laki-laki' || g === 'male' || g === 'pria' || g === 'm') return 'male';
    return 'all';
  });
  const [selected, setSelected] = useState(currentAvatar || null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  if (!open) return null;

  const avatarList = genderFilter === 'all' ? AVATARS.all
    : genderFilter === 'female' ? AVATARS.female
    : AVATARS.male;

  const handleFileUpload = async (file) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      onSelect(publicUrl);
      onClose();
    } catch (err) {
      alert('Gagal upload foto: ' + err.message);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFileUpload(file);
  };

  const handleConfirm = () => {
    if (selected) { onSelect(selected); onClose(); }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}>
        <div style={{
          background: 'var(--surface)',
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          width: '100%',
          maxWidth: 540,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Foto Profil</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Pilih avatar atau unggah foto sendiri</div>
            </div>
            <button
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

          {/* Tab Bar */}
          <div style={{
            display: 'flex', gap: 4, padding: '16px 24px 0', flexShrink: 0,
          }}>
            {[
              { key: 'avatars', label: 'Pilih Avatar', icon: <FiUsers size={13} /> },
              { key: 'upload', label: 'Upload Foto', icon: <FiUpload size={13} /> },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 10, border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  transition: 'all 0.15s',
                  background: tab === t.key ? 'var(--primary)' : 'var(--bg)',
                  color: tab === t.key ? '#fff' : 'var(--muted)',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
            {tab === 'avatars' && (
              <>
                {/* Gender Filter */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {[
                    { key: 'all', label: 'Semua' },
                    { key: 'male', label: '👨 Laki-laki' },
                    { key: 'female', label: '👩 Perempuan' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setGenderFilter(f.key)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                        borderColor: genderFilter === f.key ? 'var(--primary)' : 'var(--border)',
                        background: genderFilter === f.key ? 'var(--primary-light, #EFF6FF)' : 'transparent',
                        color: genderFilter === f.key ? 'var(--primary)' : 'var(--muted)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Avatar Grid */}
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
                        onClick={() => setSelected(url)}
                        style={{
                          position: 'relative',
                          border: `2.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: 16,
                          padding: 8,
                          cursor: 'pointer',
                          background: isSelected ? 'var(--primary-light, #EFF6FF)' : 'var(--bg)',
                          transition: 'all 0.15s',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          boxShadow: isSelected ? '0 0 0 3px rgba(0,71,171,0.15)' : 'none',
                        }}
                      >
                        <img
                          src={url}
                          alt="avatar"
                          style={{ width: '100%', aspectRatio: '1', display: 'block', borderRadius: 10 }}
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
              <div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 16,
                    padding: '48px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragOver ? 'var(--primary-light, #EFF6FF)' : 'var(--bg)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'var(--primary-light, #EFF6FF)',
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
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                </div>

                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                  Foto akan ditampilkan di profil dan sidebar aplikasi.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {tab === 'avatars' && (
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              flexShrink: 0,
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  background: 'transparent', color: 'var(--text)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selected}
                style={{
                  padding: '10px 24px', borderRadius: 10,
                  border: 'none',
                  background: selected ? 'var(--primary)' : 'var(--border)',
                  color: selected ? '#fff' : 'var(--muted)',
                  fontSize: 13, fontWeight: 700, cursor: selected ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                <FiCheck size={14} /> Gunakan Avatar Ini
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
