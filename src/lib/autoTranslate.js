/**
 * autoTranslate.js
 * Global DOM i18n for pages with hardcoded Indonesian UI text.
 * - Exact + longest-phrase matching (ID ↔ EN)
 * - Stores original text for clean reverse translation
 * - Also translates placeholder / title / aria-label
 */
const ID_TO_EN = {
  // ═══ Auto-generated from i18n.jsx ═══
  'Hapus proyek ini? Semua assignment & timesheet terkait akan ikut terhapus.': 'Delete this project? All related assignments & timesheets will also be deleted.',
  'Tanggal,Karyawan,Proyek,Klien,Jam,Tertagih,Tarif,Pendapatan,Deskripsi': 'Date,Employee,Project,Client,Hours,Billable,Rate,Revenue,Description',
  'Tidak bisa dihapus. Masih ada {count} karyawan di departemen ini.': 'Cannot delete. There are still {count} employees in this department.',
  'Anda tidak memiliki izin untuk mengakses halaman ini.': 'You do not have permission to access this page.',
  'Karyawan dengan alokasi >100% berisiko burnout': 'Employees with allocation >100% are at risk of burnout',
  'Kelola permintaan yang memerlukan persetujuan': 'Manage requests requiring approval',
  'Penjelasan singkat fungsi departemen ini...': 'Brief description of department function...',
  'Fitur kecerdasan buatan dan developer tools': 'Artificial intelligence features and developer tools',
  'Kelola permintaan perubahan data karyawan': 'Manage employee data change requests',
  'Absensi berbasis lokasi dengan geofencing': 'Location-based attendance with geofencing',
  'Kelola pengajuan cuti dan izin karyawan': 'Manage employee leave and permission requests',
  'Pantau indikator kinerja utama karyawan': 'Monitor key employee performance indicators',
  'Kelola proses onboarding karyawan baru': 'Manage new employee onboarding process',
  'Pemindaian struk dan kuitansi otomatis': 'Automatic receipt and invoice scanning',
  'Kelola pencatatan waktu kerja karyawan': 'Manage work time tracking',
  'Kelola cabang dan lokasi perusahaan': 'Manage company branches and locations',
  'Kelola pinjaman dan kasbon karyawan': 'Manage employee loans and advances',
  'Kelola proses offboarding karyawan': 'Manage employee offboarding process',
  'Kelola pengajuan penggantian biaya': 'Manage expense reimbursement requests',
  'Hubungkan dengan layanan eksternal': 'Connect with external services',
  'Kelola slip gaji digital karyawan': 'Manage digital employee payslips',
  'Klik "Proyek Baru" untuk memulai.': 'Click "New Project" to start.',
  'Kelola penilaian kinerja karyawan': 'Manage employee performance reviews',
  'Kelola program pelatihan karyawan': 'Manage employee training programs',
  'Kelola pengaturan akun dan sistem': 'Manage account and system settings',
  'Kelola pengajuan lembur karyawan': 'Manage employee overtime requests',
  'Kelola data karyawan perusahaan': 'Manage company employee data',
  'Cari nama, email, departemen...': 'Search name, email, department...',
  'Kelola daftar divisi perusahaan': 'Manage company divisions',
  'Singkatan unik untuk departemen': 'Unique abbreviation for this department',
  'Visualisasi hierarki perusahaan': 'Company hierarchy visualization',
  'Kelola inventaris perangkat IT': 'Manage IT device inventory',
  'Buat laporan dan analisis data': 'Create reports and data analysis',
  'Kelola lowongan dan rekrutmen': 'Manage openings and recruitment',
  'Kelola jadwal shift karyawan': 'Manage employee shift schedules',
  'Kelola pengumuman perusahaan': 'Manage company announcements',
  'Kelola proyek dan penugasan': 'Manage projects and assignments',
  'Kelola penggajian karyawan': 'Manage employee payroll',
  'Kelola kalender hari libur': 'Manage holiday calendar',
  'Pantau kehadiran karyawan': 'Monitor employee attendance',
  'Kelola kandidat rekrutmen': 'Manage recruitment candidates',
  'Riwayat aktivitas sistem': 'System activity history',
  'Kelola dokumen kebijakan': 'Manage policy documents',
  'Kelola dokumen karyawan': 'Manage employee documents',
  'Kelola tiket bantuan IT': 'Manage IT support tickets',
  'Tambah Departemen Baru': 'Add New Department',
  'Nama kepala departemen': 'Department head name',
  'Pemantauan Beban Kerja': 'Workload Monitoring',
  'Hapus departemen ini?': 'Delete this department?',
  'Ajukan Reimbursement': 'Submit Reimbursement',
  'Pencatatan Jam Kerja': 'Timesheets',
  'Kebijakan Perusahaan': 'Company Policies',
  'Struktur Organisasi': 'Organization Chart',
  'Ringkasan Kehadiran': 'Attendance Overview',
  'Kalender perusahaan': 'Company calendar',
  'Cari departemen...': 'Search departments...',
  'Tambah Cabang Baru': 'Add New Branch',
  'Tarif per Jam (Rp)': 'Hourly Rate (Rp)',
  'Pinjaman / Kasbon': 'Loans',
  'Pipeline Kandidat': 'Candidate Pipeline',
  'Aktivitas Terbaru': 'Recent Activity',
  'Master Departemen': 'Department Master',
  'Kepala Departemen': 'Department Head',
  'Manajemen Dokumen': 'Document Management',
  'Tambah Hari Libur': 'Add Holiday',
  'Perubahan Profil': 'Profile Changes',
  'Manajemen Proyek': 'Project Management',
  'Manajemen Cabang': 'Branch Management',
  'Tambah Checklist': 'Add Checklist',
  'Belum ada proyek': 'No projects yet',
  'Manajemen Shift': 'Shift Management',
  'Tidak ditemukan': 'Not found',
  'Statistik Cepat': 'Quick Stats',
  'Tambah Karyawan': 'Add Employee',
  'Edit Departemen': 'Edit Department',
  'Nama Departemen': 'Department Name',
  'Kode Departemen': 'Department Code',
  'Tanggal Selesai': 'End Date',
  'Timeline Proyek': 'Project Timeline',
  'Buat Pengumuman': 'Create Announcement',
  'Absensi Harian': 'Daily Attendance',
  'Pencatatan Jam': 'Timesheets',
  'Belum ada data': 'No data available',
  'Selamat Datang': 'Welcome',
  'Total Karyawan': 'Total Employees',
  'Hadir Hari Ini': 'Present Today',
  'Cari cabang...': 'Search branches...',
  'Unggah Dokumen': 'Upload Document',
  'Lowongan Kerja': 'Job Postings',
  'Data Karyawan': 'Employee Data',
  'Kontrak Kerja': 'Employment Contracts',
  'Tanggal Mulai': 'Start Date',
  'Akses Ditolak': 'Access Denied',
  'Cuti Pending': 'Pending Leave',
  'Tambah Shift': 'Add Shift',
  'Cuti Tahunan': 'Annual Leave',
  'Izin Pribadi': 'Personal Leave',
  'Buat Payslip': 'Generate Payslip',
  'Pindai Struk': 'Scan Receipt',
  'Persetujuan': 'Approvals',
  'Cuti & Izin': 'Leave & Permission',
  'Geo-Absensi': 'Geo-Attendance',
  'Daftar Gaji': 'Salary List',
  'Berlangsung': 'In Progress',
  'Selanjutnya': 'Next',
  'Edit Cabang': 'Edit Branch',
  'Nama Cabang': 'Branch Name',
  'Tidak Hadir': 'Absent',
  'Proses Gaji': 'Process Payroll',
  'Gaji Bersih': 'Net Salary',
  'Nama Proyek': 'Project Name',
  'Alokasi (%)': 'Allocation (%)',
  'Departemen': 'Departments',
  'Hari Libur': 'Holidays',
  'Pengumuman': 'Announcements',
  'Pengaturan': 'Settings',
  'Menu Utama': 'Main Menu',
  'Sebelumnya': 'Previous',
  'Konfirmasi': 'Confirm',
  'Diperbarui': 'Updated',
  'Jam Lembur': 'Overtime Hours',
  'Jam Keluar': 'Clock Out',
  'Jenis Cuti': 'Leave Type',
  'Gaji Pokok': 'Basic Salary',
  'Buat Tiket': 'Create Ticket',
  'Notifikasi': 'Notifications',
  'Mode Gelap': 'Dark Mode',
  'Kehadiran': 'Attendance',
  'Rekrutmen': 'Recruitment',
  'Pelatihan': 'Training',
  'Integrasi': 'Integrations',
  'Kebijakan': 'Policies',
  'Memuat...': 'Loading...',
  'Disetujui': 'Approved',
  'Terlambat': 'Late',
  'Jam Masuk': 'Clock In',
  'Sisa Cuti': 'Leave Balance',
  'Tunjangan': 'Allowances',
  'Prioritas': 'Priority',
  'Assign ke': 'Assign to',
  'Role Anda': 'Your Role',
  'Pengajuan': 'Submissions',
  'Performa': 'Performance',
  'Lowongan': 'Job Postings',
  'Kalender': 'Calendar',
  'Kategori': 'Category',
  'Menunggu': 'Pending',
  'Nonaktif': 'Inactive',
  'Potongan': 'Deductions',
  'Keamanan': 'Security',
  'Tampilan': 'Appearance',
  'Dokumen': 'Documents',
  'Aset IT': 'IT Assets',
  'Tanggal': 'Date',
  'Catatan': 'Notes',
  'Setujui': 'Approve',
  'Ditolak': 'Rejected',
  'Kembali': 'Back',
  'Cabang': 'Branches',
  'Lembur': 'Overtime',
  'Simpan': 'Save',
  'Tambah': 'Add',
  'Ekspor': 'Export',
  'Jumlah': 'Amount',
  'Unggah': 'Upload',
  'Detail': 'Details',
  'Dibuat': 'Created',
  'Sampai': 'To',
  'Alamat': 'Address',
  'Alasan': 'Reason',
  'Bahasa': 'Language',
  'Jadwal': 'Schedule',
  'Profil': 'Profile',
  'Batal': 'Cancel',
  'Hapus': 'Delete',
  'Semua': 'All',
  'Tolak': 'Reject',
  'Aktif': 'Active',
  'Tutup': 'Close',
  'Kirim': 'Submit',
  'Lihat': 'View',
  'Unduh': 'Download',
  'Tidak': 'No',
  'Pilih': 'Select',
  'Hadir': 'Present',
  'Sakit': 'Sick Leave',
  'Warna': 'Color',
  'Cari': 'Search',
  'Nama': 'Name',
  'Tipe': 'Type',
  'Dari': 'From',
  'Kota': 'City',
  'Hari': 'Days',
  'Akun': 'Account',
  'Jam': 'Hours',
  'Ya': 'Yes',

  // ═══ Extra UI phrases (pages + CTAs) ═══
  'Export Payroll': 'Export Payroll',
  'Ekspor Payroll': 'Export Payroll',
  'Publikasi ke PWA': 'Publish to PWA',
  'Menyimpan...': 'Saving...',
  'Export CSV': 'Export CSV',
  'Ekspor CSV': 'Export CSV',
  'Export Excel': 'Export Excel',
  'Ekspor Excel': 'Export Excel',
  'Muat ulang': 'Reload',
  'Muat Ulang': 'Reload',
  'Tambah Aset': 'Add Asset',
  'Tambah Skill': 'Add Skill',
  'Submit Tiket': 'Submit Ticket',
  'Tandai Resolved': 'Mark Resolved',
  'Catat Lembur': 'Log Overtime',
  'Ajukan Cuti': 'Apply Leave',
  'Ajukan Lembur': 'Apply Overtime',
  'Ajukan Pinjaman': 'Apply Loan',
  'Ajukan pinjaman': 'Apply for loan',
  'Tambah Cabang': 'Add Branch',
  'Tambah Departemen': 'Add Department',
  'Tambah Kebijakan': 'Add Policy',
  'Tambah Pelatihan': 'Add Training',
  'Tambah Karyawan Baru': 'Add New Employee',
  'Edit Karyawan': 'Edit Employee',
  'Buat Appraisal': 'Create Appraisal',
  'Buat Kontrak': 'Create Contract',
  'Buat Lowongan': 'Create Job Posting',
  'Proyek Baru': 'New Project',
  'Terapkan Filter': 'Apply Filter',
  'Dari tanggal': 'Start date',
  'Sampai tanggal': 'End date',
  'Pilih tanggal': 'Select date',
  'Pilih tanggal mulai': 'Select start date',
  'Pilih tanggal selesai': 'Select end date',
  'Pilih tanggal libur': 'Select holiday date',
  'Total Jam': 'Total Hours',
  'Jam Tertagih': 'Billable Hours',
  'Billable Hours': 'Billable Hours',
  'Pendapatan': 'Revenue',
  'Revenue': 'Revenue',
  'Ringkasan Tagihan per Klien': 'Invoice Summary by Client',
  'Belum ada data timesheet': 'No timesheet data yet',
  'Catatan jam kerja karyawan dari PWA akan muncul di sini.': 'Employee work hour logs from the PWA will appear here.',
  'Catatan jam kerja karyawan dari aplikasi akan muncul di sini.': 'Employee work hour logs from the app will appear here.',
  'Office Location': 'Office Location',
  'Atur lokasi kantor': 'Set office location',
  'Atur Office Location': 'Set Office Location',
  'Lokasi kantor belum diset': 'Office location not set',
  'Office Radius Zone': 'Office Radius Zone',
  'Dalam Radius': 'Within Radius',
  'Di Luar Radius': 'Outside Radius',
  'Face Verified': 'Face Verified',
  'Suspicious': 'Suspicious',
  'Total Clock-In': 'Total Clock-In',
  'In Zone': 'In Zone',
  'Out of Zone': 'Out of Zone',
  'Tidak ada data untuk tanggal ini': 'No data for this date',
  'Clock-in dalam radius geofence akan muncul di sini.': 'Clock-ins within the geofence radius will appear here.',
  'Penghasilan Kotor': 'Gross Income',
  'Total Potongan': 'Total Deductions',
  'Biaya Lembur': 'Overtime Cost',
  'Take Home Pay': 'Take Home Pay',
  'Biaya Gaji & Lembur per Divisi': 'Salary & Overtime Cost by Division',
  'Perbandingan biaya per departemen': 'Cost comparison by department',
  'Menunggu Approval': 'Pending Approval',
  'Jam Approved': 'Approved Hours',
  'Total Pinjaman': 'Total Loans',
  'Sisa Aktif': 'Active Balance',
  'Sisa Pinjaman Aktif': 'Active Loan Balance',
  'Total Appraisal': 'Total Appraisals',
  'Rata-rata Rating': 'Average Rating',
  'Total Aset': 'Total Assets',
  'Total Tiket': 'Total Tickets',
  'Total Departemen': 'Total Departments',
  'Total Cabang': 'Total Branches',
  'Total Hari Libur': 'Total Holidays',
  'Mendatang': 'Upcoming',
  'Butuh Bantuan?': 'Need Help?',
  'Buka pusat bantuan kami': 'Open our help center',
  'Your Organization': 'Your Organization',
  'Buat Baru': 'Create New',
  'Cari karyawan, fitur...': 'Search employees, features...',
  'Good Morning': 'Good Morning',
  'Good Afternoon': 'Good Afternoon',
  'Good Evening': 'Good Evening',
  'Selamat Pagi': 'Good Morning',
  'Selamat Siang': 'Good Afternoon',
  'Selamat Sore': 'Good Evening',
  'Selamat Malam': 'Good Evening',
  'Mode Demo — Akses Read-Only. Fitur edit/tambah/hapus dinonaktifkan': 'Demo Mode — Read-Only. Edit/add/delete features are disabled',
  'Pusat Persetujuan': 'Approval Center',
  'Tidak ada pengajuan menunggu': 'No pending requests',
  'Perusahaan belum terhubung': 'Company not linked',
  'Geofencing & Liveness Detection': 'Geofencing & Liveness Detection',
  'IT Asset Management': 'IT Asset Management',
  'Training & Learning': 'Training & Learning',
  'Smart Review Generator': 'Smart Review Generator',
  'View As': 'View As',
  'Founder Portal': 'Founder Portal',
  'Switch to Admin View': 'Switch to Admin View',
  'Sign Out': 'Sign Out',
  'Terang': 'Light',
  'Gelap': 'Dark',
  'Tema terang (default)': 'Light theme (default)',
  'Tema gelap': 'Dark theme',
  'Pilih tema gelap atau terang untuk seluruh dashboard.': 'Choose dark or light theme for the entire dashboard.',
  'Informasi Akun': 'Account Information',
  'Keamanan Akun': 'Account Security',
  'Password Saat Ini': 'Current Password',
  'Password Baru': 'New Password',
  'Konfirmasi Password Baru': 'Confirm New Password',
  'Tersimpan!': 'Saved!',
  'Simpan Perubahan': 'Save Changes',
  'Nama Lengkap': 'Full Name',
  'No. Telepon': 'Phone Number',
  'Jabatan': 'Position',
  'Email tidak dapat diubah dari sini.': 'Email cannot be changed here.',
  'Berjalan': 'Running',
  'entri': 'entries',
  'tertagih': 'billable',
  'billable': 'billable',
  'Proyek': 'Project',
  'Karyawan': 'Employee',
  'Klien': 'Client',
  'Mulai': 'Start',
  'Selesai': 'End',
  'Deskripsi': 'Description',
  'Tarif': 'Rate',
  'Tertagih': 'Billable',
  'Present Today': 'Present Today',
  'On Leave': 'On Leave',
  'Payroll This Month': 'Payroll This Month',
  'Open Positions': 'Open Positions',
  'Contract Expiring': 'Contract Expiring',
  'Total Employees': 'Total Employees',
  'My Task': 'My Task',
  'Time Off': 'Time Off',
  'Running Project': 'Running Project',
  'Meetings': 'Meetings',
  'Employee': 'Employee',
  'Mark as completed': 'Mark as completed',
  'Tidak ada tugas pending': 'No pending tasks',
  'Semua pengajuan sudah diproses.': 'All requests have been processed.',
  'Pusat persetujuan': 'Approval center',
  'Belum ada project aktif': 'No active projects',
  'Tidak ada meeting mendatang': 'No upcoming meetings',
  'Buka kalender': 'Open calendar',
  'Belum ada data karyawan': 'No employee data yet',
  'Kelola karyawan': 'Manage employees',
  'Confirmed': 'Confirmed',
  'Pending': 'Pending',
  'Rejected': 'Rejected',
  'Sick': 'Sick',
  'Annual': 'Annual',
  'Casual': 'Casual',
  'In Progress': 'In Progress',
  'Todo': 'Todo',
  'Member': 'Member',
  'Internal Team': 'Internal Team',
  'Outsource': 'Outsource',
  'Gagal menyimpan:': 'Failed to save:',
  'Gagal:': 'Failed:',
  'Gagal: akun belum terhubung ke perusahaan (company_id).': 'Failed: account is not linked to a company (company_id).',
  'Gagal: tidak ada data karyawan untuk dipublikasi.': 'Failed: no employee data to publish.',
  'Detail Clock-In': 'Clock-In Detail',
  'Dalam zona kantor': 'Inside office zone',
  'Di luar zona kantor': 'Outside office zone',
  'Selfie Only': 'Selfie Only',
  'Trust Score': 'Trust Score',
  'Security Flags': 'Security Flags',
  'Pengaturan Lokasi Kantor': 'Office Location Settings',
  'Klik pada peta untuk menentukan lokasi kantor': 'Click the map to set office location',
  'Verified': 'Verified',
  'Selfie': 'Selfie',
  'Koordinat': 'Coordinates',
  'Radius': 'Radius',
  'Aksi': 'Actions',
  'Clock-In': 'Clock-In',
  'Latitude': 'Latitude',
  'Longitude': 'Longitude',
  'Dalam Radius?': 'Within Radius?',
  'Face ID': 'Face ID',

};

