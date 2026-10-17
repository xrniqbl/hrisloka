/**
 * /api/attendance/clock-in.js — Serverless / VPS API handler
 *
 * Handles attendance clock-in with offline support.
 * Called by EmpAbsen.jsx via backgroundSync when online.
 *
 * POST /api/attendance/clock-in
 * Headers: Authorization: Bearer <supabase access token>
 * Body: { employee_id, latitude, longitude, inRadius, selfieVerified, faceVerified, ... }
 *
 * Security:
 * - JWT is verified fail-closed against Supabase Auth (same pattern as send-email.js).
 * - The attendance row is always written for the employee tied to the JWT —
 *   a body employee_id that does not match the session is rejected (403).
 * - Replays are idempotent: if the employee already has a clock-in row for
 *   today, the existing row is returned instead of inserting a duplicate.
 */

import { applyCors } from '../_shared/cors.js';
import { enforceJsonBodyLimit } from '../_shared/securityHeaders.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Rate limit: 100/hr per IP + 20/hr per user (NAT-safe: users behind one
// office IP share the IP bucket but each get their own user bucket).
// NOTE: in-memory limits are per process — effective on the single-node
// VPS deployment (see docs/ENVIRONMENT.md).
// Client IP: req.ip (trust proxy, nginx X-Forwarded-For, single proxy).
// Raw X-Forwarded-For is NOT trusted directly (spoofable) — same rule as
// the server/index.js cron route. Socket address alone would be 127.0.0.1
// for all clients behind proxy_pass.
function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}
const ipRateLimitMap = new Map();
const userRateLimitMap = new Map();
function checkBucket(map, key, max, window = 3_600_000) {
  const now = Date.now();
  const entry = map.get(key) || { count: 0, start: now };
  if (now - entry.start > window) {
    map.set(key, { count: 1, start: now });
    return true;
  }
  entry.count++;
  map.set(key, entry);
  return entry.count <= max;
}
function checkIpRateLimit(ip) {
  return checkBucket(ipRateLimitMap, `ip:${ip}`, 100);
}
function checkUserClockRateLimit(userId) {
  return checkBucket(userRateLimitMap, `user:${userId}`, 20);
}

/**
 * Verify the Supabase JWT fail-closed and return the auth user id.
 * Only confirmed users are accepted.
 */
async function getAuthUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  if (!token || !SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY },
    });
    if (!res.ok) return null;
    const user = await res.json();
    if (!user?.id) return null;
    if (!(user.email_confirmed_at || user.confirmed_at)) return null;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Resolve the employee row (id + company_id) tied to the authenticated user.
 * Uses the service key server-side; the result drives tenant-safe writes.
 */
