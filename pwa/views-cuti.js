/* ═══ KiniKerja PWA — views: alur CUTI (ringkasan, form, sheet kategori/durasi/delegasi/konfirmasi) ═══ */
/* Memakai helper dari views-core.js: I, topbar, btn, field, inp, sheetOpen, closeSheet, illuCalendar. */
/* Route: 'cuti', 'cuti-ajukan'. Navigasi via go(). Semua fungsi global agar bisa dipanggil dari onclick. */

var CutiState = { kategori: '', durasi: '', delegasi: '', ket: '', startISO: '', endISO: '', days: 0 };
var cutiPick = '';

var CUTI_KATEGORI = [
  'Cuti Sakit', 'Cuti Tahunan', 'Cuti Melahirkan / Ayah', 'Cuti Duka',
  'Cuti Pribadi', 'Cuti Menikah', 'Cuti Ibadah', 'Izin'
];
var CUTI_DELEGASI = [
  ['Sari', 'UX Writer'], ['Raka', 'UI Designer'], ['Andi', 'UX Designer'],
  ['Lia', 'Product Manager'], ['Dimas', 'UI Designer'], ['Nina', 'QA Engineer']
];
var CUTI_CHECK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
var CUTI_NO = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M6.5 6.5l11 11"/></svg>';

function cutiLengkap() {
  return CutiState.kategori && CutiState.durasi && CutiState.delegasi && (CutiState.ket || '').trim();
}

/* ── 12a ringkasan cuti (async dari API, fallback statis) ── */
var CutiRows = [];
var CutiFilter = 'semua';

function cutiStatusMap(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved' || s === 'disetujui') return ['green', 'Disetujui'];
  if (s === 'rejected' || s === 'ditolak') return ['red', 'Ditolak'];
  return ['orange', 'Menunggu'];
}
function cutiRowCard(r) {
  const m = cutiStatusMap(r.status);
  const tgl = fmtTgl(r.start_date) + ' – ' + fmtTgl(r.end_date);
  let statusLine;
  const s = String(r.status || '').toLowerCase();
  if (s === 'approved' || s === 'disetujui') {
    statusLine = `<span style="color:var(--green);font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:7px">${CUTI_CHECK.replace('width="13" height="13"', 'width="16" height="16"')}Disetujui${r.decided_at ? ' ' + fmtTgl(r.decided_at) : ''}</span>`;
  } else if (s === 'rejected' || s === 'ditolak') {
    statusLine = `<span style="color:var(--red);font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:7px">${CUTI_NO}Ditolak${r.decided_at ? ' ' + fmtTgl(r.decided_at) : ''}</span>`;
  } else {
    statusLine = `<span style="color:var(--orange);font-weight:700;font-size:14px">Menunggu persetujuan atasan</span>`;
  }
  return `<div class="card" style="margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span style="color:var(--green);width:22px;height:22px;display:inline-flex">${I.cal}</span>
      <b style="font-size:16.5px">${fmtTgl(r.created_at)}</b>
      <span style="margin-left:auto"><span class="pill ${m[0]}">${m[1]}</span></span>
    </div>
    <div style="background:#f7f9fb;border-radius:14px;padding:14px 16px;margin-bottom:14px">
      <div class="muted" style="display:flex;justify-content:space-between;font-size:13px"><span>Tanggal cuti</span><span>Total</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:15.5px;font-weight:700"><span>${tgl}</span><span>${r.days || 0} hari</span></div>
      <div class="muted" style="font-size:13px;margin-top:6px">${r.type || ''}</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">${statusLine}</div>
    ${r.reason ? `<div style="color:var(--ink-2);font-size:14px;line-height:1.5"><b>Alasan:</b> ${r.reason}</div>` : ''}
  </div>`;
}
function cutiPill(status, label, count) {
  const active = CutiFilter === status;
  return `<button onclick="cutiFilter('${status}',this)" style="flex:1;border:0;border-radius:999px;padding:11px 0;font-family:inherit;font-size:14.5px;font-weight:${active ? '700' : '600'};cursor:pointer;background:${active ? 'var(--green)' : 'none'};color:${active ? '#fff' : 'var(--muted)'}">${label}${count != null ? ' ' + count : ''}</button>`;
}
function cutiFilter(status, el) {
  CutiFilter = status;
  render();
}
function renderCutiRows() {
  const box = document.getElementById('cutiRows');
  if (!box || !CutiRows.length) return;
  const rows = CutiFilter === 'semua' ? CutiRows
    : CutiRows.filter(r => {
      const s = String(r.status || '').toLowerCase();
      return CutiFilter === 'pending' ? !(s === 'approved' || s === 'disetujui' || s === 'rejected' || s === 'ditolak')
        : CutiFilter === 'approved' ? (s === 'approved' || s === 'disetujui')
        : (s === 'rejected' || s === 'ditolak');
    });
  box.innerHTML = rows.length
    ? rows.map(cutiRowCard).join('')
    : '<p class="muted center" style="margin:18px 0">Tidak ada pengajuan pada filter ini.</p>';
  const pills = document.getElementById('cutiPills');
  if (pills) {
    const cnt = st => CutiRows.filter(r => {
      const s = String(r.status || '').toLowerCase();
      return st === 'pending' ? !(s === 'approved' || s === 'disetujui' || s === 'rejected' || s === 'ditolak')
        : st === 'approved' ? (s === 'approved' || s === 'disetujui')
        : (s === 'rejected' || s === 'ditolak');
    }).length;
    pills.innerHTML = cutiPill('semua', 'Semua') + cutiPill('pending', 'Review', cnt('pending'))
      + cutiPill('approved', 'Disetujui', cnt('approved')) + cutiPill('rejected', 'Ditolak', cnt('rejected'));
  }
}
function loadCuti() {
  if (typeof API === 'undefined' || !API.token) return;
  API.leaveList().then(d => {
    if ((location.hash || '').replace('#/', '').split('?')[0] !== 'cuti') return;
    const q = (d && d.quota) || {};
    const total = Number(q.total) || 0, used = Number(q.used) || 0;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('cutiTersedia', Math.max(0, total - used) + ' hari');
    set('cutiTerpakai', used + ' hari');
    if (Array.isArray(d.rows)) { CutiRows = d.rows; renderCutiRows(); }
  }).catch(() => { /* biarkan data statis saat offline */ });
}

