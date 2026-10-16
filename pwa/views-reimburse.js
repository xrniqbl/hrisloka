/* ═══ KiniKerja PWA — views: slip gaji, reimburse, profil ═══ */

/* state reimburse (global agar bisa dipakai onclick) */
var RbsState = { kategori: '', pick: '' };

/* ── helper lokal ── */
function rbsTabs(active) {
  const tabs = [
    { id: 'reimburse', label: 'Review', tid: 'rbsTabReview' },
    { id: 'reimburse-disetujui', label: 'Disetujui', tid: '' },
    { id: 'reimburse-ditolak', label: 'Ditolak', tid: '' },
  ];
  return `<div style="display:flex;gap:6px;margin:16px 0 14px">` + tabs.map(t =>
    `<button onclick="go('${t.id}')" ${t.tid ? `id="${t.tid}"` : ''} style="flex:1;border:0;cursor:pointer;font-family:inherit;font-size:14.5px;font-weight:${t.id === active ? '700' : '600'};padding:11px 0;border-radius:999px;background:${t.id === active ? '#1fa36b' : 'transparent'};color:${t.id === active ? '#fff' : '#9aa8bb'}">${t.label}</button>`
  ).join('') + `</div>`;
}

function rbsItem(date, kategori, total, pillHtml) {
  return `<div class="card" style="margin-bottom:12px;padding:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span style="width:20px;height:20px;color:#1fa36b;display:inline-flex">${I.receipt}</span>
      <span style="font-weight:700;font-size:15.5px">${date}</span>
      ${pillHtml ? `<span style="margin-left:auto">${pillHtml}</span>` : ''}
    </div>
    ${kategori !== undefined ? `<div style="background:#f7f9fb;border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
      <div><div class="muted" style="font-size:12.5px;margin-bottom:3px">Kategori</div><div style="font-weight:600;font-size:15px">${kategori}</div></div>
      <div style="text-align:right"><div class="muted" style="font-size:12.5px;margin-bottom:3px">Total</div><div style="font-weight:800;font-size:15.5px">${total}</div></div>
    </div>` : ''}
  </div>`;
}

function rbsHead(stats) {
  return `<div class="ghead" style="padding-bottom:64px">
      <h1>Reimburse</h1>
      <p>Ajukan klaim biaya Anda di sini.</p>
      <div class="art">${illuWallet()}</div>
    </div>
    <div style="margin:-48px 20px 0;position:relative;z-index:1">
      <div class="card">
        <div style="font-weight:800;font-size:16.5px">Total Reimburse</div>
        <div class="muted" style="font-size:13px;margin:3px 0 14px">Periode 1 Jan 2026 – 31 Des 2026</div>
        <div class="stat-grid">
          <div class="stat-box" style="background:#f4f7fa"><div class="n" id="rbsTotal" style="font-size:19px">${stats[0]}</div><div class="l"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${stats[3] || '#7a8aa0'};margin-right:5px"></span>Total</div></div>
          <div class="stat-box" style="background:#f4f7fa"><div class="n" id="rbsReview" style="font-size:19px">${stats[1]}</div><div class="l"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${stats[4] || '#e8830c'};margin-right:5px"></span>Review</div></div>
          <div class="stat-box" style="background:#f4f7fa"><div class="n" id="rbsApproved" style="font-size:19px">${stats[2]}</div><div class="l"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${stats[5] || '#1fa36b'};margin-right:5px"></span>Disetujui</div></div>
        </div>
      </div>
    </div>`;
}

