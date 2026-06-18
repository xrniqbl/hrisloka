/**
 * HRIS Loka — Payroll Configuration
 * Centralized deduction settings, stored in localStorage.
 * Managed by HR Admin / Super Admin via Settings > Payroll.
 *
 * Regulasi yang digunakan:
 * - PP No. 64 Tahun 2020 (BPJS Kesehatan)
 * - PP No. 36 Tahun 1995 jo PP No. 46 Tahun 2015 (BPJS Ketenagakerjaan)
 * - Peraturan Menteri Ketenagakerjaan No. 1 Tahun 2024 (update batas JP)
 * - UU HPP No. 7 Tahun 2021 (PPh 21 berlaku Jan 2022)
 */

const STORAGE_KEY = 'hrisync_payroll_config';

/** PTKP (Penghasilan Tidak Kena Pajak) 2024 — PMK 101/PMK.010/2016 */
export const PTKP_VALUES = {
  'TK/0': 54_000_000,  // Tidak kawin, 0 tanggungan
  'TK/1': 58_500_000,  // Tidak kawin, 1 tanggungan
  'TK/2': 63_000_000,  // Tidak kawin, 2 tanggungan
  'TK/3': 67_500_000,  // Tidak kawin, 3 tanggungan
  'K/0':  58_500_000,  // Kawin, 0 tanggungan
  'K/1':  63_000_000,  // Kawin, 1 tanggungan
  'K/2':  67_500_000,  // Kawin, 2 tanggungan
  'K/3':  72_000_000,  // Kawin, 3 tanggungan
};

/** Default config — semua potongan wajib aktif */
export const DEFAULT_PAYROLL_CONFIG = {
  // PTKP default seluruh perusahaan jika tidak diset per karyawan
  defaultPTKP: 'TK/0',

  deductions: {
    bpjsKesehatan: {
      key: 'bpjsKesehatan',
      enabled: true,
      label: 'BPJS Kesehatan',
      description: 'Iuran BPJS Kesehatan karyawan (PP 64/2020). 1% dari gaji, maks Rp 480.000/bln.',
      rate: 0.01,
      cap: 480_000, // maks iuran dari upah max 12x UMK Kab. Bogor
      isRegulatory: true,
      category: 'bpjs',
    },
    bpjsJHT: {
      key: 'bpjsJHT',
      enabled: true,
      label: 'BPJS JHT (Jaminan Hari Tua)',
      description: 'Iuran JHT karyawan (PP 46/2015). 2% dari gaji pokok.',
      rate: 0.02,
      cap: null,
      isRegulatory: true,
      category: 'bpjs',
    },
    bpjsJP: {
      key: 'bpjsJP',
      enabled: true,
      label: 'BPJS JP (Jaminan Pensiun)',
      description: 'Iuran JP karyawan (Permenaker 1/2024). 1% dari gaji, maks dari upah batas atas Rp 9.559.600.',
      rate: 0.01,
      cap: null, // cap dihitung dari upah batas, bukan hasil akhir
      wageCapBP: 9_559_600, // batas upah 2024
      isRegulatory: true,
      category: 'bpjs',
    },
    pph21: {
      key: 'pph21',
      enabled: true,
      label: 'PPh 21 (Pajak Penghasilan)',
      description: 'Pajak penghasilan pasal 21 progresif (UU HPP No.7/2021). Dihitung otomatis dari penghasilan kena pajak.',
      isRegulatory: true,
      category: 'tax',
    },
    loan: {
      key: 'loan',
      enabled: false,
      label: 'Cicilan Pinjaman Karyawan',
      description: 'Potongan cicilan pinjaman internal. Jumlah per karyawan dikonfigurasi di data karyawan.',
      isRegulatory: false,
      category: 'custom',
    },
    absenceDeduction: {
      key: 'absenceDeduction',
      enabled: false,
      label: 'Potongan Ketidakhadiran',
      description: 'Potongan gaji untuk hari tidak masuk tanpa keterangan yang sah.',
      isRegulatory: false,
      category: 'custom',
    },
    uniformDeduction: {
      key: 'uniformDeduction',
      enabled: false,
      label: 'Potongan Seragam / Fasilitas',
      description: 'Potongan cicilan seragam, laptop, atau fasilitas perusahaan lainnya.',
      isRegulatory: false,
      category: 'custom',
    },
    coop: {
      key: 'coop',
      enabled: false,
      label: 'Simpanan Koperasi',
      description: 'Iuran simpanan koperasi karyawan (jika ada).',
      isRegulatory: false,
      category: 'custom',
    },
  },
};