Views.cuti = () => {
  loadCuti();
  return `
<div class="screen">
  <div class="ghead round">
    <h1>Cuti</h1>
    <p>Ajukan dan pantau cuti Anda.</p>
    <div style="position:absolute;right:20px;top:14px;transform:scale(.62);transform-origin:top right">${illuCalendar()}</div>
  </div>
  <div class="body" style="display:flex;flex-direction:column">
    <div class="card" style="margin-top:-26px;position:relative;z-index:1">
      <div style="font-size:17px;font-weight:800">Total Cuti</div>
      <div class="muted" style="font-size:13.5px;margin-top:3px">Periode 1 Jan 2026 – 31 Des 2026</div>
      <div class="stat-grid" style="grid-template-columns:1fr 1fr;margin-top:14px">
        <div class="stat-box">
          <div class="l" style="color:var(--ink-2);font-weight:600"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:6px"></span>Tersedia</div>
          <div class="n" id="cutiTersedia">9 hari</div>
        </div>
        <div class="stat-box">
          <div class="l" style="color:var(--ink-2);font-weight:600"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:6px"></span>Terpakai</div>
          <div class="n" id="cutiTerpakai">3 hari</div>
        </div>
      </div>
    </div>

    <div id="cutiPills" style="display:flex;background:#fff;border-radius:999px;padding:5px;box-shadow:var(--shadow);margin:16px 0">
      ${cutiPill('semua', 'Semua')}${cutiPill('pending', 'Review')}${cutiPill('approved', 'Disetujui')}${cutiPill('rejected', 'Ditolak 1')}
    </div>

    <div id="cutiRows">
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span style="color:var(--green);width:22px;height:22px;display:inline-flex">${I.cal}</span>
        <b style="font-size:16.5px">21 September 2026</b>
      </div>
      <div style="background:#f7f9fb;border-radius:14px;padding:14px 16px;margin-bottom:14px">
        <div class="muted" style="display:flex;justify-content:space-between;font-size:13px"><span>Tanggal cuti</span><span>Total</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:15.5px;font-weight:700"><span>10 – 17 Nov 2026</span><span>6 hari</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="color:var(--red);font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:7px">${CUTI_NO}Ditolak 22 Sep 2026</span>
        <span style="display:inline-flex;align-items:center;gap:8px"><span class="muted" style="font-size:13px">Oleh</span><span style="width:32px;height:32px;border-radius:50%;background:var(--green-50);color:var(--green);font-weight:700;font-size:13px;display:inline-flex;align-items:center;justify-content:center">B</span><b style="font-size:14.5px">Budi</b></span>
      </div>
      <div style="color:var(--red);font-size:14px;line-height:1.5"><b>Alasan:</b> bentrok dengan rilis produk</div>
    </div>
    </div>

    <div style="flex:1"></div>
    <button class="btn" onclick="go('cuti-ajukan')">Ajukan Cuti</button>
  </div>
</div>`;
};