/* ── data reimburse dari API (async, fallback statis) ── */
function rbsStatusGroup(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved' || s === 'disetujui') return 'approved';
  if (s === 'rejected' || s === 'ditolak') return 'rejected';
  return 'pending';
}
function loadReimburse(filter) {
  if (typeof API === 'undefined' || !API.token) return;
  API.reimburseList().then(d => {
    const route = (location.hash || '').replace('#/', '').split('?')[0];
    if (['reimburse', 'reimburse-disetujui', 'reimburse-ditolak'].indexOf(route) === -1) return;
    const rows = Array.isArray(d.rows) ? d.rows : [];
    const s = (d && d.summary) || {};
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const sum = arr => arr.reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const g = { pending: [], approved: [], rejected: [] };
    rows.forEach(r => g[rbsStatusGroup(r.status)].push(r));
    set('rbsTotal', fmtRpShort(s.total != null ? s.total : sum(rows)));
    set('rbsReview', fmtRpShort(s.review != null ? s.review : sum(g.pending)));
    set('rbsApproved', fmtRpShort(s.approved != null ? s.approved : sum(g.approved)));
    set('rbsTabReview', 'Review ' + g.pending.length);
    const box = document.getElementById('rbsRows');
    if (box && rows.length) {
      const list = g[filter] || [];
      box.innerHTML = list.length
        ? list.map(r => {
            const pill = filter === 'approved' ? '<span class="pill green">Disetujui</span>'
              : filter === 'rejected' ? '<span class="pill red">Ditolak</span>' : '';
            return rbsItem(fmtTgl(r.date || r.created_at), r.category, fmtRp(r.amount), pill)
              + (filter === 'rejected' && r.notes
                ? `<div style="font-size:13px;color:var(--red);margin:-6px 0 12px;padding:0 4px">Alasan: ${r.notes}</div>` : '');
          }).join('')
        : '<p class="muted center" style="margin:18px 0">Belum ada klaim pada tab ini.</p>';
    }
  }).catch(() => { /* biarkan data statis saat offline */ });
}

/* ═══ 16 · Slip Gaji (async dari API, fallback statis) ═══ */
var SlipYM = null;

function slipYM() { return SlipYM || bulanIni(); }
function slipBulan(ym) {
  SlipYM = ym;
  document.querySelectorAll('[data-slipm]').forEach(b => {
    const on = b.dataset.slipm === ym;
    b.style.background = on ? '#1fa36b' : '#f1f4f7';
    b.style.color = on ? '#fff' : '#9aa8bb';
  });
  loadSlip();
}
function slipRowHTML(l, v, color) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0">
    <span style="font-size:15px;color:var(--ink-2)">${l}</span>
    <span style="font-size:15px;font-weight:700;color:${color || 'var(--ink)'}">${v}</span></div>`;
}
function loadSlip() {
  if (typeof API === 'undefined' || !API.token) return;
  const ym = slipYM();
  API.payslip(ym).then(d => {
    if ((location.hash || '').replace('#/', '').split('?')[0] !== 'slip-gaji') return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('slipLabel', 'Gaji bersih · ' + (d.label || labelBulan(d.month || ym)));
    set('slipBersih', fmtRp(d.total));
    const pend = document.getElementById('slipPendapatan');
    if (pend && Array.isArray(d.pendapatan)) pend.innerHTML = d.pendapatan.map(r => slipRowHTML(r.label, fmtRp(r.amount))).join('');
    const pot = document.getElementById('slipPotongan');
    if (pot && Array.isArray(d.potongan)) pot.innerHTML = d.potongan.map(r => slipRowHTML(r.label, '– ' + fmtRp(r.amount), 'var(--red)')).join('');
    set('slipTotal', fmtRp(d.total));
  }).catch(() => { /* biarkan data statis saat offline */ });
}

Views['slip-gaji'] = () => {
  loadSlip();
  const pills = [];
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    pills.push({ ym: ym, label: BULAN_ID[dt.getMonth()] });
  }
  const cur = slipYM();
  return `
