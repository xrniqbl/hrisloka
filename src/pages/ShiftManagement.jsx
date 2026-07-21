import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../lib/i18n';
import { FiPlus, FiX, FiTrash2 } from 'react-icons/fi';
import * as shiftService from '../services/shiftService';
import * as employeeService from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import BranchFilter from '../components/BranchFilter';
import { useBranch } from '../context/BranchContext';
import { useRealtimeTable } from '../hooks/useRealtime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPanel, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import '../styles/shared.css';
import '../styles/admin.css';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default function ShiftManagement() {
 const { t } = useTranslation();
 const { employee } = useAuth();
 const [shifts, setShifts] = useState([]);
 const [employees, setEmployees] = useState([]);
 const [assignments, setAssignments] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [form, setForm] = useState({ name: '', startTime: '', endTime: '', color: '#635BFF' });
 const [activeCell, setActiveCell] = useState(null);
 const { selectedBranchId } = useBranch();

 const companyId = employee?.company_id;

 const fetchData = useCallback(async () => {
  if (!companyId) {
   setShifts([]);
   setEmployees([]);
   setAssignments([]);
   setLoading(false);
   return;
  }
  setLoading(true);
  const { data: shiftData } = await shiftService.getAllShifts(selectedBranchId, companyId);
  const { data: empData } = await employeeService.getAllEmployees(selectedBranchId, companyId);
  // Must pass companyId — tenant guard returns [] without it
  const { data: assignData } = await shiftService.getShiftAssignments(companyId);
  setShifts(shiftData || []);
  setEmployees(empData || []);
  setAssignments(assignData || []);
  setLoading(false);
 }, [employee?.company_id, selectedBranchId, companyId]);

 useEffect(() => { fetchData(); }, [fetchData]);
 useRealtimeTable('shifts', fetchData, { companyId, enabled: !!companyId });

 const handleAddShift = async () => {
  if (!form.name || !form.startTime || !form.endTime || !companyId) return;
  await shiftService.createShift({ ...form, companyId });
  setShowForm(false);
  setForm({ name: '', startTime: '', endTime: '', color: '#635BFF' });
  fetchData();
 };

 const handleDeleteShift = async (id) => {
  if (!confirm('Hapus shift ini? Semua assignment terkait juga akan dihapus.')) return;
  if (!companyId) return;
  await shiftService.deleteShift(id, companyId);
  fetchData();
 };

 const handleAssignShift = async (empId, day, shiftId) => {
  // Verify employee belongs to this company (list already company-scoped)
  const target = employees.find((e) => e.id === empId);
  if (!target || (target.company_id && target.company_id !== companyId)) return;
  await shiftService.assignShift(empId, shiftId, day);
  setActiveCell(null);
  fetchData();
 };

 const handleRemoveAssignment = async (empId, day) => {
  const existing = assignments.find(a => a.employee_id === empId && a.day_of_week === day);
  if (existing && companyId) {
   await shiftService.removeShiftAssignment(existing.id, companyId);
   fetchData();
  }
  setActiveCell(null);
 };

 const getAssignment = (empId, day) => assignments.find(a => a.employee_id === empId && a.day_of_week === day);
 const toggleCell = (empId, day) => setActiveCell(activeCell?.empId === empId && activeCell?.day === day ? null : { empId, day });

 if (loading) return <PageSkeleton hasStats={false} tableRows={6} tableCols={5} />;

 return (
  <div className="admin-page">
   <div className="page-header">
    <h1>{t('shifts.title')}</h1>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
     <BranchFilter />
     <button type="button" className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> Tambah Shift</button>
    </div>
   </div>

   <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
    {shifts.map((shift) => (
     <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: 'var(--surface)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <div style={{ width: 12, height: 12, borderRadius: 3, background: shift.color, flexShrink: 0 }} />
      <span style={{ fontWeight: 600 }}>{shift.name}</span>
      <span style={{ color: 'var(--muted)', fontSize: 11 }}>({shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)})</span>
      <Button variant="ghost" size="icon" className="action-btn danger" onClick={() => handleDeleteShift(shift.id)}><FiTrash2 size={13} /></Button>
     </div>
    ))}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 14px' }}>
     <div style={{ width: 12, height: 12, borderRadius: 3, background: '#E5E7EB' }} />
     <span style={{ fontWeight: 600, color: 'var(--muted)' }}>OFF / Belum diatur</span>
    </div>
   </div>

   {shifts.length === 0 && (
    <EmptyState
      title="Belum ada shift"
      description="Buat shift terlebih dahulu sebelum mengatur jadwal karyawan."
      ctaLabel="Buat shift"
      onCta={() => setShowForm(true)}
    />
   )}

   {shifts.length > 0 && (
    <div className="data-table-card">
     <Table>
      <TableHeader>
       <TableRow>
        <TableHead style={{ minWidth: 180 }}>Karyawan</TableHead>
        {dayNames.map((day) => <TableHead key={day} style={{ textAlign: 'center', minWidth: 100 }}>{day}</TableHead>)}
       </TableRow>
      </TableHeader>
      <TableBody>
       {employees.map((emp) => (
        <TableRow key={emp.id}>
         <TableCell>
          <div className="employee-cell">
           <div className="employee-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
            {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
           </div>
           <div>
            <div className="employee-name">{emp.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{emp.division}</div>
           </div>
          </div>
         </TableCell>
         {dayNames.map((_, dayIdx) => {
          const assignment = getAssignment(emp.id, dayIdx);
          const shift = assignment?.shifts;
          const isActive = activeCell?.empId === emp.id && activeCell?.day === dayIdx;

          return (
           <TableCell key={dayIdx} style={{ textAlign: 'center', position: 'relative', padding: 4 }}>
            <div
             onClick={() => toggleCell(emp.id, dayIdx)}
             style={{
              padding: '8px 6px', borderRadius: 6, cursor: 'pointer',
              background: shift ? `${shift.color}18` : '#F3F4F6',
              border: isActive ? '2px solid var(--primary)' : '2px solid transparent',
              color: shift ? shift.color : '#9CA3AF',
              fontSize: 11, fontWeight: 600, transition: 'all 0.15s ease',
              minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
             }}
            >
             {shift ? shift.name : 'OFF'}
            </div>

            {isActive && (
             <div style={{
              position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
              zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
              padding: 6, minWidth: 140, display: 'grid', gap: 4,
             }}>
              {shifts.map((item) => (
               <Button key={item.id} variant="ghost" className="justify-start" onClick={(event) => { event.stopPropagation(); handleAssignShift(emp.id, dayIdx, item.id); }} style={{ color: item.color }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                {item.name}
               </Button>
              ))}
              {shift && (
               <Button variant="ghost" className="justify-start text-red-600" onClick={(event) => { event.stopPropagation(); handleRemoveAssignment(emp.id, dayIdx); }}>
                <FiX size={12} /> Hapus
               </Button>
              )}
             </div>
            )}
           </TableCell>
          );
         })}
        </TableRow>
       ))}
       {employees.length === 0 && (
        <TableRow>
          <TableCell colSpan={8} style={{ padding: 0, border: 'none' }}>
            <EmptyState
              title="Belum ada data karyawan"
              description="Tambah karyawan aktif dulu sebelum mengatur jadwal shift."
              ctaLabel="Kelola karyawan"
              onCta={() => { window.location.href = '/employees'; }}
              size="sm"
            />
          </TableCell>
        </TableRow>
       )}
      </TableBody>
     </Table>
    </div>
   )}

   <Dialog open={showForm} onOpenChange={setShowForm}>
    <DialogContent>
     <DialogHeader>
      <DialogTitle>Tambah Shift Baru</DialogTitle>
     </DialogHeader>
     <DialogPanel>
      <div className="form-grid">
       <div className="form-group">
        <label className="form-label">Nama Shift</label>
        <Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Shift Pagi" />
       </div>
       <div className="form-group">
        <label className="form-label">Warna</label>
        <Input type="color" value={form.color} onChange={event => setForm({ ...form, color: event.target.value })} style={{ height: 40 }} />
       </div>
       <div className="form-group">
        <label className="form-label">Jam Mulai</label>
        <Input type="time" value={form.startTime} onChange={event => setForm({ ...form, startTime: event.target.value })} />
       </div>
       <div className="form-group">
        <label className="form-label">Jam Selesai</label>
        <Input type="time" value={form.endTime} onChange={event => setForm({ ...form, endTime: event.target.value })} />
       </div>
      </div>
     </DialogPanel>
     <DialogFooter>
      <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
      <button type="button" className="btn-primary" onClick={handleAddShift} disabled={!form.name || !form.startTime || !form.endTime}>Simpan</button>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </div>
 );
}
