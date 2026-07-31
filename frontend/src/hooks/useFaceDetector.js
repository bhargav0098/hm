import { useEffect, useRef, useState, useCallback } from 'react';

// MediaPipe assets are fetched by the browser at runtime from Google's
// public CDN (standard for this library — the WASM runtime + model file
// are too large to bundle and change independently of the app). If the
// network blocks this or the browser doesn't support WASM/SIMD, detection
// simply reports `supported: false` and every consumer of this hook falls
// back to the lighter brightness/motion heuristics instead of blocking
// the interview.
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
const OBJECT_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';

let sharedDetectorPromise = null;
function loadDetector() {
  if (!sharedDetectorPromise) {
    sharedDetectorPromise = (async () => {
      const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
      return FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5
      });
    })().catch(async (err) => {
      // Retry once on CPU delegate if GPU init failed (common on headless/older devices)
      try {
        const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        return await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5
        });
      } catch (err2) {
        sharedDetectorPromise = null;
        throw err2;
      }
    });
  }
  return sharedDetectorPromise;
}

let sharedObjectDetectorPromise = null;
function loadObjectDetector() {
  if (!sharedObjectDetectorPromise) {
    sharedObjectDetectorPromise = (async () => {
      const { ObjectDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
      return ObjectDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: OBJECT_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        scoreThreshold: 0.3
      });
    })().catch(async (err) => {
      try {
        const { ObjectDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        return await ObjectDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: OBJECT_MODEL_URL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          scoreThreshold: 0.3
        });
      } catch (err2) {
        sharedObjectDetectorPromise = null;
        throw err2;
      }
    });
  }
  return sharedObjectDetectorPromise;
}

/**
 * Runs real face detection and mobile phone detection against a <video> element.
 * Reports face count, whether the primary face is roughly centered, and if a mobile phone is detected.
 * Detection runs at a throttled rate (a few times per second) — plenty for check without burning CPU.
 */
export function useFaceDetector(videoRef, { active = true, intervalMs = 700 } = {}) {
  const [supported, setSupported] = useState(null); // null = still loading, true/false after
  const [faceCount, setFaceCount] = useState(null);
  const [centered, setCentered] = useState(null);
  const [mobileDetected, setMobileDetected] = useState(false);
  const detectorRef = useRef(null);
  const objDetectorRef = useRef(null);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    cancelledRef.current = false;

    Promise.all([loadDetector(), loadObjectDetector()])
      .then(([det, objDet]) => {
        if (!cancelledRef.current) {
          detectorRef.current = det;
          objDetectorRef.current = objDet;
          setSupported(true);
        }
      })
      .catch(() => {
        if (!cancelledRef.current) setSupported(false);
      });

    return () => { cancelledRef.current = true; };
  }, [active]);

  const detectOnce = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    const objDetector = objDetectorRef.current;
    if (!video || video.readyState < 2) return;
    try {
      const timestamp = performance.now();

      // Face detection
      if (detector) {
        const result = detector.detectForVideo(video, timestamp);
        const detections = result?.detections || [];
        setFaceCount(detections.length);
        if (detections.length >= 1) {
          const box = detections[0].boundingBox;
          const videoW = video.videoWidth || 1, videoH = video.videoHeight || 1;
          const cx = (box.originX + box.width / 2) / videoW;
          const cy = (box.originY + box.height / 2) / videoH;
          const isCentered = cx > 0.25 && cx < 0.75 && cy > 0.15 && cy < 0.85;
          setCentered(isCentered);
        } else {
          setCentered(null);
        }
      }

      // Object detection (cell phone detection)
      if (objDetector) {
        const objResult = objDetector.detectForVideo(video, timestamp);
        const objDetections = objResult?.detections || [];
        const isMobilePresent = objDetections.some(d =>
          d.categories?.some(c => {
            const categoryName = c.categoryName?.toLowerCase() || '';
            return categoryName === 'cell phone' || categoryName === 'phone' || categoryName === 'mobile phone';
          })
        );
        setMobileDetected(isMobilePresent);
      }
    } catch { /* transient frame issue, skip this tick */ }
  }, [videoRef]);

  useEffect(() => {
    if (!active || supported !== true) return;
    timerRef.current = setInterval(detectOnce, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [active, supported, intervalMs, detectOnce]);

  return { supported, faceCount, centered, mobileDetected };
}

