import { useState, useEffect } from 'react';
import { FiX, FiDownload, FiPrinter, FiLoader } from 'react-icons/fi';
import * as employeeService from '../services/employeeService';
import { generatePayslipPDF } from '../lib/pdfGenerator';
import { calculateSalary } from '../lib/payrollEngine';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import '../styles/shared.css';

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

export default function Payslips() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    const now = new Date();
    const period = `${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}`;

    useEffect(() => {
        async function load() {
            const { data } = await employeeService.getAllEmployees();
            setEmployees(data || []);
            setLoading(false);
        }
        load();
    }, []);

    // Generate payslip data for each employee
    const payslips = employees.map((emp) => {
        const base = emp.base_salary || emp.baseSalary || 0;
        const allowance = emp.allowance || 0;
        const bpjsRate = parseFloat(emp.bpjs_rate || emp.bpjsRate || 0.04);
        const taxRate = parseFloat(emp.tax_rate || emp.taxRate || 0.05);

        const gross = base + allowance;
        const bpjsKes = Math.round(base * 0.01);
        const bpjsJHT = Math.round(base * 0.02);
        const bpjsJP = Math.round(base * 0.01);
        const bpjsTotal = bpjsKes + bpjsJHT + bpjsJP;

        // Simplified PPh 21
        const annualTaxable = (gross - bpjsTotal) * 12 - 54000000;
        let pph21 = 0;
        if (annualTaxable > 0) {
            const brackets = [
                { limit: 60000000, rate: 0.05 },
                { limit: 250000000, rate: 0.15 },
                { limit: 500000000, rate: 0.25 },
                { limit: Infinity, rate: 0.30 },
            ];
            let remaining = annualTaxable;
            let prevLimit = 0;
            for (const b of brackets) {
                const taxable = Math.min(remaining, b.limit - prevLimit);
                if (taxable <= 0) break;
                pph21 += taxable * b.rate;
                remaining -= taxable;
                prevLimit = b.limit;
            }
            pph21 = Math.round(pph21 / 12);
        }

        const totalDeductions = bpjsTotal + pph21;
        const takeHomePay = gross - totalDeductions;

        return {
            id: emp.id,
            employee: emp,
            period,
            baseSalary: base,
            allowance,
            grossIncome: gross,
            bpjs: { bpjsKesehatan: bpjsKes, bpjsJHT, bpjsJP, total: bpjsTotal },
            pph21,
            totalDeductions,
            takeHomePay,
        };
    });

    const handleDownloadPDF = (slip) => {
        generatePayslipPDF(slip.employee, {
            month: now.toLocaleDateString('id-ID', { month: 'long' }),
            year: now.getFullYear(),
            baseSalary: slip.baseSalary,
            allowance: slip.allowance,
            bpjs: slip.bpjs.total,
            tax: slip.pph21,
            total: slip.takeHomePay,
        });
    };

    const handlePrint = (slip) => {
        // Generate and immediately trigger browser print
        handleDownloadPDF(slip);
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>E-Payslip</h1>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Periode: {period}
                </span>
            </div>

            {loading ? (
                <TableSkeleton rows={5} cols={5} />
            ) : payslips.length === 0 ? (
                <div className="data-table-card">
                    <EmptyState
                        icon="payroll"
                        title="Belum ada data karyawan"
                        description="Data payslip akan muncul setelah karyawan terdaftar di sistem."
                    />
                </div>
            ) : (
                <div className="data-table-card">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Karyawan</th>
                                    <th>Divisi</th>
                                    <th>Gaji Pokok</th>
                                    <th>Potongan</th>
                                    <th>Take Home Pay</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payslips.map((slip) => (
                                    <tr key={slip.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(slip)}>
                                        <td>
                                            <div className="employee-cell">
                                                <div className="employee-avatar">
                                                    {slip.employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="employee-name">{slip.employee.name}</div>
                                                    <div className="employee-dept">{slip.employee.position}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{slip.employee.division}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(slip.baseSalary)}</td>
                                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>- {formatCurrency(slip.totalDeductions)}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(slip.takeHomePay)}</td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="action-btn" title="Download PDF" onClick={(e) => { e.stopPropagation(); handleDownloadPDF(slip); }}>
                                                    <FiDownload />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Professional Payslip Detail Modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal-box large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Slip Gaji — {selected.employee.name}</h2>
                            <button className="modal-close" onClick={() => setSelected(null)}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            {/* Company Header */}
                            <div style={{
                                textAlign: 'center', marginBottom: 28, paddingBottom: 20,
                                borderBottom: '2px solid var(--primary-light)',
                            }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.3px' }}>HRISync</div>
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>PT. Solusi Teknologi Indonesia</div>
                                <div style={{
                                    display: 'inline-block', marginTop: 12, padding: '5px 16px',
                                    background: 'var(--primary-light)', borderRadius: 'var(--radius-full)',
                                    fontSize: 12, fontWeight: 700, color: 'var(--primary)',
                                }}>
                                    Periode: {selected.period}
                                </div>
                            </div>

                            {/* Employee Info Grid */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr',
                                gap: '10px 24px', marginBottom: 24, fontSize: 13,
                            }}>
                                {[
                                    ['Nama', selected.employee.name],
                                    ['NIP', selected.employee.nip || selected.employee.employee_id || '-'],
                                    ['Divisi', selected.employee.division],
                                    ['Jabatan', selected.employee.position],
                                ].map(([label, val]) => (
                                    <div key={label} style={{ display: 'flex', gap: 8 }}>
                                        <span style={{ color: 'var(--text-tertiary)', minWidth: 60 }}>{label}:</span>
                                        <span style={{ fontWeight: 600 }}>{val}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Income & Deductions — Two Column */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                {/* Income */}
                                <div style={{
                                    background: 'var(--success-light)', borderRadius: 'var(--radius-md)',
                                    padding: 20, border: 'none',
                                }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
                                        Pendapatan
                                    </div>
                                    {[
                                        ['Gaji Pokok', selected.baseSalary],
                                        ['Tunjangan', selected.allowance],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13 }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                                            <span style={{ fontWeight: 600 }}>{formatCurrency(v)}</span>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: '1.5px solid rgba(22,163,74,0.15)', paddingTop: 10, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                                        <span>Total</span>
                                        <span>{formatCurrency(selected.grossIncome)}</span>
                                    </div>
                                </div>

                                {/* Deductions */}
                                <div style={{
                                    background: 'var(--danger-light)', borderRadius: 'var(--radius-md)',
                                    padding: 20, border: 'none',
                                }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
                                        Potongan
                                    </div>
                                    {[
                                        ['BPJS Kesehatan', selected.bpjs.bpjsKesehatan],
                                        ['BPJS JHT', selected.bpjs.bpjsJHT],
                                        ['BPJS JP', selected.bpjs.bpjsJP],
                                        ['PPh 21', selected.pph21],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13 }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                                            <span style={{ fontWeight: 600, color: 'var(--danger)' }}>- {formatCurrency(v)}</span>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: '1.5px solid rgba(220,38,38,0.15)', paddingTop: 10, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>
                                        <span>Total</span>
                                        <span>- {formatCurrency(selected.totalDeductions)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Take Home Pay — Highlighted */}
                            <div style={{
                                marginTop: 24, padding: '22px 28px', borderRadius: 'var(--radius-lg)',
                                background: 'linear-gradient(135deg, var(--primary) 0%, #1a6adf 100%)',
                                color: '#fff',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                boxShadow: '0 4px 16px rgba(0, 71, 171, 0.25)',
                            }}>
                                <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.85 }}>Take Home Pay</span>
                                <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>{formatCurrency(selected.takeHomePay)}</span>
                            </div>

                            {/* Footer Note */}
                            <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
                                Dokumen ini dibuat secara otomatis oleh sistem HRISync
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => handlePrint(selected)}>
                                <FiPrinter /> Print
                            </button>
                            <button className="btn-primary" onClick={() => handleDownloadPDF(selected)}>
                                <FiDownload /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
