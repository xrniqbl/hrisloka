/* ═══ KiniKerja PWA — API client, auth actions, format helpers ═══ */
/* Semua fungsi global agar bisa dipanggil dari onclick. */

/* ── API client ── */
var API = {
  get token() { try { return localStorage.getItem('kk_token') || ''; } catch (e) { return ''; } },
  set token(v) { try { if (v) localStorage.setItem('kk_token', v); else localStorage.removeItem('kk_token'); } catch (e) {} },

  async req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const t = this.token;
    if (t) headers['Authorization'] = 'Bearer ' + t;
    let res;
    try {
      res = await fetch(path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
    } catch (e) {
      throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* abaikan body non-JSON */ }
    if (res.status === 401) {
      this.token = '';
      try { localStorage.removeItem('kk_refresh'); } catch (e) {}
      window.KK_EMP = null;
      if (typeof go === 'function') go('welcome');
      throw new Error((data && data.error) || 'Sesi berakhir. Silakan masuk lagi.');
    }
    if (!res.ok) throw new Error((data && data.error) || ('Gagal memuat data (' + res.status + ')'));
    return data;
  },

  login(identifier, password)  { return this.req('POST', '/api/auth/login', { identifier: identifier, password: password }); },
  register(data)               { return this.req('POST', '/api/auth/register', data); },
  me()                         { return this.req('GET', '/api/auth/me'); },
  attendanceToday()            { return this.req('GET', '/api/attendance/today'); },
  attendanceHistory(month)     { return this.req('GET', '/api/attendance/history?month=' + encodeURIComponent(month)); },
  leaveList()                  { return this.req('GET', '/api/leave'); },
  leaveCreate(payload)          { return this.req('POST', '/api/leave', payload); },
  reimburseList()              { return this.req('GET', '/api/reimburse'); },
  reimburseCreate(payload)     { return this.req('POST', '/api/reimburse', payload); },
  payslip(month)               { return this.req('GET', '/api/payslip?month=' + encodeURIComponent(month)); },
  notifications()              { return this.req('GET', '/api/notifications'); },
  clockIn()                    { return this.req('POST', '/api/attendance/clock-in', { selfieVerified: true }) },
  jadwal()                   { return this.req('GET', '/api/jadwal'); },
  kasbonList()               { return this.req('GET', '/api/kasbon'); },
  kasbonCreate(d)            { return this.req('POST', '/api/kasbon', d); },
  lemburList()               { return this.req('GET', '/api/lembur'); },
  lemburCreate(d)            { return this.req('POST', '/api/lembur', d); },
  pelatihanList()            { return this.req('GET', '/api/pelatihan'); },
  kpi()                      { return this.req('GET', '/api/kpi'); },
  timList()                  { return this.req('GET', '/api/tim'); },
  penghargaanList()          { return this.req('GET', '/api/penghargaan'); },
  pengumumanList()           { return this.req('GET', '/api/pengumuman'); },
};

/* ── cache profil karyawan ── */
function ensureMe() {
  if (window.KK_EMP) return Promise.resolve(window.KK_EMP);
  if (!API.token) return Promise.resolve(null);
  return API.me()
    .then(d => { window.KK_EMP = (d && d.employee) ? d.employee : d; return window.KK_EMP; })
    .catch(() => null);
}
function emp() { return window.KK_EMP || {}; }
function empInitials() {
  const n = (emp().name || 'KK').trim().split(/\s+/);
  return ((n[0] || 'K')[0] + (n[1] ? n[1][0] : '')).toUpperCase();
}

/* ── format helpers ── */
var BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
var BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
var HARI_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function fmtTgl(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.getDate() + ' ' + BULAN_ID[d.getMonth()] + ' ' + d.getFullYear();
}
function fmtRp(n) {
  n = Math.round(Number(n) || 0);
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function fmtRpShort(n) {
  n = Math.round(Number(n) || 0);
  if (n >= 1000000) return 'Rp ' + (n / 1000000).toString().replace('.', ',').replace(/,0$/, '') + 'jt';
  if (n >= 1000) return 'Rp ' + Math.round(n / 1000) + 'rb';
  return 'Rp ' + n;
}
function fmtJam(t) {
  if (!t) return '--:--';
  return String(t).slice(0, 5);
}
function salam() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}
function bulanIni() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function labelBulan(ym) {
  const p = String(ym).split('-');
  return BULAN_PANJANG[Number(p[1]) - 1] + ' ' + p[0];
}

/* ── tombol loading ── */
function setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.label = btn.textContent;
    btn.disabled = true;
    btn.style.opacity = '.65';
    btn.textContent = 'Memuat…';
  } else {
    btn.disabled = false;
    btn.style.opacity = '';
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }
}

/* ── auth actions ── */
async function doLogin() {
  const idEl = document.getElementById('loginEmail');
  const pwEl = document.getElementById('loginPw');
  const btnEl = document.getElementById('loginBtn');
  const identifier = idEl ? idEl.value.trim() : '';
  const password = pwEl ? pwEl.value : '';
  if (!identifier || !password) { toast('Isi email/NIK dan kata sandi dulu'); return; }
  setBtnLoading(btnEl, true);
  try {
    const r = await API.login(identifier, password);
    API.token = r.access_token;
    if (r.refresh_token) { try { localStorage.setItem('kk_refresh', r.refresh_token); } catch (e) {} }
    window.KK_EMP = r.employee || null;
    go('home');
  } catch (e) {
    toast(e.message || 'Login gagal. Coba lagi.');
    setBtnLoading(btnEl, false);
  }
}

async function doRegister() {
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const kode = v('regKode'), nama = v('regNama'), email = v('regEmail'), password = v('regPw');
  const btnEl = document.getElementById('regBtn');
  if (!kode || !nama || !email || !password) { toast('Lengkapi semua data pendaftaran'); return; }
  if (password.length < 8) { toast('Kata sandi minimal 8 karakter'); return; }
  setBtnLoading(btnEl, true);
  try {
    await API.register({ kode_perusahaan: kode, nama: nama, email: email, password: password });
    go('verifikasi');
  } catch (e) {
    toast(e.message || 'Pendaftaran gagal. Coba lagi.');
    setBtnLoading(btnEl, false);
  }
}

function doLogout() {
  API.token = '';
  try { localStorage.removeItem('kk_refresh'); } catch (e) {}
  window.KK_EMP = null;
  go('welcome');
}
