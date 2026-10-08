import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSearch, FiEye, FiEdit2, FiTrash2, FiDownload, FiUserCheck } from 'react-icons/fi';
import * as employeeService from '../services/employeeService';
import { formatCurrency, getDivisions } from '../lib/utils';
import ContractBadge from '../components/ContractBadge';
import EmployeeModal from '../components/EmployeeModal';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import * as XLSX from 'xlsx';
import { toLocalDateKey } from '../lib/dateFormat';
import BranchFilter from '../components/BranchFilter';
import { useBranch } from '../context/BranchContext';
import { useRealtimeTable } from '../hooks/useRealtime';
import PendingApprovalsPanel from '../components/PendingApprovalsPanel';
import { getPendingRegistrations } from '../services/companyService';
import { ROLE_LABELS, ROLE_COLORS } from '../lib/rbac';
import { useAuth } from '../context/AuthContext';
import { getRole } from '../lib/rbac';
import { useToast } from '../components/Toast';
import '../styles/shared.css';
import '../styles/admin.css';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

export default function Employees() {
  const [search, setSearch] = useState('');
  const [divFilter, setDivFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [employeeList, setEmployeeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [activeView, setActiveView] = useState('all'); // 'all' | 'pending'
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const { employee: currentUser } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = getRole(currentUser) === 'super_admin';

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const { data, error } = await employeeService.getAllEmployees(selectedBranchId, currentUser?.company_id);
      if (error) throw error;
      setEmployeeList(data || []);
    } catch (err) {
      console.error('[Employees] fetch failed:', err?.message || err);
      setEmployeeList([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, currentUser?.company_id]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Load pending count for badge (must pass company_id — guard blocks otherwise)
  useEffect(() => {
    if (!currentUser?.company_id) {
      setPendingCount(0);
      return;
    }
    getPendingRegistrations(currentUser.company_id).then(({ data }) =>
      setPendingCount((data || []).length),
    );
  }, [currentUser?.company_id]);

  

  // Realtime: auto-refresh when employees table changes
  useRealtimeTable('employees', fetchEmployees, { companyId: currentUser?.company_id });

  const divisions = useMemo(() => getDivisions(employeeList), [employeeList]);

  const filtered = useMemo(() => {
    return employeeList.filter((emp) => {
      const matchSearch = (emp.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (emp.employee_id || emp.nip || '').toLowerCase().includes(search.toLowerCase()) ||
        (emp.position || '').toLowerCase().includes(search.toLowerCase());
      const matchDiv = !divFilter || emp.division === divFilter;
      const matchStatus = !statusFilter || emp.status === statusFilter;
      return matchSearch && matchDiv && matchStatus;
    });
  }, [employeeList, search, divFilter, statusFilter]);

  const handleSave = async (formData) => {
    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      division: formData.division,
      position: formData.position,
      status: formData.status,
      join_date: formData.joinDate || null,
      birth_date: formData.birthDate || null,
      address: formData.address,
      nik: formData.nik,
      contract_start: formData.contractStart || null,
      contract_end: formData.contractEnd || null,
      base_salary: parseFloat(formData.baseSalary) || 0,
      allowance: parseFloat(formData.allowance) || 0,
      emergency_name: formData.emergencyName,
      emergency_relation: formData.emergencyRelation,
      emergency_phone: formData.emergencyPhone,
      bank_name: formData.bankName,
      bank_number: formData.bankNumber,
      bank_holder: formData.bankHolder,
      edu_level: formData.eduLevel,
      edu_major: formData.eduMajor,
      edu_university: formData.eduUniversity,
      edu_year: formData.eduYear ? parseInt(formData.eduYear) : null,
    };

    const companyId = currentUser?.company_id;
    if (!companyId) {
      toast.error('Perusahaan tidak terdeteksi. Login ulang sebagai HR.');
      return;
    }

    const { error } = editEmp
      ? await employeeService.updateEmployee(editEmp.id, payload, companyId)
      : await employeeService.createEmployee({ ...payload, company_id: companyId });
    if (error) {
      console.error('[Employees] save failed:', error);
      toast.error('Gagal menyimpan karyawan: ' + (error.message || 'error'));
      return;
    }
    toast.success(editEmp ? 'Karyawan diperbarui.' : 'Karyawan ditambahkan.');
    setEditEmp(null);
    fetchEmployees();
    // Refresh pending badge after create/update
    getPendingRegistrations(companyId).then(({ data }) => setPendingCount((data || []).length));
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus karyawan ini?')) return;
    const companyId = currentUser?.company_id;
    if (!companyId) {
      toast.error('Perusahaan tidak terdeteksi. Login ulang sebagai HR.');
      return;
    }
    const { error } = await employeeService.deleteEmployee(id, companyId);
    if (error) {
      console.error('[Employees] delete failed:', error);
      toast.error('Gagal menghapus karyawan: ' + (error.message || 'error'));
      return;
    }
    toast.success('Karyawan dihapus.');
    fetchEmployees();
  };

  const handleExportExcel = () => {
    const exportData = filtered.map(emp => ({
      'NIP': emp.employee_id || emp.nip || '-',
      'Nama': emp.name,
      'Email': emp.email,
      'Phone': emp.phone || '-',
      'Divisi': emp.division,
      'Jabatan': emp.position,
      'Status': emp.status === 'permanent' ? 'Tetap' : 'Kontrak',
      'Tanggal Bergabung': emp.join_date || emp.joinDate || '-',
      'Gaji Pokok': emp.base_salary || emp.baseSalary || 0,
      'Tunjangan': emp.allowance || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Karyawan');
    XLSX.writeFile(wb, `Data_Karyawan_${toLocalDateKey()}.xlsx`);
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Data Karyawan</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <BranchFilter />
          {activeView === 'all' && (
            <button className="btn-secondary" onClick={handleExportExcel} disabled={filtered.length === 0} aria-label="Export Excel"><FiDownload /> Export Excel
            </button>
          )}
          <button className="btn-primary" onClick={() => { setEditEmp(null); setModalOpen(true); }} aria-label="Tambah karyawan"><FiPlus /> Tambah Karyawan
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setActiveView('all')}
          style={{
            padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
            background: activeView === 'all' ? 'var(--primary)' : 'var(--surface)',
            color: activeView === 'all' ? '#fff' : 'var(--text)',
            boxShadow: activeView === 'all' ? 'var(--shadow-sm)' : 'none',
            border: activeView === 'all' ? 'none' : '1px solid var(--border)',
            transition: 'all 0.2s',
          }}
        >
          Semua Karyawan ({employeeList.length})
        </button>
        <button
          onClick={() => setActiveView('pending')}
          style={{
            padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
            background: activeView === 'pending' ? '#DC2626' : 'var(--surface)',
            color: activeView === 'pending' ? '#fff' : 'var(--text)',
            boxShadow: activeView === 'pending' ? '0 4px 12px rgba(220,38,38,0.3)' : 'none',
            border: activeView === 'pending' ? 'none' : '1px solid var(--border)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
          }}
        ><FiUserCheck size={14} /> Menunggu Verifikasi
          {pendingCount > 0 && (
            <span style={{
              padding: '1px 7px', borderRadius: 100,
              background: activeView === 'pending' ? 'rgba(255,255,255,0.3)' : '#DC2626',
              color: '#fff', fontSize: 11, fontWeight: 600,
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Pending Verifikasi */}
      {activeView === 'pending' && (
        <div className="data-table-card">
          <PendingApprovalsPanel />
        </div>
      )}

      {/* Semua Karyawan */}
      {activeView === 'all' && (
        <>
          <div className="filters-bar">
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <Input
                className="filter-search"
                style={{ paddingLeft: 38 }}
                placeholder="Cari nama, NIP, atau jabatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <NativeSelect className="filter-select" value={divFilter} onChange={(e) => setDivFilter(e.target.value)}>
              <option value="">Semua Divisi</option>
              {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
            </NativeSelect>
            <NativeSelect className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="permanent">Karyawan Tetap</option>
              <option value="contract">Karyawan Kontrak</option>
            </NativeSelect>
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : fetchError ? (
            <div className="data-table-card">
              <EmptyState
                title="Gagal memuat data karyawan"
                description="Terjadi kesalahan saat mengambil data. Periksa koneksi internet Anda lalu coba lagi."
                ctaLabel="Muat ulang"
                onCta={fetchEmployees}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="data-table-card">
              <EmptyState
                title="Belum ada data karyawan"
                description="Mulai dengan menambahkan karyawan pertama ke dalam sistem."
                action={
                  <Button onClick={() => { setEditEmp(null); setModalOpen(true); }}>
                    <FiPlus /> Tambah Karyawan
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="data-table-card">
              <div className="table-responsive">
                <Table>
                  <TableHeader>
                    <TableRow>
                  
                    <tr>
                                  <TableHead>NIP</TableHead>
                                  <TableHead>Karyawan</TableHead>
                                  <TableHead>Divisi</TableHead>
                                  <TableHead>Jabatan</TableHead>
                                  <TableHead>Cabang</TableHead>
                                  <TableHead>Status</TableHead>
                      {isSuperAdmin && <TableHead>Role</TableHead>}
                                  <TableHead>Gaji Pokok</TableHead>
                                  <TableHead>Aksi</TableHead>
                    </tr>
                  
                                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell><span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted)' }}>{emp.employee_id || emp.nip || '-'}</span></TableCell>
                        <TableCell>
                          <div className="employee-cell">
                            <div className="employee-avatar">{(emp.name || '').split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                            <div>
                              <div className="employee-name">{emp.name}</div>
                              <div className="employee-dept">{emp.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{emp.division}</TableCell>
                        <TableCell>{emp.position}</TableCell>
                        <TableCell className="td-muted-sm">{emp.branches?.name || '-'}</TableCell>
                        <TableCell><ContractBadge status={emp.status} contractEnd={emp.contract_end || emp.contractEnd} /></TableCell>
                        {isSuperAdmin && (
                          <TableCell>
                            {emp.role && emp.role !== 'employee' ? (
                              <span style={{ fontSize: 10, fontWeight: 600, color: ROLE_COLORS[emp.role], background: `${ROLE_COLORS[emp.role]}15`, padding: '2px 8px', borderRadius: 20 }}>
                                {ROLE_LABELS[emp.role]}
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, color: 'var(--muted)' }}>Employee</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="td-semibold">{formatCurrency(emp.base_salary || emp.baseSalary)}</TableCell>
                        <TableCell>
                          <div className="actions-cell">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/employees/${emp.id}`)}><FiEye /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { setEditEmp(emp); setModalOpen(true); }}><FiEdit2 /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)}><FiTrash2 /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                                    </TableBody>
                </Table>
              </div>
            </div>
          )}

          <EmployeeModal
            isOpen={modalOpen}
            onClose={() => { setModalOpen(false); setEditEmp(null); }}
            onSave={handleSave}
            employee={editEmp}
            divisions={divisions}
          />
        </>
      )}
    </div>
  );
}


