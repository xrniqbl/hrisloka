// ─── Mock Employees ───
export const employees = [
    {
        id: 1,
        nip: 'EMP-2024-001',
        name: 'Ahmad Rizky Pratama',
        email: 'ahmad.rizky@company.com',
        phone: '0812-3456-7890',
        photo: null,
        division: 'Engineering',
        position: 'Senior Developer',
        status: 'permanent', // permanent | contract
        joinDate: '2022-03-15',
        birthDate: '1995-02-24', // birthday this week
        contractStart: null,
        contractEnd: null,
        baseSalary: 12000000,
        allowance: 2500000,
        bpjsRate: 0.04,
        taxRate: 0.05,
        emergencyContact: { name: 'Siti Aisyah', relation: 'Spouse', phone: '0812-9876-5432' },
        bankAccount: { bank: 'BCA', number: '1234567890', holder: 'Ahmad Rizky Pratama' },
        education: { level: 'S1', major: 'Teknik Informatika', university: 'ITB', year: 2017 },
        address: 'Jl. Sudirman No. 42, Jakarta Selatan',
        nik: '3201234567890001',
        leaveQuota: 12,
        leaveUsed: 3,
        manager: null,
    },
    {
        id: 2,
        nip: 'EMP-2024-002',
        name: 'Siti Nurhaliza',
        email: 'siti.nur@company.com',
        phone: '0813-2345-6789',
        photo: null,
        division: 'Marketing',
        position: 'Marketing Specialist',
        status: 'contract',
        joinDate: '2024-06-01',
        birthDate: '1998-07-12',
        contractStart: '2024-06-01',
        contractEnd: '2026-05-31',
        baseSalary: 8000000,
        allowance: 1500000,
        bpjsRate: 0.04,
        taxRate: 0.05,
        emergencyContact: { name: 'Budi Nurhaliza', relation: 'Father', phone: '0815-1111-2222' },
        bankAccount: { bank: 'Mandiri', number: '0987654321', holder: 'Siti Nurhaliza' },
        education: { level: 'S1', major: 'Manajemen', university: 'UI', year: 2020 },
        address: 'Jl. Gatot Subroto No. 18, Jakarta Pusat',
        nik: '3201234567890002',
        leaveQuota: 12,
        leaveUsed: 5,
        manager: 1,
    },
    {
        id: 3,
        nip: 'EMP-2024-003',
        name: 'Budi Santoso',
        email: 'budi.santoso@company.com',
        phone: '0814-3456-7890',
        photo: null,
        division: 'Finance',
        position: 'Finance Manager',
        status: 'permanent',
        joinDate: '2020-01-10',
        birthDate: '1990-11-05',
        contractStart: null,
        contractEnd: null,
        baseSalary: 15000000,
        allowance: 3500000,
        bpjsRate: 0.04,
        taxRate: 0.15,
        emergencyContact: { name: 'Dewi Santoso', relation: 'Wife', phone: '0816-3333-4444' },
        bankAccount: { bank: 'BNI', number: '1122334455', holder: 'Budi Santoso' },
        education: { level: 'S2', major: 'Akuntansi', university: 'UGM', year: 2014 },
        address: 'Jl. HR Rasuna Said No. 7, Jakarta Selatan',
        nik: '3201234567890003',
        leaveQuota: 12,
        leaveUsed: 1,
        manager: null,
    },
    {
        id: 4,
        nip: 'EMP-2024-004',
        name: 'Dewi Lestari',
        email: 'dewi.lestari@company.com',
        phone: '0815-4567-8901',
        photo: null,
        division: 'HR',
        position: 'HR Admin',
        status: 'permanent',
        joinDate: '2021-08-20',
        birthDate: '1993-02-25', // birthday this week
        contractStart: null,
        contractEnd: null,
        baseSalary: 9000000,
        allowance: 2000000,
        bpjsRate: 0.04,
        taxRate: 0.05,
        emergencyContact: { name: 'Agus Lestari', relation: 'Brother', phone: '0817-5555-6666' },
        bankAccount: { bank: 'BRI', number: '5566778899', holder: 'Dewi Lestari' },
        education: { level: 'S1', major: 'Psikologi', university: 'Unpad', year: 2015 },
        address: 'Jl. Thamrin No. 31, Jakarta Pusat',
        nik: '3201234567890004',
        leaveQuota: 12,
        leaveUsed: 7,
        manager: 3,
    },
    {
        id: 5,
        nip: 'EMP-2024-005',
        name: 'Raka Pratama',
        email: 'raka.pratama@company.com',
        phone: '0816-5678-9012',
        photo: null,
        division: 'Engineering',
        position: 'Junior Developer',
        status: 'contract',
        joinDate: '2025-09-01',
        birthDate: '2000-04-18',
        contractStart: '2025-09-01',
        contractEnd: '2026-03-31', // expiring soon!
        baseSalary: 6500000,
        allowance: 1000000,
        bpjsRate: 0.04,
        taxRate: 0.05,
        emergencyContact: { name: 'Ibu Pratama', relation: 'Mother', phone: '0818-7777-8888' },
        bankAccount: { bank: 'BCA', number: '9988776655', holder: 'Raka Pratama' },
        education: { level: 'S1', major: 'Sistem Informasi', university: 'Binus', year: 2022 },
        address: 'Jl. Kuningan No. 55, Jakarta Selatan',
        nik: '3201234567890005',
        leaveQuota: 12,
        leaveUsed: 2,
        manager: 1,
    },
    {
        id: 6,
        nip: 'EMP-2024-006',
        name: 'Fajar Setiawan',
        email: 'fajar.setiawan@company.com',
        phone: '0817-6789-0123',
        photo: null,
        division: 'Operations',
        position: 'Operations Lead',
        status: 'permanent',
        joinDate: '2019-05-12',
        birthDate: '1988-09-30',
        contractStart: null,
        contractEnd: null,
        baseSalary: 13000000,
        allowance: 3000000,
        bpjsRate: 0.04,
        taxRate: 0.15,
        emergencyContact: { name: 'Rina Setiawan', relation: 'Wife', phone: '0819-9999-0000' },
        bankAccount: { bank: 'Mandiri', number: '4433221100', holder: 'Fajar Setiawan' },
        education: { level: 'S1', major: 'Teknik Industri', university: 'ITS', year: 2010 },
        address: 'Jl. Casablanca No. 12, Jakarta Selatan',
        nik: '3201234567890006',
        leaveQuota: 12,
        leaveUsed: 4,
        manager: null,
    },
    {
        id: 7,
        nip: 'EMP-2024-007',
        name: 'Anisa Rahmawati',
        email: 'anisa.rahma@company.com',
        phone: '0818-7890-1234',
        photo: null,
        division: 'Marketing',
        position: 'Content Writer',
        status: 'contract',
        joinDate: '2025-01-15',
        birthDate: '1997-12-01',
        contractStart: '2025-01-15',
        contractEnd: '2026-07-14',
        baseSalary: 7000000,
        allowance: 1200000,
        bpjsRate: 0.04,
        taxRate: 0.05,
        emergencyContact: { name: 'Hendra Rahmawati', relation: 'Father', phone: '0811-1234-5678' },
        bankAccount: { bank: 'BCA', number: '6677889900', holder: 'Anisa Rahmawati' },
        education: { level: 'S1', major: 'Ilmu Komunikasi', university: 'Unair', year: 2019 },
        address: 'Jl. Menteng Raya No. 8, Jakarta Pusat',
        nik: '3201234567890007',
        leaveQuota: 12,
        leaveUsed: 0,
        manager: 2,
    },
    {
        id: 8,
        nip: 'EMP-2024-008',
        name: 'Yoga Aditya',
        email: 'yoga.aditya@company.com',
        phone: '0819-8901-2345',
        photo: null,
        division: 'Engineering',
        position: 'DevOps Engineer',
        status: 'permanent',
        joinDate: '2021-11-01',
        birthDate: '1994-06-20',
        contractStart: null,
        contractEnd: null,
        baseSalary: 14000000,
        allowance: 3000000,
        bpjsRate: 0.04,
        taxRate: 0.15,
        emergencyContact: { name: 'Maya Sari', relation: 'Wife', phone: '0812-0000-1111' },
        bankAccount: { bank: 'BNI', number: '2233445566', holder: 'Yoga Aditya' },
        education: { level: 'S1', major: 'Teknik Komputer', university: 'ITB', year: 2016 },
        address: 'Jl. Kemang Raya No. 23, Jakarta Selatan',
        nik: '3201234567890008',
        leaveQuota: 12,
        leaveUsed: 6,
        manager: 1,
    },
];

