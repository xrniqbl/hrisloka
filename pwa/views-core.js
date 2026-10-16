/* ═══ KiniKerja PWA — core: ikon, helper komponen, view auth & home ═══ */

const I = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM20 14h1M14 20h1M18 18h3v3h-3z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>',
  finger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 11a3 3 0 0 0-3 3c0 2.5-.5 4-1.2 5.2M12 11a3 3 0 0 1 3 3c0 3-.6 5.4-1.7 7M12 11V7a4 4 0 0 1 4-4M8.5 8.5A4 4 0 0 1 12 7M5.6 12.2A7 7 0 0 1 12 4M4 10a9 9 0 0 1 2.5-3.4M7 20c.9-1.6 1.5-3.7 1.5-6M12 14v3.2c0 1.2-.2 2.4-.6 3.4"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M20 7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><circle cx="17" cy="14" r="1.4" fill="currentColor"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16l-6 7v5l-4 2v-7z"/></svg>',
  chevD: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c7 0 10 7 10 7a17 17 0 0 1-2.9 3.9M6.6 6.6A16.6 16.6 0 0 0 2 12s3 7 10 7a9.6 9.6 0 0 0 4.4-1.1"/></svg>',
  building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 21v-4h6v4M8 7h2M8 11h2M14 7h2M14 11h2M8 15h8"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12 12 20a1.5 1.5 0 0 1-2 0L4 14V4h10z"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  mega: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-7-7 18-2.5-7.5z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
  brief: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  medal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="5"/><path d="m9 9.5-2-7h4l2 5 2-5h4l-2 7"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.9c2.4.7 4 2.3 4 5.1"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m9 11.5 2 2 4-4.5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/></svg>',
  timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 2h6"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="3"/><circle cx="12" cy="12" r="2.6"/><path d="M5.5 9.5h.01M18.5 14.5h.01"/></svg>',
  handCoin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12.5 12 5l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/><circle cx="12" cy="15" r="2.4"/></svg>',
  plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5c1-1 1-2.6 0-3.6s-2.6-1-3.6 0L12.4 7.4 4.2 5.6c-.5-.1-1 .1-1.2.6l-.1.3c-.2.5 0 1 .5 1.2L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 4.2 5.6c.2.5.7.7 1.2.5l.3-.1c.5-.2.7-.7.6-1.2z"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0 4 4m-4-4L8 8"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="m10.9 12.1 8.6-8.6M15 5l3 3M18 8l2 2"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>',
  laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M2 20h20"/></svg>',
  sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/></svg>',
  idcard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16.5c.6-1.6 1.7-2.5 3-2.5s2.4.9 3 2.5M14 9.5h5M14 13h5"/></svg>',
  hourglass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 3h12M6 21h12M7 3v4l5 5 5-5V3M7 21v-4l5-5 5 5v4"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21z"/><path d="M9 8h6M9 12h6"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>',
};

/* ── helper komponen ── */
function topbar(title, opts = {}) {
  const back = opts.back === false ? '<span class="spacer"></span>'
    : `<button class="icon-btn" onclick="go('${opts.backTo || 'back'}')" aria-label="Kembali">${I.back}</button>`;
  const right = opts.right || '<span class="spacer"></span>';
  return `<div class="topbar">${back}<h2 class="title">${title}</h2>${right}</div>`;
}
function btn(label, onclick, extra = '') {
  return `<button class="btn" ${onclick ? `onclick="${onclick}"` : ''} ${extra}>${label}</button>`;
}
function field(label, inner, id) {
  return `<div class="field"><label for="${id || ''}">${label}</label>${inner}</div>`;
}
function inp(icon, placeholder, opts = {}) {
  return `<div class="inp ${opts.filled ? 'filled' : ''}">
    ${I[icon] || ''}
    ${opts.prefix ? `<span class="prefix">${opts.prefix}</span>` : ''}
    <input ${opts.id ? `id="${opts.id}"` : ''} type="${opts.type || 'text'}" placeholder="${placeholder}" value="${opts.value || ''}" ${opts.readonly ? 'readonly' : ''}>
    ${opts.chev ? `<span class="chev">${I.chevD}</span>` : ''}
  </div>`;
}
function sheetOpen(html) {
  closeSheet();
  const d = document.createElement('div');
  d.className = 'sheet-backdrop'; d.id = 'sheet';
  d.innerHTML = `<div class="sheet" onclick="event.stopPropagation()"><div class="grab"></div>${html}</div>`;
  d.onclick = closeSheet;
  document.body.appendChild(d);
}
function closeSheet() { const s = document.getElementById('sheet'); if (s) s.remove(); }

