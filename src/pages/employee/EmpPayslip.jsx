import { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiDownload, FiSend, FiCamera, FiLoader } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { getMyReimbursements, submitReimbursement } from '../../services/reimbursementService';
import { formatCurrency } from '../../lib/utils';
import BottomSheet from '../../components/BottomSheet';
import { generatePayslipPDF } from '../../lib/pdfGenerator';
import { uploadDocument } from '../../services/documentService';

export default function EmpPayslip() {
    const { user } = useAuth();
    const [emp, setEmp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reimbursements, setReimbursements] = useState([]);
    const [monthOffset, setMonthOffset] = useState(0);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [reimbForm, setReimbForm] = useState({ category: 'Transport', amount: '', notes: '', receipt: null });

    useEffect(() => {
        async function load() {
            const email = user?.email || user?.user_metadata?.email || 'ahmad.rizky@company.com';
            const { data } = await getEmployeeByEmail(email);
            if (data) {
                setEmp(data);
                const { data: rb } = await getMyReimbursements(data.id);
                setReimbursements(rb);
            }
            setLoading(false);
        }
        load();
    }, [user]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
                <FiLoader size={28} style={{ animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>Memuat data...</span>
            </div>
        );
    }

    if (!emp) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Data tidak ditemukan.</div>;

    const now = new Date();
    now.setMonth(now.getMonth() + monthOffset);
    const monthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const base = emp.base_salary || 0;
    const allow = emp.allowance || 0;
    const gross = base + allow;
    const bpjs = Math.round(gross * (parseFloat(emp.bpjs_rate) || 0.04));
    const tax = Math.round(gross * (parseFloat(emp.tax_rate) || 0.15));
    const deductions = bpjs + tax;
    const net = gross - deductions;

    const handleDownloadPDF = async () => {
        const payrollData = {
            month: now.toLocaleDateString('id-ID', { month: 'long' }),
            year: now.getFullYear(),
            baseSalary: base,
            allowance: allow,
            bpjs: bpjs,
            tax: tax,
            total: net
        };
        await generatePayslipPDF(emp, payrollData);
    };

    const handleSubmitReimb = async () => {
        if (!reimbForm.amount) return;
        setSubmitting(true);

        let receiptUrl = '';
        if (reimbForm.receipt) {
            const { data: docData } = await uploadDocument(reimbForm.receipt, emp.id, 'Receipt');
            receiptUrl = docData?.url || '';
        }

        await submitReimbursement(emp.id, {
            category: reimbForm.category,
            amount: reimbForm.amount,
            notes: reimbForm.notes,
            receipt_url: receiptUrl
        });

        // Reload reimbursements
        const { data: rb } = await getMyReimbursements(emp.id);
        setReimbursements(rb || []);
        setSubmitting(false);
        setSheetOpen(false);
        setReimbForm({ category: 'Transport', amount: '', notes: '', receipt: null });
    };

    const statusColor = (s) => s === 'approved' || s === 'paid' ? 'var(--success)' : s === 'rejected' ? 'var(--danger)' : 'var(--warning)';

    return (
        <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Slip Gaji</h1>

            {/* Month Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, background: 'var(--surface)', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <button onClick={() => setMonthOffset(m => m - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}><FiChevronLeft size={22} /></button>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{monthLabel}</span>
                <button onClick={() => setMonthOffset(m => Math.min(m + 1, 0))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: monthOffset >= 0 ? 'var(--border)' : 'var(--primary)' }} disabled={monthOffset >= 0}><FiChevronRight size={22} /></button>
            </div>

            {/* Payslip Card */}
            <div className="emp-card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Total Diterima</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(net)}</div>
                    </div>
                    <button
                        onClick={handleDownloadPDF}
                        style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                    >
                        <FiDownload size={14} /> PDF
                    </button>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--success)' }}>Pendapatan</div>
                {[['Gaji Pokok', base], ['Tunjangan', allow]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>{k}</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(v)}</span>
                    </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                    <span>Total Bruto</span>
                    <span>{formatCurrency(gross)}</span>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 16, marginBottom: 10, color: 'var(--danger)' }}>Potongan</div>
                {[['BPJS', bpjs], ['PPh 21', tax]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>{k}</span>
                        <span style={{ fontWeight: 600, color: 'var(--danger)' }}>-{formatCurrency(v)}</span>
                    </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14, fontWeight: 700 }}>
                    <span>Total Potongan</span>
                    <span style={{ color: 'var(--danger)' }}>-{formatCurrency(deductions)}</span>
                </div>
            </div>

            {/* Reimbursement Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Reimbursement</span>
                <button onClick={() => setSheetOpen(true)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', background: '#EFF6FF', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 12px', cursor: 'pointer' }}>+ Ajukan</button>
            </div>

            {reimbursements.length > 0 ? (
                <div style={{ display: 'grid', gap: 8 }}>
                    {reimbursements.map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 13 }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{r.category}</div>
                                <div style={{ color: 'var(--muted)', fontSize: 11 }}>{r.notes || '—'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: statusColor(r.status), textTransform: 'capitalize' }}>{r.status}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>Belum ada reimbursement</div>
            )}

            {/* Reimbursement Bottom Sheet */}
            <BottomSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                title="Ajukan Reimbursement"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setSheetOpen(false)}>Batal</button>
                        <button className="btn-primary" onClick={handleSubmitReimb} disabled={submitting}>
                            {submitting ? 'Mengirim...' : <><FiSend style={{ marginRight: 6 }} /> Kirim</>}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'grid', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Kategori</label>
                        <select value={reimbForm.category} onChange={e => setReimbForm({ ...reimbForm, category: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <option>Transport</option>
                            <option>Medical</option>
                            <option>Meeting</option>
                            <option>Lainnya</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Jumlah (Rp)</label>
                        <input type="number" placeholder="350000" value={reimbForm.amount} onChange={e => setReimbForm({ ...reimbForm, amount: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Keterangan</label>
                        <input type="text" placeholder="Deskripsi pengeluaran..." value={reimbForm.notes} onChange={e => setReimbForm({ ...reimbForm, notes: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Upload Struk</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>
                            <FiCamera />
                            <span>Ambil foto atau pilih file</span>
                            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => setReimbForm({ ...reimbForm, receipt: e.target.files?.[0] })} />
                        </label>
                        {reimbForm.receipt && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--success)' }}>✓ {reimbForm.receipt.name}</div>}
                    </div>
                </div>
            </BottomSheet>
        </div>
    );
}
