import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate days remaining until contract end date.
 * Returns null if no contractEnd is provided.
 * Returns negative number if contract has already expired.
 */
export function getContractDaysRemaining(contractEnd) {
  if (!contractEnd) return null;
  const end = new Date(contractEnd);
  if (isNaN(end.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

/**
 * Format a number as Indonesian Rupiah currency string.
 * @param {number} amount
 * @returns {string} e.g. "Rp 1.500.000"
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return 'Rp 0';
  return `Rp ${Number(amount).toLocaleString('id-ID')}`;
}

/**
 * Get distinct division names from an employees list.
 * @param {Array} employees - Array of employee objects with `division` field
 * @returns {string[]} Sorted unique division names
 */
export function getDivisions(employees) {
  if (!Array.isArray(employees)) return [];
  return [...new Set(employees.map(e => e.division).filter(Boolean))].sort();
}
