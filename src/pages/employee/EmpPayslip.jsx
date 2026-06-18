import { useState, useEffect } from 'react';
import {
  HiArrowDownTray, HiArrowPath, HiArrowTrendingDown, HiArrowTrendingUp,
  HiChevronLeft, HiChevronRight, HiCheckCircle, HiClock, HiExclamationTriangle,
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeByEmail } from '../../services/employeeService';
import { formatCurrency } from '../../lib/utils';
import { generatePayslipPDF } from '../../lib/pdfGenerator';
import { useTranslation } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import '../../styles/shared.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function EmpPayslip() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const [emp, setEmp] = useState(null);
  const [payrollRecord, setPayrollRecord] = useState(null);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    async function load() {
      const email = user?.email || user?.user_metadata?.email;
      const { data: empData } = await getEmployeeByEmail(email);
      if (empData) {
        setEmp(empData);
        // Load payroll history for this employee
        const { data: history } = await supabase
          .from('payroll_records')
          .select('*')
          .eq('employee_id', empData.id)
          .order('month', { ascending: false })
          .limit(12);
        setPayrollHistory(history || []);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  // Load specific month payroll record
  useEffect(() => {
    if (!emp) return;
    async function loadMonth() {
      const now = new Date();
      now.setMonth(now.getMonth() + monthOffset);
      const yr = now.getFullYear();
      const mo = now.getMonth() + 1;
      const monthStr = `${yr}-${String(mo).padStart(2, '0')}`;
      const { data } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('employee_id', emp.id)
        .like('month', `${monthStr}%`)
        .maybeSingle();
      setPayrollRecord(data || null);
    }
    loadMonth();
  }, [emp, monthOffset]);

  if (loading) {
    return (
      <div style={{ animation: 'fadeInUp 0.3s ease' }}>
        <div className="skeleton" style={{ width: 120, height: 26, borderRadius: 8, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 50, borderRadius: 14, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 22, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 180, borderRadius: 18, marginBottom: 10 }} />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="emp-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{locale === 'en' ? 'No payslip data' : 'Data tidak tersedia'}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{locale === 'en' ? 'Contact HR for assistance.' : 'Hubungi HRD untuk bantuan.'}</div>
      </div>
    );
  }

  const now = new Date();
  now.setMonth(now.getMonth() + monthOffset);
  const monthLabel = now.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' });

  // Use payroll_records data if available, else fallback to employee salary fields
  const base = payrollRecord?.basic_salary ?? emp.base_salary ?? 0;
  const allow = payrollRecord?.allowances ?? emp.allowance ?? 0;
  const gross = base + allow;
  const bpjsFallback = Math.round(gross * (parseFloat(emp.bpjs_rate) || 0.04));
  const taxFallback  = Math.round(gross * (parseFloat(emp.tax_rate)  || 0.15));
  const totalDeductions = payrollRecord?.deductions ?? (bpjsFallback + taxFallback);
  const net = payrollRecord?.net_salary ?? (gross - totalDeductions);
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

  const cardGradient = isPaid
    ? 'linear-gradient(135deg, #059669 0%, #10B981 55%, #34D399 100%)'
    : 'linear-gradient(135deg, #0047AB 0%, #1D6AE5 55%, #3B82F6 100%)';
  const cardShadow = isPaid
    ? '0 12px 36px rgba(5,150,105,0.28)'
    : '0 12px 36px rgba(0,71,171,0.28)';

  return (
    <div className="emp-page">
      <h1 className="emp-page-title">{locale === 'en' ? 'Payslip' : 'Slip Gaji'}</h1>

      {/* Month Selector */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, background:'var(--surface)', padding:'10px 16px', borderRadius:16, border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)' }}>
        <button onClick={() => setMonthOffset(m => m - 1)} style={{ background:'var(--bg)', border:'none', cursor:'pointer', color:'var(--primary)', width:34, height:34, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <HiChevronLeft size={20} />
        </button>
        <div style={{ textAlign:'center' }}>
          <span style={{ fontWeight:800, fontSize:15 }}>{monthLabel}</span>
          <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'center', marginTop:3 }}>
            {isProcessed ? (
              isPaid
                ? <><HiCheckCircle size={12} color="var(--success)" /><span style={{ fontSize:11, color:'var(--success)', fontWeight:600 }}>{locale==='en'?'Paid':'Sudah Dibayar'}</span></>
                : <><HiClock size={12} color="var(--warning)" /><span style={{ fontSize:11, color:'var(--warning)', fontWeight:600 }}>{locale==='en'?'Processed':'Diproses'}</span></>
            ) : (
              <><HiExclamationTriangle size={12} color="var(--muted)" /><span style={{ fontSize:11, color:'var(--muted)', fontWeight:600 }}>{locale==='en'?'Not yet processed':'Belum diproses'}</span></>
            )}
          </div>
        </div>
        <button onClick={() => setMonthOffset(m => Math.min(m+1, 0))} disabled={monthOffset>=0} style={{ background:'var(--bg)', border:'none', cursor:'pointer', color:monthOffset>=0?'var(--border)':'var(--primary)', width:34, height:34, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <HiChevronRight size={20} />
        </button>
      </div>

      {/* Hero Card */}
      <div style={{ borderRadius:24, overflow:'hidden', marginBottom:16, background:cardGradient, boxShadow:cardShadow, position:'relative' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
        <div style={{ position:'relative', padding:'22px 20px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, opacity:0.75, textTransform:'uppercase', letterSpacing:1.5, color:'#fff', marginBottom:6 }}>{locale==='en'?'Net Salary':'Total Diterima'}</div>
              <div style={{ fontSize:30, fontWeight:900, color:'#fff', letterSpacing:'-1px', lineHeight:1 }}>{formatCurrency(net)}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', marginTop:6 }}>{takeHomePercent}% {locale==='en'?'take home from gross':'dari gaji bruto'}</div>
            </div>
            <button onClick={handleDownload} disabled={downloading} style={{ background:'rgba(255,255,255,0.2)', backdropFilter:'blur(10px)', border:'1.5px solid rgba(255,255,255,0.35)', borderRadius:14, color:'#fff', padding:'10px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, fontFamily:'inherit', flexShrink:0 }}>
              {downloading ? <HiArrowPath size={14} style={{ animation:'spin 0.8s linear infinite' }} /> : <HiArrowDownTray size={14} />} PDF
            </button>
          </div>
          <div style={{ marginTop:16, background:'rgba(255,255,255,0.15)', borderRadius:4, height:4, overflow:'hidden' }}>
            <div style={{ width:`${takeHomePercent}%`, height:'100%', background:'#fff', borderRadius:4, transition:'width 0.8s ease' }} />
          </div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.1)', padding:'12px 20px', display:'flex', justifyContent:'space-between' }}>
          {[
            { label:locale==='en'?'Gross':'Bruto', val:gross, color:'#fff' },
            { label:locale==='en'?'Deductions':'Potongan', val:totalDeductions, color:'#FECACA', prefix:'-' },
            { label:locale==='en'?'Net':'Bersih', val:net, color:'#BBF7D0' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.7)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>{item.label}</div>
              <div style={{ fontSize:14, fontWeight:800, color:item.color }}>{item.prefix || ''}{formatCurrency(item.val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div className="emp-card" style={{ marginBottom:16, padding:'18px 16px' }}>
        <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>{locale==='en'?'Salary Breakdown':'Rincian Gaji'}</div>
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          <div style={{ width:90, height:90, flexShrink:0 }}>
            <Doughnut data={{ datasets:[{ data:[base, allow, totalDeductions], backgroundColor:['#0047AB','#3B82F6','#F87171'], borderWidth:0, cutout:'72%' }] }} options={{ plugins:{ legend:{ display:false }, tooltip:{ enabled:false } }, maintainAspectRatio:false }} />
          </div>
          <div style={{ flex:1 }}>
            {rows.map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--border-light)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:r.type==='income'?'var(--primary)':'#F87171', flexShrink:0 }} />
                  <span style={{ fontSize:12, color:'var(--muted)' }}>{r.label}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:r.type==='deduct'?'var(--danger)':'var(--text)' }}>{r.type==='deduct'?'-':''}{formatCurrency(r.val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      {payrollHistory.length > 0 && (
        <div className="emp-card" style={{ padding:'18px 16px' }}>
          <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>{locale==='en'?'Salary History':'Riwayat Gaji'}</div>
          {payrollHistory.slice(0, 6).map((pr, idx) => {
            const d = new Date(pr.month);
            const label = d.toLocaleDateString(locale==='en'?'en-US':'id-ID', { month:'short', year:'numeric' });
            const netAmt = pr.net_salary ?? 0;
            const prevNet = payrollHistory[idx+1]?.net_salary ?? netAmt;
            const diff = netAmt - prevNet;
            return (
              <div key={pr.id ?? idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{label}</div>
                  <div style={{ fontSize:11, color:pr.status==='paid'?'var(--success)':'var(--warning)', fontWeight:600, marginTop:2 }}>
                    {pr.status==='paid'?(locale==='en'?'Paid':'Dibayar'):(locale==='en'?'Processing':'Diproses')}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:14, fontWeight:800 }}>{formatCurrency(netAmt)}</div>
                  {idx < payrollHistory.length-1 && diff !== 0 && (
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
