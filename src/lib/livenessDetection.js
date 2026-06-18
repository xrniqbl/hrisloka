/**
 * Liveness Detection Service
 * Detects if the face is REAL (not a photo/video replay).
 * Uses active challenges + passive analysis via face landmarks & expressions.
 */

const BLINK_EAR_THRESHOLD = 0.22;      // Eye Aspect Ratio below this = eye closed
const HEAD_POSE_THRESHOLD = 12;         // Degrees of head rotation
const SMILE_THRESHOLD = 0.55;          // Expression confidence for smile

// Available challenges for active liveness
const CHALLENGES = [
  {
    id: 'blink',
    instruction: 'Kedipkan mata Anda',
    instructionEn: 'Blink your eyes',
    icon: '️',
    timeout: 5000,
  },
  {
    id: 'turn_left',
    instruction: 'Miringkan kepala ke kiri',
    instructionEn: 'Turn your head to the left',
    icon: '↩️',
    timeout: 5000,
  },
  {
    id: 'turn_right',
    instruction: 'Miringkan kepala ke kanan',
    instructionEn: 'Turn your head to the right',
    icon: '↪️',
    timeout: 5000,
  },
  {
    id: 'smile',
    instruction: 'Tersenyumlah',
    instructionEn: 'Please smile',
    icon: '',
    timeout: 5000,
  },
  {
    id: 'nod',
    instruction: 'Anggukkan kepala',
    instructionEn: 'Nod your head',
    icon: '⬇️',
    timeout: 5000,
  },
];

/**
 * Get a random set of N challenges for liveness verification.
 * Strict mode: 3 challenges. Normal: 2 challenges.
 */
