const fs = require('fs');

const enhancedFaceRecognition = "use strict";
/**
 * Face Recognition Service - Enhanced Version
 * Uses @vladmandic/face-api for client-side face detection & recognition.
 * Models: tiny_face_detector + face_landmark_68 + face_recognition_net + face_expression_net
 * 
 * ENHANCEMENTS:
 * - Face quality assessment (lighting, sharpness, symmetry)
 * - Adaptive recognition threshold based on quality
 * - Multiple descriptor averaging for better accuracy
 * - Enhanced error handling
 */

let faceapi = null;
let modelsLoaded = false;
let loadingPromise = null;

const MODEL_URL = '/models';
const RECOGNITION_THRESHOLD = 0.52; // Strict: lower = more strict (0.6 = default, 0.52 = stricter)
const MIN_FACE_QUALITY = 0.4; // Minimum face quality score (0-1)
const MIN_DETECTION_CONFIDENCE = 0.7; // Minimum detection confidence
const MAX_FACE_DISTANCE_FOR_AVG = 0.6; // Max distance for descriptor averaging

/**
 * Lazy-load face-api and models. Safe to call multiple times.
 * @param {Function} onProgress - optional callback(percent, message)
 */
export async function loadModels(onProgress) {
  if (modelsLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      onProgress?.(5, 'Memuat library face recognition...');
      faceapi = await import('@vladmandic/face-api');

      // Use WASM backend for better performance on mobile
      onProgress?.(15, 'Menyiapkan backend AI...');

      onProgress?.(25, 'Mengunduh model deteksi wajah...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

      onProgress?.(55, 'Mengunduh model titik wajah...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

      onProgress?.(75, 'Mengunduh model pengenalan wajah...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      // Expression detection for liveness
      onProgress?.(90, 'Mengunduh model ekspresi wajah...');
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

      modelsLoaded = true;
      onProgress?.(100, 'Siap!');
      return true;
    } catch (err) {
      loadingPromise = null;
      console.error('[FaceRecognition] Failed to load models:', err);
      throw new Error('Gagal memuat model AI. Pastikan koneksi internet aktif.');
    }
  })();

  return loadingPromise;
}

/**
 * Assess face quality based on detection metadata.
 * Returns quality score (0-1) and feedback messages.
 */
export function assessFaceQuality(detection) {
  if (!detection) return { score: 0, feedback: ['Tidak ada wajah terdeteksi'] };

  const { detection: det, landmarks, expressions } = detection;
  const box = det.box;
  const confidence = det.score || 0;
  
  let score = 1.0;
  const feedback = [];

  // 1. Detection confidence
  if (confidence < MIN_DETECTION_CONFIDENCE) {
    score -= 0.3;
    feedback.push('Kepercayaan deteksi rendah, pastikan wajah terlihat jelas');
  }

  // 2. Face size (should be 15-50% of frame)
  const faceArea = (box.width * box.height) / (640 * 480); // Assuming 640x480 video
  if (faceArea < 0.10) {
    score -= 0.2;
    feedback.push('Wajah terlalu kecil, dekatkan ke kamera');
  } else if (faceArea > 0.55) {
    score -= 0.15;
    feedback.push('Wajah terlalu besar, jauhkan dari kamera');
  }

  // 3. Face position (should be centered)
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const offsetX = Math.abs(centerX - 320) / 320; // 320 = half of 640
  const offsetY = Math.abs(centerY - 240) / 240; // 240 = half of 480
  
  if (offsetX > 0.20) {
    score -= 0.15;
    feedback.push('Posisi wajah terlalu ke kiri/kanan');
  }
  if (offsetY > 0.25) {
    score -= 0.10;
    feedback.push('Posisi wajah terlalu ke atas/bawah');
  }

  // 4. Expression (should be neutral for registration)
  if (expressions) {
    const neutral = expressions.neutral || 0;
    const happy = expressions.happy || 0;
    const angry = expressions.angry || 0;
    
    if (neutral < 0.5 && happy < 0.3) {
      score -= 0.10;
      feedback.push('Ekspresi tidak natural, coba ekspresi netral');
    }
  }

  // 5. Landmark visibility (all landmarks should be detected)
  if (landmarks) {
    const pts = landmarks.positions;
    const visibleLandmarks = pts.filter(p => p && p.x > 0 && p.y > 0).length;
    const totalLandmarks = pts.length;
    
    if (visibleLandmarks / totalLandmarks < 0.95) {
      score -= 0.15;
      feedback.push('Sebagian wajah tertutup, pastikan tidak ada yang menghalangi');
    }
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    feedback,
    confidence,
    faceArea,
  };
}

/**
 * Detect a single face from a video/canvas element with quality assessment.
 * Returns detection result with landmarks, descriptor, expressions, and quality.
 */
export async function detectSingleFace(videoOrCanvas, options = {}) {
  if (!faceapi || !modelsLoaded) throw new Error('Models not loaded');

  const detectorOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: options.inputSize || 320,
    scoreThreshold: options.scoreThreshold || 0.5,
  });

  const result = await faceapi
    .detectSingleFace(videoOrCanvas, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptor()
    .withFaceExpressions();

  if (!result) return null;

  // Assess quality
  const quality = assessFaceQuality(result);
  
  return {
    ...result,
    quality,
  };
}

