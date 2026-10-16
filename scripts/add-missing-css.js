const fs = require('fs');

const css = `
/* ── Employee Dashboard ────────────────────────────────── */
.emp-page-fadein { animation: adminFadeUp 0.3s ease both; }
.emp-hero-blob { position: absolute; opacity: 0.06; border-radius: 50%; pointer-events: none; }
.emp-card-padded { padding: 16px 20px; }
.emp-card-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
.emp-chevron { color: var(--text-tertiary); flex-shrink: 0; }
.emp-list-grid { display: flex; flex-direction: column; gap: 8px; }
.btn-link-primary { background: none; border: none; color: var(--primary); font-weight: 600; font-size: 13px; cursor: pointer; padding: 0; font-family: inherit; text-decoration: underline; }
.btn-icon-left { display: flex; align-items: center; gap: 6px; }
.emp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* ── Skeleton variants ─────────────────────────────────── */
.skeleton-hero { height: 180px; border-radius: var(--radius-lg); background: var(--bg-elevated); animation: skeletonPulse 1.4s ease infinite; }
.skeleton-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.skeleton-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
.skeleton-stat { height: 80px; border-radius: var(--radius-md); background: var(--bg-elevated); animation: skeletonPulse 1.4s ease infinite; }
.skeleton-label { height: 14px; width: 60%; border-radius: 6px; background: var(--bg-elevated); animation: skeletonPulse 1.4s ease infinite; margin-bottom: 6px; }
.skeleton-action { height: 36px; width: 120px; border-radius: var(--radius-sm); background: var(--bg-elevated); animation: skeletonPulse 1.4s ease infinite; }
.skeleton-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-light); }
.skeleton-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--bg-elevated); animation: skeletonPulse 1.4s ease infinite; flex-shrink: 0; }
.skeleton-line-40 { height: 14px; width: 40%; border-radius: 6px; background: var(--bg-elevated); animation: skeletonPulse 1.4s ease infinite; }

/* ── Demo banner ───────────────────────────────────────── */
.demo-banner-wrap { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; background: linear-gradient(90deg, rgba(99,91,255,0.08), rgba(59,130,246,0.06)); border: 1px solid rgba(99,91,255,0.15); border-radius: var(--radius-md); margin-bottom: 20px; }
.demo-banner-icon { font-size: 22px; flex-shrink: 0; }
.demo-banner-body { flex: 1; }
.demo-banner-title { font-size: 13px; font-weight: 700; color: var(--primary); margin-bottom: 2px; }
.demo-banner-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
.demo-banner-cta { flex-shrink: 0; }

/* ── Employee Login ────────────────────────────────────── */
.login-orb { position: absolute; border-radius: 50%; opacity: 0.08; pointer-events: none; }
.login-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 40px 32px; width: 100%; max-width: 420px; box-shadow: var(--shadow-lg); }
.login-card-title { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 6px; letter-spacing: -0.3px; }
.login-card-subtitle { font-size: 13px; color: var(--text-secondary); margin-bottom: 28px; line-height: 1.5; }
.login-form { display: flex; flex-direction: column; gap: 16px; }
.login-input-row { position: relative; }
.login-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none; }
.login-input { width: 100%; padding: 11px 14px 11px 38px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); font-size: 14px; font-family: inherit; color: var(--text); outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
.login-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
.login-btn-primary { width: 100%; padding: 12px; background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; transition: background 0.15s; }
.login-btn-primary:hover { background: var(--primary-hover); }
.ep-spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }

/* ── Employee Settings rows ────────────────────────────── */
.emp-settings-row { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-bottom: 1px solid var(--border-light); transition: background 0.12s; }
.emp-settings-row:last-child { border-bottom: none; }
.emp-settings-row:hover { background: var(--bg); }
.emp-settings-row-icon { width: 38px; height: 38px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--bg); color: var(--primary); }
.emp-settings-row-text { flex: 1; min-width: 0; }
.emp-settings-row-label { font-size: 14px; font-weight: 600; color: var(--text); }
.emp-settings-row-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

/* ── Announcements ─────────────────────────────────────── */
.ann-unread-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; background: var(--danger); color: #fff; border-radius: var(--radius-full); font-size: 10px; font-weight: 700; }
.ann-unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); flex-shrink: 0; }
.ann-read-hint { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }

/* ── Appraisal card ────────────────────────────────────── */
.appr-card-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
.appr-card-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
.appr-icon-wrap { width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--primary-light); color: var(--primary); font-size: 20px; }
.appr-card-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
.appr-card-sub { font-size: 12px; color: var(--text-secondary); }
.appr-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-secondary); margin-bottom: 8px; }
.appr-result-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-light); }
.appr-result-row:last-child { border-bottom: none; }
.appr-result-period { font-size: 12px; color: var(--text-tertiary); }
.appr-form-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 16px; }

/* ── Contract employee detail ──────────────────────────── */
.btn-back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-secondary); background: none; border: none; cursor: pointer; font-family: inherit; padding: 0; margin-bottom: 16px; transition: color 0.15s; }
.btn-back-link:hover { color: var(--primary); }
.emp-detail-row { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px solid var(--border-light); font-size: 13px; }
.emp-detail-row:last-child { border-bottom: none; }
.emp-alert-danger { padding: 12px 16px; background: var(--danger-light); border: 1px solid rgba(220,38,38,0.2); border-radius: var(--radius-sm); font-size: 13px; color: var(--danger); display: flex; align-items: flex-start; gap: 8px; }

/* ── Employee Payslip ──────────────────────────────────── */
.emp-month-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; color: var(--text); }
.emp-month-btn:hover { border-color: var(--primary); color: var(--primary); }

/* ── Projects ──────────────────────────────────────────── */
.ep-option-dark { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.12); }
.ep-stat-center { text-align: center; }

/* ── Company Directory ─────────────────────────────────── */
.dir-search-wrap { position: relative; flex: 1; min-width: 200px; }
.dir-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none; }
.dir-search-input { width: 100%; padding: 9px 14px 9px 36px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); font-size: 13px; font-family: inherit; outline: none; color: var(--text); }
.dir-search-input:focus { border-color: var(--primary); }
.dir-toggle-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dir-dept-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.dir-dept-label { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-full); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.dir-dept-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dir-dept-count { font-size: 11px; color: var(--text-tertiary); }
.dir-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.dir-contact-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer; font-size: 14px; transition: transform 0.15s; }
.dir-contact-btn--green { background: rgba(22,163,74,0.1); color: #16A34A; }
.dir-contact-btn--green:hover { background: rgba(22,163,74,0.2); }
.dir-contact-btn--blue { background: rgba(59,130,246,0.1); color: #3B82F6; }
.dir-contact-btn--blue:hover { background: rgba(59,130,246,0.2); }

/* ── Contract Management search ────────────────────────── */
.search-input-wrap { position: relative; flex: 1; min-width: 200px; }
.search-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none; }
.search-input-padded { padding-left: 36px !important; }

/* ── Badge variants ────────────────────────────────────── */
.badge-type { background: rgba(99,91,255,0.08); color: var(--primary); border: 1px solid rgba(99,91,255,0.15); padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700; }
.badge-status { padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700; }
.badge-default { background: var(--bg); color: var(--text-secondary); border: 1px solid var(--border); padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700; }
.badge--success { background: var(--success-light); color: #15803D; border: 1px solid rgba(22,163,74,0.2); padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700; }
.badge-outline { background: transparent; border: 1px solid var(--border-strong); color: var(--text-secondary); padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 600; }
.badge-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; display: inline-block; }

/* ── Contract Management wizard ────────────────────────── */
.modal-md { max-width: 560px; }
.cm-template-meta { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.cm-template-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.wizard-steps { display: flex; align-items: center; gap: 0; margin-bottom: 24px; }
.wizard-step-line { flex: 1; height: 2px; background: var(--border); }
.wizard-template-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
.wizard-tpl-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wizard-tpl-body { flex: 1; min-width: 0; }
.wizard-emp-card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px; }
.wizard-emp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; font-size: 13px; }
.wizard-confirm-card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px; }
.wizard-confirm-icon { width: 48px; height: 48px; border-radius: var(--radius-md); background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 22px; }
.wizard-confirm-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }

/* ── Table helpers ─────────────────────────────────────── */
.td-center-muted { text-align: center; color: var(--text-secondary); font-size: 12px; }
.td-empty { text-align: center; padding: 32px !important; color: var(--text-secondary); font-size: 13px; }
.td-center { text-align: center; }
.table-container { overflow-x: auto; }

/* ── Info row (CandidatePipeline) ──────────────────────── */
.info-row { display: flex; align-items: baseline; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-light); font-size: 13px; }
.info-row:last-child { border-bottom: none; }
.info-row-label { min-width: 120px; color: var(--text-secondary); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
.info-row-value { flex: 1; font-weight: 600; color: var(--text); }

/* ── Info card with icon (Timesheet) ───────────────────── */
.info-card--flex { display: flex; align-items: center; gap: 14px; }
.info-card-icon { width: 42px; height: 42px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.info-card-icon--primary { background: var(--primary-light); color: var(--primary); }
.info-card-icon--success { background: var(--success-light); color: #15803D; }
.info-card-icon--warning { background: var(--warning-light); color: #D97706; }

/* ── Filter row ────────────────────────────────────────── */
.filter-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.btn-filter { padding: 6px 14px; border: 1px solid var(--border); border-radius: var(--radius-full); font-size: 12px; font-weight: 600; cursor: pointer; background: var(--surface); color: var(--text-secondary); font-family: inherit; transition: all 0.15s; }
.btn-filter:hover, .btn-filter.active { background: var(--primary); color: #fff; border-color: var(--primary); }

/* ── Invoice/Timesheet card ────────────────────────────── */
.invoice-card-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); font-weight: 600; }
.invoice-card-breakdown { padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
.invoice-project-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--border-light); }
.invoice-project-row:last-child { border-bottom: none; }

/* ── InstallGuide / Landing ────────────────────────────── */
.lp-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.lp-section { padding: 80px 0; }
.lp-section-head { text-align: center; margin-bottom: 48px; }
.ig-step-content { flex: 1; }
.lp-hero-gradient { position: absolute; inset: 0; pointer-events: none; }
.lp-nav-right { display: flex; align-items: center; gap: 12px; }
.lp-nav-login { font-size: 14px; font-weight: 600; color: var(--text-secondary); text-decoration: none; }
.lp-nav-cta { font-size: 14px; font-weight: 700; }

/* ── Landing Page BEM classes ──────────────────────────── */
.nav__cta { font-size: 14px; font-weight: 700; }
.hero__bg-glow { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.efficiency__text { flex: 1; }
.cta-banner__left { flex: 1; }
.cta-price__from { font-size: 12px; color: rgba(255,255,255,0.6); }
.cta-price__row { display: flex; align-items: baseline; gap: 4px; }
.footer__brand { display: flex; flex-direction: column; gap: 12px; }
.footer__col { display: flex; flex-direction: column; gap: 10px; }

/* ── Misc ──────────────────────────────────────────────── */
.leave-quota-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
.gs-item-icon { width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--bg); color: var(--text-secondary); }
.qr-error { text-align: center; padding: 24px; color: var(--danger); font-size: 13px; }
.dash-header-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.form-hint-block { font-size: 11px; color: var(--text-secondary); margin-top: 4px; line-height: 1.4; padding: 8px 12px; background: var(--bg); border-radius: var(--radius-sm); border-left: 3px solid var(--primary-light); }

/* ── NotFound page ─────────────────────────────────────── */
.notfound-code { font-size: 64px; font-weight: 600; line-height: 1; background: linear-gradient(135deg, #635BFF, #3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 12px; text-align: center; }
.notfound-icon { width: 120px; height: 120px; border-radius: 32px; margin: 0 auto 28px; background: linear-gradient(135deg, rgba(99,91,255,0.08), rgba(99,91,255,0.03)); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.notfound-icon-border { position: absolute; inset: 0; border-radius: 32px; border: 2px solid rgba(99,91,255,0.1); }
.notfound-url { margin-top: 48px; text-align: center; }
`;

const adminCss = fs.readFileSync('src/styles/admin.css', 'utf8');
fs.writeFileSync('src/styles/admin.css', adminCss + css, 'utf8');
console.log('Added', css.split('\n').filter(l => l.includes('{')).length, 'CSS rules');