/**
 * Load config dari localStorage, merge dengan default
 * (sehingga komponen baru tetap ada meskipun config lama tidak punya key itu)
 */
export function loadPayrollConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PAYROLL_CONFIG;
    const saved = JSON.parse(raw);
    // Deep merge: default keys tetap ada, saved values override
    const merged = {
      defaultPTKP: saved.defaultPTKP || DEFAULT_PAYROLL_CONFIG.defaultPTKP,
      deductions: {},
    };
    for (const [key, def] of Object.entries(DEFAULT_PAYROLL_CONFIG.deductions)) {
      merged.deductions[key] = {
        ...def,
        ...(saved.deductions?.[key] || {}),
        // Always preserve non-user-editable fields from default
        key: def.key,
        label: def.label,
        description: def.description,
        isRegulatory: def.isRegulatory,
        category: def.category,
      };
    }
    return merged;
  } catch {
    return DEFAULT_PAYROLL_CONFIG;
  }
}

/**
 * Save config to localStorage
 */
export function savePayrollConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Calculate BPJS deductions based on config and employee salary
 */
export function calcBPJS(baseSalary, config) {
  const cfg = config?.deductions || DEFAULT_PAYROLL_CONFIG.deductions;

  // BPJS Kesehatan: 1% dari gaji, max Rp 480.000
  const bpjsKesehatan = cfg.bpjsKesehatan?.enabled
    ? Math.min(
        Math.round(baseSalary * (cfg.bpjsKesehatan.rate ?? 0.01)),
        cfg.bpjsKesehatan.cap ?? 480_000
      )
    : 0;

  // BPJS JHT: 2% dari gaji
  const bpjsJHT = cfg.bpjsJHT?.enabled
    ? Math.round(baseSalary * (cfg.bpjsJHT.rate ?? 0.02))
    : 0;

  // BPJS JP: 1% dari min(gaji, batas upah 9.559.600)
  const bpjsJP = cfg.bpjsJP?.enabled
    ? Math.round(Math.min(baseSalary, cfg.bpjsJP.wageCapBP ?? 9_559_600) * (cfg.bpjsJP.rate ?? 0.01))
    : 0;

  const total = bpjsKesehatan + bpjsJHT + bpjsJP;
  return { bpjsKesehatan, bpjsJHT, bpjsJP, total };
}

/**
 * PPh 21 calculation — UU HPP No.7/2021 brackets
 * @param {number} annualTaxableIncome - Penghasilan Kena Pajak tahunan
 * @returns {number} Potongan PPh 21 bulanan
 */
export function calcPPh21(annualTaxableIncome) {
  if (annualTaxableIncome <= 0) return 0;

  // Tarif progresif UU HPP No. 7 Tahun 2021 (berlaku 2022)
  const brackets = [
    { limit:    60_000_000, rate: 0.05 },
    { limit:   250_000_000, rate: 0.15 },
    { limit:   500_000_000, rate: 0.25 },
    { limit: 5_000_000_000, rate: 0.30 },
    { limit: Infinity,      rate: 0.35 },
  ];

  let tax = 0;
  let prevLimit = 0;
  let remaining = annualTaxableIncome;

  for (const bracket of brackets) {
    const taxable = Math.min(remaining, bracket.limit - prevLimit);
    if (taxable <= 0) break;
    tax += taxable * bracket.rate;
    remaining -= taxable;
    prevLimit = bracket.limit;
    if (remaining <= 0) break;
  }

  return Math.round(tax / 12); // konversi ke bulanan
}
