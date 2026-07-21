import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';
import { FiX, FiDownload, FiPrinter, FiSend } from 'react-icons/fi';
import * as employeeService from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { sendPayslipEmail } from '../services/emailService';
import { sendPayslipPush } from '../services/pushService';
import { sendWhatsApp, buildPayslipMessage } from '../services/whatsappService';
import { generatePayslipPDF } from '../lib/pdfGenerator';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import '../styles/shared.css';
import '../styles/admin.css';

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

export default function Payslips() {
  const { t } = useTranslation();
  const { employee } = useAuth();
 const [employees, setEmployees] = useState([]);
 const [sending, setSending] = useState(false);
 const [sendResult, setSendResult] = useState(null);
 const [loading, setLoading] = useState(true);
 const [selected, setSelected] = useState(null);

 const now = new Date();
 const period = `${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}`;

 useEffect(() => {
 async function load() {
 if (!employee?.company_id) { setLoading(false); return; }
 const { data } = await employeeService.getAllEmployees(undefined, employee.company_id);
 setEmployees(data || []);
 setLoading(false);
 }
 load();
 }, [employee?.company_id]);

 // Generate payslip data for each employee
 const payslips = employees.map((emp) => {
 const base = emp.base_salary || emp.baseSalary || 0;
 const allowance = emp.allowance || 0;

 const gross = base + allowance;
 const bpjsKes = Math.round(base * 0.01);
 const bpjsJHT = Math.round(base * 0.02);
 const bpjsJP = Math.round(base * 0.01);
 const bpjsTotal = bpjsKes + bpjsJHT + bpjsJP;

 // Simplified PPh 21
 const annualTaxable = (gross - bpjsTotal) * 12 - 54000000;
 let pph21 = 0;
 if (annualTaxable > 0) {
 const brackets = [
 { limit: 60000000, rate: 0.05 },
 { limit: 250000000, rate: 0.15 },
 { limit: 500000000, rate: 0.25 },
 { limit: Infinity, rate: 0.30 },
 ];
 let remaining = annualTaxable;
 let prevLimit = 0;
 for (const b of brackets) {
 const taxable = Math.min(remaining, b.limit - prevLimit);
 if (taxable <= 0) break;
 pph21 += taxable * b.rate;
 remaining -= taxable;
 prevLimit = b.limit;
 }
 pph21 = Math.round(pph21 / 12);
 }

 const totalDeductions = bpjsTotal + pph21;
 const takeHomePay = gross - totalDeductions;

 return {
 id: emp.id,
 employee: emp,
 period,
 baseSalary: base,
 allowance,
 grossIncome: gross,
 bpjs: { bpjsKesehatan: bpjsKes, bpjsJHT, bpjsJP, total: bpjsTotal },
 pph21,
 totalDeductions,
 takeHomePay,
 };
 });

 const handleDownloadPDF = (slip) => {
 generatePayslipPDF(slip.employee, {
 month: now.toLocaleDateString('id-ID', { month: 'long' }),
 year: now.getFullYear(),
 baseSalary: slip.baseSalary,
 allowance: slip.allowance,
 bpjs: slip.bpjs.total,
 tax: slip.pph21,
 total: slip.takeHomePay,
 });
 };

 const handlePrint = (slip) => {
 // Open a new window with the payslip and trigger browser print dialog
 const printWindow = window.open('', '_blank', 'width=800,height=600');
 if (!printWindow) { handleDownloadPDF(slip); return; }
 const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;
 const emp = slip.employee || slip;
 const companyName = (() => { try { return JSON.parse(localStorage.getItem('hrisync_company_settings'))?.name || 'HRIS Loka'; } catch { return 'HRIS Loka'; } })();
 printWindow.document.write(`<!DOCTYPE html><html><head><title>Payslip - ${emp.name}</title>
 <style>body{font-family:'Inter Tight',system-ui,sans-serif;padding:40px;max-width:700px;margin:0 auto;color:#1e293b}
 h1{font-size:20px;color:#635BFF;margin:0}h2{font-size:14px;color:#64748B;font-weight:500;margin:4px 0 0}
 .header{border-bottom:2px solid #635BFF;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between}
 table{width:100%;border-collapse:collapse;margin:12px 0}td{padding:6px 0;font-size:13px}
 .label{color:#64748B}.value{text-align:right;font-weight:600}.deduction{color:#DC2626}
 .total{background:#635BFF;color:#fff;padding:12px 16px;border-radius:8px;margin-top:16px;display:flex;justify-content:space-between;font-weight:700}
 @media print{body{padding:20px}}</style></head><body>
 <div class="header"><div><h1>${companyName}</h1><h2>Slip Gaji Karyawan</h2></div>
 <div style="text-align:right"><div style="font-weight:700;font-size:14px">Periode: ${slip.period || '-'}</div>
 <div style="font-size:11px;color:#64748B">Dicetak: ${new Date().toLocaleDateString('id-ID')}</div></div></div>
 <table><tr><td class="label">Nama</td><td class="value">${emp.name || '-'}</td></tr>
 <tr><td class="label">NIP</td><td class="value">${emp.nip || '-'}</td></tr>
 <tr><td class="label">Divisi</td><td class="value">${emp.division || '-'}</td></tr>
 <tr><td class="label">Jabatan</td><td class="value">${emp.position || '-'}</td></tr></table>
 <table><tr><td class="label">Gaji Pokok</td><td class="value">${formatCurrency(slip.baseSalary)}</td></tr>
 <tr><td class="label">Tunjangan</td><td class="value">${formatCurrency(slip.allowance)}</td></tr>
 ${slip.overtimePay ? `<tr><td class="label">Lembur (${slip.overtimeHours || 0} jam)</td><td class="value">${formatCurrency(slip.overtimePay)}</td></tr>` : ''}
 <tr><td class="label">BPJS</td><td class="value deduction">- ${formatCurrency(slip.bpjs?.total || 0)}</td></tr>
 <tr><td class="label">PPh 21</td><td class="value deduction">- ${formatCurrency(slip.pph21 || 0)}</td></tr></table>
 <div class="total"><span>Take Home Pay</span><span>${formatCurrency(slip.takeHomePay || slip.total)}</span></div>
 <script>window.onload=function(){window.print();}</script></body></html>`);
 printWindow.document.close();
 };

 const handleSendAllPayslips = async () => {
  setSending(true);
  setSendResult(null);
  let successCount = 0;
  const month = now.toLocaleDateString('id-ID', { month: 'long' });
  const year = now.getFullYear();
  for (const slip of payslips) {
    const emp = slip.employee;
    try {
      // Email
      if (emp.email) {
        (async () => {
          try {
            const { shouldNotifyEmployee } = await import('../services/companySettingsService');
            const allow = await shouldNotifyEmployee(emp.id, 'emailPayroll');
            if (!allow) return;
          } catch { /* send anyway */ }
          return sendPayslipEmail({
            employeeName: emp.name,
            employeeEmail: emp.email,
            month,
            year,
            netSalary: slip.takeHomePay,
          });
        })().catch((e) => console.warn('[Action failed]', e?.message || e));
      }
      // WhatsApp
      if (emp.phone) {
        sendWhatsApp(emp.phone, buildPayslipMessage(emp.name, month, year, slip.takeHomePay)).catch((e) => console.warn('[Action failed]', e?.message || e));
      }
      // Push
      sendPayslipPush(emp.id, month, year).catch((e) => console.warn('[Action failed]', e?.message || e));
      successCount++;
    } catch { /* continue */ }
  }
  setSending(false);
  setSendResult(`Berhasil mengirim notifikasi ke ${successCount} karyawan`);
  setTimeout(() => setSendResult(null), 5000);
 };

 return (
 <div className="animate-in">
 <div className="page-header">
 <h1>{t('payslips.title')}</h1>
 <div className="page-header-actions">
  <span className="period-label">
   Periode: {period}
  </span>
  <button className="btn-primary" onClick={handleSendAllPayslips} disabled={sending || payslips.length === 0}
 aria-label="Kirim semua payslip"><FiSend /> {sending ? 'Mengirim...' : 'Kirim Semua Payslip'}
  </button>
 </div>
 {sendResult && <div className="send-result-notice">{sendResult}</div>}
 </div>

 {loading ? (
 <TableSkeleton rows={5} cols={5} />
 ) : payslips.length === 0 ? (
 <div className="data-table-card">
 <EmptyState
 title="Belum ada data karyawan"
 description="Data payslip muncul setelah karyawan terdaftar. Publikasi payroll dari menu Payroll."
 ctaLabel="Kelola karyawan"
 onCta={() => { window.location.href = '/employees'; }}
 secondaryLabel="Buka payroll"
 onSecondary={() => { window.location.href = '/payroll'; }}
 />
 </div>
 ) : (
 <div className="data-table-card">
 <div className="table-responsive">
 <table className="data-table">
 <thead>
 <tr>
 <th>Karyawan</th>
 <th>Divisi</th>
 <th>Gaji Pokok</th>
 <th>Potongan</th>
 <th>Take Home Pay</th>
 <th>Aksi</th>
 </tr>
 </thead>
 <tbody>
 {payslips.map((slip) => (
 <tr key={slip.id} className="tr-clickable" onClick={() => setSelected(slip)}>
 <td>
 <div className="employee-cell">
 <div className="employee-avatar">
 {slip.employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
 </div>
 <div>
 <div className="employee-name">{slip.employee.name}</div>
 <div className="employee-dept">{slip.employee.position}</div>
 </div>
 </div>
 </td>
 <td className="td-secondary-sm">{slip.employee.division}</td>
 <td className="td-semibold">{formatCurrency(slip.baseSalary)}</td>
 <td className="td-danger-bold">- {formatCurrency(slip.totalDeductions)}</td>
 <td className="td-primary-bold">{formatCurrency(slip.takeHomePay)}</td>
 <td>
 <div className="actions-cell">
 <button className="action-btn" title="Download PDF" onClick={(e) => { e.stopPropagation(); handleDownloadPDF(slip); }} aria-label="Download PDF"><FiDownload />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Professional Payslip Detail Modal */}
 {selected && (
 <div className="modal-overlay" onClick={() => setSelected(null)}>
 <div className="modal-box large" onClick={(e) => e.stopPropagation()}>
 <div className="modal-header">
 <h2>Slip Gaji - {selected.employee.name}</h2>
 <button className="modal-close" onClick={() => setSelected(null)}><FiX /></button>
 </div>
 <div className="modal-body">
 {/* Company Header */}
 <div className="payslip-company-header">
 <div className="payslip-company-name">{(() => { try { return JSON.parse(localStorage.getItem('hrisync_company_settings'))?.name || 'HRIS Loka'; } catch { return 'HRIS Loka'; } })()}</div>
 <div className="payslip-company-sub">PT. Solusi Teknologi Indonesia</div>
 <div className="payslip-period-badge">
 Periode: {selected.period}
 </div>
 </div>

 {/* Employee Info Grid */}
 <div className="payslip-info-grid">
 {[
 ['Nama', selected.employee.name],
 ['NIP', selected.employee.nip || selected.employee.employee_id || '-'],
 ['Divisi', selected.employee.division],
 ['Jabatan', selected.employee.position],
 ].map(([label, val]) => (
 <div key={label} className="payslip-info-row">
 <span className="payslip-info-label">{label}:</span>
 <span className="td-semibold">{val}</span>
 </div>
 ))}
 </div>

 {/* Income & Deductions - Two Column */}
 <div className="payslip-columns">
 {/* Income */}
 <div className="payslip-income-box">
 <div className="payslip-box-title income">
 Pendapatan
 </div>
 {[
 ['Gaji Pokok', selected.baseSalary],
 ['Tunjangan', selected.allowance],
 ].map(([k, v]) => (
 <div key={k} className="payslip-row">
 <span className="payslip-row-label">{k}</span>
 <span className="td-semibold">{formatCurrency(v)}</span>
 </div>
 ))}
 <div className="payslip-subtotal">
 <span>Total</span>
 <span>{formatCurrency(selected.grossIncome)}</span>
 </div>
 </div>

 {/* Deductions */}
 <div className="payslip-deduction-box">
 <div className="payslip-box-title deduction">
 Potongan
 </div>
 {[
 ['BPJS Kesehatan', selected.bpjs.bpjsKesehatan],
 ['BPJS JHT', selected.bpjs.bpjsJHT],
 ['BPJS JP', selected.bpjs.bpjsJP],
 ['PPh 21', selected.pph21],
 ].map(([k, v]) => (
 <div key={k} className="payslip-row">
 <span className="payslip-row-label">{k}</span>
 <span className="payslip-row-value--danger">- {formatCurrency(v)}</span>
 </div>
 ))}
 <div className="payslip-subtotal danger">
 <span>Total</span>
 <span>- {formatCurrency(selected.totalDeductions)}</span>
 </div>
 </div>
 </div>

 {/* Take Home Pay - Highlighted */}
 <div className="payslip-takehome">
 <span className="payslip-takehome-label">Take Home Pay</span>
 <span className="payslip-takehome-value">{formatCurrency(selected.takeHomePay)}</span>
 </div>

 {/* Footer Note */}
 <div className="payslip-footer-note">
 Dokumen ini dibuat secara otomatis oleh sistem HRIS Loka
 </div>
 </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={() => handlePrint(selected)} aria-label="Print"><FiPrinter /> Print
 </button>
 <button className="btn-primary" onClick={() => handleDownloadPDF(selected)} aria-label="Download PDF"><FiDownload /> Download PDF
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}