// Prefer longer phrases first
const ID_KEYS_SORTED = Object.keys(ID_TO_EN).sort((a, b) => b.length - a.length);
const EN_TO_ID = Object.fromEntries(
  Object.entries(ID_TO_EN).map(([id, en]) => [en, id])
);
const EN_KEYS_SORTED = Object.keys(EN_TO_ID).sort((a, b) => b.length - a.length);

/** @type {WeakMap<Text, string>} */
const originalText = new WeakMap();
/** @type {WeakMap<Element, Record<string, string>>} */
const originalAttrs = new WeakMap();

let _observer = null;
let _currentLang = 'id';
let _busy = false;

const ATTRS = ['placeholder', 'title', 'aria-label', 'aria-placeholder'];

function applyMap(text, keys, map) {
  if (!text) return text;
  let out = text;
  for (const k of keys) {
    if (!k || k.length < 1) continue;
    if (out.includes(k)) {
      out = out.split(k).join(map[k]);
    }
  }
  return out;
}

function translateString(text, toLang) {
  if (!text || !String(text).trim()) return text;
  if (toLang === 'en') return applyMap(text, ID_KEYS_SORTED, ID_TO_EN);
  return applyMap(text, EN_KEYS_SORTED, EN_TO_ID);
}

function shouldSkipElement(el) {
  if (!el || !el.tagName) return true;
  const tag = el.tagName.toLowerCase();
  if (['script', 'style', 'code', 'pre', 'noscript', 'svg', 'path', 'canvas'].includes(tag)) return true;
  if (el.closest?.('[data-no-i18n], code, pre, .monaco-editor, .ProseMirror')) return true;
  return false;
}

