/* ═══ KiniKerja PWA — views misc: absen, riwayat, pengajuan, tugas, notifikasi, menu ═══ */
/* Views sudah didefinisikan di views-core.js — file ini hanya menambah properti. */

/* ── helper lokal (bukan global) ── */
const _iconBox = (svg, size) =>
  `<span style="width:${size}px;height:${size}px;display:inline-flex;flex-shrink:0">${svg}</span>`;

const _locPill = (txt) => `
  <div class="center" style="margin:10px 0 4px">
    <span class="pill" style="background:var(--green-50);color:var(--green);padding:10px 20px;font-size:14px;gap:8px">
      ${_iconBox(I.pin, 18)}${txt}
    </span>
  </div>`;

const _infoTile = (icon, label) => `
  <div class="card tight center" style="flex:1;padding:16px 4px">
    <span class="tile" style="width:46px;height:46px;border-radius:15px;margin:0 auto 10px">${icon}</span>
    <div style="font-size:12.5px;font-weight:500;color:var(--ink-2)">${label}</div>
  </div>`;

const _dRow = (label, value, color) => `
  <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0">
    <span class="muted" style="font-size:14.5px">${label}</span>
    <b style="font-size:15px${color ? `;color:${color}` : ''}">${value}</b>
  </div>`;

const _rwRow = (date, day, line1, line2, pillCls, pillTxt, hl) => `
  <div class="row-card">
    <div style="width:52px;text-align:center;${hl ? 'background:var(--green-50)' : 'background:#f2f4f7'};border-radius:12px;padding:9px 0;flex-shrink:0">
      <div style="font-size:19px;font-weight:800">${date}</div>
      <div style="font-size:12px;color:var(--muted)">${day}</div>
    </div>
    <div class="grow"><h4>${line1}</h4><div class="sub">${line2}</div></div>
    <span class="pill ${pillCls}">${pillTxt}</span>
  </div>`;

const _pjCard = (title, pillCls, pillTxt, rows) => `
  <div class="card" style="margin-bottom:12px;padding:16px 18px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:4px">
      <b style="font-size:16.5px">${title}</b><span class="pill ${pillCls}">${pillTxt}</span>
    </div>
    ${rows.map(r => `
      <div style="display:flex;align-items:center;gap:9px;color:var(--muted);font-size:13.5px;margin-top:7px">
        ${_iconBox(r[0], 17)}${r[1]}
      </div>`).join('')}
  </div>`;

const _taskCard = (pills, title, subIcon, subTxt) => `
  <div class="card" style="margin-bottom:12px">
    <div style="display:flex;gap:8px;margin-bottom:10px">${pills}</div>
    <h4 style="font-size:16.5px;font-weight:700;margin:0 0 7px">${title}</h4>
    <div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13.5px">
      ${_iconBox(subIcon, 16)}${subTxt}
    </div>
  </div>`;

const _ntRow = (icon, title, sub, unread) => `
  <div class="row-card">
    <span class="tile" style="width:52px;height:52px;border-radius:16px">${icon}</span>
    <div class="grow"><h4>${title}</h4><div class="sub">${sub}</div></div>
    ${unread ? '<span style="width:10px;height:10px;border-radius:50%;background:var(--green);flex-shrink:0"></span>' : ''}
  </div>`;

const _mItem = (icon, label, onclick) => `
  <button class="menu-item" data-mname="${label}" onclick="${onclick}">
    <span class="tile">${icon}</span><span>${label}</span>
  </button>`;

/* ── clock in via API ── */
async function doClockIn() {
  const b = document.getElementById('clockinBtn');
  setBtnLoading(b, true);
  try {
    await API.clockIn();
    go('absen-berhasil');
  } catch (e) {
    toast(e.message || 'Clock in gagal. Coba lagi.');
    setBtnLoading(b, false);
  }
}

/* ═══ ABSEN WAJAH ═══ */
Views['absen-wajah'] = () => `
<div class="screen white">
  ${topbar('Absen Wajah', { right: `<button class="icon-btn" onclick="toast('Panduan absen wajah')" aria-label="Info">${I.info}</button>` })}
  <div class="body" style="display:flex;flex-direction:column">
    ${_locPill('Kantor Pusat · 12 m')}
    <div class="center" style="margin:22px 0">${illuFace()}</div>
    <h1 class="center" style="font-size:22px;font-weight:800;margin:28px 0 8px">Kedipkan mata perlahan</h1>
    <p class="muted center" style="margin:0;font-size:14.5px">Liveness check &amp; anti-spoofing aktif</p>
    <div style="display:flex;gap:10px;margin:26px 0 8px">
      ${_infoTile(I.sparkle, 'AI offline')}
      ${_infoTile(I.sun, 'Layar aktif')}
      ${_infoTile(I.shield, 'Anti-spoof')}
    </div>
    <div style="flex:1"></div>
    ${btn('Clock In Sekarang', "doClockIn()", 'id="clockinBtn"')}
  </div>
</div>`;