<div class="screen white no-tab">
  ${topbar('Slip Gaji', { right: `<button class="icon-btn" onclick="toast('Slip gaji diunduh')" aria-label="Unduh">${I.download}</button>` })}
  <div class="body" style="padding-top:10px">
    <div class="card" style="background:linear-gradient(135deg,#25b977,#128a56);border:0;color:#fff;padding:20px;margin-bottom:16px">
      <div id="slipLabel" style="font-size:14px;opacity:.92">Gaji bersih · September 2026</div>
      <div id="slipBersih" style="font-size:36px;font-weight:800;letter-spacing:-.5px;margin:6px 0 10px">Rp 12.480.000</div>
      <div style="margin-bottom:10px"><span style="display:inline-flex;align-items:center;background:rgba(255,255,255,.22);border-radius:999px;padding:6px 14px;font-size:13px;font-weight:700">▲ 4,2% dari Agustus</span></div>
      <div style="font-size:13.5px;opacity:.92">Ditransfer 28 Sep · BCA •••• 4421</div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:18px;overflow-x:auto;padding-bottom:2px">
      ${pills.map(p => `<button data-slipm="${p.ym}" onclick="slipBulan('${p.ym}')" style="flex:1;border:0;cursor:pointer;font-family:inherit;font-size:15px;font-weight:700;padding:13px 0;border-radius:999px;background:${p.ym === cur ? '#1fa36b' : '#f1f4f7'};color:${p.ym === cur ? '#fff' : '#9aa8bb'}">${p.label}</button>`).join('')}
    </div>
    <div class="card" style="margin-bottom:18px">
      <div style="font-size:13px;font-weight:800;letter-spacing:.6px;color:var(--green);margin-bottom:4px">PENDAPATAN</div>
      <div id="slipPendapatan">
      ${slipRowHTML('Gaji pokok', 'Rp 10.500.000')}
      ${slipRowHTML('Tunjangan', 'Rp 2.200.000')}
      ${slipRowHTML('Lembur', 'Rp 780.000')}
      </div>
      <div style="font-size:13px;font-weight:800;letter-spacing:.6px;color:var(--red);margin:14px 0 4px">POTONGAN</div>
      <div id="slipPotongan">
      ${slipRowHTML('BPJS', '– Rp 420.000', 'var(--red)')}
      ${slipRowHTML('PPh 21', '– Rp 580.000', 'var(--red)')}
      </div>
      <div style="background:var(--green-50);border-radius:12px;display:flex;justify-content:space-between;align-items:center;padding:13px 16px;margin-top:12px">
        <span style="font-size:15.5px;font-weight:800">Total</span>
        <span id="slipTotal" style="font-size:16.5px;font-weight:800;color:var(--green)">Rp 12.480.000</span>
      </div>
    </div>
    ${btn('Unduh PDF', "toast('Slip gaji diunduh')")}
    <div style="height:6px"></div>
  </div>
</div>`;
};

/* ═══ 16a · Reimburse (Review) ═══ */
Views.reimburse = () => {
  loadReimburse('pending');
  return `
<div class="screen no-tab">
  ${rbsHead(['Rp 2,4jt', 'Rp 845rb', 'Rp 1,5jt'])}
  <div class="body" style="padding-top:0">
    ${rbsTabs('reimburse')}
    <div id="rbsRows">
    ${rbsItem('29 September 2026', 'Perjalanan Dinas', 'Rp 600.000')}
    ${rbsItem('27 September 2026', 'Pelatihan', 'Rp 245.000')}
    ${rbsItem('26 September 2026')}
    </div>
    ${btn('Ajukan Reimburse', "go('reimburse-ajukan')")}
    <div style="height:6px"></div>
  </div>
</div>`;
};

/* ═══ Reimburse · Disetujui ═══ */
Views['reimburse-disetujui'] = () => {
  loadReimburse('approved');
  return `
<div class="screen no-tab">
  ${rbsHead(['Rp 2,4jt', 'Rp 845rb', 'Rp 1,5jt'])}
  <div class="body" style="padding-top:0">
    ${rbsTabs('reimburse-disetujui')}
    <div id="rbsRows">
    ${rbsItem('20 September 2026', 'Transportasi', 'Rp 1.200.000', '<span class="pill green">Disetujui</span>')}
    ${rbsItem('12 September 2026', 'Makan & Entertain', 'Rp 350.000', '<span class="pill green">Disetujui</span>')}
    </div>
    ${btn('Ajukan Reimburse', "go('reimburse-ajukan')")}
    <div style="height:6px"></div>
  </div>
</div>`;
};

/* ═══ Reimburse · Ditolak ═══ */
Views['reimburse-ditolak'] = () => {
  loadReimburse('rejected');
  return `
<div class="screen no-tab">
  ${rbsHead(['Rp 2,4jt', 'Rp 845rb', 'Rp 1,5jt'])}
  <div class="body" style="padding-top:0">
    ${rbsTabs('reimburse-ditolak')}
    <div id="rbsRows">
    <div class="card" style="margin-bottom:12px;padding:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="width:20px;height:20px;color:#1fa36b;display:inline-flex">${I.receipt}</span>
        <span style="font-weight:700;font-size:15.5px">5 September 2026</span>
        <span style="margin-left:auto"><span class="pill red">Ditolak</span></span>
      </div>
      <div style="background:#f7f9fb;border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
        <div><div class="muted" style="font-size:12.5px;margin-bottom:3px">Kategori</div><div style="font-weight:600;font-size:15px">Perlengkapan Kantor</div></div>
        <div style="text-align:right"><div class="muted" style="font-size:12.5px;margin-bottom:3px">Total</div><div style="font-weight:800;font-size:15.5px">Rp 480.000</div></div>
      </div>
      <div style="font-size:13px;color:var(--red);margin-top:10px">Alasan: Struk tidak terbaca</div>
    </div>
    </div>
    ${btn('Ajukan Reimburse', "go('reimburse-ajukan')")}
    <div style="height:6px"></div>
  </div>