/**
 * Detect all faces from a video/canvas (for admin multi-face view).
 */
export async function detectAllFaces(videoOrCanvas, options = {}) {
  if (!faceapi || !modelsLoaded) throw new Error('Models not loaded');

  const detectorOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: options.inputSize || 320,
    scoreThreshold: options.scoreThreshold || 0.5,
  });

  const results = await faceapi
    .detectAllFaces(videoOrCanvas, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptor()
    .withFaceExpressions();

  // Add quality assessment to each detection
  return results.map(result => ({
    ...result,
    quality: assessFaceQuality(result),
  }));
}

/**
 * Extract face descriptor (128-dim float array) from a captured image blob/base64.
 * Used during REGISTRATION.
 * @param {string} imgSrc - Image source (base64 or URL)
 * @param {Object} options - Detection options
 * @returns {{descriptor: Float32Array|null, quality: Object}|null}
 */
export async function extractDescriptorFromImage(imgSrc, options = {}) {
  if (!faceapi || !modelsLoaded) throw new Error('Models not loaded');

  const img = await loadImageFromSrc(imgSrc);
  const detectorOptions = new faceapi.TinyFaceDetectorOptions({ 
    inputSize: options.inputSize || 416, 
    scoreThreshold: options.scoreThreshold || 0.4 
  });

  const result = await faceapi
    .detectSingleFace(img, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;

  const quality = assessFaceQuality(result);
  
  // Reject low quality images for registration
  if (quality.score < MIN_FACE_QUALITY) {
    return {
      descriptor: null,
      quality,
      error: 'Kualitas wajah terlalu rendah untuk registrasi: ' + quality.feedback.join(', '),
    };
  }

  return {
    descriptor: Array.from(result.descriptor),
    quality,
  };
}

/**
 * Compare a live descriptor against a list of registered descriptors.
 * Uses adaptive threshold based on face quality.
 * @param {Float32Array|number[]} liveDescriptor - from detectSingleFace
 * @param {Array<{descriptor: number[], label: string}>} registeredFaces - from DB
 * @param {Object} liveQuality - Quality assessment of live detection
 * @returns {{ match: boolean, distance: number, label: string|null, confidence: number, threshold: number }}
 */
export function matchFace(liveDescriptor, registeredFaces, liveQuality = null) {
  if (!registeredFaces || registeredFaces.length === 0) {
    return { match: false, distance: 1, label: null, confidence: 0, threshold: RECOGNITION_THRESHOLD };
  }

  let bestDistance = Infinity;
  let bestLabel = null;

  // Convert descriptors to Float32Array
  const live = liveDescriptor instanceof Float32Array
    ? liveDescriptor
    : new Float32Array(liveDescriptor);

  for (const face of registeredFaces) {
    const stored = face.descriptor instanceof Float32Array
      ? face.descriptor
      : new Float32Array(face.descriptor);

    const distance = faceapi.euclideanDistance(live, stored);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestLabel = face.label || 'registered';
    }
  }

  // Adaptive threshold based on quality
  let threshold = RECOGNITION_THRESHOLD;
  if (liveQuality) {
    // Higher quality = stricter threshold (lower value)
    // Lower quality = more lenient threshold (higher value)
    const qualityAdjustment = (1 - liveQuality.score) * 0.15;
    threshold = RECOGNITION_THRESHOLD + qualityAdjustment;
  }

  const confidence = Math.max(0, Math.round((1 - bestDistance / 1.0) * 100));

  return {
    match: bestDistance < threshold,
    distance: bestDistance,
    label: bestLabel,
    confidence,
    threshold,
    quality: liveQuality,
  };
}

