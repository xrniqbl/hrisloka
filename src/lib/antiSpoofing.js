/**
 * Anti-Spoofing / GPS Verification Service
 * Multi-layer GPS trust score calculation for 100-300 employees.
 * Strict mode: flags even minor inconsistencies.
 */

const MAX_GPS_IP_DISTANCE_KM = 30;  // Flag if GPS and IP location differ by more than 30km
const MIN_REALISTIC_ACCURACY = 2;   // Meters — fake GPS often reports 0 or 1
const MAX_REALISTIC_ACCURACY = 500; // Above 500m = likely not GPS, use cell tower
const IDENTICAL_SAMPLES_THRESHOLD = 0.0001; // If coords differ less than this → suspicious

// ============================================================
// Utility
// ============================================================

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// Layer 1: GPS Accuracy Analysis
// ============================================================

/**
 * Analyze GPS accuracy value for red flags.
 * Real devices: accuracy fluctuates between ~5m and ~50m indoors.
 * Fake GPS apps often return 0, 1, or a static perfect value.
 */
export function analyzeGPSAccuracy(accuracy) {
  const flags = [];
  let score = 20; // Max score for this layer

  if (accuracy === 0 || accuracy === null || accuracy === undefined) {
    flags.push('gps_accuracy_zero');
    score = 0;
  } else if (accuracy < MIN_REALISTIC_ACCURACY) {
    flags.push('gps_accuracy_unrealistically_precise');
    score = 5;
  } else if (accuracy > MAX_REALISTIC_ACCURACY) {
    flags.push('gps_accuracy_too_low');
    score = 10; // Not necessarily fake, might just be indoors
  }

  return { score, maxScore: 20, flags };
}

// ============================================================
// Layer 2: Multi-Point GPS Sampling
// Takes 3 samples over ~4 seconds, checks for natural variance
// ============================================================

/**
 * Get a single GPS position with timeout.
 */
function getSinglePosition(timeout = 8000) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        timestamp: pos.timestamp,
      }),
      err => reject(err),
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    );
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Collect multiple GPS samples to check for variance (real GPS) vs
 * identical coordinates (fake GPS).
 * @param {number} count - number of samples (default 3)
 * @param {number} intervalMs - wait between samples
 * @returns {Array<{lat, lng, accuracy, timestamp}>}
 */
export async function collectGPSSamples(count = 3, intervalMs = 1500) {
  const samples = [];
  for (let i = 0; i < count; i++) {
    try {
      const pos = await getSinglePosition(8000);
      samples.push(pos);
      if (i < count - 1) await sleep(intervalMs);
    } catch {
      // Continue with what we have
    }
  }
  return samples;
}

/**
 * Analyze GPS samples for spoofing indicators.
 */
export function analyzeGPSSamples(samples) {
  const flags = [];
  let score = 20; // Max score for this layer

  if (!samples || samples.length < 2) {
    return { score: 5, maxScore: 20, flags: ['insufficient_gps_samples'], samples };
  }

  // Check if all coordinates are suspiciously identical
  const allSameLat = samples.every(s => Math.abs(s.lat - samples[0].lat) < IDENTICAL_SAMPLES_THRESHOLD);
  const allSameLng = samples.every(s => Math.abs(s.lng - samples[0].lng) < IDENTICAL_SAMPLES_THRESHOLD);

  if (allSameLat && allSameLng && samples.length >= 3) {
    flags.push('gps_coordinates_identical_across_samples');
    score -= 15;
  }

  // Check if accuracy is perfectly constant (real GPS fluctuates)
  const accuracyVariance = calculateVariance(samples.map(s => s.accuracy));
  if (accuracyVariance < 0.01 && samples.length >= 3) {
    flags.push('gps_accuracy_perfectly_constant');
    score -= 10;
  }

  // Check movement speed between samples
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    const distM = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    const timeSec = (curr.timestamp - prev.timestamp) / 1000;
    if (timeSec > 0) {
      const speedKmH = (distM / timeSec) * 3.6;
      if (speedKmH > 300) {
        flags.push('gps_impossible_speed_between_samples');
        score -= 15;
      }
    }
  }

  // Check if altitude data is present (fake GPS often omits it)
  const hasAltitude = samples.some(s => s.altitude !== null && s.altitude !== undefined);
  if (!hasAltitude) {
    flags.push('gps_no_altitude_data');
    score -= 5;
  }

  return { score: Math.max(0, score), maxScore: 20, flags, samples };
}