/* ═══ ABSEN BERHASIL ═══ */
Views['absen-berhasil'] = () => `
<div class="screen white no-tab">
  <div class="body" style="display:flex;flex-direction:column;padding-top:70px">
    <div class="center">${illuSuccess()}</div>
    <h1 class="center" style="font-size:26px;font-weight:800;margin:26px 0 10px">Clock In berhasil!</h1>
    <p class="muted center" style="margin:0 0 6px;font-size:15px;line-height:1.6">Semangat bekerja, Rina. Kehadiran Anda<br>sudah tercatat.</p>
    <div class="card" style="background:#f7f9fb;box-shadow:none;margin:26px 0;padding:8px 18px">
      ${_dRow('Waktu', '07:58 WIB')}
      ${_dRow('Tanggal', 'Sabtu, 11 Okt 2026')}
      ${_dRow('Lokasi', 'Kantor Pusat')}
      ${_dRow('Status', 'Tepat waktu', 'var(--green)')}
    </div>
    <div style="flex:1"></div>
    ${btn('Kembali ke Beranda', "go('home')")}
  </div>
</div>`;

/* ═══ RIWAYAT KEHADIRAN (async dari API, fallback statis) ═══ */
var RwOffset = 0;

function rwYM() {
  const d = new Date();
  d.setMonth(d.getMonth() + RwOffset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function rwNav(dir) {
  RwOffset += dir;
  render();
}
function rwPill(status) {
  const s = String(status || '').toLowerCase();
  if (s.indexOf('terlambat') !== -1) return ['orange', 'Terlambat'];
  if (s.indexOf('cuti') !== -1) return ['teal', 'Cuti'];
  if (s.indexOf('izin') !== -1) return ['gray', 'Izin'];
  if (s.indexOf('hadir') !== -1 || s.indexOf('tepat') !== -1) return ['green', 'Hadir'];
  return ['gray', status || '-'];
}
function loadRiwayat() {
  if (typeof API === 'undefined' || !API.token) return;
  const ym = rwYM();
  API.attendanceHistory(ym).then(d => {
    if ((location.hash || '').replace('#/', '').split('?')[0] !== 'riwayat') return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('rwMonth', labelBulan(d.month || ym));
    const s = (d && d.summary) || {};
    set('rwHadir', s.hadir != null ? s.hadir : '-');
    set('rwTerlambat', s.terlambat != null ? s.terlambat : '-');
    set('rwCuti', s.cuti != null ? s.cuti : '-');
    const box = document.getElementById('rwRows');
    if (box && Array.isArray(d.rows) && d.rows.length) {
      box.innerHTML = d.rows.map(r => {
        const dt = new Date(r.date + 'T00:00:00');
        const p = rwPill(r.status);
        const line1 = p[1] === 'Cuti' ? ('Cuti' + (r.notes ? ' — ' + r.notes : ''))
          : (fmtJam(r.clock_in) + ' – ' + fmtJam(r.clock_out));
        return _rwRow(String(dt.getDate()), HARI_ID[dt.getDay()], line1, r.location || '', p[0], p[1], false);
      }).join('');
    }
  }).catch(() => { /* biarkan data statis saat offline */ });
}

Views.riwayat = () => {
  loadRiwayat();
  return `
<div class="screen white no-tab">
  ${topbar('Riwayat Kehadiran', { right: `<button class="icon-btn" onclick="toast('Filter riwayat')" aria-label="Filter">${I.filter}</button>` })}
  <div class="body" style="padding-top:8px">
    <div class="month-nav" style="margin-bottom:14px">
      <button onclick="rwNav(-1)" aria-label="Bulan sebelumnya">${_iconBox(`<span style="display:inline-flex;transform:rotate(180deg);width:20px;height:20px">${I.chevR}</span>`, 20)}</button>
      <b id="rwMonth">Oktober 2026</b>
      <button onclick="rwNav(1)" aria-label="Bulan berikutnya">${_iconBox(I.chevR, 20)}</button>
    </div>
    <div class="stat-grid" style="margin-bottom:16px">
      <div class="stat-box"><div class="n" id="rwHadir" style="color:var(--green)">18</div><div class="l">Hadir</div></div>
      <div class="stat-box"><div class="n" id="rwTerlambat" style="color:var(--red)">2</div><div class="l">Terlambat</div></div>
      <div class="stat-box"><div class="n" id="rwCuti" style="color:var(--teal)">1</div><div class="l">Cuti</div></div>
    </div>
    <div id="rwRows">
    ${_rwRow('11', 'Sab', '07:58 – --:--', 'Kantor Pusat', 'green', 'Hadir', true)}
    ${_rwRow('10', 'Jum', '08:21 – 17:05', 'Kantor Pusat', 'orange', 'Terlambat')}
    ${_rwRow('9', 'Kam', '07:52 – 20:10', 'Lembur 3 jam', 'green', 'Hadir')}
    ${_rwRow('8', 'Rab', 'Cuti tahunan', 'Disetujui atasan', 'teal', 'Cuti')}
    ${_rwRow('7', 'Sel', '07:49 – 17:02', 'WFH - disetujui', 'green', 'Hadir')}
    </div>
  </div>
</div>`;
};

/* ═══ PENGAJUAN ═══ */
function pengajuanFilter(el) {
  document.querySelectorAll('.fpill').forEach(p => {
    p.style.background = '#fff';
    p.style.color = 'var(--ink-2)';
  });
  el.style.background = 'var(--green)';
  el.style.color = '#fff';
}

function pengajuanTambah() {
  const opt = (icon, label, onclick) => `
    <button class="opt-row" onclick="${onclick}">
      <span class="tile" style="width:46px;height:46px;border-radius:14px">${icon}</span>
      ${label}<span class="radio"></span>
    </button>`;
  sheetOpen(`
    <h3 style="margin-bottom:4px">Buat pengajuan</h3>
    <p class="sheet-sub">Pilih jenis pengajuan baru</p>
    ${opt(I.tag, 'Cuti', "go('cuti-ajukan')")}
    ${opt(I.timer, 'Lembur', "closeSheet();go('lembur')")}
    ${opt(I.wallet, 'Reimburse', "go('reimburse-ajukan')")}
    ${opt(I.plus, 'Izin', "closeSheet();go('cuti-ajukan')")}
  `);
}

Views.pengajuan = () => {
  const tile = (icon, label, onclick) => `
    <button class="menu-item" style="flex:1;background:#fff;border-radius:18px;padding:18px 2px;box-shadow:var(--shadow)" onclick="${onclick}">
      <span class="tile">${icon}</span><span>${label}</span>
    </button>`;
  const fpill = (label, active) => `
    <button class="fpill" onclick="pengajuanFilter(this)" style="padding:10px 24px;border-radius:999px;border:0;cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;box-shadow:var(--shadow);${active ? 'background:var(--green);color:#fff' : 'background:#fff;color:var(--ink-2)'}">${label}</button>`;
  return `
<div class="screen">
  <div class="body" style="padding-top:28px">
    <h1 style="font-size:30px;font-weight:800;margin:0 0 18px">Pengajuan</h1>
    <div style="display:flex;gap:10px">
      ${tile(I.tag, 'Cuti', "go('cuti')")}
      ${tile(I.timer, 'Lembur', "go('lembur')")}
      ${tile(I.wallet, 'Reimburse', "go('reimburse')")}
      ${tile(I.plus, 'Izin', "go('cuti-ajukan')")}
    </div>
    <div style="display:flex;gap:10px;margin:20px 0 14px">
      ${fpill('Semua', true)}${fpill('Menunggu', false)}${fpill('Selesai', false)}
    </div>
    ${_pjCard('Cuti Tahunan', 'orange', 'Menunggu', [
      [I.cal, '20–22 Okt 2026 · 3 hari'],
      [I.user, 'Atasan: Budi Santoso'],
    ])}
    ${_pjCard('Lembur Proyek', 'green', 'Disetujui', [
      [I.clock, '9 Okt 2026 · 17:00–20:00'],
      [I.user, 'Atasan: Budi Santoso'],
    ])}
    ${_pjCard('Reimburse Transport', 'red', 'Ditolak', [
      [I.money, 'Rp 245.000 · 2 Okt 2026'],
      [I.info, 'Struk tidak terbaca'],
    ])}
  </div>
  <button class="fab" onclick="pengajuanTambah()" aria-label="Tambah pengajuan">+</button>
</div>`;
};

/* ═══ TUGAS ═══ */
Views.tugas = () => {
  const dayBox = (d, n, active) => `
    <div style="flex:1;${active ? 'background:var(--green);color:#fff' : 'background:#fff;color:var(--ink)'};border-radius:14px;padding:10px 0;text-align:center;box-shadow:var(--shadow)">
      <div style="font-size:12px;${active ? 'opacity:.85' : 'color:var(--muted)'}">${d}</div>
      <div style="font-size:17px;font-weight:800;margin-top:2px">${n}</div>
    </div>`;
  return `
<div class="screen no-tab">
  <div class="body" style="padding-top:28px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h1 style="font-size:30px;font-weight:800;margin:0">Tugas</h1>
      <button class="icon-btn" onclick="toast('Cari tugas')" aria-label="Cari">${I.search}</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      ${dayBox('Sen', '6', false)}${dayBox('Sel', '7', false)}${dayBox('Rab', '8', false)}
      ${dayBox('Kam', '9', false)}${dayBox('Jum', '10', false)}${dayBox('Sab', '11', true)}
    </div>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b style="font-size:16px">Progres minggu ini</b>
        <b style="font-size:16px;color:var(--green)">68%</b>
      </div>
      <div style="height:10px;background:#edf1f5;border-radius:6px;margin:14px 0 10px;overflow:hidden">
        <div style="width:68%;height:100%;background:var(--green);border-radius:6px"></div>
      </div>
      <div class="muted" style="font-size:13.5px">13 dari 19 tugas selesai</div>
    </div>
    ${_taskCard(
      '<span class="pill red">Tinggi</span><span class="pill orange">Proses</span>',
      'Desain halaman payroll',
      I.clock, 'Hari ini, 15:00 · 3 subtugas'
    )}
    ${_taskCard(
      '<span class="pill teal">Sedang</span><span class="pill green">Baru</span>',
      'Siapkan materi sprint review',
      I.clock, 'Hari ini, 13:00 · Ruang Rapat 2'
    )}
    ${_taskCard(
      '<span class="pill gray">Rendah</span><span class="pill green">Selesai</span>',
      'Update ikon aplikasi',
      `<span style="color:var(--green);display:inline-flex;width:16px;height:16px">${I.check}</span>`, 'Selesai 10:20'
    )}
  </div>
</div>`;
};

/* ═══ NOTIFIKASI (async dari API, fallback statis) ═══ */
function ntIcon(type) {
  const t = String(type || '').toLowerCase();
  if (t.indexOf('leave') !== -1 || t.indexOf('cuti') !== -1) return I.tag;
  if (t.indexOf('payroll') !== -1 || t.indexOf('gaji') !== -1) return I.receipt;
  if (t.indexOf('attendance') !== -1 || t.indexOf('absen') !== -1 || t.indexOf('clock') !== -1) return I.clock;
  if (t.indexOf('announce') !== -1 || t.indexOf('pengumuman') !== -1) return I.mega;
  if (t.indexOf('sync') !== -1) return I.sync;
  return I.bell;
}
function loadNotifikasi() {
  if (typeof API === 'undefined' || !API.token) return;
  API.notifications().then(d => {
    if ((location.hash || '').replace('#/', '').split('?')[0] !== 'notifikasi') return;
    const box = document.getElementById('ntList');
    if (!box || !Array.isArray(d.rows) || !d.rows.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const grupHariIni = [], grupKemarin = [], grupLalu = [];
    d.rows.forEach(r => {
      const day = String(r.created_at || '').slice(0, 10);
      if (day === today) grupHariIni.push(r);
      else if (day === yest) grupKemarin.push(r);
      else grupLalu.push(r);
    });
    const sect = (label, rows) => rows.length
      ? `<div style="font-size:12.5px;font-weight:700;color:var(--muted);letter-spacing:.6px;margin:14px 0 10px">${label}</div>`
        + rows.map(r => _ntRow(ntIcon(r.type), r.title, (r.message || '') + (r.created_at ? ' · ' + fmtTgl(r.created_at) : ''), !r.read)).join('')
      : '';
    box.innerHTML = sect('HARI INI', grupHariIni) + sect('KEMARIN', grupKemarin) + sect('SEBELUMNYA', grupLalu)
      || '<p class="muted center" style="margin-top:30px">Belum ada notifikasi.</p>';
  }).catch(() => { /* biarkan data statis saat offline */ });
}

Views.notifikasi = () => {
  loadNotifikasi();
  return `
<div class="screen white no-tab">
  ${topbar('Notifikasi', { right: `<button class="link-green" onclick="toast('Semua notifikasi ditandai dibaca')">Tandai dibaca</button>` })}
  <div class="body" style="padding-top:8px" id="ntList">
    <div style="font-size:12.5px;font-weight:700;color:var(--muted);letter-spacing:.6px;margin:14px 0 10px">HARI INI</div>
    ${_ntRow(I.checkCircle, 'Lembur disetujui', 'Budi menyetujui lembur 9 Okt · 2 menit lalu', true)}
    ${_ntRow(I.receipt, 'Slip gaji September tersedia', 'Ketuk untuk melihat rincian · 1 jam lalu', true)}
    ${_ntRow(I.clock, 'Pengingat clock out', 'Shift Anda berakhir pukul 17:00 · 3 jam lalu', false)}
    <div style="font-size:12.5px;font-weight:700;color:var(--muted);letter-spacing:.6px;margin:20px 0 10px">KEMARIN</div>
    ${_ntRow(I.mega, 'Pengumuman: Family Day', 'Daftar sebelum 20 Okt di menu Acara', false)}
    ${_ntRow(I.sync, 'Absen offline tersinkron', '1 data clock in berhasil dikirim', false)}
  </div>
</div>`;
};

/* ═══ MENU / SEMUA FITUR ═══ */
function menuSearch(el) {
  const q = el.value.trim().toLowerCase();
  document.querySelectorAll('[data-mname]').forEach(n => {
    n.style.display = (!q || n.dataset.mname.toLowerCase().indexOf(q) !== -1) ? '' : 'none';
  });
  document.querySelectorAll('[data-mgroup]').forEach(g => {
    const vis = Array.from(g.querySelectorAll('[data-mname]')).some(i => i.style.display !== 'none');
    g.style.display = vis ? '' : 'none';
  });
}

Views.menu = () => {
  const group = (label, items) => `
    <div data-mgroup>
      <div class="sect-head" style="margin:22px 0 12px"><h3 style="font-size:17px">${label}</h3></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px 8px">${items}</div>
    </div>`;
  return `
<div class="screen">
  <div class="body" style="padding-top:28px">
    <h1 style="font-size:30px;font-weight:800;margin:0 0 16px">Semua Fitur</h1>
    <div class="inp" style="background:#fff;margin-bottom:4px">
      ${I.search}
      <input type="text" placeholder="Cari fitur…" oninput="menuSearch(this)">
    </div>
    ${group('Pekerjaan',
      _mItem(I.finger, 'Absensi', "go('absen-wajah')") +
      _mItem(I.cal, 'Jadwal', "go('jadwal')") +
      _mItem(I.doc, 'Tugas', "go('tugas')") +
      _mItem(I.clock, 'Riwayat', "go('riwayat')")
    )}
    ${group('Keuangan',
      _mItem(I.money, 'Slip Gaji', "go('slip-gaji')") +
      _mItem(I.wallet, 'Reimburse', "go('reimburse')") +
      _mItem(I.handCoin, 'Kasbon', "go('kasbon')") +
      _mItem(I.timer, 'Lembur', "go('lembur')")
    )}
    ${group('Pengembangan',
      _mItem(I.book, 'Pelatihan', "go('pelatihan')") +
      _mItem(I.chart, 'KPI', "go('kpi')") +
      _mItem(I.users, 'Tim · Mgr', "go('tim')") +
      _mItem(I.medal, 'Penghargaan', "go('penghargaan')")
    )}
    <div data-mgroup>
      <div class="sect-head" style="margin:22px 0 12px"><h3 style="font-size:17px">Lainnya</h3></div>
      <button class="row-card" data-mname="Pengumuman &amp; Kebijakan" onclick="go('pengumuman')" style="width:100%;text-align:left;cursor:pointer;border:0;font-family:inherit">
        <span class="tile" style="width:52px;height:52px;border-radius:16px">${I.mega}</span>
        <span class="grow" style="font-weight:700;font-size:15.5px">Pengumuman &amp; Kebijakan</span>
        ${_iconBox(I.chevR, 20)}
      </button>
    </div>
  </div>
</div>`;
};
