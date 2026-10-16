/* ═══ KiniKerja PWA — views fitur: jadwal, kasbon, lembur, pelatihan, KPI, tim, penghargaan, pengumuman ═══ */
/* Views sudah didefinisikan di views-core.js — file ini hanya menambah properti. */
/* Semua fungsi global agar bisa dipanggil dari onclick. */

/* ── helper lokal (bukan global) ── */
function _ftPill(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved' || s === 'disetujui' || s === 'aktif' || s === 'selesai' || s === 'lunas') return ['green', 'Disetujui'];
  if (s === 'rejected' || s === 'ditolak') return ['red', 'Ditolak'];
  if (s === 'libur') return ['gray', 'Libur'];
  if (s === 'paid' || s === 'lunas') return ['teal', 'Lunas'];
  return ['orange', status || 'Menunggu'];
}
function _ftEmpty(text) {
  return `<div class="center" style="padding:36px 0">
    <div style="opacity:.55;margin-bottom:14px">${illuEmpty()}</div>
    <p class="muted" style="font-size:14.5px">${text}</p></div>`;
}
function _ftErr(text) {
  return `<div class="card" style="text-align:center;padding:28px 18px">
    <p style="font-weight:700;margin:0 0 6px">Gagal memuat data</p>
    <p class="muted" style="font-size:14px;margin:0 0 16px">${text}</p>
    <button class="btn outline" onclick="render()">Coba lagi</button></div>`;
}
function _ftLoad() {
  return `<div class="center" style="padding:36px 0"><p class="muted">Memuat…</p></div>`;
}
function _ftRoute() {
  return (location.hash || '').replace('#/', '').split('?')[0];
}
function _ftAvatar(name) {
  const n = String(name || 'KK').trim().split(/\s+/);
  const ini = ((n[0] || 'K')[0] + (n[1] ? n[1][0] : '')).toUpperCase();
  return `<span class="avatar" style="width:50px;height:50px;font-size:16px">${ini}</span>`;
}

/* ═══ JADWAL ═══ */
var JadwalRows = [];
function jadwalRow(w) {
  const libur = String(w.status || '').toLowerCase() === 'libur' || !w.masuk;
  const m = _ftPill(libur ? 'Libur' : (w.status || 'Aktif'));
  // API kirim date penuh "2026-10-12" & day penuh "Senin" — tampilkan ringkas
  let dayShort = String(w.day || '');
  let dateNum = String(w.date || '');
  const dm = dateNum.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dm) {
    dateNum = String(Number(dm[3]));
    if (dayShort.length > 3) dayShort = dayShort.slice(0, 3);
  }
  return `<div class="row-card">
    <div style="width:52px;text-align:center;background:${libur ? '#f2f4f7' : 'var(--green-50)'};border-radius:12px;padding:9px 0;flex-shrink:0">
      <div style="font-size:12px;color:var(--muted)">${dayShort}</div>
      <div style="font-size:19px;font-weight:800">${dateNum}</div>
    </div>
    <div class="grow"><h4>${w.shift || 'Shift Pagi'}</h4>
      <div class="sub">${libur ? 'Tidak ada jadwal' : fmtJam(w.masuk) + ' – ' + fmtJam(w.pulang)}</div></div>
    <span class="pill ${m[0]}">${m[1]}</span>
  </div>`;
}
function loadJadwal() {
  if (typeof API === 'undefined' || !API.token) return;
  API.jadwal().then(d => {
    if (_ftRoute() !== 'jadwal') return;
    const box = document.getElementById('jadwalList');
    if (!box || !d || !Array.isArray(d.week)) return;
    JadwalRows = d.week;
    box.innerHTML = JadwalRows.length ? JadwalRows.map(jadwalRow).join('') : _ftEmpty('Jadwal belum tersedia.');
  }).catch(() => { /* biarkan jadwal statis saat offline */ });
}
Views.jadwal = () => {
  loadJadwal();
  const statis = [
    { day: 'Sen', date: '12', shift: 'Shift Pagi', masuk: '08:00', pulang: '17:00', status: 'Aktif' },
    { day: 'Sel', date: '13', shift: 'Shift Pagi', masuk: '08:00', pulang: '17:00', status: 'Aktif' },
    { day: 'Rab', date: '14', shift: 'Shift Pagi', masuk: '08:00', pulang: '17:00', status: 'Aktif' },
    { day: 'Kam', date: '15', shift: 'Shift Pagi', masuk: '08:00', pulang: '17:00', status: 'Aktif' },
    { day: 'Jum', date: '16', shift: 'Shift Pagi', masuk: '08:00', pulang: '17:00', status: 'Aktif' },
    { day: 'Sab', date: '17', shift: '', masuk: '', pulang: '', status: 'Libur' },
    { day: 'Min', date: '18', shift: '', masuk: '', pulang: '', status: 'Libur' },
  ];
  return `
<div class="screen">
  <div class="ghead round">
    <h1>Jadwal</h1>
    <p>Jadwal kerja minggu ini.</p>
    <div style="position:absolute;right:20px;top:14px;transform:scale(.62);transform-origin:top right">${illuCalendar()}</div>
  </div>
  <div class="body" style="display:flex;flex-direction:column">
    <div class="card" style="margin-top:-26px;position:relative;z-index:1;display:flex;align-items:center;gap:12px">
      <span class="tile" style="width:52px;height:52px;border-radius:16px">${I.clock}</span>
      <div><div style="font-size:16.5px;font-weight:800">Shift Pagi</div>
      <div class="muted" style="font-size:13.5px;margin-top:2px">08:00 – 17:00 · Senin – Jumat</div></div>
    </div>
    <div class="sect-head"><h3>Minggu ini</h3></div>
    <div id="jadwalList">${statis.map(jadwalRow).join('')}</div>
  </div>
</div>`;
};

