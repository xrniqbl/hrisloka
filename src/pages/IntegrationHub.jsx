import { useState, useEffect, useCallback } from 'react';
import {
  FiLink,
  FiMail,
  FiMessageSquare,
  FiSend,
  FiCheck,
  FiX,
  FiSettings,
  FiToggleLeft,
  FiToggleRight,
  FiChevronRight,
  FiSave,
} from 'react-icons/fi';
import '../styles/shared.css';
import '../styles/admin.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { testWhatsAppConnection } from '../services/whatsappService';
import { isEmailConfigured } from '../services/emailService';
import { BRAND } from '../lib/brandPalette';

/** Production-ready integrations only (100% kesiapan) */
const INTEGRATIONS = [
  {
    id: 'email',
    name: 'Email (Brevo)',
    description: 'Notifikasi cuti, payslip, dan reimbursement via Brevo Transactional API (API key di server)',
    icon: <FiMail />,
    color: BRAND.primary,
    serverManaged: true,
    fields: [
      {
        key: 'notify_from_name',
        label: 'Nama Pengirim (opsional)',
        type: 'text',
        placeholder: 'KiniKerja Notifications',
      },
      {
        key: 'notify_reply_to',
        label: 'Reply-To (opsional)',
        type: 'text',
        placeholder: 'hr@company.com',
      },
    ],
    helpText:
      'BREVO_API_KEY + FROM_EMAIL dikelola di Vercel/server. Verifikasi sender domain di dashboard Brevo. Tenant cukup mengaktifkan notifikasi.',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp API',
    description: 'Reminder absensi, approval, dan notifikasi via WhatsApp (Fonnte di server)',
    icon: <FiMessageSquare />,
    color: '#25D366',
    fields: [
      {
        key: 'wa_sender',
        label: 'Nomor penguji (untuk Test)',
        type: 'text',
        placeholder: '628xxxxx',
      },
    ],
    helpText: 'Token Fonnte di server (FONNTE_TOKEN). Isi nomor untuk uji koneksi.',
  },
];

const STORAGE_KEY = 'hrisync_integrations';