export function generateChallenges(strict = true) {
  const count = strict ? 3 : 2;
  const shuffled = [...CHALLENGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================================
// Eye Aspect Ratio (EAR) — Blink Detection
// EAR = (sum of vertical distances) / (2 * horizontal distance)
// EAR < threshold → eye closed
// ============================================================

function euclidean(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function computeEAR(eyePoints) {
  if (!eyePoints || eyePoints.length < 6) return 1;
  const A = euclidean(eyePoints[1], eyePoints[5]);
  const B = euclidean(eyePoints[2], eyePoints[4]);
  const C = euclidean(eyePoints[0], eyePoints[3]);
  return (A + B) / (2.0 * C);
}

/**
 * Check if eyes are closed (blink detected).
 * @param {object} landmarkData - from extractLandmarkData()
 * @returns {{ blinked: boolean, leftEAR: number, rightEAR: number }}
 */
export function checkBlink(landmarkData) {
  if (!landmarkData?.leftEye || !landmarkData?.rightEye) {
    return { blinked: false, leftEAR: 1, rightEAR: 1 };
  }
  const leftEAR = computeEAR(landmarkData.leftEye);
  const rightEAR = computeEAR(landmarkData.rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2;
  return {
    blinked: avgEAR < BLINK_EAR_THRESHOLD,
    leftEAR,
    rightEAR,
    avgEAR,
  };
}

// ============================================================
// Head Pose Estimation — Turn Left/Right/Nod
// Uses eye and nose positions to estimate rotation
// ============================================================

/**
 * Estimate head pose from landmarks.
 * @returns {{ yaw: number, pitch: number, roll: number }} in degrees
 */
export function estimateHeadPose(landmarkData) {
  if (!landmarkData?.leftEye || !landmarkData?.rightEye || !landmarkData?.nose) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }

  const leftEyeCenter = averagePoint(landmarkData.leftEye);
  const rightEyeCenter = averagePoint(landmarkData.rightEye);
  const noseCenter = averagePoint(landmarkData.nose);

  // Yaw: left-right rotation based on eye midpoint vs nose position
  const eyeMidX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
  const eyeWidth = euclidean(leftEyeCenter, rightEyeCenter);
  const yaw = ((noseCenter.x - eyeMidX) / eyeWidth) * 90;

  // Pitch: up-down rotation based on eye midpoint vs nose vertical position
  const eyeMidY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
  const pitch = ((noseCenter.y - eyeMidY) / eyeWidth) * 60;

  // Roll: head tilt based on eye line angle
  const dx = rightEyeCenter.x - leftEyeCenter.x;
  const dy = rightEyeCenter.y - leftEyeCenter.y;
  const roll = (Math.atan2(dy, dx) * 180) / Math.PI;

  return { yaw, pitch, roll };
}

function averagePoint(points) {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/**
 * Check head turn challenge.
 * @param {string} direction - 'left' | 'right' | 'nod'
 * @param {object} landmarkData
 */
export function checkHeadTurn(direction, landmarkData) {
  const pose = estimateHeadPose(landmarkData);
  switch (direction) {
    case 'left':
      return { passed: pose.yaw < -HEAD_POSE_THRESHOLD, pose };
    case 'right':
      return { passed: pose.yaw > HEAD_POSE_THRESHOLD, pose };
    case 'nod':
      return { passed: Math.abs(pose.pitch) > HEAD_POSE_THRESHOLD, pose };
    default:
      return { passed: false, pose };
  }
}

// ============================================================
// Smile / Expression Detection
// ============================================================

export function checkSmile(detection) {
  if (!detection?.expressions) return { passed: false };
  const happy = detection.expressions.happy || 0;
  return { passed: happy > SMILE_THRESHOLD, confidence: happy };
}

// ============================================================
// Main Challenge Checker
// ============================================================

/**
 * Evaluate if a specific challenge has been passed.
 * @param {string} challengeId - 'blink' | 'turn_left' | 'turn_right' | 'smile' | 'nod'
 * @param {object} landmarkData - from extractLandmarkData()
 * @param {object} detection - full detection from detectSingleFace()
 * @returns {{ passed: boolean, detail: object }}
 */
export function evaluateChallenge(challengeId, landmarkData, detection) {
  switch (challengeId) {
    case 'blink': {
      const result = checkBlink(landmarkData);
      return { passed: result.blinked, detail: result };
    }
    case 'turn_left': {
      const result = checkHeadTurn('left', landmarkData);
      return result;
    }
    case 'turn_right': {
      const result = checkHeadTurn('right', landmarkData);
      return result;
    }
    case 'nod': {
      const result = checkHeadTurn('nod', landmarkData);
      return result;
    }
    case 'smile': {
      const result = checkSmile(detection);
      return result;
    }
    default:
      return { passed: false };
  }
}

// ============================================================
// Passive Liveness Checks (no user action needed)
// ============================================================

/**
 * Check for face micro-movement across multiple frames.
 * A photo won't move, a real face will have tiny natural variations.
 * @param {Array<{x,y,w,h}>} frameHistory - last 10 face bounding boxes
 * @returns {{ passed: boolean, variance: number }}
 */
export function checkMicroMovement(frameHistory) {
  if (!frameHistory || frameHistory.length < 5) {
    return { passed: false, variance: 0, reason: 'Not enough frames' };
  }

  // Calculate variance in center X/Y across frames
  const centers = frameHistory.map(f => ({ x: f.x + f.w / 2, y: f.y + f.h / 2 }));
  const avgX = centers.reduce((s, c) => s + c.x, 0) / centers.length;
  const avgY = centers.reduce((s, c) => s + c.y, 0) / centers.length;
  const variance = centers.reduce((s, c) => s + (c.x - avgX) ** 2 + (c.y - avgY) ** 2, 0) / centers.length;

  // Real face: some variance (0.5 - 50 pixels²). Photo: near 0. Video: very high.
  return {
    passed: variance > 0.3 && variance < 200,
    variance,
  };
}

/**
 * Check eye blink frequency as liveness indicator.
 * Real people blink naturally. A photo never blinks.
 * @param {number[]} earHistory - array of EAR values over time
 * @returns {{ passed: boolean, blinkCount: number }}
 */
export function checkBlinkFrequency(earHistory) {
  if (!earHistory || earHistory.length < 10) return { passed: false, blinkCount: 0 };

  let blinkCount = 0;
  let eyeWasClosed = false;

  for (const ear of earHistory) {
    if (ear < BLINK_EAR_THRESHOLD && !eyeWasClosed) {
      blinkCount++;
      eyeWasClosed = true;
    } else if (ear >= BLINK_EAR_THRESHOLD) {
      eyeWasClosed = false;
    }
  }

  return { passed: blinkCount >= 1, blinkCount };
}