function calculateVariance(arr) {
  if (!arr || arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
}

// ============================================================
// Layer 3: IP Geolocation Cross-Reference
// ============================================================

/**
 * Get approximate location from IP address.
 * Uses free ipapi.co service.
 * @returns {{ lat, lng, city, country, isp }} or null
 */
export async function getIPLocation() {
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      lat: parseFloat(data.latitude),
      lng: parseFloat(data.longitude),
      city: data.city,
      region: data.region,
      country: data.country_name,
      isp: data.org,
    };
  } catch {
    return null;
  }
}

/**
 * Compare GPS location vs IP location.
 */
export function analyzeIPvsGPS(gpsLat, gpsLng, ipLocation) {
  const flags = [];
  let score = 20;

  if (!ipLocation) {
    return { score: 10, maxScore: 20, flags: ['ip_location_unavailable'], ipLocation: null };
  }

  const distanceM = haversineDistance(gpsLat, gpsLng, ipLocation.lat, ipLocation.lng);
  const distanceKm = distanceM / 1000;

  if (distanceKm > MAX_GPS_IP_DISTANCE_KM) {
    flags.push(`gps_ip_mismatch_${Math.round(distanceKm)}km`);
    if (distanceKm > 100) score -= 20;
    else if (distanceKm > 50) score -= 15;
    else score -= 10;
  }

  return {
    score: Math.max(0, score),
    maxScore: 20,
    flags,
    distanceKm: Math.round(distanceKm),
    ipLocation,
  };
}

// ============================================================
// Layer 4: Impossible Travel Check (Backend-side)
// Call this function with the last attendance record from DB
// ============================================================

/**
 * Check if current location is reachable from previous attendance location.
 * @param {object} currentPos - { lat, lng, timestamp }
 * @param {object} lastAttendance - { latitude, longitude, created_at } from DB
 */
export function checkImpossibleTravel(currentPos, lastAttendance) {
  const flags = [];
  let score = 20;

  if (!lastAttendance?.latitude || !lastAttendance?.longitude) {
    return { score: 20, maxScore: 20, flags: [], note: 'No previous attendance' };
  }

  const distanceM = haversineDistance(
    currentPos.lat, currentPos.lng,
    parseFloat(lastAttendance.latitude),
    parseFloat(lastAttendance.longitude)
  );

  const now = Date.now();
  const lastTime = new Date(lastAttendance.created_at).getTime();
  const elapsedHours = (now - lastTime) / (1000 * 60 * 60);

  if (elapsedHours > 0) {
    const speedKmH = (distanceM / 1000) / elapsedHours;
    // Human max realistic speed: 900 km/h (commercial flight)
    if (speedKmH > 900) {
      flags.push('impossible_travel_speed');
      score -= 20;
    } else if (speedKmH > 500) {
      flags.push('suspicious_travel_speed');
      score -= 10;
    }
  }

  return {
    score: Math.max(0, score),
    maxScore: 20,
    flags,
    distanceM: Math.round(distanceM),
    elapsedHours: Math.round(elapsedHours * 10) / 10,
  };
}

// ============================================================
// Layer 5: Device Motion Sensor (Accelerometer)
// ============================================================

let motionBuffer = [];
let motionListenerAdded = false;

export function startMotionCollection() {
  motionBuffer = [];
  if (!motionListenerAdded && window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', handleMotion);
    motionListenerAdded = true;
  }
}

export function stopMotionCollection() {
  if (motionListenerAdded) {
    window.removeEventListener('devicemotion', handleMotion);
    motionListenerAdded = false;
  }
}

function handleMotion(event) {
  const { x, y, z } = event.acceleration || {};
  if (x !== null && y !== null && z !== null) {
    motionBuffer.push({
      x, y, z,
      magnitude: Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2),
      t: Date.now(),
    });
    if (motionBuffer.length > 100) motionBuffer.shift(); // Keep last 100 samples
  }
}

/**
 * Analyze device motion. If GPS shows movement but device is stationary → suspicious.
 */