/* ═══ KASBON ═══ */
function kasbonPill(s) { const m = _ftPill(s); return `<span class="pill ${m[0]}">${m[1]}</span>`; }
function kasbonCard(r) {
  return `<div class="card" style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <b style="font-size:16.5px">${fmtRp(r.amount)}</b>${kasbonPill(r.status)}
    </div>
    <div class="muted" style="font-size:13.5px;margin-bottom:4px">${fmtTgl(r.created_at || r.date)}</div>
    ${r.reason || r.notes ? `<div style="font-size:14px;color:var(--ink-2)">${r.reason || r.notes}</div>` : ''}
  </div>`;
}
function loadKasbon() {
  if (typeof API === 'undefined' || !API.token) return;
  API.kasbonList().then(d => {
    if (_ftRoute() !== 'kasbon') return;
    const box = document.getElementById('kasbonRows');
    if (!box || !d || !Array.isArray(d.rows)) return;
    const rows = d.rows;
    const menunggu = rows.filter(r => {
      const s = String(r.status || '').toLowerCase();
      return !(s === 'approved' || s === 'disetujui' || s === 'rejected' || s === 'ditolak');
    });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('kasbonTotal', fmtRpShort(rows.reduce((a, r) => a + (Number(r.amount) || 0), 0)));
    set('kasbonTunggu', menunggu.length + ' pengajuan');
    box.innerHTML = rows.length ? rows.map(kasbonCard).join('') : _ftEmpty('Belum ada pengajuan kasbon.');
  }).catch(() => {
    const box = document.getElementById('kasbonRows');
    if (box) box.innerHTML = _ftErr('Periksa koneksi internet Anda.');
  });
}
Views.kasbon = () => {
  loadKasbon();
  return `
<div class="screen">
  <div class="ghead round">
    <h1>Kasbon</h1>
    <p>Ajukan pinjaman karyawan.</p>
    <div style="position:absolute;right:20px;top:14px;transform:scale(.62);transform-origin:top right">${illuWallet()}</div>
  </div>
  <div class="body" style="display:flex;flex-direction:column">
    <div class="card" style="margin-top:-26px;position:relative;z-index:1">
      <div style="font-size:17px;font-weight:800">Total Pengajuan</div>
      <div class="stat-grid" style="grid-template-columns:1fr 1fr;margin-top:14px">
        <div class="stat-box"><div class="n" id="kasbonTotal" style="font-size:20px">Rp 0</div>
          <div class="l">Akumulasi</div></div>
        <div class="stat-box"><div class="n" id="kasbonTunggu" style="font-size:20px">0 pengajuan</div>
          <div class="l">Menunggu</div></div>
      </div>
    </div>
    <div class="sect-head"><h3>Riwayat</h3></div>
    <div id="kasbonRows">${_ftLoad()}</div>
    <div style="flex:1"></div>
    <button class="btn" onclick="go('kasbon-ajukan')">Ajukan Kasbon</button>
  </div>
</div>`;
};

