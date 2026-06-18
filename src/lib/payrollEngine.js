/**
 * HRIS Loka Payroll Calculation Engine
 * Regulasi: UU HPP No.7/2021, PP 64/2020, Permenaker 1/2024
 * All amounts in IDR (Rupiah)
 */
import { calcBPJS, calcPPh21, loadPayrollConfig, PTKP_VALUES } from './payrollConfig';

/**
 * Calculate overtime pay per record
 * @param {number} baseSalary - Gaji pokok bulanan
 * @param {number} hours - Jam lembur
 * @param {number} rateMultiplier - 1.5 hari kerja, 2.0 hari libur/nasional
 * @returns {number}
 */
export function calculateOvertimePay(baseSalary, hours, rateMultiplier = 1.5) {
  // Tarif per jam = gaji / 173 (standar jam kerja bulanan Indonesia)
  const hourlyRate = baseSalary / 173;
  return Math.round(hourlyRate * hours * rateMultiplier);
}

/**
 * Total overtime pay dari semua record yang disetujui
 */
export function calculateTotalOvertimePay(baseSalary, overtimeRecords = []) {
  return overtimeRecords
    .filter(r => r.status === 'approved')
    .reduce((sum, record) => sum + calculateOvertimePay(baseSalary, record.hours, record.rate), 0);
}

/**
 * Calculate BPJS (backward compat wrapper)
 * @deprecated Gunakan calcBPJS dari payrollConfig.js untuk config-aware calculation
 */
export function calculateBPJS(baseSalary) {
  return calcBPJS(baseSalary, loadPayrollConfig());
}

/**
 * Calculate PPh 21 (backward compat wrapper)
 * @deprecated Gunakan calcPPh21 dari payrollConfig.js
 */
export function calculatePPh21(annualTaxableIncome) {
  return calcPPh21(annualTaxableIncome);
}

/**
 * Main salary calculation — config-aware
 * @param {object} employee - Data karyawan
 * @param {Array}  overtimeRecords - Record lembur yang disetujui
 * @param {object} [configOverride] - Override config (opsional, default: dari localStorage)
 * @returns {object} Rincian lengkap gaji
 */
export function calculateSalary(employee, overtimeRecords = [], configOverride = null) {
  const config = configOverride || loadPayrollConfig();
  const cfg = config.deductions;

  const baseSalary  = employee.base_salary || employee.baseSalary || 0;
  const allowance   = employee.allowance || 0;

  // Lembur
  const overtimePay = calculateTotalOvertimePay(baseSalary, overtimeRecords);
  const overtimeHours = overtimeRecords
    .filter(r => r.status === 'approved')
    .reduce((s, r) => s + (r.hours || 0), 0);

  // Penghasilan Bruto
  const grossIncome = baseSalary + allowance + overtimePay;

  // BPJS (config-aware)
  const bpjs = calcBPJS(baseSalary, config);

  // PPh 21 — Penghasilan Kena Pajak
  // Status PTKP per karyawan → fallback ke PTKP default perusahaan → fallback ke TK/0
  const ptkpStatus = employee.ptkp_status || employee.ptkpStatus || config.defaultPTKP || 'TK/0';
  const ptkpValue  = PTKP_VALUES[ptkpStatus] ?? PTKP_VALUES['TK/0'];

  // PKP = (bruto - BPJS karyawan) × 12 - PTKP - biaya jabatan (maks 6jt/thn)
  const annualBruto    = grossIncome * 12;
  const annualBPJS     = bpjs.total * 12;
  const biayaJabatan   = Math.min(annualBruto * 0.05, 6_000_000); // maks 6 jt/tahun
  const annualPKP      = Math.max(0, annualBruto - annualBPJS - biayaJabatan - ptkpValue);
  const pph21          = cfg.pph21?.enabled ? calcPPh21(annualPKP) : 0;

  // Potongan tambahan per karyawan
  const loanDeduction     = cfg.loan?.enabled ? (employee.loan_installment || employee.loanInstallment || 0) : 0;
  const absenceDeduction  = cfg.absenceDeduction?.enabled ? (employee.absence_deduction || 0) : 0;
  const uniformDeduction  = cfg.uniformDeduction?.enabled ? (employee.uniform_deduction || 0) : 0;
  const coopDeduction     = cfg.coop?.enabled ? (employee.coop_deduction || 0) : 0;

  const totalDeductions = bpjs.total + pph21 + loanDeduction + absenceDeduction + uniformDeduction + coopDeduction;
  const takeHomePay     = grossIncome - totalDeductions;

  return {
    baseSalary,
    allowance,
    overtimePay,
    overtimeHours,
    grossIncome,
    bpjs,
    pph21,
    loanDeduction,
    absenceDeduction,
    uniformDeduction,
    coopDeduction,
    totalDeductions,
    takeHomePay,
    ptkpStatus,
    // Info biaya jabatan & PKP untuk transparansi
    biayaJabatan,
    annualPKP,
    config, // sertakan config untuk rendering
  };
}

/**
 * Generate payslip object
 */
export function generatePayslip(employee, overtimeRecords = [], period = null, configOverride = null) {
  const salary = calculateSalary(employee, overtimeRecords, configOverride);
  const now = new Date();
  const payPeriod = period || `${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}`;

  return {
    id: `SLIP-${employee.nip || employee.employee_id}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`,
    employee: {
      id: employee.id,
      nip: employee.nip || employee.employee_id,
      name: employee.name,
      division: employee.division,
      position: employee.position,
      bankAccount: employee.bank_account || employee.bankAccount,
    },
    period: payPeriod,
    generatedDate: now.toISOString().split('T')[0],
    ...salary,
  };
}