/* ilustrasi SVG sederhana bernuansa hijau */
function illuCalendar() {
  return `<svg viewBox="0 0 120 110" width="120" height="110">
    <rect x="14" y="18" width="70" height="66" rx="10" fill="#d9f2e5"/>
    <rect x="14" y="18" width="70" height="20" rx="10" fill="#1fa36b"/>
    <rect x="14" y="28" width="70" height="10" fill="#1fa36b"/>
    <rect x="28" y="10" width="8" height="18" rx="4" fill="#0e6b43"/><rect x="62" y="10" width="8" height="18" rx="4" fill="#0e6b43"/>
    <circle cx="98" cy="66" r="24" fill="#1fa36b"/><circle cx="98" cy="66" r="24" fill="#000" opacity=".06"/>
    <path d="M88 66l7 7 13-14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="24" y="48" width="12" height="12" rx="3" fill="#fff"/><rect x="42" y="48" width="12" height="12" rx="3" fill="#fff" opacity=".7"/>
    <rect x="60" y="48" width="12" height="12" rx="3" fill="#fff" opacity=".7"/><rect x="24" y="64" width="12" height="12" rx="3" fill="#fff" opacity=".7"/>
  </svg>`;
}
function illuHourglass() {
  return `<svg viewBox="0 0 120 110" width="110" height="100">
    <rect x="14" y="14" width="44" height="82" rx="10" fill="#d9f2e5"/>
    <rect x="14" y="14" width="44" height="12" rx="6" fill="#1fa36b"/><rect x="14" y="84" width="44" height="12" rx="6" fill="#1fa36b"/>
    <path d="M24 32h24l-8 14 8 14H24l8-14z" fill="#a9dfc2"/>
    <rect x="66" y="22" width="42" height="66" rx="8" fill="#fff" stroke="#d9f2e5" stroke-width="3"/>
    <circle cx="87" cy="42" r="11" fill="#1fa36b"/><path d="M82 42l3.5 3.5 7-8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="74" y="60" width="26" height="6" rx="3" fill="#d9f2e5"/><rect x="74" y="70" width="18" height="6" rx="3" fill="#d9f2e5"/>
  </svg>`;
}
function illuWallet() {
  return `<svg viewBox="0 0 100 90" width="86" height="78">
    <rect x="10" y="16" width="66" height="56" rx="12" fill="#1fa36b"/>
    <rect x="10" y="16" width="66" height="56" rx="12" fill="#000" opacity=".08"/>
    <rect x="22" y="6" width="42" height="22" rx="6" fill="#d9f2e5"/>
    <rect x="58" y="34" width="32" height="24" rx="8" fill="#0e6b43"/>
    <circle cx="74" cy="46" r="5" fill="#fff"/>
    <path d="M30 40h24M30 52h16" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>
  </svg>`;
}
function illuFace() {
  return `<svg viewBox="0 0 120 120" width="120" height="120">
    <circle cx="60" cy="60" r="52" fill="#e9f8f0"/>
    <circle cx="60" cy="60" r="52" fill="none" stroke="#1fa36b" stroke-width="3" stroke-dasharray="10 8"/>
    <circle cx="60" cy="50" r="13" fill="none" stroke="#1fa36b" stroke-width="4"/>
    <path d="M38 82c4-10 12-15 22-15s18 5 22 15" fill="none" stroke="#1fa36b" stroke-width="4" stroke-linecap="round"/>
    <rect x="34" y="34" width="16" height="16" rx="3" fill="none" stroke="#1fa36b" stroke-width="3"/>
    <rect x="70" y="34" width="16" height="16" rx="3" fill="none" stroke="#1fa36b" stroke-width="3"/>
    <rect x="34" y="70" width="16" height="16" rx="3" fill="none" stroke="#1fa36b" stroke-width="3"/>
    <rect x="70" y="70" width="16" height="16" rx="3" fill="none" stroke="#1fa36b" stroke-width="3"/>
  </svg>`;
}
function illuSuccess() {
  return `<svg viewBox="0 0 140 130" width="130" height="122">
    <circle cx="70" cy="62" r="56" fill="#e9f8f0"/><circle cx="70" cy="62" r="40" fill="#d9f2e5"/>
    <circle cx="70" cy="62" r="26" fill="#1fa36b"/>
    <rect x="58" y="50" width="24" height="24" rx="6" fill="none" stroke="#fff" stroke-width="4"/>
    <path d="M64 62l5 5 9-10" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="18" cy="18" r="5" fill="#e8830c"/><circle cx="122" cy="30" r="5" fill="#2e9bf6"/>
    <circle cx="14" cy="92" r="4" fill="#e5489b"/><circle cx="126" cy="96" r="5" fill="#1fa36b"/>
  </svg>`;
}
function illuEmpty() {
  return `<svg viewBox="0 0 110 100" width="96" height="88">
    <rect x="18" y="14" width="74" height="66" rx="18" fill="#e9f8f0"/>
    <rect x="40" y="34" width="30" height="26" rx="4" fill="none" stroke="#1fa36b" stroke-width="4"/>
    <path d="M46 44h18M46 50h18M46 56h12" stroke="#1fa36b" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`;
}
function logoK(size = 56, light = false) {
  // light=true: tile putih + K hijau (untuk background hijau seperti splash)
  const tile = light ? '#ffffff' : '#1fa36b';
  const k = light ? '#1fa36b' : '#ffffff';
  return `<svg viewBox="0 0 512 512" width="${size}" height="${size}">
    <rect width="512" height="512" rx="112" fill="${tile}"/>
    <g fill="${k}" transform="translate(56,56) scale(1.6667)">
      <rect x="42" y="30" width="54" height="180"/>
      <polygon points="96,84 198,30 198,84 96,138"/>
      <polygon points="96,102 198,156 198,210 96,156"/>
    </g>
  </svg>`;
}