function translateTextNode(textNode, toLang) {
  const parent = textNode.parentElement;
  if (!parent || shouldSkipElement(parent)) return;

  if (!originalText.has(textNode)) {
    originalText.set(textNode, textNode.textContent);
  }
  const base = originalText.get(textNode);
  if (toLang === 'id') {
    if (textNode.textContent !== base) textNode.textContent = base;
    return;
  }
  const next = translateString(base, 'en');
  if (next !== textNode.textContent) textNode.textContent = next;
}

function translateAttributes(el, toLang) {
  if (!el?.getAttribute || shouldSkipElement(el)) return;
  if (!originalAttrs.has(el)) {
    const snap = {};
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v) snap[a] = v;
    }
    if (Object.keys(snap).length) originalAttrs.set(el, snap);
  }
  const snap = originalAttrs.get(el);
  if (!snap) return;
  for (const [a, orig] of Object.entries(snap)) {
    if (toLang === 'id') {
      if (el.getAttribute(a) !== orig) el.setAttribute(a, orig);
    } else {
      const tr = translateString(orig, 'en');
      if (el.getAttribute(a) !== tr) el.setAttribute(a, tr);
    }
  }
}

/**
 * Translate subtree (or whole body)
 */
export function translateDOM(root = document.body, toLang = 'en') {
  if (!root || _busy) return;
  _busy = true;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
        if (!node.textContent || node.textContent.trim().length < 1) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach((tn) => translateTextNode(tn, toLang));

    // attributes
    const els = root.querySelectorAll
      ? root.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(','))
      : [];
    els.forEach((el) => translateAttributes(el, toLang));
    if (root.nodeType === 1) translateAttributes(root, toLang);
  } finally {
    _busy = false;
  }
}

