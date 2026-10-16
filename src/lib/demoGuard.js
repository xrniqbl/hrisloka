/**
 * demoGuard.js
 * Utilitas untuk deteksi dan pembatasan mode demo.
 *
 * Demo credentials: Dikelola secara privat oleh admin.
 * - Login tidak memerlukan akun Supabase nyata
 * - Semua aksi write (tambah/edit/hapus) diblokir
 * - Data yang ditampilkan adalah data dummy read-only
 *
 * DUMMY DATA NOTICE: every PII-like value below (DEMO_USER, DEMO_EMPLOYEE,
 * DEMO_PROFILE_DATA — names, NIK/NIP, phones, addresses, bank/NPWP/BPJS
 * numbers, emails) is entirely fictitious placeholder data for design QA
 * and read-only demo mode. It does not belong to any real person; do not
 * treat it as real user data and do not copy it into production records.
 */

// Demo email is public info (known demo account). Do NOT export a demo password constant.
// Demo mode only exists when VITE_DEMO_EMAIL is explicitly configured — no hardcoded
// fallback, so a production build without the env var has no demo backdoor.
export const DEMO_EMAIL = (import.meta.env.VITE_DEMO_EMAIL || '').trim().toLowerCase();
export const DEMO_ENABLED = DEMO_EMAIL.length > 0;
export const DEMO_FLAG_KEY = 'hrisync_demo_mode';

/** Fake auth user for PWA design preview (no Supabase session). */
export const DEMO_USER = {
  id: 'demo-user-id',
  email: DEMO_EMAIL,
  app_metadata: { provider: 'email' },
  user_metadata: {
    full_name: 'Siti Rahayu',
    avatar_url: '/avataricon/users-3.svg',
  },
};

/**
 * Full fake employee profile for PWA design QA (Profile, dashboard, etc.).
 * Mirrors fields used by EmpProfile + ProfileCompletionBar.
 */
export const DEMO_EMPLOYEE = {
  id: 'demo-emp-id',
  auth_user_id: 'demo-user-id',
  email: DEMO_EMAIL,
  personal_email: 'siti.rahayu@gmail.com',
  name: 'Siti Rahayu',
  role: 'employee',
  company_id: 'demo-company-id',
  division: 'Human Resources',
  position: 'Staff HR',
  status: 'permanent',
  account_status: 'active',
  profile_setup_done: true,
  leave_quota: 12,
  leave_used: 3,
  photo_url: '/avataricon/users-3.svg',
  phone: '081234567890',
  whatsapp: '081234567890',
  branch_id: null,
  // Personal
  nip: '3174091201980003',
  nik: '3174091201980003',
  gender: 'female',
  birth_date: '1998-01-12',
  religion: 'Islam',
  blood_type: 'O',
  marital_status: 'single',
  address: 'Jl. Melati No. 12, Menteng, Jakarta Pusat 10310',
  ktp_address: 'Jl. Melati No. 12, Menteng, Jakarta Pusat 10310',
  join_date: '2023-03-15',
  // Financial / legal
  bank_account: {
    bank_name: 'BCA',
    account_number: '1234567890',
    account_name: 'Siti Rahayu',
  },
  npwp: '10.20.30.4-901.000',
  bpjs_kesehatan: '0001234567890',
  bpjs_ketenagakerjaan: '19011234567',
  // Emergency
  emergency_contact: {
    name: 'Budi Santoso',
    relation: 'Ayah',
    phone: '081298765432',
  },
  // Education & experience
  education: {
    level: 'S1',
    major: 'Psikologi',
    university: 'Universitas Indonesia',
  },
  work_history: [
    {
      position: 'HR Intern',
      company: 'PT Nusantara Sejahtera',
      duration: '2021 – 2022',
    },
    {
      position: 'HR Admin',
      company: 'CV Digital Prima',
      duration: '2022 – 2023',
    },
  ],
  certifications: [
    { name: 'Certified HR Professional', issuer: 'BNSP', year: '2023' },
    { name: 'People Analytics Basics', issuer: 'Coursera', year: '2024' },
  ],
};

