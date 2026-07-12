import { useState, useEffect, useMemo } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '../lib/i18n';
import { FiDollarSign, FiDownload } from 'react-icons/fi';
import {
 Chart as ChartJS,
 CategoryScale,
 LinearScale,
 BarElement,
 Tooltip,
 Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import * as employeeService from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import * as overtimeService from '../services/overtimeService';
import * as payrollService from '../services/payrollService';
import { sendPayslipPush } from '../services/pushService';
import { createNotification } from '../services/notificationService';

import { calculateSalary } from '../lib/payrollEngine';
import { exportToExcel } from '../lib/excelExport';
import { generatePayslipPDF } from '../lib/pdfGenerator';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;
const chartFont = { family: 'Inter Tight', weight: '500' };

export default function Payroll() {
  const { t } = useTranslation();
  const { employee } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
 const [employees, setEmployees] = useState([]);
 const [overtimeRecords, setOvertimeRecords] = useState([]);
 const [loading, setLoading] = useState(true);

 const [publishing, setPublishing] = useState(false);
 const [publishMsg, setPublishMsg] = useState('');

 const fetchData = async () => {
    setLoading(true);
    if (!employee?.company_id) {
      setEmployees([]);
      setOvertimeRecords([]);
      setLoading(false);
      return;
    }
    const { data: empData } = await employeeService.getAllEmployees(undefined, employee.company_id);
    const { data: otData } = await overtimeService.getAllOvertime(undefined, employee.company_id);
    setEmployees(empData || []);
    setOvertimeRecords(otData || []);
    setLoading(false);
  };

 useEffect(() => {
  if (!employee?.company_id) {
   setLoading(false);
   return;
  }
  fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [employee?.company_id]);

 // Compute payroll data from employees + overtime
 const payrollData = useMemo(() => {
 return employees.map((emp) => {
 const empOT = overtimeRecords.filter((o) =>
 o.employee_id === emp.id &&
 o.status === 'approved' &&
 o.date?.startsWith(selectedMonth)
 );
 const salary = calculateSalary(emp, empOT);
 return { ...emp, salary };
 });
 }, [employees, overtimeRecords, selectedMonth]);

 const totals = useMemo(() => {
 return payrollData.reduce(
 (acc, emp) => ({
 gross: acc.gross + emp.salary.grossIncome,
 deductions: acc.deductions + emp.salary.totalDeductions,
 net: acc.net + emp.salary.takeHomePay,
 overtime: acc.overtime + emp.salary.overtimePay,
 baseSalary: acc.baseSalary + emp.salary.baseSalary,
 }),
 { gross: 0, deductions: 0, net: 0, overtime: 0, baseSalary: 0 }
 );
 }, [payrollData]);

 // ---------------------------------------
 // CHART: Overtime Cost by Division (Stacked Bar)
 // ---------------------------------------
 const divisionCostData = useMemo(() => {
 const divMap = {};
 payrollData.forEach(emp => {
 const div = emp.division || 'Lainnya';
 if (!divMap[div]) divMap[div] = { base: 0, overtime: 0 };
 divMap[div].base += emp.salary.baseSalary + emp.salary.allowance;
 divMap[div].overtime += emp.salary.overtimePay;
 });
 const sorted = Object.entries(divMap).sort((a, b) => (b[1].base + b[1].overtime) - (a[1].base + a[1].overtime));
 return {
 labels: sorted.map(s => s[0]),
 base: sorted.map(s => s[1].base),
 overtime: sorted.map(s => s[1].overtime),
 };
 }, [payrollData]);

 const stackedBarData = {
 labels: divisionCostData.labels,
 datasets: [
 {
 label: 'Gaji + Tunjangan',
 data: divisionCostData.base,
 backgroundColor: '#635BFF',
 borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 },
 barPercentage: 0.5,
 borderSkipped: false,
 },
 {
 label: 'Biaya Lembur',
 data: divisionCostData.overtime,
 backgroundColor: '#F59E0B',
 borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
 barPercentage: 0.5,
 borderSkipped: false,
 },
 ],
 };

 const stackedBarOptions = {
 responsive: true,
 maintainAspectRatio: false,
 plugins: {
 legend: {
 position: 'top', align: 'end',
 labels: { boxWidth: 8, boxHeight: 8, borderRadius: 4, useBorderRadius: true, font: { size: 12, ...chartFont }, color: '#9CA3AF', padding: 20 },
 },
 tooltip: {
 backgroundColor: 'rgba(15, 23, 42, 0.92)',
 titleFont: { ...chartFont, weight: '700', size: 13 },
 bodyFont: { ...chartFont, size: 12 },
 cornerRadius: 10,
 padding: { top: 10, bottom: 10, left: 14, right: 14 },
 callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` },
 },
 },
 scales: {
 y: {
 beginAtZero: true, stacked: true,
 grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false },
 ticks: {
 font: { size: 10, ...chartFont }, color: '#9CA3AF', padding: 8,
 callback: (v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v.toLocaleString('id-ID'),
 },
 border: { display: false },
 },
 x: {
 stacked: true,
 grid: { display: false },
 ticks: { font: { size: 11, ...chartFont }, color: '#9CA3AF', padding: 4 },
 border: { display: false },
 },
 },
 };

 const handleExportExcel = () => {
 const data = payrollData.map(emp => ({
 'Bulan': selectedMonth,
 'NIP': emp.nip,
 'Nama': emp.name,
 'Gaji Pokok': emp.salary.baseSalary,
 'Tunjangan': emp.salary.allowance,
 'Lembur': emp.salary.overtimePay,
 'BPJS': emp.salary.bpjs.total,
 'PPh 21': emp.salary.pph21,
 'Take Home Pay': emp.salary.takeHomePay
 }));
 exportToExcel(data, `Payroll_${selectedMonth}.xlsx`);
 };

 const handleDownloadIndividual = async (emp) => {
 const payrollDataForPDF = {
 month: new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { month: 'long' }),
 year: selectedMonth.split('-')[0],
 baseSalary: emp.salary.baseSalary,
 allowance: emp.salary.allowance,
 bpjs: emp.salary.bpjs.total,
 tax: emp.salary.pph21,
 total: emp.salary.takeHomePay
 };
 await generatePayslipPDF(emp, payrollDataForPDF);
 };

 /** Persist payroll so PWA EmpPayslip can read payroll_records */
 const handlePublishPayroll = async () => {
  if (!employee?.company_id || payrollData.length === 0) return;
  setPublishing(true);
  setPublishMsg('');
  const records = payrollData.map((row) => ({
    employee_id: row.id,
    period: selectedMonth,
    base_salary: row.salary.baseSalary || 0,
    allowance: row.salary.allowance || 0,
    overtime_pay: row.salary.overtimePay || 0,
    overtime_hours: row.salary.overtimeHours || 0,
    gross_income: row.salary.grossIncome || 0,
    bpjs_kesehatan: row.salary.bpjs?.bpjsKesehatan || 0,
    bpjs_jht: row.salary.bpjs?.bpjsJHT || 0,
    bpjs_jp: row.salary.bpjs?.bpjsJP || 0,
    pph21: row.salary.pph21 || 0,
    total_deductions: row.salary.totalDeductions || 0,
    take_home_pay: row.salary.takeHomePay || 0,
    status: 'generated',
  }));
  const { data, error } = await payrollService.batchSavePayroll(records, employee.company_id);
  if (error) {
    setPublishMsg('Gagal menyimpan: ' + (error.message || 'error'));
    setPublishing(false);
    return;
  }
  // Notify each employee (PWA notifikasi + push)
  const monthLabel = new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  for (const row of (data || records)) {
    const empId = row.employee_id;
    createNotification({
      employeeId: empId,
      companyId: employee.company_id,
      type: 'payslip',
      title: 'Slip gaji tersedia',
      body: `Slip gaji ${monthLabel} sudah dapat dilihat di aplikasi.`,
      data: { path: '/app/payslip', period: selectedMonth },
    }).catch(() => {});
    sendPayslipPush(empId, selectedMonth.split('-')[1], selectedMonth.split('-')[0]).catch(() => {});
  }
  setPublishMsg(`Payroll ${selectedMonth} tersimpan (${(data || records).length} karyawan). Karyawan dapat lihat di PWA.`);
  setPublishing(false);
 };

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={6} />;
 return (
 <div>
 <div className="page-header">
 <h1>{t('payroll.title')}</h1>
 <div className="page-header-actions">
 <Input
 type="month"
 className="input-month"
 value={selectedMonth}
 onChange={(e) => setSelectedMonth(e.target.value)}
 />
 <Button onClick={handleExportExcel}><FiDownload /> Export Payroll</Button>
 <Button
  onClick={handlePublishPayroll}
  disabled={publishing || payrollData.length === 0}
  style={{ background: publishing ? 'var(--border)' : 'var(--success)' }}
 >
  {publishing ? 'Menyimpan...' : 'Publikasi ke PWA'}
 </Button>
 </div>
 </div>
 {publishMsg && (
  <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', color: '#15803d', fontSize: 13, fontWeight: 600 }}>
   {publishMsg}
  </div>
 )}

 {/* Summary Cards */}
 <div className="stats-grid">
 <div className="info-card">
 <div className="info-card-label">Total Penghasilan Kotor</div>
 <div className="info-card-value">{formatCurrency(totals.gross)}</div>
 </div>
 <div className="info-card">
 <div className="info-card-label">Total Potongan</div>
 <div className="info-card-value danger">- {formatCurrency(totals.deductions)}</div>
 </div>
 <div className="info-card">
 <div className="info-card-label">Biaya Lembur</div>
 <div className="info-card-value warning">{formatCurrency(totals.overtime)}</div>
 <div className="info-card-subtext">
 {totals.baseSalary > 0 ? `${((totals.overtime / totals.baseSalary) * 100).toFixed(1)}% dari gaji pokok` : '-'}
 </div>
 </div>
 <div className="info-card highlight">
 <div className="info-card-label light">Total Take Home Pay</div>
 <div className="info-card-value">{formatCurrency(totals.net)}</div>
 </div>
 </div>

 {/* Overtime Cost by Division Chart */}
 {divisionCostData.labels.length > 0 && (
 <div className="chart-card">
 <div className="chart-card-header">
 <div>
 <div className="chart-card-title">Biaya Gaji & Lembur per Divisi</div>
 <div className="chart-card-subtitle">Perbandingan biaya per departemen</div>
 </div>
 <span className="chart-card-badge warning">
 {selectedMonth}
 </span>
 </div>
 <div className="chart-container">
 <Bar data={stackedBarData} options={stackedBarOptions} />
 </div>
 </div>
 )}

 {/* Payroll Table */}
 <div className="data-table-card">
 <div className="table-responsive">
 <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Karyawan</TableHead>
            <TableHead className="th-right">Gaji Pokok</TableHead>
            <TableHead className="th-right">Tunjangan</TableHead>
            <TableHead className="th-right">Lembur</TableHead>
            <TableHead className="th-right">BPJS</TableHead>
            <TableHead className="th-right">PPh 21</TableHead>
            <TableHead className="th-right">Take Home Pay</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
 {payrollData.map((emp) => (
          <TableRow key={emp.id}>
            <TableCell>
              <div className="employee-cell">
                <div className="employee-avatar sm">
                  {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="employee-name">{emp.name}</div>
                  <div className="employee-dept">{emp.division}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="td-numeric">{formatCurrency(emp.salary.baseSalary)}</TableCell>
            <TableCell className="td-numeric">{formatCurrency(emp.salary.allowance)}</TableCell>
            <TableCell className={emp.salary.overtimePay > 0 ? 'td-numeric primary' : 'td-numeric'}>
              {formatCurrency(emp.salary.overtimePay)}
            </TableCell>
            <TableCell className="td-numeric danger">-{formatCurrency(emp.salary.bpjs.total)}</TableCell>
            <TableCell className="td-numeric danger">-{formatCurrency(emp.salary.pph21)}</TableCell>
            <TableCell className="td-numeric total">{formatCurrency(emp.salary.takeHomePay)}</TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" onClick={() => handleDownloadIndividual(emp)}><FiDownload /></Button>
            </TableCell>
          </TableRow>
 ))}
 {payrollData.length === 0 && (
 <TableRow><TableCell colSpan={8} className="empty-state">Belum ada data karyawan.</TableCell></TableRow>
 )}
        </TableBody>
      </Table>
 </div>
 </div>
 </div>
 );
}

