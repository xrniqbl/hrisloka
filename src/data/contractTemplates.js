// Default HTML contract templates — seeded on first visit
// All templates use {{variable}} placeholders filled by contractService.fillTemplateVariables()

export const DEFAULT_TEMPLATES = [
  {
    type: 'pkwt',
    name: 'PKWT — Perjanjian Kerja Waktu Tertentu',
    description: 'Template standar kontrak kerja untuk karyawan kontrak (PKWT) sesuai PP No. 35 Tahun 2021',
    is_default: true,
    html_content: `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; color: #000; max-width: 800px; margin: 0 auto; padding: 40px;">

<div style="text-align:center; margin-bottom: 24px;">
  <h2 style="font-size:14pt; font-weight:bold; text-transform:uppercase; margin:0; letter-spacing:1px;">PERJANJIAN KERJA WAKTU TERTENTU</h2>
  <p style="margin:4px 0; font-size:11pt;">Nomor: <strong>{{contract_number}}</strong></p>
</div>

<p style="margin-bottom:16px;">Pada hari ini, tanggal <strong>{{contract_date}}</strong>, bertempat di <strong>{{city}}</strong>, kami yang bertanda tangan di bawah ini:</p>

<table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
  <tr>
    <td style="width:30%; vertical-align:top; padding:6px 0;"><strong>Pihak Pertama</strong></td>
    <td style="width:2%; vertical-align:top; padding:6px 0;">:</td>
    <td style="padding:6px 0;"></td>
  </tr>
  <tr>
    <td style="padding:3px 0 3px 20px;">Nama Perusahaan</td>
    <td>:</td>
    <td><strong>{{company_name}}</strong></td>
  </tr>
  <tr>
    <td style="padding:3px 0 3px 20px;">Alamat</td>
    <td>:</td>
    <td>{{company_address}}</td>
  </tr>
  <tr>
    <td style="padding:3px 0 3px 20px;">Diwakili oleh</td>
    <td>:</td>
    <td>{{company_director}}</td>
  </tr>
</table>

<p style="margin-bottom:8px;">Selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.</p>

<table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
  <tr>
    <td style="width:30%; vertical-align:top; padding:6px 0;"><strong>Pihak Kedua</strong></td>
    <td style="width:2%; vertical-align:top; padding:6px 0;">:</td>
    <td style="padding:6px 0;"></td>
  </tr>
  <tr>
    <td style="padding:3px 0 3px 20px;">Nama Lengkap</td>
    <td>:</td>
    <td><strong>{{employee_name}}</strong></td>
  </tr>
  <tr>
    <td style="padding:3px 0 3px 20px;">NIK</td>
    <td>:</td>
    <td>{{employee_nik}}</td>
  </tr>
  <tr>
    <td style="padding:3px 0 3px 20px;">Alamat</td>
    <td>:</td>
    <td>{{employee_address}}</td>
  </tr>
  <tr>
    <td style="padding:3px 0 3px 20px;">Jabatan</td>
    <td>:</td>
    <td>{{employee_position}}</td>
  </tr>
</table>

<p style="margin-bottom:16px;">Selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.</p>

<p style="margin-bottom:16px;">Kedua belah pihak sepakat untuk mengadakan Perjanjian Kerja Waktu Tertentu (PKWT) dengan ketentuan sebagai berikut:</p>

<hr style="border:1px solid #000; margin:16px 0;" />

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 1 — Ruang Lingkup Pekerjaan</h3>
<p>PIHAK PERTAMA mempekerjakan PIHAK KEDUA sebagai <strong>{{employee_position}}</strong> pada Divisi <strong>{{employee_division}}</strong>, dengan tugas pokok sesuai job description yang telah disampaikan dan menjadi bagian tidak terpisahkan dari perjanjian ini.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 2 — Jangka Waktu Perjanjian</h3>
<p>Perjanjian kerja ini berlaku selama jangka waktu tertentu, terhitung mulai tanggal <strong>{{contract_start}}</strong> sampai dengan tanggal <strong>{{contract_end}}</strong>. Perpanjangan perjanjian kerja ini harus dilakukan secara tertulis sebelum berakhirnya perjanjian, sesuai dengan Pasal 8 PP No. 35 Tahun 2021.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 3 — Tempat Kerja</h3>
<p>PIHAK KEDUA melaksanakan pekerjaan di kantor PIHAK PERTAMA yang beralamat di <strong>{{company_address}}</strong>, atau di tempat lain yang ditentukan oleh PIHAK PERTAMA berdasarkan kebutuhan operasional perusahaan, termasuk kemungkinan penugasan di kantor cabang.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 4 — Waktu Kerja</h3>
<p>Waktu kerja PIHAK KEDUA adalah 5 (lima) hari kerja per minggu, Senin s.d. Jumat, dengan jam kerja 8 (delapan) jam per hari atau 40 (empat puluh) jam per minggu. Lembur dilakukan apabila diperlukan dan mendapat persetujuan atasan, dibayarkan sesuai ketentuan Pasal 26–32 PP No. 35 Tahun 2021.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 5 — Upah dan Kompensasi</h3>
<p>PIHAK PERTAMA memberikan upah kepada PIHAK KEDUA sebagai berikut:</p>
<table style="width:100%; border-collapse:collapse; margin:8px 0;">
  <tr>
    <td style="padding:4px 0 4px 20px;">Gaji Pokok</td>
    <td style="width:10px;">:</td>
    <td><strong>{{base_salary}}</strong> per bulan</td>
  </tr>
  <tr>
    <td style="padding:4px 0 4px 20px;">Tunjangan</td>
    <td>:</td>
    <td><strong>{{allowance}}</strong> per bulan</td>
  </tr>
  <tr>
    <td style="padding:4px 0 4px 20px; border-top:1px solid #999;"><strong>Total Kompensasi</strong></td>
    <td style="border-top:1px solid #999;">:</td>
    <td style="border-top:1px solid #999;"><strong>{{total_salary}}</strong> per bulan (gross)</td>
  </tr>
</table>
<p>Upah dibayarkan melalui transfer bank setiap tanggal 25 bulan berjalan. Tunjangan Hari Raya (THR) diberikan sesuai PP No. 36 Tahun 2021.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 6 — Jaminan Sosial</h3>
<p>PIHAK PERTAMA mendaftarkan PIHAK KEDUA dalam program BPJS Kesehatan dan BPJS Ketenagakerjaan (JHT, JKK, JKM, JP) sesuai ketentuan peraturan perundang-undangan yang berlaku. Pembagian iuran masing-masing sesuai peraturan yang berlaku.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 7 — Hak Cuti</h3>
<p>PIHAK KEDUA berhak atas cuti setelah menjalani masa kerja 12 (dua belas) bulan berturut-turut, dengan ketentuan:</p>
<p style="padding-left:20px;">a. Cuti tahunan: 12 (dua belas) hari kerja per tahun;<br/>
b. Cuti sakit: sesuai surat keterangan dokter;<br/>
c. Cuti melahirkan: 3 (tiga) bulan bagi perempuan;<br/>
d. Cuti penting sesuai Pasal 93 UU No. 13 Tahun 2003.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 8 — Kewajiban Pihak Kedua</h3>
<p>PIHAK KEDUA berkewajiban untuk:</p>
<p style="padding-left:20px;">a. Melaksanakan pekerjaan dengan penuh tanggung jawab dan profesional;<br/>
b. Mematuhi peraturan perusahaan, kode etik, dan tata tertib yang berlaku;<br/>
c. Menjaga kerahasiaan informasi perusahaan selama dan setelah masa perjanjian berakhir;<br/>
d. Memberitahukan kepada PIHAK PERTAMA apabila terdapat perubahan data pribadi;<br/>
e. Menjaga dan memelihara inventaris/aset perusahaan yang dipercayakan.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 9 — Kewajiban Pihak Pertama</h3>
<p>PIHAK PERTAMA berkewajiban untuk:</p>
<p style="padding-left:20px;">a. Membayar upah sesuai perjanjian dan tepat waktu;<br/>
b. Mendaftarkan PIHAK KEDUA ke BPJS Kesehatan dan Ketenagakerjaan;<br/>
c. Menyediakan lingkungan kerja yang aman dan kondusif;<br/>
d. Memberikan hak-hak normatif sesuai peraturan perundang-undangan.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 10 — Kompensasi Pengakhiran PKWT</h3>
<p>Apabila perjanjian ini berakhir sebelum atau pada waktunya, PIHAK PERTAMA wajib memberikan uang kompensasi kepada PIHAK KEDUA yang besarnya dihitung sesuai Pasal 15–16 PP No. 35 Tahun 2021, yakni: masa kerja 12 bulan = 1 bulan upah.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 11 — Kerahasiaan</h3>
<p>PIHAK KEDUA wajib menjaga kerahasiaan seluruh informasi bisnis, data pelanggan, strategi, teknologi, dan informasi nonpublik milik PIHAK PERTAMA. Kewajiban ini tetap berlaku selama 2 (dua) tahun setelah berakhirnya perjanjian kerja ini.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 12 — Penyelesaian Perselisihan</h3>
<p>Setiap perselisihan yang timbul dari perjanjian ini diselesaikan secara musyawarah mufakat (bipartit). Apabila tidak tercapai kesepakatan, diselesaikan melalui Dinas Ketenagakerjaan setempat, dan jika diperlukan melalui Pengadilan Hubungan Industrial yang berwenang.</p>

<h3 style="font-size:12pt; text-decoration:underline; margin:16px 0 8px;">Pasal 13 — Ketentuan Lain</h3>
<p>a. Perubahan atas perjanjian ini hanya dapat dilakukan secara tertulis dengan persetujuan kedua belah pihak;<br/>
b. Perjanjian ini dibuat dalam 2 (dua) rangkap bermaterai cukup, masing-masing pihak mendapat 1 (satu) rangkap;<br/>
c. Perjanjian ini berlaku dan mengikat sejak ditandatangani oleh kedua belah pihak.</p>

<hr style="border:1px solid #000; margin:24px 0;" />

<p style="text-align:center; margin-bottom:32px;">Demikian Perjanjian Kerja Waktu Tertentu ini dibuat dan ditandatangani di <strong>{{city}}</strong> pada tanggal <strong>{{contract_date}}</strong>.</p>

<table style="width:100%; border-collapse:collapse; margin-top:20px;">
  <tr>
    <td style="width:45%; text-align:center; vertical-align:top; padding:0 10px;">
      <p><strong>PIHAK PERTAMA</strong></p>
      <p style="font-size:10pt; color:#666;">{{company_name}}</p>
      <br/><br/><br/><br/><br/>
      <p>__________________________</p>
      <p><strong>{{company_director}}</strong></p>
      <p style="font-size:10pt;">Direktur / HR Manager</p>
    </td>
    <td style="width:10%;"></td>
    <td style="width:45%; text-align:center; vertical-align:top; padding:0 10px;">
      <p><strong>PIHAK KEDUA</strong></p>
      <p style="font-size:10pt; color:#666;">Karyawan</p>
      <br/><br/><br/><br/><br/>
      <p>__________________________</p>
      <p><strong>{{employee_name}}</strong></p>
      <p style="font-size:10pt;">{{employee_position}}</p>
    </td>
  </tr>
</table>

<p style="text-align:center; margin-top:40px; font-size:9pt; color:#888; border-top:1px solid #ddd; padding-top:12px;">Dokumen ini dibuat secara resmi dan bermaterai sesuai hukum yang berlaku di Indonesia.</p>
</div>`,
  },

  {
    type: 'pkwtt',
    name: 'PKWTT — Perjanjian Kerja Waktu Tidak Tertentu',
    description: 'Template kontrak karyawan tetap (PKWTT) dengan masa percobaan 3 bulan, sesuai UU No. 6/2023',
    is_default: true,
    html_content: `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; color: #000; max-width: 800px; margin: 0 auto; padding: 40px;">

<div style="text-align:center; margin-bottom: 24px;">
  <h2 style="font-size:14pt; font-weight:bold; text-transform:uppercase; margin:0; letter-spacing:1px;">PERJANJIAN KERJA WAKTU TIDAK TERTENTU</h2>
  <p style="margin:4px 0; font-size:11pt;">Nomor: <strong>{{contract_number}}</strong></p>
</div>

<p style="margin-bottom:16px;">Pada hari ini, tanggal <strong>{{contract_date}}</strong>, bertempat di <strong>{{city}}</strong>, kami yang bertanda tangan di bawah ini:</p>

<table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
  <tr>
    <td style="width:30%; padding:3px 0 3px 0;"><strong>Nama Perusahaan</strong></td>
    <td style="width:2%;">:</td>
    <td><strong>{{company_name}}</strong></td>
  </tr>
  <tr>
    <td style="padding:3px 0;">Alamat</td>
    <td>:</td>
    <td>{{company_address}}</td>
  </tr>
  <tr>
    <td style="padding:3px 0;">Diwakili oleh</td>
    <td>:</td>
    <td>{{company_director}}, selaku Direktur/HR Manager</td>
  </tr>
</table>

<p>Selanjutnya disebut <strong>PERUSAHAAN</strong>, dan:</p>

<table style="width:100%; border-collapse:collapse; margin:8px 0 16px 0;">
  <tr>
    <td style="width:30%; padding:3px 0;"><strong>Nama Lengkap</strong></td>
    <td style="width:2%;">:</td>
    <td><strong>{{employee_name}}</strong></td>
  </tr>
  <tr>
    <td style="padding:3px 0;">NIK</td>
    <td>:</td>
    <td>{{employee_nik}}</td>
  </tr>
  <tr>
    <td style="padding:3px 0;">Alamat Domisili</td>
    <td>:</td>
    <td>{{employee_address}}</td>
  </tr>
</table>

<p>Selanjutnya disebut <strong>KARYAWAN</strong>.</p>

<p style="margin:16px 0;">Kedua belah pihak sepakat mengadakan Perjanjian Kerja Waktu Tidak Tertentu (PKWTT) dengan syarat dan ketentuan sebagai berikut:</p>

<hr style="border:1px solid #000; margin:16px 0;" />

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 1 — Pengangkatan dan Jabatan</h3>
<p>PERUSAHAAN mengangkat KARYAWAN sebagai <strong>{{employee_position}}</strong> pada Divisi/Departemen <strong>{{employee_division}}</strong>, terhitung mulai tanggal <strong>{{join_date}}</strong>. KARYAWAN wajib melaksanakan tugas sesuai job description yang telah ditetapkan.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 2 — Masa Percobaan</h3>
<p>KARYAWAN menjalani masa percobaan selama <strong>3 (tiga) bulan</strong>, terhitung dari tanggal <strong>{{join_date}}</strong>. Selama masa percobaan, upah tidak kurang dari Upah Minimum yang berlaku. PERUSAHAAN berhak mengakhiri hubungan kerja apabila KARYAWAN tidak memenuhi standar kinerja yang ditetapkan.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 3 — Tempat Kerja</h3>
<p>KARYAWAN melaksanakan pekerjaan di <strong>{{company_address}}</strong>, atau di lokasi lain sesuai kebutuhan operasional perusahaan.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 4 — Waktu Kerja</h3>
<p>Jam kerja adalah 5 (lima) hari per minggu, 8 (delapan) jam per hari (40 jam/minggu). Pekerjaan di luar jam kerja merupakan lembur dan mendapat upah lembur sesuai peraturan.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 5 — Upah</h3>
<table style="width:90%; border-collapse:collapse; margin:8px 0 8px 20px;">
  <tr>
    <td style="padding:4px 0; width:40%;">Gaji Pokok</td>
    <td style="width:5%;">:</td>
    <td><strong>{{base_salary}}</strong>/bulan</td>
  </tr>
  <tr>
    <td style="padding:4px 0;">Tunjangan</td>
    <td>:</td>
    <td><strong>{{allowance}}</strong>/bulan</td>
  </tr>
  <tr style="border-top:1px solid #999;">
    <td style="padding:4px 0;"><strong>Total (Gross)</strong></td>
    <td>:</td>
    <td><strong>{{total_salary}}</strong>/bulan</td>
  </tr>
</table>
<p>Pembayaran dilakukan via transfer bank setiap tanggal 25. THR dibayarkan sesuai PP No. 36/2021. Kenaikan gaji ditinjau setiap tahun atas dasar prestasi dan kemampuan perusahaan.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 6 — Jaminan Sosial</h3>
<p>PERUSAHAAN mendaftarkan KARYAWAN pada BPJS Kesehatan dan BPJS Ketenagakerjaan (JHT, JKK, JKM, JP) sesuai ketentuan perundang-undangan.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 7 — Cuti</h3>
<p>Setelah 12 bulan kerja: cuti tahunan 12 hari kerja. Cuti sakit, cuti melahirkan, dan cuti penting diatur sesuai UU Ketenagakerjaan.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 8 — Pengembangan Karir</h3>
<p>PERUSAHAAN berkomitmen memberikan pelatihan, pengembangan kompetensi, dan kesempatan promosi berdasarkan kinerja dan kebutuhan organisasi.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 9 — Kewajiban Karyawan</h3>
<p style="padding-left:20px;">a. Melaksanakan tugas dengan penuh dedikasi dan tanggung jawab;<br/>
b. Mematuhi peraturan perusahaan;<br/>
c. Menjaga rahasia perusahaan;<br/>
d. Tidak bekerja untuk pesaing atau pihak yang berbenturan kepentingan tanpa izin tertulis;<br/>
e. Menjaga nama baik dan asset perusahaan.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 10 — Pemutusan Hubungan Kerja</h3>
<p>PHK dilakukan sesuai UU No. 6 Tahun 2023 jo. PP No. 35/2021. Karyawan berhak atas:</p>
<p style="padding-left:20px;">a. Uang Pesangon sesuai masa kerja;<br/>
b. Uang Penghargaan Masa Kerja;<br/>
c. Uang Penggantian Hak (cuti yang belum diambil, biaya perjalanan, dll).</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 11 — Kerahasiaan & HKI</h3>
<p>Seluruh karya, inovasi, dan produk yang dihasilkan KARYAWAN dalam lingkup pekerjaannya merupakan milik PERUSAHAAN. Kewajiban kerahasiaan berlaku selama dan 2 tahun setelah berakhirnya hubungan kerja.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 12 — Penyelesaian Perselisihan</h3>
<p>Perselisihan diselesaikan melalui: (1) musyawarah bipartit; (2) mediasi Dinas Ketenagakerjaan; (3) Pengadilan Hubungan Industrial.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 13 — Penutup</h3>
<p>Perjanjian ini dibuat dalam 2 rangkap bermaterai, berlaku sejak ditandatangani dan dapat diubah hanya secara tertulis atas kesepakatan kedua pihak.</p>

<hr style="border:1px solid #000; margin:24px 0;" />

<p style="text-align:center; margin-bottom:32px;">Ditandatangani di <strong>{{city}}</strong>, pada tanggal <strong>{{contract_date}}</strong>.</p>

<table style="width:100%; border-collapse:collapse; margin-top:20px;">
  <tr>
    <td style="width:45%; text-align:center; padding:0 10px;">
      <p><strong>PERUSAHAAN</strong></p>
      <p style="font-size:10pt; color:#666;">{{company_name}}</p>
      <br/><br/><br/><br/><br/>
      <p>__________________________</p>
      <p><strong>{{company_director}}</strong></p>
      <p style="font-size:10pt;">Direktur / HR Manager</p>
    </td>
    <td style="width:10%;"></td>
    <td style="width:45%; text-align:center; padding:0 10px;">
      <p><strong>KARYAWAN</strong></p>
      <p style="font-size:10pt; color:#666;">&nbsp;</p>
      <br/><br/><br/><br/><br/>
      <p>__________________________</p>
      <p><strong>{{employee_name}}</strong></p>
      <p style="font-size:10pt;">{{employee_position}}</p>
    </td>
  </tr>
</table>
</div>`,
  },

  {
    type: 'offering_letter',
    name: 'Offering Letter — Surat Penawaran Kerja',
    description: 'Surat penawaran kerja profesional untuk calon karyawan baru',
    is_default: true,
    html_content: `<div style="font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.7; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px;">

<div style="border-bottom: 3px solid #0047AB; padding-bottom: 16px; margin-bottom: 24px;">
  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
    <div>
      <p style="font-size:18pt; font-weight:bold; color:#0047AB; margin:0;">{{company_name}}</p>
      <p style="margin:4px 0; color:#666; font-size:9pt;">{{company_address}}</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:9pt; color:#888; margin:0;">No: {{contract_number}}</p>
      <p style="font-size:9pt; color:#888; margin:0;">Tanggal: {{today}}</p>
    </div>
  </div>
</div>

<p><strong>Kepada Yth.</strong><br/>
<strong>{{employee_name}}</strong><br/>
{{employee_address}}</p>

<p>Dengan hormat,</p>

<p>Setelah melalui serangkaian proses seleksi, kami dengan bangga menyampaikan bahwa Anda telah berhasil dan terpilih untuk bergabung bersama <strong>{{company_name}}</strong>.</p>

<div style="background:#F0F7FF; border-left:4px solid #0047AB; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0;">
  <p style="font-weight:bold; color:#0047AB; margin:0 0 12px; font-size:12pt;">Detail Penawaran</p>
  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="padding:5px 0; width:40%; color:#555;">Jabatan</td>
      <td style="width:5%;">:</td>
      <td><strong>{{employee_position}}</strong></td>
    </tr>
    <tr>
      <td style="padding:5px 0; color:#555;">Departemen</td>
      <td>:</td>
      <td><strong>{{employee_division}}</strong></td>
    </tr>
    <tr>
      <td style="padding:5px 0; color:#555;">Jenis Kontrak</td>
      <td>:</td>
      <td><strong>Perjanjian Kerja Waktu Tertentu (PKWT)</strong></td>
    </tr>
    <tr>
      <td style="padding:5px 0; color:#555;">Tanggal Mulai Kerja</td>
      <td>:</td>
      <td><strong>{{join_date}}</strong></td>
    </tr>
    <tr>
      <td style="padding:5px 0; color:#555;">Status</td>
      <td>:</td>
      <td><strong>Karyawan Kontrak</strong></td>
    </tr>
  </table>
</div>

<div style="background:#F0FDF4; border-left:4px solid #16A34A; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0;">
  <p style="font-weight:bold; color:#16A34A; margin:0 0 12px; font-size:12pt;">Kompensasi & Benefit</p>
  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="padding:5px 0; width:40%; color:#555;">Gaji Pokok</td>
      <td style="width:5%;">:</td>
      <td><strong>{{base_salary}}</strong> per bulan</td>
    </tr>
    <tr>
      <td style="padding:5px 0; color:#555;">Tunjangan</td>
      <td>:</td>
      <td><strong>{{allowance}}</strong> per bulan</td>
    </tr>
    <tr style="border-top:1px solid #BBF7D0;">
      <td style="padding:8px 0 5px; color:#555;"><strong>Total Paket (Gross)</strong></td>
      <td>:</td>
      <td><strong style="font-size:13pt; color:#16A34A;">{{total_salary}}</strong> per bulan</td>
    </tr>
    <tr>
      <td style="padding:5px 0; color:#555;">Tunjangan Hari Raya (THR)</td>
      <td>:</td>
      <td>Sesuai PP No. 36/2021</td>
    </tr>
    <tr>
      <td style="padding:5px 0; color:#555;">BPJS Kesehatan & TK</td>
      <td>:</td>
      <td>Ditanggung perusahaan sesuai ketentuan</td>
    </tr>
    <tr>
      <td style="padding:5px 0; color:#555;">Cuti Tahunan</td>
      <td>:</td>
      <td>12 hari kerja/tahun (setelah 12 bulan)</td>
    </tr>
  </table>
</div>

<h3 style="font-size:11pt; font-weight:bold; margin:20px 0 8px;">Syarat & Ketentuan</h3>
<p>1. Penawaran ini berlaku selama <strong>5 (lima) hari kerja</strong> sejak tanggal surat ini diterbitkan.<br/>
2. Penawaran ini bersifat rahasia dan hanya berlaku untuk Anda sebagai penerima.<br/>
3. Sebelum bergabung, Anda diminta menyerahkan dokumen berikut kepada HRD:<br/>
</p>
<ul style="padding-left:40px; margin:8px 0;">
  <li>Fotokopi KTP / Identitas diri</li>
  <li>Fotokopi ijazah terakhir yang telah dilegalisir</li>
  <li>Foto 3×4 berwarna (2 lembar)</li>
  <li>Nomor rekening bank atas nama sendiri</li>
  <li>Nomor BPJS (jika sudah memiliki)</li>
  <li>NPWP (jika sudah memiliki)</li>
</ul>
<p>4. Penawaran ini dapat dibatalkan apabila informasi yang Anda sampaikan selama proses rekrutmen terbukti tidak benar.</p>

<div style="background:#FFFBEB; border:1px solid #F59E0B; border-radius:8px; padding:16px 20px; margin:24px 0;">
  <p style="font-weight:bold; color:#92400E; margin:0 0 8px;">Konfirmasi Penerimaan</p>
  <p style="margin:0; color:#92400E; font-size:10pt;">Mohon berikan konfirmasi penerimaan tawaran ini paling lambat <strong>5 hari kerja</strong> sejak tanggal surat ini kepada tim HR kami di <strong>{{company_phone}}</strong>.</p>
</div>

<p>Kami sangat antusias menyambut Anda sebagai bagian dari keluarga besar <strong>{{company_name}}</strong> dan berharap dapat bersama-sama membangun organisasi yang lebih baik.</p>

<p>Hormat kami,<br/><br/>

<strong>{{company_director}}</strong><br/>
HR Manager / Direktur<br/>
{{company_name}}</p>

<hr style="border:1px solid #ddd; margin:32px 0;" />

<div style="border:1px solid #ddd; border-radius:8px; padding:20px;">
  <p style="font-weight:bold; margin:0 0 12px; font-size:11pt;">Konfirmasi Penerimaan</p>
  <p>Saya, <strong>{{employee_name}}</strong>, dengan ini menyatakan bahwa saya <strong>menerima</strong> tawaran kerja di atas dengan kondisi dan ketentuan yang telah dijelaskan.</p>
  <table style="width:100%; margin-top:20px;">
    <tr>
      <td style="width:50%; padding-right:20px;">
        <p>Tanda Tangan:</p>
        <br/><br/>
        <p>__________________________</p>
        <p>{{employee_name}}</p>
      </td>
      <td style="width:50%;">
        <p>Tanggal:</p>
        <br/><br/>
        <p>__________________________</p>
      </td>
    </tr>
  </table>
</div>
</div>`,
  },

  {
    type: 'appointment',
    name: 'Surat Pengangkatan Karyawan Tetap',
    description: 'Surat pengangkatan resmi dari karyawan kontrak menjadi karyawan tetap',
    is_default: true,
    html_content: `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; color: #000; max-width: 800px; margin: 0 auto; padding: 40px;">

<div style="text-align:center; margin-bottom:24px;">
  <h2 style="font-size:14pt; font-weight:bold; text-transform:uppercase; margin:0; letter-spacing:2px;">SURAT KEPUTUSAN PENGANGKATAN</h2>
  <h3 style="font-size:12pt; font-weight:bold; margin:4px 0;">KARYAWAN TETAP</h3>
  <p style="margin:4px 0; font-size:11pt;">Nomor: <strong>{{contract_number}}</strong></p>
</div>

<p>Pimpinan <strong>{{company_name}}</strong> yang bertanda tangan di bawah ini:</p>

<table style="width:100%; border-collapse:collapse; margin:12px 0 20px 20px;">
  <tr>
    <td style="width:30%; padding:3px 0;">Nama</td>
    <td style="width:2%;">:</td>
    <td>{{company_director}}</td>
  </tr>
  <tr>
    <td style="padding:3px 0;">Jabatan</td>
    <td>:</td>
    <td>Direktur / HR Manager</td>
  </tr>
  <tr>
    <td style="padding:3px 0;">Perusahaan</td>
    <td>:</td>
    <td>{{company_name}}</td>
  </tr>
</table>

<p>Dengan ini <strong>MEMUTUSKAN</strong> dan <strong>MENETAPKAN</strong>:</p>

<div style="border:2px solid #000; padding:16px 24px; margin:16px 0; background:#FAFAFA;">
  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="padding:6px 0; width:35%;"><strong>Diangkat Sebagai</strong></td>
      <td style="width:2%;">:</td>
      <td><strong>Karyawan Tetap (PKWTT)</strong></td>
    </tr>
    <tr>
      <td style="padding:6px 0;">Nama Karyawan</td>
      <td>:</td>
      <td><strong>{{employee_name}}</strong></td>
    </tr>
    <tr>
      <td style="padding:6px 0;">NIP</td>
      <td>:</td>
      <td>{{employee_nip}}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;">NIK</td>
      <td>:</td>
      <td>{{employee_nik}}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;">Jabatan</td>
      <td>:</td>
      <td><strong>{{employee_position}}</strong></td>
    </tr>
    <tr>
      <td style="padding:6px 0;">Divisi</td>
      <td>:</td>
      <td>{{employee_division}}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;">Terhitung Mulai</td>
      <td>:</td>
      <td><strong>{{join_date}}</strong></td>
    </tr>
    <tr>
      <td style="padding:6px 0;"><strong>Gaji Pokok</strong></td>
      <td>:</td>
      <td><strong>{{base_salary}}</strong> per bulan</td>
    </tr>
  </table>
</div>

<p>Pengangkatan ini diberikan berdasarkan:</p>
<p style="padding-left:20px;">1. Penilaian kinerja yang memuaskan selama masa kontrak;<br/>
2. Kebutuhan organisasi dan ketersediaan formasi jabatan;<br/>
3. Rekomendasi dari atasan langsung yang bersangkutan.</p>

<p>Kepada yang bersangkutan diberikan hak-hak sebagaimana diatur dalam Peraturan Perusahaan dan peraturan perundang-undangan yang berlaku, termasuk:</p>
<p style="padding-left:20px;">a. Gaji pokok sebesar <strong>{{base_salary}}</strong> per bulan;<br/>
b. Tunjangan sebesar <strong>{{allowance}}</strong> per bulan;<br/>
c. BPJS Kesehatan dan Ketenagakerjaan;<br/>
d. Cuti tahunan 12 hari kerja per tahun;<br/>
e. Tunjangan Hari Raya sesuai ketentuan;</p>

<p>Karyawan yang bersangkutan <strong>wajib</strong>:</p>
<p style="padding-left:20px;">a. Melaksanakan tugas dan tanggung jawab jabatan dengan sebaik-baiknya;<br/>
b. Mematuhi peraturan dan kebijakan perusahaan;<br/>
c. Menjaga kerahasiaan informasi perusahaan;<br/>
d. Melaporkan setiap perubahan data pribadi kepada HRD.</p>

<p>Surat Keputusan ini berlaku sejak tanggal yang ditetapkan dan tidak dapat dipindahtangankan.</p>

<p style="margin-top:32px;">Ditetapkan di <strong>{{city}}</strong>,<br/>
Pada tanggal <strong>{{contract_date}}</strong></p>

<div style="display:flex; justify-content:space-between; margin-top:20px;">
  <div style="text-align:center; width:40%;">
    <p><strong>{{company_name}}</strong></p>
    <br/><br/><br/><br/>
    <p>__________________________</p>
    <p><strong>{{company_director}}</strong></p>
    <p style="font-size:10pt;">Direktur / HR Manager</p>
  </div>
  <div style="text-align:center; width:40%;">
    <p>Telah diterima dan diketahui,</p>
    <br/><br/><br/><br/>
    <p>__________________________</p>
    <p><strong>{{employee_name}}</strong></p>
    <p style="font-size:10pt;">Yang Bersangkutan</p>
  </div>
</div>
</div>`,
  },

  {
    type: 'addendum',
    name: 'Addendum Kontrak — Perubahan Ketentuan',
    description: 'Template addendum untuk perubahan/amandemen perjanjian kerja yang sudah ada (kenaikan gaji, perubahan jabatan, dll)',
    is_default: true,
    html_content: `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; color: #000; max-width: 800px; margin: 0 auto; padding: 40px;">

<div style="text-align:center; margin-bottom:24px;">
  <h2 style="font-size:14pt; font-weight:bold; text-transform:uppercase; margin:0;">ADDENDUM PERJANJIAN KERJA</h2>
  <p style="margin:4px 0; font-size:11pt;">Nomor: <strong>{{contract_number}}</strong></p>
</div>

<p>Addendum ini dibuat pada tanggal <strong>{{contract_date}}</strong> di <strong>{{city}}</strong>, merupakan bagian tidak terpisahkan dari Perjanjian Kerja yang telah ditandatangani sebelumnya antara:</p>

<table style="width:100%; border-collapse:collapse; margin:16px 0;">
  <tr>
    <td style="width:30%; padding:3px 0;"><strong>Perusahaan</strong></td>
    <td style="width:2%;">:</td>
    <td><strong>{{company_name}}</strong> (PIHAK PERTAMA)</td>
  </tr>
  <tr>
    <td style="padding:3px 0;">Diwakili oleh</td>
    <td>:</td>
    <td>{{company_director}}</td>
  </tr>
</table>

<p>dan</p>

<table style="width:100%; border-collapse:collapse; margin:8px 0 16px 0;">
  <tr>
    <td style="width:30%; padding:3px 0;"><strong>Karyawan</strong></td>
    <td style="width:2%;">:</td>
    <td><strong>{{employee_name}}</strong> (PIHAK KEDUA)</td>
  </tr>
  <tr>
    <td style="padding:3px 0;">NIP</td>
    <td>:</td>
    <td>{{employee_nip}}</td>
  </tr>
  <tr>
    <td style="padding:3px 0;">Jabatan</td>
    <td>:</td>
    <td>{{employee_position}}</td>
  </tr>
</table>

<p>Kedua belah pihak sepakat untuk mengubah/menambahkan ketentuan dalam perjanjian kerja sebagai berikut:</p>

<hr style="border:1px solid #000; margin:16px 0;" />

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 1 — Ketentuan yang Diubah</h3>

<div style="border:1px solid #ddd; border-radius:4px; padding:16px; margin:12px 0; background:#FFF9F0;">
  <p style="font-weight:bold; margin:0 0 12px;">Perubahan Kompensasi</p>
  <table style="width:100%; border-collapse:collapse;">
    <tr style="background:#eee;">
      <th style="padding:8px; text-align:left; border:1px solid #ccc;">Komponen</th>
      <th style="padding:8px; text-align:center; border:1px solid #ccc;">Sebelum</th>
      <th style="padding:8px; text-align:center; border:1px solid #ccc;">Sesudah</th>
    </tr>
    <tr>
      <td style="padding:8px; border:1px solid #ddd;">Gaji Pokok</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:center;">Rp ................</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:center;"><strong>{{base_salary}}</strong></td>
    </tr>
    <tr>
      <td style="padding:8px; border:1px solid #ddd;">Tunjangan</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:center;">Rp ................</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:center;"><strong>{{allowance}}</strong></td>
    </tr>
    <tr>
      <td style="padding:8px; border:1px solid #ddd;">Jabatan</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:center;">................</td>
      <td style="padding:8px; border:1px solid #ddd; text-align:center;"><strong>{{employee_position}}</strong></td>
    </tr>
  </table>
</div>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 2 — Berlakunya Perubahan</h3>
<p>Perubahan sebagaimana dimaksud dalam Pasal 1 berlaku efektif mulai tanggal <strong>{{contract_start}}</strong>.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 3 — Ketentuan Tetap</h3>
<p>Seluruh ketentuan lain yang tercantum dalam Perjanjian Kerja asli yang tidak diubah oleh Addendum ini tetap berlaku dan mengikat kedua belah pihak.</p>

<h3 style="text-decoration:underline; margin:16px 0 8px;">Pasal 4 — Persetujuan</h3>
<p>Addendum ini dibuat dan ditandatangani atas dasar kesepakatan bersama tanpa ada unsur paksaan dari pihak manapun.</p>

<hr style="border:1px solid #000; margin:24px 0;" />

<p style="text-align:center;">Ditandatangani di <strong>{{city}}</strong>, pada tanggal <strong>{{contract_date}}</strong>.</p>

<table style="width:100%; border-collapse:collapse; margin-top:24px;">
  <tr>
    <td style="width:45%; text-align:center; padding:0 10px;">
      <p><strong>PIHAK PERTAMA</strong></p>
      <p style="font-size:10pt; color:#666;">{{company_name}}</p>
      <br/><br/><br/><br/>
      <p>__________________________</p>
      <p><strong>{{company_director}}</strong></p>
    </td>
    <td style="width:10%;"></td>
    <td style="width:45%; text-align:center; padding:0 10px;">
      <p><strong>PIHAK KEDUA</strong></p>
      <p style="font-size:10pt; color:#666;">Karyawan</p>
      <br/><br/><br/><br/>
      <p>__________________________</p>
      <p><strong>{{employee_name}}</strong></p>
    </td>
  </tr>
</table>
</div>`,
  },
];
