/**
 * KiniKerja — Create Founder/Superadmin User
 * Jalankan: node scripts/create_superadmin.js
 *
 * Isi SERVICE_ROLE_KEY dari: Supabase Dashboard → Settings → API → service_role
 *
 * SEMUA kredensial dibaca dari environment / argumen — JANGAN hardcode password di sini.
 *   SUPABASE_URL              (wajib)
 *   SUPABASE_SERVICE_ROLE_KEY (wajib)
 *   FOUNDER_EMAIL             (default: founder@kinikerja.com)
 *   FOUNDER_PASSWORD          (wajib — akan diminta jika kosong)
 */

import readline from 'readline/promises';
import { stdin, stdout } from 'process';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.FOUNDER_EMAIL || 'founder@kinikerja.com';

async function getPassword() {
  if (process.env.FOUNDER_PASSWORD) return process.env.FOUNDER_PASSWORD;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const pw = await rl.question('Masukkan password founder (disembunyikan): ');
  rl.close();
  return pw.trim();
}

async function createFounder() {
  // Validasi konfigurasi SEBELUM request — beri pesan jelas, bukan 401 samar.
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('\n❌ Konfigurasi tidak lengkap. Set env var berikut sebelum menjalankan script:');
    console.error('   SUPABASE_URL              — URL project Supabase');
    console.error('   SUPABASE_SERVICE_ROLE_KEY  — service_role key dari Dashboard > Settings > API');
    console.error('   FOUNDER_EMAIL              — (opsional, default founder@kinikerja.com)');
    console.error('   FOUNDER_PASSWORD           — (wajib, atau akan diminta interaktif)\n');
    process.exit(1);
  }

  const PASSWORD = await getPassword();

  console.log('🚀 Membuat akun Founder KiniKerja...\n');

  // 1. Buat auth user
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true, // langsung konfirmasi tanpa email
      user_metadata: { name: 'KiniKerja Founder' },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.msg?.includes('already been registered') || data.code === 'email_exists') {
      console.log('⚠️  User sudah ada, mengambil data existing...');
      // Get existing user
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
        headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
      });
      const listData = await listRes.json();
      if (!listData.users) {
        console.error('❌ Gagal mengambil daftar user. Cek SUPABASE_SERVICE_ROLE_KEY.');
        return;
      }
      const existing = listData.users.find(u => u.email === EMAIL);
      if (existing) {
        console.log(`✅ User ditemukan: ${existing.id}`);
        await upsertEmployee(existing.id);
      } else {
        console.error('❌ User terdaftar tapi tidak ditemukan di list.');
      }
    } else {
      console.error('❌ Error buat user:', JSON.stringify(data, null, 2));
    }
    return;
  }

  console.log(`✅ Auth user dibuat: ${data.id}`);
  await upsertEmployee(data.id);
}

async function upsertEmployee(userId) {
  // 2. Buat/update employee record
  const res = await fetch(`${SUPABASE_URL}/rest/v1/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      auth_user_id: userId,
      email: EMAIL,
      name: 'KiniKerja',
      role: 'founder',
      status: 'active',
    }),
  });

  if (res.ok || res.status === 201 || res.status === 200) {
    console.log('✅ Employee record founder berhasil dibuat/diupdate');
  } else {
    const err = await res.text();
    console.error('⚠️  Employee upsert warning:', err);
  }

  console.log('\n══════════════════════════════════════════');
  console.log('✅ AKUN FOUNDER SIAP DIGUNAKAN');
  console.log('══════════════════════════════════════════');
  console.log(`📧 Email    : ${EMAIL}`);
  console.log(`🔑 Password : (disembunyikan — gunakan yang Anda masukkan)`);
  console.log(`👑 Role     : founder (akses penuh)`);
  console.log(`🌐 Login di : http://localhost:5173/login`);
  console.log('══════════════════════════════════════════\n');
}

createFounder().catch(console.error);
