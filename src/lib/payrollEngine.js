/**
 * HRISync Payroll Calculation Engine
 * All amounts in IDR
 */

/**
 * Calculate overtime pay
 * @param {number} baseSalary - Monthly base salary
 * @param {number} hours - Overtime hours
 * @param {number} rateMultiplier - 1.5x for weekdays, 2.0x for weekends/holidays
 * @returns {number} Overtime pay amount
 */
export function calculateOvertimePay(baseSalary, hours, rateMultiplier = 1.5) {
    // Hourly rate = base salary / 173 (standard monthly working hours in Indonesia)
    const hourlyRate = baseSalary / 173;
    return Math.round(hourlyRate * hours * rateMultiplier);
}

/**
 * Calculate total overtime pay for an employee from their records
 * @param {number} baseSalary
 * @param {Array} overtimeRecords - Array of { hours, rate, status }
 * @returns {number}
 */
export function calculateTotalOvertimePay(baseSalary, overtimeRecords = []) {
    return overtimeRecords
        .filter((r) => r.status === 'approved')
        .reduce((sum, record) => sum + calculateOvertimePay(baseSalary, record.hours, record.rate), 0);
}

/**
 * Calculate BPJS contributions
 * @param {number} baseSalary
 * @param {number} rate - BPJS rate (default 4%)
 * @returns {object} { employeeShare, employerShare, total }
 */
export function calculateBPJS(baseSalary, rate = 0.04) {
    // BPJS Kesehatan: 5% total (4% employer, 1% employee)
    // BPJS Ketenagakerjaan JHT: 5.7% (3.7% employer, 2% employee)
    const bpjsKesehatan = Math.round(baseSalary * 0.01); // employee share 1%
    const bpjsJHT = Math.round(baseSalary * 0.02); // employee share 2%
    const bpjsJP = Math.round(baseSalary * 0.01); // employee share 1%
    const total = bpjsKesehatan + bpjsJHT + bpjsJP;
    return { bpjsKesehatan, bpjsJHT, bpjsJP, total };
}

/**
 * Calculate PPh 21 (Indonesian income tax) — simplified progressive rates
 * @param {number} annualTaxableIncome
 * @returns {number} Monthly tax amount
 */
export function calculatePPh21(annualTaxableIncome) {
    let tax = 0;
    const brackets = [
        { limit: 60000000, rate: 0.05 },
        { limit: 250000000, rate: 0.15 },
        { limit: 500000000, rate: 0.25 },
        { limit: Infinity, rate: 0.30 },
    ];

    let remaining = annualTaxableIncome;
    let prevLimit = 0;

    for (const bracket of brackets) {
        const taxable = Math.min(remaining, bracket.limit - prevLimit);
        if (taxable <= 0) break;
        tax += taxable * bracket.rate;
        remaining -= taxable;
        prevLimit = bracket.limit;
    }

    // Return monthly amount
    return Math.round(tax / 12);
}

/**
 * Calculate full salary breakdown for one employee
 * @param {object} employee - Employee record
 * @param {Array} overtimeRecords - Overtime records for the month
 * @returns {object} Full salary breakdown
 */
export function calculateSalary(employee, overtimeRecords = []) {
    const { baseSalary, allowance } = employee;

    // Overtime
    const overtimePay = calculateTotalOvertimePay(baseSalary, overtimeRecords);

    // Gross income
    const grossIncome = baseSalary + allowance + overtimePay;

    // BPJS deductions
    const bpjs = calculateBPJS(baseSalary);

    // PPh 21 — taxable income = gross - BPJS (annualized for bracket calc)
    const annualTaxable = (grossIncome - bpjs.total) * 12 - 54000000; // PTKP TK/0
    const pph21 = annualTaxable > 0 ? calculatePPh21(annualTaxable) : 0;

    // Total deductions
    const totalDeductions = bpjs.total + pph21;

    // Take Home Pay
    const takeHomePay = grossIncome - totalDeductions;

    return {
        baseSalary,
        allowance,
        overtimePay,
        overtimeHours: overtimeRecords.filter(r => r.status === 'approved').reduce((s, r) => s + r.hours, 0),
        grossIncome,
        bpjs,
        pph21,
        totalDeductions,
        takeHomePay,
    };
}

/**
 * Generate a payslip object for an employee
 */
export function generatePayslip(employee, overtimeRecords = [], period = null) {
    const salary = calculateSalary(employee, overtimeRecords);
    const now = new Date();
    const payPeriod = period || `${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}`;

    return {
        id: `SLIP-${employee.nip}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`,
        employee: {
            id: employee.id,
            nip: employee.nip,
            name: employee.name,
            division: employee.division,
            position: employee.position,
            bankAccount: employee.bankAccount,
        },
        period: payPeriod,
        generatedDate: now.toISOString().split('T')[0],
        ...salary,
    };
}