/* ═══ VIEWS: auth & home ═══ */
const Views = {};

Views.splash = () => `
<div class="splash">
  <div style="display:flex;flex-direction:column;align-items:center">
    ${logoK(84, true)}
    <div class="logo">KiniKerja</div>
  </div>
  <div class="ver">Version 6.0.1</div>
</div>`;

Views.onboarding = () => `
<div class="screen white no-tab">
  <div class="body" style="display:flex;flex-direction:column;padding-top:20px">
    <div style="text-align:right"><button class="link-green" onclick="go('welcome')">Lewati</button></div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px 0">
      <svg viewBox="0 0 200 170" width="230" height="196">
        <rect x="30" y="20" width="140" height="130" rx="20" fill="#e9f8f0"/>
        <circle cx="100" cy="80" r="34" fill="#d9f2e5"/>
        <circle cx="100" cy="68" r="12" fill="none" stroke="#1fa36b" stroke-width="4"/>
        <path d="M82 96c3-8 10-12 18-12s15 4 18 12" fill="none" stroke="#1fa36b" stroke-width="4" stroke-linecap="round"/>
        <rect x="60" y="120" width="80" height="14" rx="7" fill="#1fa36b"/>
        <circle cx="150" cy="50" r="16" fill="#1fa36b"/><path d="M143 50l5 5 9-10" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <circle cx="52" cy="46" r="12" fill="#fff" stroke="#d9f2e5" stroke-width="3"/><path d="M52 40v8M48 44h8" stroke="#1fa36b" stroke-width="3" stroke-linecap="round"/>
      </svg>
    </div>
    <div style="display:flex;gap:6px;justify-content:center;margin-bottom:22px">
      <span style="width:26px;height:7px;border-radius:4px;background:#1fa36b"></span>
      <span style="width:7px;height:7px;border-radius:4px;background:#d9e4dc"></span>
      <span style="width:7px;height:7px;border-radius:4px;background:#d9e4dc"></span>
    </div>
    <h1 style="font-size:30px;font-weight:800;text-align:center;margin:0 0 12px;line-height:1.3">Absen wajah, cukup<br>satu tatap</h1>
    <p class="muted center" style="font-size:15px;margin:0 0 34px">Face AI dengan liveness &amp; anti-spoofing.<br>Tetap tersimpan meski offline.</p>
    ${btn('Lanjut', "go('welcome')")}
    <div style="height:8px"></div>
  </div>
</div>`;

