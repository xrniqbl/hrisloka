/**
 * autoTranslate.js
 * Sistem auto-translate berbasis DOM mutation observer
 * Bekerja dengan mendeteksi teks Indonesia dan menggantinya ke English saat lang=en
 * 
 * Cara pakai: import './autoTranslate' di main.jsx atau App.jsx
 */

const ID_TO_EN = {
  // ═══ Navigation / Page Titles ═══
  'Dashboard': 'Dashboard',
  'Absensi Harian': 'Daily Attendance',
  'Absensi': 'Attendance',
  'Pengajuan': 'Submissions',
  'Profil': 'Profile',
  'Profil Saya': 'My Profile',
  'Pengaturan': 'Settings',
  'Notifikasi': 'Notifications',
  'Cuti & Izin': 'Leave & Permission',
  'Cuti dan Izin': 'Leave & Permission',
  'Pengumuman': 'Announcements',
  'Pelatihan': 'Training',
  'Proyek': 'Projects',
  'Timesheet': 'Timesheet',
  'Gaji Saya': 'My Salary',
  'E-Payslip': 'E-Payslip',
  'Reimbursement': 'Reimbursement',
  'Lembur': 'Overtime',
  'Pinjaman': 'Loans',
  'Pinjaman / Kasbon': 'Loans',
  'KPI': 'KPI',
  'KPI Tracking': 'KPI Tracking',
  'Aset': 'Assets',
  'Aset IT': 'IT Assets',
  'Helpdesk': 'Helpdesk',
  'Dokumen': 'Documents',
  'Dokumen Saya': 'My Documents',
  'Shift Saya': 'My Shift',
  'Jadwal Shift': 'Shift Schedule',
  'Manajemen Shift': 'Shift Management',
  'Kalender': 'Calendar',
  'Kebijakan': 'Policies',
  'Kebijakan Perusahaan': 'Company Policies',
  'Kontrak': 'Contracts',
  'Kontrak Kerja': 'Employment Contracts',
  'Appraisal': 'Appraisal',
  'Appraisal & Review': 'Appraisal & Review',
  'Onboarding': 'Onboarding',
  'Offboarding': 'Offboarding',
  'Exit Clearance': 'Exit Clearance',
  'Struktur Organisasi': 'Organization Chart',
  'Direktori Perusahaan': 'Company Directory',
  'Data Karyawan': 'Employee Data',
  'Karyawan': 'Employees',
  'Departemen': 'Departments',
  'Cabang': 'Branches',
  'Manajemen Cabang': 'Branch Management',
  'Analitik': 'Analytics',
  'Analytics': 'Analytics',
  'Audit Trail': 'Audit Trail',
  'Integrasi': 'Integrations',
  'Rekrutmen': 'Recruitment',
  'Lowongan Kerja': 'Job Postings',
  'Pipeline Kandidat': 'Candidate Pipeline',
  'Payroll': 'Payroll',
  'Daftar Gaji': 'Salary List',
  'Expense OCR': 'Expense OCR',
  'Geo-Absensi': 'Geo-Attendance',
  'Hari Libur': 'Holidays',
  'AI & Development': 'AI & Development',
  'AI & Dev': 'AI & Dev',

  // ═══ Common Buttons & Labels ═══
  'Simpan': 'Save',
  'Simpan Perubahan': 'Save Changes',
  'Batal': 'Cancel',
  'Hapus': 'Delete',
  'Tambah': 'Add',
  'Tambah Baru': 'Add New',
  'Kirim': 'Submit',
  'Lihat Detail': 'View Detail',
  'Lihat Semua': 'View All',
  'Muat Lebih': 'Load More',
  'Belum ada data': 'No data available',
  'Memuat...': 'Loading...',
  'Kembali': 'Back',
  'Selanjutnya': 'Next',
  'Sebelumnya': 'Previous',
  'Tutup': 'Close',
  'Konfirmasi': 'Confirm',
  'Unduh': 'Download',
  'Unggah': 'Upload',
  'Ekspor': 'Export',
  'Impor': 'Import',
  'Cari': 'Search',
  'Filter': 'Filter',
  'Semua': 'All',
  'Detail': 'Details',
  'Total': 'Total',
  'Ya': 'Yes',
  'Tidak': 'No',
  'Edit': 'Edit',
  'Keluar': 'Logout',
  'Masuk': 'Login',
  'Daftar': 'Register',
  'Perbarui': 'Update',

  // ═══ Status Labels ═══
  'Disetujui': 'Approved',
  'Ditolak': 'Rejected',
  'Menunggu': 'Pending',
  'Aktif': 'Active',
  'Nonaktif': 'Inactive',
  'Selesai': 'Completed',
  'Berlangsung': 'In Progress',
  'Dibatalkan': 'Cancelled',
  'Proses': 'Processing',
  'Baru': 'New',
  'Lama': 'Old',

  // ═══ Field Labels ═══
  'Nama': 'Name',
  'Nama Lengkap': 'Full Name',
  'Jabatan': 'Position',
  'Departemen': 'Department',
  'Tanggal': 'Date',
  'Tanggal Mulai': 'Start Date',
  'Tanggal Selesai': 'End Date',
  'Tanggal Lahir': 'Date of Birth',
  'Alasan': 'Reason',
  'Keterangan': 'Description',
  'Deskripsi': 'Description',
  'Catatan': 'Notes',
  'Jenis': 'Type',
  'Kategori': 'Category',
  'Jumlah': 'Amount',
  'Total Jumlah': 'Total Amount',
  'Perusahaan': 'Company',
  'Email': 'Email',
  'Telepon': 'Phone',
  'Alamat': 'Address',
  'Bahasa': 'Language',
  'Mode Gelap': 'Dark Mode',
  'Tema': 'Theme',
  'Kata Sandi': 'Password',
  'Konfirmasi Kata Sandi': 'Confirm Password',
  'Foto Profil': 'Profile Photo',
  'Jenis Kelamin': 'Gender',
  'Laki-laki': 'Male',
  'Perempuan': 'Female',
  'NIK': 'NIK',
  'NIP': 'NIP',

  // ═══ Attendance ═══
  'Hadir': 'Present',
  'Tidak Hadir': 'Absent',
  'Terlambat': 'Late',
  'Jam Masuk': 'Check In',
  'Jam Keluar': 'Check Out',
  'Tepat Waktu': 'On Time',
  'Izin': 'Permission',
  'Sakit': 'Sick',

  // ═══ Leave ═══
  'Saldo Cuti': 'Leave Balance',
  'Sisa Cuti': 'Remaining Leave',
  'Cuti Tahunan': 'Annual Leave',
  'Cuti Sakit': 'Sick Leave',
  'Izin Pribadi': 'Personal Leave',
  'Cuti Melahirkan': 'Maternity Leave',
  'Cuti Bersama': 'Shared Leave',
  'Hari': 'Days',

  // ═══ Payroll ═══
  'Gaji Pokok': 'Basic Salary',
  'Gaji Bersih': 'Net Salary',
  'Gaji Kotor': 'Gross Salary',
  'Tunjangan': 'Allowance',
  'Potongan': 'Deduction',
  'BPJS': 'BPJS',
  'Pajak': 'Tax',
  'Bulan': 'Month',
  'Tahun': 'Year',

  // ═══ Projects / KPI ═══
  'Prioritas': 'Priority',
  'Tinggi': 'High',
  'Sedang': 'Medium',
  'Rendah': 'Low',
  'Tenggat': 'Deadline',
  'Progress': 'Progress',
  'Target': 'Target',
  'Pencapaian': 'Achievement',
  'Skor': 'Score',
  'Nilai': 'Score',

  // ═══ Approval ═══
  'Setujui': 'Approve',
  'Tolak': 'Reject',
  'Tunda': 'Postpone',
  'Permintaan': 'Request',
  'Persetujuan': 'Approval',
  'Pusat Persetujuan': 'Approval Center',
  
  // ═══ Messages ═══
  'Berhasil disimpan': 'Saved successfully',
  'Berhasil dihapus': 'Deleted successfully',
  'Berhasil diperbarui': 'Updated successfully',
  'Terjadi kesalahan': 'An error occurred',
  'Coba lagi': 'Try again',
  'Data tidak ditemukan': 'Data not found',
  'Tidak ada data': 'No data available',
  'Sedang memuat...': 'Loading...',
  'Mohon tunggu...': 'Please wait...',
};

