/**
 * dateFormat.js — helper tanggal & mata uang zona-lokal.
 *
 * Masalah yang diperbaiki: `new Date().toISOString().slice(0, 7/10)` memakai UTC,
 * sehingga di WIB 00:xx tanggal 1 awal bulan label mundur sehari (mis. payroll
 * 1 Jan 00:30 WIB → "Desember"). Helper ini memakai komponen lokal.
 */

/** YYYY-MM-DD dari tanggal lokal (bukan UTC). */
export function toLocalDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM untuk MonthPicker default (lokal, bukan UTC). */
export function toLocalMonthKey(d = new Date()) {
  return toLocalDateKey(d).slice(0, 7);
}

/** Format Rupiah aman: terima number/string/null tanpa merusak grouping. */
export function formatIDR(v) {
  const n = typeof v === 'string' ? Number(v.replace(/[^\d-]/g, '')) : Number(v);
  const safe = Number.isFinite(n) ? n : 0;
  return `Rp ${safe.toLocaleString('id-ID')}`;
}
