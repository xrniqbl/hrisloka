import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - Name of the output file
 * @param {string} sheetName - Name of the worksheet
 */
export function exportToExcel(data, fileName = 'Report.xlsx', sheetName = 'Data') {
 const worksheet = XLSX.utils.json_to_sheet(data);
 const workbook = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
 XLSX.writeFile(workbook, fileName);
}

/**
 * Format data for Attendance Export
 */
export function formatAttendanceForExport(attendanceLogs) {
 return attendanceLogs.map(log => ({
 'Tanggal': log.date,
 'NIP': log.employees?.nip,
 'Nama': log.employees?.name,
 'Clock In': log.clock_in,
 'Clock Out': log.clock_out,
 'Status': log.status,
 'Lokasi': log.location
 }));
}
