import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import '../styles/shared.css';

const initialForm = {
    name: '', email: '', phone: '', division: '', position: '',
    status: 'permanent', joinDate: '', birthDate: '', address: '', nik: '',
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

    if (!isOpen) return null;

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
        onClose();
    };

    // divisions comes from parent prop now

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{employee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</h2>
                    <button className="modal-close" onClick={onClose}><FiX /></button>
                </div>

                <div style={{ padding: '0 28px' }}>
                    <div className="tab-bar">
                        {['personal', 'employment', 'emergency', 'bank', 'education'].map((tab) => (
                            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}>
                                {tab === 'personal' ? 'Data Pribadi' : tab === 'employment' ? 'Kepegawaian' :
                                    tab === 'emergency' ? 'Kontak Darurat' : tab === 'bank' ? 'Rekening Bank' : 'Pendidikan'}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
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
                                        {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
                                        <option value="Other">Lainnya</option>
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

                        {/* Bank */}
                        {activeTab === 'bank' && (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Nama Bank</label>
                                    <select className="form-select" name="bankName" value={form.bankName} onChange={handleChange}>
                                        <option value="">Pilih Bank</option>
                                        <option value="BCA">BCA</option>
                                        <option value="Mandiri">Mandiri</option>
                                        <option value="BNI">BNI</option>
                                        <option value="BRI">BRI</option>
                                        <option value="CIMB">CIMB Niaga</option>
                                        <option value="Other">Lainnya</option>
                                    </select>
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