Views.welcome = () => `
<div class="screen white no-tab">
  <div class="body" style="display:flex;flex-direction:column;padding-top:44px">
    <div style="flex:1;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 220 170" width="250" height="194">
        <circle cx="110" cy="85" r="78" fill="#e9f8f0"/>
        <circle cx="80" cy="80" r="20" fill="#d9f2e5"/><circle cx="140" cy="80" r="20" fill="#d9f2e5"/>
        <circle cx="80" cy="74" r="7" fill="none" stroke="#1fa36b" stroke-width="3"/>
        <circle cx="140" cy="74" r="7" fill="none" stroke="#1fa36b" stroke-width="3"/>
        <path d="M70 88c2-5 6-8 10-8s8 3 10 8M130 88c2-5 6-8 10-8s8 3 10 8" fill="none" stroke="#1fa36b" stroke-width="3" stroke-linecap="round"/>
        <path d="M100 62l10-8 10 8-10 8z" fill="#1fa36b"/>
        <rect x="88" y="112" width="44" height="12" rx="6" fill="#1fa36b"/>
      </svg>
    </div>
    <h1 style="font-size:30px;font-weight:800;text-align:center;margin:0 0 4px">Selamat datang di<br><span style="color:#1fa36b">KiniKerja</span></h1>
    <p class="muted center" style="font-size:15px;margin:14px 0 34px">Absensi, cuti, lembur, dan slip gaji dalam<br>satu aplikasi.</p>
    ${btn('Masuk', "go('login')")}
    <div style="height:12px"></div>
    ${btn('Daftar akun baru', "go('daftar')", 'class="btn outline"')}
    <div style="height:8px"></div>
  </div>
</div>`;

Views.login = () => `
<div class="screen white no-tab">
  <div class="body" style="padding-top:56px">
    <div class="center" style="margin-bottom:26px">${illuCalendar()}</div>
    <h1 class="center" style="font-size:28px;font-weight:800;margin:0 0 8px">Masuk ke akun</h1>
    <p class="muted center" style="margin:0 0 28px;font-size:15px">Selamat datang kembali di KiniKerja</p>
    ${field('Email / NIK', `<div class="inp">${I.mail}<input id="loginEmail" type="text" placeholder="nama@perusahaan.id"></div>`)}
    ${field('Kata sandi', `<div class="inp">${I.lock}<input type="password" id="loginPw" placeholder="Kata sandi"><span style="color:#a3b1c2;cursor:pointer" onclick="var p=document.getElementById('loginPw');p.type=p.type==='password'?'text':'password'">${I.eyeOff}</span></div>`)}
    <div style="display:flex;justify-content:space-between;align-items:center;margin:2px 0 22px;font-size:14px">
      <label style="display:flex;align-items:center;gap:8px;color:var(--ink-2)"><input type="checkbox" style="width:17px;height:17px;accent-color:#1fa36b"> Ingat saya</label>
      <button class="link-green" onclick="toast('Tautan reset dikirim ke email')">Lupa kata sandi?</button>
    </div>
    ${btn('Masuk', "doLogin()", 'id="loginBtn"')}
    <p class="muted center" style="font-size:13.5px;margin:20px 0 14px">atau masuk dengan</p>
    <div class="btn-row">
      <button class="btn outline" onclick="go('absen-wajah')" style="height:54px;font-size:15.5px"><span style="width:22px;height:22px;display:inline-flex">${I.finger}</span> Face ID</button>
      <button class="btn outline" onclick="go('absen-wajah')" style="height:54px;font-size:15.5px"><span style="width:22px;height:22px;display:inline-flex">${I.finger}</span> Sidik jari</button>
    </div>
    <p class="center" style="margin-top:44px;font-size:14.5px;color:var(--muted)">Belum punya akun? <button class="link-green" style="font-size:14.5px" onclick="go('daftar')">Daftar</button></p>
  </div>
</div>`;

