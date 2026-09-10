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
        in_radius: inRadius ?? false,
        selfie_verified: selfieVerified ?? false,
        face_verified: faceVerified ?? false,
        face_distance: toNumberOrFalse(faceDistance),
        face_confidence: toNumberOrFalse(faceConfidence),
        trust_score: cleanTrustScore,
        trust_level: cleanTrustLevel,
        anti_spoof_flags: cleanFlags,
        location: inRadius ? 'Office' : 'Remote',
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
