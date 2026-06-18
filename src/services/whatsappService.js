/**
 * WhatsApp Notification Service
 *
 * Calls /api/send-whatsapp Vercel serverless function — token stays on server.
 * Fallback: direct Fonnte call in dev mode (VITE_FONNTE_TOKEN must be set).
 *
 * Setup:
 * 1. Set FONNTE_TOKEN (no VITE_ prefix) in Vercel environment variables
 * 2. Alternatively set VITE_FONNTE_TOKEN for local dev only
 */

const IS_DEV = import.meta.env.DEV;
const FONNTE_TOKEN_DEV = import.meta.env.VITE_FONNTE_TOKEN; // Dev only

/**
 * Send WhatsApp — routes through /api/send-whatsapp in production.
 */
export async function sendWhatsApp(to, message) {
  if (!to) return { success: false, error: 'No phone number' };

  try {
    const res = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Server WA error');
    return { success: true };
  } catch (err) {
    // Dev fallback: call Fonnte directly
    if (IS_DEV && FONNTE_TOKEN_DEV) {
      console.warn('[WhatsApp] Using dev fallback (direct Fonnte)');
      return sendDirectFonnte(to, message);
    }
    console.error('[WhatsApp] Send failed:', err);
    return { success: false, error: err.message };
  }
}

async function sendDirectFonnte(to, message) {
  if (!FONNTE_TOKEN_DEV) {
    console.warn('[WhatsApp] No VITE_FONNTE_TOKEN — message skipped');
    return { success: false, error: 'Fonnte token not configured' };
  }
  const phone = to?.replace(/[\s\-\(\)]/g, '').replace(/^0/, '62').replace(/^\+/, '');
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN_DEV, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: phone, message, countryCode: '62' }),
    });
    const data = await res.json();
    if (!data.status) throw new Error(data.reason || 'Fonnte send failed');
    return { success: true };
  } catch (err) {
    console.error('[WhatsApp] Direct Fonnte failed:', err);
    return { success: false, error: err.message };
  }
}

// ── WA Message Templates ──────────────────────────────────────────────────────

export function buildLeaveStatusMessage(employeeName, status, leaveType, startDate, endDate) {
  const statusEmoji = status === 'approved' ? '✅' : '❌';
  const statusText = status === 'approved' ? 'DISETUJUI' : 'DITOLAK';
  return `🏢 *HRIS Loka — Notifikasi Cuti*

Halo, *${employeeName}*!

Pengajuan cuti kamu telah *${statusText}* ${statusEmoji}

📋 *Detail Cuti:*
• Jenis: ${leaveType}
• Mulai: ${startDate}
• Selesai: ${endDate}

${status === 'approved'
    ? 'Selamat menikmati cuti kamu! 🌟'
    : 'Silakan hubungi HRD untuk informasi lebih lanjut.'}

_HRIS Loka — Smart HR Platform_`;
}

export function buildPayslipMessage(employeeName, month, year, netSalary) {
  return `🏢 *HRIS Loka — Slip Gaji Tersedia*

Halo, *${employeeName}*!

Slip gaji kamu untuk periode *${month} ${year}* sudah tersedia di aplikasi.

💰 *Total Diterima:*
*Rp ${Number(netSalary).toLocaleString('id-ID')}*

Buka aplikasi HRIS Loka untuk melihat rincian lengkap dan download slip gaji.

_HRIS Loka — Smart HR Platform_`;
}

export function buildClockInReminderMessage(employeeName) {
  const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `🕐 *HRIS Loka — Pengingat Absensi*

Halo, *${employeeName}*!

Jangan lupa absen masuk hari ini ya! 👋

Sekarang pukul *${jam} WIB*.
Segera buka aplikasi HRIS Loka untuk clock-in.

_HRIS Loka — Smart HR Platform_`;
}

export function buildApprovalReminderMessage(managerName, pendingCount, type) {
  return `📋 *HRIS Loka — Perlu Persetujuan*

Halo, *${managerName}*!

Ada *${pendingCount} pengajuan ${type}* yang menunggu persetujuan kamu.

Buka portal HRIS Loka untuk memproses pengajuan tersebut.

_HRIS Loka — Smart HR Platform_`;
}

export function buildReimbursementMessage(employeeName, status, amount, category) {
  const statusEmoji = status === 'approved' ? '✅' : status === 'paid' ? '💰' : '❌';
  const statusText = status === 'approved' ? 'DISETUJUI' : status === 'paid' ? 'DIBAYARKAN' : 'DITOLAK';
  return `🏢 *HRIS Loka — Notifikasi Reimburse*

Halo, *${employeeName}*!

Pengajuan reimbursement kamu telah *${statusText}* ${statusEmoji}

📋 *Detail:*
• Kategori: ${category}
• Jumlah: Rp ${Number(amount).toLocaleString('id-ID')}

_HRIS Loka — Smart HR Platform_`;
}

/**
 * Check if WhatsApp service is configured.
 */
export function isWhatsAppConfigured() {
  return !IS_DEV || !!FONNTE_TOKEN_DEV;
}

/**
 * Test connection — send a test message.
 */
export async function testWhatsAppConnection(phoneNumber) {
  const message = `✅ *Test Berhasil!*\n\nKoneksi WhatsApp HRIS Loka berhasil dikonfigurasi.\n\n_Pesan ini dikirim dari HRIS Loka Integration Hub._`;
  return sendWhatsApp(phoneNumber, message);
}
