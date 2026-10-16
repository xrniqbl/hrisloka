/**
 * WhatsApp Notification Service
 *
 * Calls /api/send-whatsapp — FONNTE_TOKEN stays on server.
 * Requires authenticated Supabase session (Bearer JWT).
 *
 * Setup:
 * 1. Set FONNTE_TOKEN (no VITE_ prefix) on the server / VPS
 * 2. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on the server for JWT verify
 */

import { supabase } from '../lib/supabase';

/** Get the current user's access token (for authenticating serverless calls). */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

/**
 * Send WhatsApp — routes through /api/send-whatsapp (auth required).
 */
export async function sendWhatsApp(to, message) {
  if (!to) return { success: false, error: 'No phone number' };

  try {
    const res = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ to, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'Server WA error');
    return { success: true };
  } catch (err) {
    console.error('[WhatsApp] Send failed:', err);
    return { success: false, error: err.message };
  }
}


// ── WA Message Templates ──────────────────────────────────────────────────────

export function buildLeaveStatusMessage(employeeName, status, leaveType, startDate, endDate) {
  const statusEmoji = status === 'approved' ? '✅' : '❌';
  const statusText = status === 'approved' ? 'DISETUJUI' : 'DITOLAK';
  return `🏢 *KiniKerja — Notifikasi Cuti*

Halo, *${employeeName}*!

Pengajuan cuti kamu telah *${statusText}* ${statusEmoji}

📋 *Detail Cuti:*
• Jenis: ${leaveType}
• Mulai: ${startDate}
• Selesai: ${endDate}

${status === 'approved'
    ? 'Selamat menikmati cuti kamu! 🌟'
    : 'Silakan hubungi HRD untuk informasi lebih lanjut.'}

_KiniKerja — Smart HR Platform_`;
}

export function buildPayslipMessage(employeeName, month, year, netSalary) {
  return `🏢 *KiniKerja — Slip Gaji Tersedia*

Halo, *${employeeName}*!

Slip gaji kamu untuk periode *${month} ${year}* sudah tersedia di aplikasi.

💰 *Total Diterima:*
*Rp ${Number(netSalary).toLocaleString('id-ID')}*

Buka aplikasi KiniKerja untuk melihat rincian lengkap dan download slip gaji.

_KiniKerja — Smart HR Platform_`;
}

export function buildClockInReminderMessage(employeeName) {
  const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `🕐 *KiniKerja — Pengingat Absensi*

Halo, *${employeeName}*!

Jangan lupa absen masuk hari ini ya! 👋

Sekarang pukul *${jam} WIB*.
Segera buka aplikasi KiniKerja untuk clock-in.

_KiniKerja — Smart HR Platform_`;
}

export function buildApprovalReminderMessage(managerName, pendingCount, type) {
  return `📋 *KiniKerja — Perlu Persetujuan*

Halo, *${managerName}*!

Ada *${pendingCount} pengajuan ${type}* yang menunggu persetujuan kamu.

Buka portal KiniKerja untuk memproses pengajuan tersebut.

_KiniKerja — Smart HR Platform_`;
}

export function buildReimbursementMessage(employeeName, status, amount, category) {
  const statusEmoji = status === 'approved' ? '✅' : status === 'paid' ? '💰' : '❌';
  const statusText = status === 'approved' ? 'DISETUJUI' : status === 'paid' ? 'DIBAYARKAN' : 'DITOLAK';
  return `🏢 *KiniKerja — Notifikasi Reimburse*

Halo, *${employeeName}*!

Pengajuan reimbursement kamu telah *${statusText}* ${statusEmoji}

📋 *Detail:*
• Kategori: ${category}
• Jumlah: Rp ${Number(amount).toLocaleString('id-ID')}

_KiniKerja — Smart HR Platform_`;
}

/**
 * Probe WhatsApp backend. True if route is live (does not prove FONNTE_TOKEN is set).
 */
export async function isWhatsAppConfigured() {
  try {
    const res = await fetch('/api/send-whatsapp', { method: 'OPTIONS' });
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * Test connection — send a test message (requires logged-in session).
 */
export async function testWhatsAppConnection(phoneNumber) {
  const message = `✅ *Test Berhasil!*\n\nKoneksi WhatsApp KiniKerja berhasil dikonfigurasi.\n\n_Pesan ini dikirim dari KiniKerja Integration Hub._`;
  return sendWhatsApp(phoneNumber, message);
}
