const fs = require('fs');

// ─── admin.css: fix status-badge dan employee-avatar ─────────────
{
  let c = fs.readFileSync('src/styles/admin.css', 'utf8');
  // status-badge: 10.5px/800 → 12px/600
  c = c.replace('font-size: 10.5px;\n  font-weight: 800;\n  padding: 3px 10px;\n  border-radius: 99px;\n  letter-spacing: 0.3px;',
    'font-size: 12px;\n  font-weight: 600;\n  padding: 3px 10px;\n  border-radius: 99px;\n  letter-spacing: 0.1px;');
  // employee-avatar: 800 → 700
  c = c.replace('  font-size: 12px;\n  font-weight: 800;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n  letter-spacing: -0.5px;\n}',
    '  font-size: 12px;\n  font-weight: 700;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n  letter-spacing: -0.3px;\n}');
  fs.writeFileSync('src/styles/admin.css', c, 'utf8');
  console.log('Fixed: admin.css');
}

// ─── DashboardLayout.css: trailing sans-serif → Plus Jakarta Sans ─
{
  let c = fs.readFileSync('src/layouts/DashboardLayout.css', 'utf8');
  c = c.replace(/font-family: sans-serif/g, "font-family: 'Plus Jakarta Sans', system-ui, sans-serif");
  fs.writeFileSync('src/layouts/DashboardLayout.css', c, 'utf8');
  console.log('Fixed: DashboardLayout.css');
}

