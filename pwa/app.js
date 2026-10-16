/* ═══ KiniKerja PWA — router, tab bar, boot ═══ */

const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'absen-wajah', label: 'Absen', icon: 'finger' },
  { id: 'pengajuan', label: 'Pengajuan', icon: 'doc' },
  { id: 'menu', label: 'Menu', icon: 'grid' },
  { id: 'profil', label: 'Profil', icon: 'user' },
];
const TAB_ROUTES = new Set(TABS.map(t => t.id));

function tabbar(active) {
  return `<nav class="tabbar">${TABS.map(t =>
    `<button class="${t.id === active ? 'active' : ''}" onclick="go('${t.id}')" aria-label="${t.label}">${I[t.icon]}<span>${t.label}</span></button>`
  ).join('')}</nav>`;
}

let toastTimer;
function toast(msg) {
  clearTimeout(toastTimer);
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);background:#101f2e;color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:200;max-width:86%;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:opacity .3s';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2200);
}

function go(route) {
  if (route === 'back') { history.back(); return; }
  location.hash = '#/' + route;
}

const app = document.getElementById('app');

/* route yang boleh dibuka tanpa login */
const PUBLIC_ROUTES = new Set(['splash', 'onboarding', 'welcome', 'login', 'daftar', 'verifikasi']);

function render() {
  closeSheet();
  let route = (location.hash || '#/splash').replace('#/', '').split('?')[0] || 'splash';
  const view = Views[route];
  if (!view) route = 'splash';
  if (!PUBLIC_ROUTES.has(route) && !(typeof API !== 'undefined' && API.token)) {
    go('welcome');
    return;
  }
  window.scrollTo(0, 0);
  app.innerHTML = Views[route]() + (TAB_ROUTES.has(route) ? tabbar(route) : '');
  document.title = 'KiniKerja — ' + route.replace(/-/g, ' ');
  if (route === 'splash') setTimeout(() => { const r = (location.hash || '#/splash').replace('#/', '').split('?')[0] || 'splash'; if (r === 'splash') go('onboarding'); }, 1600);
}

window.addEventListener('hashchange', render);

function boot() {
  render();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
document.addEventListener('DOMContentLoaded', boot);
