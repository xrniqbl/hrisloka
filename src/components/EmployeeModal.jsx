import { useState, useEffect } from 'react';
import { FiX, FiSearch } from 'react-icons/fi';
import { getActiveDepartments } from '../services/departmentService';
import { getAvailableBanks, COMMON_BANKS } from '../services/bankValidationService';
import '../styles/shared.css';

const initialForm = {
    name: '', email: '', phone: '', division: '', position: '',
    status: 'permanent', joinDate: '', birthDate: '', gender: '', address: '', nik: '',
    contractStart: '', contractEnd: '',
    baseSalary: '', allowance: '',
    emergencyName: '', emergencyRelation: '', emergencyPhone: '',
    bankName: '', bankNumber: '', bankHolder: '',
    eduLevel: '', eduMajor: '', eduUniversity: '', eduYear: '',
};

export default function EmployeeModal({ isOpen, onClose, onSave, employee = null, divisions = [] }) {
    const [form, setForm] = useState(employee ? {
        name: employee.name || '', email: employee.email || '', phone: employee.phone || '',
        division: employee.division || '', position: employee.position || '', status: employee.status || 'permanent',
        joinDate: employee.join_date || employee.joinDate || '', birthDate: employee.birth_date || employee.birthDate || '', address: employee.address || '', nik: employee.nik || '',
        contractStart: employee.contract_start || employee.contractStart || '', contractEnd: employee.contract_end || employee.contractEnd || '',
        baseSalary: employee.base_salary || employee.baseSalary || '', allowance: employee.allowance || '',
        emergencyName: employee.emergency_name || employee.emergencyContact?.name || '', emergencyRelation: employee.emergency_relation || employee.emergencyContact?.relation || '', emergencyPhone: employee.emergency_phone || employee.emergencyContact?.phone || '',
        bankName: employee.bank_name || employee.bankAccount?.bank || '', bankNumber: employee.bank_number || employee.bankAccount?.number || '', bankHolder: employee.bank_holder || employee.bankAccount?.holder || '',
        eduLevel: employee.edu_level || employee.education?.level || '', eduMajor: employee.edu_major || employee.education?.major || '', eduUniversity: employee.edu_university || employee.education?.university || '', eduYear: employee.edu_year || employee.education?.year || '',
    } : initialForm);

    const [activeTab, setActiveTab] = useState('personal');

    // Dynamic data from DB + API
    const [departments, setDepartments] = useState([]);
    const [bankList, setBankList] = useState(COMMON_BANKS);
    const [bankSearch, setBankSearch] = useState('');

    // Fallback departments (matches departments_setup.sql seed data)
    const FALLBACK_DEPTS = [
        { id: 1, name: 'Human Resources & General Affairs' },
        { id: 2, name: 'Finance & Accounting' },
        { id: 3, name: 'Information Technology' },
        { id: 4, name: 'Legal & Compliance' },
        { id: 5, name: 'Sales & Business Development' },
        { id: 6, name: 'Marketing & Communications' },
        { id: 7, name: 'Customer Service' },
        { id: 8, name: 'Product & Design' },
        { id: 9, name: 'Operations & Logistics' },
        { id: 10, name: 'Production & Manufacturing' },
    ];

    useEffect(() => {
        if (!isOpen) return;
        // Fetch departments from Supabase (fallback to hardcoded list)
        getActiveDepartments().then(({ data, error }) => {
            if (data && data.length > 0) {
                setDepartments(data);
            } else {
                console.warn('[EmployeeModal] Departments fetch failed, using fallback:', error);
                setDepartments(FALLBACK_DEPTS);
            }
        }).catch(() => setDepartments(FALLBACK_DEPTS));

        // Fetch 130+ banks from API.co.id (free endpoint, via proxy)
        getAvailableBanks().then(({ data }) => {
            if (data && data.length > 0) setBankList(data);
        });
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
        onClose();
    };

    // Filter banks by search query
    const filteredBanks = bankSearch
        ? bankList.filter(b => b.bank_name.toLowerCase().includes(bankSearch.toLowerCase()))
        : bankList;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{employee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</h2>
                    <button className="modal-close" onClick={onClose}><FiX /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="tab-bar" style={{ margin: '0 0 16px' }}>
                            {['personal', 'employment', 'emergency', 'bank', 'education'].map((tab) => (
                                <button key={tab} type="button" className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}>
                                    {tab === 'personal' ? 'Data Pribadi' : tab === 'employment' ? 'Kepegawaian' :
                                        tab === 'emergency' ? 'Kontak Darurat' : tab === 'bank' ? 'Rekening Bank' : 'Pendidikan'}
                                </button>
                            ))}
                        </div>
                        {/* Personal */}
                        {activeTab === 'personal' && (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Nama Lengkap *</label>
                                    <input className="form-input" name="name" value={form.name} onChange={handleChange} required placeholder="Masukkan nama lengkap" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">NIK (No. KTP)</label>
                                    <input className="form-input" name="nik" value={form.nik} onChange={handleChange} placeholder="3201XXXXXXXXXX" maxLength="16" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="email@company.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">No. Telepon</label>
                                    <input className="form-input" name="phone" value={form.phone} onChange={handleChange} placeholder="0812-XXXX-XXXX" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal Lahir</label>
                                    <input className="form-input" name="birthDate" type="date" value={form.birthDate} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jenis Kelamin</label>
                                    <select className="form-select" name="gender" value={form.gender} onChange={handleChange}>
                                        <option value="">Pilih</option>
                                        <option value="male">Laki-laki</option>
                                        <option value="female">Perempuan</option>
                                    </select>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Alamat</label>
                                    <textarea className="form-textarea" name="address" value={form.address} onChange={handleChange} placeholder="Alamat lengkap" />
                                </div>
                            </div>
                        )}

                        {/* Employment */}
                        {activeTab === 'employment' && (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Divisi *</label>
                                    <select className="form-select" name="division" value={form.division} onChange={handleChange} required>
                                        <option value="">Pilih Divisi</option>
                                        {departments.length > 0
                                            ? departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)
                                            : divisions.map((d) => <option key={d} value={d}>{d}</option>)
                                        }
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jabatan *</label>
                                    <input className="form-input" name="position" value={form.position} onChange={handleChange} required placeholder="Jabatan" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status Karyawan *</label>
                                    <select className="form-select" name="status" value={form.status} onChange={handleChange} required>
                                        <option value="permanent">Karyawan Tetap</option>
                                        <option value="contract">Karyawan Kontrak</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal Bergabung *</label>
                                    <input className="form-input" name="joinDate" type="date" value={form.joinDate} onChange={handleChange} required />
                                </div>
                                {form.status === 'contract' && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Mulai Kontrak *</label>
                                            <input className="form-input" name="contractStart" type="date" value={form.contractStart} onChange={handleChange} required />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Akhir Kontrak *</label>
                                            <input className="form-input" name="contractEnd" type="date" value={form.contractEnd} onChange={handleChange} required />
                                        </div>
                                    </>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Gaji Pokok (IDR)</label>
                                    <input className="form-input" name="baseSalary" type="number" value={form.baseSalary} onChange={handleChange} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tunjangan (IDR)</label>
                                    <input className="form-input" name="allowance" type="number" value={form.allowance} onChange={handleChange} placeholder="0" />
                                </div>
                            </div>
                        )}

                        {/* Emergency Contact */}
                        {activeTab === 'emergency' && (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Nama</label>
                                    <input className="form-input" name="emergencyName" value={form.emergencyName} onChange={handleChange} placeholder="Nama kontak darurat" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hubungan</label>
                                    <select className="form-select" name="emergencyRelation" value={form.emergencyRelation} onChange={handleChange}>
                                        <option value="">Pilih</option>
                                        <option value="Spouse">Suami/Istri</option>
                                        <option value="Parent">Orang Tua</option>
                                        <option value="Sibling">Saudara</option>
                                        <option value="Child">Anak</option>
                                        <option value="Other">Lainnya</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">No. Telepon</label>
                                    <input className="form-input" name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} placeholder="0812-XXXX-XXXX" />
                                </div>
                            </div>
                        )}

                        {/* Bank — Dynamic 130+ banks from API.co.id */}
                        {activeTab === 'bank' && (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Nama Bank</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'relative', marginBottom: 6 }}>
                                            <FiSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                            <input
                                                type="text"
                                                placeholder="Cari bank..."
                                                value={bankSearch}
                                                onChange={(e) => setBankSearch(e.target.value)}
                                                className="form-input"
                                                style={{ paddingLeft: 32, fontSize: 12 }}
                                            />
                                        </div>
                                        <select className="form-select" name="bankName" value={form.bankName} onChange={handleChange}
                                            style={{ maxHeight: 200 }}>
                                            <option value="">Pilih Bank</option>
                                            {filteredBanks.map((b) => (
                                                <option key={b.bank_code} value={b.bank_name}>{b.bank_name}</option>
                                            ))}
                                        </select>
                                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                                            {bankList.length} bank tersedia via API.co.id
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nomor Rekening</label>
                                    <input className="form-input" name="bankNumber" value={form.bankNumber} onChange={handleChange} placeholder="1234567890" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Atas Nama</label>
                                    <input className="form-input" name="bankHolder" value={form.bankHolder} onChange={handleChange} placeholder="Nama pemilik rekening" />
                                </div>
                            </div>
                        )}

                        {/* Education */}
                        {activeTab === 'education' && (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Jenjang Pendidikan</label>
                                    <select className="form-select" name="eduLevel" value={form.eduLevel} onChange={handleChange}>
                                        <option value="">Pilih</option>
                                        <option value="SMA">SMA/SMK</option>
                                        <option value="D3">D3</option>
                                        <option value="S1">S1</option>
                                        <option value="S2">S2</option>
                                        <option value="S3">S3</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jurusan</label>
                                    <input className="form-input" name="eduMajor" value={form.eduMajor} onChange={handleChange} placeholder="Jurusan" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Universitas / Institusi</label>
                                    <input className="form-input" name="eduUniversity" value={form.eduUniversity} onChange={handleChange} placeholder="Nama universitas" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tahun Lulus</label>
                                    <input className="form-input" name="eduYear" type="number" value={form.eduYear} onChange={handleChange} placeholder="2020" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
                        <button type="submit" className="btn-primary">{employee ? 'Simpan Perubahan' : 'Tambah Karyawan'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
