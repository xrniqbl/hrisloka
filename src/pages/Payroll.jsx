import { useState, useEffect, useMemo } from 'react';
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

import { calculateSalary } from '../lib/payrollEngine';
import { exportToExcel } from '../lib/excelExport';
import { generatePayslipPDF } from '../lib/pdfGenerator';
import { useRealtimeTable } from '../hooks/useRealtime';
import '../styles/shared.css';
import '../styles/admin.css';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import { PageSkeleton } from '../components/SkeletonLoader';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;
const chartFont = { family: 'Plus Jakarta Sans', weight: '500' };

export default function Payroll() {
  const { t } = useTranslation();
  const { employee } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
 const [employees, setEmployees] = useState([]);
 const [overtimeRecords, setOvertimeRecords] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: empData } = await employeeService.getAllEmployees(undefined, employee?.company_id);
    const { data: otData } = await overtimeService.getAllOvertime(undefined, employee?.company_id);
    setEmployees(empData || []);
    setOvertimeRecords(otData || []);
    setLoading(false);
  };

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
 backgroundColor: '#0047AB',
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

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={6} />;
 return (
 <div>
 <div className="page-header">
 <h1>{t('payroll.title')}</h1>
 <div className="page-header-actions">
 <input
 type="month"
 className="form-input"
 value={selectedMonth}
 onChange={(e) => setSelectedMonth(e.target.value)}
 style={{ width: 180 }}
 />
 <button className="btn-primary" onClick={handleExportExcel}><FiDownload /> Export Payroll</button>
 </div>
 </div>

 {/* Summary Cards */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
 <div className="info-card">
 <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Total Penghasilan Kotor</div>
 <div style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrency(totals.gross)}</div>
 </div>
 <div className="info-card">
 <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Total Potongan</div>
 <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)' }}>- {formatCurrency(totals.deductions)}</div>
 </div>
 <div className="info-card">
 <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Biaya Lembur</div>
 <div style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B' }}>{formatCurrency(totals.overtime)}</div>
 <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
 {totals.baseSalary > 0 ? `${((totals.overtime / totals.baseSalary) * 100).toFixed(1)}% dari gaji pokok` : '-'}
 </div>
 </div>
 <div className="info-card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', border: 'none' }}>
 <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Total Take Home Pay</div>
 <div style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrency(totals.net)}</div>
 </div>
 </div>

 {/* Overtime Cost by Division Chart */}
 {divisionCostData.labels.length > 0 && (
 <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow-card)', marginBottom: 28 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
 <div>
 <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Biaya Gaji & Lembur per Divisi</div>
 <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Perbandingan biaya per departemen</div>
 </div>
 <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 999, background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
 {selectedMonth}
 </span>
 </div>
 <div style={{ height: 280 }}>
 <Bar data={stackedBarData} options={stackedBarOptions} />
 </div>
 </div>
 )}

 {/* Payroll Table */}
 <div className="data-table-card">
 <div className="table-responsive">
 <table className="data-table">
 <thead>
 <tr>
 <th>Karyawan</th>
 <th style={{ textAlign: 'right' }}>Gaji Pokok</th>
 <th style={{ textAlign: 'right' }}>Tunjangan</th>
 <th style={{ textAlign: 'right' }}>Lembur</th>
 <th style={{ textAlign: 'right' }}>BPJS</th>
 <th style={{ textAlign: 'right' }}>PPh 21</th>
 <th style={{ textAlign: 'right' }}>Take Home Pay</th>
 <th>Aksi</th>
 </tr>
 </thead>
 <tbody>
 {payrollData.map((emp) => (
 <tr key={emp.id}>
 <td>
 <div className="employee-cell">
 <div className="employee-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
 {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
 </div>
 <div>
 <div className="employee-name">{emp.name}</div>
 <div className="employee-dept">{emp.division}</div>
 </div>
 </div>
 </td>
 <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(emp.salary.baseSalary)}</td>
 <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(emp.salary.allowance)}</td>
 <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: emp.salary.overtimePay > 0 ? 'var(--primary)' : 'var(--muted)' }}>
 {formatCurrency(emp.salary.overtimePay)}
 </td>
 <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--danger)' }}>-{formatCurrency(emp.salary.bpjs.total)}</td>
 <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--danger)' }}>-{formatCurrency(emp.salary.pph21)}</td>
 <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{formatCurrency(emp.salary.takeHomePay)}</td>
 <td>
 <button className="action-btn" title="Download PDF" onClick={() => handleDownloadIndividual(emp)}><FiDownload /></button>
 </td>
 </tr>
 ))}
 {payrollData.length === 0 && (
 <tr><td colSpan={8} className="empty-state">Belum ada data karyawan.</td></tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