</div>`;
};

/* ═══ 16b · Ajukan Reimburse ═══ */
Views['reimburse-ajukan'] = () => {
  const kat = RbsState.kategori;
  return `
<div class="screen white no-tab">
  ${topbar('Ajukan Reimburse')}
  <div class="body" style="padding-top:10px">
    <div class="card" style="background:linear-gradient(135deg,#25b977,#128a56);border:0;color:#fff;display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <div style="flex:1">
        <div style="font-size:17px;font-weight:800;margin-bottom:4px">Siapkan dokumen lengkap</div>
        <div style="font-size:13.5px;opacity:.92">1.000+ klaim sudah disetujui</div>
      </div>
      <div style="width:76px;flex-shrink:0">${illuWallet()}</div>
    </div>
    <div class="card" style="margin-bottom:18px">
      <div style="font-weight:800;font-size:17px">Informasi Klaim</div>
      <div class="muted" style="font-size:13.5px;margin:3px 0 16px">Lengkapi detail klaim Anda</div>
      <div onclick="toast('Pilih file bukti / struk')" style="border:1.5px dashed #9fd8b8;border-radius:16px;padding:26px 16px;text-align:center;cursor:pointer;margin-bottom:16px;background:#fbfefc">
        <div style="color:#1fa36b;display:flex;justify-content:center;margin-bottom:10px"><span style="width:26px;height:26px;display:inline-flex">${I.upload}</span></div>
        <div style="font-weight:700;font-size:15.5px;color:#1fa36b">Unggah Bukti / Struk</div>
        <div class="muted" style="font-size:13px;margin-top:5px">PDF, JPG, PNG · maks 5 MB</div>
      </div>
      ${field('Kategori', `<div class="inp ${kat ? 'filled' : ''}" onclick="rbsOpenKat()" style="cursor:pointer">
        ${I.tag}<input readonly value="${kat}" placeholder="Pilih kategori" style="cursor:pointer"><span class="chev">${I.chevD}</span></div>`)}
      ${field('Tanggal transaksi', `<div class="inp" onclick="toast('Pilih tanggal transaksi')" style="cursor:pointer">
        ${I.cal}<input readonly value="" placeholder="Pilih tanggal" style="cursor:pointer"><span class="chev">${I.chevD}</span></div>`)}
      ${field('Jumlah (Rp)', `<div class="inp">${I.money}<input id="rbsAmount" type="number" inputmode="numeric" placeholder="Masukkan jumlah"></div>`)}
    </div>
    ${btn('Kirim Reimburse', kat ? 'rbsKonfirmasi()' : "toast('Pilih kategori klaim dulu')", kat ? '' : 'disabled')}
    <div style="height:6px"></div>
  </div>
