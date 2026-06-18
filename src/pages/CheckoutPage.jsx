import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getAvailablePlans,
  validateVoucher,
  calculatePrice,
  activateSubscription,
  formatIDR,
  YEARLY_DISCOUNT_PERCENT,
} from '../services/subscriptionService';
import {
  FiCheck, FiChevronLeft, FiTag, FiAlertCircle,
  FiCheckCircle, FiClock, FiCreditCard, FiSmartphone, FiDollarSign,
  FiArrowRight, FiZap, FiShield,
} from 'react-icons/fi';
import './CheckoutPage.css';

// ── Plan color map ─────────────────────────────────────────────────────────────
const PLAN_COLORS = {
  starter:    '#3B82F6',
  pro:        '#7C3AED',
  enterprise: '#D97706',
};

// ── Load Midtrans Snap script ──────────────────────────────────────────────────
function loadSnapScript() {
  return new Promise((resolve, reject) => {
    if (window.snap) { resolve(); return; }
    const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
    const scriptUrl = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || '';
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.setAttribute('data-client-key', clientKey);
    script.onload  = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ── Step progress bar ──────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Pilih Paket', 'Pembayaran', 'Konfirmasi'];
  return (
    <div className="co-progress">
      {steps.map((label, idx) => {
        const num = idx + 1;
        const isDone   = num < step;
        const isActive = num === step;
        return (
          <div className="co-step" key={idx}>
            {idx > 0 && <div className={`co-step-line${isDone ? ' done' : ''}`} />}
            <div className={`co-step-dot${isActive ? ' active' : isDone ? ' done' : ''}`}>
              {isDone ? <FiCheck size={14} /> : num}
            </div>
            <span className={`co-step-label${isActive ? ' active' : isDone ? ' done' : ''}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function FeatCheck() {
  return (
    <span className="co-plan-feat-check">
      <FiCheck size={10} strokeWidth={3} />
    </span>
  );
}

// ═══════════════════ BILLING CYCLE TOGGLE ═════════════════════════════════════
function BillingToggle({ billingCycle, onChange }) {
  return (
    <div className="co-billing-toggle">
      <button className={`co-billing-btn${billingCycle === 'monthly' ? ' active' : ''}`} onClick={() => onChange('monthly')}>
        Bulanan
      </button>
      <button className={`co-billing-btn${billingCycle === 'yearly' ? ' active' : ''}`} onClick={() => onChange('yearly')}>
        Tahunan <span className="co-billing-discount">Hemat {YEARLY_DISCOUNT_PERCENT}%</span>
      </button>
    </div>
  );
}

// ═══════════════════ STEP 1 — PLAN SELECTION ══════════════════════════════════
function StepPlans({ plans, selected, onSelect, onNext, billingCycle, onBillingChange }) {
  return (
    <div className="co-fadein" style={{ width: '100%', maxWidth: 960 }}>
      <div className="co-section-title">
        <h1>Pilih Paket yang Sesuai</h1>
        <p>Mulai kapan saja, upgrade atau downgrade sesuai kebutuhan bisnis Anda.</p>
      </div>

      <BillingToggle billingCycle={billingCycle} onChange={onBillingChange} />

      <div className="co-plans-grid">
        {plans.map(plan => {
          const color = PLAN_COLORS[plan.slug] || '#3B82F6';
          const isEnterprise = plan.slug === 'enterprise';
          const isSel = selected?.slug === plan.slug;

          if (isEnterprise) {
            return (
              <div key={plan.slug} className="co-plan-card" style={{ '--plan-color': color, cursor: 'default' }}>
                {plan.badge && <div className="co-plan-badge" style={{ background: color }}>{plan.badge}</div>}
                <div className="co-plan-header" style={{ marginTop: plan.badge ? 16 : 0 }}>
                  <div className="co-plan-name">{plan.name}</div>
                  <div className="co-plan-desc">{plan.description}</div>
                </div>
                <div className="co-plan-price">
                  <div className="co-plan-price-amount" style={{ color }}>Custom</div>
                  <div className="co-plan-price-period">Harga sesuai kebutuhan</div>
                </div>
                <ul className="co-plan-features">
                  {(plan.features || []).map((f, i) => <li key={i}><FeatCheck />{f}</li>)}
                </ul>
                <a
                  href="https://wa.me/6289512114437?text=Halo%2C%20saya%20tertarik%20dengan%20paket%20Enterprise%20HRIS%20Loka."
                  target="_blank" rel="noopener noreferrer"
                  className="co-plan-select-btn"
                  style={{ marginTop: 20, display: 'block', textDecoration: 'none', background: color, borderColor: color, color: '#fff', textAlign: 'center', borderRadius: 12, padding: '11px 16px', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}
                >
                  Hubungi Sales via WhatsApp
                </a>
              </div>
            );
          }

          return (
            <div
              key={plan.slug}
              className={`co-plan-card${isSel ? ' selected' : ''}`}
              style={{ '--plan-color': color }}
              onClick={() => onSelect(plan)}
            >
              {plan.badge && <div className="co-plan-badge" style={{ background: color }}>{plan.badge}</div>}
              <div className="co-plan-header" style={{ marginTop: plan.badge ? 16 : 0 }}>
                <div className="co-plan-name">{plan.name}</div>
                <div className="co-plan-desc">{plan.description}</div>
              </div>
              <div className="co-plan-price">
                {(() => {
                  const monthly = plan.price_monthly;
                  const yearly = plan.price_yearly || Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100));
                  const display = billingCycle === 'yearly' ? yearly : monthly;
                  const perMo = billingCycle === 'yearly' ? Math.round(yearly / 12) : null;
                  return (
                    <>
                      <div className="co-plan-price-amount" style={{ color }}>{formatIDR(display)}</div>
                      <div className="co-plan-price-period">
                        {billingCycle === 'yearly'
                          ? <>/ tahun &nbsp;<span style={{color:'#10B981',fontWeight:700}}>({formatIDR(perMo)}/bln)</span></>
                          : '/bulan · ditagih per bulan'}
                      </div>
                      {billingCycle === 'yearly' && (
                        <div style={{marginTop:5,fontSize:11,color:'#10B981',fontWeight:700,background:'rgba(16,185,129,0.12)',borderRadius:8,padding:'3px 10px',display:'inline-block'}}>
                          Hemat {formatIDR(monthly * 12 - yearly)} vs bulanan
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:4}}>Maks {plan.max_employees} karyawan</div>
              <ul className="co-plan-features">
                {(plan.features || []).map((f, i) => <li key={i}><FeatCheck />{f}</li>)}
              </ul>
              <button className="co-plan-select-btn" onClick={() => onSelect(plan)}>
                {isSel ? 'Dipilih ✓' : 'Pilih Paket Ini'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="co-step1-footer">
        <button
          className="co-pay-btn primary"
          style={{ width: 'auto', padding: '13px 32px' }}
          disabled={!selected}
          onClick={onNext}
        >
          <FiArrowRight size={16} /> Lanjutkan
        </button>
      </div>
    </div>
  );
}

// ═══════════════════ STEP 2 — PAYMENT ════════════════════════════════════════
function StepPayment({ plan, onBack, onActivate, onMidtransPay, loading, billingCycle }) {
  const [voucherInput, setVoucherInput] = useState('');
  const [voucher, setVoucher]           = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherApplied, setVoucherApplied] = useState(false);

  const priceMonthly = plan?.price_monthly || 0;
  const priceYearly = plan?.price_yearly || Math.round(priceMonthly * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100));
  const basePrice = billingCycle === 'yearly' ? priceYearly : priceMonthly;
  const { finalPrice, discount } = calculatePrice(basePrice, voucher);
  const isFree = finalPrice === 0;

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setVoucherLoading(true);
    setVoucherError('');
    const { data, error } = await validateVoucher(voucherInput, plan.slug);
    setVoucherLoading(false);
    if (error) { setVoucherError(error.message); setVoucher(null); return; }
    setVoucher(data);
    setVoucherApplied(true);
  };

  const handleRemoveVoucher = () => {
    setVoucher(null); setVoucherInput(''); setVoucherApplied(false); setVoucherError('');
  };

  return (
    <div className="co-fadein" style={{ width: '100%', maxWidth: 860 }}>
      <button className="co-back-btn" onClick={onBack}>
        <FiChevronLeft size={15} /> Kembali ke pilihan paket
      </button>
      <div className="co-section-title" style={{ textAlign: 'left', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22 }}>Detail Pembayaran</h1>
        <p>Lengkapi informasi pembayaran untuk mengaktifkan akun Anda.</p>
      </div>

      <div className="co-step2-layout">
        {/* Left — payment panels */}
        <div className="co-payment-panel">

          {/* Voucher card */}
          <div className="co-panel-card">
            <div className="co-panel-card-header">
              <div className="co-panel-card-icon green"><FiTag size={15} /></div>
              <span className="co-panel-card-title">Kode Voucher (Opsional)</span>
            </div>
            <div className="co-panel-card-body">
              {!voucherApplied ? (
                <>
                  <div className="co-voucher-input-row">
                    <input
                      className={`co-voucher-input${voucherError ? ' error' : ''}`}
                      placeholder="Masukkan kode voucher"
                      value={voucherInput}
                      onChange={e => { setVoucherInput(e.target.value.toUpperCase()); setVoucherError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleApplyVoucher()}
                    />
                    <button
                      className="co-voucher-apply-btn"
                      onClick={handleApplyVoucher}
                      disabled={!voucherInput.trim() || voucherLoading}
                    >
                      {voucherLoading ? 'Memeriksa...' : 'Terapkan'}
                    </button>
                  </div>
                  {voucherError && <div className="co-voucher-msg error"><FiAlertCircle size={12} /> {voucherError}</div>}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="co-voucher-msg success" style={{ margin: 0 }}>
                    <FiCheckCircle size={13} />
                    <strong>{voucher.code}</strong> — Diskon {voucher.discount_type === 'percentage' ? `${voucher.discount_value}%` : formatIDR(voucher.discount_value)} diterapkan
                  </div>
                  <button onClick={handleRemoveVoucher} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 12 }}>
                    Hapus
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payment method card */}
          {!isFree && (
            <div className="co-panel-card">
              <div className="co-panel-card-header">
                <div className="co-panel-card-icon blue"><FiCreditCard size={15} /></div>
                <span className="co-panel-card-title">Metode Pembayaran</span>
              </div>
              <div className="co-panel-card-body">
                <div className="co-pm-tabs">
                  {[
                    { icon: <FiCreditCard size={18} />, label: 'Kartu Kredit / Debit' },
                    { icon: <FiSmartphone size={18} />, label: 'QRIS / GoPay / OVO' },
                    { icon: <FiDollarSign size={18} />, label: 'Transfer Bank (VA)' },
                  ].map((m, i) => (
                    <div key={i} className="co-pm-tab">
                      <span className="co-pm-tab-icon">{m.icon}</span>
                      <span style={{ fontSize: 11 }}>{m.label}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 10, lineHeight: 1.6 }}>
                  Semua metode tersedia via Midtrans. Pilih saat popup pembayaran terbuka.
                </p>
              </div>
            </div>
          )}

          {/* Action button */}
          {isFree ? (
            <button className="co-pay-btn success-green" onClick={() => onActivate({ pricePaid: finalPrice, discountAmount: discount, voucherCode: voucher?.code || null, paymentMethod: plan.price_monthly === 0 ? 'free' : 'voucher_full' })} disabled={loading}>
              {loading ? <><span className="co-spinner" /> Mengaktifkan...</> : <><FiZap size={16} /> Aktifkan Sekarang — {formatIDR(finalPrice)}</>}
            </button>
          ) : (
            <button className="co-pay-btn primary" onClick={() => onMidtransPay({ finalPrice, discountAmount: discount, voucherCode: voucher?.code || null, billingCycle })} disabled={loading}>
              {loading ? <><span className="co-spinner" /> Memproses...</> : <><FiCreditCard size={16} /> Bayar {formatIDR(finalPrice)} via Midtrans</>}
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            <FiShield size={12} /> Pembayaran dienkripsi & diproses aman oleh Midtrans
          </div>
        </div>

        {/* Right — order summary */}
        <div className="co-order-summary">
          <div className="co-summary-title">Ringkasan Pesanan</div>
          <div className="co-summary-row highlight">
            <span>Paket {plan?.name}</span>
            <span style={{ color: PLAN_COLORS[plan?.slug] || '#3B82F6' }}>{plan?.badge === 'Paling Populer' ? '⭐ Terpopuler' : ''}</span>
          </div>
          <div className="co-summary-row">
            <span>Siklus tagihan</span>
            <span>{billingCycle === 'yearly' ? '🗓 Tahunan' : '📅 Bulanan'}</span>
          </div>
          <div className="co-summary-row">
            <span>{billingCycle === 'yearly' ? 'Harga per tahun' : 'Harga per bulan'}</span>
            <span>{formatIDR(basePrice)}</span>
          </div>
          <div className="co-summary-row">
            <span>Kapasitas karyawan</span>
            <span>{plan?.max_employees >= 9999 ? 'Tidak terbatas' : `hingga ${plan?.max_employees}`}</span>
          </div>
          {discount > 0 && (
            <>
              <div className="co-summary-divider" />
              <div className="co-summary-row"><span>Subtotal</span><span>{formatIDR(basePrice)}</span></div>
              <div className="co-summary-row discount">
                <span>Diskon ({voucher?.code})</span>
                <span>− {formatIDR(discount)}</span>
              </div>
            </>
          )}
          <div className="co-summary-divider" />
          <div className="co-summary-total">
            <span className="co-summary-total-label">Total Bayar</span>
            <span className={`co-summary-total-amount${finalPrice === 0 ? ' free' : ''}`}>{formatIDR(finalPrice)}</span>
          </div>
          {finalPrice === 0 && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, fontSize: 12, color: '#34D399', textAlign: 'center', fontWeight: 600 }}>
              Tidak diperlukan pembayaran!
            </div>
          )}
          <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.15)', lineHeight: 1.6 }}>
            Dengan melanjutkan, Anda menyetujui Syarat Layanan dan Kebijakan Privasi HRIS Loka.
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ STEP 3 — CONFIRMATION ════════════════════════════════════
function StepConfirmation({ plan, pricePaid, status }) {
  const navigate = useNavigate();
  const isActive = status === 'active';

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => navigate('/dashboard'), 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, navigate]);

  return (
    <div className="co-step3-wrap co-fadein">
      <div className={`co-success-icon${isActive ? ' green' : ' yellow'}`}>
        {isActive ? <FiCheckCircle size={44} strokeWidth={1.5} /> : <FiClock size={44} strokeWidth={1.5} />}
      </div>
      <h2 className="co-step3-heading">
        {isActive ? 'Akun Berhasil Diaktifkan!' : 'Menunggu Konfirmasi Pembayaran'}
      </h2>
      <p className="co-step3-sub">
        {isActive
          ? 'Selamat! Akun Anda sudah aktif. Diarahkan ke dashboard dalam 3 detik...'
          : 'Pembayaran sedang diverifikasi oleh Midtrans. Akun akan aktif otomatis setelah pembayaran dikonfirmasi.'}
      </p>
      <div className="co-step3-info">
        {[
          { label: 'Paket', value: plan?.name },
          { label: 'Status', value: isActive ? 'Aktif' : 'Menunggu Verifikasi', green: isActive },
          { label: 'Total Dibayar', value: formatIDR(pricePaid) },
          { label: 'Mulai', value: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) },
        ].map((row, i) => (
          <div key={i} className="co-step3-info-row">
            <span className="co-step3-info-label">{row.label}</span>
            <span className={`co-step3-info-value${row.green ? ' green-text' : ''}`}>{row.value}</span>
          </div>
        ))}
      </div>
      {isActive ? (
        <button className="co-pay-btn success-green" onClick={() => navigate('/dashboard')}>
          <FiArrowRight size={16} /> Masuk ke Dashboard
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="co-pay-btn primary" onClick={() => navigate('/checkout')}>
            Cek Status Pembayaran
          </button>
          <button className="co-pay-btn" style={{ background: 'none', border: '1.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }} onClick={() => navigate('/login')}>
            Kembali ke Login
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════ ROOT CHECKOUT PAGE ═══════════════════════════════════════
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, refreshEmployee, fetchSubscription, refreshOnboarding } = useAuth();

  const [step, setStep]             = useState(1);
  const [plans, setPlans]           = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [activating, setActivating] = useState(false);
  const [confirmData, setConfirmData] = useState({ status: null, pricePaid: 0 });

  // Load Midtrans Snap on mount
  useEffect(() => { loadSnapScript().catch(console.warn); }, []);

  // Load plans
  useEffect(() => {
    getAvailablePlans().then(({ data }) => {
      setPlans(data || []);
      const pro = data?.find(p => p.slug === 'pro');
      if (pro) setSelectedPlan(pro);
      setPlansLoading(false);
    });
  }, []);

  // Auth guard
  const [authWait, setAuthWait] = useState(true);
  useEffect(() => { const t = setTimeout(() => setAuthWait(false), 1500); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!authWait && !user) navigate('/login', { replace: true }); }, [authWait, user, navigate]);

  const handleNextFromPlan = () => {
    if (!selectedPlan) return;
    setStep(2);
  };

  // Free / full-voucher activation
  const handleActivate = async ({ pricePaid, discountAmount, voucherCode, paymentMethod }) => {
    setActivating(true);
    const { error } = await activateSubscription({
      planSlug:     selectedPlan.slug,
      planName:     selectedPlan.name,
      priceMonthly: selectedPlan.price_monthly,
      pricePaid, discountAmount, voucherCode, paymentMethod,
      billingCycle,
    });
    if (error) console.warn('[Checkout] activation warning:', error.message);
    await refreshEmployee?.();
    if (fetchSubscription) await fetchSubscription(user?.id);
    if (refreshOnboarding) await refreshOnboarding();
    setConfirmData({ status: 'active', pricePaid });
    setStep(3);
    setActivating(false);
  };

  // Midtrans Snap payment
  const handleMidtransPay = useCallback(async ({ finalPrice, discountAmount, voucherCode, billingCycle: bc }) => {
    setActivating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await supabase.functions.invoke('create-payment', {
        body: {
          plan_slug:       selectedPlan.slug,
          plan_name:       selectedPlan.name,
          amount:          finalPrice,
          voucher_code:    voucherCode || null,
          discount_amount: discountAmount || 0,
          billing_cycle:   bc || billingCycle,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error || !res.data?.snap_token) {
        console.error('[Checkout] create-payment error:', res.error || res.data);
        setActivating(false);
        return;
      }

      const { snap_token } = res.data;

      window.snap.pay(snap_token, {
        onSuccess: async () => {
          await handleActivate({ pricePaid: finalPrice, discountAmount, voucherCode, paymentMethod: 'midtrans' });
        },
        onPending: () => {
          setConfirmData({ status: 'pending', pricePaid: finalPrice });
          setStep(3);
          setActivating(false);
        },
        onError: () => setActivating(false),
        onClose: () => setActivating(false),
      });
    } catch (err) {
      console.error('[Checkout] Snap error:', err.message);
      setActivating(false);
    }
  }, [selectedPlan, billingCycle]);

  return (
    <div className="co-root">
      <div className="co-orb co-orb-1" />
      <div className="co-orb co-orb-2" />
      <div className="co-orb co-orb-3" />

      <div className="co-topbar">
        <div className="co-logo">
          <picture>
            <img src="/landing/hrislokawhitepanjang.png" alt="HRIS Loka" />
          </picture>
        </div>
        <div className="co-topbar-right">
          Sudah berlangganan?{' '}<Link to="/login">Masuk</Link>
        </div>
      </div>

      <StepBar step={step} />

      <div className="co-main">
        {plansLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 60 }}>
            <div className="co-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Memuat paket...</span>
          </div>
        ) : (
          <>
            {step === 1 && (
              <StepPlans
                plans={plans}
                selected={selectedPlan}
                onSelect={setSelectedPlan}
                onNext={handleNextFromPlan}
                billingCycle={billingCycle}
                onBillingChange={setBillingCycle}
              />
            )}
            {step === 2 && selectedPlan && (
              <StepPayment
                plan={selectedPlan}
                onBack={() => setStep(1)}
                onActivate={handleActivate}
                onMidtransPay={handleMidtransPay}
                loading={activating}
                billingCycle={billingCycle}
              />
            )}
            {step === 3 && (
              <StepConfirmation
                plan={selectedPlan}
                pricePaid={confirmData.pricePaid}
                status={confirmData.status}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
