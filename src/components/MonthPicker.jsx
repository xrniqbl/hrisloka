/**
 * Lightweight month picker — no native month calendar (heavy / laggy).
 * value / onChange: "YYYY-MM"
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function parse(value) {
  const now = new Date();
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const [y, m] = value.split('-').map(Number);
  return { year: y, month: m };
}

function format(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export default function MonthPicker({
  value,
  onChange,
  className,
  minYear,
  maxYear,
  disabled,
}) {
  const now = new Date();
  const { year, month } = parse(value);
  const yMin = minYear ?? now.getFullYear() - 5;
  const yMax = maxYear ?? now.getFullYear() + 1;

  const years = useMemo(() => {
    const list = [];
    for (let y = yMax; y >= yMin; y--) list.push(y);
    return list;
  }, [yMin, yMax]);

  return (
    <div className={cn('month-picker', className)} role="group" aria-label="Pilih bulan">
      <select
        className="month-picker-select form-select"
        value={month}
        disabled={disabled}
        aria-label="Bulan"
        onChange={(e) => onChange?.(format(year, Number(e.target.value)))}
      >
        {MONTHS_ID.map((label, i) => (
          <option key={label} value={i + 1}>
            {label}
          </option>
        ))}
      </select>
      <select
        className="month-picker-select form-select"
        value={year}
        disabled={disabled}
        aria-label="Tahun"
        onChange={(e) => onChange?.(format(Number(e.target.value), month))}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