Views.daftar = () => `
<div class="screen white no-tab">
  ${topbar('', { backTo: 'welcome' })}
  <div class="body" style="padding-top:6px;display:flex;flex-direction:column">
    <h1 style="font-size:28px;font-weight:800;margin:6px 0 8px">Buat akun baru</h1>
    <p class="muted" style="margin:0 0 26px;font-size:15px">Gunakan kode perusahaan dari HR untuk bergabung.</p>
    ${field('Kode perusahaan', `<div class="inp filled" style="background:#eefbf4">${I.building}<input id="regKode" type="text" value="KNK-2049" style="color:#1fa36b;font-weight:700"><span style="color:#1fa36b">${I.checkCircle}</span></div>`)}
    ${field('Nama lengkap', inp('user', 'Nama lengkap', { id: 'regNama' }))}
    ${field('Email kantor', inp('mail', 'nama@perusahaan.id', { id: 'regEmail', type: 'email' }))}
    ${field('Kata sandi', `<div class="inp">${I.lock}<input id="regPw" type="password" placeholder="Min. 8 karakter"></div>`)}
    <p class="muted" style="font-size:13.5px;margin:2px 0 26px">Dengan mendaftar, Anda menyetujui Syarat &amp; Kebijakan Privasi.</p>
    <div style="flex:1"></div>
    ${btn('Daftar', "doRegister()", 'id="regBtn"')}
    <p class="center" style="margin:18px 0 6px;font-size:14.5px;color:var(--muted)">Sudah punya akun? <button class="link-green" style="font-size:14.5px" onclick="go('login')">Masuk</button></p>
  </div>
</div>`;

Views.verifikasi = () => `
<div class="screen white no-tab">
  <div class="body" style="padding-top:90px;display:flex;flex-direction:column">
    <div class="center" style="margin-bottom:40px">${illuHourglass()}</div>
    <h1 class="center" style="font-size:27px;font-weight:800;margin:0 0 12px">Akun sedang diverifikasi</h1>
    <p class="muted center" style="margin:0 0 28px;font-size:15px;line-height:1.6">Tim HR sedang meninjau data Anda.<br>Biasanya selesai dalam 1×24 jam kerja.</p>
    <div class="card tight" style="background:#fffaf0;display:flex;gap:10px;align-items:flex-start;margin-bottom:30px">
      <span style="color:#e8830c;width:22px;height:22px;flex-shrink:0;display:inline-flex;margin-top:1px">${I.hourglass}</span>
      <div style="font-size:14px;color:#b25e09"><b>Status:</b> Menunggu persetujuan HR ·<br>Diajukan 10 Okt 2026</div>
    </div>
    ${btn('Cek status', "toast('Status: masih menunggu persetujuan HR')")}
    <div style="height:18px"></div>
    <div class="center"><button class="link-green" style="font-size:15px" onclick="toast('Menghubungkan ke HR…')">Hubungi HR</button></div>
  </div>
</div>`;

/* ── data home: profil + absensi hari ini (async, tidak memblokir render) ── */
function loadHomeData() {
  if (typeof API === 'undefined' || !API.token) return;
  const onHome = () => (location.hash || '').replace('#/', '').split('?')[0] === 'home';
  ensureMe().then(e => {
    if (!onHome()) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.textContent = v; };
    if (e) {
      set('homeName', e.name);
      set('homeRole', [e.position, e.division].filter(Boolean).join(' · ') || e.position || '');
      set('homeAva', empInitials());
    }
  }).catch(() => {});
  API.attendanceToday().then(d => {
    if (!onHome()) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const r = d && d.record;
    if (!r) {
      set('stMasuk', '--:--'); set('stMasukSub', 'Belum absen');
      set('stPulang', '--:--'); set('stTotal', '0j 0m');
      return;
    }
    set('stMasuk', fmtJam(r.clock_in));
    const st = String(r.status || '').toLowerCase();
    const sub = document.getElementById('stMasukSub');
    if (sub) {
      if (st.indexOf('terlambat') !== -1) { sub.textContent = 'Terlambat'; sub.style.color = 'var(--orange)'; }
      else { sub.textContent = 'Tepat waktu'; sub.style.color = ''; }
    }
    set('stPulang', fmtJam(r.clock_out));
    if (r.clock_in) {
      const t0 = new Date(d.today + 'T' + r.clock_in);
      const t1 = r.clock_out ? new Date(d.today + 'T' + r.clock_out) : new Date();
      const mins = Math.max(0, Math.round((t1 - t0) / 60000));
      set('stTotal', Math.floor(mins / 60) + 'j ' + (mins % 60) + 'm');
    }
  }).catch(() => { /* biarkan data statis saat offline */ });
}