/* ── 12b form pengajuan cuti ── */
function cutiField(icon, label, value, placeholder, kind) {
  return `<div class="field"><label>${label}</label>
    <div class="inp${value ? ' filled' : ''}" onclick="cutiSheet('${kind}')" style="cursor:pointer">
      ${I[icon]}
      <input type="text" placeholder="${placeholder}" value="${value || ''}" readonly style="cursor:pointer">
      <span class="chev">${I.chevD}</span>
    </div></div>`;
}

Views['cuti-ajukan'] = () => {
  const ok = !!cutiLengkap();
  return `
<div class="screen white no-tab">
  ${topbar('Ajukan Cuti')}
  <div class="body" style="padding-top:10px;display:flex;flex-direction:column">
    <div class="card" style="margin-bottom:18px">
      <div style="font-size:17px;font-weight:800">Informasi Cuti</div>
      <div class="muted" style="font-size:13.5px;margin-top:3px">Lengkapi detail pengajuan cuti</div>
    </div>
    ${cutiField('tag', 'Kategori cuti', CutiState.kategori, 'Pilih kategori', 'kategori')}
    ${cutiField('cal', 'Durasi cuti', CutiState.durasi, 'Pilih tanggal', 'durasi')}
    ${cutiField('users', 'Delegasi tugas', CutiState.delegasi, 'Pilih rekan kerja', 'delegasi')}
    ${field('Kontak darurat selama cuti', inp('phone', '812 3456 7890', { prefix: '+62' }))}
    <div class="field"><label>Keterangan</label>
      <div class="inp" style="height:auto;padding:14px 16px;align-items:flex-start">
        <textarea id="cutiKet" placeholder="Tulis keterangan cuti" oninput="CutiState.ket=this.value;cutiRefreshBtn()" style="width:100%;height:104px;resize:none;border:0;outline:0;background:transparent;font-family:inherit;font-size:15.5px;color:var(--ink)">${CutiState.ket}</textarea>
      </div>
    </div>
    <div style="flex:1"></div>
    <button class="btn" id="cutiKirim" onclick="cutiKonfirmasi()"${ok ? '' : ' disabled'}>Kirim Pengajuan</button>
  </div>
</div>`;
};

function cutiRefreshBtn() {
  const b = document.getElementById('cutiKirim');
  if (b) b.disabled = !cutiLengkap();
}

/* ── sheet: kategori / durasi / delegasi ── */
function cutiSheet(kind) {
  if (kind === 'kategori') { cutiPick = CutiState.kategori || ''; sheetOpen(cutiSheetKategori()); }
  else if (kind === 'durasi') { sheetOpen(cutiSheetDurasi()); }
  else if (kind === 'delegasi') { cutiPick = (CutiState.delegasi || '').split(' – ')[0]; sheetOpen(cutiSheetDelegasi()); }
}

function cutiOptRow(val, labelHtml, ava) {
  const sel = cutiPick === val;
  return `<button class="opt-row${sel ? ' selected' : ''}" onclick="cutiPickOpt(this,'${val}')">`
    + (ava ? `<span class="ava">${ava}</span>` : '')
    + `<span>${labelHtml}</span><span class="radio">${sel ? CUTI_CHECK : ''}</span></button>`;
}

function cutiPickOpt(el, val) {
  cutiPick = val;
  const box = document.getElementById('cutiOpts');
  box.querySelectorAll('.opt-row').forEach(r => { r.classList.remove('selected'); r.querySelector('.radio').innerHTML = ''; });
  el.classList.add('selected');
  el.querySelector('.radio').innerHTML = CUTI_CHECK;
}

function cutiSheetKategori() {
  return `<h3>Kategori Cuti</h3><div class="sheet-sub">Pilih kategori cuti</div>
  <div id="cutiOpts">${CUTI_KATEGORI.map(k => cutiOptRow(k, k)).join('')}</div>
  <div style="height:6px"></div>
  <div class="btn-row">
    <button class="btn outline" onclick="closeSheet()">Batal</button>
    <button class="btn" onclick="cutiPilihKategori()">Pilih</button>
  </div>
  <div style="height:8px"></div>`;
}
function cutiPilihKategori() {
  if (cutiPick) CutiState.kategori = cutiPick;
  closeSheet(); render();
}