export function analyzeDeviceMotion(gpsVarianceM) {
  const flags = [];
  let score = 10;

  if (!window.DeviceMotionEvent || motionBuffer.length < 5) {
    return { score: 8, maxScore: 10, flags: ['motion_sensor_unavailable'] };
  }

  const avgMagnitude = motionBuffer.reduce((s, m) => s + m.magnitude, 0) / motionBuffer.length;
  const movementVariance = calculateVariance(motionBuffer.map(m => m.magnitude));

  // Device should have some tiny gravity-induced motion (~9.8 m/s² base)
  // Perfectly stable reading often means sensor is being faked or device is on a flat surface
  if (movementVariance < 0.001 && gpsVarianceM < 1) {
    flags.push('device_motion_suspiciously_stable');
    score -= 5;
  }

  return { score: Math.max(0, score), maxScore: 10, flags, avgMagnitude, movementVariance };
}

// ============================================================
// Master Trust Score Calculator
// ============================================================

/**
 * Calculate the overall attendance trust score (0-100).
 * @param {object} params
 * @returns {{ trustScore: number, level: 'trusted'|'warning'|'rejected', flags: string[], details: object }}
 */
export function calculateTrustScore({
  accuracyResult,
  samplesResult,
  ipResult,
  travelResult,
  motionResult,
  faceVerified,
}) {
  const scores = [
    accuracyResult || { score: 10, maxScore: 20 },
    samplesResult || { score: 10, maxScore: 20 },
    ipResult || { score: 10, maxScore: 20 },
    travelResult || { score: 15, maxScore: 20 },
    motionResult || { score: 7, maxScore: 10 },
  ];

  const rawScore = scores.reduce((s, r) => s + r.score, 0);
  const maxRaw = scores.reduce((s, r) => s + r.maxScore, 0);
  let trustScore = Math.round((rawScore / maxRaw) * 88); // GPS part: max 88 points

  // Face verified adds up to 12 points
  if (faceVerified === true) trustScore += 12;
  else if (faceVerified === false) trustScore -= 20; // Heavy penalty

  trustScore = Math.max(0, Math.min(100, trustScore));

  const allFlags = [
    ...(accuracyResult?.flags || []),
    ...(samplesResult?.flags || []),
    ...(ipResult?.flags || []),
    ...(travelResult?.flags || []),
    ...(motionResult?.flags || []),
  ];

  let level;
  if (trustScore >= 70) level = 'trusted';
  else if (trustScore >= 40) level = 'warning';
  else level = 'rejected';

  return {
    trustScore,
    level,
    flags: allFlags,
    details: { accuracyResult, samplesResult, ipResult, travelResult, motionResult },
  };
}

/**
 * Run the full anti-spoofing check pipeline.
 * @param {object} primaryGPS - { lat, lng, accuracy } (first GPS reading)
 * @param {object} options - { lastAttendance, faceVerified }
 * @param {Function} onProgress - callback(step, message)
 */
export async function runFullAntiSpoofing(primaryGPS, options = {}, onProgress) {
  const { lastAttendance, faceVerified } = options;

  onProgress?.('accuracy', 'Menganalisis kualitas GPS...');
  const accuracyResult = analyzeGPSAccuracy(primaryGPS.accuracy);

  onProgress?.('samples', 'Mengumpulkan sampel GPS...');
  const samples = await collectGPSSamples(3, 1500);
  const samplesResult = analyzeGPSSamples(samples);

  onProgress?.('ip', 'Memverifikasi lokasi via jaringan...');
  const ipLocation = await getIPLocation();
  const ipResult = analyzeIPvsGPS(primaryGPS.lat, primaryGPS.lng, ipLocation);

  onProgress?.('travel', 'Memeriksa riwayat perjalanan...');
  const travelResult = checkImpossibleTravel(
    { lat: primaryGPS.lat, lng: primaryGPS.lng, timestamp: Date.now() },
    lastAttendance
  );

  onProgress?.('motion', 'Menganalisis sensor perangkat...');
  const gpsVariance = samplesResult.samples
    ? calculateVariance(samplesResult.samples.map(s => s.lat))
    : 0;
  const motionResult = analyzeDeviceMotion(gpsVariance);

  onProgress?.('score', 'Menghitung skor kepercayaan...');
  const trustResult = calculateTrustScore({
    accuracyResult,
    samplesResult,
    ipResult,
    travelResult,
    motionResult,
    faceVerified,
  });

  // Return the best GPS sample as the final reported position
  const bestSample = samples[0] || primaryGPS;

  return {
    ...trustResult,
    finalLocation: {
      lat: bestSample.lat,
      lng: bestSample.lng,
      accuracy: bestSample.accuracy,
    },
    ipLocation,
    allSamples: samples,
  };
}

export { haversineDistance };
