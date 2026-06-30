import { useState, useEffect, createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import { updateSEOTags } from '../lib/seo';
import { t } from './LandingTranslations';
import './LandingPage.css';

/* ─── Language Context ─── */
const LangCtx = createContext({ lang: 'en', setLang: () => {} });
const useLang = () => {
  const { lang } = useContext(LangCtx);
  return t[lang];
};

/* ─── Reveal hook ─── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.rv');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }),
      { threshold: 0.08 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ─── Navbar ─── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, setLang } = useContext(LangCtx);
  const T = t[lang].nav;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
      <div className="nav__inner">
        <Link to="/landing" className="nav__logo">
          <span className="nav__logo-mark">H</span>
          <span className="nav__logo-text">HRIS<span>Loka</span></span>
        </Link>
        <div className={`nav__links${menuOpen ? ' nav__links--open' : ''}`}>
          <a href="#features">{T.features}</a>
          <a href="#pricing">{T.pricing}</a>
          <a href="#about">{T.about}</a>
          <a href="#faq">{T.contact}</a>
        </div>
        <div className="nav__right">
          {/* Language Toggle */}
          <button
            className="lang-toggle"
            onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
            aria-label="Toggle language"
          >
            <span className={lang === 'en' ? 'lang-toggle__active' : ''}>EN</span>
            <span className="lang-toggle__sep">|</span>
            <span className={lang === 'id' ? 'lang-toggle__active' : ''}>ID</span>
          </button>
          <Link to="/login" className="nav__login">{T.signin}</Link>
          <Link to="/login" className="btn btn--pill btn--primary nav__cta">{T.cta}</Link>
          <button className="nav__burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ─── */
function Hero() {
  const T = useLang();
  const lines = T.hero.h1.split('\n');
  return (
    <section className="hero">
      <div className="hero__bg-glow" />
      <div className="wrap hero__inner">

        <h1 className="hero__h1 rv">
          {lines.map((l, i) => <span key={i}>{l}<br /></span>)}
        </h1>
        <p className="hero__sub rv">{T.hero.sub}</p>
        <div className="hero__btns rv">
          <Link to="/login" className="btn btn--pill btn--primary btn--lg">{T.hero.cta}</Link>
          <button className="btn btn--pill btn--ghost btn--lg">
            <span className="play">▶</span> {T.hero.watch}
          </button>
        </div>
        <p className="hero__trust rv">{T.hero.trust}</p>
        <div className="hero__mockup rv">
          <img src="/landing/db.png" alt="HRIS Loka Dashboard" className="hero__db" />
          <div className="hero__mockup-fade" />
        </div>
      </div>
    </section>
  );
}

