import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateSEOTags, injectSchema } from '../lib/seo';

const PRIVACY_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Kebijakan Privasi HRIS Loka',
  url: 'https://hrisloka.com/privacy',
  description: 'Kebijakan privasi dan perlindungan data pengguna HRIS Loka sesuai regulasi Indonesia.',
  inLanguage: 'id',
  publisher: { '@type': 'Organization', name: 'HRIS Loka', url: 'https://hrisloka.com' },
  dateModified: '2026-05-21',
};

const s = {
  page: { maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px', fontFamily: 'Inter, system-ui, sans-serif', color: '#1E293B', lineHeight: 1.8 },
  nav: { padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', background: '#fff', marginBottom: 0 },
  h1: { fontSize: 36, fontWeight: 900, marginBottom: 8, color: '#0F172A' },
  date: { fontSize: 13, color: '#94A3B8', marginBottom: 40, display: 'block' },
  h2: { fontSize: 20, fontWeight: 800, marginTop: 40, marginBottom: 12, color: '#0F172A' },
  p: { fontSize: 15, color: '#374151', marginBottom: 16 },
  ul: { paddingLeft: 20, marginBottom: 16 },
  li: { fontSize: 15, color: '#374151', marginBottom: 8 },
  a: { color: '#0047AB' },
};

export default function PrivacyPolicy() {
  useEffect(() => {
    updateSEOTags({
      title: 'Kebijakan Privasi — HRIS Loka',
      description: 'Kebijakan privasi HRIS Loka menjelaskan cara kami mengumpulkan, menggunakan, dan melindungi data personal pengguna sesuai regulasi perlindungan data Indonesia.',
      canonical: 'https://hrisloka.com/privacy',
      keywords: 'kebijakan privasi HRIS Loka, perlindungan data, privacy policy HR software',
    });
    injectSchema('privacy-page', PRIVACY_SCHEMA);
  }, []);

  return (
    <>
      <nav style={s.nav}>
        <Link to="/" style={{ fontSize: 20, fontWeight: 900, color: '#0047AB', textDecoration: 'none' }}>HRIS Loka</Link>
        <Link to="/landing" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>← Kembali</Link>
      </nav>
      <main style={s.page}>
        <h1 style={s.h1}>Kebijakan Privasi</h1>
        <span style={s.date}>Terakhir diperbarui: 21 Mei 2026</span>

        <p style={s.p}>HRIS Loka ("kami", "Layanan") berkomitmen untuk melindungi privasi dan keamanan data pengguna. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, mengungkapkan, dan melindungi informasi Anda saat menggunakan platform HRIS Loka.</p>

        <h2 style={s.h2}>1. Informasi yang Kami Kumpulkan</h2>
        <p style={s.p}>Kami mengumpulkan informasi berikut:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Data Identitas:</strong> Nama, NIP, email, nomor telepon, foto profil</li>
          <li style={s.li}><strong>Data Pekerjaan:</strong> Jabatan, divisi, gaji, riwayat kehadiran, KPI</li>
          <li style={s.li}><strong>Data Lokasi:</strong> Koordinat GPS saat absensi (hanya pada saat clock-in/out)</li>
          <li style={s.li}><strong>Data Biometrik:</strong> Deskriptor wajah untuk verifikasi kehadiran (disimpan terenkripsi)</li>
          <li style={s.li}><strong>Data Perangkat:</strong> Browser, OS, dan informasi perangkat untuk keamanan akun</li>
        </ul>

        <h2 style={s.h2}>2. Cara Kami Menggunakan Data</h2>
        <ul style={s.ul}>
          <li style={s.li}>Menyediakan dan mengoperasikan layanan HRIS Loka</li>
          <li style={s.li}>Memverifikasi kehadiran dan identitas karyawan</li>
          <li style={s.li}>Menghitung penggajian dan tunjangan karyawan</li>
          <li style={s.li}>Mengirimkan notifikasi terkait layanan (email, WhatsApp, push notification)</li>
          <li style={s.li}>Meningkatkan keamanan dan mencegah penyalahgunaan</li>
          <li style={s.li}>Memenuhi kewajiban hukum dan perpajakan</li>
        </ul>

        <h2 style={s.h2}>3. Keamanan Data</h2>
        <p style={s.p}>Kami menerapkan standar keamanan tinggi untuk melindungi data Anda:</p>
        <ul style={s.ul}>
          <li style={s.li}>Enkripsi data saat transit (HTTPS/TLS 1.3) dan saat penyimpanan</li>
          <li style={s.li}>Row-Level Security (RLS) — data perusahaan terisolasi penuh antar tenant</li>
          <li style={s.li}>Role-Based Access Control (RBAC) — akses hanya sesuai jabatan</li>
          <li style={s.li}>Audit log lengkap setiap perubahan data sensitif</li>
          <li style={s.li}>Infrastruktur cloud tier-1 (Supabase/Vercel) dengan SLA 99.9%</li>
        </ul>

        <h2 style={s.h2}>4. Berbagi Data dengan Pihak Ketiga</h2>
        <p style={s.p}>Kami tidak menjual data Anda. Data hanya dibagikan kepada penyedia layanan infrastruktur yang membantu kami mengoperasikan platform (Supabase, Vercel, Resend, Fonnte) dengan perjanjian kerahasiaan data yang ketat.</p>

        <h2 style={s.h2}>5. Retensi Data</h2>
        <p style={s.p}>Data karyawan disimpan selama akun aktif dan selama 1 tahun setelah penghapusan akun untuk keperluan audit, sesuai regulasi ketenagakerjaan Indonesia. Data biometrik (deskriptor wajah) dihapus segera setelah akun dinonaktifkan.</p>

        <h2 style={s.h2}>6. Hak Pengguna</h2>
        <p style={s.p}>Anda berhak untuk:</p>
        <ul style={s.ul}>
          <li style={s.li}>Mengakses dan mengunduh data pribadi Anda</li>
          <li style={s.li}>Meminta koreksi data yang tidak akurat</li>
          <li style={s.li}>Meminta penghapusan data (right to be forgotten)</li>
          <li style={s.li}>Menolak pemrosesan data untuk tujuan tertentu</li>
        </ul>

        <h2 style={s.h2}>7. Kontak</h2>
        <p style={s.p}>Untuk pertanyaan atau permintaan terkait privasi data, hubungi kami di: <a href="mailto:hrisloka@gmail.com" style={s.a}>hrisloka@gmail.com</a></p>
        <p style={s.p}>HRIS Loka · Bandung, Jawa Barat, Indonesia</p>
      </main>
    </>
  );
}