// ─── Mock Attendance ───
export const generateAttendanceData = () => {
    const data = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        data.push({
            date: date.toISOString().split('T')[0],
            present: isWeekend ? 0 : Math.floor(Math.random() * 15) + 230,
            absent: isWeekend ? 0 : Math.floor(Math.random() * 8) + 2,
            late: isWeekend ? 0 : Math.floor(Math.random() * 10) + 3,
            onLeave: isWeekend ? 0 : Math.floor(Math.random() * 5) + 1,
        });
    }
    return data;
};

export const dailyAttendance = [
    { employeeId: 1, date: '2026-02-22', clockIn: '08:02', clockOut: '17:15', status: 'present', location: 'Office' },
    { employeeId: 2, date: '2026-02-22', clockIn: '08:30', clockOut: '17:00', status: 'late', location: 'Office' },
    { employeeId: 3, date: '2026-02-22', clockIn: '07:55', clockOut: '17:30', status: 'present', location: 'Office' },
    { employeeId: 4, date: '2026-02-22', clockIn: null, clockOut: null, status: 'leave', location: null },
    { employeeId: 5, date: '2026-02-22', clockIn: '08:10', clockOut: '17:05', status: 'present', location: 'Remote' },
    { employeeId: 6, date: '2026-02-22', clockIn: '07:45', clockOut: '18:00', status: 'present', location: 'Office' },
    { employeeId: 7, date: '2026-02-22', clockIn: '09:05', clockOut: '17:00', status: 'late', location: 'Office' },
    { employeeId: 8, date: '2026-02-22', clockIn: null, clockOut: null, status: 'absent', location: null },
];

