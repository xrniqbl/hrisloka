
/**
 * KiniKerja — VPS production server
 *
 * Serves:
 *  - Vite build from /dist (SPA + static assets)
 *  - API handlers from /api/* (same modules as Vercel-style handlers)
 *  - Daily subscription cron (replaces vercel.json crons)
 *
 * Usage:
 *   npm run build
 *   npm start
 *
 * Env: copy .env.example → .env (see docs/VPS_DEPLOY.md)
 */

import 'dotenv/config';
import express from 'express';
import { waf } from './waf.js';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import cron from 'node-cron';
import crypto from 'crypto';
import {
  applySecurityHeaders,
  isPrivateSeoPath,
  buildContentSecurityPolicy,
} from '../api/_shared/securityHeaders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const API_DIR = path.join(ROOT, 'api');
const APP_DIR = path.join(DIST, 'app'); // PWA employee (mobile)

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

// Trust reverse proxy (nginx) for correct IPs / HTTPS
app.set('trust proxy', 1);

// ── Security headers (all responses) ─────────────────────────────────────
app.use((req, res, next) => {
  applySecurityHeaders(res, {
    csp: true,
    hsts: process.env.NODE_ENV === 'production' || req.secure,
  });
  if (isPrivateSeoPath(req.path)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  // API never cached by shared caches
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

// Body size limits — reduce DoS surface
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Health ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'kinikerja',
    time: new Date().toISOString(),
    hasDist: fs.existsSync(DIST),
  });
});

