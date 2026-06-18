import { useState, useEffect } from 'react';
import { FiSave, FiCheck, FiGlobe, FiShield, FiSettings, FiAlertTriangle } from 'react-icons/fi';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import './founder.css';

const TABS = [
  { key: 'platform', label: 'Platform Branding', icon: <FiGlobe /> },
  { key: 'maintenance', label: 'Maintenance', icon: <FiSettings /> },
  { key: 'features', label: 'Feature Flags', icon: <FiShield /> },
];

const DEFAULT_PLATFORM = {
  name: 'HRIS Loka',
  tagline: 'Platform HRIS Modern untuk Indonesia',
  support_email: 'support@hrisloka.id',
  website: 'https://hrisloka.id',
  primary_color: '#0047AB',
};

const DEFAULT_MAINTENANCE = {
  is_maintenance: false,
  message: 'Platform sedang dalam pemeliharaan. Kami akan kembali sebentar lagi.',
  expected_duration: '',
};

const DEFAULT_FEATURES = [
  { key: 'face_attendance', label: 'Face Attendance', desc: 'Enable face recognition-based attendance for all tenants', enabled: true },
  { key: 'ai_ocr', label: 'AI Expense OCR', desc: 'Allow AI-powered receipt scanning for expense reports', enabled: true },
  { key: 'push_notifications', label: 'Push Notifications', desc: 'Enable browser push notification subscriptions', enabled: true },
  { key: 'geofence', label: 'Geofence Attendance', desc: 'GPS-based attendance validation for mobile employees', enabled: true },
  { key: 'public_careers', label: 'Public Career Pages', desc: 'Allow tenants to publish public job listing pages', enabled: true },
  { key: 'multi_branch', label: 'Multi-Branch', desc: 'Enable branch management for enterprise tenants', enabled: true },
  { key: 'integrations', label: 'Integration Hub', desc: 'Third-party integration section (Slack, Notion, etc.)', enabled: false },
];

// ── Helper: load settings from Supabase platform_settings table ──────────────
async function loadPlatformSettings() {
  const { data, error } = await supabase.from('platform_settings').select('key, value');
  if (error || !data) return null;
  const map = {};
  data.forEach(row => { map[row.key] = row.value; });
  return map;
}

// ── Helper: save multiple rows to platform_settings ────────────────────────
async function savePlatformRows(rows) {
  return supabase.from('platform_settings').upsert(rows, { onConflict: 'key' });
}