</div>`;
};

/* sheet kategori reimburse */
function rbsOpenKat() {
  RbsState.pick = RbsState.kategori;
  const kats = ['Perjalanan Dinas', 'Perlengkapan Kantor', 'Makan & Entertain', 'Pelatihan & Sertifikasi', 'Transportasi', 'Kesehatan'];
  sheetOpen(`
    <h3>Kategori Reimburse</h3>
    <div class="sheet-sub">Pilih kategori biaya</div>
    <div id="kat-list">
      ${kats.map(k => `<button class="opt-row ${RbsState.pick === k ? 'selected' : ''}" onclick="rbsPickKat('${k}', this)"><span>${k}</span><span class="radio">${RbsState.pick === k ? '✓' : ''}</span></button>`).join('')}
    </div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn outline" onclick="closeSheet()">Batal</button>
      <button class="btn" onclick="rbsKatOK()">Pilih</button>
    </div>`);
}
function rbsPickKat(name, el) {
  RbsState.pick = name;
  document.querySelectorAll('#kat-list .opt-row').forEach(o => {
    o.classList.remove('selected');
    o.querySelector('.radio').textContent = '';
  });
  el.classList.add('selected');
  el.querySelector('.radio').textContent = '✓';
}
function rbsKatOK() {
  RbsState.kategori = RbsState.pick;
  closeSheet();
  render();
}

/* sheet konfirmasi kirim */
function rbsKonfirmasi() {
  sheetOpen(`
    <div style="text-align:center;padding:8px 0 4px">
      <div style="width:76px;height:76px;border-radius:22px;background:#1fa36b;color:#fff;display:flex;align-items:center;justify-content:center;margin:-52px auto 18px;box-shadow:0 10px 24px rgba(31,163,107,.4)">
        <span style="width:36px;height:36px;display:inline-flex">${I.receipt}</span>
      </div>
      <h3 style="font-size:22px">Siap dikirim?</h3>
      <p class="muted" style="font-size:14.5px;margin:8px 0 22px;line-height:1.6">Periksa kembali detail reimburse Anda.<br>Lanjutkan pengiriman?</p>
      ${btn('Ya, Kirim', "rbsKirim()", 'id="rbsKirimBtn"')}
      <div style="height:12px"></div>
      <button class="btn outline" onclick="closeSheet()">Tidak, cek lagi</button>
      <div style="height:6px"></div>
    </div>`);
}

async function rbsKirim() {
  const btnEl = document.getElementById('rbsKirimBtn');
  const amtEl = document.getElementById('rbsAmount');
  const amount = amtEl ? Math.round(Number(amtEl.value) || 0) : 0;
  if (!RbsState.kategori) { closeSheet(); toast('Pilih kategori klaim dulu'); return; }
  if (!amount || amount <= 0) { toast('Isi jumlah klaim dulu'); return; }
  setBtnLoading(btnEl, true);
  const d = new Date();
  const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  try {
    await API.reimburseCreate({ category: RbsState.kategori, date: iso, amount: amount, notes: '' });
    RbsState.kategori = '';
    closeSheet();
    go('reimburse-terkirim');
  } catch (e) {
    closeSheet();
    toast(e.message || 'Gagal mengirim klaim');
  }
}

/* ═══ 16e · Reimburse terkirim (layar backdrop gelap) ═══ */
Views['reimburse-terkirim'] = () => `
<div class="screen no-tab" style="background:rgba(16,31,46,.72);justify-content:flex-end">
  <div style="background:#fff;border-radius:28px 28px 0 0;padding:12px 20px calc(28px + env(safe-area-inset-bottom));text-align:center;animation:slideUp .3s ease">
    <div style="width:76px;height:76px;border-radius:22px;background:#1fa36b;color:#fff;display:flex;align-items:center;justify-content:center;margin:-52px auto 18px;box-shadow:0 10px 24px rgba(31,163,107,.4)">
      <span style="width:36px;height:36px;display:inline-flex">${I.checkCircle}</span>
    </div>
    <h2 style="font-size:22px;font-weight:800;margin:0 0 8px">Reimburse terkirim!</h2>
    <p class="muted" style="font-size:14.5px;margin:0 0 22px;line-height:1.6">Klaim Anda sedang direview. Dana akan dibayarkan bersama gaji.</p>
    ${btn('Lihat Riwayat Reimburse', "go('reimburse')")}
  </div>
</div>`;

/* ═══ 16f · Reimburse kosong ═══ */
Views['reimburse-kosong'] = () => `
<div class="screen no-tab">
  ${rbsHead(['Rp 0', 'Rp 0', 'Rp 0'], '#9aa8bb', '#9aa8bb', '#9aa8bb')}
  <div class="body" style="padding-top:0">
    ${rbsTabs('reimburse-kosong')}
    <div class="card" style="margin-bottom:16px;padding:20px;text-align:center">
      <div style="font-weight:800;font-size:16.5px;text-align:left">Reimburse</div>
      <div class="muted" style="font-size:13.5px;margin:3px 0 22px;text-align:left">Klaim dalam review</div>
      <div class="center" style="margin:6px 0 16px">${illuEmpty()}</div>
      <div style="font-weight:800;font-size:17px;margin-bottom:8px">Belum ada klaim</div>
      <p class="muted" style="font-size:14px;margin:0 0 4px">Klaim yang Anda ajukan akan muncul di sini.</p>
    </div>
    ${btn('Ajukan Reimburse', "go('reimburse-ajukan')")}
    <div style="height:6px"></div>
  </div>
