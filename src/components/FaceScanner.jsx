import { useEffect, useRef, useState, useCallback } from 'react';
import { requestWakeLock, releaseWakeLock } from '../lib/wakeLock';
import {
  HiArrowPath,
  HiCheck,
  HiExclamationTriangle
} from 'react-icons/hi2';
import {
  loadModels, detectSingleFace, extractLandmarkData,
  checkFacePosition, matchFace, isModelsLoaded
} from '../lib/faceRecognition';
import {
  generateChallenges, evaluateChallenge, checkMicroMovement,
  checkBlinkFrequency
} from '../lib/livenessDetection';
import './FaceScanner.css';

/**
 * FaceScanner - iPhone Face ID-style face scanning component.
 *
 * Props:
 *   mode: 'verify' (attendance) | 'register' (enrollment)
 *   registeredFaces: Array<{descriptor, label}> — for 'verify' mode
 *   onSuccess(result): called when face verified or registered
 *   onError(message): called on failure
 *   onCapture(descriptor, imageData): for 'register' mode
 *   locale: 'id' | 'en'
 *   strict: boolean — strict liveness (3 challenges)
 */
export default function FaceScanner({
  mode = 'verify',
  registeredFaces = [],
  onSuccess,
  onError,
  onCapture,
  locale = 'id',
  strict = true,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const frameHistoryRef = useRef([]);
  const earHistoryRef = useRef([]);
  const challengeTimeoutRef = useRef(null);

  const [phase, setPhase] = useState('loading'); // loading | ready | scanning | challenge | verifying | success | error
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadMessage, setLoadMessage] = useState('');
  const [ovalState, setOvalState] = useState('idle'); // idle | scanning | challenge | success | error
  const [instruction, setInstruction] = useState(t('Initializing…', 'Memulai…'));
  const [subText, setSubText] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceDots, setFaceDots] = useState([]);
  const [showScanLine, setShowScanLine] = useState(false);

  // Liveness challenges
  const [challenges, setChallenges] = useState([]);
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState([]);

  // Result
  const [_resultData, _setResultData] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [cameraError, setCameraError] = useState('');

  function t(en, id) {
    return locale === 'en' ? en : id;
  }

  // ── Load models & camera ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isModelsLoaded()) {
          setPhase('loading');
          await loadModels((pct, msg) => {
            if (!cancelled) {
              setLoadProgress(pct);
              setLoadMessage(msg);
            }
          });
        }
        if (cancelled) return;
        await startCamera();
        if (cancelled) return;
        setPhase('ready');
        setInstruction(t('Position your face in the frame', 'Posisikan wajah dalam frame'));
      } catch (err) {
        if (!cancelled) {
          setCameraError(err.message || t('Failed to start camera', 'Gagal membuka kamera'));
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
      stopAll();
      releaseWakeLock();
    };
  }, []);

  // ── Start scanning loop once camera ready ─────────────────
  useEffect(() => {
    if (phase === 'ready' || phase === 'scanning' || phase === 'challenge') {
      const newChallenges = generateChallenges(strict);
      setChallenges(newChallenges);
      setCurrentChallengeIdx(0);
      setCompletedChallenges([]);
      startDetectionLoop();
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase === 'ready']);

  // ── Camera helpers ─────────────────────────────────────────
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    // Keep screen awake during face scanning
    requestWakeLock();
  };

  const stopAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(challengeTimeoutRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ── Main detection loop ───────────────────────────────────
  const startDetectionLoop = useCallback(() => {
    let scanningFrames = 0;
    let challengePhase = false;
    let currentIdx = 0;
    let passedChallenges = [];
    let consecutivePassed = 0;

    const loop = async () => {
      if (!videoRef.current || !videoRef.current.readyState >= 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      try {
        const detection = await detectSingleFace(videoRef.current);

        if (!detection) {
          setFaceDetected(false);
          setFaceDots([]);
          if (!challengePhase) {
            setInstruction(t('Position your face in the frame', 'Posisikan wajah dalam frame'));
            setOvalState('idle');
            setShowScanLine(false);
          }
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        setFaceDetected(true);
        const video = videoRef.current;
        const vW = video.videoWidth || 640;
        const vH = video.videoHeight || 640;

        // Update face dot positions (show a subset of landmarks for visual)
        const lm = extractLandmarkData(detection);
        if (lm) {
          const dotPoints = [
            ...lm.leftEye.filter((_, i) => i % 2 === 0),
            ...lm.rightEye.filter((_, i) => i % 2 === 0),
            ...lm.nose.filter((_, i) => i % 2 === 0),
            ...lm.mouth.filter((_, i) => i % 3 === 0),
          ].map(p => ({
            x: ((vW - p.x) / vW) * 100, // mirror because video is mirrored
            y: (p.y / vH) * 100,
          }));
          setFaceDots(dotPoints);
        }

        // Track frame history for micro-movement check
        const box = detection.detection.box;
        frameHistoryRef.current.push({ x: box.x, y: box.y, w: box.width, h: box.height });
        if (frameHistoryRef.current.length > 20) frameHistoryRef.current.shift();

        // Track EAR for blink frequency
        if (lm) {
          const { checkBlink } = await import('../lib/livenessDetection');
          const blinkData = checkBlink(lm);
          earHistoryRef.current.push(blinkData.avgEAR || 1);
          if (earHistoryRef.current.length > 40) earHistoryRef.current.shift();
        }

        // Phase 1: Initial position check & scanning
        const pos = checkFacePosition(detection, vW, vH);
        if (!pos.ok && !challengePhase) {
          setInstruction(pos.message);
          setOvalState('idle');
          setShowScanLine(false);
          scanningFrames = 0;
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        if (!challengePhase) {
          setOvalState('scanning');
          setShowScanLine(true);
          setPhase('scanning');
          scanningFrames++;
          const progress = Math.min(100, Math.round((scanningFrames / 15) * 100));
          setInstruction(t('Scanning face…', 'Memindai wajah…'));
          setSubText(`${progress}%`);

          if (scanningFrames >= 15) {
            // Move to challenge phase
            challengePhase = true;
            setPhase('challenge');
            setOvalState('challenge');
            setShowScanLine(false);
            setSubText('');
            showNextChallenge(currentIdx, passedChallenges);
          }
        } else {
          // Challenge phase
          const challenge = challenges[currentIdx];
          if (!challenge) {
            // All challenges done — verify
            await doVerify(detection, passedChallenges);
            return;
          }

          const result = evaluateChallenge(challenge.id, lm, detection);
          if (result.passed) {
            consecutivePassed++;
            if (consecutivePassed >= 3) { // Must hold pose for 3 frames
              consecutivePassed = 0;
              clearTimeout(challengeTimeoutRef.current);
              passedChallenges = [...passedChallenges, challenge.id];
              setCompletedChallenges([...passedChallenges]);
              currentIdx++;
              setCurrentChallengeIdx(currentIdx);

              if (currentIdx >= challenges.length) {
                await doVerify(detection, passedChallenges);
                return;
              } else {
                showNextChallenge(currentIdx, passedChallenges);
              }
            }
          } else {
            consecutivePassed = 0;
          }
        }
      } catch {
        // Silently ignore per-frame errors
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [challenges, mode, registeredFaces]);

  const showNextChallenge = (idx, _passed) => {
    const ch = challenges[idx];
    if (!ch) return;
    setInstruction(`${ch.icon} ${locale === 'en' ? ch.instructionEn : ch.instruction}`);
    setSubText(t('Hold the pose for 1 second', 'Tahan posisi 1 detik'));

    // Timeout: if challenge not passed in time, restart from idx
    clearTimeout(challengeTimeoutRef.current);
    challengeTimeoutRef.current = setTimeout(() => {
      setInstruction(t('⚠️ Too slow. Try again.', '⚠️ Terlalu lama. Coba lagi.'));
      setSubText('');
      // Reset to first challenge
      setCurrentChallengeIdx(0);
      setCompletedChallenges([]);
    }, ch.timeout);
  };

  const doVerify = async (detection, passedChallenges) => {
    cancelAnimationFrame(rafRef.current);
    setPhase('verifying');
    setShowScanLine(false);
    setInstruction(t('Verifying identity…', 'Memverifikasi identitas…'));
    setSubText('');

    // Passive liveness check
    const microMovement = checkMicroMovement(frameHistoryRef.current);
    const blinkFreq = checkBlinkFrequency(earHistoryRef.current);

    const livenessScore = passedChallenges.length;
    const passivePassed = microMovement.passed || blinkFreq.passed;
    const overallLiveness = livenessScore >= (strict ? 3 : 2) && passivePassed;

    if (!overallLiveness && strict) {
      setOvalState('error');
      setInstruction(t('❌ Liveness check failed. Try again.', '❌ Verifikasi keaktifan gagal. Coba lagi.'));
      onError?.('Liveness check failed');
      setTimeout(() => setPhase('ready'), 3000);
      return;
    }

    if (mode === 'verify') {
      // Match against registered faces
      const descriptor = detection.descriptor;
      const matchResult = matchFace(descriptor, registeredFaces);

      if (matchResult.match) {
        await showSuccessState();
        onSuccess?.({
          descriptor: Array.from(descriptor),
          matchResult,
          livenessResult: { passed: overallLiveness, challenges: passedChallenges, microMovement, blinkFreq },
        });
      } else {
        setOvalState('error');
        setInstruction(t('❌ Face not recognized. Try again.', '❌ Wajah tidak dikenali. Coba lagi.'));
        onError?.(`Face not recognized (distance: ${matchResult.distance.toFixed(3)})`);
        setTimeout(() => setPhase('ready'), 3000);
      }
    } else if (mode === 'register') {
      // Capture and return descriptor for registration
      const descriptor = Array.from(detection.descriptor);
      const imageData = captureFrame();
      await showSuccessState();
      onCapture?.(descriptor, imageData);
      onSuccess?.({ descriptor, imageData, livenessResult: { passed: overallLiveness, challenges: passedChallenges } });
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const showSuccessState = async () => {
    setOvalState('success');
    setShowScanLine(false);
    setFaceDots([]);
    setShowSuccess(true);
    setShowParticles(true);
    setInstruction(t('✅ Verified!', '✅ Terverifikasi!'));
    setSubText('');
    if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
    await new Promise(r => setTimeout(r, 1500));
    setShowParticles(false);
  };

  const handleRetry = () => {
    frameHistoryRef.current = [];
    earHistoryRef.current = [];
    setShowSuccess(false);
    setFaceDots([]);
    setOvalState('idle');
    setInstruction(t('Position your face in the frame', 'Posisikan wajah dalam frame'));
    setPhase('ready');
  };

  // ── Particle positions ────────────────────────────────────
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const dist = 80 + Math.random() * 40;
    return { tx: `${Math.cos(angle) * dist}px`, ty: `${Math.sin(angle) * dist}px`, delay: `${i * 0.05}s` };
  });

  // ── Render ────────────────────────────────────────────────

  if (cameraError) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <HiExclamationTriangle size={32} color="#ef4444" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, color: '#ef4444', marginBottom: 16, fontWeight: 600 }}>{cameraError}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {t('Please allow camera access and refresh.', 'Izinkan akses kamera lalu muat ulang halaman.')}
        </div>
      </div>
    );
  }

  return (
    <div className="face-scanner">
      {/* === MODEL LOADING === */}
      {phase === 'loading' && (
        <div className="face-scanner__progress">
          <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', borderRadius: '50%', margin: '0 auto 16px', border: '2px solid var(--border)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}></div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{loadProgress}%</div>
            </div>
          </div>
          <div className="face-scanner__progress-bar">
            <div className="face-scanner__progress-fill" style={{ width: `${loadProgress}%` }} />
          </div>
          <div className="face-scanner__progress-text">{loadMessage}</div>
        </div>
      )}

      {/* === CAMERA VIEWPORT === */}
      {phase !== 'loading' && (
        <div className="face-scanner__viewport">
          <video ref={videoRef} className="face-scanner__video" playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Oval overlay */}
          <div className={`face-scanner__oval face-scanner__oval--${ovalState}`} />

          {/* Scan line */}
          {showScanLine && (
            <div className={`face-scanner__scanline ${ovalState === 'challenge' ? 'face-scanner__scanline--challenge' : ''}`} />
          )}

          {/* Face landmark dots */}
          <div className="face-scanner__dots">
            {faceDetected && faceDots.map((dot, i) => (
              <div key={i} className="face-dot" style={{ left: `${dot.x}%`, top: `${dot.y}%` }} />
            ))}
          </div>

          {/* Corner brackets */}
          <div className="face-scanner__corners">
            <div className="face-scanner__corner face-scanner__corner--tl" />
            <div className="face-scanner__corner face-scanner__corner--tr" />
            <div className="face-scanner__corner face-scanner__corner--bl" />
            <div className="face-scanner__corner face-scanner__corner--br" />
          </div>

          {/* No face indicator */}
          {!faceDetected && phase !== 'loading' && phase !== 'error' && (
            <div className="face-scanner__no-face">
              {t('No face detected', 'Wajah tidak terdeteksi')}
            </div>
          )}

          {/* Success overlay */}
          {showSuccess && (
            <div className="face-scanner__success-overlay">
              <div className="face-scanner__success-check">
                <HiCheck size={30} color="#fff" strokeWidth={3} />
              </div>
            </div>
          )}

          {/* Particles */}
          {showParticles && (
            <div className="face-scanner__particles">
              {particles.map((p, i) => (
                <div
                  key={i}
                  className="face-particle"
                  style={{ '--tx': p.tx, '--ty': p.ty, animationDelay: p.delay }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* === STATUS AREA === */}
      {phase !== 'loading' && (
        <div className="face-scanner__status">
          <div className={`face-scanner__instruction ${ovalState === 'challenge' ? 'face-scanner__instruction--challenge' : ''} ${ovalState === 'success' ? 'face-scanner__instruction--success' : ''} ${ovalState === 'error' ? 'face-scanner__instruction--error' : ''}`}>
            {instruction}
          </div>
          {subText && <div className="face-scanner__sub">{subText}</div>}

          {/* Challenge progress dots */}
          {(phase === 'scanning' || phase === 'challenge') && challenges.length > 0 && (
            <div className="face-scanner__challenge-dots">
              {challenges.map((ch, i) => (
                <div
                  key={ch.id}
                  className={`face-scanner__dot ${
                    completedChallenges.includes(ch.id)
                      ? 'face-scanner__dot--done'
                      : i === currentChallengeIdx
                      ? 'face-scanner__dot--active'
                      : ''
                  }`}
                />
              ))}
            </div>
          )}

          {/* Retry button on error */}
          {ovalState === 'error' && (
            <button
              onClick={handleRetry}
              style={{
                marginTop: 8,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', borderRadius: 100,
                background: 'var(--primary)', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              }}
            >
              <HiArrowPath size={14} /> {t('Try Again', 'Coba Lagi')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
