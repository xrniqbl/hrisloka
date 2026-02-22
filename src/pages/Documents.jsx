import { useState, useEffect, useRef } from 'react';
import { FiUpload, FiDownload, FiTrash2, FiFile, FiSearch, FiFilter, FiExternalLink } from 'react-icons/fi';
import * as documentService from '../services/documentService';
import * as employeeService from '../services/employeeService';
import '../styles/shared.css';

const docTypes = ['KTP', 'Ijazah', 'Kontrak Kerja', 'Sertifikat', 'NPWP', 'Lainnya'];

export default function Documents() {
    const [documents, setDocuments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [empFilter, setEmpFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [uploadForm, setUploadForm] = useState({ employeeId: '', type: '', file: null });
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: docData } = await documentService.getAllDocuments();
        const { data: empData } = await employeeService.getAllEmployees();
        setDocuments(docData || []);
        setEmployees(empData || []);
        setLoading(false);
    };

    const filtered = documents.filter((doc) => {
        const empName = doc.employees?.name || '';
        const matchSearch = (doc.name || '').toLowerCase().includes(search.toLowerCase())
            || (doc.type || '').toLowerCase().includes(search.toLowerCase())
            || empName.toLowerCase().includes(search.toLowerCase());
        const matchEmp = !empFilter || String(doc.employee_id) === empFilter;
        const matchType = !typeFilter || doc.type === typeFilter;
        return matchSearch && matchEmp && matchType;
    });

    const handleUpload = async () => {
        if (!uploadForm.file || !uploadForm.employeeId || !uploadForm.type) return;
        setUploading(true);
        const { error } = await documentService.uploadDocument(uploadForm.file, Number(uploadForm.employeeId), uploadForm.type);
        setUploading(false);
        if (!error) {
            setShowUpload(false);
            setUploadForm({ employeeId: '', type: '', file: null });
            fetchData();
        } else {
            alert('Upload gagal: ' + error.message);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) setUploadForm({ ...uploadForm, file });
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    const statusColors = { pending: '#F59E0B', approved: '#16A34A', rejected: '#DC2626' };

    return (
        <div>
            <div className="page-header">
                <h1>Manajemen Dokumen</h1>
                <button className="btn-primary" onClick={() => setShowUpload(true)}><FiUpload /> Upload Dokumen</button>
            </div>

            <div className="filters-bar">
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input className="filter-search" style={{ paddingLeft: 38 }} placeholder="Cari dokumen..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="">Semua Jenis</option>
                    {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select className="filter-select" value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
                    <option value="">Semua Karyawan</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
            </div>

            {/* Type Quick Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <button
                    onClick={() => setTypeFilter('')}
                    style={{
                        padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: !typeFilter ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: !typeFilter ? 'var(--primary)' : 'var(--surface)',
                        color: !typeFilter ? '#fff' : 'var(--text)',
                    }}
                >Semua</button>
                {docTypes.map(t => (
                    <button
                        key={t}
                        onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                        style={{
                            padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: typeFilter === t ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: typeFilter === t ? 'var(--primary)' : 'var(--surface)',
                            color: typeFilter === t ? '#fff' : 'var(--text)',
                        }}
                    >{t}</button>
                ))}
            </div>

            <div className="data-table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Dokumen</th>
                            <th>Jenis</th>
                            <th>Karyawan</th>
                            <th>Status</th>
                            <th>Tanggal Upload</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Memuat data...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Tidak ada dokumen ditemukan.</td></tr>
                        ) : filtered.map((doc) => (
                            <tr key={doc.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <FiFile style={{ color: 'var(--primary)', fontSize: 18 }} />
                                        <span style={{ fontWeight: 600 }}>{doc.name}</span>
                                    </div>
                                </td>
                                <td>
                                    <span style={{
                                        padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                        background: '#EFF6FF', color: '#0047AB',
                                    }}>{doc.type}</span>
                                </td>
                                <td>{doc.employees?.name || '—'}</td>
                                <td>
                                    <span style={{
                                        padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                        color: '#fff', background: statusColors[doc.status] || '#999',
                                    }}>{doc.status}</span>
                                </td>
                                <td>{formatDate(doc.created_at)}</td>
                                <td>
                                    <div className="actions-cell">
                                        {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="action-btn" title="Lihat"><FiExternalLink /></a>}
                                        {doc.url && <a href={doc.url} download className="action-btn" title="Download"><FiDownload /></a>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Upload Modal */}
            {showUpload && (
                <div className="modal-overlay" onClick={() => setShowUpload(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Upload Dokumen</h2>
                            <button className="modal-close" onClick={() => setShowUpload(false)}><FiUpload style={{ transform: 'rotate(180deg)' }} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Karyawan</label>
                                    <select className="form-select" value={uploadForm.employeeId} onChange={(e) => setUploadForm({ ...uploadForm, employeeId: e.target.value })}>
                                        <option value="">Pilih Karyawan</option>
                                        {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Jenis Dokumen</label>
                                    <select className="form-select" value={uploadForm.type} onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}>
                                        <option value="">Pilih Jenis</option>
                                        {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">File</label>
                                    <input type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFileChange} />
                                    <div
                                        onClick={() => fileRef.current?.click()}
                                        style={{
                                            border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 30,
                                            textAlign: 'center', color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
                                            transition: 'border-color 0.2s', background: uploadForm.file ? '#F0FDF4' : 'transparent',
                                        }}
                                    >
                                        <FiUpload style={{ fontSize: 24, marginBottom: 8 }} />
                                        {uploadForm.file ? (
                                            <div style={{ color: '#16A34A', fontWeight: 600 }}>{uploadForm.file.name}</div>
                                        ) : (
                                            <>
                                                <div>Klik atau drag file ke sini</div>
                                                <div style={{ fontSize: 11, marginTop: 4 }}>PDF, JPG, PNG (maks. 5MB)</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowUpload(false)}>Batal</button>
                            <button className="btn-primary" onClick={handleUpload} disabled={uploading || !uploadForm.file || !uploadForm.employeeId || !uploadForm.type}>
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
