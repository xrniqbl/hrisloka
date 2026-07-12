/**
 * /api/attendance/clock-in.js — Serverless / VPS API handler
 *
 * Handles attendance clock-in with offline support.
 * Called by EmpAbsen.jsx via backgroundSync when online.
 *
 * POST /api/attendance/clock-in
 * Body: { employee_id, latitude, longitude, inRadius, selfieVerified, faceVerified, ... }
 */

import { applyCors } from '../_shared/cors.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Rate limit: max 5 clock-in per IP per hour
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

export default async function handler(req, res) {
  applyCors(req, res, { methods: 'POST, OPTIONS', headers: 'Content-Type, Authorization' });

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — valid session required' });
  }

  const {
    employee_id,
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

  if (!employee_id) {
    return res.status(400).json({ error: 'Missing required field: employee_id' });
  }

  const cleanLat = typeof latitude === 'number' ? latitude : null;
  const cleanLng = typeof longitude === 'number' ? longitude : null;

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({ success: false, error: 'Supabase server configuration is missing' });
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
        employee_id,
        date: new Date().toISOString().split('T')[0],
        clock_in: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
        status: 'present',
        latitude: cleanLat,
        longitude: cleanLng,
        in_radius: inRadius ?? false,
        selfie_verified: selfieVerified ?? false,
        face_verified: faceVerified ?? false,
        face_distance: faceDistance ?? null,
        face_confidence: faceConfidence ?? null,
        trust_score: trustScore ?? 100,
        trust_level: trustLevel || 'trusted',
        anti_spoof_flags: antiSpoofFlags || [],
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