// ─── Mock Overtime ───
export const overtimeRecords = [
    { id: 1, employeeId: 1, date: '2026-02-20', hours: 3, rate: 1.5, status: 'approved', reason: 'Sprint deadline' },
    { id: 2, employeeId: 5, date: '2026-02-20', hours: 2, rate: 1.5, status: 'pending', reason: 'Bug fixes' },
    { id: 3, employeeId: 6, date: '2026-02-19', hours: 4, rate: 2.0, status: 'approved', reason: 'Server migration' },
    { id: 4, employeeId: 8, date: '2026-02-21', hours: 2.5, rate: 1.5, status: 'pending', reason: 'Deployment' },
    { id: 5, employeeId: 3, date: '2026-02-18', hours: 3, rate: 1.5, status: 'approved', reason: 'Month-end closing' },
    { id: 6, employeeId: 2, date: '2026-02-21', hours: 1.5, rate: 1.5, status: 'rejected', reason: 'Campaign launch' },
    { id: 7, employeeId: 1, date: '2026-02-17', hours: 2, rate: 2.0, status: 'approved', reason: 'Production issue' },
];

// ─── Mock Leave Requests ───
export const leaveRequests = [
    { id: 1, employeeId: 4, type: 'cuti', startDate: '2026-02-22', endDate: '2026-02-24', days: 2, status: 'approved', reason: 'Family event', approvedBy: 3 },
    { id: 2, employeeId: 2, type: 'sakit', startDate: '2026-02-25', endDate: '2026-02-25', days: 1, status: 'pending', reason: 'Medical checkup', approvedBy: null },
    { id: 3, employeeId: 7, type: 'izin', startDate: '2026-02-28', endDate: '2026-02-28', days: 1, status: 'pending', reason: 'Personal matter', approvedBy: null },
    { id: 4, employeeId: 1, type: 'cuti', startDate: '2026-03-10', endDate: '2026-03-14', days: 5, status: 'pending', reason: 'Vacation', approvedBy: null },
    { id: 5, employeeId: 5, type: 'sakit', startDate: '2026-02-15', endDate: '2026-02-16', days: 2, status: 'approved', reason: 'Flu', approvedBy: 1 },
];

// ─── Mock Shifts ───
export const shifts = [
    { id: 'morning', name: 'Pagi', start: '07:00', end: '15:00', color: '#0047AB' },
    { id: 'afternoon', name: 'Siang', start: '13:00', end: '21:00', color: '#82C8E5' },
    { id: 'night', name: 'Malam', start: '21:00', end: '05:00', color: '#000080' },
    { id: 'normal', name: 'Normal', start: '08:00', end: '17:00', color: '#6D8196' },
];

export const shiftAssignments = [
    { employeeId: 1, shifts: ['normal', 'normal', 'normal', 'normal', 'normal', 'off', 'off'] },
    { employeeId: 2, shifts: ['normal', 'normal', 'normal', 'normal', 'normal', 'off', 'off'] },
    { employeeId: 3, shifts: ['normal', 'normal', 'normal', 'normal', 'normal', 'off', 'off'] },
    { employeeId: 5, shifts: ['morning', 'morning', 'afternoon', 'afternoon', 'night', 'off', 'off'] },
    { employeeId: 6, shifts: ['morning', 'morning', 'morning', 'afternoon', 'afternoon', 'off', 'off'] },
];

// ─── Mock Reimbursements ───
export const reimbursements = [
    { id: 1, employeeId: 1, type: 'Transport', amount: 350000, date: '2026-02-18', status: 'approved', receipt: 'receipt_001.jpg', notes: 'Client visit taxi' },
    { id: 2, employeeId: 3, type: 'Medical', amount: 1200000, date: '2026-02-19', status: 'pending', receipt: 'receipt_002.jpg', notes: 'Dental checkup' },
    { id: 3, employeeId: 6, type: 'Meeting', amount: 500000, date: '2026-02-20', status: 'pending', receipt: 'receipt_003.jpg', notes: 'Lunch meeting with vendor' },
    { id: 4, employeeId: 2, type: 'Transport', amount: 150000, date: '2026-02-15', status: 'paid', receipt: 'receipt_004.jpg', notes: 'Grab to event' },
    { id: 5, employeeId: 8, type: 'Medical', amount: 800000, date: '2026-02-10', status: 'rejected', receipt: 'receipt_005.jpg', notes: 'Non-covered procedure' },
];

