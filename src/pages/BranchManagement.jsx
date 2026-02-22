import { useState, useEffect } from 'react';
import {
    FiPlus, FiEdit2, FiTrash2, FiMapPin, FiUsers, FiX, FiCheck,
    FiGlobe, FiChevronDown, FiSearch, FiPhone, FiHome, FiBriefcase,
    FiSettings, FiNavigation, FiUser
} from 'react-icons/fi';
import * as branchService from '../services/branchService';
import { getAllEmployees } from '../services/employeeService';
import '../styles/shared.css';

const LOCATION_TYPES = [
    { value: 'headquarter', label: 'Headquarter (Pusat)', icon: '🏛️' },
    { value: 'branch_office', label: 'Branch Office (Cabang)', icon: '🏢' },
    { value: 'warehouse', label: 'Warehouse (Gudang)', icon: '🏭' },
    { value: 'outlet', label: 'Outlet', icon: '🏪' },
];

const locationLabel = (v) => LOCATION_TYPES.find(t => t.value === v)?.label || v;
const locationIcon = (v) => LOCATION_TYPES.find(t => t.value === v)?.icon || '🏢';

export default function BranchManagement() {
    const [branches, setBranches] = useState([]);
    const [empCounts, setEmpCounts] = useState({});
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editBranch, setEditBranch] = useState(null);
    const [managerSearch, setManagerSearch] = useState('');
    const [showManagerDropdown, setShowManagerDropdown] = useState(false);
    const [openAccordion, setOpenAccordion] = useState({ basic: true, location: true, operational: true });

    const initForm = {
        name: '', code: '', address: '', phone: '',
        latitude: '', longitude: '', radius_meters: 100,
        timezone: 'Asia/Jakarta', is_active: true,
        location_type: 'branch_office', manager_id: '',
    };
    const [form, setForm] = useState(initForm);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const [{ data: branchData }, { data: countData }, { data: empData }] = await Promise.all([
            branchService.getAllBranches(),
            branchService.getBranchEmployeeCounts(),
            getAllEmployees(),
        ]);
        setBranches(branchData || []);
        setEmpCounts(countData || {});
        setEmployees(empData || []);
        setLoading(false);
    };

    const openAdd = () => {
        setEditBranch(null);
        setForm(initForm);
        setManagerSearch('');
        setOpenAccordion({ basic: true, location: true, operational: true });
        setShowModal(true);
    };

    const openEdit = (b) => {
        setEditBranch(b);
        setForm({
            name: b.name, code: b.code, address: b.address || '',
            phone: b.phone || '', latitude: b.latitude,
            longitude: b.longitude, radius_meters: b.radius_meters,
            timezone: b.timezone || 'Asia/Jakarta', is_active: b.is_active,
            location_type: b.location_type || 'branch_office',
            manager_id: b.manager_id || '',
        });
        setManagerSearch(b.manager?.name || '');
        setOpenAccordion({ basic: true, location: true, operational: true });
        setShowModal(true);
    };

    const handleSave = async () => {
        const payload = {
            ...form,
            latitude: parseFloat(form.latitude),
            longitude: parseFloat(form.longitude),
            radius_meters: parseInt(form.radius_meters),
            manager_id: form.manager_id || null,
        };
        if (editBranch) {
            await branchService.updateBranch(editBranch.id, payload);
        } else {
            await branchService.createBranch(payload);
        }
        setShowModal(false);
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Hapus cabang ini? Karyawan yang terhubung harus dipindahkan terlebih dahulu.')) return;
        await branchService.deleteBranch(id);
        fetchData();
    };

    const toggleAccordion = (key) => setOpenAccordion(prev => ({ ...prev, [key]: !prev[key] }));

    const filteredManagers = employees.filter(e =>
        e.name.toLowerCase().includes(managerSearch.toLowerCase()) ||
        e.nip?.toLowerCase().includes(managerSearch.toLowerCase())
    ).slice(0, 8);

    const selectedManager = employees.find(e => e.id === Number(form.manager_id));

    if (loading) {
        return (
            <div className="shared-page">
                <div className="shared-header">
                    <div>
                        <h1>🏢 Manajemen Cabang</h1>
                        <p>Kelola lokasi dan cabang perusahaan</p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="shared-card" style={{ height: 200, background: 'var(--bg)', borderRadius: 16 }}>
                            <div style={{ height: 20, width: '60%', background: 'var(--border)', borderRadius: 8, marginBottom: 12 }} />
                            <div style={{ height: 14, width: '40%', background: 'var(--border)', borderRadius: 6 }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="shared-page">
            <div className="shared-header">
                <div>
                    <h1>🏢 Manajemen Cabang</h1>
                    <p>Kelola lokasi dan cabang perusahaan</p>
                </div>
                <button className="shared-btn-primary" onClick={openAdd}>
                    <FiPlus /> Tambah Cabang
                </button>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Cabang', value: branches.length, icon: <FiMapPin />, color: '#0047AB' },
                    { label: 'Cabang Aktif', value: branches.filter(b => b.is_active).length, icon: <FiCheck />, color: '#10B981' },
                    { label: 'Total Karyawan', value: Object.values(empCounts).reduce((a, b) => a + b, 0), icon: <FiUsers />, color: '#8B5CF6' },
                ].map(s => (
                    <div key={s.label} style={statBox}>
                        <div style={{ color: s.color, fontSize: 18 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Branch Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                {branches.map((b) => (
                    <div key={b.id} className="shared-card" style={{
                        padding: 0, borderRadius: 16, overflow: 'hidden',
                        border: '1.5px solid var(--border)', transition: 'all 0.2s',
                        opacity: b.is_active ? 1 : 0.6,
                    }}>
                        {/* Card Header */}
                        <div style={{
                            background: b.is_active
                                ? 'linear-gradient(135deg, #0047AB 0%, #3B82F6 100%)'
                                : 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)',
                            padding: '16px 20px', color: '#fff',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontSize: 16 }}>{locationIcon(b.location_type)}</span>
                                    <div style={{ fontSize: 16, fontWeight: 700 }}>{b.name}</div>
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 500 }}>{b.code}</div>
                                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{locationLabel(b.location_type)}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => openEdit(b)} style={iconBtn}>
                                    <FiEdit2 size={14} />
                                </button>
                                <button onClick={() => handleDelete(b.id)} style={{ ...iconBtn, background: 'rgba(239,68,68,0.25)' }}>
                                    <FiTrash2 size={14} />
                                </button>
                            </div>
                        </div>
                        {/* Card Body */}
                        <div style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                                <FiMapPin style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }} />
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{b.address || '—'}</span>
                            </div>

                            {/* Manager */}
                            {b.manager && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
                                    {b.manager.photo_url ? (
                                        <img src={b.manager.photo_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                                            {b.manager.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>{b.manager.name}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Kepala Cabang</div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={metricBox}>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{empCounts[b.id] || 0}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>KARYAWAN</div>
                                </div>
                                <div style={metricBox}>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{b.radius_meters}m</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>RADIUS</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                                <span style={tagStyle}>
                                    <FiGlobe size={10} /> {b.timezone === 'Asia/Jakarta' ? 'WIB' : b.timezone === 'Asia/Makassar' ? 'WITA' : b.timezone === 'Asia/Jayapura' ? 'WIT' : b.timezone}
                                </span>
                                <span style={tagStyle}>
                                    📍 {Number(b.latitude).toFixed(4)}, {Number(b.longitude).toFixed(4)}
                                </span>
                                {!b.is_active && <span style={{ ...tagStyle, background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>Nonaktif</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {branches.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
                    <FiMapPin size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                    <p>Belum ada cabang. Klik <b>Tambah Cabang</b> untuk memulai.</p>
                </div>
            )}

            {/* ═══════ MODAL WITH 3 ACCORDION SECTIONS ═══════ */}
            {showModal && (
                <div style={overlay} onClick={() => setShowModal(false)}>
                    <div style={modal} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                                {editBranch ? '✏️ Edit Cabang' : '🏢 Tambah Cabang Baru'}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* ─── Section 1: Informasi Dasar ─── */}
                        <AccordionSection
                            icon={<FiBriefcase />}
                            iconBg="#6366F1"
                            title="Informasi Dasar Cabang"
                            open={openAccordion.basic}
                            onToggle={() => toggleAccordion('basic')}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <FormField label="Nama Cabang" required colSpan={2}>
                                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Cabang Sudirman" style={inputStyle} />
                                </FormField>
                                <FormField label="Kode Cabang" required>
                                    <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="JKT-01" maxLength={20} style={inputStyle} />
                                </FormField>
                                <FormField label="Tipe Lokasi" required>
                                    <select value={form.location_type} onChange={e => setForm(f => ({ ...f, location_type: e.target.value }))} style={inputStyle}>
                                        {LOCATION_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                                        ))}
                                    </select>
                                </FormField>
                                <FormField label="Kepala Cabang / Branch Manager" required colSpan={2}>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'relative' }}>
                                            <FiSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                            <input
                                                value={managerSearch}
                                                onChange={e => { setManagerSearch(e.target.value); setShowManagerDropdown(true); }}
                                                onFocus={() => setShowManagerDropdown(true)}
                                                placeholder="Cari nama karyawan..."
                                                style={{ ...inputStyle, paddingLeft: 32 }}
                                            />
                                        </div>
                                        {selectedManager && !showManagerDropdown && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(0,71,171,0.06)', borderRadius: 6, marginTop: 6, fontSize: 12 }}>
                                                <FiUser size={14} color="var(--primary)" />
                                                <span style={{ fontWeight: 600 }}>{selectedManager.name}</span>
                                                <span style={{ color: 'var(--text-tertiary)' }}>— {selectedManager.position}</span>
                                                <button onClick={() => { setForm(f => ({ ...f, manager_id: '' })); setManagerSearch(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><FiX size={12} /></button>
                                            </div>
                                        )}
                                        {showManagerDropdown && managerSearch && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                background: 'var(--card)', border: '1.5px solid var(--border)',
                                                borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                            }}>
                                                {filteredManagers.length === 0 ? (
                                                    <div style={{ padding: 12, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>Tidak ditemukan</div>
                                                ) : filteredManagers.map(emp => (
                                                    <div key={emp.id} onClick={() => {
                                                        setForm(f => ({ ...f, manager_id: emp.id }));
                                                        setManagerSearch(emp.name);
                                                        setShowManagerDropdown(false);
                                                    }} style={{
                                                        padding: '8px 12px', cursor: 'pointer', display: 'flex',
                                                        alignItems: 'center', gap: 8, fontSize: 13,
                                                        borderBottom: '1px solid var(--border)',
                                                        transition: 'background 0.15s',
                                                    }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                                                            {emp.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{emp.name}</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{emp.nip} • {emp.position}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </FormField>
                            </div>
                        </AccordionSection>

                        {/* ─── Section 2: Lokasi & Geofencing ─── */}
                        <AccordionSection
                            icon={<FiNavigation />}
                            iconBg="#0EA5E9"
                            title="Detail Lokasi & Geofencing"
                            open={openAccordion.location}
                            onToggle={() => toggleAccordion('location')}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <FormField label="Alamat Lengkap" required colSpan={2}>
                                    <textarea
                                        value={form.address}
                                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                        placeholder="Jl. Sudirman No. 1, RT 03/RW 05, Kel. Menteng, Kec. Menteng, Jakarta Pusat 10310"
                                        style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                                    />
                                </FormField>
                                <FormField label="Latitude" required>
                                    <input type="number" step="0.0000001" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="-6.2088000" style={inputStyle} />
                                </FormField>
                                <FormField label="Longitude" required>
                                    <input type="number" step="0.0000001" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="106.8456000" style={inputStyle} />
                                </FormField>

                                {/* Embedded OSM Map Preview */}
                                {form.latitude && form.longitude && (
                                    <div style={{ gridColumn: '1 / -1', borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)', height: 180 }}>
                                        <iframe
                                            title="Map Preview"
                                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.longitude) - 0.005}%2C${Number(form.latitude) - 0.003}%2C${Number(form.longitude) + 0.005}%2C${Number(form.latitude) + 0.003}&layer=mapnik&marker=${form.latitude}%2C${form.longitude}`}
                                            style={{ width: '100%', height: '100%', border: 'none' }}
                                        />
                                    </div>
                                )}

                                <FormField label="Radius Toleransi Absensi (meter)" required>
                                    <div style={{ position: 'relative' }}>
                                        <input type="number" value={form.radius_meters} onChange={e => setForm(f => ({ ...f, radius_meters: e.target.value }))} placeholder="100" style={inputStyle} />
                                        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>meter</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.4 }}>
                                        💡 HP karyawan di luar radius ini → tombol Clock-In terkunci otomatis.
                                    </div>
                                </FormField>
                            </div>
                        </AccordionSection>

                        {/* ─── Section 3: Pengaturan Operasional ─── */}
                        <AccordionSection
                            icon={<FiSettings />}
                            iconBg="#16A34A"
                            title="Pengaturan Operasional"
                            open={openAccordion.operational}
                            onToggle={() => toggleAccordion('operational')}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <FormField label="Zona Waktu" required>
                                    <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} style={inputStyle}>
                                        <option value="Asia/Jakarta">🕐 WIB (Asia/Jakarta)</option>
                                        <option value="Asia/Makassar">🕐 WITA (Asia/Makassar)</option>
                                        <option value="Asia/Jayapura">🕐 WIT (Asia/Jayapura)</option>
                                    </select>
                                </FormField>
                                <FormField label="No. Telepon Cabang">
                                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="021-1234567" style={inputStyle} />
                                </FormField>
                                <FormField label="Status Operasional" colSpan={2}>
                                    <div
                                        onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                                            border: `1.5px solid ${form.is_active ? '#10B981' : 'var(--border)'}`,
                                            background: form.is_active ? 'rgba(16,185,129,0.06)' : 'var(--bg)',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {/* Toggle Switch */}
                                        <div style={{
                                            width: 42, height: 24, borderRadius: 12,
                                            background: form.is_active ? '#10B981' : '#D1D5DB',
                                            position: 'relative', transition: 'background 0.3s',
                                            flexShrink: 0,
                                        }}>
                                            <div style={{
                                                width: 18, height: 18, borderRadius: '50%',
                                                background: '#fff', position: 'absolute', top: 3,
                                                left: form.is_active ? 21 : 3,
                                                transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                            }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: form.is_active ? '#059669' : 'var(--text-secondary)' }}>
                                                {form.is_active ? '✅ Cabang Aktif' : '⛔ Cabang Nonaktif'}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                                {form.is_active ? 'Karyawan dapat melakukan absensi di lokasi ini' : 'Absensi di lokasi ini dinonaktifkan'}
                                            </div>
                                        </div>
                                    </div>
                                </FormField>
                            </div>
                        </AccordionSection>

                        {/* Save / Cancel */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowModal(false)} style={cancelBtn}>Batal</button>
                            <button
                                onClick={handleSave}
                                disabled={!form.name || !form.code || !form.latitude || !form.longitude}
                                style={{
                                    ...saveBtn,
                                    opacity: (!form.name || !form.code || !form.latitude || !form.longitude) ? 0.5 : 1,
                                }}
                            >
                                <FiCheck size={16} /> {editBranch ? 'Simpan Perubahan' : 'Tambah Cabang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sub-components & Style Constants ───

function AccordionSection({ icon, iconBg, title, open, onToggle, children }) {
    return (
        <div style={{
            border: '1.5px solid var(--border)', borderRadius: 12,
            marginBottom: 12, overflow: 'hidden',
            background: 'var(--bg)',
        }}>
            <div onClick={onToggle} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', cursor: 'pointer', userSelect: 'none',
                background: open ? 'var(--card)' : 'var(--bg)',
                transition: 'background 0.15s',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: iconBg, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                    }}>{icon}</div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{title}</span>
                </div>
                <FiChevronDown style={{
                    color: 'var(--text-tertiary)', fontSize: 16,
                    transform: open ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s',
                }} />
            </div>
            {open && (
                <div style={{ padding: '12px 16px 16px', background: 'var(--card)' }}>
                    {children}
                </div>
            )}
        </div>
    );
}

function FormField({ label, required, colSpan, children }) {
    return (
        <div style={{ gridColumn: colSpan === 2 ? '1 / -1' : undefined }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
            </label>
            {children}
        </div>
    );
}

const statBox = {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--card)', border: '1.5px solid var(--border)',
    borderRadius: 14, padding: '14px 20px', flex: '1 1 160px',
};

const iconBtn = {
    background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
    color: '#fff', cursor: 'pointer', padding: 6, display: 'flex',
    transition: 'background 0.2s',
};

const metricBox = {
    background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', textAlign: 'center',
};

const tagStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
    background: 'var(--bg)', borderRadius: 6, padding: '3px 8px',
};

const overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    backdropFilter: 'blur(4px)',
};

const modal = {
    background: 'var(--card)', borderRadius: 20, padding: 28,
    width: '90%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const inputStyle = {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: '1.5px solid var(--border)', borderRadius: 8,
    background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
};

const cancelBtn = {
    padding: '9px 20px', fontSize: 13, fontWeight: 600,
    border: '1.5px solid var(--border)', borderRadius: 10,
    background: 'transparent', color: 'var(--text-secondary)',
    cursor: 'pointer', fontFamily: 'inherit',
};

const saveBtn = {
    padding: '9px 20px', fontSize: 13, fontWeight: 600,
    border: 'none', borderRadius: 10,
    background: 'var(--primary)', color: '#fff',
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 6,
};