// ─── DashboardV2.css ──────────────────────────────────────────────
if (fs.existsSync('src/pages/DashboardV2.css')) {
  let c = fs.readFileSync('src/pages/DashboardV2.css', 'utf8');
  // Remove Google Fonts Inter import
  c = c.replace(/@import url\('https:\/\/fonts\.googleapis\.com[^']*'\);\n?/g, '');
  // Fix dash-font token
  c = c.replace(/--dash-font:\s*'Inter'[^;]+;/, "--dash-font: 'Plus Jakarta Sans', system-ui, sans-serif;");
  // Fix table headers: 10.5px/800/uppercase → 12px/600/no-uppercase
  c = c.replace(/font-size:\s*10\.5px;/g, 'font-size: 12px;');
  c = c.replace(/(\.dash-table th[^{]*\{[^}]*)font-weight:\s*800;/g, '$1font-weight: 600;');
  c = c.replace(/(\.dash-table th[^{]*\{[^}]*)text-transform:\s*uppercase;/g, '$1');
  // Small text: 10px/11px → 11px/12px for readability
  c = c.replace(/font-size:\s*10px;/g, 'font-size: 11px;');
  c = c.replace(/font-size:\s*11px;/g, 'font-size: 12px;');
  fs.writeFileSync('src/pages/DashboardV2.css', c, 'utf8');
  console.log('Fixed: DashboardV2.css');
}

// ─── premium-forms.css ────────────────────────────────────────────
if (fs.existsSync('src/styles/premium-forms.css')) {
  let c = fs.readFileSync('src/styles/premium-forms.css', 'utf8');
  // form-section-title: 11px/800/uppercase → 12px/600
  c = c.replace(/font-size:\s*11px;/g, 'font-size: 12px;');
  c = c.replace(/font-weight:\s*800;/g, 'font-weight: 700;');
  c = c.replace(/(\.form-section-title[^{]*\{[^}]*)text-transform:\s*uppercase;/g, '$1');
  c = c.replace(/(\.form-section-title[^{]*\{[^}]*)letter-spacing:\s*0\.6px;/g, '$1letter-spacing: 0.1px;');
  fs.writeFileSync('src/styles/premium-forms.css', c, 'utf8');
  console.log('Fixed: premium-forms.css');
}

// ─── GlobalSearch.css ─────────────────────────────────────────────
if (fs.existsSync('src/components/GlobalSearch.css')) {
  let c = fs.readFileSync('src/components/GlobalSearch.css', 'utf8');
  c = c.replace(/font-size:\s*10px;/g, 'font-size: 11px;');
  c = c.replace(/font-weight:\s*800;/g, 'font-weight: 600;');
  c = c.replace(/(\.gs-section-title[^{]*\{[^}]*)text-transform:\s*uppercase;/g, '$1');
  c = c.replace(/letter-spacing:\s*1\.2px;/g, 'letter-spacing: 0.2px;');
  fs.writeFileSync('src/components/GlobalSearch.css', c, 'utf8');
  console.log('Fixed: GlobalSearch.css');
}

// ─── EmployeeProfile.css ──────────────────────────────────────────
if (fs.existsSync('src/pages/EmployeeProfile.css')) {
  let c = fs.readFileSync('src/pages/EmployeeProfile.css', 'utf8');
  c = c.replace(/font-weight:\s*800;/g, 'font-weight: 700;');
  c = c.replace(/font-size:\s*10px;/g, 'font-size: 11px;');
  c = c.replace(/font-size:\s*9px;/g, 'font-size: 11px;');
  // ep-role-label-tiny & ep-role-selector-label: remove uppercase
  c = c.replace(/(\.ep-role-label-tiny[^{]*\{[^}]*)text-transform:\s*uppercase;/g, '$1');
  c = c.replace(/(\.ep-role-selector-label[^{]*\{[^}]*)text-transform:\s*uppercase;/g, '$1');
  c = c.replace(/letter-spacing:\s*0\.8px;/g, 'letter-spacing: 0.2px;');
  fs.writeFileSync('src/pages/EmployeeProfile.css', c, 'utf8');
  console.log('Fixed: EmployeeProfile.css');
}

// ─── EmpProfile.css ───────────────────────────────────────────────
if (fs.existsSync('src/pages/employee/EmpProfile.css')) {
  let c = fs.readFileSync('src/pages/employee/EmpProfile.css', 'utf8');
  c = c.replace(/font-size:\s*10px;/g, 'font-size: 11px;');
  c = c.replace(/font-weight:\s*800;/g, 'font-weight: 700;');
  c = c.replace(/(\.profile-info-label[^{]*\{[^}]*)text-transform:\s*uppercase;/g, '$1');
  c = c.replace(/(\.profile-pending-badge[^{]*\{[^}]*)text-transform:\s*uppercase;/g, '$1');
  fs.writeFileSync('src/pages/employee/EmpProfile.css', c, 'utf8');
  console.log('Fixed: EmpProfile.css');
}

// ─── EmpProfileSetup.css ──────────────────────────────────────────
if (fs.existsSync('src/pages/employee/EmpProfileSetup.css')) {
  let c = fs.readFileSync('src/pages/employee/EmpProfileSetup.css', 'utf8');
  c = c.replace(/font-weight:\s*900;/g, 'font-weight: 700;');
  c = c.replace(/font-weight:\s*800;/g, 'font-weight: 700;');
  fs.writeFileSync('src/pages/employee/EmpProfileSetup.css', c, 'utf8');
  console.log('Fixed: EmpProfileSetup.css');
}

// ─── Sidebar.css ──────────────────────────────────────────────────
if (fs.existsSync('src/components/Sidebar.css')) {
  let c = fs.readFileSync('src/components/Sidebar.css', 'utf8');
  // sidebar-brand-text: 800 → 700
  c = c.replace(/\.sidebar-brand-text \{([^}]*)font-weight:\s*800/g, '.sidebar-brand-text {$1font-weight: 700');
  fs.writeFileSync('src/components/Sidebar.css', c, 'utf8');
  console.log('Fixed: Sidebar.css');
}

// ─── NotificationBoard.css ────────────────────────────────────────
if (fs.existsSync('src/components/NotificationBoard.css')) {
  let c = fs.readFileSync('src/components/NotificationBoard.css', 'utf8');
  c = c.replace(/font-size:\s*10px;/g, 'font-size: 11px;');
  c = c.replace(/font-size:\s*10\.5px;/g, 'font-size: 12px;');
  c = c.replace(/font-weight:\s*800;/g, 'font-weight: 700;');
  fs.writeFileSync('src/components/NotificationBoard.css', c, 'utf8');
  console.log('Fixed: NotificationBoard.css');
}

// ─── EmpAbsen.css ─────────────────────────────────────────────────
if (fs.existsSync('src/pages/employee/EmpAbsen.css')) {
  let c = fs.readFileSync('src/pages/employee/EmpAbsen.css', 'utf8');
  c = c.replace(/font-size:\s*9px;/g, 'font-size: 11px;');
  c = c.replace(/font-size:\s*10px;/g, 'font-size: 11px;');
  c = c.replace(/font-weight:\s*800;/g, 'font-weight: 700;');
  // Remove uppercase from badge labels
  const badgeClasses = ['absen-step-label', 'absen-trust-level', 'absen-week-day', 'absen-recap-month'];
  badgeClasses.forEach(cls => {
    const re = new RegExp(`(\\.${cls}[^{]*\\{[^}]*)text-transform:\\s*uppercase;`, 'g');
    c = c.replace(re, '$1');
  });
  fs.writeFileSync('src/pages/employee/EmpAbsen.css', c, 'utf8');
  console.log('Fixed: EmpAbsen.css');
}

console.log('All CSS font fixes done');