Views['kasbon-ajukan'] = () => `
<div class="screen white no-tab">
  ${topbar('Ajukan Kasbon')}
  <div class="body" style="padding-top:10px;display:flex;flex-direction:column">
    <div class="card" style="margin-bottom:18px">
      <div style="font-weight:800;font-size:17px">Informasi Kasbon</div>
      <div class="muted" style="font-size:13.5px;margin:3px 0 16px">Lengkapi detail pengajuan kasbon</div>
      ${field('Nominal (Rp)', `<div class="inp">${I.money}<span class="prefix">Rp</span><input id="kasbonAmount" type="number" inputmode="numeric" min="0" placeholder="Contoh: 1000000"></div>`)}
      <div class="field"><label>Alasan pengajuan</label>
        <div class="inp" style="height:auto;padding:14px 16px;align-items:flex-start">
          <textarea id="kasbonReason" placeholder="Tulis alasan pengajuan kasbon" style="width:100%;height:104px;resize:none;border:0;outline:0;background:transparent;font-family:inherit;font-size:15.5px;color:var(--ink)"></textarea>
        </div>
      </div>
    </div>
    <div style="flex:1"></div>
    ${btn('Kirim Pengajuan', 'kasbonKirim()', 'id="kasbonBtn"')}
    <div style="height:6px"></div>
  </div>
</div>`;

async function kasbonKirim() {
  const amount = Number((document.getElementById('kasbonAmount') || {}).value) || 0;
  const reason = ((document.getElementById('kasbonReason') || {}).value || '').trim();
  if (!amount || amount <= 0) { toast('Isi nominal kasbon dulu'); return; }
  if (!reason) { toast('Isi alasan pengajuan dulu'); return; }
  const b = document.getElementById('kasbonBtn');
  setBtnLoading(b, true);
  try {
    await API.kasbonCreate({ amount: amount, reason: reason });
    toast('Pengajuan kasbon terkirim');
    go('kasbon');
  } catch (e) {
    toast(e.message || 'Gagal mengirim pengajuan');
    setBtnLoading(b, false);
  }
}

/* ═══ LEMBUR ═══ */
function lemburCard(r) {
  const m = _ftPill(r.status);
  return `<div class="card" style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <b style="font-size:16.5px">${fmtTgl(r.date || r.created_at)}</b><span class="pill ${m[0]}">${m[1]}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13.5px">
      <span style="width:17px;height:17px;display:inline-flex">${I.clock}</span>${r.hours || 0} jam
      ${r.time_range ? ' · ' + r.time_range : ''}
    </div>
    ${r.reason || r.notes ? `<div style="font-size:14px;color:var(--ink-2);margin-top:8px">${r.reason || r.notes}</div>` : ''}
  </div>`;
}
function loadLembur() {
  if (typeof API === 'undefined' || !API.token) return;
  API.lemburList().then(d => {
    if (_ftRoute() !== 'lembur') return;
    const box = document.getElementById('lemburRows');
    if (!box || !d || !Array.isArray(d.rows)) return;
    const rows = d.rows;
    const totalJam = rows.reduce((a, r) => a + (Number(r.hours) || 0), 0);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('lemburJam', totalJam + ' jam');
    set('lemburBulan', labelBulan(bulanIni()));
    box.innerHTML = rows.length ? rows.map(lemburCard).join('') : _ftEmpty('Belum ada pengajuan lembur.');
  }).catch(() => {
    const box = document.getElementById('lemburRows');
    if (box) box.innerHTML = _ftErr('Periksa koneksi internet Anda.');
  });
}
Views.lembur = () => {
  loadLembur();
  return `
<div class="screen">
  <div class="ghead round">
    <h1>Lembur</h1>
    <p>Ajukan dan pantau lembur Anda.</p>
  </div>
  <div class="body" style="display:flex;flex-direction:column">
    <div class="card" style="margin-top:-26px;position:relative;z-index:1;display:flex;align-items:center;gap:12px">
      <span class="tile" style="width:52px;height:52px;border-radius:16px">${I.timer}</span>
      <div><div style="font-size:16.5px;font-weight:800" id="lemburJam">0 jam</div>
      <div class="muted" style="font-size:13.5px;margin-top:2px">Total lembur · <span id="lemburBulan"></span></div></div>
    </div>
    <div class="sect-head"><h3>Riwayat</h3></div>
    <div id="lemburRows">${_ftLoad()}</div>
    <div style="flex:1"></div>
    <button class="btn" onclick="go('lembur-ajukan')">Ajukan Lembur</button>
  </div>
</div>`;
};