</div>`;

/* ═══ 17 · Profil (data dari API, fallback statis) ═══ */
function loadProfilData() {
  if (typeof API === 'undefined' || !API.token) return;
  ensureMe().then(e => {
    if (!e) return;
    if ((location.hash || '').replace('#/', '').split('?')[0] !== 'profil') return;
    const set = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined && v !== null && v !== '') el.textContent = v; };
    set('profName', e.name);
    set('profSub', [e.position, e.nip ? 'NIK ' + e.nip : ''].filter(Boolean).join(' · '));
    set('profEmail', e.email);
    set('profAva', empInitials());
  }).catch(() => {});
}

Views.profil = () => {
  loadProfilData();
  const menuRow = (icon, label, onclick, red) => `
    <button onclick="${onclick}" style="display:flex;align-items:center;gap:14px;width:100%;background:none;border:0;cursor:pointer;font-family:inherit;padding:14px 4px;text-align:left">
      <span style="width:24px;height:24px;color:${red ? 'var(--red)' : 'var(--green)'};display:inline-flex;flex-shrink:0">${I[icon]}</span>
      <span style="flex:1;font-size:15.5px;font-weight:${red ? '700' : '500'};color:${red ? 'var(--red)' : 'var(--ink)'}">${label}</span>
      <span style="width:20px;height:20px;color:#b6c2d1;display:inline-flex">${I.chevR}</span>
    </button>`;
  const divider = `<div style="height:1px;background:var(--line);margin:0 4px"></div>`;
  return `
<div class="screen">
  <div class="ghead round" style="text-align:center;padding-top:26px">
    <h1 style="font-size:21px">Profil Saya</h1>
    <div id="profAva" style="width:96px;height:96px;border-radius:30px;background:#fff;color:#1fa36b;font-size:30px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:20px auto 14px;box-shadow:0 8px 24px rgba(0,0,0,.14)">RP</div>
    <div id="profName" style="font-size:20px;font-weight:800">Rina Putri</div>
    <div id="profSub" style="font-size:14px;color:#d9f2e5;font-weight:600;margin-top:4px">Senior Designer · NIK 2021-0417</div>
  </div>
  <div class="body" style="padding-top:20px">
    <div style="font-size:13px;font-weight:800;letter-spacing:.6px;color:var(--muted);margin:6px 0 10px">KONTAK</div>
    <div class="card tight" style="margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:12px;padding:10px 4px">
        <span style="width:22px;height:22px;color:var(--green);display:inline-flex;flex-shrink:0">${I.mail}</span>
        <span style="font-size:14.5px" id="profEmail">rina.putri@kinikerja.id</span>
      </div>
      ${divider}
      <div style="display:flex;align-items:center;gap:12px;padding:10px 4px">
        <span style="width:22px;height:22px;color:var(--green);display:inline-flex;flex-shrink:0">${I.pin}</span>
        <span style="font-size:14.5px">Kebayoran Baru, Jakarta Selatan</span>
      </div>
    </div>
    <div style="font-size:13px;font-weight:800;letter-spacing:.6px;color:var(--muted);margin:22px 0 10px">AKUN</div>
    <div class="card tight" style="margin-bottom:6px">
      ${menuRow('idcard', 'Data Pribadi', "go('profil-data')")}
      ${divider}
      ${menuRow('laptop', 'Aset Kantor', "go('profil-aset')")}
      ${divider}
      ${menuRow('receipt', 'Payroll & Pajak', "toast('Payroll & Pajak segera hadir')")}
    </div>
    <div style="font-size:13px;font-weight:800;letter-spacing:.6px;color:var(--muted);margin:22px 0 10px">PENGATURAN</div>
    <div class="card tight" style="margin-bottom:6px">
      ${menuRow('key', 'Ubah Kata Sandi', "toast('Tautan ubah kata sandi dikirim')")}
      ${divider}
      ${menuRow('help', 'FAQ & Bantuan', "toast('Membuka pusat bantuan')")}
      ${divider}
      ${menuRow('logout', 'Keluar', "doLogout()", true)}
    </div>
    <div style="height:6px"></div>
  </div>