// Reverse map for EN → ID (not needed but kept for reference)
// const EN_TO_ID = Object.fromEntries(Object.entries(ID_TO_EN).map(([k,v]) => [v,k]));

let _observer = null;
let _currentLang = 'id';

/**
 * Translate a single text node
 */
function translateText(text, toLang) {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();
  
  if (toLang === 'en') {
    return ID_TO_EN[trimmed] ? text.replace(trimmed, ID_TO_EN[trimmed]) : text;
  }
  // id: reverse lookup
  const reverseMap = Object.fromEntries(Object.entries(ID_TO_EN).map(([k,v]) => [v,k]));
  return reverseMap[trimmed] ? text.replace(trimmed, reverseMap[trimmed]) : text;
}

/**
 * Walk the DOM and translate all text nodes
 */
function translateDOM(root = document.body, toLang = 'en') {
  if (!root) return;
  
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip script, style, input values, code blocks
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName?.toLowerCase();
        if (['script','style','code','pre','textarea','input'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        // Only translate if has meaningful text
        if (node.textContent.trim().length < 2) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const nodesToTranslate = [];
  let node;
  while ((node = walker.nextNode())) {
    nodesToTranslate.push(node);
  }

  nodesToTranslate.forEach(textNode => {
    const original = textNode.textContent;
    const translated = translateText(original, toLang);
    if (translated !== original) {
      textNode.textContent = translated;
    }
  });
}

/**
 * Set up MutationObserver to auto-translate new DOM nodes
 */
function setupObserver(lang) {
  if (_observer) {
    _observer.disconnect();
  }
  
  if (lang === 'id') return; // Indonesian is default, no need to translate
  
  _observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          translateDOM(node, lang);
        }
      });
    });
  });

  _observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Main init — watch for lang attribute changes on <html>
 */
function initAutoTranslate() {
  const htmlObserver = new MutationObserver(() => {
    const lang = document.documentElement.getAttribute('data-lang') || 'id';
    if (lang === _currentLang) return;
    _currentLang = lang;
    
    // Re-translate whole DOM
    translateDOM(document.body, lang);
    setupObserver(lang);
  });

  htmlObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-lang'],
  });

  // Apply initial lang
  const initialLang = document.documentElement.getAttribute('data-lang') ||
    localStorage.getItem('hrisync_locale') ||
    localStorage.getItem('hrisync_lang') || 'id';
  
  _currentLang = initialLang;
  
  if (initialLang !== 'id') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => translateDOM(document.body, initialLang));
    } else {
      translateDOM(document.body, initialLang);
    }
    setupObserver(initialLang);
  }
}

// Auto-init when imported
initAutoTranslate();

export { translateDOM, ID_TO_EN };