Views['lembur-ajukan'] = () => `
<div class="screen white no-tab">
  ${topbar('Ajukan Lembur')}
  <div class="body" style="padding-top:10px;display:flex;flex-direction:column">
    <div class="card" style="margin-bottom:18px">
      <div style="font-weight:800;font-size:17px">Informasi Lembur</div>
      <div class="muted" style="font-size:13.5px;margin:3px 0 16px">Lengkapi detail pengajuan lembur</div>
      ${field('Tanggal lembur', `<div class="inp">${I.cal}<input id="lemburDate" type="date" style="color:var(--ink)"></div>`)}
      ${field('Durasi (jam)', `<div class="inp">${I.clock}<input id="lemburHours" type="number" inputmode="numeric" min="0" max="24" placeholder="Contoh: 3"></div>`)}
      <div class="field"><label>Alasan lembur</label>
        <div class="inp" style="height:auto;padding:14px 16px;align-items:flex-start">
          <textarea id="lemburReason" placeholder="Tulis alasan lembur" style="width:100%;height:104px;resize:none;border:0;outline:0;background:transparent;font-family:inherit;font-size:15.5px;color:var(--ink)"></textarea>
        </div>
      </div>
    </div>
    <div style="flex:1"></div>
    ${btn('Kirim Pengajuan', 'lemburKirim()', 'id="lemburBtn"')}
    <div style="height:6px"></div>
  </div>
</div>`;

async function lemburKirim() {
  const date = ((document.getElementById('lemburDate') || {}).value || '').trim();
  const hours = Number((document.getElementById('lemburHours') || {}).value) || 0;
  const reason = ((document.getElementById('lemburReason') || {}).value || '').trim();
  if (!date) { toast('Pilih tanggal lembur dulu'); return; }
  if (!hours || hours <= 0) { toast('Isi durasi lembur dulu'); return; }
  if (!reason) { toast('Isi alasan lembur dulu'); return; }
  const b = document.getElementById('lemburBtn');
  setBtnLoading(b, true);
  try {
    await API.lemburCreate({ date: date, hours: hours, reason: reason });
    toast('Pengajuan lembur terkirim');
    go('lembur');
  } catch (e) {
    toast(e.message || 'Gagal mengirim pengajuan');
    setBtnLoading(b, false);
  }
}

/* ═══ PELATIHAN ═══ */
function pelatihanCard(p) {
  const kuota = Number(p.quota) || 0, terisi = Number(p.filled) || 0;
  const sisa = Math.max(0, kuota - terisi);
  const pct = kuota ? Math.min(100, Math.round(terisi / kuota * 100)) : 0;
  return `<div class="card" style="margin-bottom:12px">
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
      <span class="tile" style="width:52px;height:52px;border-radius:16px">${I.book}</span>
      <div class="grow"><h4 style="font-size:16px">${p.title || 'Pelatihan'}</h4>
      <div class="sub">${p.organizer || ''}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:9px;color:var(--muted);font-size:13.5px">
        <span style="width:17px;height:17px;display:inline-flex">${I.cal}</span>${fmtTgl(p.date)}${p.duration ? ' · ' + p.duration : ''}
      </div>
      ${p.location ? `<div style="display:flex;align-items:center;gap:9px;color:var(--muted);font-size:13.5px">
        <span style="width:17px;height:17px;display:inline-flex">${I.pin}</span>${p.location}</div>` : ''}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span class="muted" style="font-size:13px">Kuota tersisa: <b style="color:var(--ink)">${sisa}</b></span>
      <span class="muted" style="font-size:13px">${pct}% terisi</span>
    </div>
    <div style="height:8px;background:#edf1f5;border-radius:5px;overflow:hidden;margin-bottom:14px">
      <div style="width:${pct}%;height:100%;background:var(--green);border-radius:5px"></div>
    </div>
    <button class="btn outline" style="height:48px;font-size:15px" onclick="pelatihanDaftar(${p.id || 0})">Daftar</button>
  </div>`;
}
function pelatihanDaftar(id) {
  toast('Berhasil mendaftar');
}
function loadPelatihan() {
  if (typeof API === 'undefined' || !API.token) return;
  API.pelatihanList().then(d => {
    if (_ftRoute() !== 'pelatihan') return;
    const box = document.getElementById('pelatihanRows');
    if (!box || !d || !Array.isArray(d.rows)) return;
    box.innerHTML = d.rows.length ? d.rows.map(pelatihanCard).join('') : _ftEmpty('Belum ada pelatihan tersedia.');
  }).catch(() => {
    const box = document.getElementById('pelatihanRows');
    if (box) box.innerHTML = _ftErr('Periksa koneksi internet Anda.');
  });
}
Views.pelatihan = () => {
  loadPelatihan();
  return `
<div class="screen white no-tab">
  ${topbar('Pelatihan')}
  <div class="body" style="padding-top:8px">
    <p class="muted" style="font-size:14px;margin:4px 0 16px">Tingkatkan kompetensi Anda melalui program pelatihan perusahaan.</p>
    <div id="pelatihanRows">${_ftLoad()}</div>
  </div>
</div>`;
};

