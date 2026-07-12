import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../lib/i18n';
import { FiUpload, FiDownload, FiTrash2, FiFile, FiSearch, FiFilter, FiExternalLink, FiX } from 'react-icons/fi';
import * as documentService from '../services/documentService';
import { useAuth } from '../context/AuthContext';
import * as employeeService from '../services/employeeService';

import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import DocLink from '../components/DocLink';

const docTypes = ['KTP', 'Ijazah', 'Kontrak Kerja', 'Sertifikat', 'NPWP', 'Lainnya'];

export default function Documents() {
  const { t } = useTranslation();
  const { employee } = useAuth();
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

 const fetchData = async () => {
 setLoading(true);
 const { data: docData } = await documentService.getAllDocuments(employee?.company_id);
 const { data: empData } = await employeeService.getAllEmployees(undefined, employee?.company_id);
 setDocuments(docData || []);
 setEmployees(empData || []);
 setLoading(false);
 };

 useEffect(() => { if (employee?.company_id) fetchData(); }, [employee?.company_id]);

 // Realtime: auto-refresh
 useRealtimeTable('documents', fetchData, { companyId: currentUser?.company_id });

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
 console.error('[Documents] Upload error:', error.message);
 }
 };

 const handleFileChange = (e) => {
 const file = e.target.files?.[0];
 if (file) setUploadForm({ ...uploadForm, file });
 };

 const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

 const statusColors = { pending: '#F59E0B', approved: '#16A34A', rejected: '#DC2626' };

  if (loading) return <PageSkeleton hasStats={false} tableRows={6} tableCols={4} />;
 return (
 <div className="admin-page">
 <div className="page-header">
 <h1>{t('documents.title')}</h1>
 <Button onClick={() => setShowUpload(true)}><FiUpload /> Upload Dokumen</Button>
 </div>

 <div className="filters-bar">
 <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
 <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
 <Input className="filter-search" style={{ paddingLeft: 38 }} placeholder="Cari dokumen..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
 <div className="filters-bar mb-sm" style={{ flexWrap: 'wrap' }}>
 <button
 onClick={() => setTypeFilter('')}
 className={!typeFilter ? 'btn-primary' : 'btn-secondary'}
 >Semua</button>
 {docTypes.map(t => (
 <button
 key={t}
 onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
 className={typeFilter === t ? 'btn-primary' : 'btn-secondary'}
 >{t}</button>
 ))}
 </div>

 <div className="data-table-card">
 <div className="table-responsive">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Dokumen</TableHead>
 <TableHead>Jenis</TableHead>
 <TableHead>Karyawan</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Tanggal Upload</TableHead>
 <TableHead>Aksi</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {loading ? (
 <TableRow><TableCell colSpan="6" className="empty-state">Memuat data...</TableCell></TableRow>
 ) : filtered.length === 0 ? (
 <TableRow><TableCell colSpan="6" className="empty-state">Tidak ada dokumen ditemukan.</TableCell></TableRow>
 ) : filtered.map((doc) => (
 <tr key={doc.id}>
 <TableCell>
 <div className="employee-cell">
 <FiFile className="td-primary-bold" />
 <span className="td-semibold">{doc.name}</span>
 </div>
 </TableCell>
 <TableCell>
 <span className="status-badge info">{doc.type}</span>
 </TableCell>
 <TableCell>{doc.employees?.name || '-'}</TableCell>
 <TableCell>
 <span className="status-badge" style={{ background: statusColors[doc.status] || '#999', color: '#fff' }}>{doc.status}</span>
 </TableCell>
 <TableCell>{formatDate(doc.created_at)}</TableCell>
 <TableCell>
 <div className="actions-cell">
 {doc.url && <DocLink docRef={doc.url} title="Lihat"><FiExternalLink /></DocLink>}
 {doc.url && <DocLink docRef={doc.url} title="Download" download><FiDownload /></DocLink>}
 </div>
 </TableCell>
 </tr>
 ))}
 </TableBody>
 </Table>
 </div>
 </div>

 {/* Upload Modal */}
 {showUpload && (
 <div className="modal-overlay" onClick={() => setShowUpload(false)}>
 <div className="modal-box" onClick={(e) => e.stopPropagation()}>
 <div className="modal-header">
 <h2>Upload Dokumen</h2>
 <button className="modal-close" onClick={() => setShowUpload(false)} aria-label="Tutup upload"><FiX /></button>
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
 className="upload-drop-zone"
 style={{ background: uploadForm.file ? '#F0FDF4' : 'transparent' }}
 >
 <FiUpload className="upload-drop-icon" />
 {uploadForm.file ? (
 <div className="td-primary-bold" style={{ color: '#16A34A' }}>{uploadForm.file.name}</div>
 ) : (
 <>
 <div>Klik atau drag file ke sini</div>
 <div className="td-muted-sm" style={{ marginTop: 4 }}>PDF, JPG, PNG (maks. 5MB)</div>
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



