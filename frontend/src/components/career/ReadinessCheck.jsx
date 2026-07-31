import { useEffect, useRef, useState, useCallback } from 'react';
import { Wifi, Mic, Camera, CheckCircle2, XCircle, AlertTriangle, Loader2, RotateCcw, ScanFace } from 'lucide-react';
import api from '../../services/api';
import { useFaceDetector } from '../../hooks/useFaceDetector';

// Everything here checks only what a browser can genuinely observe. It does
// NOT claim to run real face-detection ML — brightness/motion sampled from
// the camera feed are heuristics to catch obviously-covered cameras or long
// absences, labeled honestly rather than presented as "face detected".

const StatusRow = ({ icon: Icon, title, status, detail, onRetry }) => {
  const styles = {
    checking: { color: 'text-white/40', badge: 'Checking...', dot: 'bg-white/30' },
    good: { color: 'text-green-400', badge: 'Working', dot: 'bg-green-400' },
    warn: { color: 'text-amber-400', badge: 'Check', dot: 'bg-amber-400' },
    bad: { color: 'text-red-400', badge: 'Not detected', dot: 'bg-red-400' },
  };
  const s = styles[status] || styles.checking;
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/8">
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${s.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-white text-sm font-semibold">{title}</p>
          <span className={`text-xs font-medium flex items-center gap-1.5 shrink-0 ${s.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === 'checking' ? 'animate-pulse' : ''}`} />
            {s.badge}
          </span>
        </div>
        {detail && <p className="text-white/40 text-xs mt-0.5">{detail}</p>}
      </div>
      {status !== 'checking' && status !== 'good' && onRetry && (
        <button onClick={onRetry} className="text-white/40 hover:text-white shrink-0" title="Retry">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default function ReadinessCheck({ onReady, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  const brightnessTimerRef = useRef(null);
  const lastFrameRef = useRef(null);
  const lastMotionAtRef = useRef(Date.now());
  const spokeOnceRef = useRef(false);
  const cancelledRef = useRef(false);

  const [connection, setConnection] = useState('checking'); // checking | Excellent | Good | Poor | Offline
  const [mic, setMic] = useState('checking'); // checking | working | silent | denied | not-detected
  const [camera, setCamera] = useState('checking'); // checking | active | denied | not-detected
  const [audioLevel, setAudioLevel] = useState(0);
  const [lighting, setLighting] = useState('checking'); // checking | ok | low
  const [motion, setMotion] = useState('checking'); // checking | recent | stale

  const support = {
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    mediaRecorder: typeof window.MediaRecorder !== 'undefined',
    speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    webRTC: typeof window.RTCPeerConnection !== 'undefined',
  };
  const browserSupportOk = support.getUserMedia && support.webRTC;

  const checkConnection = useCallback(async () => {
    setConnection('checking');
    try {
      const timings = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        await api.get('/career/ping');
        timings.push(performance.now() - start);
      }
      const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
      setConnection(avg <= 150 ? 'Excellent' : avg <= 400 ? 'Good' : 'Poor');
    } catch {
      setConnection('Offline');
    }
  }, []);

  const stopMedia = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (brightnessTimerRef.current) clearInterval(brightnessTimerRef.current);
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startMedia = useCallback(async () => {
    setMic('checking');
    setCamera('checking');
    setLighting('checking');
    setMotion('checking');
    spokeOnceRef.current = false;
    stopMedia();
    cancelledRef.current = false;

    if (!support.getUserMedia) {
      setMic('not-detected');
      setCamera('not-detected');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 320, height: 240 } });
      // If the component was unmounted (or startMedia was re-triggered)
      // while this request was in flight, don't leave the new stream running.
      if (cancelledRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamera(videoTrack ? 'active' : 'not-detected');

      // ── Audio level meter ──
      if (audioTrack) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sumSq = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sumSq += v * v;
          }
          const rms = Math.sqrt(sumSq / data.length);
          const level = Math.min(100, Math.round(rms * 400));
          setAudioLevel(level);
          if (level > 6) {
            spokeOnceRef.current = true;
            setMic('working');
          } else if (!spokeOnceRef.current) {
            setMic('silent');
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } else {
        setMic('not-detected');
      }

      // ── Brightness / motion heuristic from the camera frame ──
      const canvas = canvasRef.current;
      canvas.width = 48; canvas.height = 36;
      const ctx2d = canvas.getContext('2d', { willReadFrequently: true });
      lastMotionAtRef.current = Date.now();

      brightnessTimerRef.current = setInterval(() => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          ctx2d.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const frame = ctx2d.getImageData(0, 0, canvas.width, canvas.height).data;
          let total = 0;
          for (let i = 0; i < frame.length; i += 4) {
            total += (frame[i] + frame[i + 1] + frame[i + 2]) / 3;
          }
          const avgBrightness = total / (frame.length / 4);
          setLighting(avgBrightness < 25 ? 'low' : 'ok');

          if (lastFrameRef.current) {
            let diff = 0;
            for (let i = 0; i < frame.length; i += 4) {
              diff += Math.abs(frame[i] - lastFrameRef.current[i]);
            }
            const avgDiff = diff / (frame.length / 4);
            if (avgDiff > 4) lastMotionAtRef.current = Date.now();
          }
          lastFrameRef.current = frame;
          setMotion(Date.now() - lastMotionAtRef.current < 15000 ? 'recent' : 'stale');
        } catch { /* frame not ready yet */ }
      }, 800);
    } catch (err) {
      if (err?.name === 'NotAllowedError') { setMic('denied'); setCamera('denied'); }
      else { setMic('not-detected'); setCamera('not-detected'); }
    }
  }, [support.getUserMedia]);

  useEffect(() => {
    checkConnection();
    startMedia();
    return () => { cancelledRef.current = true; stopMedia(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Defensive re-attachment in case the <video> node mounts after the stream
  // is already available.
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  const micStatusKind = mic === 'working' ? 'good' : mic === 'silent' ? 'warn' : mic === 'checking' ? 'checking' : 'bad';
  const cameraStatusKind = camera === 'active' ? 'good' : camera === 'checking' ? 'checking' : 'bad';
  const connectionKind = connection === 'Excellent' || connection === 'Good' ? 'good' : connection === 'checking' ? 'checking' : connection === 'Poor' ? 'warn' : 'bad';

  const readyToStart = browserSupportOk && mic === 'working' && camera === 'active';

  const faceDetect = useFaceDetector(videoRef, { active: camera === 'active' });
  const faceKind = faceDetect.supported === false ? 'checking' // treated as informational, never blocks
    : faceDetect.faceCount === 1 ? 'good'
    : faceDetect.faceCount === 0 ? 'warn'
    : faceDetect.faceCount > 1 ? 'bad'
    : 'checking';
  const faceDetail =
    faceDetect.supported === false ? 'Face detection unavailable in this browser — brightness/motion checks are still active' :
    faceDetect.faceCount === 1 ? (faceDetect.centered ? 'One face detected, nicely centered' : 'One face detected — try centering yourself in frame') :
    faceDetect.faceCount === 0 ? 'No face detected — make sure you\'re visible' :
    faceDetect.faceCount > 1 ? `${faceDetect.faceCount} faces detected — only one person should be visible` :
    'Loading face detection model...';

  const handleStart = () => {
    onReady({
      connectionQuality: connection,
      micWorking: mic === 'working',
      cameraActive: camera === 'active',
      browserSupport: browserSupportOk,
      faceDetectionSupported: faceDetect.supported === true,
      faceCountAtStart: faceDetect.faceCount
    });
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <div>
        <h2 className="text-white font-bold text-lg">Interview Readiness Check</h2>
        <p className="text-white/40 text-sm">We check what your browser can actually observe — connection, mic and camera. This isn't cheating-detection software; it just makes sure your setup works before you start.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <StatusRow icon={Wifi} title="Internet Connection" status={connectionKind}
            detail={connection === 'checking' ? 'Measuring latency...' : connection === 'Offline' ? 'Could not reach the server' : `${connection} connection quality`}
            onRetry={checkConnection} />
          <StatusRow icon={Mic} title="Microphone" status={micStatusKind}
            detail={
              mic === 'working' ? 'Audio input detected' :
              mic === 'silent' ? 'Mic granted — please say something to test it' :
              mic === 'denied' ? 'Permission denied — allow mic access in your browser' :
              mic === 'checking' ? 'Requesting permission...' : 'No microphone detected'
            }
            onRetry={startMedia} />
          {mic !== 'checking' && mic !== 'denied' && mic !== 'not-detected' && (
            <div className="px-3 -mt-2">
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-green-400 transition-all duration-100" style={{ width: `${audioLevel}%` }} />
              </div>
            </div>
          )}
          <StatusRow icon={Camera} title="Camera" status={cameraStatusKind}
            detail={
              camera === 'active' ? (lighting === 'low' ? 'Live — lighting looks a bit low' : 'Live preview looks good') :
              camera === 'denied' ? 'Permission denied — allow camera access in your browser' :
              camera === 'checking' ? 'Requesting permission...' : 'No camera detected'
            }
            onRetry={startMedia} />
          {camera === 'active' && (
            <StatusRow icon={ScanFace} title="Face Detection" status={faceKind} detail={faceDetail} />
          )}
        </div>

        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/50 aspect-video flex items-center justify-center relative">
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
          {camera !== 'active' && (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
              {camera === 'checking' ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Camera preview unavailable'}
            </div>
          )}
          {camera === 'active' && (
            <span className={`absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              motion === 'recent' ? 'text-green-300 border-green-500/40 bg-black/60' : 'text-amber-300 border-amber-500/40 bg-black/60'
            }`}>
              {motion === 'recent' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {motion === 'recent' ? 'Recent movement' : 'No recent movement — please check you are visible'}
            </span>
          )}
        </div>
      </div>

      {/* Browser & environment */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-white/5 border border-white/8">
          <p className="text-white text-sm font-semibold mb-2">Browser Compatibility</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              ['Camera/Mic API', support.getUserMedia],
              ['MediaRecorder', support.mediaRecorder],
              ['WebRTC', support.webRTC],
              ['Speech Recognition', support.speechRecognition],
            ].map(([label, ok]) => (
              <div key={label} className={`flex items-center gap-1.5 ${ok ? 'text-white/60' : 'text-amber-400'}`}>
                {ok ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> : <XCircle className="w-3 h-3 text-amber-400 shrink-0" />}
                {label}{!ok && ' (unsupported)'}
              </div>
            ))}
          </div>
          {!support.speechRecognition && (
            <p className="text-white/30 text-[11px] mt-2">Voice-to-text won't be available in this browser — you can still type your answers.</p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/8">
          <p className="text-white text-sm font-semibold mb-2">Before You Start</p>
          <ul className="text-white/40 text-xs space-y-1 list-disc list-inside">
            <li>Sit in a quiet room with minimal background noise</li>
            <li>Make sure your face is well lit and visible</li>
            <li>Keep only yourself visible in frame</li>
            <li>Avoid switching tabs — this session tracks focus for your integrity report</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1">Back</button>
        <button onClick={handleStart} disabled={!readyToStart}
          className="btn-primary flex-1 flex items-center justify-center gap-2">
          {readyToStart ? 'Start Interview' : 'Waiting for Mic & Camera...'}
        </button>
      </div>
      {!readyToStart && (mic === 'denied' || camera === 'denied') && (
        <p className="text-amber-400 text-xs text-center">Camera and microphone access are required to start. Please allow permissions and retry.</p>
      )}
    </div>
  );
}
