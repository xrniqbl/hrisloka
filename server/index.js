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
  const mod = await import(pathToFileURL(full).href);
  return mod.default || mod.handler || null;
}

const API_ROUTES = [
  ['/api/send-email', 'send-email.js'],
  ['/api/send-whatsapp', 'send-whatsapp.js'],
  ['/api/send-push', 'send-push.js'],
  ['/api/ai-review', 'ai-review.js'],
  ['/api/banks', 'banks.js'],
  ['/api/cron-check-subscriptions', 'cron-check-subscriptions.js'],
  ['/api/attendance/clock-in', 'attendance/clock-in.js'],
];

for (const [route, file] of API_ROUTES) {
  const handler = await loadHandler(file);
  if (!handler) {
    console.warn(`[server] API handler missing: ${file}`);
    continue;
  }
  const wrapped = wrapHandler(handler);
  // SECURITY: cron route jangan diekspos ke publik — hanya localhost (scheduler
  // internal node-cron memanggil handler langsung, bukan via HTTP).
  if (route === '/api/cron-check-subscriptions') {
    const localOnly = (req, res, next) => {
      const ip = req.ip || req.socket?.remoteAddress || '';
      if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
      return res.status(403).json({ error: 'Forbidden' });
    };
    app.all(route, localOnly, wrapped);
    app.all(route + '/', localOnly, wrapped);
    console.log(`[server] mounted ${route} → api/${file} (localhost-only)`);
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

  // SPA fallback — inject per-request CSP nonce into index.html (strict script-src)
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    // Static files already handled; only HTML navigations
    if (path.extname(req.path) && !req.path.endsWith('.html')) return next();

    const indexHtml = path.join(DIST, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      return res.status(503).send('Build missing. Run: npm run build');
    }

    const nonce = crypto.randomBytes(16).toString('base64');
    res.setHeader(
      'Content-Security-Policy',
      buildContentSecurityPolicy({ nonce, strictScripts: true }),
    );
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

    let html = fs.readFileSync(indexHtml, 'utf8');
    // Stamp nonce on any remaining inline scripts (none expected after register-sw.js)
    html = html.replace(/<script(?![^>]*\bsrc=)/gi, `<script nonce="${nonce}"`);
    // Expose for debugging / future hydration
    html = html.replace(
      '<head>',
      `<head>\n    <meta property="csp-nonce" content="${nonce}" />`,
    );
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