async function getEmployeeByAuthUser(authUserId) {
  const url = `${SUPABASE_URL}/rest/v1/employees?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=id,company_id&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function toNumberOrFalse(val) {
  return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

/** Haversine distance (meter) antara dua titik lat/lng. */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Verifikasi radius server-side: hitung jarak klaim client ke office_locations
 * milik company. Klaim `inRadius=true` yang tidak konsisten dengan jarak
 * dihitung ulang menjadi false (tidak dipercaya mentah — cegah absensi palsu).
 * Return { inRadius, officeName }.
 */
async function verifyRadiusServerSide(companyId, lat, lng) {
  const fallback = { inRadius: false, officeName: null };
  if (lat === null || lng === null) return fallback;
  try {
    const url = `${SUPABASE_URL}/rest/v1/office_locations?company_id=eq.${encodeURIComponent(companyId)}&select=id,name,latitude,longitude,radius_meters,company_id`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return fallback;
    const offices = await res.json();
    if (!Array.isArray(offices)) return fallback;
    // Strict tenant scope: the PostgREST query above already filters
    // company_id=eq.<requested>. Defense-in-depth on the result set:
    // - If ANY row carries an explicit company_id, require an exact match
    //   and drop NULL-company rows (legacy/unscoped rows must never act as
    //   a global geofence shared across tenants).
    // - Only when NO row carries company_id at all (pre-multi-tenant
    //   single-company schema) are all rows treated as ours.
    // Foreign-company rows are never used for verification.
    const hasTenantCol = offices.some(
      (o) => o.company_id !== undefined && o.company_id !== null,
    );
    const safe = hasTenantCol
      ? offices.filter((o) => String(o.company_id) === String(companyId))
      : offices;
    let best = null;
    let bestDist = Infinity;
    for (const o of safe) {
      const oLat = Number(o.latitude);
      const oLng = Number(o.longitude);
      if (!Number.isFinite(oLat) || !Number.isFinite(oLng)) continue;
      const d = haversineMeters(lat, lng, oLat, oLng);
      if (d < bestDist) { bestDist = d; best = o; }
    }
    if (!best) return fallback;
    const radius = Number(best.radius_meters) || 100;
    return { inRadius: bestDist <= radius, officeName: best.name || null };
  } catch {
    return fallback;
  }
}

export default async function handler(req, res) {
  const originOk = applyCors(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type, Authorization' });

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Reject oversized JSON bodies before auth (matches express 1mb limit)
  if (!enforceJsonBodyLimit(req, res)) return;
  // Browser requests must come from allowlisted Origin
  if (req.headers.origin && !originOk) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ success: false, error: 'Supabase server configuration is missing' });
  }

  const ip = getClientIp(req);
  if (!checkIpRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  // 1. Verify the caller's session (fail-closed)
  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized — valid session required' });
  }
  // Per-user bucket in addition to IP (NAT-safe: whole-office IPs share the
  // IP bucket without blocking individuals; a single abusive account is
  // still capped at 20/hr).
  if (!checkUserClockRateLimit(authUserId)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  // 2. Attendance may only be recorded for the session's own employee
  let employee;
  try {
    employee = await getEmployeeByAuthUser(authUserId);
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to verify employee identity' });
  }
  if (!employee?.id) {
    return res.status(403).json({ error: 'No employee record tied to this session' });
  }
  if (req.body?.employee_id && String(req.body.employee_id) !== String(employee.id)) {
    return res.status(403).json({ error: 'Forbidden — employee_id does not match the session' });
  }

  const {
    latitude,
    longitude,
    inRadius,
    // NOTE: klaim mentah `selfieVerified` dari client sengaja TIDAK
    // didestruktur/disimpan (lihat selfieVerifiedDerived di bawah).
    faceVerified,
    faceDistance,
    faceConfidence,
    trustScore,
    trustLevel,
    antiSpoofFlags,
  } = req.body || {};

  const cleanLat = toNumberOrFalse(latitude);
  const cleanLng = toNumberOrFalse(longitude);
  // No-location attendance must NEVER be recorded as present/Remote.
  // Range-check coordinates too (reject NaN-equivalents and out-of-range).
  const hasLocation = cleanLat !== null && cleanLng !== null
    && cleanLat >= -90 && cleanLat <= 90
    && cleanLng >= -180 && cleanLng <= 180;
  if (!hasLocation) {
    return res.status(400).json({
      success: false,
      status: 'invalid',
      error: 'Location required — enable GPS and retry. Attendance without coordinates cannot be recorded.',
    });
  }
  // Verifikasi radius server-side — klaim client tidak dipercaya mentah
  const { inRadius: serverInRadius, officeName } = await verifyRadiusServerSide(
    employee.company_id, cleanLat, cleanLng,
  );
  // Face flag client hanya disimpan bila lolos threshold server-side;
  // threshold face-distance yang longgar ditolak.
  const cleanFaceDistance = toNumberOrFalse(faceDistance);
  const faceVerifiedClean = faceVerified === true
    && (cleanFaceDistance === null || cleanFaceDistance <= 0.6);
  // M8: selfie_verified JANGAN percaya klaim client mentah — diturunkan dari
  // face-match server-threshold (faceVerifiedClean). Klaim mentah
  // (selfieVerified === true) sengaja tidak disimpan: kolom `selfie_claimed`
  // tidak ada di skema attendance (baseline + repair + backfill), dan membuat
  // migrasi DB di luar cakupan — jadi hanya hasil turunan yang disimpan.
  const selfieVerifiedDerived = faceVerifiedClean === true;
  const cleanTrustScore = typeof trustScore === 'number' && Number.isFinite(trustScore)
    ? Math.max(0, Math.min(100, trustScore))
    : 100;
  let cleanTrustLevel = ['trusted', 'warning', 'rejected'].includes(trustLevel) ? trustLevel : 'trusted';
  // M8 heuristik server-side: klaim lokasi (serverInRadius=false) yang tidak
  // konsisten dengan klaim kepercayaan tinggi ('trusted' + score > 80)
  // diturunkan ke 'warning'. Absensi tetap dicatat — hanya flag, bukan penolakan.
  if (serverInRadius === false && cleanTrustLevel === 'trusted' && cleanTrustScore > 80) {
    cleanTrustLevel = 'warning';
  }
  // M8: allowlist ketat nilai flag legitimate dari src/lib/antiSpoofing.js.
  // Nilai di luar allowlist dibuang diam-diam (backward compatible client lama).
  // Tiap item harus string, cap 64 char, max 20 item (cegah stored-XSS via render tanpa escape).
  const ANTI_SPOOF_FLAG_ALLOWLIST = new Set([
    'gps_accuracy_zero',
    'gps_accuracy_unrealistically_precise',
    'gps_accuracy_too_low',
    'insufficient_gps_samples',
    'gps_coordinates_identical_across_samples',
    'gps_accuracy_perfectly_constant',
    'gps_impossible_speed_between_samples',
    'gps_no_altitude_data',
    'ip_location_unavailable',
    'impossible_travel_speed',
    'suspicious_travel_speed',
    'motion_sensor_unavailable',
    'device_motion_suspiciously_stable',
  ]);
  const cleanFlags = Array.isArray(antiSpoofFlags)
    ? antiSpoofFlags
      .filter((f) => typeof f === 'string')
      .map((f) => f.slice(0, 64))
      .filter((f) => ANTI_SPOOF_FLAG_ALLOWLIST.has(f) || /^gps_ip_mismatch_\d+km$/.test(f))
      .slice(0, 20)
    : [];

  const today = new Date().toISOString().split('T')[0];

  try {
    // 3. Idempotent replay: return the existing row instead of duplicating
    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/attendance?employee_id=eq.${encodeURIComponent(employee.id)}&date=eq.${today}&select=id,clock_in,clock_out`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      },
    );
    if (existingRes.ok) {
      const existing = await existingRes.json();
      const row = Array.isArray(existing) ? existing[0] : null;
      if (row?.clock_in) {
        return res.status(200).json({ success: true, data: row, deduped: true });
      }
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        employee_id: employee.id,
        date: today,
        clock_in: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
        status: 'present',
        latitude: cleanLat,
        longitude: cleanLng,
        // Hasil verifikasi server-side (bukan klaim client)
        in_radius: serverInRadius,
        in_radius_claimed: inRadius === true,
        selfie_verified: selfieVerifiedDerived,
        face_verified: faceVerifiedClean,
        face_distance: cleanFaceDistance,
        face_confidence: toNumberOrFalse(faceConfidence),
        trust_score: cleanTrustScore,
        trust_level: cleanTrustLevel,
        anti_spoof_flags: cleanFlags,
        location: serverInRadius ? (officeName || 'Office') : 'Remote',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Supabase error: ${err}`);
    }

    const data = await response.json();
    res.status(200).json({ success: true, data: data[0] });
  } catch (err) {
    console.error('[attendance-clock-in] Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to record attendance' });
  }
}