</div>`;
};

/* ═══ 17a · Data Pribadi ═══ */
Views['profil-data'] = () => `
<div class="screen white no-tab">
  ${topbar('Data Pribadi')}
  <div class="body" style="padding-top:10px">
    <div class="card" style="margin-bottom:18px">
      <div style="font-weight:800;font-size:17px">Data Pribadi Saya</div>
      <div class="muted" style="font-size:13.5px;margin:3px 0 20px">Detail informasi pribadi kamu</div>
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:16px">
        <div style="position:relative;flex-shrink:0">
          <div style="width:92px;height:92px;border-radius:26px;background:var(--green-50);color:var(--green);font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center">RP</div>
          <button onclick="toast('Pilih foto profil')" aria-label="Ubah foto" style="position:absolute;top:-8px;right:-8px;width:32px;height:32px;border-radius:50%;background:var(--green);color:#fff;border:3px solid #fff;display:flex;align-items:center;justify-content:center;cursor:pointer">
            <span style="width:16px;height:16px;display:inline-flex">${I.sync}</span>
          </button>
        </div>
        <div class="muted" style="font-size:13px;line-height:1.6;padding-top:6px">Format .jpg/.png,<br>min 800×800px, maks 5MB</div>
      </div>
      ${field('Nama Lengkap', `<div class="inp filled">${I.user}<input value="Rina Putri"></div>`)}
      ${field('Tanggal Lahir', `<div class="inp filled" onclick="toast('Pilih tanggal lahir')" style="cursor:pointer">${I.cal}<input readonly value="14 Maret 1995" style="cursor:pointer"><span class="chev">${I.chevD}</span></div>`)}
      ${field('Jabatan', `<div class="inp filled" style="cursor:pointer">${I.idcard}<input readonly value="Senior Designer" style="cursor:pointer"><span class="chev">${I.chevD}</span></div>`)}
      ${field('Kota Domisili', `<div class="inp filled" style="cursor:pointer">${I.pin}<input readonly value="Jakarta Selatan" style="cursor:pointer"><span class="chev">${I.chevD}</span></div>`)}
      ${field('Alamat Lengkap', `<div class="inp filled">${I.building}<input value="Jl. Senopati No. 21"></div>`)}
    </div>
    ${btn('Simpan Perubahan', "toast('Perubahan disimpan')")}
    <div style="height:6px"></div>
  </div>
</div>`;

/* ilustrasi laptop flat untuk Aset Kantor */
function illuLaptop() {
  return `<svg viewBox="0 0 200 130" width="190" height="124">
    <rect x="20" y="14" width="160" height="88" rx="10" fill="#1fa36b"/>
    <rect x="20" y="14" width="160" height="88" rx="10" fill="#000" opacity=".06"/>
    <rect x="30" y="24" width="140" height="68" rx="5" fill="#fff"/>
    <rect x="30" y="24" width="140" height="14" rx="5" fill="#d9f2e5"/>
    <rect x="38" y="46" width="70" height="8" rx="4" fill="#e8edf2"/>
    <rect x="38" y="58" width="52" height="8" rx="4" fill="#e8edf2"/>
    <rect x="38" y="70" width="84" height="8" rx="4" fill="#d9f2e5"/>
    <circle cx="152" cy="76" r="14" fill="#1fa36b"/><path d="M146 76l4 4 8-8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="10" y="102" width="180" height="12" rx="6" fill="#9fb3c8"/>
    <rect x="86" y="102" width="28" height="5" rx="2.5" fill="#7a8aa0"/>
  </svg>`;
}

/* ═══ 17b · Aset Kantor ═══ */
Views['profil-aset'] = () => `
<div class="screen white no-tab">
  ${topbar('Aset Kantor')}
  <div class="body" style="padding-top:10px">
    <div class="card" style="margin-bottom:18px">
      <div style="font-weight:800;font-size:17px">Informasi Aset</div>
      <div class="muted" style="font-size:13.5px;margin:3px 0 18px">Aset kantor yang dipinjamkan ke kamu</div>
      <div class="center" style="margin-bottom:20px">${illuLaptop()}</div>
      ${field('Nama Aset', `<div class="inp filled">${I.laptop}<input readonly value="MacBook Air M2 2023"></div>`)}
      ${field('Merek', `<div class="inp filled">${I.tag}<input readonly value="Apple"></div>`)}
      ${field('Status Garansi', `<div class="inp filled">${I.shield}<input readonly value="Aktif s.d. Agu 2026"></div>`)}
      ${field('Diterima Pada', `<div class="inp filled">${I.cal}<input readonly value="14 September 2023"></div>`)}
    </div>
    <div style="height:6px"></div>
  </div>
</div>`;
