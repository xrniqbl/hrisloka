import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Helpers ──────────────────────────────────────────────────────
const fmt = (v) => (v === null || v === undefined || v === '') ? '-' : String(v);
const fmtCurrency = (v) => v ? `Rp ${Number(v).toLocaleString('id-ID')}` : 'Rp 0';
const fmtDate = (d) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return fmt(d); }
};

// ── PDF: Attendance Report ────────────────────────────────────────
export function exportAttendancePDF({ data, employeeName, period, companyName }) {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Laporan Kehadiran Karyawan', 14, 18);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`Perusahaan: ${companyName || 'HRIS Loka'}`, 14, 27);
  doc.text(`Karyawan: ${employeeName || 'Semua'}`, 14, 34);
  doc.text(`Periode: ${period || '-'}`, 14, 41);
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 48);

  // Table
  autoTable(doc, {
    startY: 56,
    head: [['No', 'Nama', 'Tanggal', 'Clock In', 'Clock Out', 'Durasi', 'Lokasi', 'Status']],
    body: data.map((row, i) => [
      i + 1,
      fmt(row.employees?.name || row.employee_name || row.name),
      fmtDate(row.date),
      fmt(row.clock_in ? row.clock_in.slice(0, 5) : '-'),
      fmt(row.clock_out ? row.clock_out.slice(0, 5) : '-'),
      fmt(row.work_duration ? `${row.work_duration} jam` : '-'),
      fmt(row.location_name || row.location || '-'),
      fmt(row.status),
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [0, 71, 171], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    columnStyles: { 0: { halign: 'center', cellWidth: 10 } },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Halaman ${i} dari ${pageCount} — ${companyName || 'HRIS Loka'}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });
  }

  doc.save(`laporan-kehadiran-${period || 'export'}.pdf`);
}

// ── Excel: Attendance Report ──────────────────────────────────────
export function exportAttendanceXLSX({ data, employeeName, period, companyName }) {
  const rows = data.map((row, i) => ({
    'No': i + 1,
    'Nama Karyawan': fmt(row.employees?.name || row.employee_name || row.name),
    'Tanggal': fmtDate(row.date),
    'Clock In': fmt(row.clock_in ? row.clock_in.slice(0, 5) : '-'),
    'Clock Out': fmt(row.clock_out ? row.clock_out.slice(0, 5) : '-'),
    'Durasi Kerja': fmt(row.work_duration ? `${row.work_duration} jam` : '-'),
    'Lokasi': fmt(row.location_name || row.location || '-'),
    'Status': fmt(row.status),
    'NIP': fmt(row.employees?.nip || row.nip || '-'),
    'Divisi': fmt(row.employees?.division || row.division || '-'),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kehadiran');
  XLSX.writeFile(wb, `laporan-kehadiran-${period || 'export'}.xlsx`);
}

// ── PDF: Payroll Report ───────────────────────────────────────────
export function exportPayrollPDF({ data, period, companyName }) {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Laporan Penggajian', 14, 18);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`Perusahaan: ${companyName || 'HRIS Loka'}`, 14, 27);
  doc.text(`Periode: ${period || '-'}`, 14, 34);
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 41);

  const totalGross = data.reduce((s, r) => s + (Number(r.gross_salary) || 0), 0);
  const totalNet = data.reduce((s, r) => s + (Number(r.net_salary) || 0), 0);

  autoTable(doc, {
    startY: 50,
    head: [['No', 'NIP', 'Nama', 'Gaji Pokok', 'Tunjangan', 'Lembur', 'Potongan', 'Bruto', 'Neto', 'Status']],
    body: [
      ...data.map((row, i) => [
        i + 1,
        fmt(row.employees?.nip || row.nip),
        fmt(row.employees?.name || row.name),
        fmtCurrency(row.base_salary),
        fmtCurrency(row.allowances),
        fmtCurrency(row.overtime_pay),
        fmtCurrency(row.deductions),
        fmtCurrency(row.gross_salary),
        fmtCurrency(row.net_salary),
        fmt(row.status),
      ]),
      // Total row
      ['', '', 'TOTAL', '', '', '', '', fmtCurrency(totalGross), fmtCurrency(totalNet), ''],
    ],
    styles: { fontSize: 8.5, cellPadding: 3.5 },
    headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 252, 248] },
    // Style last row (total) differently
    didParseCell: (data) => {
      if (data.row.index === data.table.body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231];
      }
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Halaman ${i} dari ${pageCount} — CONFIDENTIAL — ${companyName || 'HRIS Loka'}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });
  }

  doc.save(`laporan-payroll-${period || 'export'}.pdf`);
}

// ── Excel: Payroll Report ─────────────────────────────────────────
export function exportPayrollXLSX({ data, period, companyName }) {
  const rows = data.map((row, i) => ({
    'No': i + 1,
    'NIP': fmt(row.employees?.nip || row.nip),
    'Nama Karyawan': fmt(row.employees?.name || row.name),
    'Divisi': fmt(row.employees?.division || row.division),
    'Gaji Pokok': Number(row.base_salary) || 0,
    'Tunjangan': Number(row.allowances) || 0,
    'Lembur': Number(row.overtime_pay) || 0,
    'Potongan': Number(row.deductions) || 0,
    'Bruto': Number(row.gross_salary) || 0,
    'Neto': Number(row.net_salary) || 0,
    'Pajak (PPh21)': Number(row.tax_pph21) || 0,
    'BPJS TK': Number(row.bpjs_tk) || 0,
    'Rekening': fmt(row.employees?.bank_account || row.bank_account),
    'Status': fmt(row.status),
    'Periode': fmt(row.period || period),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Penggajian');
  // Summary sheet
  const summary = XLSX.utils.aoa_to_sheet([
    ['RINGKASAN PAYROLL', ''],
    ['Perusahaan', companyName || 'HRIS Loka'],
    ['Periode', period || '-'],
    ['Jumlah Karyawan', rows.length],
    ['Total Bruto', rows.reduce((s, r) => s + r['Bruto'], 0)],
    ['Total Neto', rows.reduce((s, r) => s + r['Neto'], 0)],
    ['Total Potongan', rows.reduce((s, r) => s + r['Potongan'], 0)],
  ]);
  XLSX.utils.book_append_sheet(wb, summary, 'Ringkasan');
  XLSX.writeFile(wb, `laporan-payroll-${period || 'export'}.xlsx`);
}