export default function IntegrationHub() {
  const { employee } = useAuth();
  const [configs, setConfigs] = useState({});
  const [activePanel, setActivePanel] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [testResults, setTestResults] = useState({});
  const [saveError, setSaveError] = useState('');

  const loadConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    setSaveError('');
    try {
      if (employee?.company_id) {
        // Schema A: key/value rows
        const { data: kv, error: kvError } = await supabase
          .from('company_settings')
          .select('value')
          .eq('company_id', employee.company_id)
          .eq('key', 'integration_configs')
          .maybeSingle();
        if (kvError) throw kvError;
        if (kv?.value) {
          setConfigs(typeof kv.value === 'string' ? JSON.parse(kv.value) : kv.value);
          setLoadingConfigs(false);
          return;
        }
        // Schema B: wide row with integrations jsonb
        const { data: wide, error: wideError } = await supabase
          .from('company_settings')
          .select('integrations, value')
          .eq('company_id', employee.company_id)
          .maybeSingle();
        if (wideError) throw wideError;
        if (wide?.integrations) {
          setConfigs(
            typeof wide.integrations === 'string'
              ? JSON.parse(wide.integrations)
              : wide.integrations,
          );
          setLoadingConfigs(false);
          return;
        }
      }
    } catch (e) {
      console.error('[IntegrationHub] load failed:', e?.message || e);
      setSaveError('Gagal memuat konfigurasi dari database — fallback lokal dipakai.');
    }
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) setConfigs(JSON.parse(local));
    } catch {
      /* ignore */
    }
    setLoadingConfigs(false);
  }, [employee]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const isEnabled = (id) => Boolean(configs[id]?.enabled);

  const toggleEnabled = (id) => {
    setConfigs((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id]?.enabled },
    }));
  };

  const updateField = (intId, fieldKey, value) => {
    setConfigs((prev) => ({
      ...prev,
      [intId]: { ...prev[intId], [fieldKey]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      if (employee?.company_id) {
        // Prefer key/value upsert
        let error = null;
        const kv = await supabase.from('company_settings').upsert(
          {
            company_id: employee.company_id,
            key: 'integration_configs',
            value: configs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id,key' },
        );
        error = kv.error;

        if (error) {
          // Fallback: store as integrations column on company row
          const wide = await supabase
            .from('company_settings')
            .upsert(
              {
                company_id: employee.company_id,
                integrations: configs,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'company_id' },
            );
          error = wide.error;
        }

        if (!error) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          setSaving(false);
          return;
        }
        setSaveError(error.message || 'Gagal simpan ke database — fallback lokal dipakai.');
      }
    } catch (e) {
      setSaveError(e?.message || 'Gagal simpan');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  const handleTest = async (id) => {
    setTestResults((prev) => ({ ...prev, [id]: 'testing' }));
    try {
      if (id === 'whatsapp') {
        const phone = configs.whatsapp?.wa_sender || '';
        if (!phone) {
          setTestResults((prev) => ({ ...prev, [id]: 'error' }));
          return;
        }
        const result = await testWhatsAppConnection(phone);
        setTestResults((prev) => ({ ...prev, [id]: result.success ? 'success' : 'error' }));
      } else if (id === 'email') {
        const ok = await isEmailConfigured();
        setTestResults((prev) => ({ ...prev, [id]: ok ? 'success' : 'error' }));
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: 'error' }));
    }
    setTimeout(() => setTestResults((prev) => ({ ...prev, [id]: null })), 5000);
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>
          <FiLink style={{ marginRight: 10 }} /> Integration Hub
        </h1>
        <div className="page-header-actions">
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saved ? (
              <>
                <FiCheck /> Tersimpan
              </>
            ) : saving ? (
              <>
                <FiSettings className="spin" /> Menyimpan…
              </>
            ) : (
              <>
                <FiSave /> Simpan Konfigurasi
              </>
            )}
          </button>
        </div>
      </div>

      <div
        style={{
          padding: 12,
          marginBottom: 16,
          background: 'color-mix(in srgb, var(--primary, #5654D4) 7%, transparent)',
          borderRadius: 10,
          border: '1px solid color-mix(in srgb, var(--primary, #5654D4) 16%, transparent)',
          fontSize: 13,
          color: 'var(--text)',
          lineHeight: 1.45,
        }}
      >
        <strong>Integrasi production-ready:</strong> Email (Brevo) dan WhatsApp (Fonnte).
        Konfigurasi per perusahaan; secret API hanya di server.
      </div>

      {saveError && (
        <div
          style={{
            padding: 10,
            marginBottom: 12,
            borderRadius: 10,
            background: 'rgba(239,68,68,0.08)',
            color: '#DC2626',
            fontSize: 12.5,
          }}
        >
          {saveError}
        </div>
      )}

      {loadingConfigs ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {[1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {INTEGRATIONS.map((int) => {
            const enabled = isEnabled(int.id);
            const isOpen = activePanel === int.id;
            const testResult = testResults[int.id];

            return (
              <div
                key={int.id}
                style={{
                  background: 'var(--surface)',
                  borderRadius: 12,
                  border: `1px solid ${enabled ? int.color : 'var(--border)'}`,
                  overflow: 'hidden',
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActivePanel(isOpen ? null : int.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setActivePanel(isOpen ? null : int.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `${int.color}18`,
                      color: int.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {int.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{int.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{int.description}</div>
                  </div>

                  {enabled && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: int.color,
                        background: `${int.color}15`,
                        padding: '3px 10px',
                        borderRadius: 99,
                      }}
                    >
                      Aktif
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEnabled(int.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: enabled ? int.color : 'var(--muted)',
                      fontSize: 22,
                      display: 'flex',
                    }}
                    title={enabled ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {enabled ? <FiToggleRight /> : <FiToggleLeft />}
                  </button>

                  <FiChevronRight
                    style={{
                      color: 'var(--muted)',
                      fontSize: 18,
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s',
                    }}
                  />
                </div>

                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ paddingTop: 14 }}>
                      {int.helpText && (
                        <div
                          style={{
                            padding: 10,
                            marginBottom: 12,
                            background: 'var(--bg)',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            fontSize: 12,
                            color: 'var(--muted)',
                            lineHeight: 1.5,
                          }}
                        >
                          {int.helpText}
                        </div>
                      )}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 12,
                        }}
                      >
                        {int.fields.map((field) => (
                          <div
                            key={field.key}
                            className="form-group"
                            style={
                              field.key.includes('url') ||
                              field.key.includes('webhook') ||
                              field.key.includes('reply')
                                ? { gridColumn: '1/-1' }
                                : {}
                            }
                          >
                            <label className="form-label">{field.label}</label>
                            <input
                              className="form-input"
                              type={field.type}
                              placeholder={field.placeholder}
                              value={configs[int.id]?.[field.key] || ''}
                              onChange={(e) => updateField(int.id, field.key, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleTest(int.id)}
                          disabled={testResult === 'testing'}
                          style={{ fontSize: 13 }}
                        >
                          <FiSend />{' '}
                          {testResult === 'testing' ? 'Testing…' : 'Test Connection'}
                        </button>
                        {testResult === 'success' && (
                          <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                            <FiCheck /> Berhasil
                          </span>
                        )}
                        {testResult === 'error' && (
                          <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                            <FiX /> Gagal — cek env server / nomor
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