// ─── Mock KPIs ───
export const kpiData = [
    {
        id: 1, employeeId: 1, period: '2026-Q1', overallScore: 88,
        metrics: [
            { name: 'Sprint Velocity', target: 40, actual: 38, score: 95 },
            { name: 'Code Review Turnaround', target: 24, actual: 18, score: 75 },
            { name: 'Code Quality', target: 95, actual: 92, score: 97 },
        ],
    },
    {
        id: 2, employeeId: 2, period: '2026-Q1', overallScore: 82,
        metrics: [
            { name: 'Leads Generated', target: 200, actual: 175, score: 88 },
            { name: 'Campaign ROI', target: 150, actual: 165, score: 100 },
            { name: 'Social Engagement', target: 5000, actual: 3200, score: 64 },
        ],
    },
    {
        id: 3, employeeId: 3, period: '2026-Q1', overallScore: 95,
        metrics: [
            { name: 'Report Accuracy', target: 99, actual: 99.5, score: 100 },
            { name: 'Closing Timeliness', target: 100, actual: 95, score: 95 },
            { name: 'Audit Findings', target: 0, actual: 1, score: 85 },
        ],
    },
    {
        id: 4, employeeId: 6, period: '2026-Q1', overallScore: 91,
        metrics: [
            { name: 'Uptime SLA', target: 99.9, actual: 99.7, score: 98 },
            { name: 'Incident Response', target: 15, actual: 12, score: 80 },
            { name: 'Process Efficiency', target: 90, actual: 88, score: 98 },
        ],
    },
];

// ─── Mock Appraisals ───
export const appraisals = [
    { id: 1, employeeId: 1, reviewerId: 6, period: '2025-H2', rating: 4.2, status: 'completed', comments: 'Excellent technical contribution. Could improve on cross-team communication.' },
    { id: 2, employeeId: 3, reviewerId: null, period: '2025-H2', rating: 4.5, status: 'completed', comments: 'Outstanding financial management. Key asset to the team.' },
    { id: 3, employeeId: 5, reviewerId: 1, period: '2025-H2', rating: 3.5, status: 'completed', comments: 'Shows good potential. Needs more initiative on complex tasks.' },
    { id: 4, employeeId: 2, reviewerId: 6, period: '2025-H2', rating: 3.8, status: 'in-progress', comments: 'Good creativity in campaigns, needs more data analysis skills.' },
    { id: 5, employeeId: 8, reviewerId: 1, period: '2025-H2', rating: 4.0, status: 'completed', comments: 'Reliable infrastructure work. Proactive in monitoring improvements.' },
];

// ─── Mock Job Postings ───
export const jobPostings = [
    {
        id: 1, title: 'Senior Frontend Developer', department: 'Engineering', location: 'Jakarta', type: 'Full-time', status: 'open',
        createdDate: '2026-02-01', deadline: '2026-03-15', applicants: 4,
        requirements: ['5+ years React', 'TypeScript', 'Design Systems', 'CSS/Animation'],
        description: 'We are looking for a Senior Frontend Developer to lead our web application development.'
    },
    {
        id: 2, title: 'Marketing Manager', department: 'Marketing', location: 'Jakarta', type: 'Full-time', status: 'open',
        createdDate: '2026-02-10', deadline: '2026-03-20', applicants: 2,
        requirements: ['7+ years marketing', 'Digital marketing', 'Team management', 'Data-driven'],
        description: 'Lead our marketing team to drive growth and brand awareness.'
    },
    {
        id: 3, title: 'Finance Intern', department: 'Finance', location: 'Jakarta', type: 'Internship', status: 'closed',
        createdDate: '2026-01-05', deadline: '2026-02-05', applicants: 12,
        requirements: ['Accounting student', 'Excel', 'Detail-oriented'],
        description: 'Join our finance team for a 6-month internship program.'
    },
];

// ─── Mock Candidates ───
export const candidates = [
    { id: 1, name: 'Diana Putri', email: 'diana@gmail.com', phone: '0812-1111-2222', jobId: 1, stage: 'interview', appliedDate: '2026-02-05', source: 'LinkedIn', rating: 4.2, notes: 'Strong portfolio' },
    { id: 2, name: 'Eko Prasetyo', email: 'eko.p@gmail.com', phone: '0813-2222-3333', jobId: 1, stage: 'screening', appliedDate: '2026-02-12', source: 'Referral', rating: 3.5, notes: 'Needs tech assessment' },
    { id: 3, name: 'Fitri Handayani', email: 'fitri.h@gmail.com', phone: '0814-3333-4444', jobId: 1, stage: 'offered', appliedDate: '2026-02-03', source: 'JobStreet', rating: 4.8, notes: 'Excellent match, salary negotiation' },
    { id: 4, name: 'Gilang Ramadhan', email: 'gilang@gmail.com', phone: '0815-4444-5555', jobId: 2, stage: 'screening', appliedDate: '2026-02-15', source: 'Careers Page', rating: 3.0, notes: '' },
    { id: 5, name: 'Hana Safira', email: 'hana.s@gmail.com', phone: '0816-5555-6666', jobId: 2, stage: 'interview', appliedDate: '2026-02-11', source: 'LinkedIn', rating: 4.5, notes: 'Experienced, good cultural fit' },
    { id: 6, name: 'Irfan Maulana', email: 'irfan@gmail.com', phone: '0817-6666-7777', jobId: 1, stage: 'rejected', appliedDate: '2026-02-08', source: 'LinkedIn', rating: 2.0, notes: 'Underqualified' },
    { id: 7, name: 'Joko Santoso', email: 'joko@gmail.com', phone: '0818-7777-8888', jobId: 1, stage: 'hired', appliedDate: '2026-01-20', source: 'Referral', rating: 4.7, notes: 'Start date: March 1' },
    { id: 8, name: 'Kartika Dewi', email: 'kartika@gmail.com', phone: '0819-8888-9999', jobId: 1, stage: 'applied', appliedDate: '2026-02-20', source: 'JobStreet', rating: 3.8, notes: 'Awaiting initial review' },
];