function setupObserver(lang) {
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }
  if (lang === 'id') return;

  _observer = new MutationObserver((mutations) => {
    if (_busy) return;
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) translateDOM(node, lang);
        else if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, lang);
      });
    }
  });
  _observer.observe(document.body, { childList: true, subtree: true });
}

function applyLang(lang) {
  const next = lang === 'en' ? 'en' : 'id';
  _currentLang = next;
  translateDOM(document.body, next);
  setupObserver(next);
}

function initAutoTranslate() {
  const htmlObserver = new MutationObserver(() => {
    const lang = document.documentElement.getAttribute('data-lang') || 'id';
    if (lang === _currentLang) return;
    applyLang(lang);
  });
  htmlObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-lang', 'lang'],
  });

  const initial =
    document.documentElement.getAttribute('data-lang') ||
    localStorage.getItem('hrisync_locale') ||
    localStorage.getItem('hrisync_lang') ||
    'id';

  const run = () => applyLang(initial);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    // wait a tick for React first paint
    setTimeout(run, 0);
  }

  // also re-run after short delay for lazy routes
  setTimeout(() => applyLang(document.documentElement.getAttribute('data-lang') || initial), 400);
  setTimeout(() => applyLang(document.documentElement.getAttribute('data-lang') || initial), 1200);
}

initAutoTranslate();

export { ID_TO_EN, EN_TO_ID };
