/**
 * Face Recognition Service
 * Uses @vladmandic/face-api for client-side face detection & recognition.
 * Models: tiny_face_detector + face_landmark_68 + face_recognition_net
 */

let faceapi = null;
let modelsLoaded = false;
let loadingPromise = null;

const MODEL_URL = '/models';
const RECOGNITION_THRESHOLD = 0.52; // Strict: lower = more strict (0.6 = default, 0.52 = stricter)

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
 * Detect a single face from a video/canvas element.
 * Returns detection result with landmarks, descriptor, expressions.
 */
export async function detectSingleFace(videoOrCanvas) {
  if (!faceapi || !modelsLoaded) throw new Error('Models not loaded');

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  const result = await faceapi
    .detectSingleFace(videoOrCanvas, options)
    .withFaceLandmarks()
    .withFaceDescriptor()
    .withFaceExpressions();

  return result || null;
}

/**
 * Detect all faces from a video/canvas (for admin multi-face view).
 */
export async function detectAllFaces(videoOrCanvas) {
  if (!faceapi || !modelsLoaded) throw new Error('Models not loaded');

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  return faceapi
    .detectAllFaces(videoOrCanvas, options)
    .withFaceLandmarks()
    .withFaceDescriptor()
    .withFaceExpressions();
}

/**
 * Extract face descriptor (128-dim float array) from a captured image blob/base64.
 * Used during REGISTRATION.
 * @returns {Float32Array|null}
 */
export async function extractDescriptorFromImage(imgSrc) {
  if (!faceapi || !modelsLoaded) throw new Error('Models not loaded');

  const img = await loadImageFromSrc(imgSrc);
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 });

  const result = await faceapi
    .detectSingleFace(img, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;
  return Array.from(result.descriptor); // Convert Float32Array → regular array for JSON/DB storage
}

/**
 * Compare a live descriptor against a list of registered descriptors.
 * @param {Float32Array|number[]} liveDescriptor - from detectSingleFace
 * @param {Array<{descriptor: number[], label: string}>} registeredFaces - from DB
 * @returns {{ match: boolean, distance: number, label: string|null, confidence: number }}
 */
export function matchFace(liveDescriptor, registeredFaces) {
  if (!registeredFaces || registeredFaces.length === 0) {
    return { match: false, distance: 1, label: null, confidence: 0 };
  }

  let bestDistance = Infinity;
  let bestLabel = null;

  for (const face of registeredFaces) {
    const stored = face.descriptor instanceof Float32Array
      ? face.descriptor
      : new Float32Array(face.descriptor);

    const live = liveDescriptor instanceof Float32Array
      ? liveDescriptor
      : new Float32Array(liveDescriptor);

    const distance = faceapi.euclideanDistance(live, stored);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestLabel = face.label || 'registered';
    }
  }

  const confidence = Math.max(0, Math.round((1 - bestDistance / 1.0) * 100));

  return {
    match: bestDistance < RECOGNITION_THRESHOLD,
    distance: bestDistance,
    label: bestLabel,
    confidence,
    threshold: RECOGNITION_THRESHOLD,
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
 */
export function checkFacePosition(detection, videoWidth, videoHeight) {
  if (!detection) return { ok: false, message: 'Posisikan wajah dalam frame' };

  const box = detection.detection.box;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const videoCenter = { x: videoWidth / 2, y: videoHeight / 2 };

  const offsetX = Math.abs(centerX - videoCenter.x) / videoWidth;
  const offsetY = Math.abs(centerY - videoCenter.y) / videoHeight;
  const faceArea = (box.width * box.height) / (videoWidth * videoHeight);

  if (offsetX > 0.25) return { ok: false, message: 'Pindahkan wajah ke tengah (kiri/kanan)' };
  if (offsetY > 0.25) return { ok: false, message: 'Pindahkan wajah ke tengah (atas/bawah)' };
  if (faceArea < 0.06) return { ok: false, message: 'Dekatkan wajah ke kamera' };
  if (faceArea > 0.65) return { ok: false, message: 'Jauhkan wajah dari kamera' };

  return { ok: true, message: 'Posisi wajah baik' };
}

// ---- Helpers ----

function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function getFaceapi() {
  return faceapi;
}

export function isModelsLoaded() {
  return modelsLoaded;
}