// ─── Mock Documents ───
export const employeeDocuments = [
    { id: 1, employeeId: 1, name: 'KTP', fileName: 'ktp_ahmad.pdf', uploadDate: '2022-03-15', size: '1.2 MB', description: 'Kartu Tanda Penduduk' },
    { id: 2, employeeId: 1, name: 'Ijazah S1', fileName: 'ijazah_ahmad.pdf', uploadDate: '2022-03-15', size: '2.5 MB', description: 'Ijazah Sarjana' },
    { id: 3, employeeId: 1, name: 'Surat Kontrak', fileName: 'kontrak_ahmad.pdf', uploadDate: '2022-03-15', size: '800 KB', description: 'Surat Perjanjian Kerja' },
    { id: 4, employeeId: 2, name: 'KTP', fileName: 'ktp_siti.pdf', uploadDate: '2024-06-01', size: '1.1 MB', description: 'Kartu Tanda Penduduk' },
    { id: 5, employeeId: 2, name: 'Kontrak Kerja', fileName: 'kontrak_siti.pdf', uploadDate: '2024-06-01', size: '950 KB', description: 'Surat Perjanjian Kerja Kontrak' },
    { id: 6, employeeId: 5, name: 'KTP', fileName: 'ktp_raka.pdf', uploadDate: '2025-09-01', size: '1.3 MB', description: 'Kartu Tanda Penduduk' },
    { id: 7, employeeId: 5, name: 'Sertifikat AWS', fileName: 'cert_aws_raka.pdf', uploadDate: '2025-10-10', size: '500 KB', description: 'AWS Solutions Architect' },
    { id: 8, employeeId: 3, name: 'NPWP', fileName: 'npwp_budi.pdf', uploadDate: '2020-01-10', size: '400 KB', description: 'Nomor Pokok Wajib Pajak' },
    { id: 9, employeeId: 6, name: 'Ijazah S1', fileName: 'ijazah_fajar.pdf', uploadDate: '2019-05-12', size: '2.2 MB', description: 'Ijazah Sarjana Teknik Industri' },
];

// ─── Organization Structure ───
export const orgStructure = {
    id: 0,
    name: 'CEO',
    title: 'Chief Executive Officer',
    children: [
        {
            id: 3,
            name: 'Budi Santoso',
            title: 'Finance Manager',
            children: [
                { id: 4, name: 'Dewi Lestari', title: 'HR Admin', children: [] },
            ],
        },
        {
            id: 1,
            name: 'Ahmad Rizky Pratama',
            title: 'Senior Developer',
            children: [
                { id: 5, name: 'Raka Pratama', title: 'Junior Developer', children: [] },
                { id: 8, name: 'Yoga Aditya', title: 'DevOps Engineer', children: [] },
            ],
        },
        {
            id: 6,
            name: 'Fajar Setiawan',
            title: 'Operations Lead',
            children: [],
        },
        {
            id: 2,
            name: 'Siti Nurhaliza',
            title: 'Marketing Specialist',
            children: [
                { id: 7, name: 'Anisa Rahmawati', title: 'Content Writer', children: [] },
            ],
        },
    ],
};