/** Related demo lists for Profile tabs (leave, docs, tickets, requests). */
export const DEMO_PROFILE_DATA = {
  leaves: [
    {
      id: 'demo-leave-1',
      type: 'Cuti Tahunan',
      start_date: '2026-04-10',
      end_date: '2026-04-12',
      days: 3,
      status: 'approved',
      reason: 'Liburan keluarga',
    },
    {
      id: 'demo-leave-2',
      type: 'Cuti Sakit',
      start_date: '2026-05-02',
      end_date: '2026-05-02',
      days: 1,
      status: 'approved',
      reason: 'Istirahat',
    },
    {
      id: 'demo-leave-3',
      type: 'Cuti Tahunan',
      start_date: '2026-07-20',
      end_date: '2026-07-22',
      days: 3,
      status: 'pending',
      reason: 'Keperluan pribadi',
    },
  ],
  documents: [
    {
      id: 'demo-doc-1',
      type: 'KTP',
      url: '#',
      status: 'approved',
      created_at: '2023-03-15T00:00:00.000Z',
    },
    {
      id: 'demo-doc-2',
      type: 'NPWP',
      url: '#',
      status: 'approved',
      created_at: '2023-03-15T00:00:00.000Z',
    },
    {
      id: 'demo-doc-3',
      type: 'Ijazah',
      url: '#',
      status: 'approved',
      created_at: '2023-03-16T00:00:00.000Z',
    },
    {
      id: 'demo-doc-4',
      type: 'Sertifikat',
      url: '#',
      status: 'pending',
      created_at: '2026-01-20T00:00:00.000Z',
    },
  ],
  updateRequests: [
    {
      id: 'demo-req-1',
      field_name: 'address',
      field_label: 'Alamat Domisili',
      status: 'pending',
      requested_at: '2026-06-15T10:00:00.000Z',
    },
    {
      id: 'demo-req-2',
      field_name: 'bank_account',
      field_label: 'Rekening Bank',
      status: 'approved',
      requested_at: '2026-03-01T10:00:00.000Z',
    },
  ],
  hasFace: true,
  faceCount: 3,
  reimbursements: [
    {
      id: 'demo-reimb-1',
      category: 'Transportasi',
      amount: 150000,
      date: '2026-06-10',
      notes: 'Grab ke klien',
      status: 'approved',
    },
    {
      id: 'demo-reimb-2',
      category: 'Makan',
      amount: 85000,
      date: '2026-06-18',
      notes: 'Meeting vendor',
      status: 'pending',
    },
  ],
  overtimes: [
    {
      id: 'demo-ot-1',
      date: '2026-06-12',
      hours: 3,
      rate: 1.5,
      reason: 'Deadline payroll',
      status: 'approved',
    },
    {
      id: 'demo-ot-2',
      date: '2026-06-25',
      hours: 2,
      rate: 1.5,
      reason: 'Support onboarding',
      status: 'pending',
    },
  ],
  loans: [
    {
      id: 'demo-loan-1',
      amount: 3000000,
      remaining: 1500000,
      monthly_deduction: 500000,
      reason: 'Biaya pendidikan',
      status: 'active',
      created_at: '2026-03-01T00:00:00.000Z',
    },
  ],
  payslips: [
    {
      id: 'demo-pay-1',
      month: '2026-06',
      basic_salary: 8000000,
      allowances: 1500000,
      deductions: 950000,
      net_salary: 8550000,
      status: 'paid',
    },
  ],
  notifications: [
    {
      id: 'demo-n1',
      type: 'announcement',
      title: 'Libur Idul Adha',
      message: 'Kantor libur 17 Juni 2026. Absensi otomatis di-skip.',
      created_at: '2026-06-10T08:00:00.000Z',
    },
    {
      id: 'demo-n2',
      type: 'leave',
      title: 'Cuti Disetujui',
      message: 'Cuti Tahunan 10–12 Apr telah disetujui.',
      status: 'approved',
      created_at: '2026-04-05T10:00:00.000Z',
    },
    {
      id: 'demo-n3',
      type: 'payslip',
      title: 'Gaji Sudah Ditransfer',
      message: 'Slip gaji Juni 2026 sudah tersedia.',
      status: 'paid',
      created_at: '2026-06-28T09:00:00.000Z',
    },
  ],
  onboardingTasks: [
    { id: 'demo-ob-1', title: 'Upload KTP & NPWP', status: 'done', sort_order: 1 },
    { id: 'demo-ob-2', title: 'Daftar Face ID absensi', status: 'done', sort_order: 2 },
    { id: 'demo-ob-3', title: 'Baca kebijakan perusahaan', status: 'pending', sort_order: 3 },
    { id: 'demo-ob-4', title: 'Setup rekening payroll', status: 'pending', sort_order: 4 },
  ],
  tickets: [
    {
      id: 'demo-ticket-hd-1',
      subject: 'Laptop lambat saat absensi wajah',
      category: 'it',
      priority: 'medium',
      message: 'Model face-api loading lama di Wi-Fi kantor',
      status: 'in_progress',
      created_at: '2026-06-01T08:00:00.000Z',
    },
    {
      id: 'demo-ticket-hd-2',
      subject: 'Tanya sisa cuti 2026',
      category: 'hr',
      priority: 'low',
      message: 'Berapa sisa cuti tahunan saya?',
      status: 'resolved',
      created_at: '2026-05-20T09:00:00.000Z',
    },
  ],
  shifts: [
    { id: 'ds1', day_of_week: 0, shifts: { name: 'Pagi', start_time: '08:00', end_time: '17:00', color: '#635BFF' } },
    { id: 'ds2', day_of_week: 1, shifts: { name: 'Pagi', start_time: '08:00', end_time: '17:00', color: '#635BFF' } },
    { id: 'ds3', day_of_week: 2, shifts: { name: 'Pagi', start_time: '08:00', end_time: '17:00', color: '#635BFF' } },
    { id: 'ds4', day_of_week: 3, shifts: { name: 'Pagi', start_time: '08:00', end_time: '17:00', color: '#635BFF' } },
    { id: 'ds5', day_of_week: 4, shifts: { name: 'Pagi', start_time: '08:00', end_time: '17:00', color: '#635BFF' } },
  ],
  holidays: [
    { id: 'dh1', date: '2026-06-17', name: 'Idul Adha' },
    { id: 'dh2', date: '2026-08-17', name: 'Hari Kemerdekaan RI' },
    { id: 'dh3', date: '2026-12-25', name: 'Hari Natal' },
  ],
  assets: [
    {
      id: 'da1',
      name: 'MacBook Air M2',
      category: 'Laptop',
      serial_number: 'MBA-2024-0012',
      condition: 'Good',
      assigned_at: '2024-01-10',
    },
    {
      id: 'da2',
      name: 'iPhone 13',
      category: 'Smartphone',
      serial_number: 'IP13-8891',
      condition: 'Fair',
      assigned_at: '2024-06-01',
    },
  ],
  announcements: [
    {
      id: 'dann1',
      title: 'Libur Idul Adha 2026',
      content: 'Kantor libur 17 Juni 2026. Absensi otomatis di-skip untuk hari libur nasional.',
      priority: 'high',
      created_at: '2026-06-10T08:00:00.000Z',
    },
    {
      id: 'dann2',
      title: 'Update Face ID Absensi',
      content: 'Pastikan Face ID sudah terdaftar sebelum 30 Juni agar clock-in biometrik aktif.',
      priority: 'normal',
      created_at: '2026-06-05T10:00:00.000Z',
    },
  ],
  approvalQueue: {
    leave: [
      {
        id: 'dapp-l1',
        type: 'Cuti Tahunan',
        start_date: '2026-07-14',
        end_date: '2026-07-16',
        days: 3,
        reason: 'Keperluan keluarga',
        status: 'pending',
        created_at: '2026-07-01T08:00:00.000Z',
        employees: { name: 'Budi Santoso', division: 'Engineering', company_id: 'demo-company-id' },
      },
    ],
    overtime: [
      {
        id: 'dapp-o1',
        date: '2026-07-08',
        hours: 2.5,
        reason: 'Deploy production',
        status: 'pending',
        created_at: '2026-07-08T18:00:00.000Z',
        employees: { name: 'Rina Wijaya', division: 'Engineering', company_id: 'demo-company-id' },
      },
    ],
    reimbursement: [
      {
        id: 'dapp-r1',
        category: 'Transportasi',
        amount: 120000,
        notes: 'Meeting klien BSD',
        status: 'pending',
        created_at: '2026-07-05T11:00:00.000Z',
        employees: { name: 'Andi Pratama', division: 'Sales', company_id: 'demo-company-id' },
      },
    ],
  },
  timesheets: [
    {
      id: 'dts1',
      date: '2026-07-08',
      hours: 8,
      project: 'HRIS PWA',
      task: 'Fix absensi Face ID',
      notes: '',
    },
    {
      id: 'dts2',
      date: '2026-07-07',
      hours: 7.5,
      project: 'HRIS PWA',
      task: 'Polish pengajuan',
      notes: '',
    },
  ],
  /** Home “My Tasks” — actionable items for demo */
  tasks: [
    {
      id: 'demo-task-1',
      title: 'Lengkapi Face ID absensi',
      titleEn: 'Complete Face ID for attendance',
      status: 'pending',
      path: '/app/profile',
      type: 'profile',
    },
    {
      id: 'demo-task-2',
      title: 'Review pengajuan cuti menunggu',
      titleEn: 'Review pending leave request',
      status: 'pending',
      path: '/app/submissions',
      type: 'leave',
    },
    {
      id: 'demo-task-3',
      title: 'Baca kebijakan perusahaan terbaru',
      titleEn: 'Read latest company policy',
      status: 'pending',
      path: '/app/policy',
      type: 'policy',
    },
    {
      id: 'demo-task-4',
      title: 'Isi timesheet minggu ini',
      titleEn: 'Fill this week’s timesheet',
      status: 'pending',
      path: '/app/timesheet',
      type: 'timesheet',
    },
  ],
};

