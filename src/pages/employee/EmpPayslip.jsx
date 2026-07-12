import { useState, useEffect } from 'react';
import {
  HiArrowDownTray, HiArrowPath, HiArrowTrendingDown, HiArrowTrendingUp,
  HiChevronLeft, HiChevronRight, HiCheckCircle, HiClock, HiExclamationTriangle,
  HiCurrencyDollar,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { formatCurrency } from '../../lib/utils';
import { generatePayslipPDF } from '../../lib/pdfGenerator';
import { useTranslation } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { isDemoMode, DEMO_EMPLOYEE, DEMO_PROFILE_DATA } from '../../lib/demoGuard';
import '../../styles/shared.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function EmpPayslip() {
  const { user, employee: authEmployee } = useAuth();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [payrollRecord, setPayrollRecord] = useState(null);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    async function load() {
      if (isDemoMode()) {
        const demoEmp = {
          ...DEMO_EMPLOYEE,
          base_salary: 8000000,
          allowance: 1500000,
          bpjs_rate: 0.04,
          tax_rate: 0.05,
        };
        setEmp(demoEmp);
        setPayrollHistory([...(DEMO_PROFILE_DATA.payslips || [])]);
        setLoading(false);
        return;
      }
      let empData = authEmployee;
      if (!empData?.id) {
        const email = user?.email || user?.user_metadata?.email;
        const res = await getEmployeeByEmail(email);
        empData = res.data;
      }
      if (empData) {
        setEmp(empData);
        // Schema uses `period` (YYYY-MM); older code used `month`
        let history = [];
        const h1 = await supabase
          .from('payroll_records')
          .select('*')
          .eq('employee_id', empData.id)
          .order('period', { ascending: false })
          .limit(12);
        if (!h1.error) {
          history = h1.data || [];
        } else {
          const h2 = await supabase
            .from('payroll_records')
            .select('*')
            .eq('employee_id', empData.id)
            .order('created_at', { ascending: false })
            .limit(12);
          history = h2.data || [];
        }
        setPayrollHistory(history);
      }
      setLoading(false);
    }
    load();
  }, [user, authEmployee?.id]);

  // Load specific month payroll record
  useEffect(() => {
    if (!emp) return;
    async function loadMonth() {
      if (isDemoMode()) {
        const now = new Date();
        now.setMonth(now.getMonth() + monthOffset);
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const match = (DEMO_PROFILE_DATA.payslips || []).find((p) => String(p.month || p.period || '').startsWith(monthStr));
        if (match) {
          setPayrollRecord(match);
        } else if (monthOffset === 0 && DEMO_PROFILE_DATA.payslips?.[0]) {
          setPayrollRecord(DEMO_PROFILE_DATA.payslips[0]);
        } else {
          setPayrollRecord(null);
        }
        return;
      }
      const now = new Date();
      now.setMonth(now.getMonth() + monthOffset);
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      // Prefer period = YYYY-MM (schema), fallback month column / period text match
      let row = null;
      const q1 = await supabase
        .from('payroll_records')
        .select('*')
        .eq('employee_id', emp.id)
        .eq('period', monthStr)
        .maybeSingle();
      if (!q1.error && q1.data) row = q1.data;
      if (!row) {
        const q2 = await supabase
          .from('payroll_records')
          .select('*')
          .eq('employee_id', emp.id)
          .or(`period.ilike.%${monthStr}%,month.ilike.%${monthStr}%`)
          .maybeSingle();
        if (!q2.error) row = q2.data;
      }
      setPayrollRecord(row);
    }
    loadMonth();
  }, [emp, monthOffset]);

  if (loading) {
    return (
      <div className="ep-loading-wrap">
        <div className="ep-loading-inner">
          <div className="ep-spinner" />
          <div className="ep-loading-text">{locale === 'en' ? 'Loading...' : 'Memuat...'}</div>
        </div>
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="emp-page">
        <div className="emp-page-header">
          <h1 className="emp-page-title">{locale === 'en' ? 'Payslip' : 'Slip Gaji'}</h1>
          <p className="emp-page-subtitle">
            {locale === 'en' ? 'Your monthly salary details' : 'Rincian gaji bulanan Anda'}
          </p>
        </div>
        <div className="emp-card emp-empty" style={{ padding: '48px 24px' }}>
          <div
            className="emp-empty-icon"
            style={{
              opacity: 1,
              background: 'color-mix(in srgb, var(--primary, #635BFF) 10%, transparent)',
              color: 'var(--primary, #635BFF)',
              border: '1.5px solid color-mix(in srgb, var(--primary, #635BFF) 18%, transparent)',
            }}
          >
            <HiCurrencyDollar size={24} />
          </div>
          <div className="emp-empty-title" style={{ color: 'var(--text)' }}>
            {locale === 'en' ? 'Payslip not available' : 'Slip gaji belum tersedia'}
          </div>
          <div className="emp-empty-desc" style={{ marginBottom: 20, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
            {locale === 'en'
              ? 'Your profile is not linked yet, or HR has not published payroll. Contact HR if this looks wrong.'
              : 'Profil belum terhubung, atau HR belum mempublikasikan payroll. Hubungi HR jika ini tidak seharusnya.'}
          </div>
          <a href="/app/home" className="btn-primary" style={{ textDecoration: 'none' }}>
            {locale === 'en' ? 'Back to Home' : 'Kembali ke Beranda'}
          </a>
        </div>
      </div>
    );
  }

  const now = new Date();
  now.setMonth(now.getMonth() + monthOffset);
  const monthLabel = now.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' });

  // Map both production schema (base_salary/period/take_home_pay) and legacy aliases
  const base = payrollRecord?.base_salary
    ?? payrollRecord?.basic_salary
    ?? emp.base_salary
    ?? 0;
  const allow = payrollRecord?.allowance
    ?? payrollRecord?.allowances
    ?? emp.allowance
    ?? 0;
  const otPay = payrollRecord?.overtime_pay ?? 0;
  const gross = payrollRecord?.gross_income ?? (base + allow + otPay);
  const bpjsFallback = Math.round(base * (parseFloat(emp.bpjs_rate) || 0.04));
  const taxFallback = Math.round(gross * (parseFloat(emp.tax_rate) || 0.05));
  const totalDeductions = payrollRecord?.total_deductions
    ?? payrollRecord?.deductions
    ?? (bpjsFallback + taxFallback);
  const net = payrollRecord?.take_home_pay
    ?? payrollRecord?.net_salary
    ?? (gross - totalDeductions);
  const takeHomePercent = gross > 0 ? Math.round((net / gross) * 100) : 0;
  const isPaid = payrollRecord?.status === 'paid';
  const isProcessed = !!payrollRecord;

  const handleDownload = async () => {
    setDownloading(true);
    await generatePayslipPDF(emp, {
      month: now.toLocaleDateString('id-ID', { month: 'long' }),
      year: now.getFullYear(),
      baseSalary: base, allowance: allow,
      bpjs: Math.round(totalDeductions * 0.5),
      tax: Math.round(totalDeductions * 0.5),
      total: net,
    });
    setDownloading(false);
  };

  const rows = [
    { label: locale === 'en' ? 'Base Salary' : 'Gaji Pokok', val: base, type: 'income' },
    { label: locale === 'en' ? 'Allowance' : 'Tunjangan', val: allow, type: 'income' },
    { label: 'BPJS Kesehatan', val: Math.round(totalDeductions * 0.5), type: 'deduct' },
    { label: 'PPh 21', val: Math.round(totalDeductions * 0.5), type: 'deduct' },
  ];

  // KEEP: runtime dynamic - changes based on payroll status
  const cardGradient = isPaid
    ? 'linear-gradient(135deg, #059669 0%, #10B981 55%, #34D399 100%)'
    : 'linear-gradient(135deg, #635BFF 0%, #5449FF 55%, #635BFF 100%)';
  const cardShadow = isPaid
    ? '0 12px 36px rgba(5,150,105,0.28)'
    : '0 12px 36px rgba(99,91,255,0.28)';

  return (
    <div className="emp-page">
      <h1 className="emp-page-title">{locale === 'en' ? 'Payslip' : 'Slip Gaji'}</h1>

      {/* Month Selector */}
      <div className="emp-month-selector">
        <button className="emp-month-btn" onClick={() => setMonthOffset(m => m - 1)}>
          <HiChevronLeft size={20} />
        </button>
        <div className="emp-month-center">
          <span className="emp-month-label">{monthLabel}</span>
          <div className="emp-month-status">
            {isProcessed ? (
              isPaid
                ? <><HiCheckCircle size={12} color="var(--success)" /><span style={{ fontSize:11, color:'var(--success)', fontWeight:600 }}>{locale==='en'?'Paid':'Sudah Dibayar'}</span></>
                : <><HiClock size={12} color="var(--warning)" /><span style={{ fontSize:11, color:'var(--warning)', fontWeight:600 }}>{locale==='en'?'Processed':'Diproses'}</span></>
            ) : (
              <><HiExclamationTriangle size={12} color="var(--muted)" /><span style={{ fontSize:11, color:'var(--muted)', fontWeight:600 }}>{locale==='en'?'Not yet processed':'Belum diproses'}</span></>
            )}
          </div>
        </div>
        {/* KEEP: runtime - color depends on disabled state (monthOffset) */}
        <button
          className="emp-month-btn"
          onClick={() => setMonthOffset(m => Math.min(m+1, 0))}
          disabled={monthOffset>=0}
          style={{ color: monthOffset>=0 ? 'var(--border)' : 'var(--primary)' }}
        >
          <HiChevronRight size={20} />
        </button>
      </div>

      {/* Hero Card - KEEP all styles: runtime cardGradient/cardShadow + custom decorative layout */}
      <div style={{ borderRadius: 14, overflow:'hidden', marginBottom: 12, background:cardGradient, boxShadow:cardShadow, position:'relative' }}>
        <div className="emp-hero-orb" />
        <div className="emp-hero-body">
          <div className="emp-hero-top">
            <div>
              <div className="emp-hero-label">{locale==='en'?'Net Salary':'Total Diterima'}</div>
              <div className="emp-hero-amount">{formatCurrency(net)}</div>
              <div className="emp-hero-sub">{takeHomePercent}% {locale==='en'?'take home from gross':'dari gaji bruto'}</div>
            </div>
            <button onClick={handleDownload} disabled={downloading} className="emp-hero-dl-btn">
              {downloading ? <HiArrowPath size={14} style={{ animation:'spin 0.8s linear infinite' }} /> : <HiArrowDownTray size={14} />} PDF
            </button>
          </div>
          {/* KEEP: runtime width from takeHomePercent */}
          <div className="emp-hero-progress-track">
            <div style={{ width:`${takeHomePercent}%`, height:'100%', background:'#fff', borderRadius:4, transition:'width 0.8s ease' }} />
          </div>
        </div>
        <div className="emp-hero-footer">
          {[
            { label:locale==='en'?'Gross':'Bruto', val:gross, color:'#fff' },
            { label:locale==='en'?'Deductions':'Potongan', val:totalDeductions, color:'#FECACA', prefix:'-' },
            { label:locale==='en'?'Net':'Bersih', val:net, color:'#BBF7D0' },
          ].map((item, i) => (
            <div key={i} className="emp-hero-footer-item">
              <div className="emp-hero-footer-label">{item.label}</div>
              {/* KEEP: runtime item.color per column */}
              <div style={{ fontSize:14, fontWeight:600, color:item.color }}>{item.prefix || ''}{formatCurrency(item.val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div className="emp-card mb">
        <div className="section-label mb-sm">{locale==='en'?'Salary Breakdown':'Rincian Gaji'}</div>
        <div className="emp-breakdown-row">
          <div className="emp-chart-wrap">
            <Doughnut data={{ datasets:[{ data:[base, allow, totalDeductions], backgroundColor:['#635BFF','#635BFF','#F87171'], borderWidth:0, cutout:'72%' }] }} options={{ plugins:{ legend:{ display:false }, tooltip:{ enabled:false } }, maintainAspectRatio:false }} />
          </div>
          <div className="emp-breakdown-list">
            {rows.map(r => (
              <div key={r.label} className="emp-breakdown-item">
                <div className="emp-breakdown-left">
                  {/* KEEP: runtime - dot color depends on row type */}
                  <div style={{ width:8, height:8, borderRadius:'50%', background:r.type==='income'?'var(--primary)':'#F87171', flexShrink:0 }} />
                  <span className="td-muted-sm">{r.label}</span>
                </div>
                {/* KEEP: runtime - text color depends on row type */}
                <span style={{ fontSize:12, fontWeight:700, color:r.type==='deduct'?'var(--danger)':'var(--text)' }}>{r.type==='deduct'?'-':''}{formatCurrency(r.val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      {payrollHistory.length > 0 && (
        <div className="emp-card">
          <div className="section-label mb-sm">{locale==='en'?'Salary History':'Riwayat Gaji'}</div>
          {payrollHistory.slice(0, 6).map((pr, idx) => {
            const d = new Date(pr.month);
            const label = d.toLocaleDateString(locale==='en'?'en-US':'id-ID', { month:'short', year:'numeric' });
            const netAmt = pr.net_salary ?? 0;
            const prevNet = payrollHistory[idx+1]?.net_salary ?? netAmt;
            const diff = netAmt - prevNet;
            return (
              <div key={pr.id ?? idx} className="emp-history-row">
                <div>
                  <div className="td-semibold">{label}</div>
                  {/* KEEP: runtime - color depends on pr.status */}
                  <div style={{ fontSize:11, color:pr.status==='paid'?'var(--success)':'var(--warning)', fontWeight:600, marginTop:2 }}>
                    {pr.status==='paid'?(locale==='en'?'Paid':'Dibayar'):(locale==='en'?'Processing':'Diproses')}
                  </div>
                </div>
                <div className="emp-history-right">
                  <div className="td-semibold">{formatCurrency(netAmt)}</div>
                  {idx < payrollHistory.length-1 && diff !== 0 && (
                    // KEEP: runtime - color depends on diff direction
                    <div style={{ display:'flex', alignItems:'center', gap:3, justifyContent:'flex-end', fontSize:11, color:diff>0?'var(--success)':'var(--danger)' }}>
                      {diff > 0 ? <HiArrowTrendingUp size={11} /> : <HiArrowTrendingDown size={11} />}
                      {diff>0?'+':''}{formatCurrency(Math.abs(diff))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