// ─── Mock IT Assets ───
export const assets = [
    { id: 'AST-001', name: 'MacBook Pro 14"', category: 'Laptop', brand: 'Apple', serial: 'C02X12345', purchaseDate: '2024-01-15', status: 'in-use', assignedTo: 1, condition: 'Good', notes: 'M3 Pro chip, 18GB RAM' },
    { id: 'AST-002', name: 'Dell Monitor 27"', category: 'Monitor', brand: 'Dell', serial: 'DL-U2723QE-001', purchaseDate: '2024-02-01', status: 'in-use', assignedTo: 1, condition: 'Good', notes: '4K USB-C' },
    { id: 'AST-003', name: 'ThinkPad X1 Carbon', category: 'Laptop', brand: 'Lenovo', serial: 'LNV-X1C-789', purchaseDate: '2023-06-10', status: 'in-use', assignedTo: 2, condition: 'Good', notes: 'Gen 11, i7' },
    { id: 'AST-004', name: 'Logitech MX Master 3S', category: 'Mouse', brand: 'Logitech', serial: 'LGT-MX3S-456', purchaseDate: '2024-03-01', status: 'in-use', assignedTo: 3, condition: 'Good', notes: 'Wireless' },
    { id: 'AST-005', name: 'Adobe Creative Cloud', category: 'Software', brand: 'Adobe', serial: 'ADO-CC-2024-01', purchaseDate: '2024-01-01', status: 'in-use', assignedTo: 7, condition: 'N/A', notes: 'Annual license' },
    { id: 'AST-006', name: 'MacBook Air M2', category: 'Laptop', brand: 'Apple', serial: 'C02Y67890', purchaseDate: '2024-04-20', status: 'in-use', assignedTo: 5, condition: 'Good', notes: '8GB RAM, 256GB' },
    { id: 'AST-007', name: 'Dell Monitor 24"', category: 'Monitor', brand: 'Dell', serial: 'DL-P2422H-002', purchaseDate: '2023-09-15', status: 'available', assignedTo: null, condition: 'Good', notes: 'FHD IPS' },
    { id: 'AST-008', name: 'Mechanical Keyboard', category: 'Keyboard', brand: 'Keychron', serial: 'KC-Q1-003', purchaseDate: '2024-05-01', status: 'available', assignedTo: null, condition: 'New', notes: 'Keychron Q1 Pro' },
    { id: 'AST-009', name: 'ThinkPad T14s', category: 'Laptop', brand: 'Lenovo', serial: 'LNV-T14S-321', purchaseDate: '2022-08-01', status: 'maintenance', assignedTo: null, condition: 'Fair', notes: 'Battery replacement needed' },
    { id: 'AST-010', name: 'Microsoft 365 License', category: 'Software', brand: 'Microsoft', serial: 'MS-365-E3-010', purchaseDate: '2024-01-01', status: 'in-use', assignedTo: 4, condition: 'N/A', notes: 'E3 Business' },
    { id: 'AST-011', name: 'Logitech Webcam C920', category: 'Peripheral', brand: 'Logitech', serial: 'LGT-C920-011', purchaseDate: '2023-03-01', status: 'in-use', assignedTo: 8, condition: 'Good', notes: 'HD 1080p' },
    { id: 'AST-012', name: 'Samsung Monitor 32"', category: 'Monitor', brand: 'Samsung', serial: 'SAM-32-012', purchaseDate: '2023-11-01', status: 'in-use', assignedTo: 6, condition: 'Good', notes: 'Curved QHD' },
];

// ─── Mock Helpdesk Tickets ───
export const tickets = [
    { id: 'TKT-001', employeeId: 5, subject: 'Laptop tidak bisa nyala', category: 'IT', priority: 'high', status: 'open', createdDate: '2026-02-21T08:30:00', slaHours: 4, description: 'Laptop MacBook Air tiba-tiba mati dan tidak bisa di-charge.', assignedTo: 'IT Support' },
    { id: 'TKT-002', employeeId: 2, subject: 'Error pada slip gaji bulan Januari', category: 'HR', priority: 'medium', status: 'in-progress', createdDate: '2026-02-20T10:15:00', slaHours: 24, description: 'Potongan BPJS di slip gaji tidak sesuai dengan rate yang berlaku.', assignedTo: 'HR Team' },
    { id: 'TKT-003', employeeId: 7, subject: 'Akses Adobe Creative Cloud error', category: 'IT', priority: 'medium', status: 'resolved', createdDate: '2026-02-18T14:00:00', resolvedDate: '2026-02-19T09:30:00', slaHours: 8, description: 'License expired, perlu renewal.', assignedTo: 'IT Support' },
    { id: 'TKT-004', employeeId: 1, subject: 'Request akses VPN untuk remote', category: 'IT', priority: 'low', status: 'open', createdDate: '2026-02-22T07:00:00', slaHours: 48, description: 'Butuh akses VPN untuk WFH minggu depan.', assignedTo: 'IT Support' },
    { id: 'TKT-005', employeeId: 3, subject: 'Pertanyaan kalkulasi pajak THR', category: 'Finance', priority: 'medium', status: 'in-progress', createdDate: '2026-02-19T11:30:00', slaHours: 24, description: 'Apakah THR dikenakan PPh 21 terpisah dari gaji bulanan?', assignedTo: 'Finance Team' },
    { id: 'TKT-006', employeeId: 6, subject: 'Monitor berkedip-kedip', category: 'IT', priority: 'high', status: 'resolved', createdDate: '2026-02-17T09:00:00', resolvedDate: '2026-02-17T14:00:00', slaHours: 4, description: 'Monitor Samsung 32" berkedip saat disambungkan ke docking station.', assignedTo: 'IT Support' },
    { id: 'TKT-007', employeeId: 4, subject: 'Update data rekening bank', category: 'HR', priority: 'low', status: 'open', createdDate: '2026-02-22T06:45:00', slaHours: 48, description: 'Ingin mengganti rekening bank dari BRI ke BCA untuk transfer gaji.', assignedTo: 'HR Team' },
];

