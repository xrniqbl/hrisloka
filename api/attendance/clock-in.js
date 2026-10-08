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

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Rate limit: max 5 clock-in per IP per hour
// NOTE: in-memory limits are per serverless instance — effective only on the
// single-node VPS deployment (see docs/ENVIRONMENT.md).
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const window = 3_600_000;
  const max = 5;
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > window) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count <= max;
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
    const url = `${SUPABASE_URL}/rest/v1/office_locations?select=id,name,latitude,longitude,radius_meters,company_id`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return fallback;
    const offices = await res.json();
    if (!Array.isArray(offices)) return fallback;
    // Filter company bila kolom tersedia; skema lama tanpa company_id → pakai semua
    const scoped = offices.filter(
      (o) => o.company_id === undefined || o.company_id === null || String(o.company_id) === String(companyId),
    );
    let best = null;
    let bestDist = Infinity;
    for (const o of scoped) {
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
  applyCors(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type, Authorization' });

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ success: false, error: 'Supabase server configuration is missing' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  // 1. Verify the caller's session (fail-closed)
  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized — valid session required' });
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
    selfieVerified,
    faceVerified,
    faceDistance,
    faceConfidence,
    trustScore,
    trustLevel,
    antiSpoofFlags,
  } = req.body || {};

  const cleanLat = toNumberOrFalse(latitude);
  const cleanLng = toNumberOrFalse(longitude);
  // Verifikasi radius server-side — klaim client tidak dipercaya mentah
  const { inRadius: serverInRadius, officeName } = await verifyRadiusServerSide(
    employee.company_id, cleanLat, cleanLng,
  );
  // Face/selfie flag client hanya disimpan sebagai klaim (bukan bukti);
  // threshold face-distance yang longgar ditolak.
  const cleanFaceDistance = toNumberOrFalse(faceDistance);
  const faceVerifiedClean = faceVerified === true
    && (cleanFaceDistance === null || cleanFaceDistance <= 0.6);
  const cleanTrustScore = typeof trustScore === 'number' && Number.isFinite(trustScore)
    ? Math.max(0, Math.min(100, trustScore))
    : 100;
  const cleanTrustLevel = ['trusted', 'warning', 'rejected'].includes(trustLevel) ? trustLevel : 'trusted';
  const cleanFlags = Array.isArray(antiSpoofFlags) ? antiSpoofFlags.slice(0, 20) : [];

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
        selfie_verified: selfieVerified === true,
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