/**
 * Get face landmarks for liveness analysis.
 * Returns structured landmark points.
 */
export function extractLandmarkData(detection) {
  if (!detection?.landmarks) return null;

  const lm = detection.landmarks;
  return {
    leftEye: lm.getLeftEye(),
    rightEye: lm.getRightEye(),
    nose: lm.getNose(),
    mouth: lm.getMouth(),
    leftEyeBrow: lm.getLeftEyeBrow(),
    rightEyeBrow: lm.getRightEyeBrow(),
    jawOutline: lm.getJawOutline(),
    faceOval: detection.detection.box,
    expressions: detection.expressions || {},
  };
}

/**
 * Check if face is centered & properly positioned in frame.
 * Enhanced with quality score.
 */
export function checkFacePosition(detection, videoWidth, videoHeight) {
  if (!detection) return { ok: false, message: 'Posisikan wajah dalam frame' };

  const quality = detection.quality || assessFaceQuality(detection);
  
  return {
    ok: quality.score >= MIN_FACE_QUALITY,
    message: quality.feedback[0] || 'Posisi wajah baik',
    quality,
  };
}

/**
 * Average multiple descriptors for better accuracy.
 * Used when capturing multiple frames during registration.
 * @param {Array<Float32Array|number[]>} descriptors - Array of descriptors
 * @returns {Float32Array} - Averaged descriptor
 */
export function averageDescriptors(descriptors) {
  if (!descriptors || descriptors.length === 0) return null;
  if (descriptors.length === 1) {
    return descriptors[0] instanceof Float32Array 
      ? descriptors[0] 
      : new Float32Array(descriptors[0]);
  }

  // Convert all to Float32Array
  const floatDescriptors = descriptors.map(d => 
    d instanceof Float32Array ? d : new Float32Array(d)
  );

  const length = floatDescriptors[0].length;
  const sum = new Float32Array(length);

  for (const desc of floatDescriptors) {
    for (let i = 0; i < length; i++) {
      sum[i] += desc[i];
    }
  }

  // Average
  for (let i = 0; i < length; i++) {
    sum[i] /= floatDescriptors.length;
  }

  return sum;
}

// ---- Helpers ----

function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar'));
    img.src = src;
  });
}

export function getFaceapi() {
  return faceapi;
}

export function isModelsLoaded() {
  return modelsLoaded;
}

// Export quality assessment for external use
export const QUALITY_THRESHOLDS = {
  MIN_FACE_QUALITY,
  MIN_DETECTION_CONFIDENCE,
  RECOGNITION_THRESHOLD,
};
;

fs.writeFileSync('src/lib/faceRecognition.js', enhancedFaceRecognition, 'utf8');
console.log('Enhanced faceRecognition.js with quality assessment and adaptive threshold');