function cutiSheetDelegasi() {
  return `<h3>Delegasi Tugas</h3><div class="sheet-sub">Pilih rekan yang menggantikan selama cuti</div>
  <div id="cutiOpts">${CUTI_DELEGASI.map(d => cutiOptRow(d[0], `${d[0]} <span class="muted" style="font-weight:400">– ${d[1]}</span>`, d[0][0])).join('')}</div>
  <div style="height:6px"></div>
  <div class="btn-row">
    <button class="btn outline" onclick="closeSheet()">Batal</button>
    <button class="btn" onclick="cutiPilihDelegasi()">Pilih</button>
  </div>
  <div style="height:8px"></div>`;
}
function cutiPilihDelegasi() {
  if (cutiPick) {
    const f = CUTI_DELEGASI.find(d => d[0] === cutiPick);
    CutiState.delegasi = f ? (f[0] + ' – ' + f[1]) : cutiPick;
  }
  closeSheet(); render();
}

function cutiSheetDurasi() {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  let cells = '';
  for (let d = 1; d <= 30; d++) {
    let st = 'width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:15px;border-radius:50%;margin:0 auto;';
    if (d === 11 || d === 13) st += 'background:var(--green);color:#fff;font-weight:700;';
    else if (d === 12) st += 'background:#d9f2e5;color:var(--green-dark);font-weight:700;';
    else st += 'color:var(--ink);';
    cells += `<div><div style="${st}">${d}</div></div>`;
  }
  for (let d = 1; d <= 5; d++) {
    cells += `<div><div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:15px;color:#c3ccd6;margin:0 auto">${d}</div></div>`;
  }
  return `<h3>Durasi Cuti</h3><div class="sheet-sub">Pilih tanggal mulai dan selesai</div>
  <div class="month-nav" style="margin-bottom:14px"><button onclick="toast('Bulan sebelumnya')">‹</button><b>November 2026</b><button onclick="toast('Bulan berikutnya')">›</button></div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin-bottom:8px">${days.map(d => `<div class="muted" style="font-size:13px;font-weight:600">${d}</div>`).join('')}</div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;row-gap:8px;margin-bottom:16px">${cells}</div>
  <div style="background:#f2fbf6;border-radius:12px;text-align:center;padding:14px;color:var(--green);font-weight:700;font-size:15px;margin-bottom:16px">11 – 13 Nov 2026 · 3 hari kerja</div>
  ${btn('Pilih Tanggal', 'cutiPilihDurasi()')}
  <div style="height:12px"></div>
  <button class="btn outline" onclick="closeSheet()">Batal</button>
  <div style="height:8px"></div>`;
}
function cutiPilihDurasi() {
  CutiState.durasi = '11 Nov – 13 Nov 2026 · 3 hari';
  CutiState.startISO = '2026-11-11';
  CutiState.endISO = '2026-11-13';
  CutiState.days = 3;
  closeSheet(); render();
}

/* ── 12g sheet konfirmasi ── */
function cutiKonfirmasi() {
  const isIzin = CutiState.kategori === 'Izin';
  const judul = isIzin ? 'Kirim pengajuan izin?' : 'Kirim pengajuan cuti?';
  const desk = isIzin
    ? 'Pastikan detail izin sudah benar. Lanjutkan pengiriman?'
    : 'Pastikan detail cuti sudah benar. Lanjutkan pengiriman?';
  sheetOpen(`<div style="width:66px;height:66px;border-radius:22px;background:linear-gradient(135deg,#23b574,#159a5f);display:flex;align-items:center;justify-content:center;color:#fff;margin:-48px auto 20px;box-shadow:0 12px 26px rgba(31,163,107,.4);position:relative">
      <span style="width:30px;height:30px;display:inline-flex">${I.plane}</span></div>
    <h3 class="center">${judul}</h3>
    <p class="muted center" style="font-size:14.5px;line-height:1.6;margin:8px 0 24px">${desk}</p>
    <button class="btn" onclick="cutiKirim()">Ya, Kirim</button>
    <div style="height:12px"></div>
    <button class="btn outline" onclick="closeSheet()">Tidak, cek lagi</button>
    <div style="height:8px"></div>`);
}
async function cutiKirim() {
  closeSheet();
  const reason = [CutiState.ket, CutiState.delegasi ? 'Delegasi: ' + CutiState.delegasi : '']
    .filter(Boolean).join(' | ');
  const payload = {
    type: CutiState.kategori,
    start_date: CutiState.startISO,
    end_date: CutiState.endISO,
    days: CutiState.days || 1,
    reason: reason,
  };
  if (!payload.type || !payload.start_date) { toast('Lengkapi data cuti dulu'); return; }
  try {
    await API.leaveCreate(payload);
    const isIzin = payload.type === 'Izin';
    CutiState = { kategori: '', durasi: '', delegasi: '', ket: '', startISO: '', endISO: '', days: 0 };
    CutiFilter = 'semua';
    toast(isIzin ? 'Pengajuan izin terkirim' : 'Pengajuan cuti terkirim');
    go('cuti');
  } catch (e) {
    toast(e.message || 'Gagal mengirim pengajuan');
  }
}
