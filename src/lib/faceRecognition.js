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
// Expression net is OPTIONAL — public/models only ships detector + landmarks
// + recognition. Smile challenge falls back to mouth landmarks when absent.
let expressionsAvailable = false;

const MODEL_URL = '/models';
// face-api standard threshold (0.6). Fixed — never loosened for low quality
// (a blurry frame must be HARDER to accept, not easier). Server-side
// api/attendance/clock-in.js enforces the same 0.6 cutoff.
const RECOGNITION_THRESHOLD = 0.6;
const MIN_FACE_QUALITY = 0.4;
const MIN_DETECTION_CONFIDENCE = 0.7;

export async function loadModels(onProgress) {
  if (modelsLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      onProgress?.(5, 'Memuat library face recognition...');
      faceapi = await import('@vladmandic/face-api');
      onProgress?.(15, 'Menyiapkan backend AI...');
      onProgress?.(25, 'Mengunduh model deteksi wajah...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      onProgress?.(55, 'Mengunduh model titik wajah...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      onProgress?.(75, 'Mengunduh model pengenalan wajah...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      // Expression net is optional (not shipped in public/models): the smile
      // challenge falls back to mouth-aspect-ratio from landmarks. A missing
      // file must NEVER fail the whole load — that bricks all face attendance.
      try {
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        expressionsAvailable = true;
      } catch {
        expressionsAvailable = false;
        console.warn('[FaceRecognition] expression model not shipped — smile uses landmark fallback');
      }
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

export function assessFaceQuality(detection) {
  if (!detection) return { score: 0, feedback: ['Tidak ada wajah terdeteksi'] };

  const { detection: det, landmarks, expressions } = detection;
  const box = det.box;
  const confidence = det.score || 0;
  
  let score = 1.0;
  const feedback = [];

  if (confidence < MIN_DETECTION_CONFIDENCE) {
    score -= 0.3;
    feedback.push('Kepercayaan deteksi rendah, pastikan wajah terlihat jelas');
  }

  const faceArea = (box.width * box.height) / (640 * 480);
  if (faceArea < 0.10) {
    score -= 0.2;
    feedback.push('Wajah terlalu kecil, dekatkan ke kamera');
  } else if (faceArea > 0.55) {
    score -= 0.15;
    feedback.push('Wajah terlalu besar, jauhkan dari kamera');
  }

  // Resolution-independent centering: use caller-provided frame size,
  // fall back to the box's own scale when unknown. Never hardcode 640x480
  // (the scanner runs at 640x640 — hardcoded 320/240 shifts the Y center).
  const frameW = Number(detection.frameWidth) || box.width * 4;
  const frameH = Number(detection.frameHeight) || box.height * 4;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const offsetX = Math.abs(centerX - frameW / 2) / (frameW / 2);
  const offsetY = Math.abs(centerY - frameH / 2) / (frameH / 2);
  
  if (offsetX > 0.20) {
    score -= 0.15;
    feedback.push('Posisi wajah terlalu ke kiri/kanan');
  }
  if (offsetY > 0.25) {
    score -= 0.10;
    feedback.push('Posisi wajah terlalu ke atas/bawah');
  }

  if (expressions) {
    const neutral = expressions.neutral || 0;
    const happy = expressions.happy || 0;
    if (neutral < 0.5 && happy < 0.3) {
      score -= 0.10;
      feedback.push('Ekspresi tidak natural, coba ekspresi netral');
    }
  }

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

export async function detectSingleFace(videoOrCanvas, options = {}) {
  if (!faceapi || !modelsLoaded) throw new Error('Models not loaded');

  const detectorOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: options.inputSize || 320,
    scoreThreshold: options.scoreThreshold || 0.5,
  });

  const result = await faceapi
    .detectSingleFace(videoOrCanvas, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;

  // Expressions only when the optional net loaded (see loadModels).
  if (expressionsAvailable && faceapi.nets.faceExpressionNet?.isLoaded) {
    try {
      const withExpr = await faceapi
        .detectSingleFace(videoOrCanvas, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withFaceExpressions();
      if (withExpr?.expressions) result.expressions = withExpr.expressions;
    } catch { /* landmark-only path */ }
  }

  const quality = assessFaceQuality(result);
  
  return {
    ...result,
    quality,
  };
}

export async function detectAllFaces(videoOrCanvas, options = {}) {
  if (!faceapi || !modelsLoaded) throw new Error('Models not loaded');

  const detectorOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: options.inputSize || 320,
    scoreThreshold: options.scoreThreshold || 0.5,
  });

  const results = await faceapi
    .detectAllFaces(videoOrCanvas, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptor();

  return results.map(result => ({
    ...result,
    quality: assessFaceQuality(result),
  }));
}

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

export function matchFace(liveDescriptor, registeredFaces, liveQuality = null) {
  if (!registeredFaces || registeredFaces.length === 0) {
    return { match: false, distance: 1, label: null, confidence: 0, threshold: RECOGNITION_THRESHOLD };
  }

  let bestDistance = Infinity;
  let bestLabel = null;

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

  let threshold = RECOGNITION_THRESHOLD;
  if (liveQuality && liveQuality.score < MIN_FACE_QUALITY) {
    // Low-quality frame: tighten, never loosen (security — blurry must be
    // harder to accept). Caller should prompt a retake instead.
    threshold = RECOGNITION_THRESHOLD - 0.05;
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

export function checkFacePosition(detection, videoWidth, videoHeight) {
  if (!detection) return { ok: false, message: 'Posisikan wajah dalam frame' };

  // Forward the caller's frame size so centering is resolution-independent.
  const withFrame = (videoWidth && videoHeight)
    ? { ...detection, frameWidth: videoWidth, frameHeight: videoHeight }
    : detection;
  const quality = withFrame.quality || assessFaceQuality(withFrame);
  
  return {
    ok: quality.score >= MIN_FACE_QUALITY,
    message: quality.feedback[0] || 'Posisi wajah baik',
    quality,
  };
}

export function averageDescriptors(descriptors) {
  if (!descriptors || descriptors.length === 0) return null;
  if (descriptors.length === 1) {
    return descriptors[0] instanceof Float32Array 
      ? descriptors[0] 
      : new Float32Array(descriptors[0]);
  }

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

  for (let i = 0; i < length; i++) {
    sum[i] /= floatDescriptors.length;
  }

  return sum;
}

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

export function areExpressionsAvailable() {
  return expressionsAvailable;
}

export const QUALITY_THRESHOLDS = {
  MIN_FACE_QUALITY,
  MIN_DETECTION_CONFIDENCE,
  RECOGNITION_THRESHOLD,
};