/* ═══ KPI ═══ */
function kpiBarColor(pct) {
  if (pct >= 90) return 'var(--green)';
  if (pct >= 70) return '#2e9bf6';
  return 'var(--orange)';
}
function loadKpi() {
  if (typeof API === 'undefined' || !API.token) return;
  API.kpi().then(d => {
    if (_ftRoute() !== 'kpi') return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const skor = Number((d && (d.overall ?? d.score)) || 0);
    set('kpiScore', skor);
    set('kpiPeriode', (d && d.period) || labelBulan(bulanIni()));
    const bar = document.getElementById('kpiBar');
    if (bar) bar.style.width = Math.min(100, Math.max(0, skor)) + '%';
    const cats = (d && Array.isArray(d.items)) ? d.items : (Array.isArray(d.categories) ? d.categories : []);
    const box = document.getElementById('kpiCats');
    if (box && !cats.length) {
      box.innerHTML = '<p class="muted center" style="padding:24px;font-size:14px">Belum ada penilaian KPI periode ini.</p>';
    } else if (box && cats.length) {
      box.innerHTML = cats.map(c => {
        const s = Number(c.score) || 0, t = Number(c.target) || 100;
        const pct = t ? Math.min(100, Math.round(s / t * 100)) : 0;
        return `<div class="card" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <b style="font-size:15.5px">${c.category || c.name || 'Kategori'}</b>
            <span style="font-weight:800;font-size:15px;color:${kpiBarColor(pct)}">${s}<span class="muted" style="font-weight:400;font-size:13px">/${t}</span></span>
          </div>
          <div style="height:10px;background:#edf1f5;border-radius:6px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${kpiBarColor(pct)};border-radius:6px"></div>
          </div>
          <div class="muted" style="font-size:13px;margin-top:8px">${pct}% dari target</div>
        </div>`;
      }).join('');
    }
  }).catch(() => {
    const box = document.getElementById('kpiCats');
    if (box) box.innerHTML = _ftErr('Periksa koneksi internet Anda.');
  });
}
Views.kpi = () => {
  loadKpi();
  return `
<div class="screen">
  <div class="ghead round">
    <h1>KPI</h1>
    <p>Penilaian kinerja Anda.</p>
  </div>
  <div class="body" style="display:flex;flex-direction:column">
    <div class="card" style="margin-top:-26px;position:relative;z-index:1;text-align:center">
      <div class="muted" style="font-size:13.5px">Skor keseluruhan</div>
      <div style="font-size:56px;font-weight:800;color:var(--green);line-height:1.15" id="kpiScore">0</div>
      <div class="muted" style="font-size:13.5px" id="kpiPeriode"></div>
      <div style="height:10px;background:#edf1f5;border-radius:6px;overflow:hidden;margin:16px 0 6px">
        <div id="kpiBar" style="width:0%;height:100%;background:var(--green);border-radius:6px;transition:width .6s"></div>
      </div>
    </div>
    <div class="sect-head"><h3>Per kategori</h3></div>
    <div id="kpiCats">${_ftLoad()}</div>
  </div>
</div>`;
};

/* ═══ TIM ═══ */
function timRow(m) {
  const online = String(m.status || '').toLowerCase().indexOf('online') !== -1
    || String(m.status || '').toLowerCase().indexOf('aktif') !== -1;
  return `<div class="row-card">
    <div style="position:relative;flex-shrink:0">${_ftAvatar(m.name)}
      <span style="position:absolute;bottom:2px;right:2px;width:13px;height:13px;border-radius:50%;background:${online ? 'var(--green)' : '#c3ccd6'};border:2.5px solid #fff"></span>
    </div>
    <div class="grow"><h4>${m.name || '-'}</h4><div class="sub">${m.position || m.role || ''}</div></div>
    <span class="pill ${online ? 'green' : 'gray'}">${online ? 'Online' : 'Offline'}</span>
  </div>`;
}
function loadTim() {
  if (typeof API === 'undefined' || !API.token) return;
  API.timList().then(d => {
    if (_ftRoute() !== 'tim') return;
    const box = document.getElementById('timRows');
    if (!box || !d || !Array.isArray(d.rows)) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('timCount', d.rows.length + ' anggota');
    box.innerHTML = d.rows.length ? d.rows.map(timRow).join('') : _ftEmpty('Belum ada anggota tim.');
  }).catch(() => {
    const box = document.getElementById('timRows');
    if (box) box.innerHTML = _ftErr('Periksa koneksi internet Anda.');
  });
}
Views.tim = () => {
  loadTim();
  return `
<div class="screen white no-tab">
  ${topbar('Tim')}
  <div class="body" style="padding-top:8px">
    <p class="muted" style="font-size:14px;margin:4px 0 16px" id="timCount"></p>
    <div id="timRows">${_ftLoad()}</div>
  </div>
</div>`;
};

