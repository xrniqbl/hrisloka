import { jsPDF } from 'jspdf';

/**
 * Generate a professional Payslip PDF with elegant layout
 * @param {Object} employee - Employee object
 * @param {Object} payrollData - { month, year, baseSalary, allowance, bpjs, tax, total, overtimePay?, overtimeHours? }
 */
export async function generatePayslipPDF(employee, payrollData) {
 const doc = new jsPDF();
 const W = doc.internal.pageSize.getWidth();
 const marginL = 20;
 const marginR = W - 20;
 const colMid = W / 2;
 let y = 0;

 const fmtCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

 // ─── Header Bar ───
 doc.setFillColor(0, 71, 171); // Primary blue
 doc.rect(0, 0, W, 42, 'F');

 doc.setTextColor(255, 255, 255);
 doc.setFontSize(20);
 doc.setFont('helvetica', 'bold');
 doc.text('HRIS Loka', marginL, 18);

 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.text('PT. Solusi Teknologi Indonesia', marginL, 26);

 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.text('SLIP GAJI KARYAWAN', marginR, 18, { align: 'right' });
 doc.setFont('helvetica', 'normal');
 doc.setFontSize(10);
 doc.text(`Periode: ${payrollData.month} ${payrollData.year}`, marginR, 26, { align: 'right' });

 // Confidential notice
 doc.setFontSize(7);
 doc.text('RAHASIA — Hanya untuk penerima gaji', marginR, 35, { align: 'right' });

 // ─── Employee Info Section ───
 y = 55;
 doc.setTextColor(100, 100, 100);
 doc.setFontSize(8);
 doc.setFont('helvetica', 'bold');
 doc.text('INFORMASI KARYAWAN', marginL, y);
 y += 3;
 doc.setDrawColor(0, 71, 171);
 doc.setLineWidth(0.5);
 doc.line(marginL, y, marginL + 40, y);
 y += 10;

 doc.setTextColor(120, 120, 120);
 doc.setFontSize(9);
 doc.setFont('helvetica', 'normal');

 const infoLabels = ['Nama', 'NIP', 'Divisi', 'Jabatan'];
 const infoValues = [
 employee.name || '-',
 employee.nip || '-',
 employee.division || '-',
 employee.position || '-',
 ];

 infoLabels.forEach((label, i) => {
 const row = Math.floor(i / 2);
 const col = i % 2;
 const xLabel = col === 0 ? marginL : colMid + 10;
 const xValue = col === 0 ? marginL + 28 : colMid + 38;
 const yPos = y + row * 14;

 doc.setTextColor(150, 150, 150);
 doc.text(`${label}:`, xLabel, yPos);
 doc.setTextColor(30, 30, 30);
 doc.setFont('helvetica', 'bold');
 doc.text(infoValues[i], xValue, yPos);
 doc.setFont('helvetica', 'normal');
 });

 y += 30;

 // ─── Divider ───
 doc.setDrawColor(230, 230, 230);
 doc.setLineWidth(0.3);
 doc.line(marginL, y, marginR, y);
 y += 12;

 // ─── Two Column Layout: Income | Deductions ───
 const colWidth = (W - 50) / 2;
 const col1X = marginL;
 const col2X = colMid + 5;

 // Income Column Header
 doc.setFillColor(240, 253, 244); // Success-light green
 doc.roundedRect(col1X, y - 5, colWidth, 16, 3, 3, 'F');
 doc.setTextColor(22, 163, 74);
 doc.setFontSize(10);
 doc.setFont('helvetica', 'bold');
 doc.text('PENDAPATAN', col1X + 6, y + 5);

 // Deduction Column Header
 doc.setFillColor(254, 242, 242); // Danger-light red
 doc.roundedRect(col2X, y - 5, colWidth, 16, 3, 3, 'F');
 doc.setTextColor(220, 38, 38);
 doc.text('POTONGAN', col2X + 6, y + 5);
 y += 20;

 // Income Items
 const incomeItems = [
 ['Gaji Pokok', payrollData.baseSalary || 0],
 ['Tunjangan', payrollData.allowance || 0],
 ];
 if (payrollData.overtimePay) {
 incomeItems.push([`Lembur (${payrollData.overtimeHours || 0} jam)`, payrollData.overtimePay]);
 }

 doc.setFontSize(9);
 incomeItems.forEach(([label, val], i) => {
 const yPos = y + i * 14;
 doc.setTextColor(120, 120, 120);
 doc.setFont('helvetica', 'normal');
 doc.text(label, col1X + 6, yPos);
 doc.setTextColor(30, 30, 30);
 doc.setFont('helvetica', 'bold');
 doc.text(fmtCurrency(val), col1X + colWidth - 6, yPos, { align: 'right' });
 });

 // Deduction Items — use config-aware BPJS values from payrollEngine
 const bpjs = payrollData.bpjs || {};
 const deductionItems = [
 ['BPJS Kesehatan', bpjs.bpjsKesehatan ?? Math.round((payrollData.baseSalary || 0) * 0.01)],
 ['BPJS JHT (2%)', bpjs.bpjsJHT ?? Math.round((payrollData.baseSalary || 0) * 0.02)],
 ['BPJS JP (1%)', bpjs.bpjsJP ?? Math.round((payrollData.baseSalary || 0) * 0.01)],
 ['PPh 21', payrollData.pph21 || payrollData.tax || 0],
 ];

 deductionItems.forEach(([label, val], i) => {
 const yPos = y + i * 14;
 doc.setTextColor(120, 120, 120);
 doc.setFont('helvetica', 'normal');
 doc.text(label, col2X + 6, yPos);
 doc.setTextColor(220, 38, 38);
 doc.setFont('helvetica', 'bold');
 doc.text(`- ${fmtCurrency(val)}`, col2X + colWidth - 6, yPos, { align: 'right' });
 });

 const maxRows = Math.max(incomeItems.length, deductionItems.length);
 y += maxRows * 14 + 5;

 // Subtotal Lines
 doc.setDrawColor(200, 200, 200);
 doc.setLineWidth(0.2);
 doc.line(col1X + 4, y, col1X + colWidth - 4, y);
 doc.line(col2X + 4, y, col2X + colWidth - 4, y);
 y += 10;

 const grossIncome = payrollData.grossIncome || ((payrollData.baseSalary || 0) + (payrollData.allowance || 0) + (payrollData.overtimePay || 0));
 const totalBPJS = bpjs.total ?? Math.round((payrollData.baseSalary || 0) * 0.04);
 const totalDeductions = payrollData.totalDeductions || (totalBPJS + (payrollData.pph21 || payrollData.tax || 0));

 doc.setFontSize(10);
 doc.setTextColor(30, 30, 30);
 doc.setFont('helvetica', 'bold');
 doc.text('Total Pendapatan', col1X + 6, y);
 doc.text(fmtCurrency(grossIncome), col1X + colWidth - 6, y, { align: 'right' });

 doc.setTextColor(220, 38, 38);
 doc.text('Total Potongan', col2X + 6, y);
 doc.text(`- ${fmtCurrency(totalDeductions)}`, col2X + colWidth - 6, y, { align: 'right' });
 y += 18;

 // ─── Take Home Pay — Highlighted Box ───
 doc.setFillColor(0, 71, 171);
 doc.roundedRect(marginL, y, W - 40, 28, 4, 4, 'F');

 doc.setTextColor(200, 220, 255);
 doc.setFontSize(10);
 doc.setFont('helvetica', 'normal');
 doc.text('TAKE HOME PAY', marginL + 10, y + 12);

 doc.setTextColor(255, 255, 255);
 doc.setFontSize(16);
 doc.setFont('helvetica', 'bold');
 doc.text(fmtCurrency(payrollData.total || 0), marginR - 10, y + 18, { align: 'right' });
 y += 40;

 // ─── Bank Info ───
 if (employee.bank_account || employee.bankAccount) {
 const bank = employee.bank_account || employee.bankAccount;
 doc.setTextColor(150, 150, 150);
 doc.setFontSize(8);
 doc.setFont('helvetica', 'normal');
 doc.text(
 `Transfer ke: ${bank.bank || '-'} — ${bank.number || '-'} (a.n. ${bank.holder || employee.name})`,
 W / 2, y, { align: 'center' }
 );
 y += 12;
 }

 // ─── Footer ───
 doc.setDrawColor(230, 230, 230);
 doc.setLineWidth(0.2);
 doc.line(marginL, y, marginR, y);
 y += 8;

 doc.setTextColor(170, 170, 170);
 doc.setFontSize(7);
 doc.text('Dokumen ini dibuat secara otomatis oleh sistem HRIS Loka dan tidak memerlukan tanda tangan.', W / 2, y, { align: 'center' });
 doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, W / 2, y + 8, { align: 'center' });

 const fileName = `Payslip_${employee.name}_${payrollData.month}_${payrollData.year}.pdf`;
 doc.save(fileName);
}
