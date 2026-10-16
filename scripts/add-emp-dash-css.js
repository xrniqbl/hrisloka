const fs = require('fs');

const css = `
/* ── EmpDashboard hero section ─────────────────────────── */
.emp-hero-blob--tr { top: -40px; right: -40px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); }
.emp-hero-blob--bl { bottom: -40px; left: -40px; width: 160px; height: 160px; background: rgba(255,255,255,0.08); }
.emp-hero-inner { position: relative; z-index: 1; }
.emp-hero-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.emp-hero-clock { font-size: 32px; font-weight: 700; letter-spacing: -1px; color: #fff; }
.emp-hero-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: var(--radius-sm); font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: transform 0.15s, box-shadow 0.15s; }
.emp-hero-btn:hover { transform: translateY(-1px); }
.emp-hero-status { display: flex; align-items: center; gap: 6px; }
.emp-hero-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.emp-hero-status-text { font-size: 12px; font-weight: 600; }

/* ── EmpDashboard stat grid ────────────────────────────── */
.emp-stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.emp-icon-box { width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.emp-icon-box--primary { background: var(--primary-light); color: var(--primary); }
.emp-value-unit { font-size: 11px; color: var(--text-tertiary); font-weight: 500; margin-left: 3px; }
.emp-att-status { font-size: 12px; font-weight: 600; margin-top: 4px; }

/* ── EmpDashboard actions ──────────────────────────────── */
.emp-actions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
.emp-action-btn { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); cursor: pointer; font-family: inherit; transition: box-shadow 0.15s, border-color 0.15s; text-align: center; }
.emp-action-btn:hover { box-shadow: var(--shadow-sm); border-color: var(--border-strong); }
.emp-action-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); line-height: 1.3; }

/* ── EmpDashboard announcement banner ─────────────────── */
.emp-ann-banner { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--primary-light); border: 1px solid rgba(99,91,255,0.15); border-radius: var(--radius-md); cursor: pointer; transition: background 0.15s; }
.emp-ann-banner:hover { background: rgba(99,91,255,0.1); }
.emp-ann-banner-icon { width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.emp-ann-banner-body { flex: 1; min-width: 0; }
.emp-ann-banner-title { font-size: 13px; font-weight: 700; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.emp-ann-banner-chevron { color: var(--primary); flex-shrink: 0; }

/* ── EmpDashboard pending / announcement rows ──────────── */
.emp-pending-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border-light); transition: background 0.12s; cursor: pointer; }
.emp-pending-row:last-child { border-bottom: none; }
.emp-pending-row:hover { background: var(--bg); }
.emp-ann-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-light); transition: background 0.12s; cursor: pointer; }
.emp-ann-row:last-child { border-bottom: none; }
.emp-ann-row:hover { background: var(--bg); }
.emp-ann-row-icon { width: 34px; height: 34px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--bg); }
.emp-ann-row-body { flex: 1; min-width: 0; }
.emp-ann-row-title-row { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }

/* ── EmpDashboard form ─────────────────────────────────── */
.emp-form-date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* ── Badge xs ──────────────────────────────────────────── */
.badge-xs { padding: 1px 6px; font-size: 10px; font-weight: 700; border-radius: var(--radius-full); }

/* ── EmpLogin page wrapper ─────────────────────────────── */
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); position: relative; overflow: hidden; padding: 20px; }

/* ── EmpHero label (used in payslip too) ───────────────── */
.emp-hero-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }

/* ── Remaining misc missing classes ───────────────────── */
.badge-outline { background: transparent; border: 1px solid var(--border-strong); color: var(--text-secondary); padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 600; }
.table-container { overflow-x: auto; width: 100%; }
.info-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
.leave-quota-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
.td-center { text-align: center; }
.form-hint-block { font-size: 11px; color: var(--text-secondary); margin-top: 4px; line-height: 1.4; }
.qr-error { text-align: center; padding: 24px; color: var(--danger); font-size: 13px; }
.dash-header-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.gs-item-icon { width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--bg); color: var(--text-secondary); }
.skeleton-line-40 { height: 14px; width: 40%; border-radius: 6px; background: var(--bg-elevated); animation: skeletonPulse 1.4s ease infinite; }

/* Responsive fixes */
@media (max-width: 768px) {
  .emp-actions-grid { grid-template-columns: repeat(3, 1fr); }
  .emp-stat-grid { grid-template-columns: repeat(2, 1fr); }
  .emp-form-date-row { grid-template-columns: 1fr; }
  .login-card { padding: 28px 20px; }
  .dir-card-grid { grid-template-columns: 1fr; }
  .wizard-emp-grid { grid-template-columns: 1fr; }
}
`;

const adminCss = fs.readFileSync('src/styles/admin.css', 'utf8');
// Avoid duplicating classes already added
const toAdd = css.split('\n').filter(line => {
  if (!line.trim().startsWith('.')) return true;
  const cls = line.match(/^\.([a-zA-Z][\w-]+)/)?.[1];
  if (!cls) return true;
  return !adminCss.includes('.' + cls + ' ') && !adminCss.includes('.' + cls + '{') && !adminCss.includes('.' + cls + ':');
}).join('\n');

fs.writeFileSync('src/styles/admin.css', adminCss + toAdd, 'utf8');
console.log('Done, added rules');