// ─── Mock AI Capabilities ───
export const aiCapabilities = [
    { employeeId: 1, skills: [
        { name: 'Prompt Engineering', level: 'advanced', score: 85 },
        { name: 'GitHub Copilot', level: 'expert', score: 95 },
        { name: 'ChatGPT/Claude', level: 'advanced', score: 88 },
        { name: 'ML Basics', level: 'intermediate', score: 65 },
    ], lastAssessed: '2026-02-01', certifications: ['Google AI Essentials'] },
    { employeeId: 2, skills: [
        { name: 'Prompt Engineering', level: 'intermediate', score: 60 },
        { name: 'ChatGPT/Claude', level: 'advanced', score: 80 },
        { name: 'AI Content Tools', level: 'advanced', score: 82 },
        { name: 'Midjourney/DALL-E', level: 'intermediate', score: 55 },
    ], lastAssessed: '2026-01-28', certifications: [] },
    { employeeId: 3, skills: [
        { name: 'Prompt Engineering', level: 'beginner', score: 30 },
        { name: 'ChatGPT/Claude', level: 'intermediate', score: 50 },
        { name: 'AI Analytics', level: 'beginner', score: 25 },
        { name: 'ML Basics', level: 'beginner', score: 20 },
    ], lastAssessed: '2026-01-15', certifications: [] },
    { employeeId: 5, skills: [
        { name: 'Prompt Engineering', level: 'intermediate', score: 55 },
        { name: 'GitHub Copilot', level: 'advanced', score: 78 },
        { name: 'ChatGPT/Claude', level: 'intermediate', score: 60 },
        { name: 'ML Basics', level: 'beginner', score: 35 },
    ], lastAssessed: '2026-02-10', certifications: [] },
    { employeeId: 6, skills: [
        { name: 'Prompt Engineering', level: 'intermediate', score: 50 },
        { name: 'ChatGPT/Claude', level: 'intermediate', score: 55 },
        { name: 'AI Automation', level: 'advanced', score: 75 },
        { name: 'ML Basics', level: 'intermediate', score: 45 },
    ], lastAssessed: '2026-02-05', certifications: ['AWS ML Foundations'] },
    { employeeId: 7, skills: [
        { name: 'Prompt Engineering', level: 'advanced', score: 80 },
        { name: 'ChatGPT/Claude', level: 'expert', score: 92 },
        { name: 'AI Content Tools', level: 'expert', score: 90 },
        { name: 'Midjourney/DALL-E', level: 'advanced', score: 85 },
    ], lastAssessed: '2026-02-12', certifications: ['Google AI Essentials', 'Coursera GenAI'] },
    { employeeId: 8, skills: [
        { name: 'Prompt Engineering', level: 'advanced', score: 82 },
        { name: 'GitHub Copilot', level: 'expert', score: 92 },
        { name: 'ChatGPT/Claude', level: 'advanced', score: 85 },
        { name: 'AI Automation', level: 'expert', score: 90 },
    ], lastAssessed: '2026-02-08', certifications: ['AWS ML Foundations', 'Google AI Essentials'] },
];

// ─── Mock Offboarding / Exit Clearance ───
export const offboardingRecords = [
    {
        id: 1, employeeId: 5, type: 'contract-end', status: 'in-progress',
        initiatedDate: '2026-02-20', lastWorkingDay: '2026-03-31',
        reason: 'Kontrak berakhir — tidak diperpanjang',
        checklist: [
            { item: 'Pengembalian Laptop', completed: false, assetId: 'AST-006' },
            { item: 'Pengembalian Akses Kartu', completed: false, assetId: null },
            { item: 'Penutupan Email Perusahaan', completed: false, assetId: null },
            { item: 'Penutupan Akses Database/VPN', completed: false, assetId: null },
            { item: 'Kalkulasi Sisa Gaji Pro-rata', completed: true, assetId: null },
            { item: 'Transfer Knowledge', completed: false, assetId: null },
        ],
        proRataSalary: 5200000,
        severancePay: 0,
    },
    {
        id: 2, employeeId: 2, type: 'resign', status: 'initiated',
        initiatedDate: '2026-02-22', lastWorkingDay: '2026-03-22',
        reason: 'Pindah ke perusahaan lain',
        checklist: [
            { item: 'Pengembalian Laptop', completed: false, assetId: 'AST-003' },
            { item: 'Pengembalian Akses Kartu', completed: false, assetId: null },
            { item: 'Penutupan Email Perusahaan', completed: false, assetId: null },
            { item: 'Penutupan Akses Database/VPN', completed: false, assetId: null },
            { item: 'Kalkulasi Sisa Gaji Pro-rata', completed: false, assetId: null },
            { item: 'Transfer Knowledge', completed: false, assetId: null },
        ],
        proRataSalary: 0,
        severancePay: 0,
    },
];

