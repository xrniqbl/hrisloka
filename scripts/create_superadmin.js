/**
 * HRIS Loka — Create Founder/Superadmin User
 * Jalankan: node scripts/create_superadmin.js
 * 
 * Isi SERVICE_ROLE_KEY dari: Supabase Dashboard → Settings → API → service_role
 */

const SUPABASE_URL = 'https://gfimdkypxiflnmklfsnk.supabase.co';
const SERVICE_ROLE_KEY = 'ISI_SERVICE_ROLE_KEY_DISINI'; // ← isi dari dashboard

const EMAIL = 'hrisloka@gmail.com';
const PASSWORD = 'HrisLoka@2026!';

async function createFounder() {
  console.log('🚀 Membuat akun Founder HRIS Loka...\n');

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
      user_metadata: { name: 'HRIS Loka Founder' },
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
      const existing = listData.users?.find(u => u.email === EMAIL);
      if (existing) {
        console.log(`✅ User ditemukan: ${existing.id}`);
        await upsertEmployee(existing.id);
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
      email: 'hrisloka@gmail.com',
      name: 'HRIS Loka',
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
  console.log(`📧 Email    : hrisloka@gmail.com`);
  console.log(`🔑 Password : ${PASSWORD}`);
  console.log(`👑 Role     : founder (akses penuh)`);
  console.log(`🌐 Login di : http://localhost:5173/login`);
  console.log('══════════════════════════════════════════\n');
}

createFounder().catch(console.error);
