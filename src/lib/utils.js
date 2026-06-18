/**
 * HRIS Loka Utility Functions
 * Extracted from mockData to eliminate the dependency
 */

/**
 * Format number as Indonesian Rupiah
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
 return `Rp ${(value || 0).toLocaleString('id-ID')}`;
}

/**
 * Calculate days remaining until contract end
 * @param {string} contractEnd - ISO date string
 * @returns {number|null}
 */
export function getContractDaysRemaining(contractEnd) {
 if (!contractEnd) return null;
 const end = new Date(contractEnd);
 const now = new Date();
 return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

/**
 * Extract unique divisions from employee array
 * @param {Array} employees
 * @returns {string[]}
 */
export function getDivisions(employees = []) {
 return [...new Set(employees.map(e => e.division).filter(Boolean))].sort();
}
