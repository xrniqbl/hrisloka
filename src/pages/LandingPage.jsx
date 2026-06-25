import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateSEOTags } from '../lib/seo';
import './LandingPage.css';

/* ── Scroll reveal ── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ── Icons ── */
const I = {
  db: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>),
  clock: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  chart: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>),
  play: (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>),
  check: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6 9 17l-5-5"/></svg>),
  star: (<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z"/></svg>),
  arrow: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>),
  chevron: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>),
};

function Logo({ light }) {
  return (
    <div className={'lp-logo' + (light ? ' light' : '')}>
      <span className="lp-logo-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3 4 7v6c0 4.5 3.4 7.3 8 8 4.6-.7 8-3.5 8-8V7z"/><path d="m9 12 2 2 4-4"/></svg>
      </span>
      <span className="lp-logo-text">SolveHR</span>
    </div>
  );
}

const FAQS = [
  { q: 'How secure is SolveHR?', a: 'SolveHR uses bank-grade AES-256 encryption, role-based access control, and continuous security monitoring to keep your HR data fully protected at all times.' },
  { q: 'Is SolveHR suitable for small businesses?', a: 'Absolutely. Our Basic plan is designed for growing teams and small businesses, giving you essential HR tools without the enterprise price tag.' },
  { q: 'Can I upgrade my plan later?', a: 'Yes. You can upgrade or downgrade your plan anytime directly from your dashboard, and changes take effect immediately.' },
  { q: 'What kind of support do you offer?', a: 'We provide email and chat support on all plans, with priority and dedicated support available on Pro and Enterprise plans.' },
  { q: 'Can SolveHR integrate with other software we use?', a: 'SolveHR offers seamless integrations and an open API so you can connect payroll, accounting, and collaboration tools you already use.' },
];

