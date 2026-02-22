import { useState, useEffect, useMemo } from 'react';
import { FiDollarSign, FiDownload } from 'react-icons/fi';
import * as employeeService from '../services/employeeService';
import * as overtimeService from '../services/overtimeService';
import * as payrollService from '../services/payrollService';
import { calculateSalary } from '../lib/payrollEngine';
import { exportToExcel } from '../lib/excelExport';
import { generatePayslipPDF } from '../lib/pdfGenerator';
import '../styles/shared.css';

const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

export default function Payroll() {
    const [selectedMonth, setSelectedMonth] = useState('2026-02');
    const [employees, setEmployees] = useState([]);
    const [overtimeRecords, setOvertimeRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: empData } = await employeeService.getAllEmployees();
        const { data: otData } = await overtimeService.getAllOvertime();
        setEmployees(empData || []);
        setOvertimeRecords(otData || []);
        setLoading(false);
    };

    const payrollData = useMemo(() => {
        return employees.map((emp) => {
            const empOT = overtimeRecords.filter((o) => o.employee_id === emp.id && o.status === 'approved');
            const salary = calculateSalary(emp, empOT);
            return { ...emp, salary };
        });
    }, [employees, overtimeRecords, selectedMonth]);

    const totals = useMemo(() => {
        return payrollData.reduce(
            (acc, emp) => ({
                gross: acc.gross + emp.salary.grossIncome,
                deductions: acc.deductions + emp.salary.totalDeductions,
                net: acc.net + emp.salary.takeHomePay,
            }),
            { gross: 0, deductions: 0, net: 0 }
        );
    }, [payrollData]);

    const handleExportExcel = () => {
        const data = payrollData.map(emp => ({
            'Bulan': selectedMonth,
            'NIP': emp.nip,
            'Nama': emp.name,
            'Gaji Pokok': emp.salary.baseSalary,
            'Tunjangan': emp.salary.allowance,
            'Lembur': emp.salary.overtimePay,
            'BPJS': emp.salary.bpjs.total,
            'PPh 21': emp.salary.pph21,
            'Take Home Pay': emp.salary.takeHomePay
        }));
        exportToExcel(data, `Payroll_${selectedMonth}.xlsx`);
    };

    const handleDownloadIndividual = async (emp) => {
        const payrollDataForPDF = {
            month: new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { month: 'long' }),
            year: selectedMonth.split('-')[0],
            baseSalary: emp.salary.baseSalary,
            allowance: emp.salary.allowance,
            bpjs: emp.salary.bpjs.total,
            tax: emp.salary.pph21,
            total: emp.salary.takeHomePay
        };
        await generatePayslipPDF(emp, payrollDataForPDF);
    };

    return (
        <div>
            <div className="page-header">
                <h1>Payroll</h1>
                <div className="page-header-actions">
                    <input
                        type="month"
                        className="form-input"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{ width: 180 }}
                    />
                    <button className="btn-primary" onClick={handleExportExcel}><FiDownload /> Export Payroll</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
                <div className="info-card">
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Total Penghasilan Kotor</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrency(totals.gross)}</div>
                </div>
                <div className="info-card">
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Total Potongan</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)' }}>- {formatCurrency(totals.deductions)}</div>
                </div>
                <div className="info-card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', border: 'none' }}>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Total Take Home Pay</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{formatCurrency(totals.net)}</div>
                </div>
            </div>

            {/* Payroll Table */}
            <div className="data-table-card">
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Karyawan</th>
                                <th style={{ textAlign: 'right' }}>Gaji Pokok</th>
                                <th style={{ textAlign: 'right' }}>Tunjangan</th>
                                <th style={{ textAlign: 'right' }}>Lembur</th>
                                <th style={{ textAlign: 'right' }}>BPJS</th>
                                <th style={{ textAlign: 'right' }}>PPh 21</th>
                                <th style={{ textAlign: 'right' }}>Take Home Pay</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payrollData.map((emp) => (
                                <tr key={emp.id}>
                                    <td>
                                        <div className="employee-cell">
                                            <div className="employee-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                                                {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div>
                                                <div className="employee-name">{emp.name}</div>
                                                <div className="employee-dept">{emp.division}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(emp.salary.baseSalary)}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(emp.salary.allowance)}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: emp.salary.overtimePay > 0 ? 'var(--primary)' : 'var(--muted)' }}>
                                        {formatCurrency(emp.salary.overtimePay)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--danger)' }}>-{formatCurrency(emp.salary.bpjs.total)}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--danger)' }}>-{formatCurrency(emp.salary.pph21)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{formatCurrency(emp.salary.takeHomePay)}</td>
                                    <td>
                                        <button className="action-btn" title="Download PDF" onClick={() => handleDownloadIndividual(emp)}><FiDownload /></button>
                                    </td>
                                </tr>
                            ))}
                            {payrollData.length === 0 && (
                                <tr><td colSpan={8} className="empty-state">Belum ada data karyawan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
