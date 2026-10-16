# KiniKerja Employee PWA — source

PWA employee (mobile) — desain dari canvas Moda "KiniKerja Employee – Mobile HRIS"
(33 halaman). Vanilla JS SPA, tanpa build step.

## File
- `index.html` — shell + script tags
- `styles.css` — design system (brand hijau #1fa36b, font Plus Jakarta Sans)
- `app.js` — hash router + tab bar + render()
- `api-client.js` — API client + doLogin/doRegister + format helpers
- `views-core.js` — ikon, helper, auth, home, absen, riwayat, profil, menu
- `views-cuti.js` — halaman cuti + sheet/bottom-sheet
- `views-reimburse.js` — halaman reimburse
- `views-misc.js` — lembur, slip gaji, tugas, notifikasi, verifikasi
- `manifest.json`, `sw.js`, `icon.svg` — PWA assets

## Deploy
Copy seluruh isi folder ini ke `dist/app/` di server:
```
xcopy pwa\* dist\app\ /E /Y
```
`server/index.js` sudah dikonfigurasi:
- `express.static` untuk `/app`
- mobile UA membuka `/` → 302 redirect ke `/app/`
- CSP relaxed (`unsafe-inline`) khusus `/app` — PWA memakai inline `onclick`

## Flow
- Desktop → `/` → website (landing page)
- Mobile → `/` → `/app/` → PWA
- API: `/api/*` (dipakai bersama website & PWA)