/* ─── Logos ─── */
function Logos() {
  const T = useLang();
  const brands = ['PT. Soltan Pilau', 'Ox The Slush & Base', 'PT. Nusantara Dinan', 'FedEx', 'Toyota'];
  return (
    <section className="logos">
      <div className="wrap">
        <p className="logos__label rv">{T.logos.label}</p>
        <div className="logos__row rv">
          {brands.map((b, i) => <span key={i} className="logos__item">{b}</span>)}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
const featureIcons = [
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
];

function Features() {
  const T = useLang();
  return (
    <section className="features" id="features">
      <div className="wrap">
        <div className="section-head rv">
          <span className="eyebrow">{T.features.eyebrow}</span>
          <h2>{T.features.h2.split('\n').map((l, i) => <span key={i}>{l}{i === 0 && <br />}</span>)}</h2>
        </div>
        <div className="features__grid">
          {T.features.items.map((f, i) => (
            <div key={i} className="feat-card rv" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="feat-card__icon">{featureIcons[i]}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  const T = useLang();
  const steps = T.how.steps;
  return (
    <section className="how" id="about">
      <div className="wrap">
        <div className="section-head rv">
          <span className="eyebrow">{T.how.eyebrow}</span>
          <h2>{T.how.h2.split('\n').map((l, i) => <span key={i}>{l}{i === 0 && <br />}</span>)}</h2>
        </div>
        <div className="how__grid">
          <div className="how-card rv">
            <div className="how-card__num">01</div>
            <h3>{steps[0].title}</h3>
            <div className="how-form" style={{ pointerEvents: 'none' }}>
              <input className="how-input" type="text" placeholder="Company Name" readOnly tabIndex={-1} />
              <input className="how-input" type="email" placeholder="Work Email" readOnly tabIndex={-1} />
            </div>
            {(steps[0].checks || []).map((c, i) => (
              <div key={i} className="how-check">
                <span className="how-check__icon">✓</span>{c}
              </div>
            ))}
            <button className="btn btn--pill btn--primary" style={{ marginTop: 16, pointerEvents: 'none' }}>{steps[0].trialBtn}</button>
          </div>
          <div className="how-card rv" style={{ transitionDelay: '.1s' }}>
            <div className="how-card__num">02</div>
            <h3>{steps[1].title}</h3>
            <div className="how-form" style={{ pointerEvents: 'none' }}>
              <input className="how-input" type="text" placeholder="Department" readOnly tabIndex={-1} />
              <select className="how-input" disabled tabIndex={-1}><option>Select Role</option></select>
            </div>
            <button className="btn btn--pill btn--primary" style={{ marginTop: 16, width: '100%', justifyContent: 'center', pointerEvents: 'none' }}>{steps[1].savebtn}</button>
          </div>
          <div className="how-card rv" style={{ transitionDelay: '.2s' }}>
            <div className="how-card__num">03</div>
            <h3>{steps[2].title}</h3>
            {['Employee Management','Attendance Tracking','Payroll Processing'].map((c, i) => (
              <div key={i} className="how-check">
                <span className="how-check__icon">✓</span>{c}
              </div>
            ))}
            <button className="btn btn--pill btn--primary" style={{ marginTop: 16, pointerEvents: 'none' }}>{steps[2].startBtn}</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Efficiency ─── */
function Efficiency() {
  const T = useLang();
  return (
    <section className="efficiency">
      <div className="wrap efficiency__inner">
        <div className="efficiency__img rv">
          <img src="/landing/cewe.png" alt="HR Efficiency" />
          <div className="efficiency__badge">{T.efficiency.badge}</div>
        </div>
        <div className="efficiency__text rv">
          <span className="eyebrow">{T.efficiency.eyebrow}</span>
          <h2>{T.efficiency.h2.split('\n').map((l, i) => <span key={i}>{l}{i < 2 && <br />}</span>)}</h2>
          <p>{T.efficiency.desc}</p>
          <ul className="eff-list">
            {T.efficiency.list.map((item, i) => (
              <li key={i}><span className="eff-check">✓</span>{item}</li>
            ))}
          </ul>
          <Link to="/login" className="btn btn--pill btn--primary" style={{ marginTop: 28, display: 'inline-flex' }}>{T.efficiency.cta}</Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Mobile ─── */
function Mobile() {
  const T = useLang();
  return (
    <section className="mobile-sec">
      <div className="wrap mobile-sec__inner">
        <div className="mobile-sec__text rv">
          <span className="eyebrow">{T.mobile.eyebrow}</span>
          <h2>{T.mobile.h2.split('\n').map((l, i) => <span key={i}>{l}{i === 0 && <br />}</span>)}</h2>
          <p>{T.mobile.desc}</p>
          <Link to="/login" className="btn btn--pill btn--primary" style={{ marginTop: 24, display: 'inline-flex' }}>{T.mobile.cta}</Link>
        </div>
        <div className="mobile-sec__phone rv">
          <img src="/landing/hp.png" alt="HRIS Loka Mobile App" />
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Banner ─── */
function CTABanner() {
  const T = useLang();
  return (
    <section className="cta-banner">
      <div className="wrap cta-banner__inner">
        <div className="cta-banner__left rv">
          <span className="eyebrow">{T.cta.h2.split('\n')[0]}</span>
          <h2>{T.cta.h2.split('\n').map((l, i) => <span key={i}>{l}{i === 0 && <br />}</span>)}</h2>
          <p>{T.cta.desc}</p>
        </div>
        <div className="cta-banner__right rv">
          <div className="cta-price">
            <span className="cta-price__from">{T.cta.from}</span>
            <div className="cta-price__row">
              <span className="cta-price__num">{T.cta.price}</span>
              <span className="cta-price__per">{T.cta.per}</span>
            </div>
          </div>
          <a href="https://wa.me/6289512114437" target="_blank" rel="noopener noreferrer" className="btn btn--pill btn--primary btn--lg">{T.cta.btn}</a>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing helpers ─── */
const PricingCheck = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="#635BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

/* ─── Pricing ─── */
function Pricing() {
  const T = useLang();
  const P = T.pricing;
  const waUrl = 'https://wa.me/6289512114437';

  return (
    <section className="pricing" id="pricing">
      <div className="wrap">
        <div className="pricing__head rv">
          <div className="pricing__eyebrow-wrap">
            <span className="pricing__line" />
            <span className="pricing__eyebrow-txt">{P.eyebrowTxt}</span>
            <span className="pricing__line" />
          </div>
          <h2 className="pricing__h2">{P.h2}</h2>
          <p className="pricing__sub">{P.sub}</p>
        </div>
        <div className="pricing__grid">
          {P.plans.map((p, i) => (
            <div key={i} className="pc rv" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="pc__name">{p.name}</div>
              <div className="pc__price">{p.price}</div>
              <div className="pc__yearly">{p.yearly}</div>
              <div className="pc__divider" />
              <div className="pc__section-label">{p.essentialLabel}</div>
              <ul className="pc__features">
                {p.essential.map((f, j) => <li key={j}><PricingCheck /><span>{f}</span></li>)}
              </ul>
              <div className="pc__section-label" style={{ marginTop: 8 }}>{p.pfLabel}</div>
              <ul className="pc__features">
                <li><PricingCheck /><span>{p.pf}</span></li>
              </ul>
              <div className="pc__divider" />
              {i === 2 ? (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="pc__cta-btn">
                  {p.cta} <Arrow />
                </a>
              ) : (
                <Link to="/login" className="pc__cta-btn">{p.cta} <Arrow /></Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials() {
  const T = useLang();
  return (
    <section className="testi">
      <div className="wrap testi__inner rv">
        <div className="testi__stars">★★★★★</div>
        <blockquote className="testi__quote">{T.testi.quote}</blockquote>
        <div className="testi__author">
          <div className="testi__av">L</div>
          <div>
            <div className="testi__name">{T.testi.name}</div>
            <div className="testi__role">{T.testi.role}</div>
          </div>
        </div>
        <div className="testi__logos">
          {['PT. Soltan Pilau', 'Ox The Slush & Base', 'PT. Nusantara Dinan'].map((n, i) => (
            <span key={i} className="testi__logo-item">{n}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQ() {
  const [open, setOpen] = useState(0);
  const T = useLang();
  const F = T.faq;
  return (
    <section className="faq" id="faq">
      <div className="wrap">
        <div className="section-head rv">
          <span className="eyebrow">{F.eyebrow}</span>
          <h2>{F.h2.split('\n').map((l, i) => <span key={i}>{l}{i === 0 && <br />}</span>)}</h2>
        </div>
        <div className="faq__list">
          {F.items.map((f, i) => (
            <div key={i} className={`faq__item${open === i ? ' faq__item--open' : ''}`} onClick={() => setOpen(open === i ? null : i)}>
              <div className="faq__q">
                <span>{f.q}</span>
                <span className="faq__icon">{open === i ? '−' : '+'}</span>
              </div>
              {open === i && <div className="faq__a">{f.a}</div>}
            </div>
          ))}
        </div>
        <div className="faq__cta rv">
          <div className="faq__cta-card">
            <p className="faq__cta-sub">{F.ctaSub}</p>
            <h3>{F.ctaTitle}</h3>
            <a href="https://wa.me/6289512114437" target="_blank" rel="noopener noreferrer" className="btn btn--pill btn--primary">{F.ctaBtn}</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const T = useLang();
  const F = T.footer;
  return (
    <footer className="footer">
      <div className="wrap footer__top">
        <div className="footer__brand">
          <div className="nav__logo">
            <span className="nav__logo-mark">H</span>
            <span className="nav__logo-text">HRIS<span>Loka</span></span>
          </div>
          <p>{F.brand}</p>
          <div className="footer__social">
            <a href="#" className="footer__social-icon" aria-label="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
            </a>
            <a href="#" className="footer__social-icon" aria-label="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
            </a>
            <a href="#" className="footer__social-icon" aria-label="Twitter/X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
            <a href="#" className="footer__social-icon" aria-label="LinkedIn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" /></svg>
            </a>
          </div>
        </div>
        <div className="footer__links">
          {F.cols.map(col => (
            <div key={col.title} className="footer__col">
              <h4>{col.title}</h4>
              {col.links.map(([label, href]) =>
                href.startsWith('/') ? <Link key={label} to={href}>{label}</Link> : <a key={label} href={href}>{label}</a>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="footer__bar">
        <div className="wrap footer__bar-inner">
          <span>© 2025 HRIS Loka. {F.copy}</span>
          <div className="footer__bar-links">
            <a href="/privacy">{F.policy}</a>
            <a href="/terms">{F.terms}</a>
            <a href="#">{F.cookies}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main Export ─── */
export default function LandingPage() {
  const [lang, setLang] = useState('en');
  useReveal();

  useEffect(() => {
    updateSEOTags({
      title: 'HRIS Loka — Revolutionizing Workforce Management',
      description: 'Modern HR software for Indonesian companies.',
    });
  }, []);

  return (
    <LangCtx.Provider value={{ lang, setLang }}>
      <div className="lp">
        <Navbar />
        <Hero />
        <Logos />
        <Features />
        <HowItWorks />
        <Efficiency />
        <Mobile />
        <CTABanner />
        <Pricing />
        <Testimonials />
        <FAQ />
        <Footer />
      </div>
    </LangCtx.Provider>
  );
}