/** Aktifkan mode demo di sessionStorage (no-op jika demo tidak dikonfigurasi) */
export function activateDemo() {
  if (!DEMO_ENABLED) return;
  try {
    sessionStorage.setItem(DEMO_FLAG_KEY, '1');
  } catch {
    /* storage diblokir — demo tidak aktif */
  }
}

/** Nonaktifkan mode demo */
export function deactivateDemo() {
  try {
    sessionStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    /* abaikan */
  }
}

/** Cek apakah saat ini sedang dalam mode demo (wajib DEMO_ENABLED + flag sesi) */
export function isDemoMode() {
  if (!DEMO_ENABLED) return false;
  try {
    return sessionStorage.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Guard untuk aksi write.
 * Gunakan ini menggantikan handler normal untuk tombol tambah/edit/hapus.
 *
 * @param {Function} originalHandler - handler asli yang ingin dijalankan
 * @returns {Function} - handler baru yang diblokir jika demo mode aktif
 *
 * Contoh:
 *   onClick={demoBlock(() => handleAdd())}
 */
export function demoBlock(originalHandler) {
  return (e) => {
    if (isDemoMode()) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      showDemoToast();
      return;
    }
    return originalHandler?.(e);
  };
}

/** Tampilkan notifikasi mode demo */
export function showDemoToast() {
  // Hindari duplikat toast
  if (document.getElementById('demo-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'demo-toast';
  toast.innerHTML = `
    <span style="font-size:18px">🔒</span>
    <div>
      <strong style="display:block;font-size:13px;margin-bottom:2px">Mode Demo — Akses Read-Only</strong>
      <span style="font-size:12px;opacity:0.85">Fitur ini tidak tersedia dalam mode demo.</span>
    </div>
  `;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '28px',
    left: '50%',
    transform: 'translateX(-50%) translateY(20px)',
    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
    color: '#fff',
    padding: '14px 20px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    zIndex: '99999',
    fontFamily: "'Inter Tight', sans-serif",
    fontSize: '13px',
    border: '1px solid rgba(255,255,255,0.1)',
    opacity: '0',
    transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1)',
    minWidth: '280px',
    maxWidth: '360px',
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 350);
  }, 2800);
}
