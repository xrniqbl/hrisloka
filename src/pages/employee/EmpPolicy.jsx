import { useState, useEffect } from 'react';
import {
  HiArrowTopRightOnSquare,
  HiBookOpen,
  HiChevronRight,
  HiClipboardDocumentList,
  HiDocument,
  HiDocumentText,
  HiMagnifyingGlass,
  HiShieldCheck
} from 'react-icons/hi2';
import { getAllPolicies } from '../../services/policyService';
import { useTranslation } from '../../lib/i18n';
import '../../styles/shared.css';

const CATEGORY_ICONS = {
 sop: <HiClipboardDocumentList size={16} />,
 regulation: <HiShieldCheck size={16} />,
 policy: <HiBookOpen size={16} />,
 guideline: <HiDocumentText size={16} />,
 template: <HiDocument size={16} />,
};

const CATEGORY_COLORS = {
 sop: '#3B82F6',
 regulation: '#8B5CF6',
 policy: '#10B981',
 guideline: '#F59E0B',
 template: '#EC4899',
};

const CATEGORY_LABELS_ID = { sop: 'SOP', regulation: 'Peraturan Perusahaan', policy: 'Kebijakan HR', guideline: 'Panduan Kerja', template: 'Template Dokumen' };
const CATEGORY_LABELS_EN = { sop: 'SOP', regulation: 'Company Regulation', policy: 'HR Policy', guideline: 'Work Guideline', template: 'Document Template' };

// Fallback static policies if Supabase table not yet created
const FALLBACK_POLICIES = [
  { id: 1, title: 'SOP Absensi & Kehadiran', category: 'sop', version: '2.1', effective_date: '2026-01-01', description: 'Prosedur standar absensi harian, izin, dan keterlambatan.', status: 'active', updated_at: '2026-01-15' },
  { id: 2, title: 'Peraturan Perusahaan 2026', category: 'regulation', version: '1.0', effective_date: '2026-01-01', description: 'Peraturan perusahaan yang berlaku untuk seluruh karyawan.', status: 'active', updated_at: '2026-01-01' },
  { id: 3, title: 'Kebijakan Cuti & Izin', category: 'policy', version: '3.0', effective_date: '2026-01-01', description: 'Ketentuan jenis cuti, kuota, dan prosedur pengajuan.', status: 'active', updated_at: '2025-12-15' },
  { id: 4, title: 'Kebijakan Work From Home', category: 'policy', version: '1.2', effective_date: '2026-03-01', description: 'Ketentuan dan persyaratan bekerja dari rumah.', status: 'active', updated_at: '2026-02-28' },
  { id: 5, title: 'Panduan Onboarding Karyawan Baru', category: 'guideline', version: '2.0', effective_date: '2025-08-01', description: 'Langkah-langkah onboarding dari hari pertama sampai 90 hari.', status: 'active', updated_at: '2025-08-01' },
  { id: 6, title: 'SOP Reimbursement', category: 'sop', version: '1.5', effective_date: '2025-10-01', description: 'Prosedur pengajuan dan approval reimbursement.', status: 'active', updated_at: '2025-10-01' },
  { id: 7, title: 'Kode Etik Karyawan', category: 'regulation', version: '1.0', effective_date: '2025-01-01', description: 'Standar perilaku dan etika yang harus dipatuhi seluruh karyawan.', status: 'active', updated_at: '2025-01-01' },
];

export default function EmpPolicy() {
  const { locale } = useTranslation();
  const [policies, setPolicies] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await getAllPolicies();
      if (data && data.length > 0) {
        setPolicies(data);
      } else {
        // Fallback to static data if table doesn't exist yet
        setPolicies(FALLBACK_POLICIES);
      }
      setLoading(false);
    }
    load();
  }, []);

  const CATEGORY_LABELS = locale === 'en' ? CATEGORY_LABELS_EN : CATEGORY_LABELS_ID;
  const categories = ['all', ...Object.keys(CATEGORY_LABELS).filter(k => policies.some(p => p.category === k))];

 const filtered = policies.filter(p => {
 const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
 const matchCat = activeCategory === 'all' || p.category === activeCategory;
 return matchSearch && matchCat;
 });

 const grouped = {};
 filtered.forEach(p => {
 if (!grouped[p.category]) grouped[p.category] = [];
 grouped[p.category].push(p);
 });

  if (loading) return (
    <div style={{ animation: "fadeInUp 0.3s ease" }}>
      <div className="emp-card emp-card-gradient" style={{ marginBottom: 16, padding: '20px 16px' }}>
        <div className="skeleton" style={{ height: 20, width: 180, borderRadius: 8, opacity: 0.3, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: 120, borderRadius: 6, opacity: 0.2, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 38, borderRadius: 10, opacity: 0.2 }} />
      </div>
      {[1,2,3,4].map(i => <div key={i} className="emp-card" style={{ marginBottom: 8, height: 72 }}><div className="skeleton" style={{ height: '100%', borderRadius: 8 }} /></div>)}
    </div>
  );

  return (
    <div style={{ paddingBottom: 24, animation: 'fadeInUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0047AB 100%)', borderRadius: 'var(--radius-md)', padding: '20px 16px', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <HiBookOpen size={20} />
          <div style={{ fontSize: 17, fontWeight: 800 }}>{locale === 'en' ? 'Company Policies' : 'Kebijakan Perusahaan'}</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>{policies.length} {locale === 'en' ? 'active policies available' : 'kebijakan aktif tersedia'}</div>
        <div style={{ position: 'relative', marginTop: 14 }}>
          <HiMagnifyingGlass size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.6)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={locale === 'en' ? 'Search policies...' : 'Cari kebijakan...'}
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, outline: 'none', backdropFilter: 'blur(8px)' }} />
        </div>
      </div>

      {/* Category filter */}
      <div className="emp-chips" style={{ marginBottom: 16 }}>
        {categories.map(cat => (
          <button key={cat} className={`emp-chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
            style={activeCategory === cat && cat !== 'all' ? { background: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] } : {}}
          >
            {cat === 'all' ? (locale === 'en' ? 'All' : 'Semua') : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Policy list */}
      {filtered.length === 0 ? (
        <div className="emp-card emp-empty">
          <div className="emp-empty-icon"><HiBookOpen size={24} /></div>
          <div className="emp-empty-title">{locale === 'en' ? 'No policies found' : 'Tidak ada kebijakan ditemukan'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(p => {
            const color = CATEGORY_COLORS[p.category] || '#6D8196';
            const isOpen = expandedId === p.id;
            return (
              <div key={p.id} className="emp-card emp-card-stagger" style={{ overflow: 'hidden' }}>
                <div onClick={() => setExpandedId(isOpen ? null : p.id)}
                  style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderLeft: `4px solid ${color}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {CATEGORY_ICONS[p.category] || <HiDocumentText size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{p.title}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${color}18`, color }}>{CATEGORY_LABELS[p.category]}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>v{p.version} • {locale === 'en' ? 'Effective' : 'Berlaku'}: {p.effective_date}</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--muted)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>
                    <HiChevronRight size={16} />
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ paddingTop: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{p.description}</div>
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                      <span>{locale === 'en' ? 'Last updated' : 'Terakhir diupdate'}: {p.updated_at}</span>
                      {p.file_url && <a href={p.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color, fontWeight: 700, textDecoration: 'none' }}>
                        <HiArrowTopRightOnSquare size={12} /> {locale === 'en' ? 'Open Document' : 'Buka Dokumen'}
                      </a>}
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