Views.home = () => {
  loadHomeData();
  return `
<div class="screen">
  <div class="body" style="padding-top:14px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div class="avatar" id="homeAva">RP</div>
      <div style="flex:1">
        <div id="homeName" style="font-weight:700;font-size:16.5px">Rina Putri</div>
        <div id="homeRole" class="muted" style="font-size:13px">Senior Designer · Product</div>
      </div>
      <button class="icon-btn" onclick="toast('Pindai QR kehadiran')" aria-label="QR">${I.qr}</button>
      <button class="icon-btn" onclick="go('notifikasi')" aria-label="Notifikasi" style="position:relative">${I.bell}<span style="position:absolute;top:9px;right:10px;width:9px;height:9px;border-radius:50%;background:#e5484d;border:2px solid #fff"></span></button>
    </div>

    <div class="card" style="background:linear-gradient(135deg,#25b977,#128a56);color:#fff;border:0;display:flex;gap:8px;align-items:center;margin-bottom:14px;position:relative;overflow:hidden">
      <div style="flex:1">
        <div style="font-size:14px;opacity:.9;margin-bottom:6px">${salam()}</div>
        <div style="font-size:21px;font-weight:800;line-height:1.3;margin-bottom:14px">Jangan lupa absen<br>hari ini!</div>
        <button onclick="go('absen-wajah')" style="background:#fff;color:#128a56;border:0;border-radius:12px;padding:11px 26px;font-weight:700;font-size:15px;font-family:inherit;cursor:pointer">Clock In</button>
      </div>
      <div style="width:104px;flex-shrink:0;opacity:.95">${illuCalendar()}</div>
    </div>

    <div class="card" style="display:flex;margin-bottom:6px;padding:16px 8px">
      <div style="flex:1;text-align:center">
        <div class="muted" style="font-size:13px">Masuk</div>
        <div id="stMasuk" style="font-size:21px;font-weight:800;margin:3px 0">07:58</div>
        <div id="stMasukSub" style="font-size:12px;color:#1fa36b;font-weight:600">Tepat waktu</div>
      </div>
      <div style="flex:1;text-align:center;border-left:1px solid var(--line);border-right:1px solid var(--line)">
        <div class="muted" style="font-size:13px">Pulang</div>
        <div id="stPulang" style="font-size:21px;font-weight:800;margin:3px 0;color:#c3ccd6">--:--</div>
        <div class="muted" style="font-size:12px">Shift 08–17</div>
      </div>
      <div style="flex:1;text-align:center">
        <div class="muted" style="font-size:13px">Total</div>
        <div id="stTotal" style="font-size:21px;font-weight:800;margin:3px 0">4j 12m</div>
        <div class="muted" style="font-size:12px">Hari ini</div>
      </div>
    </div>

    <div class="sect-head"><h3>Menu Utama</h3><button onclick="go('menu')">Lihat semua</button></div>
    <div style="display:flex;justify-content:space-between;padding:0 4px">
      <button class="menu-item" onclick="go('cuti')"><span class="tile">${I.cal}</span><span>Cuti</span></button>
      <button class="menu-item" onclick="go('lembur')"><span class="tile">${I.timer}</span><span>Lembur</span></button>
      <button class="menu-item" onclick="go('slip-gaji')"><span class="tile">${I.receipt}</span><span>Slip Gaji</span></button>
      <button class="menu-item" onclick="go('reimburse')"><span class="tile">${I.wallet}</span><span>Reimburse</span></button>
    </div>

    <div class="sect-head"><h3>Tugas Hari Ini</h3><button onclick="go('tugas')">3 tugas</button></div>
    <div class="row-card">
      <span class="tile" style="width:48px;height:48px;border-radius:14px">${I.brief}</span>
      <div class="grow"><h4>Desain halaman payroll</h4><div class="sub">Deadline 15:00</div></div>
      <span class="pill orange">Proses</span>
    </div>
    <div class="row-card">
      <span class="tile" style="width:48px;height:48px;border-radius:14px">${I.users}</span>
      <div class="grow"><h4>Meeting sprint review</h4><div class="sub">13:00 · Ruang Rapat 2</div></div>
      <span class="pill green">Baru</span>
    </div>
  </div>
</div>`;
};
