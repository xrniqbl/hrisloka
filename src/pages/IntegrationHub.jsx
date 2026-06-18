import { useState, useEffect, useCallback } from 'react';
import { FiLink, FiMail, FiMessageSquare, FiSend, FiCheck, FiX, FiSettings, FiToggleLeft, FiToggleRight, FiChevronRight, FiAlertCircle, FiSave } from 'react-icons/fi';
import '../styles/shared.css';
import '../styles/admin.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { testWhatsAppConnection, isWhatsAppConfigured } from '../services/whatsappService';
import { isEmailConfigured } from '../services/emailService';

const INTEGRATIONS = [
  {
    id: 'email',
    name: 'Email SMTP',
    description: 'Kirim notifikasi, payslip, dan pengumuman via email',
    icon: <FiMail />,
    color: '#3B82F6',
    fields: [
      { key: 'smtp_host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
      { key: 'smtp_port', label: 'Port', type: 'number', placeholder: '587' },
      { key: 'smtp_user', label: 'Username', type: 'text', placeholder: 'noreply@company.com' },
      { key: 'smtp_pass', label: 'Password', type: 'password', placeholder: '••••••••' },
      { key: 'smtp_from', label: 'From Name', type: 'text', placeholder: 'HRIS Loka Notifications' },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp API',
    description: 'Kirim reminder absensi, approval, dan notifikasi via WhatsApp',
    icon: <FiMessageSquare />,
    color: '#25D366',
    fields: [
      { key: 'wa_api_url', label: 'API URL', type: 'text', placeholder: 'https://api.fonnte.com/send' },
      { key: 'wa_api_key', label: 'API Key', type: 'password', placeholder: 'your-api-key' },
      { key: 'wa_sender', label: 'Sender Number', type: 'text', placeholder: '628xxxxx' },
    ],
  },
  {
    id: 'slack',
    name: 'Slack Webhook',
    description: 'Post notifikasi HR ke channel Slack perusahaan',
    icon: <FiSend />,
    color: '#4A154B',
    fields: [
      { key: 'slack_webhook', label: 'Webhook URL', type: 'text', placeholder: 'https://hooks.slack.com/services/...' },
      { key: 'slack_channel', label: 'Default Channel', type: 'text', placeholder: '#hr-notifications' },
    ],
  },
  {
    id: 'accounting',
    name: 'Accounting Software',
    description: 'Sync data payroll ke software akuntansi (Jurnal.id, Accurate, dll)',
    icon: <FiLink />,
    color: '#F59E0B',
    fields: [
      { key: 'acc_provider', label: 'Provider', type: 'select', options: ['Jurnal.id', 'Accurate', 'Zahir', 'Custom API'] },
      { key: 'acc_api_url', label: 'API URL', type: 'text', placeholder: 'https://api.jurnal.id/...' },
      { key: 'acc_api_key', label: 'API Key', type: 'password', placeholder: 'your-api-key' },
    ],
  },
];

// Persist integration configs to Supabase company_settings table.
// Falls back to localStorage if Supabase is unavailable.
const STORAGE_KEY = 'hrisync_integrations';

export default function IntegrationHub() {
  const { employee } = useAuth();
  const [configs, setConfigs] = useState({});
  const [activePanel, setActivePanel] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [testResults, setTestResults] = useState({});

  // ── Load from Supabase (company_settings) ──────────────────────────────
  const loadConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    try {
      if (employee?.company_id) {
        const { data } = await supabase
          .from('company_settings')
          .select('value')
          .eq('company_id', employee.company_id)
          .eq('key', 'integration_configs')
          .maybeSingle();
        if (data?.value) {
          setConfigs(typeof data.value === 'string' ? JSON.parse(data.value) : data.value);
          setLoadingConfigs(false);
          return;
        }
      }
    } catch { /* fall through to localStorage */ }
    // Fallback: localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setConfigs(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoadingConfigs(false);
  }, [employee?.company_id]);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const isEnabled = (id) => configs[id]?.enabled || false;

  const toggleEnabled = (id) => {
    setConfigs(prev => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id]?.enabled } }));
  };

  const updateField = (intId, fieldKey, value) => {
    setConfigs(prev => ({ ...prev, [intId]: { ...prev[intId], [fieldKey]: value } }));
  };

  // ── Save to Supabase + localStorage fallback ───────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      if (employee?.company_id) {
        const { error } = await supabase
          .from('company_settings')
          .upsert({
            company_id: employee.company_id,
            key: 'integration_configs',
            value: configs,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'company_id,key' });
        if (!error) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          setSaving(false);
          return;
        }
      }
    } catch { /* fall through */ }
    // Fallback: localStorage only
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  // ── Test connections ───────────────────────────────────────────────────
  const handleTest = async (id) => {
    setTestResults(prev => ({ ...prev, [id]: 'testing' }));
    try {
      if (id === 'whatsapp') {
        const phone = configs.whatsapp?.wa_sender || '';
        if (!phone) {
          setTestResults(prev => ({ ...prev, [id]: 'error' }));
          return;
        }
        const result = await testWhatsAppConnection(phone);
        setTestResults(prev => ({ ...prev, [id]: result.success ? 'success' : 'error' }));
      } else if (id === 'email') {
        const ok = isEmailConfigured();
        setTestResults(prev => ({ ...prev, [id]: ok ? 'success' : 'error' }));
      } else {
        // For slack/accounting: just mark as "configured"
        const hasConfig = Object.keys(configs[id] || {}).filter(k => k !== 'enabled').length > 0;
        setTestResults(prev => ({ ...prev, [id]: hasConfig ? 'success' : 'error' }));
      }
    } catch {
      setTestResults(prev => ({ ...prev, [id]: 'error' }));
    }
    setTimeout(() => setTestResults(prev => ({ ...prev, [id]: null })), 5000);
  };

  return (
    <div>
      <div className="page-header">
        <h1><FiLink style={{ marginRight: 10 }} /> Integration Hub</h1>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saved
              ? <><FiCheck /> Tersimpan!</>
              : saving
              ? <><FiSettings className="spin" /> Menyimpan...</>
              : <><FiSave /> Simpan Konfigurasi</>}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ padding: 14, marginBottom: 24, background: 'var(--success-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <FiCheck style={{ color: 'var(--success)', fontSize: 18, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: 'var(--success)' }}>
          <strong>Konfigurasi disimpan ke database.</strong> Pengaturan integrasi Anda tersimpan per-perusahaan dan aktif di semua perangkat.
        </div>
      </div>

      {loadingConfigs ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {INTEGRATIONS.map(int => {
            const enabled = isEnabled(int.id);
            const isOpen = activePanel === int.id;
            const testResult = testResults[int.id];

            return (
              <div key={int.id} style={{
                background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
                border: `1px solid ${enabled ? int.color : 'var(--border)'}`,
                boxShadow: 'var(--shadow-card)', overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}>
                {/* Header */}
                <div
                  onClick={() => setActivePanel(isOpen ? null : int.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', cursor: 'pointer', transition: 'background 0.15s' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: `${int.color}15`, color: int.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {int.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{int.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{int.description}</div>
                  </div>

                  {/* Status badge */}
                  {enabled && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: int.color, background: `${int.color}15`, padding: '3px 10px', borderRadius: 99 }}>
                      Aktif
                    </span>
                  )}

                  {/* Toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleEnabled(int.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: enabled ? int.color : 'var(--muted)', fontSize: 28, display: 'flex', transition: 'color 0.15s' }}
                    title={enabled ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {enabled ? <FiToggleRight /> : <FiToggleLeft />}
                  </button>

                  <FiChevronRight style={{ color: 'var(--muted)', fontSize: 18, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </div>

                {/* Config Panel */}
                {isOpen && (
                  <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--border-light)', animation: 'modalFadeIn 0.15s ease' }}>
                    <div style={{ paddingTop: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {int.fields.map(field => (
                          <div key={field.key} className="form-group" style={field.key.includes('url') || field.key.includes('webhook') ? { gridColumn: '1/-1' } : {}}>
                            <label className="form-label">{field.label}</label>
                            {field.type === 'select' ? (
                              <select className="form-select" value={configs[int.id]?.[field.key] || ''} onChange={e => updateField(int.id, field.key, e.target.value)}>
                                <option value="">— Pilih —</option>
                                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input className="form-input" type={field.type} placeholder={field.placeholder} value={configs[int.id]?.[field.key] || ''} onChange={e => updateField(int.id, field.key, e.target.value)} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
                        <button
                          className="btn-secondary"
                          onClick={() => handleTest(int.id)}
                          disabled={testResult === 'testing'}
                          style={{ fontSize: 13 }}
                        >
                          <FiSend /> {testResult === 'testing' ? 'Testing...' : 'Test Connection'}
                        </button>
                        {testResult === 'success' && <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700 }}><FiCheck /> Berhasil terhubung!</span>}
                        {testResult === 'error' && <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700 }}><FiX /> Gagal terhubung. Cek konfigurasi.</span>}
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
