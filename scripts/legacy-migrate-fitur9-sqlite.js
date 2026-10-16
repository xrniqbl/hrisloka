/**
 * LEGACY — SQLite prototype migration (better-sqlite3), NOT used by the app.
 * Moved out of api/ so server/index.js loadHandler() can never import-run it.
 * The production app is Supabase multi-tenant; this file has no company_id
 * columns and must never be wired to a route. Kept for reference only.
 *
 * migrate-fitur9.js — migrasi idempotent untuk 8 fitur baru PWA.
 * Membuat tabel (IF NOT EXISTS) + seed data awal.
 *
 * Cara pakai:
 *   DB_PATH=/var/www/kinikerja/data/kinikerja.db node scripts/legacy-migrate-fitur9-sqlite.js
 *   (default DB_PATH = /var/www/kinikerja/data/kinikerja.db)
 */
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || '/var/www/kinikerja/data/kinikerja.db';
const db = new Database(DB_PATH);

db.exec(`
CREATE TABLE IF NOT EXISTS cash_advances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS overtime (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  hours REAL NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS trainings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  provider TEXT,
  date TEXT,
  duration TEXT,
  location TEXT,
  slots INTEGER DEFAULT 0,
  enrolled INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open'
);
CREATE TABLE IF NOT EXISTS kpi_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  target INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT,
  avatar_initials TEXT,
  status TEXT DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS awards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  given_by TEXT,
  date TEXT,
  description TEXT
);
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT,
  date TEXT,
  pinned INTEGER DEFAULT 0
);
`);
console.log('[migrate] tabel fitur9 siap');

function seedIfEmpty(table, rows, insertSql) {
  const n = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
  if (n > 0) {
    console.log(`[migrate] ${table}: sudah ada ${n} baris — seed dilewati`);
    return;
  }
  const stmt = db.prepare(insertSql);
  const tx = db.transaction((list) => { for (const r of list) stmt.run(...r); });
  tx(rows);
  console.log(`[migrate] ${table}: seed ${rows.length} baris`);
}

// ── pelatihan (5) ──
seedIfEmpty('trainings', [
  ['Leadership Essentials', 'KiniKerja Academy', '2026-11-05', '2 hari', 'Jakarta — Ruang 3A', 30, 18, 'open'],
  ['Advanced Excel untuk HR', 'Bina Talenta', '2026-11-12', '1 hari', 'Online (Zoom)', 50, 32, 'open'],
  ['Komunikasi Efektif di Tempat Kerja', 'KiniKerja Academy', '2026-11-19', '1 hari', 'Bandung — Hub', 25, 25, 'full'],
  ['Dasar Analitik Data SDM', 'DataPro Institute', '2026-12-02', '3 hari', 'Jakarta — Ruang 3A', 20, 7, 'open'],
  ['Manajemen Waktu & Produktivitas', 'Bina Talenta', '2026-12-09', '1 hari', 'Online (Zoom)', 50, 11, 'open'],
], 'INSERT INTO trainings (title,provider,date,duration,location,slots,enrolled,status) VALUES (?,?,?,?,?,?,?,?)');

// ── KPI untuk employee id 1 (5 kategori, periode Q3 2026) ──
// ── penghargaan untuk employee id 1 (2) ──
// (hanya di-seed bila employee id 1 ada — hindari FK error di DB kosong)
const empTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'").get();
const emp1 = empTable ? db.prepare('SELECT id FROM employees WHERE id = 1').get() : null;
if (emp1) {
seedIfEmpty('kpi_scores', [
  [1, 'Q3 2026', 'Kualitas Kerja', 90, 85],
  [1, 'Q3 2026', 'Ketepatan Waktu', 88, 90],
  [1, 'Q3 2026', 'Kerja Sama Tim', 92, 85],
  [1, 'Q3 2026', 'Inisiatif', 82, 80],
  [1, 'Q3 2026', 'Kehadiran', 85, 95],
], 'INSERT INTO kpi_scores (employee_id,period,category,score,target) VALUES (?,?,?,?,?)');
seedIfEmpty('awards', [
  [1, 'Karyawan Terbaik Q2 2026', 'Direksi', '2026-07-15', 'Pencapaian target desain 120% selama kuartal 2'],
  [1, 'Inovasi Terbaik 2025', 'HRD', '2025-12-20', 'Usulan sistem desain yang diadopsi seluruh tim produk'],
], 'INSERT INTO awards (employee_id,title,given_by,date,description) VALUES (?,?,?,?,?)');
} else {
  console.log('[migrate] employee id 1 tidak ada — seed kpi_scores & awards dilewati');
}

// ── tim (6 anggota) ──
seedIfEmpty('team_members', [
  ['Rina Putri', 'Senior Designer', 'RP', 'active'],
  ['Budi Santoso', 'HR Manager', 'BS', 'active'],
  ['Sari Wijaya', 'Product Manager', 'SW', 'active'],
  ['Andi Pratama', 'Frontend Developer', 'AP', 'active'],
  ['Dewi Lestari', 'Finance Staff', 'DL', 'cuti'],
  ['Rizky Ramadhan', 'QA Engineer', 'RR', 'active'],
], 'INSERT INTO team_members (name,role,avatar_initials,status) VALUES (?,?,?,?)');

// ── pengumuman (3) ──
seedIfEmpty('announcements', [
  ['Jadwal Libur Akhir Tahun', 'Kantor tutup 24 Des 2026 – 1 Jan 2027. Piket diatur masing-masing divisi.', '2026-10-10', 1],
  ['Family Day 2026', 'Family Day diadakan 14 Nov 2026 di Taman Mini. Daftar sebelum 20 Okt di menu Acara.', '2026-10-08', 0],
  ['Pembaruan Kebijakan Cuti', 'Mulai 2026, sisa cuti maksimal 6 hari dapat dibawa ke tahun berikutnya.', '2026-10-01', 0],
], 'INSERT INTO announcements (title,body,date,pinned) VALUES (?,?,?,?)');

console.log('[migrate] selesai');
