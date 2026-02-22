import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiMail, FiPhone, FiMapPin, FiCalendar, FiDollarSign, FiFileText, FiShield, FiBook } from 'react-icons/fi';
import { getContractDaysRemaining, formatCurrency } from '../lib/utils';
import { getEmployeeById } from '../services/employeeService';
import { calculateSalary } from '../lib/payrollEngine';
import ContractBadge from '../components/ContractBadge';
import EmployeeModal from '../components/EmployeeModal';
import '../styles/shared.css';

export default function EmployeeProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState('biodata');
    const [editOpen, setEditOpen] = useState(false);
    const [emp, setEmp] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployee = async () => {
            setLoading(true);
            const { data, error } = await getEmployeeById(id);
            if (!error) {
                setEmp(data);
            }
            setLoading(false);
        };
        fetchEmployee();
    }, [id]);

    if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
    if (!emp) return <div className="empty-state"><h3>Karyawan tidak ditemukan</h3></div>;

    const docs = []; // Real documents to be implemented
    const salary = calculateSalary(emp, []);
    const att = null; // Real today attendance to be implemented if needed
    const contractDays = getContractDaysRemaining(emp.contract_end || emp.contractEnd);

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="action-btn" onClick={() => navigate('/employees')}><FiArrowLeft /></button>
                    <h1>Profil Karyawan</h1>
                </div>
                <button className="btn-primary" onClick={() => setEditOpen(true)}><FiEdit2 /> Edit Data</button>
            </div>

            {/* Profile Header */}
            <div className="info-card" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <div className="employee-avatar" style={{ width: 72, height: 72, fontSize: 22 }}>
                    {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{emp.name}</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>{emp.position} — {emp.division}</p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiMail />{emp.email}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiPhone />{emp.phone}</span>
                    </div>
                </div>
                <ContractBadge status={emp.status} contractEnd={emp.contractEnd} />
            </div>

            {/* Tabs */}
            <div className="tab-bar">
                {['biodata', 'employment', 'documents', 'payroll'].map((t) => (
                    <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                        {t === 'biodata' ? 'Biodata' : t === 'employment' ? 'Kepegawaian' : t === 'documents' ? 'Dokumen' : 'Payroll'}
                    </button>
                ))}
            </div>

            {/* Biodata Tab */}
            {tab === 'biodata' && (
                <div className="cards-grid">
                    <div className="info-card">
                        <div className="info-card-title"><FiShield style={{ marginRight: 6 }} />Data Pribadi</div>
                        <div className="info-row"><span className="info-row-label">Nama Lengkap</span><span className="info-row-value">{emp.name}</span></div>
                        <div className="info-row"><span className="info-row-label">NIK</span><span className="info-row-value">{emp.nik}</span></div>
                        <div className="info-row"><span className="info-row-label">Tanggal Lahir</span><span className="info-row-value">{emp.birth_date ? new Date(emp.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span></div>
                        <div className="info-row"><span className="info-row-label">Alamat</span><span className="info-row-value">{emp.address}</span></div>
                    </div>
                    <div className="info-card">
                        <div className="info-card-title"><FiPhone style={{ marginRight: 6 }} />Kontak Darurat</div>
                        <div className="info-row"><span className="info-row-label">Nama</span><span className="info-row-value">{emp.emergency_contact?.name || emp.emergencyContact?.name || '-'}</span></div>
                        <div className="info-row"><span className="info-row-label">Hubungan</span><span className="info-row-value">{emp.emergency_contact?.relation || emp.emergencyContact?.relation || '-'}</span></div>
                        <div className="info-row"><span className="info-row-label">Telepon</span><span className="info-row-value">{emp.emergency_contact?.phone || emp.emergencyContact?.phone || '-'}</span></div>
                    </div>
                    <div className="info-card">
                        <div className="info-card-title"><FiBook style={{ marginRight: 6 }} />Pendidikan</div>
                        <div className="info-row"><span className="info-row-label">Jenjang</span><span className="info-row-value">{emp.education?.level || '-'}</span></div>
                        <div className="info-row"><span className="info-row-label">Jurusan</span><span className="info-row-value">{emp.education?.major || '-'}</span></div>
                        <div className="info-row"><span className="info-row-label">Universitas</span><span className="info-row-value">{emp.education?.university || '-'}</span></div>
                        <div className="info-row"><span className="info-row-label">Tahun Lulus</span><span className="info-row-value">{emp.education?.year || '-'}</span></div>
                    </div>
                    <div className="info-card">
                        <div className="info-card-title"><FiDollarSign style={{ marginRight: 6 }} />Rekening Bank</div>
                        <div className="info-row"><span className="info-row-label">Bank</span><span className="info-row-value">{emp.bank_account?.bank || emp.bankAccount?.bank || '-'}</span></div>
                        <div className="info-row"><span className="info-row-label">No. Rekening</span><span className="info-row-value">{emp.bank_account?.number || emp.bankAccount?.number || '-'}</span></div>
                        <div className="info-row"><span className="info-row-label">Atas Nama</span><span className="info-row-value">{emp.bank_account?.holder || emp.bankAccount?.holder || '-'}</span></div>
                    </div>
                </div>
            )}

            {/* Employment Tab */}
            {tab === 'employment' && (
                <div className="cards-grid">
                    <div className="info-card">
                        <div className="info-card-title"><FiCalendar style={{ marginRight: 6 }} />Info Kepegawaian</div>
                        <div className="info-row"><span className="info-row-label">NIP</span><span className="info-row-value">{emp.nip}</span></div>
                        <div className="info-row"><span className="info-row-label">Divisi</span><span className="info-row-value">{emp.division}</span></div>
                        <div className="info-row"><span className="info-row-label">Jabatan</span><span className="info-row-value">{emp.position}</span></div>
                        <div className="info-row"><span className="info-row-label">Status</span><span className="info-row-value">{emp.status === 'permanent' ? 'Karyawan Tetap' : 'Karyawan Kontrak'}</span></div>
                        <div className="info-row"><span className="info-row-label">Tanggal Bergabung</span><span className="info-row-value">{emp.join_date || emp.joinDate ? new Date(emp.join_date || emp.joinDate).toLocaleDateString('id-ID') : '-'}</span></div>
                    </div>
                    {(emp.status === 'contract' || emp.contract_end) && (
                        <div className="info-card">
                            <div className="info-card-title"><FiFileText style={{ marginRight: 6 }} />Info Kontrak</div>
                            <div className="info-row"><span className="info-row-label">Mulai Kontrak</span><span className="info-row-value">{emp.contract_start || emp.contractStart ? new Date(emp.contract_start || emp.contractStart).toLocaleDateString('id-ID') : '-'}</span></div>
                            <div className="info-row"><span className="info-row-label">Akhir Kontrak</span><span className="info-row-value">{emp.contract_end || emp.contractEnd ? new Date(emp.contract_end || emp.contractEnd).toLocaleDateString('id-ID') : '-'}</span></div>
                            <div className="info-row"><span className="info-row-label">Sisa Waktu</span>
                                <span className="info-row-value" style={{ color: contractDays <= 30 ? 'var(--danger)' : contractDays <= 90 ? 'var(--warning)' : 'var(--success)' }}>
                                    {contractDays !== null ? `${contractDays} hari` : '-'}
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="info-card">
                        <div className="info-card-title"><FiMapPin style={{ marginRight: 6 }} />Cuti & Kehadiran</div>
                        <div className="info-row"><span className="info-row-label">Kuota Cuti</span><span className="info-row-value">{emp.leave_quota || emp.leaveQuota} hari</span></div>
                        <div className="info-row"><span className="info-row-label">Cuti Terpakai</span><span className="info-row-value">{emp.leave_used || emp.leaveUsed} hari</span></div>
                        <div className="info-row"><span className="info-row-label">Sisa Cuti</span><span className="info-row-value" style={{ color: 'var(--success)' }}>{(emp.leave_quota || emp.leaveQuota) - (emp.leave_used || emp.leaveUsed)} hari</span></div>
                        <div className="info-row"><span className="info-row-label">Status Hari Ini</span>
                            <span className={`status-badge ${att?.status || 'absent'}`}>
                                {att?.status === 'present' ? 'Hadir' : att?.status === 'late' ? 'Terlambat' : att?.status === 'leave' ? 'Cuti' : 'Tidak Hadir'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Documents Tab */}
            {tab === 'documents' && (
                <div>
                    <div className="data-table-card">
                        <table className="data-table">
                            <thead><tr><th>Nama Dokumen</th><th>File</th><th>Tanggal Upload</th><th>Ukuran</th></tr></thead>
                            <tbody>
                                {docs.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Tidak ada dokumen.</td></tr>
                                ) : docs.map((doc) => (
                                    <tr key={doc.id}>
                                        <td style={{ fontWeight: 600 }}>{doc.name}</td>
                                        <td style={{ color: 'var(--primary)' }}>{doc.fileName}</td>
                                        <td>{new Date(doc.uploadDate).toLocaleDateString('id-ID')}</td>
                                        <td>{doc.size}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Payroll Tab */}
            {tab === 'payroll' && (
                <div className="cards-grid">
                    <div className="info-card">
                        <div className="info-card-title"><FiDollarSign style={{ marginRight: 6 }} />Komponen Gaji</div>
                        <div className="info-row"><span className="info-row-label">Gaji Pokok</span><span className="info-row-value">{formatCurrency(salary.baseSalary)}</span></div>
                        <div className="info-row"><span className="info-row-label">Tunjangan</span><span className="info-row-value">{formatCurrency(salary.allowance)}</span></div>
                        <div className="info-row"><span className="info-row-label">Lembur</span><span className="info-row-value">{formatCurrency(salary.overtimePay)}</span></div>
                        <div className="info-row" style={{ borderTop: '2px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                            <span className="info-row-label" style={{ fontWeight: 600 }}>Penghasilan Kotor</span>
                            <span className="info-row-value" style={{ fontSize: 15 }}>{formatCurrency(salary.grossIncome)}</span>
                        </div>
                    </div>
                    <div className="info-card">
                        <div className="info-card-title" style={{ color: 'var(--danger)' }}>Potongan</div>
                        <div className="info-row"><span className="info-row-label">BPJS Kesehatan</span><span className="info-row-value">- {formatCurrency(salary.bpjs.bpjsKesehatan)}</span></div>
                        <div className="info-row"><span className="info-row-label">BPJS JHT</span><span className="info-row-value">- {formatCurrency(salary.bpjs.bpjsJHT)}</span></div>
                        <div className="info-row"><span className="info-row-label">BPJS JP</span><span className="info-row-value">- {formatCurrency(salary.bpjs.bpjsJP)}</span></div>
                        <div className="info-row"><span className="info-row-label">PPh 21</span><span className="info-row-value">- {formatCurrency(salary.pph21)}</span></div>
                        <div className="info-row" style={{ borderTop: '2px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                            <span className="info-row-label" style={{ fontWeight: 600 }}>Total Potongan</span>
                            <span className="info-row-value" style={{ color: 'var(--danger)', fontSize: 15 }}>- {formatCurrency(salary.totalDeductions)}</span>
                        </div>
                    </div>
                    <div className="info-card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: '#fff', border: 'none' }}>
                        <div className="info-card-title" style={{ color: 'rgba(255,255,255,0.7)' }}>Take Home Pay</div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{formatCurrency(salary.takeHomePay)}</div>
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Per bulan (sebelum lembur)</div>
                    </div>
                </div>
            )}

            <EmployeeModal isOpen={editOpen} onClose={() => setEditOpen(false)} onSave={() => { }} employee={emp} />
        </div>
    );
}