/* ═══ PENGHARGAAN ═══ */
function penghargaanCard(p) {
  return `<div class="row-card">
    <span class="tile" style="width:54px;height:54px;border-radius:17px;background:#fef6e6">
      <span style="width:26px;height:26px;display:inline-flex;color:#e8830c">${I.medal}</span>
    </span>
    <div class="grow"><h4>${p.title || 'Penghargaan'}</h4>
      <div class="sub">Dari ${p.giver || p.from || '-'} · ${fmtTgl(p.date || p.created_at)}</div></div>
  </div>`;
}
function loadPenghargaan() {
  if (typeof API === 'undefined' || !API.token) return;
  API.penghargaanList().then(d => {
    if (_ftRoute() !== 'penghargaan') return;
    const box = document.getElementById('penghargaanRows');
    if (!box || !d || !Array.isArray(d.rows)) return;
    box.innerHTML = d.rows.length ? d.rows.map(penghargaanCard).join('') : _ftEmpty('Belum ada penghargaan.');
  }).catch(() => {
    const box = document.getElementById('penghargaanRows');
    if (box) box.innerHTML = _ftErr('Periksa koneksi internet Anda.');
  });
}
Views.penghargaan = () => {
  loadPenghargaan();
  return `
<div class="screen white no-tab">
  ${topbar('Penghargaan')}
  <div class="body" style="padding-top:8px">
    <p class="muted" style="font-size:14px;margin:4px 0 16px">Apresiasi atas kontribusi terbaik Anda.</p>
    <div id="penghargaanRows">${_ftLoad()}</div>
  </div>
</div>`;
};

/* ═══ PENGUMUMAN ═══ */
function pengumumanCard(p) {
  const pinned = !!(p.pinned || p.is_pinned);
  return `<div class="card" style="margin-bottom:12px;${pinned ? 'border:1.5px solid var(--green)' : ''}">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      ${pinned ? `<span style="width:18px;height:18px;display:inline-flex;color:var(--green)">${I.pin}</span>` : ''}
      <b style="font-size:16px">${p.title || 'Pengumuman'}</b>
    </div>
    ${p.content || p.message ? `<p style="font-size:14px;color:var(--ink-2);line-height:1.6;margin:0 0 10px">${p.content || p.message}</p>` : ''}
    <div class="muted" style="font-size:13px">${fmtTgl(p.date || p.created_at)}${p.author ? ' · ' + p.author : ''}</div>
  </div>`;
}
function loadPengumuman() {
  if (typeof API === 'undefined' || !API.token) return;
  API.pengumumanList().then(d => {
    if (_ftRoute() !== 'pengumuman') return;
    const box = document.getElementById('pengumumanRows');
    if (!box || !d || !Array.isArray(d.rows)) return;
    const rows = d.rows.slice().sort((a, b) => ((b.pinned || b.is_pinned) ? 1 : 0) - ((a.pinned || a.is_pinned) ? 1 : 0));
    box.innerHTML = rows.length ? rows.map(pengumumanCard).join('') : _ftEmpty('Belum ada pengumuman.');
  }).catch(() => {
    const box = document.getElementById('pengumumanRows');
    if (box) box.innerHTML = _ftErr('Periksa koneksi internet Anda.');
  });
}
Views.pengumuman = () => {
  loadPengumuman();
  return `
<div class="screen white no-tab">
  ${topbar('Pengumuman')}
  <div class="body" style="padding-top:8px">
    <p class="muted" style="font-size:14px;margin:4px 0 16px">Informasi resmi dari perusahaan.</p>
    <div id="pengumumanRows">${_ftLoad()}</div>
  </div>
</div>`;
};