// ── Adapt Vercel-style (req, res) handlers to Express ─────────────────────
function wrapHandler(handler) {
  return async (req, res) => {
    try {
      // Vercel often uses req.query.secret; Express already provides req.query
      await handler(req, res);
    } catch (err) {
      console.error('[API]', req.method, req.path, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

async function loadHandler(relativePath) {
  const full = path.join(API_DIR, relativePath);
  if (!fs.existsSync(full)) return null;
  try {
    const mod = await import(pathToFileURL(full).href);
    return mod.default || mod.handler || null;
  } catch (err) {
    // One broken api/*.js must never kill the whole VPS process at boot.
    console.error(`[server] failed to load API handler ${relativePath}:`, err?.message || err);
    return null;
  }
}

const API_ROUTES = [
  ['/api/send-email', 'send-email.js'],
  ['/api/send-whatsapp', 'send-whatsapp.js'],
  ['/api/send-push', 'send-push.js'],
  ['/api/ai-review', 'ai-review.js'],
  ['/api/banks', 'banks.js'],
  ['/api/cron-check-subscriptions', 'cron-check-subscriptions.js'],
  ['/api/attendance/clock-in', 'attendance/clock-in.js'],
  ['/api/auth/login', 'auth/login.js'],
  ['/api/auth/register', 'auth/register.js'],
  ['/api/auth/me', 'auth/me.js'],
  ['/api/attendance/today', 'attendance/today.js'],
  ['/api/attendance/history', 'attendance/history.js'],
  ['/api/leave', 'leave.js'],
  ['/api/reimburse', 'reimburse.js'],
  ['/api/payslip', 'payslip.js'],
  ['/api/jadwal', 'jadwal.js'],
  ['/api/kasbon', 'kasbon.js'],
  ['/api/lembur', 'lembur.js'],
  ['/api/pelatihan', 'pelatihan.js'],
  ['/api/kpi', 'kpi.js'],
  ['/api/tim', 'tim.js'],
  ['/api/penghargaan', 'penghargaan.js'],
  ['/api/pengumuman', 'pengumuman.js'],
  ['/api/surat', 'surat.js'],
  ['/api/pajak', 'pajak.js'],
  ['/api/dinas', 'dinas.js'],
  ['/api/tukar-shift', 'tukarshift.js'],
  ['/api/wfh', 'wfh.js'],
  ['/api/helpdesk', 'helpdesk.js'],
  ['/api/direktori', 'direktori.js'],
  ['/api/apresiasi', 'apresiasi.js'],
  ['/api/survei', 'survei.js'],
  ['/api/elearning', 'elearning.js'],
  ['/api/notifications', 'notifications.js'],
  ['/api/approvals', 'approvals.js'],
  ['/api/profil', 'profil.js'],
  ['/api/admin', 'admin.js'],
  ['/api/daftar-perusahaan', 'daftar-perusahaan.js'],
  ['/api/bayar', 'bayar.js'],
  ['/api/bayar/webhook', 'bayar-webhook.js'],
  ['/api/webauthn', 'webauthn.js'],
  ['/api/upload', 'upload.js'],
  ['/api/reset-password', 'reset-password.js'],
  ['/api/push', 'push.js'],
  ['/api/2fa', '2fa.js'],
  ['/api/sessions', 'sessions.js'],
];

// ── Rate limiting ──
const rateMap = new Map();
function rateLimit(req, res, next) {
  // login & reset: 10/menit per IP
  const strict = req.path.includes('/auth/login') || req.path.includes('/reset-password');
  const limit = strict ? 10 : 120;
  const window = 60 * 1000;
  const key = (req.ip || req.connection.remoteAddress) + ':' + (strict ? 'strict' : 'api');
  const now = Date.now();
  const e = rateMap.get(key) || { count: 0, start: now };
  if (now - e.start > window) { e.count = 1; e.start = now; }
  else e.count++;
  rateMap.set(key, e);
  if (e.count > limit) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' });
  }
  next();
  // bersihkan map tiap 5 menit
  if (rateMap.size > 10000) rateMap.clear();
}
// NOTE: no second header block here — applySecurityHeaders() above is the
// single source (Permissions-Policy camera=(self) for face attendance).
// A duplicate block used to overwrite camera=(self) with camera=(), which
// denied getUserMedia in production. Defense-in-depth lives in nginx.
// ── Honeypot: jebak scanner ──
app.use('/wp-admin', (req, res) => res.status(404).send('Not Found'));
app.use('/wp-login.php', (req, res) => res.status(404).send('Not Found'));
app.use('/.env', (req, res) => res.status(404).send('Not Found'));
app.use('/.git/config', (req, res) => res.status(404).send('Not Found'));
app.use(waf);
app.use('/api/', rateLimit);

for (const [route, file] of API_ROUTES) {
  const handler = await loadHandler(file);
  if (!handler) {
    console.warn(`[server] API handler missing: ${file}`);
    continue;
  }
  const wrapped = wrapHandler(handler);
  // approvals & profil pakai prefix-match (ada subpath)
  if (file === 'approvals.js' || file === 'profil.js' || file === 'admin.js' || file === 'bayar.js' || file === 'webauthn.js' || file === 'upload.js' || file === 'push.js' || file === 'reset-password.js' || file === '2fa.js' || file === 'sessions.js') {
    app.use(route, wrapped);
    console.log(`[server] mounted ${route}* → api/${file}`);
    continue;
  }
  app.all(route, wrapped);
  // trailing slash variant
  app.all(route + '/', wrapped);
  console.log(`[server] mounted ${route} → api/${file}`);
}

// ── Static SPA ───────────────────────────────────────────────────────────
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
      if (filePath.includes(`${path.sep}models${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // HTML shell — short cache so deploys pick up new meta/assets
      if (filePath.endsWith(`${path.sep}index.html`) || filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    },
  }));

  // ── PWA employee (/app) — mobile ─────────────────────────────────────
  const MOBILE_RE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;
  const isMobileUA = (req) => MOBILE_RE.test(req.headers['user-agent'] || '');
  if (fs.existsSync(APP_DIR)) {
  app.use('/app', express.static(APP_DIR, {
      maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
      index: 'index.html',
      setHeaders(res, filePath) {
        if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
          // PWA memakai inline onclick handlers — CSP relaxed khusus /app
          res.setHeader(
            'Content-Security-Policy',
            buildContentSecurityPolicy({ strictScripts: false }),
          );
        }
      },
    }));
  }
  // Mobile membuka / → arahkan ke PWA
  app.get('/', (req, res, next) => {
    if (isMobileUA(req) && fs.existsSync(path.join(APP_DIR, 'index.html'))) {
      return res.redirect(302, '/app/');
    }
    next();
  });

  // Halaman statis (harga, fitur, keamanan, blog, id)
  for (const p of ['harga', 'fitur', 'keamanan', 'blog']) {
    app.get('/' + p, (req, res) => res.sendFile(path.join(DIST, p + '.html')));
    app.get('/' + p + '/', (req, res) => res.sendFile(path.join(DIST, p + '.html')));
  }
  for (const a of ['titip-absen', 'pph21', 'bpjs-vs-swasta']) {
    app.get('/blog/' + a, (req, res) => res.sendFile(path.join(DIST, 'blog-' + a + '.html')));
    app.get('/blog/' + a + '/', (req, res) => res.sendFile(path.join(DIST, 'blog-' + a + '.html')));
  }
  app.get('/id', (req, res) => res.sendFile(path.join(DIST, 'id', 'index.html')));
  app.get('/id/', (req, res) => res.sendFile(path.join(DIST, 'id', 'index.html')));
  app.get('/admin', (req, res) => res.sendFile(path.join(DIST, 'admin', 'index.html')));
  app.get('/admin/', (req, res) => res.sendFile(path.join(DIST, 'admin', 'index.html')));
  app.get('/daftar-perusahaan', (req, res) => res.sendFile(path.join(DIST, 'daftar-perusahaan.html')));
  app.get('/api-docs', (req, res) => res.sendFile(path.join(DIST, 'api-docs.html')));
  app.get('/api-docs/', (req, res) => res.sendFile(path.join(DIST, 'api-docs.html')));
  app.get('/tos', (req, res) => res.sendFile(path.join(DIST, 'tos.html')));
  app.get('/privacy', (req, res) => res.sendFile(path.join(DIST, 'privacy.html')));
  app.get('/daftar-perusahaan/', (req, res) => res.sendFile(path.join(DIST, 'daftar-perusahaan.html')));

  // SPA fallback — inject per-request CSP nonce into index.html (strict script-src)
  // NOTE: /app/* is part of the SAME React SPA (EmployeeLayout in App.jsx),
  // not a separate dist/app build — always serve dist/index.html.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    // Static files already handled; only HTML navigations
    if (path.extname(req.path) && !req.path.endsWith('.html')) return next();

    const isApp = req.path === '/app' || req.path.startsWith('/app/');
    const indexHtml = path.join(DIST, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      return res.status(503).send('Build missing. Run: npm run build');
    }

    let nonce = '';
    if (isApp) {
      // PWA employee memakai inline onclick handlers — izinkan unsafe-inline
      res.setHeader(
        'Content-Security-Policy',
        buildContentSecurityPolicy({ strictScripts: false }),
      );
    } else {
      nonce = crypto.randomBytes(16).toString('base64');
      res.setHeader(
        'Content-Security-Policy',
        buildContentSecurityPolicy({ nonce, strictScripts: true }),
      );
    }
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

    let html = fs.readFileSync(indexHtml, 'utf8');
    if (!isApp) {
      // Stamp nonce on any remaining inline scripts (none expected after register-sw.js)
      html = html.replace(/<script(?![^>]*\bsrc=)/gi, `<script nonce="${nonce}"`);
    }
    // Expose for debugging / future hydration
    if (!isApp) {
      html = html.replace(
        '<head>',
        `<head>\n    <meta property="csp-nonce" content="${nonce}" />`,
      );
    }
    res.type('html').send(html);
  });
} else {
  console.warn('[server] dist/ not found — run npm run build before production start');
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.status(503).send('Frontend not built. Run: npm run build');
  });
}

// ── Daily cron (subscription checks) — 00:00 server time ─────────────────
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 0 * * *';
const enableCron = process.env.ENABLE_CRON !== 'false';

if (enableCron) {
  cron.schedule(CRON_SCHEDULE, async () => {
    console.log('[cron] Running subscription check…');
    try {
      const handler = await loadHandler('cron-check-subscriptions.js');
      if (!handler) {
        console.warn('[cron] handler not found');
        return;
      }
      const fakeReq = {
        method: 'GET',
        headers: { 'x-cron-secret': process.env.CRON_SECRET || '' },
        query: { secret: process.env.CRON_SECRET || '' },
        body: {},
        socket: { remoteAddress: '127.0.0.1' },
      };
      const fakeRes = {
        statusCode: 200,
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        status(code) { this.statusCode = code; return this; },
        json(payload) {
          console.log('[cron] result', this.statusCode, JSON.stringify(payload).slice(0, 300));
          return this;
        },
        end() { return this; },
      };
      await handler(fakeReq, fakeRes);
    } catch (err) {
      console.error('[cron] failed:', err);
    }
  });
  console.log(`[server] cron enabled: ${CRON_SCHEDULE}`);
}

app.listen(PORT, HOST, () => {
  console.log(`[server] KiniKerja listening on http://${HOST}:${PORT}`);
  console.log(`[server] dist=${fs.existsSync(DIST) ? 'yes' : 'no'} env=${process.env.NODE_ENV || 'development'}`);
});