export default function LandingPage() {
  useReveal();
  const [faqOpen, setFaqOpen] = useState(0);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    updateSEOTags?.({
      title: 'SolveHR — Revolutionizing Workforce Management',
      description: 'Empower your HR Operators with seamless efficiency and insightful analytics.',
    });
  }, []);

  return (
    <div className="lp">
      {/* NAVBAR */}
      <header className="lp-nav-wrap">
        <nav className="lp-nav">
          <Logo />
          <ul className="lp-nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <Link to="/login" className="lp-btn lp-btn-primary lp-nav-cta">Sign in</Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="lp-hero" id="home">
        <div className="lp-container">
          <h1 className="lp-hero-title reveal">Revolutionizing<br/>Workforce<br/>Management</h1>
          <p className="lp-hero-sub reveal">Empower your HR Operators with Seamless Efficiency<br/>and Insightful Analytics.</p>
          <div className="lp-hero-actions reveal">
            <Link to="/login" className="lp-btn lp-btn-primary">Get Started</Link>
            <a href="#about" className="lp-btn lp-btn-ghost"><span className="lp-play">{I.play}</span> Watch Video</a>
          </div>
          <div className="lp-hero-shot reveal">
            <div className="lp-browser">
              <div className="lp-browser-bar"><span/><span/><span/><div className="lp-browser-url">app.solvehr.com/dashboard</div></div>
              <img src="/landing/hero-dashboard.png" alt="SolveHR dashboard" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED */}
      <section className="lp-trusted">
        <div className="lp-container">
          <p className="lp-trusted-label">Trusted by the world's best companies</p>
          <div className="lp-trusted-logos">
            <span className="lp-tlogo nyt">The New York Times</span>
            <span className="lp-tlogo">TELEMUNDO</span>
            <span className="lp-tlogo">Nestle</span>
            <span className="lp-tlogo lego">LEGO</span>
            <span className="lp-tlogo fedex">FedEx</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-features" id="features">
        <div className="lp-container lp-feat-grid">
          {[
            { ic: I.db, t: 'Employee Database Management', d: 'Centralized employee information for easy access.' },
            { ic: I.clock, t: 'Attendance Tracking', d: 'Real-time attendance monitoring and reporting.' },
            { ic: I.chart, t: 'Performance Analytics', d: 'In-depth analytics for strategic decision-making.' },
          ].map((f, i) => (
            <div className="lp-feat reveal" key={i} style={{ transitionDelay: i * 80 + 'ms' }}>
              <div className="lp-feat-icon">{f.ic}</div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-how">
        <div className="lp-container">
          <h2 className="lp-h2 reveal">How it <em>works</em> in<br/>simple way</h2>
          <div className="lp-how-grid">
            {[
              { t: 'Sign Up for Free Trial', d: 'Create your account in minutes.' },
              { t: 'Configure Your HR Settings', d: "Tailor the system to your company's unique needs." },
              { t: 'Start Optimizing Your HR Processes', d: 'Streamline operations and insightful analytics.' },
            ].map((s, i) => (
              <div className="lp-how-card reveal" key={i} style={{ transitionDelay: i * 80 + 'ms' }}>
                <h4>{s.t}</h4>
                <div className="lp-how-mock">
                  {i === 0 && (<><div className="lp-mock-field"><label>Full Name</label><span className="lp-mock-input"/></div><div className="lp-mock-field"><label>Email</label><span className="lp-mock-input"/></div><div className="lp-mock-btn">Get Started</div></>)}
                  {i === 1 && (<><div className="lp-mock-row"><span className="lp-mock-dot"/><span className="lp-mock-line w70"/><span className="lp-mock-toggle on"/></div><div className="lp-mock-row"><span className="lp-mock-dot"/><span className="lp-mock-line w50"/><span className="lp-mock-toggle"/></div><div className="lp-mock-row"><span className="lp-mock-dot"/><span className="lp-mock-line w60"/><span className="lp-mock-toggle on"/></div></>)}
                  {i === 2 && (<><div className="lp-mock-task"><span className="lp-mock-check">{I.check}</span><span className="lp-mock-line w60"/></div><div className="lp-mock-task"><span className="lp-mock-check">{I.check}</span><span className="lp-mock-line w40"/></div><div className="lp-mock-task"><span className="lp-mock-check">{I.check}</span><span className="lp-mock-line w70"/></div></>)}
                </div>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EFFICIENCY BOOST */}
      <section className="lp-split lp-eff" id="about">
        <div className="lp-container lp-split-grid">
          <div className="lp-split-media reveal"><img src="/cewe.png" alt="HR professional" loading="lazy" /></div>
          <div className="lp-split-text reveal">
            <span className="lp-eyebrow">How it works</span>
            <h2 className="lp-h2 left">Efficiency Boost:<br/>Transform Your HR<br/>Operations</h2>
            <p>Our HR SaaS platform is designed to bring a substantial boost to the efficiency of your HR operations, streamlining processes and freeing up valuable time for strategic initiatives.</p>
            <Link to="/login" className="lp-btn lp-btn-primary">Get Started</Link>
          </div>
        </div>
      </section>

      {/* MOBILE ACCESSIBILITY */}
      <section className="lp-split lp-mobile">
        <div className="lp-container lp-split-grid reverse">
          <div className="lp-split-text reveal">
            <span className="lp-eyebrow">How it works</span>
            <h2 className="lp-h2 left">Mobile Accessibility</h2>
            <div className="lp-tabs">
              {['Geofencing', 'Funding alternatives', 'Performance Analytics'].map((t, i) => (
                <button key={i} className={'lp-tab' + (tab === i ? ' active' : '')} onClick={() => setTab(i)}>{t}</button>
              ))}
            </div>
            <p>Enable your HR team to stay productive on the go. SolveHR's mobile accessibility ensures that key HR functions are accessible anytime, anywhere.</p>
            <Link to="/login" className="lp-btn lp-btn-primary">Get Started</Link>
          </div>
          <div className="lp-split-media phone reveal"><img src="/hp.png" alt="SolveHR mobile app" loading="lazy" /></div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <div className="lp-container lp-cta-inner reveal">
          <div className="lp-cta-left">
            <h2>Ready to optimize<br/>your HR operations?</h2>
            <p>Choose the plan that suits your business needs and root your journey toward more efficient and effective HR management. Have questions? Contact our team for personalized assistance.</p>
          </div>
          <div className="lp-cta-right">
            <div className="lp-cta-price"><span className="lp-price-amt">$19.99</span><span className="lp-price-per">/month</span></div>
            <Link to="/login" className="lp-btn lp-btn-primary">Start Your Free Trial Now</Link>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-container">
          <span className="lp-eyebrow center">Our Pricing</span>
          <h2 className="lp-h2 reveal">Pricing plan</h2>
          <p className="lp-h2-sub reveal">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <div className="lp-price-grid">
            {[
              { name: 'Basic Plan', price: '$19.99', per: '/month', featured: false,
                feats: ['Centralized Employee Database Management', 'Real-Time Attendance Tracking', 'Automated HR Tasks'],
                perfect: 'Small teams and startups looking to streamline basic HR processes.' },
              { name: 'Pro Plan', price: '$39.99', per: '/month', featured: true,
                feats: ['Performance Analytics for Informed Decision-Making', 'Seamless Collaboration Tools', 'Mobile Accessibility'],
                perfect: 'Growing businesses that require advanced analytics and collaboration features.' },
              { name: 'Enterprise Plan', price: 'Custom Pricing', per: '', featured: false,
                feats: ['Scalable Solutions for growing teams', 'Dedicated Support', 'Customized HR Solutions'],
                perfect: 'Small teams and startups looking to streamline basic HR processes.' },
            ].map((p, i) => (
              <div className={'lp-price-card reveal' + (p.featured ? ' featured' : '')} key={i} style={{ transitionDelay: i * 80 + 'ms' }}>
                <span className="lp-price-name">{p.name}</span>
                <div className="lp-price-val"><span className="lp-price-num">{p.price}</span><span className="lp-price-unit">{p.per}</span></div>
                <p className="lp-price-feat-label">Essential Features:</p>
                <ul className="lp-price-feats">
                  {p.feats.map((f, j) => (<li key={j}><span className="lp-fcheck">{I.check}</span>{f}</li>))}
                </ul>
                <p className="lp-price-perfect"><strong>Perfect For:</strong><br/>{p.perfect}</p>
                <Link to="/login" className={'lp-btn ' + (p.featured ? 'lp-btn-light' : 'lp-btn-primary')}>{p.name === 'Enterprise Plan' ? 'Start Free Trial' : 'Subscribe'}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="lp-testi">
        <div className="lp-container lp-testi-inner reveal">
          <div className="lp-stars">{[0,1,2,3,4].map(i => <span key={i}>{I.star}</span>)}</div>
          <blockquote>"SolveHR has transformed our HR processes. It's intuitive,<br/>powerful, and has saved us countless hours."</blockquote>
          <div className="lp-testi-foot">
            <div className="lp-testi-person">
              <img src="/users-1.svg" alt="Lisan Al-Ghaib" className="lp-testi-avatar" />
              <div><strong>Lisan Al-Ghaib</strong><span>Employee Relations Manager, The New York Times</span></div>
            </div>
            <span className="lp-tlogo nyt big">The New York Times</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq">
        <div className="lp-container">
          <span className="lp-eyebrow center">FAQ</span>
          <h2 className="lp-h2 reveal">Frequently asked questions</h2>
          <p className="lp-h2-sub reveal">Frequently asked questions ordered by popularity. Remember that if the visitor has not<br/>committed to the call to action, they may still have questions (doubts) that can be answered.</p>
          <div className="lp-faq-list">
            {FAQS.map((f, i) => (
              <div className={'lp-faq-item' + (faqOpen === i ? ' open' : '')} key={i}>
                <button className="lp-faq-q" onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}>
                  <span>{f.q}</span><span className="lp-faq-ic">{I.chevron}</span>
                </button>
                <div className="lp-faq-a"><p>{f.a}</p></div>
              </div>
            ))}
          </div>
          <div className="lp-faq-talk" id="contact">
            <span>Do you have any question?</span>
            <div className="lp-faq-talk-row">
              <h3>Lets talk with us</h3>
              <Link to="/login" className="lp-btn lp-btn-primary">Contact Us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <Logo />
          <ul className="lp-footer-links">
            <li><a href="#home">Home</a></li>
            <li><a href="#features">Products</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <div className="lp-footer-social">
            <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 22v-9h3l.5-4H13V6.5c0-1.1.3-1.9 1.9-1.9H17V1.1C16.6 1 15.6 1 14.4 1 11.9 1 10 2.6 10 5.6V9H7v4h3v9z"/></svg></a>
            <a href="#" aria-label="Twitter"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.9c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4 4 0 0 0-6.8 3.6A11.3 11.3 0 0 1 3.7 4.6a4 4 0 0 0 1.2 5.3c-.6 0-1.2-.2-1.8-.5a4 4 0 0 0 3.2 4 4 4 0 0 1-1.8.1 4 4 0 0 0 3.7 2.8A8 8 0 0 1 2 18a11.3 11.3 0 0 0 6.1 1.8c7.3 0 11.4-6.1 11.4-11.4v-.5c.8-.6 1.5-1.3 2-2z"/></svg></a>
            <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.9 8H3.6v12h3.3zM5.3 3.3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8M20.4 20v-6.6c0-3.5-.7-6.2-4.8-6.2-2 0-3.3 1.1-3.8 2.1h-.1V8H8.5v12h3.3v-5.9c0-1.6.3-3 2.2-3s1.9 1.7 1.9 3.2V20z"/></svg></a>
            <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
          </div>
        </div>
        <div className="lp-footer-bottom lp-container">
          <span>© 2024 SolveHR. All rights reserved.</span>
          <div className="lp-footer-legal"><a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">Cookies Settings</a></div>
        </div>
      </footer>
    </div>
  );
}