// ─── Mock Geofencing & Attendance Logs ───
export const officeLocations = [
    { id: 1, name: 'Kantor Pusat Jakarta', latitude: -6.2088, longitude: 106.8456, radiusMeters: 100 },
    { id: 2, name: 'Branch Office Bandung', latitude: -6.9175, longitude: 107.6191, radiusMeters: 150 },
];

export const geoAttendanceLogs = [
    { id: 1, employeeId: 1, date: '2026-02-22', clockIn: '08:02', latitude: -6.2090, longitude: 106.8458, inRadius: true, selfieVerified: true, locationId: 1 },
    { id: 2, employeeId: 2, date: '2026-02-22', clockIn: '08:30', latitude: -6.2087, longitude: 106.8455, inRadius: true, selfieVerified: true, locationId: 1 },
    { id: 3, employeeId: 3, date: '2026-02-22', clockIn: '07:55', latitude: -6.2085, longitude: 106.8460, inRadius: true, selfieVerified: true, locationId: 1 },
    { id: 4, employeeId: 5, date: '2026-02-22', clockIn: '08:10', latitude: -6.3500, longitude: 106.8200, inRadius: false, selfieVerified: true, locationId: 1 },
    { id: 5, employeeId: 6, date: '2026-02-22', clockIn: '07:45', latitude: -6.2089, longitude: 106.8457, inRadius: true, selfieVerified: true, locationId: 1 },
    { id: 6, employeeId: 7, date: '2026-02-22', clockIn: '09:05', latitude: -6.2091, longitude: 106.8453, inRadius: true, selfieVerified: false, locationId: 1 },
    { id: 7, employeeId: 8, date: '2026-02-22', clockIn: '08:15', latitude: -6.5000, longitude: 107.0000, inRadius: false, selfieVerified: true, locationId: 1 },
    { id: 8, employeeId: 1, date: '2026-02-21', clockIn: '07:58', latitude: -6.2088, longitude: 106.8456, inRadius: true, selfieVerified: true, locationId: 1 },
    { id: 9, employeeId: 5, date: '2026-02-21', clockIn: '08:25', latitude: -6.2092, longitude: 106.8459, inRadius: true, selfieVerified: true, locationId: 1 },
];

// ─── Mock OCR Expense / Receipts ───
export const ocrExpenses = [
    { id: 1, employeeId: 1, category: 'Transport', date: '2026-02-20', manualAmount: 350000, ocrAmount: 350000, matched: true, status: 'approved', receiptFile: 'receipt_taxi_001.jpg', ocrText: 'Total: Rp 350.000', notes: 'Grab ke client meeting' },
    { id: 2, employeeId: 3, category: 'Medical', date: '2026-02-19', manualAmount: 1250000, ocrAmount: 1200000, matched: false, status: 'pending', receiptFile: 'receipt_medical_002.jpg', ocrText: 'Total: Rp 1.200.000', notes: 'Dental checkup — manual input lebih tinggi' },
    { id: 3, employeeId: 6, category: 'Meeting', date: '2026-02-18', manualAmount: 500000, ocrAmount: 500000, matched: true, status: 'pending', receiptFile: 'receipt_lunch_003.jpg', ocrText: 'Total: Rp 500.000', notes: 'Lunch meeting vendor' },
    { id: 4, employeeId: 2, category: 'Transport', date: '2026-02-17', manualAmount: 150000, ocrAmount: 148500, matched: false, status: 'approved', receiptFile: 'receipt_grab_004.jpg', ocrText: 'Total: Rp 148.500', notes: 'Grab ke event marketing' },
    { id: 5, employeeId: 8, category: 'Transport', date: '2026-02-16', manualAmount: 275000, ocrAmount: 275000, matched: true, status: 'paid', receiptFile: 'receipt_tol_005.jpg', ocrText: 'Total: Rp 275.000', notes: 'Tol + bensin site visit' },
    { id: 6, employeeId: 5, category: 'Medical', date: '2026-02-15', manualAmount: 800000, ocrAmount: 800000, matched: true, status: 'rejected', receiptFile: 'receipt_med_006.jpg', ocrText: 'Total: Rp 800.000', notes: 'Non-covered procedure' },
    { id: 7, employeeId: 4, category: 'Meeting', date: '2026-02-22', manualAmount: 320000, ocrAmount: 315000, matched: false, status: 'pending', receiptFile: 'receipt_meeting_007.jpg', ocrText: 'Total: Rp 315.000', notes: 'Coffee meeting HR event' },
];

// ─── Helper ───
export function getEmployeeById(id) {
    return employees.find((e) => e.id === id);
}

export function getContractDaysRemaining(contractEnd) {
    if (!contractEnd) return null;
    const end = new Date(contractEnd);
    const now = new Date();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

export function getDivisions() {
    return [...new Set(employees.map((e) => e.division))];
}

export function getPositions() {
    return [...new Set(employees.map((e) => e.position))];
}
