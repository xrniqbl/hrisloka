const fs = require('fs');

const css = `
/* ── EmpLogin ──────────────────────────────────────────── */
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); position: relative; overflow: hidden; padding: 20px; }
.login-orbs { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.login-orb-1 { position: absolute; top: -80px; right: -80px; width: 300px; height: 300px; border-radius: 50%; background: rgba(99,91,255,0.08); }
.login-orb-2 { position: absolute; bottom: -80px; left: -80px; width: 240px; height: 240px; border-radius: 50%; background: rgba(59,130,246,0.06); }
.login-content { position: relative; z-index: 1; width: 100%; max-width: 420px; }
.login-logo-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; justify-content: center; }
.login-logo { width: 36px; height: 36px; border-radius: 10px; object-fit: cover; }
.login-card-icon-wrap { width: 56px; height: 56px; border-radius: 16px; background: var(--primary-light); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
.login-card-icon { font-size: 24px; color: var(--primary); }
.login-btn-secondary { width: 100%; padding: 11px; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: border-color 0.15s; }
.login-btn-secondary:hover { border-color: var(--primary); }
.login-msg { padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; margin-bottom: 12px; }
.login-msg-error { background: var(--danger-light); color: var(--danger); border: 1px solid rgba(220,38,38,0.15); }
.login-eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-tertiary); padding: 4px; }
.login-forgot-row { display: flex; justify-content: flex-end; margin-top: -8px; }
.login-forgot-btn { background: none; border: none; color: var(--primary); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; padding: 0; }
.login-register-hint { text-align: center; font-size: 13px; color: var(--text-secondary); margin-top: 20px; }
.login-register-link { color: var(--primary); font-weight: 600; background: none; border: none; cursor: pointer; font-family: inherit; font-size: 13px; }
.login-footer { text-align: center; margin-top: 32px; display: flex; gap: 16px; justify-content: center; }
.login-footer-link { font-size: 11px; color: var(--text-tertiary); text-decoration: none; }
.login-footer-link:hover { color: var(--text-secondary); }

/* ── EmpPayslip ────────────────────────────────────────── */
.emp-month-selector { display: flex; align-items: center; gap: 8px; }
.emp-month-center { flex: 1; text-align: center; }
.emp-month-label { font-size: 14px; font-weight: 700; color: var(--text); }
.emp-month-status { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.emp-hero-orb { position: absolute; border-radius: 50%; opacity: 0.08; background: #fff; pointer-events: none; }
.emp-hero-body { flex: 1; }
.emp-hero-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.emp-hero-amount { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.5px; margin-bottom: 4px; }
.emp-hero-sub { font-size: 12px; opacity: 0.7; color: #fff; }
.emp-hero-dl-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; font-family: inherit; transition: background 0.15s; }
.emp-hero-dl-btn:hover { background: rgba(255,255,255,0.22); }
.emp-hero-progress-track { height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden; }
.emp-hero-footer { display: flex; gap: 0; margin-top: 16px; }
.emp-hero-footer-item { flex: 1; text-align: center; padding: 0 8px; border-right: 1px solid rgba(255,255,255,0.15); }
.emp-hero-footer-item:last-child { border-right: none; }
.emp-hero-footer-label { font-size: 10px; opacity: 0.65; color: #fff; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.4px; }
.emp-breakdown-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--border-light); font-size: 13px; }
.emp-breakdown-row:last-child { border-bottom: none; }
.emp-chart-wrap { height: 200px; position: relative; }
.emp-breakdown-list { display: flex; flex-direction: column; gap: 2px; }
.emp-breakdown-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.emp-breakdown-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.emp-history-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-light); }
.emp-history-row:last-child { border-bottom: none; }
.emp-history-right { text-align: right; }

/* ── EmpProfile / Settings ─────────────────────────────── */
.profile-info-flex { display: flex; align-items: center; gap: 12px; }
.profile-inline-edit { display: flex; align-items: center; gap: 6px; flex: 1; }
.profile-inline-input { flex: 1; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; font-family: inherit; outline: none; background: var(--surface); color: var(--text); }
.profile-inline-input:focus { border-color: var(--primary); }
.profile-inline-save { padding: 5px 12px; background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
.profile-inline-cancel { padding: 5px 10px; background: var(--bg); color: var(--text-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 12px; cursor: pointer; font-family: inherit; }
.profile-info-value-row { display: flex; align-items: center; gap: 8px; flex: 1; }
.profile-edit-btn { background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 2px; display: flex; align-items: center; opacity: 0; transition: opacity 0.15s; }
.ep-info-row:hover .profile-edit-btn { opacity: 1; }
.ep-settings-btn { background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 6px; border-radius: var(--radius-sm); display: flex; align-items: center; transition: background 0.15s; }
.ep-settings-btn:hover { background: var(--bg); color: var(--text); }
.profile-update-form { display: flex; flex-direction: column; gap: 14px; padding: 16px 24px; }

/* ── EmpProjects / Timer ───────────────────────────────── */
.ep-pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--danger); animation: pulseDot 1.4s ease infinite; }
.ep-timer-btn { padding: 10px 20px; border-radius: var(--radius-sm); border: none; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.15s; }
.ep-timer-select { flex: 1; padding: 9px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; font-family: inherit; background: var(--surface); color: var(--text); outline: none; }
.ep-timer-input { flex: 1; padding: 9px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; font-family: inherit; background: var(--surface); color: var(--text); outline: none; }
.ep-timer-start { padding: 9px 20px; background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.ep-empty-center { text-align: center; padding: 32px 20px; }
.ep-log-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-light); font-size: 13px; }
.ep-log-row:last-child { border-bottom: none; }
.ep-color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.ep-project-row { display: flex; align-items: flex-start; gap: 14px; padding: 14px 20px; border-bottom: 1px solid var(--border-light); transition: background 0.12s; }
.ep-project-row:last-child { border-bottom: none; }
.ep-project-row:hover { background: var(--bg); }
.ep-project-main { flex: 1; min-width: 0; }
.ep-tags-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.ep-role-tag { padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 600; background: var(--bg); border: 1px solid var(--border); color: var(--text-secondary); }
.ep-project-deadline { font-size: 12px; color: var(--text-tertiary); white-space: nowrap; }
.ep-deadline-row { display: flex; align-items: center; gap: 6px; }
.ep-alloc-block { padding: 12px 16px; border-radius: var(--radius-sm); background: var(--bg); border: 1px solid var(--border); }
.ep-alloc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 600; }

/* ── EmpSettings / generic emp toggles ────────────────── */
.emp-toggle { position: relative; width: 44px; height: 24px; background: var(--border); border-radius: 12px; cursor: pointer; transition: background 0.2s; flex-shrink: 0; border: none; }
.emp-toggle[data-on="true"], .emp-toggle.active { background: var(--primary); }
.emp-toggle-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.emp-toggle[data-on="true"] .emp-toggle-knob, .emp-toggle.active .emp-toggle-knob { transform: translateX(20px); }
.emp-action-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border-light); }
.emp-action-row:last-child { border-bottom: none; }

/* ── EmpSettings bottom sheet ──────────────────────────── */
.emp-bottom-sheet { position: fixed; bottom: 0; left: 0; right: 0; background: var(--surface); border-radius: 20px 20px 0 0; padding: 0 0 32px; box-shadow: var(--shadow-xl); z-index: var(--z-drawer); animation: adminFadeUp 0.25s ease; }
.emp-bottom-sheet-handle { width: 40px; height: 4px; border-radius: 2px; background: var(--border); margin: 12px auto 20px; }

/* ── EmpSettings form fields ───────────────────────────── */
.emp-input-icon-wrap { position: relative; }
.emp-eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-tertiary); padding: 4px; display: flex; align-items: center; }
.emp-pwd-strength { margin-top: 8px; }
.emp-pwd-strength-track { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.emp-pwd-rules { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.emp-about-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border-light); }
.emp-about-row:last-child { border-bottom: none; }
.emp-logout-btn { width: 100%; padding: 13px; background: var(--danger-light); color: var(--danger); border: 1px solid rgba(220,38,38,0.2); border-radius: var(--radius-sm); font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; margin-top: 8px; transition: background 0.15s; }
.emp-logout-btn:hover { background: rgba(220,38,38,0.15); }

/* ── Filter fields ─────────────────────────────────────── */
.filter-field { display: flex; flex-direction: column; gap: 4px; }
.filter-field-sm { min-width: 120px; }

/* ── Stat card grid ────────────────────────────────────── */
.stat-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px; }

/* ── Company logo ──────────────────────────────────────── */
.co-logo { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }

/* ── EmployeeWebAccess root ────────────────────────────── */
.ewa-root { min-height: 100vh; background: var(--bg); }

/* ── Icon purple ───────────────────────────────────────── */
.icon-purple { color: #8B5CF6; }

/* ── Badge OCR ─────────────────────────────────────────── */
.badge-ocr { background: rgba(139,92,246,0.1); color: #7C3AED; border: 1px solid rgba(139,92,246,0.2); padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700; }

/* ── Landing nav ───────────────────────────────────────── */
.lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; transition: background 0.2s, box-shadow 0.2s; }
.lp-nav.scrolled { background: var(--surface); box-shadow: var(--shadow-sm); }
.lp-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.lp-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.lp-logo-img { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; }
`;

const adminCss = fs.readFileSync('src/styles/admin.css', 'utf8');
fs.writeFileSync('src/styles/admin.css', adminCss + css, 'utf8');
console.log('Done');