// ── Toggle component (updated to blue) ────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <label style={{ position: 'relative', width: 44, height: 24, cursor: 'pointer', flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
      <div style={{ width: 44, height: 24, borderRadius: 12, background: checked ? 'var(--primary, #0047AB)' : '#D1D5DB', transition: 'background 0.2s' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: checked ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
    </label>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonField({ w = '100%', h = 38 }) {
  return <div style={{ height: h, background: 'var(--border)', borderRadius: 8, width: w, animation: 'fp-pulse 1.5s ease-in-out infinite' }} />;
}

export default function FounderSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('platform');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [platform, setPlatform] = useState(DEFAULT_PLATFORM);
  const [maintenance, setMaintenance] = useState(DEFAULT_MAINTENANCE);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);

  // ── Load ALL settings from Supabase on mount ─────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const map = await loadPlatformSettings();
        if (map) {
          // Platform branding
          if (map.platform_name || map.platform_tagline) {
            setPlatform({
              name: map.platform_name || DEFAULT_PLATFORM.name,
              tagline: map.platform_tagline || DEFAULT_PLATFORM.tagline,
              support_email: map.platform_support_email || DEFAULT_PLATFORM.support_email,
              website: map.platform_website || DEFAULT_PLATFORM.website,
              primary_color: map.platform_primary_color || DEFAULT_PLATFORM.primary_color,
            });
          }
          // Maintenance
          setMaintenance({
            is_maintenance: map.is_maintenance === 'true',
            message: map.maintenance_message || DEFAULT_MAINTENANCE.message,
            expected_duration: map.maintenance_duration || '',
          });
          // Feature flags
          if (map.feature_flags) {
            try {
              const parsed = JSON.parse(map.feature_flags);
              setFeatures(DEFAULT_FEATURES.map(f => ({
                ...f,
                enabled: parsed[f.key] !== undefined ? parsed[f.key] : f.enabled,
              })));
            } catch { /* keep defaults */ }
          }
        }
        // Fallback: try localStorage cache for platform
        if (!map?.platform_name) {
          const cached = localStorage.getItem('founder_platform_settings');
          if (cached) try { setPlatform(JSON.parse(cached)); } catch { /* ignore */ }
        }
      } catch (err) {
        console.error('[FounderSettings] Load error:', err);
        // Fallback to localStorage cache
        const cached = localStorage.getItem('founder_platform_settings');
        if (cached) try { setPlatform(JSON.parse(cached)); } catch { /* ignore */ }
        const cachedMaint = localStorage.getItem('founder_maintenance_settings');
        if (cachedMaint) try { setMaintenance(JSON.parse(cachedMaint)); } catch { /* ignore */ }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (section) => {
    setSaving(true);
    try {
      if (section === 'platform') {
        // Save to Supabase (persists across browsers/devices)
        await savePlatformRows([
          { key: 'platform_name', value: platform.name },
          { key: 'platform_tagline', value: platform.tagline },
          { key: 'platform_support_email', value: platform.support_email },
          { key: 'platform_website', value: platform.website },
          { key: 'platform_primary_color', value: platform.primary_color },
        ]);
        // Also cache locally for faster loads
        localStorage.setItem('founder_platform_settings', JSON.stringify(platform));
      }

      if (section === 'maintenance') {
        await savePlatformRows([
          { key: 'is_maintenance', value: String(maintenance.is_maintenance) },
          { key: 'maintenance_message', value: maintenance.message },
          { key: 'maintenance_duration', value: maintenance.expected_duration || '' },
        ]);
        localStorage.setItem('founder_maintenance_settings', JSON.stringify(maintenance));
      }

      if (section === 'features') {
        const flagMap = {};
        features.forEach(f => { flagMap[f.key] = f.enabled; });
        await savePlatformRows([
          { key: 'feature_flags', value: JSON.stringify(flagMap) },
        ]);
        localStorage.setItem('founder_feature_flags', JSON.stringify(flagMap));
      }

      setSaved(true);
      toast.success('Settings berhasil disimpan!');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('[FounderSettings] Save error:', err);
      toast.error('Gagal menyimpan settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (key) => {
    setFeatures(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: 24,
    marginBottom: 20,
  };

  return (
    <div>
      <div className="fp-header">
        <div className="fp-header-top">
          <div>
            <h1 className="fp-title">Platform Settings</h1>
            <p className="fp-subtitle">Configure global platform branding and operational settings</p>
          </div>
          {saved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 600, fontSize: 13 }}>
              <FiCheck /> Tersimpan
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', border: '1px solid var(--border)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
              borderRadius: 7, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
              background: activeTab === tab.key ? 'var(--primary, #0047AB)' : 'none',
              color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Platform Branding */}
      {activeTab === 'platform' && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text)' }}>Platform Identity</h3>
          {loading ? (
            <div className="fp-form-grid">
              {[1, 2, 3, 4, 5].map(i => <SkeletonField key={i} />)}
            </div>
          ) : (
            <div className="fp-form-grid">
              <div className="fp-form-group">
                <label className="fp-label">Platform Name</label>
                <input className="fp-input" value={platform.name} onChange={e => setPlatform(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="fp-form-group">
                <label className="fp-label">Support Email</label>
                <input className="fp-input" type="email" value={platform.support_email} onChange={e => setPlatform(f => ({ ...f, support_email: e.target.value }))} />
              </div>
              <div className="fp-form-group fp-form-full">
                <label className="fp-label">Tagline</label>
                <input className="fp-input" value={platform.tagline} onChange={e => setPlatform(f => ({ ...f, tagline: e.target.value }))} />
              </div>
              <div className="fp-form-group">
                <label className="fp-label">Website URL</label>
                <input className="fp-input" value={platform.website} onChange={e => setPlatform(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div className="fp-form-group">
                <label className="fp-label">Primary Color</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="color" value={platform.primary_color} onChange={e => setPlatform(f => ({ ...f, primary_color: e.target.value }))} style={{ width: 44, height: 36, padding: 2, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }} />
                  <input className="fp-input" value={platform.primary_color} onChange={e => setPlatform(f => ({ ...f, primary_color: e.target.value }))} style={{ width: 100 }} />
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="fp-btn fp-btn-primary" onClick={() => handleSave('platform')} disabled={saving || loading}>
              <FiSave size={14} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      )}

      {/* Maintenance */}
      {activeTab === 'maintenance' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', fontSize: 20 }}>
              <FiAlertTriangle />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Maintenance Mode</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>When enabled, all users will see a maintenance screen</div>
            </div>
            <Toggle
              checked={maintenance.is_maintenance}
              onChange={() => setMaintenance(m => ({ ...m, is_maintenance: !m.is_maintenance }))}
            />
          </div>

          {maintenance.is_maintenance && (
            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 20, fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
              ⚠️ Maintenance mode is currently ACTIVE. Users cannot access the platform.
            </div>
          )}

          <div className="fp-form-group">
            <label className="fp-label">Maintenance Message</label>
            <textarea
              className="fp-textarea"
              value={maintenance.message}
              onChange={e => setMaintenance(m => ({ ...m, message: e.target.value }))}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="fp-form-group">
            <label className="fp-label">Expected Duration (optional)</label>
            <input className="fp-input" value={maintenance.expected_duration} onChange={e => setMaintenance(m => ({ ...m, expected_duration: e.target.value }))} placeholder="e.g. 2 hours, 10 minutes" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="fp-btn fp-btn-primary" onClick={() => handleSave('maintenance')} disabled={saving}>
              <FiSave size={14} /> {saving ? 'Menyimpan...' : 'Simpan Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Feature Flags */}
      {activeTab === 'features' && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Feature Flags</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Control which features are available across the entire platform. Changes are saved globally to Supabase.
          </p>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {DEFAULT_FEATURES.map((_, i) => <SkeletonField key={i} h={52} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {features.map((feat, i) => (
                <div key={feat.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 0',
                  borderBottom: i < features.length - 1 ? '1px solid var(--border)' : 'none',
                  gap: 16,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{feat.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{feat.desc}</div>
                  </div>
                  <Toggle checked={feat.enabled} onChange={() => toggleFeature(feat.key)} />
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="fp-btn fp-btn-primary" onClick={() => handleSave('features')} disabled={saving || loading}>
              <FiSave size={14} /> {saving ? 'Menyimpan...' : 'Simpan Feature Flags'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
