/**
 * i18n — Lightweight internationalization system
 * Supports: Bahasa Indonesia (id) and English (en)
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Lazy import to avoid circular — autoTranslate must be loaded first via main.jsx
let _translateDOM = null;
async function getTranslateFn() {
  if (!_translateDOM) {
    try {
      const mod = await import('./autoTranslate.js');
      _translateDOM = mod.translateDOM;
    } catch {}
  }
  return _translateDOM;
}

// ── Translation files ──
const translations = {
 id: {
 // Navigation / Sidebar
 'nav.dashboard': 'Dashboard',
 'nav.approvals': 'Persetujuan',
 'nav.employees': 'Karyawan',
 'nav.employee_data': 'Data Karyawan',
 'nav.departments': 'Departemen',
 'nav.org_chart': 'Struktur Organisasi',
 'nav.documents': 'Dokumen',
 'nav.profile_requests': 'Perubahan Profil',
 'nav.branches': 'Cabang',
 'nav.offboarding': 'Exit Clearance',
 'nav.onboarding': 'Onboarding',
 'nav.attendance': 'Kehadiran',
 'nav.daily_attendance': 'Absensi Harian',
 'nav.shift_management': 'Manajemen Shift',
 'nav.leave': 'Cuti & Izin',
 'nav.geo_attendance': 'Geo-Absensi',
 'nav.overtime': 'Lembur',
 'nav.payroll': 'Payroll',
 'nav.salary_list': 'Daftar Gaji',
 'nav.payslips': 'E-Payslip',
 'nav.reimbursement': 'Reimbursement',
 'nav.expense_ocr': 'Expense OCR',
 'nav.loans': 'Pinjaman / Kasbon',
 'nav.projects': 'Proyek',
 'nav.project_management': 'Manajemen Proyek',
 'nav.timesheets': 'Timesheet',
 'nav.performance': 'Performa',
 'nav.kpi': 'KPI Tracking',
 'nav.appraisal': 'Appraisal',
 'nav.recruitment': 'Rekrutmen',
 'nav.job_postings': 'Lowongan',
 'nav.candidates': 'Pipeline Kandidat',
 'nav.it_support': 'IT & Support',
 'nav.assets': 'Aset IT',
 'nav.helpdesk': 'Helpdesk',
 'nav.ai_capability': 'AI & Dev',
 'nav.training': 'Pelatihan',
 'nav.holidays': 'Hari Libur',
 'nav.calendar': 'Kalender',
 'nav.announcements': 'Pengumuman',
 'nav.audit_trail': 'Audit Trail',
 'nav.analytics': 'Analytics',
 'nav.integrations': 'Integrasi',
 'nav.policies': 'Kebijakan',
 'nav.contracts': 'Kontrak Kerja',
 'nav.settings': 'Pengaturan',
 'nav.main_menu': 'Menu Utama',

 // Common
 'common.save': 'Simpan',
 'common.cancel': 'Batal',
 'common.delete': 'Hapus',
 'common.edit': 'Edit',
 'common.add': 'Tambah',
 'common.search': 'Cari',
 'common.filter': 'Filter',
 'common.export': 'Ekspor',
 'common.loading': 'Memuat...',
 'common.no_data': 'Belum ada data',
 'common.actions': 'Aksi',
 'common.status': 'Status',
 'common.name': 'Nama',
 'common.employee': 'Karyawan',
 'common.date': 'Tanggal',
 'common.amount': 'Jumlah',
 'common.description': 'Deskripsi',
 'common.notes': 'Catatan',
 'common.type': 'Tipe',
 'common.category': 'Kategori',
 'common.all': 'Semua',
 'common.approve': 'Setujui',
 'common.reject': 'Tolak',
 'common.pending': 'Menunggu',
 'common.approved': 'Disetujui',
 'common.rejected': 'Ditolak',
 'common.completed': 'Selesai',
 'common.in_progress': 'Berlangsung',
 'common.active': 'Aktif',
 'common.inactive': 'Nonaktif',
 'common.close': 'Tutup',
 'common.submit': 'Kirim',
 'common.back': 'Kembali',
 'common.next': 'Selanjutnya',
 'common.previous': 'Sebelumnya',
 'common.view': 'Lihat',
 'common.download': 'Unduh',
 'common.upload': 'Unggah',
 'common.yes': 'Ya',
 'common.no': 'Tidak',
 'common.confirm': 'Konfirmasi',
 'common.total': 'Total',
 'common.not_found': 'Tidak ditemukan',
 'common.details': 'Detail',
 'common.created': 'Dibuat',
 'common.updated': 'Diperbarui',
 'common.from': 'Dari',
 'common.to': 'Sampai',
 'common.select': 'Pilih',

 // Dashboard
 'dashboard.title': 'Dashboard',
 'dashboard.welcome': 'Selamat Datang',
 'dashboard.total_employees': 'Total Karyawan',
 'dashboard.present_today': 'Hadir Hari Ini',
 'dashboard.pending_leave': 'Cuti Pending',
 'dashboard.overtime_hours': 'Jam Lembur',
 'dashboard.quick_stats': 'Statistik Cepat',
 'dashboard.recent_activity': 'Aktivitas Terbaru',
 'dashboard.attendance_overview': 'Ringkasan Kehadiran',

 // Employees
 'employees.title': 'Data Karyawan',
 'employees.subtitle': 'Kelola data karyawan perusahaan',
 'employees.add': 'Tambah Karyawan',
 'employees.total': 'Total Karyawan',
 'employees.search_placeholder': 'Cari nama, email, departemen...',

 // Departments
 'departments.title': 'Master Departemen',
 'departments.subtitle': 'Kelola daftar divisi perusahaan',
 'departments.add': 'Tambah Departemen',
 'departments.edit': 'Edit Departemen',
 'departments.add_new': 'Tambah Departemen Baru',
 'departments.name': 'Nama Departemen',
 'departments.code': 'Kode Departemen',
 'departments.head': 'Kepala Departemen',
 'departments.total': 'Total Departemen',
 'departments.total_employees': 'Total Karyawan',
 'departments.search_placeholder': 'Cari departemen...',
 'departments.code_hint': 'Singkatan unik untuk departemen',
 'departments.head_placeholder': 'Nama kepala departemen',
 'departments.desc_placeholder': 'Penjelasan singkat fungsi departemen ini...',
 'departments.cannot_delete': 'Tidak bisa dihapus. Masih ada {count} karyawan di departemen ini.',
 'departments.confirm_delete': 'Hapus departemen ini?',

 // Branches
 'branches.title': 'Manajemen Cabang',
 'branches.subtitle': 'Kelola cabang dan lokasi perusahaan',
 'branches.add': 'Tambah Cabang',
 'branches.edit': 'Edit Cabang',
 'branches.add_new': 'Tambah Cabang Baru',
 'branches.name': 'Nama Cabang',
 'branches.city': 'Kota',
 'branches.address': 'Alamat',
 'branches.phone': 'No. Telepon',
 'branches.total': 'Total Cabang',
 'branches.total_employees': 'Total Karyawan',
 'branches.search_placeholder': 'Cari cabang...',

 // Org Chart
 'orgchart.title': 'Struktur Organisasi',
 'orgchart.subtitle': 'Visualisasi hierarki perusahaan',

 // Documents
 'documents.title': 'Manajemen Dokumen',
 'documents.subtitle': 'Kelola dokumen karyawan',
 'documents.upload': 'Unggah Dokumen',

 // Profile Requests
 'profile_requests.title': 'Perubahan Profil',
 'profile_requests.subtitle': 'Kelola permintaan perubahan data karyawan',

 // Onboarding
 'onboarding.title': 'Onboarding Checklist',
 'onboarding.subtitle': 'Kelola proses onboarding karyawan baru',
 'onboarding.add': 'Tambah Checklist',

 // Offboarding
 'offboarding.title': 'Exit Clearance',
 'offboarding.subtitle': 'Kelola proses offboarding karyawan',

 // Attendance
 'attendance.title': 'Absensi Harian',
 'attendance.subtitle': 'Pantau kehadiran karyawan',
 'attendance.present': 'Hadir',
 'attendance.absent': 'Tidak Hadir',
 'attendance.late': 'Terlambat',
 'attendance.clock_in': 'Jam Masuk',
 'attendance.clock_out': 'Jam Keluar',

 // Shift Management
 'shifts.title': 'Manajemen Shift',
 'shifts.subtitle': 'Kelola jadwal shift karyawan',
 'shifts.add': 'Tambah Shift',

 // Leave Management
 'leave.title': 'Cuti & Izin',
 'leave.subtitle': 'Kelola pengajuan cuti dan izin karyawan',
 'leave.add': 'Ajukan Cuti',
 'leave.type': 'Jenis Cuti',
 'leave.start_date': 'Tanggal Mulai',
 'leave.end_date': 'Tanggal Selesai',
 'leave.days': 'Hari',
 'leave.reason': 'Alasan',
 'leave.annual': 'Cuti Tahunan',
 'leave.sick': 'Sakit',
 'leave.personal': 'Izin Pribadi',
 'leave.balance': 'Sisa Cuti',

 // Geo-Attendance
 'geo_attendance.title': 'Geo-Absensi',
 'geo_attendance.subtitle': 'Absensi berbasis lokasi dengan geofencing',

 // Overtime
 'overtime.title': 'Lembur',
 'overtime.subtitle': 'Kelola pengajuan lembur karyawan',
 'overtime.add': 'Ajukan Lembur',

 // Payroll
 'payroll.title': 'Daftar Gaji',
 'payroll.subtitle': 'Kelola penggajian karyawan',
 'payroll.run': 'Proses Gaji',
 'payroll.basic_salary': 'Gaji Pokok',
 'payroll.allowances': 'Tunjangan',
 'payroll.deductions': 'Potongan',
 'payroll.net_salary': 'Gaji Bersih',

 // Payslips
 'payslips.title': 'E-Payslip',
 'payslips.subtitle': 'Kelola slip gaji digital karyawan',
 'payslips.generate': 'Buat Payslip',

 // Reimbursement
 'reimbursement.title': 'Reimbursement',
 'reimbursement.subtitle': 'Kelola pengajuan penggantian biaya',
 'reimbursement.add': 'Ajukan Reimbursement',

 // Expense OCR
 'expense_ocr.title': 'Expense OCR',
 'expense_ocr.subtitle': 'Pemindaian struk dan kuitansi otomatis',
 'expense_ocr.scan': 'Pindai Struk',

 // Loans
 'loans.title': 'Pinjaman / Kasbon',
 'loans.subtitle': 'Kelola pinjaman dan kasbon karyawan',
 'loans.add': 'Ajukan Pinjaman',

 // Projects
 'projects.title': 'Manajemen Proyek',
 'projects.subtitle': 'Kelola proyek dan penugasan',
 'projects.add': 'Proyek Baru',
 'projects.name': 'Nama Proyek',
 'projects.client': 'Klien',
 'projects.priority': 'Prioritas',
 'projects.start_date': 'Tanggal Mulai',
 'projects.end_date': 'Tanggal Selesai',
 'projects.hourly_rate': 'Tarif per Jam (Rp)',
 'projects.color': 'Warna',
 'projects.assign': 'Assign ke',
 'projects.allocation': 'Alokasi (%)',
 'projects.role': 'Role',
 'projects.timeline': 'Timeline Proyek',
 'projects.workload': 'Pemantauan Beban Kerja',
 'projects.workload_warning': 'Karyawan dengan alokasi >100% berisiko burnout',
 'projects.no_projects': 'Belum ada proyek',
 'projects.no_projects_hint': 'Klik "Proyek Baru" untuk memulai.',
 'projects.confirm_delete': 'Hapus proyek ini? Semua assignment & timesheet terkait akan ikut terhapus.',
 'projects.tab_list': 'Proyek',
 'projects.tab_gantt': 'Gantt Chart',
 'projects.tab_resource': 'Resource',

 // Timesheets
 'timesheets.title': 'Timesheet',
 'timesheets.subtitle': 'Kelola pencatatan waktu kerja',

 // KPI
 'kpi.title': 'KPI Tracking',
 'kpi.subtitle': 'Pantau indikator kinerja utama karyawan',

 // Appraisal
 'appraisal.title': 'Appraisal',
 'appraisal.subtitle': 'Kelola penilaian kinerja karyawan',

 // Job Postings
 'jobs.title': 'Lowongan Kerja',
 'jobs.subtitle': 'Kelola lowongan dan rekrutmen',
 'jobs.add': 'Buat Lowongan',

 // Candidates
 'candidates.title': 'Pipeline Kandidat',
 'candidates.subtitle': 'Kelola kandidat rekrutmen',

 // Assets
 'assets.title': 'Aset IT',
 'assets.subtitle': 'Kelola inventaris perangkat IT',
 'assets.add': 'Tambah Aset',

 // Helpdesk
 'helpdesk.title': 'Helpdesk',
 'helpdesk.subtitle': 'Kelola tiket bantuan IT',
 'helpdesk.add': 'Buat Tiket',

 // Training
 'training.title': 'Pelatihan',
 'training.subtitle': 'Kelola program pelatihan karyawan',
 'training.add': 'Tambah Pelatihan',

 // AI Capability
 'ai.title': 'AI & Development',
 'ai.subtitle': 'Fitur kecerdasan buatan dan developer tools',

 // Holidays
 'holidays.title': 'Hari Libur',
 'holidays.subtitle': 'Kelola kalender hari libur',
 'holidays.add': 'Tambah Hari Libur',

 // Calendar
 'calendar.title': 'Kalender',
 'calendar.subtitle': 'Kalender perusahaan',

 // Announcements
 'announcements.title': 'Pengumuman',
 'announcements.subtitle': 'Kelola pengumuman perusahaan',
 'announcements.add': 'Buat Pengumuman',

 // Audit Trail
 'audit.title': 'Audit Trail',
 'audit.subtitle': 'Riwayat aktivitas sistem',

 // Analytics
 'analytics.title': 'Analytics',
 'analytics.subtitle': 'Buat laporan dan analisis data',

 // Integrations
 'integrations.title': 'Integrasi',
 'integrations.subtitle': 'Hubungkan dengan layanan eksternal',

 // Policies
 'policies.title': 'Kebijakan Perusahaan',
 'policies.subtitle': 'Kelola dokumen kebijakan',

 // Settings
 'settings.title': 'Pengaturan',
 'settings.subtitle': 'Kelola pengaturan akun dan sistem',
 'settings.account': 'Akun',
 'settings.security': 'Keamanan',
 'settings.notifications': 'Notifikasi',
 'settings.appearance': 'Tampilan',
 'settings.language': 'Bahasa',
 'settings.dark_mode': 'Mode Gelap',

 // Approvals
 'approvals.title': 'Persetujuan',
 'approvals.subtitle': 'Kelola permintaan yang memerlukan persetujuan',

 // Auth
 'auth.access_denied': 'Akses Ditolak',
 'auth.no_permission': 'Anda tidak memiliki izin untuk mengakses halaman ini.',
 'auth.your_role': 'Role Anda',
 'auth.founder': 'Founder',

 // Employee PWA
 'emp.dashboard': 'Dashboard',
 'emp.submissions': 'Pengajuan',
 'emp.schedule': 'Jadwal',
 'emp.profile': 'Profil',
 'emp.leave_request': 'Ajukan Cuti',
 'emp.reimbursement_request': 'Ajukan Reimbursement',
 'emp.overtime_request': 'Ajukan Lembur',
 },
 en: {
 // Navigation / Sidebar
 'nav.dashboard': 'Dashboard',
 'nav.approvals': 'Approvals',
 'nav.employees': 'Employees',
 'nav.employee_data': 'Employee Data',
 'nav.departments': 'Departments',
 'nav.org_chart': 'Organization Chart',
 'nav.documents': 'Documents',
 'nav.profile_requests': 'Profile Changes',
 'nav.branches': 'Branches',
 'nav.offboarding': 'Exit Clearance',
 'nav.onboarding': 'Onboarding',
 'nav.attendance': 'Attendance',
 'nav.daily_attendance': 'Daily Attendance',
 'nav.shift_management': 'Shift Management',
 'nav.leave': 'Leave & Permission',
 'nav.geo_attendance': 'Geo-Attendance',
 'nav.overtime': 'Overtime',
 'nav.payroll': 'Payroll',
 'nav.salary_list': 'Salary List',
 'nav.payslips': 'E-Payslip',
 'nav.reimbursement': 'Reimbursement',
 'nav.expense_ocr': 'Expense OCR',
 'nav.loans': 'Loans',
 'nav.projects': 'Projects',
 'nav.project_management': 'Project Management',
 'nav.timesheets': 'Timesheets',
 'nav.performance': 'Performance',
 'nav.kpi': 'KPI Tracking',
 'nav.appraisal': 'Appraisal',
 'nav.recruitment': 'Recruitment',
 'nav.job_postings': 'Job Postings',
 'nav.candidates': 'Candidate Pipeline',
 'nav.it_support': 'IT & Support',
 'nav.assets': 'IT Assets',
 'nav.helpdesk': 'Helpdesk',
 'nav.ai_capability': 'AI & Dev',
 'nav.training': 'Training',
 'nav.holidays': 'Holidays',
 'nav.calendar': 'Calendar',
 'nav.announcements': 'Announcements',
 'nav.audit_trail': 'Audit Trail',
 'nav.analytics': 'Analytics',
 'nav.integrations': 'Integrations',
 'nav.policies': 'Policies',
 'nav.contracts': 'Employment Contracts',
 'nav.settings': 'Settings',
 'nav.main_menu': 'Main Menu',

 // Common
 'common.save': 'Save',
 'common.cancel': 'Cancel',
 'common.delete': 'Delete',
 'common.edit': 'Edit',
 'common.add': 'Add',
 'common.search': 'Search',
 'common.filter': 'Filter',
 'common.export': 'Export',
 'common.loading': 'Loading...',
 'common.no_data': 'No data available',
 'common.actions': 'Actions',
 'common.status': 'Status',
 'common.name': 'Name',
 'common.employee': 'Employee',
 'common.date': 'Date',
 'common.amount': 'Amount',
 'common.description': 'Description',
 'common.notes': 'Notes',
 'common.type': 'Type',
 'common.category': 'Category',
 'common.all': 'All',
 'common.approve': 'Approve',
 'common.reject': 'Reject',
 'common.pending': 'Pending',
 'common.approved': 'Approved',
 'common.rejected': 'Rejected',
 'common.completed': 'Completed',
 'common.in_progress': 'In Progress',
 'common.active': 'Active',
 'common.inactive': 'Inactive',
 'common.close': 'Close',
 'common.submit': 'Submit',
 'common.back': 'Back',
 'common.next': 'Next',
 'common.previous': 'Previous',
 'common.view': 'View',
 'common.download': 'Download',
 'common.upload': 'Upload',
 'common.yes': 'Yes',
 'common.no': 'No',
 'common.confirm': 'Confirm',
 'common.total': 'Total',
 'common.not_found': 'Not found',
 'common.details': 'Details',
 'common.created': 'Created',
 'common.updated': 'Updated',
 'common.from': 'From',
 'common.to': 'To',
 'common.select': 'Select',

 // Dashboard
 'dashboard.title': 'Dashboard',
 'dashboard.welcome': 'Welcome',
 'dashboard.total_employees': 'Total Employees',
 'dashboard.present_today': 'Present Today',
 'dashboard.pending_leave': 'Pending Leave',
 'dashboard.overtime_hours': 'Overtime Hours',
 'dashboard.quick_stats': 'Quick Stats',
 'dashboard.recent_activity': 'Recent Activity',
 'dashboard.attendance_overview': 'Attendance Overview',

 // Employees
 'employees.title': 'Employee Data',
 'employees.subtitle': 'Manage company employee data',
 'employees.add': 'Add Employee',
 'employees.total': 'Total Employees',
 'employees.search_placeholder': 'Search name, email, department...',

 // Departments
 'departments.title': 'Department Master',
 'departments.subtitle': 'Manage company divisions',
 'departments.add': 'Add Department',
 'departments.edit': 'Edit Department',
 'departments.add_new': 'Add New Department',
 'departments.name': 'Department Name',
 'departments.code': 'Department Code',
 'departments.head': 'Department Head',
 'departments.total': 'Total Departments',
 'departments.total_employees': 'Total Employees',
 'departments.search_placeholder': 'Search departments...',
 'departments.code_hint': 'Unique abbreviation for this department',
 'departments.head_placeholder': 'Department head name',
 'departments.desc_placeholder': 'Brief description of department function...',
 'departments.cannot_delete': 'Cannot delete. There are still {count} employees in this department.',
 'departments.confirm_delete': 'Delete this department?',

 // Branches
 'branches.title': 'Branch Management',
 'branches.subtitle': 'Manage company branches and locations',
 'branches.add': 'Add Branch',
 'branches.edit': 'Edit Branch',
 'branches.add_new': 'Add New Branch',
 'branches.name': 'Branch Name',
 'branches.city': 'City',
 'branches.address': 'Address',
 'branches.phone': 'Phone Number',
 'branches.total': 'Total Branches',
 'branches.total_employees': 'Total Employees',
 'branches.search_placeholder': 'Search branches...',

 // Org Chart
 'orgchart.title': 'Organization Chart',
 'orgchart.subtitle': 'Company hierarchy visualization',

 // Documents
 'documents.title': 'Document Management',
 'documents.subtitle': 'Manage employee documents',
 'documents.upload': 'Upload Document',

 // Profile Requests
 'profile_requests.title': 'Profile Changes',
 'profile_requests.subtitle': 'Manage employee data change requests',

 // Onboarding
 'onboarding.title': 'Onboarding Checklist',
 'onboarding.subtitle': 'Manage new employee onboarding process',
 'onboarding.add': 'Add Checklist',

 // Offboarding
 'offboarding.title': 'Exit Clearance',
 'offboarding.subtitle': 'Manage employee offboarding process',

 // Attendance
 'attendance.title': 'Daily Attendance',
 'attendance.subtitle': 'Monitor employee attendance',
 'attendance.present': 'Present',
 'attendance.absent': 'Absent',
 'attendance.late': 'Late',
 'attendance.clock_in': 'Clock In',
 'attendance.clock_out': 'Clock Out',

 // Shift Management
 'shifts.title': 'Shift Management',
 'shifts.subtitle': 'Manage employee shift schedules',
 'shifts.add': 'Add Shift',

 // Leave Management
 'leave.title': 'Leave & Permission',
 'leave.subtitle': 'Manage employee leave and permission requests',
 'leave.add': 'Apply for Leave',
 'leave.type': 'Leave Type',
 'leave.start_date': 'Start Date',
 'leave.end_date': 'End Date',
 'leave.days': 'Days',
 'leave.reason': 'Reason',
 'leave.annual': 'Annual Leave',
 'leave.sick': 'Sick Leave',
 'leave.personal': 'Personal Leave',
 'leave.balance': 'Leave Balance',

 // Geo-Attendance
 'geo_attendance.title': 'Geo-Attendance',
 'geo_attendance.subtitle': 'Location-based attendance with geofencing',

 // Overtime
 'overtime.title': 'Overtime',
 'overtime.subtitle': 'Manage employee overtime requests',
 'overtime.add': 'Apply for Overtime',

 // Payroll
 'payroll.title': 'Salary List',
 'payroll.subtitle': 'Manage employee payroll',
 'payroll.run': 'Process Payroll',
 'payroll.basic_salary': 'Basic Salary',
 'payroll.allowances': 'Allowances',
 'payroll.deductions': 'Deductions',
 'payroll.net_salary': 'Net Salary',

 // Payslips
 'payslips.title': 'E-Payslip',
 'payslips.subtitle': 'Manage digital employee payslips',
 'payslips.generate': 'Generate Payslip',

 // Reimbursement
 'reimbursement.title': 'Reimbursement',
 'reimbursement.subtitle': 'Manage expense reimbursement requests',
 'reimbursement.add': 'Submit Reimbursement',

 // Expense OCR
 'expense_ocr.title': 'Expense OCR',
 'expense_ocr.subtitle': 'Automatic receipt and invoice scanning',
 'expense_ocr.scan': 'Scan Receipt',

 // Loans
 'loans.title': 'Loans',
 'loans.subtitle': 'Manage employee loans and advances',
 'loans.add': 'Apply for Loan',

 // Projects
 'projects.title': 'Project Management',
 'projects.subtitle': 'Manage projects and assignments',
 'projects.add': 'New Project',
 'projects.name': 'Project Name',
 'projects.client': 'Client',
 'projects.priority': 'Priority',
 'projects.start_date': 'Start Date',
 'projects.end_date': 'End Date',
 'projects.hourly_rate': 'Hourly Rate (Rp)',
 'projects.color': 'Color',
 'projects.assign': 'Assign to',
 'projects.allocation': 'Allocation (%)',
 'projects.role': 'Role',
 'projects.timeline': 'Project Timeline',
 'projects.workload': 'Workload Monitoring',
 'projects.workload_warning': 'Employees with allocation >100% are at risk of burnout',
 'projects.no_projects': 'No projects yet',
 'projects.no_projects_hint': 'Click "New Project" to start.',
 'projects.confirm_delete': 'Delete this project? All related assignments & timesheets will also be deleted.',
 'projects.tab_list': 'Projects',
 'projects.tab_gantt': 'Gantt Chart',
 'projects.tab_resource': 'Resource',

 // Timesheets
 'timesheets.title': 'Timesheet',
 'timesheets.subtitle': 'Manage work time tracking',

 // KPI
 'kpi.title': 'KPI Tracking',
 'kpi.subtitle': 'Monitor key employee performance indicators',

 // Appraisal
 'appraisal.title': 'Appraisal',
 'appraisal.subtitle': 'Manage employee performance reviews',

 // Job Postings
 'jobs.title': 'Job Postings',
 'jobs.subtitle': 'Manage openings and recruitment',
 'jobs.add': 'Create Posting',

 // Candidates
 'candidates.title': 'Candidate Pipeline',
 'candidates.subtitle': 'Manage recruitment candidates',

 // Assets
 'assets.title': 'IT Assets',
 'assets.subtitle': 'Manage IT device inventory',
 'assets.add': 'Add Asset',

 // Helpdesk
 'helpdesk.title': 'Helpdesk',
 'helpdesk.subtitle': 'Manage IT support tickets',
 'helpdesk.add': 'Create Ticket',

 // Training
 'training.title': 'Training',
 'training.subtitle': 'Manage employee training programs',
 'training.add': 'Add Training',

 // AI Capability
 'ai.title': 'AI & Development',
 'ai.subtitle': 'Artificial intelligence features and developer tools',

 // Holidays
 'holidays.title': 'Holidays',
 'holidays.subtitle': 'Manage holiday calendar',
 'holidays.add': 'Add Holiday',

 // Calendar
 'calendar.title': 'Calendar',
 'calendar.subtitle': 'Company calendar',

 // Announcements
 'announcements.title': 'Announcements',
 'announcements.subtitle': 'Manage company announcements',
 'announcements.add': 'Create Announcement',

 // Audit Trail
 'audit.title': 'Audit Trail',
 'audit.subtitle': 'System activity history',

 // Analytics
 'analytics.title': 'Analytics',
 'analytics.subtitle': 'Create reports and data analysis',

 // Integrations
 'integrations.title': 'Integrations',
 'integrations.subtitle': 'Connect with external services',

 // Policies
 'policies.title': 'Company Policies',
 'policies.subtitle': 'Manage policy documents',

 // Settings
 'settings.title': 'Settings',
 'settings.subtitle': 'Manage account and system settings',
 'settings.account': 'Account',
 'settings.security': 'Security',
 'settings.notifications': 'Notifications',
 'settings.appearance': 'Appearance',
 'settings.language': 'Language',
 'settings.dark_mode': 'Dark Mode',

 // Approvals
 'approvals.title': 'Approvals',
 'approvals.subtitle': 'Manage requests requiring approval',

 // Auth
 'auth.access_denied': 'Access Denied',
 'auth.no_permission': 'You do not have permission to access this page.',
 'auth.your_role': 'Your Role',
 'auth.founder': 'Founder',

 // Employee PWA
 'emp.dashboard': 'Dashboard',
 'emp.submissions': 'Submissions',
 'emp.schedule': 'Schedule',
 'emp.profile': 'Profile',
 'emp.leave_request': 'Apply for Leave',
 'emp.reimbursement_request': 'Submit Reimbursement',
 'emp.overtime_request': 'Apply for Overtime',
 },
};

const I18nContext = createContext({});

export function I18nProvider({ children }) {
 const [locale, setLocale] = useState(() => {
  return localStorage.getItem('hrisync_locale') || localStorage.getItem('HRIS Loka_locale') || localStorage.getItem('hrisync_lang') || 'id';
 });

 useEffect(() => {
  localStorage.setItem('hrisync_locale', locale);
  localStorage.setItem('hrisync_lang', locale);
  document.documentElement.setAttribute('lang', locale);
  document.documentElement.setAttribute('data-lang', locale);

  // Trigger DOM-level translation for all hardcoded text in pages
  // Small delay to let React re-render first
  const timer = setTimeout(async () => {
    const fn = await getTranslateFn();
    if (fn) fn(document.body, locale);
  }, 100);
  return () => clearTimeout(timer);
 }, [locale]);

 const t = useCallback((key, params) => {
 let text = translations[locale]?.[key] || translations['id']?.[key] || key;
 if (params) {
 Object.entries(params).forEach(([k, v]) => {
 text = text.replace(`{${k}}`, v);
 });
 }
 return text;
 }, [locale]);

 const toggleLocale = useCallback(() => {
 setLocale(prev => prev === 'id' ? 'en' : 'id');
 }, []);

 return (
 <I18nContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
 {children}
 </I18nContext.Provider>
 );
}

export function useTranslation() {
 return useContext(I18nContext);
}

export const LOCALES = [
 { code: 'id', label: 'Bahasa Indonesia', short: 'ID' },
 { code: 'en', label: 'English', short: 'EN' },
];

/**
 * LanguageToggle — Compact pill toggle for ID/EN
 */
export function LanguageToggle() {
 const { locale, toggleLocale } = useTranslation();

 return (
 <button
 onClick={toggleLocale}
 title={locale === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
 style={{
 display: 'flex', alignItems: 'center', gap: 0,
 borderRadius: 20, overflow: 'hidden',
 border: '1.5px solid var(--border)',
 background: 'var(--bg)', cursor: 'pointer',
 fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
 padding: 0, height: 34,
 }}
 >
 <span style={{
 padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center',
 background: locale === 'id' ? 'var(--primary)' : 'transparent',
 color: locale === 'id' ? '#fff' : 'var(--text-secondary)',
 transition: 'all 0.2s',
 }}>
 ID
 </span>
 <span style={{
 padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center',
 background: locale === 'en' ? 'var(--primary)' : 'transparent',
 color: locale === 'en' ? '#fff' : 'var(--text-secondary)',
 transition: 'all 0.2s',
 }}>
 EN
 </span>
 </button>
 );
}
