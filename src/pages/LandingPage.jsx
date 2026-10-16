import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const F = (n) => `/fig/${n}`;

/* ─── Reveal on scroll ─── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.kk2 .rv');
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }),
      { threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ─── Navbar ─── */
function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [['Home', '#home'], ['About', '#about'], ['Features', '#features'], ['Testimonials', '#testimonials'], ['FAQs', '#faqs']];
  return (
    <header className="kk2-nav">
      <div className="kk2-wrap kk2-nav-inner">
        <Link to="/landing" className="kk2-brand">
          <img src={F('imgLogo.svg')} alt="kinikerja" />
          <span>kinikerja</span>
        </Link>
        <nav className="kk2-nav-links">
          {links.map(([l, h]) => <a key={l} href={h}>{l}</a>)}
        </nav>
        <div className="kk2-nav-actions">
          <Link to="/login" className="kk2-btn-login">Login</Link>
          <Link to="/login" className="kk2-btn-register">Register</Link>
        </div>
        <button className="kk2-burger" onClick={() => setOpen(!open)} aria-label="Menu">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
      {open && (
        <div className="kk2-mobile-menu">
          {links.map(([l, h]) => <a key={l} href={h} className="mlink" onClick={() => setOpen(false)}>{l}</a>)}
          <div className="mrow">
            <Link to="/login" className="mlogin">Login</Link>
            <Link to="/login" className="mreg">Register</Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section id="home" className="kk2 kk2-bg-hero kk2-hero">
      <Navbar />
      <div className="kk2-hero-deco" aria-hidden>
        <img src={F('imgVector1.svg')} alt="" style={{ width: 1875, left: -91, top: 238 }} />
        <img src={F('imgVector2.svg')} alt="" style={{ width: 1829, left: -69, top: 298, opacity: .8 }} />
        <img src={F('imgVector3.svg')} alt="" style={{ width: 1759, left: -33, top: 394, opacity: .6 }} />
      </div>
      <div className="kk2-hero-amp" aria-hidden>
        <div className="box"><span className="bricolage">&amp;</span></div>
      </div>

      <div className="kk2-hero-inner">
        <div className="rv kk2-tagline">
          <span className="pill kk2-bg-dark-card">NEW</span>
          <span className="txt">Human Resource Innovation</span>
        </div>

        <h1 className="rv kk2-h1">
          Transform your <span className="bricolage" style={{ fontWeight: 300 }}>Workforce</span><br />
          into <span className="bricolage" style={{ fontWeight: 300 }}>Smarter, Connected,</span><br />
          Empowered Teams.
        </h1>

        <p className="rv kk2-hero-sub">
          Simplify HR operations, automate workflows, and help your people perform at their best — all in one intelligent HR platform.
        </p>

        <div className="rv kk2-hero-btns">
          <Link to="/login" className="kk2-btn-grad">Get Started <img src={F('imgFrame6.svg')} alt="" /></Link>
          <Link to="/login" className="kk2-btn-white">See Our Plans</Link>
        </div>

        <div className="rv kk2-ratings">
          <p>Trusted by HR teams worldwide</p>
          <div className="row">
            <img src={F('imgFrame7.svg')} alt="4.9 stars" />
            <span>4,9</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Highlights ─── */
function Highlights() {
  return (
    <section className="kk2 kk2-highlights">
      <div className="kk2-wrap rv">
        <h2><span style={{ fontWeight: 300 }}>Trusted by </span><b>5000+ HR Professionals Worldwide</b></h2>
        <p className="sub">From startups to global enterprises, our platform empowers HR teams to manage people efficiently and create thriving workplaces.</p>
      </div>
      <div className="rv kk2-avatars">
        {Array.from({ length: 11 }).map((_, i) => (
          <img key={i} src={F('imgEllipse.svg')} alt="" />
        ))}
      </div>
    </section>
  );
}

/* ─── About Us ─── */
function About() {
  return (
    <section id="about" className="kk2 kk2-about">
      <div className="kk2-wrap">
        <div className="kk2-about-top">
          <div className="rv kk2-label">
            <img src={F('imgLine1.svg')} alt="" />
            <span>About</span>
          </div>
          <div className="rv">
            <h2>Human Resource, <span className="bricolage" style={{ fontWeight: 300 }}>Redefined</span></h2>
            <p className="lede">We&rsquo;re building a smarter way to manage people — where data meets empathy. Our HR Management platform streamlines everything from recruitment to payroll, enabling teams to focus on growth, not paperwork. Designed for modern organizations, it blends intelligent automation, insightful analytics, and human-centered design to empower every workforce.</p>
          </div>
        </div>
        <div className="rv kk2-about-meta">
          <p>HR Management Platform, Workforce Analytics</p>
          <p>Focus<br />Human-Centered Technology</p>
          <p>Duration<br />Established since 2024</p>
        </div>
        <div className="kk2-about-imgs">
          {[1, 2, 3].map((i) => <div key={i} className="rv" />)}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
const FEATURES = [
  ['imgAccount1.svg', 'Employee Management', 'Keep every employee profile organized with roles, records, and attendance in one secure dashboard.'],
  ['imgCircleChart.svg', 'Payroll Automation', 'Process salaries in minutes with real-time tax, allowance, and deduction calculations'],
  ['imgFiverInternet.svg', 'Performance Analytics', 'Track progress, set goals, and evaluate growth through insightful data visualizations.'],
  ['imgDigital.svg', 'Recruitment & Onboarding', 'Simplify hiring and onboarding workflows for new employees — all paperless.'],
  ['imgDate1.svg', 'Leave & Attendance Tracking', 'Manage requests, approvals, and schedules in one seamless interface.'],
  ['imgBulb.svg', 'Smart Notifications', 'Stay on top of deadlines, approvals, and HR activities with instant alerts.'],
];
function Features() {
  return (
    <section id="features" className="kk2 kk2-features">
      <div className="kk2-wrap">
        <h2 className="rv">Designed to Simplify Every HR Process</h2>
        <div className="kk2-features-grid">
          {FEATURES.map(([icon, t, d]) => (
            <div key={t} className="rv kk2-feature">
              <div className="kk2-icon-bubble"><img src={F(icon)} alt="" /></div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
        <p className="rv kk2-features-foot">Powerful tools. Intuitive design. Built for teams that care about people.</p>
      </div>
    </section>
  );
}

/* ─── Why Choose Us ─── */
function WhyChooseUs() {
  const stats = [['10', 'Years of HR Expertise'], ['4.8K', 'Companies Managed'], ['50', 'Professional HR Consultants']];
  const darkCards = [
    ['Insightful Analytics', 'Access powerful data visualizations to understand employee performance and engagement.'],
    ['Employee Engagement', 'Boost productivity through transparent communication and feedback systems.'],
  ];
  return (
    <section className="kk2 kk2-why">
      <div className="kk2-wrap">
        <div className="kk2-why-top">
          <div className="rv">
            <h2>Build stronger<span className="bricolage" style={{ fontWeight: 300 }}>, teams and simplify every HR process</span></h2>
            <p className="lede">Trusted by organizations worldwide to automate, analyze, and enhance human resource management with ease.</p>
          </div>
          <div className="rv kk2-stats">
            {stats.map(([n, l]) => (
              <div key={l} className="kk2-stat">
                <p className="num">{n}<span className="plus">+</span></p>
                <p className="lbl">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="kk2-why-cards">
          <div className="rv kk2-why-card wide">
            <h3>Automated Workflows</h3>
            <p>Reduce manual tasks and let automation handle recruitment, payroll, and scheduling.</p>
          </div>
          {darkCards.map(([t, d]) => (
            <div key={t} className="rv kk2-why-card dark kk2-bg-dark-card">
              <img src={F('imgGradient.svg')} alt="" className="deco" aria-hidden />
              <div className="body">
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function Testimonials() {
  return (
    <section id="testimonials" className="kk2 kk2-testi">
      <div className="kk2-wrap">
        <div className="rv kk2-testi-head">
          <div className="kk2-testi-label">
            <img src={F('imgEllipse5.svg')} alt="" />
            <span>Trusted by Teams Worldwide</span>
          </div>
          <p>Testimonials</p>
        </div>

        <div className="rv kk2-testi-card kk2-bg-dark-card">
          <img src={F('imgVector5.svg')} alt="" className="bg-deco" aria-hidden />
          <div className="inner">
            <div className="stars">
              <img src={F('imgFrame7.svg')} alt="" />
              <span>4,9</span>
            </div>
            <blockquote>&ldquo;The platform completely redefined how we manage employees. Everything is faster, clearer, and more human.&rdquo;</blockquote>
          </div>
        </div>

        <div className="kk2-testi-bottom">
          <div className="rv kk2-testi-more">
            <div className="stack">
              {[F('imgEllipse1.svg'), F('imgEllipse2.svg'), F('imgEllipse2.svg'), F('imgEllipse1.svg')].map((s, i) => (
                <img key={i} src={s} alt="" />
              ))}
              <span className="n">+99</span>
            </div>
            <div className="txt">
              <p className="dim">More testimonials by</p>
              <p>HR Director</p>
            </div>
          </div>
          <img src={F('imgLogo1.svg')} alt="kinikerja" className="rv kk2-testi-logo" />
          <div className="rv kk2-testi-client">
            <img src={F('imgProfile.svg')} alt="Samantha Grey" />
            <div>
              <p className="name">Samantha Grey</p>
              <p className="role">HR Director, NovaTech</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Our Team ─── */
function OurTeam() {
  const team = ['Maria Bergson', 'Cristofer Kenter', 'Kaylynn Press'];
  return (
    <section className="kk2 kk2-team">
      <div className="kk2-wrap">
        <h2 className="rv">Trusted by Teams, Loved by HR Professionals</h2>
        <div className="kk2-team-grid">
          {team.map((name, i) => (
            <div key={name} className={`rv kk2-member${i === 1 ? ' mid' : ''}`}>
              <div className="photo" />
              <div className="who">
                <span className="tag kk2-bg-dark-card">{name}</span>
                <p className="role">CEO HR Management</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
function Pricing() {
  const plans = [
    { dark: false, title: 'Standard Plan', desc: 'Perfect for small teams starting to digitize their HR workflows.', price: '$79.05',
      feats: ['Employee Data Management', 'Attendance & Leave Tracking', 'Basic Reporting Dashboard', 'Email Support'],
      check: 'imgCheckmark.svg', icon: 'imgBulb1.svg', corner: 'imgVector8.svg' },
    { dark: true, title: 'Business Plan', desc: 'For organizations that need advanced tools and deeper insights.', price: '$99.99',
      feats: ['Everything in Standard Plan', 'Payroll & Benefits Integration', 'Recruitment & Onboarding Tools', 'Performance Analytics'],
      check: 'imgCheckmark1.svg', icon: 'imgRocket1.svg', corner: 'imgVector9.svg' },
  ];
  return (
    <section className="kk2 kk2-pricing">
      <div className="kk2-wrap">
        <div className="rv head">
          <h2 className="bricolage">Choose a plan that fits your business.</h2>
          <p>Whether you&rsquo;re managing a small startup or a growing enterprise, our flexible pricing helps you streamline HR operations without compromise.</p>
        </div>
        <div className="kk2-plans">
          {plans.map((p) => (
            <div key={p.title} className={`rv kk2-plan ${p.dark ? 'dark kk2-bg-dark-card' : 'light'}`}>
              <img src={F(p.corner)} alt="" className="corner" aria-hidden />
              <img src={F(p.icon)} alt="" className="corner-ic" aria-hidden />
              <h3>{p.title}</h3>
              <p className="desc">{p.desc}</p>
              <img src={F('imgLine2.svg')} alt="" className="rule" aria-hidden />
              <ul>
                {p.feats.map((f) => (
                  <li key={f}><img src={F(p.check)} alt="" /><span>{f}</span></li>
                ))}
              </ul>
              <img src={F('imgLine2.svg')} alt="" className="rule2" aria-hidden />
              <div className="bottom">
                <p className="price bricolage">{p.price}</p>
                {p.dark ? (
                  <span className="kk2-btn-white">Start free trial <img src={F('imgFrame8.svg')} alt="" /></span>
                ) : (
                  <Link to="/login" className="kk2-btn-grad">Start free trial <img src={F('imgFrame6.svg')} alt="" /></Link>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="rv foot">*All plans include free updates and access to new HR automation features.</p>
      </div>
    </section>
  );
}

/* ─── FAQs ─── */
const FAQS = [
  'What is included in the HR Management System?',
  'Can I integrate the system with existing company tools?',
  'How secure is employee data on your platform?',
  'Do you offer training for HR teams?',
  'Can I upgrade my plan later?',
];
function Faqs() {
  const [open, setOpen] = useState(-1);
  return (
    <section id="faqs" className="kk2 kk2-faq">
      <div className="kk2-wrap kk2-faq-grid">
        <div className="rv">
          <h2>Frequently Asked Questions</h2>
          <p className="lede">Find quick answers to common questions about our HR management platform.</p>
          <div className="cta">
            <Link to="/login" className="kk2-btn-grad">Start for Free Now <img src={F('imgFrame6.svg')} alt="" /></Link>
          </div>
        </div>
        <div className="kk2-faq-list">
          {FAQS.map((q, i) => (
            <div key={q} className={`rv kk2-faq-item${open === i ? ' open' : ''}`}>
              <button onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{q}</span>
                <img src={F('imgFrame9.svg')} alt="" />
              </button>
              <div className="kk2-faq-a" style={{ maxHeight: open === i ? 200 : 0 }}>
                <p>Our platform is designed to be flexible and secure. Contact our team for a detailed walkthrough tailored to your organization&rsquo;s needs.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Contact ─── */
function Contact() {
  const items = [
    ['imgEmail1.svg', 'Email', 'For general inquiries, partnership, or support.', 'hello@hrsmartly.com'],
    ['imgPhone.svg', 'Phone', 'Available Monday–Friday, 9 AM – 6 PM (GMT+7).', '+1 (415) 789-2345'],
    ['imgLocation1.svg', 'Address', 'Visit our office or schedule a virtual meeting.', 'Jl. Merdeka Raya No. 88, Jakarta, Indonesia'],
  ];
  return (
    <section className="kk2 kk2-contact kk2-bg-dark-soft">
      <div className="kk2-wrap">
        <div className="kk2-contact-grid">
          {items.map(([icon, t, d, v]) => (
            <div key={t} className="rv kk2-contact-item">
              <div className="kk2-icon-bubble"><img src={F(icon)} alt="" /></div>
              <h3>{t}</h3>
              <p className="d">{d}</p>
              <p className="v">{v}</p>
            </div>
          ))}
        </div>
        <div className="rv kk2-map">
          <img src={F('imgMapMakerStandard1.png')} alt="Office location map" className="map-img" />
          <img src={F('imgLocation.svg')} alt="" className="pin" />
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const cols = [
    ['Explore', ['How our AI works', 'Modules & Features', 'Pricing & Plans', 'Integrations']],
    ['Company', ['About Us', 'Features', 'Process', 'Partner Program']],
    ['Contact', ['Email: hello@hrsmartly.com', 'Phone: +1 (415) 555-1234']],
  ];
  return (
    <footer className="kk2 kk2-footer kk2-bg-dark-soft">
      <div className="kk2-wrap">
        <img src={F('imgLine4.svg')} alt="" className="rule" aria-hidden />
        <div className="kk2-footer-main">
          <div className="rv">
            <Link to="/landing" className="kk2-brand">
              <img src={F('imgLogo2.svg')} alt="kinikerja" style={{ height: 44, width: 'auto' }} />
              <span style={{ fontSize: 26 }}>kinikerja</span>
            </Link>
            <p className="tagline">AI-powered platform built to unify HR processes, elevate employee experience, and maximize talent retention.</p>
            <div className="kk2-nl">
              <span className="ph">Email Address</span>
              <span className="kk2-btn-grad">Subscribe <img src={F('imgFrame10.svg')} alt="" /></span>
            </div>
          </div>
          <div className="kk2-footer-cols">
            {cols.map(([h, ls]) => (
              <div key={h} className="rv">
                <h4>{h}</h4>
                <ul>
                  {ls.map((l) => <li key={l}><a href="#home">{l}</a></li>)}
                </ul>
              </div>
            ))}
            <div className="rv kk2-social">
              <img src={F('imgSocialMedia.svg')} alt="Social media" />
            </div>
          </div>
        </div>
        <img src={F('imgLine4.svg')} alt="" className="rule2" aria-hidden />
        <div className="kk2-footer-bottom">
          <p>© 2025 kinikerja. All rights reserved.</p>
          <p>Privacy Policy - Terms of Service</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function LandingPage() {
  useReveal();
  useEffect(() => { document.title = 'kinikerja — HR Management Platform'; }, []);
  return (
    <div>
      <Hero />
      <Highlights />
      <About />
      <Features />
      <WhyChooseUs />
      <Testimonials />
      <OurTeam />
      <Pricing />
      <Faqs />
      <Contact />
      <Footer />
    </div>
  );
}
