import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, Zap, ChevronRight, CheckCircle, Clock, Star, AlertCircle,
  RotateCcw, Send, Download, BookOpen, ExternalLink, ShieldCheck, ShieldAlert, Wifi, Sparkles,
  Volume2, VolumeX, ScanFace
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../services/api';
import { RoleSelect, SkillMultiSelect } from '../components/career/RolePicker';
import { EXPERIENCE_LEVELS } from '../data/roleCatalog';
import ReadinessCheck from '../components/career/ReadinessCheck';
import HRAvatar from '../components/career/HRAvatar';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useFaceDetector } from '../hooks/useFaceDetector';
import useAuthStore from '../store/authStore';

const INTERVIEW_TYPES = [
  { id: 'hr', label: 'HR Round', desc: 'Behavioral & personal questions', color: 'from-cyan-neon to-emerald-neon' },
  { id: 'technical', label: 'Technical Round', desc: 'Coding & technical concepts', color: 'from-purple-500 to-primary-500' },
  { id: 'behavioral', label: 'Behavioral', desc: 'Situational & STAR method', color: 'from-green-500 to-teal-500' },
  { id: 'coding', label: 'Coding Round', desc: 'Live problem solving', color: 'from-orange-500 to-red-500' },
  { id: 'mixed', label: 'Full Mock Interview', desc: 'Comprehensive practice session', color: 'from-pink-neon to-purple-neon' }
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
];


// Penalty weights mirrored from the backend, used only to render a live
// "estimated" integrity score during the interview (server recomputes the
// authoritative score on completion).
const INTEGRITY_PENALTIES = {
  tab_switch: 6, window_blur: 4, camera_off: 10, mic_muted: 5, camera_covered: 8, no_motion: 3,
  multiple_faces: 9, face_missing: 7, looking_away: 2, mobile_detected: 100
};

// Short, human-like reactions the AI "interviewer" speaks between questions,
// chosen based on how the previous answer scored — never shown as a score,
// just a natural-sounding conversational bridge to the next question.
const REACTIONS = {
  strong: ["That's a great answer.", "Excellent, that's very clear.", "Nice, I like that approach."],
  good: ["Good answer.", "That's a solid response.", "I see, that makes sense."],
  ok: ["I see, thank you for that.", "Okay, got it.", "Alright, let's continue."],
  weak: ["I'd like to explore that a bit further.", "Let's clarify that a little more.", "Interesting — let's move to another question."]
};
function pickReaction(score) {
  const s = score ?? 0;
  const pool = s >= 8 ? REACTIONS.strong : s >= 6 ? REACTIONS.good : s >= 4 ? REACTIONS.ok : REACTIONS.weak;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Tracks only what a browser can genuinely observe during the live
 * interview: tab switches, window focus loss, and camera/mic track state.
 * This is explicitly NOT a claim of detecting phones, other devices, or
 * other AI tools — see the on-screen copy and the report footer.
 */
function useIntegrityMonitor(active) {
  const [events, setEvents] = useState([]);
  const [camStatus, setCamStatus] = useState('checking'); // checking | active | off
  const [micStatus, setMicStatus] = useState('checking'); // checking | active | muted
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const lastLoggedRef = useRef({});
  const lastMotionAtRef = useRef(Date.now());

  const logEvent = useCallback((type) => {
    const now = Date.now();
    // Dedupe: don't log the same event type more than once every 4 seconds
    if (lastLoggedRef.current[type] && now - lastLoggedRef.current[type] < 4000) return;
    lastLoggedRef.current[type] = now;
    setEvents(prev => [...prev, { type, timestamp: new Date().toISOString() }]);
  }, []);

  // Imperative escape hatch — called explicitly whenever the interview ends,
  // is cancelled, or gets flagged, so the camera/mic are released immediately
  // rather than waiting on a React effect cleanup that could theoretically
  // race with a fast step change. This is on top of (not instead of) the
  // effect cleanup below — belt and suspenders, because a camera staying on
  // after the interview ends is worse than a redundant stop() call.
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamStatus('checking');
    setMicStatus('checking');
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    // Local (not ref) bindings so THIS effect run's cleanup always stops
    // exactly the stream/timer it created, even if the effect somehow runs
    // again before the previous async getUserMedia() call resolves.
    let localStream = null;
    let localTimer = null;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 240, height: 180 } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStream = stream;
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
        setCamStatus('active');
        setMicStatus('active');

        const canvas = canvasRef.current;
        canvas.width = 32; canvas.height = 24;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let lastFrame = null;

        localTimer = setInterval(() => {
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];
          if (videoTrack && (!videoTrack.enabled || videoTrack.readyState === 'ended')) {
            setCamStatus('off'); logEvent('camera_off');
          } else if (videoTrack) setCamStatus('active');
          if (audioTrack && (!audioTrack.enabled || audioTrack.muted)) {
            setMicStatus('muted'); logEvent('mic_muted');
          } else if (audioTrack) setMicStatus('active');

          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let total = 0;
            for (let i = 0; i < frame.length; i += 4) total += (frame[i] + frame[i + 1] + frame[i + 2]) / 3;
            const avgBrightness = total / (frame.length / 4);
            if (avgBrightness < 20) logEvent('camera_covered');

            if (lastFrame) {
              let diff = 0;
              for (let i = 0; i < frame.length; i += 4) diff += Math.abs(frame[i] - lastFrame[i]);
              if (diff / (frame.length / 4) > 4) lastMotionAtRef.current = Date.now();
            }
            lastFrame = frame;
            if (Date.now() - lastMotionAtRef.current > 25000) logEvent('no_motion');
          } catch { /* frame not ready */ }
        }, 1500);
      } catch {
        setCamStatus('off');
        setMicStatus('muted');
      }
    })();

    const onVisibility = () => { if (document.hidden) logEvent('tab_switch'); };
    const onBlur = () => logEvent('window_blur');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      if (localTimer) clearInterval(localTimer);
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (streamRef.current === localStream) streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCamStatus('checking');
      setMicStatus('checking');
    };
  }, [active, logEvent]);

  // Re-attach the stream to the <video> element on every render — covers the
  // case where the video node mounts slightly after the stream is already
  // available (e.g. while an exit animation is still finishing elsewhere on
  // the page), which otherwise left the preview blank even though the camera
  // was genuinely on.
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  const estimatedScore = Math.max(0, 100 - events.reduce((sum, e) => sum + (INTEGRITY_PENALTIES[e.type] || 3), 0));

  // Real face detection (when the browser supports it) layered on top of the
  // camera/mic/tab-switch checks above — multiple faces, a missing face for
  // a sustained period, looking away for a sustained period, or mobile phone detection.
  const faceDetect = useFaceDetector(videoRef, { active });
  const lastFaceSeenAtRef = useRef(Date.now());
  const lastCenteredAtRef = useRef(Date.now());

  useEffect(() => {
    if (!active || faceDetect.supported !== true) return;
    const now = Date.now();
    if (faceDetect.faceCount === 1) {
      lastFaceSeenAtRef.current = now;
      if (faceDetect.centered !== false) lastCenteredAtRef.current = now;
    }
    if (faceDetect.faceCount > 1) logEvent('multiple_faces');
    if (faceDetect.faceCount === 0 && now - lastFaceSeenAtRef.current > 8000) logEvent('face_missing');
    if (faceDetect.faceCount === 1 && faceDetect.centered === false && now - lastCenteredAtRef.current > 10000) logEvent('looking_away');
    if (faceDetect.mobileDetected) logEvent('mobile_detected');
  }, [active, faceDetect.faceCount, faceDetect.centered, faceDetect.mobileDetected, faceDetect.supported, logEvent]);

  return { videoRef, events, camStatus, micStatus, estimatedScore, faceDetect, stopStream };
}

/** Browser-native speech-to-text for answering by voice (no server STT dependency). */
function useSpeechToText(onFinal, onInterim) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const recognitionRef = useRef(null);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' ';
        else interimText += e.results[i][0].transcript;
      }
      if (finalText) onFinal(finalText);
      if (onInterim) onInterim(interimText);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      // Some browsers throw if start() is called immediately after a
      // previous instance's stop() hasn't fully settled yet — retry shortly.
      setTimeout(() => { try { rec.start(); setListening(true); } catch {} }, 250);
    }
  }, [onFinal, onInterim]);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  return { supported, listening, start, stop };
}

export default function InterviewPage() {
  const { user } = useAuthStore();
  const [step, setStep] = useState('setup'); // setup | readiness | interview | result
  const [targetRole, setTargetRole] = useState('');
  const [interviewType, setInterviewType] = useState('mixed');
  const [skills, setSkills] = useState([]);
  const [experienceLevel, setExperienceLevel] = useState('fresher');
  const [difficulty, setDifficulty] = useState('medium');
  const [duration, setDuration] = useState(30);
  const [readinessResult, setReadinessResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState('');
  const [interim, setInterim] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [flagged, setFlagged] = useState(false);
  const [reviewing, setReviewing] = useState(false); // true once the candidate has stopped talking and is confirming their answer
  const timerRef = useRef(null);
  const textareaRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastSpeechAtRef = useRef(0);
  const severeViolationScoreRef = useRef(0);
  const lastHandledEventCountRef = useRef(0);
  const integrityEndedRef = useRef(false);

  // ── Conversational AI HR avatar state ──
  const [avatarState, setAvatarState] = useState('idle'); // idle | speaking | listening | thinking
  const [caption, setCaption] = useState('');
  const [mouthOpen, setMouthOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const questionsRef = useRef([]);
  const currentQRef = useRef(0);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { currentQRef.current = currentQ; }, [currentQ]);

  const monitor = useIntegrityMonitor(step === 'interview');
  const tts = useSpeechSynthesis();
  const hasSpokenRef = useRef(false);
  const speech = useSpeechToText(
    (text) => { setAnswer(prev => (prev ? prev + ' ' : '') + text); lastSpeechAtRef.current = Date.now(); hasSpokenRef.current = true; },
    (text) => { setInterim(text); if (text) { lastSpeechAtRef.current = Date.now(); hasSpokenRef.current = true; } }
  );

  const stopAndReview = () => {
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    if (speech.listening) speech.stop();
    setReviewing(true);
  };

  // Auto-stop listening a few seconds after the candidate goes quiet, so
  // there's no "type here" fallback — just answer naturally and it moves on.
  useEffect(() => {
    if (avatarState !== 'listening' || reviewing || !speech.supported) return;
    const iv = setInterval(() => {
      if (hasSpokenRef.current && Date.now() - lastSpeechAtRef.current > 3000) {
        stopAndReview();
      }
    }, 400);
    silenceTimerRef.current = iv;
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarState, reviewing, speech.supported]);

  const reRecord = () => {
    setAnswer('');
    setInterim('');
    hasSpokenRef.current = false;
    lastSpeechAtRef.current = Date.now();
    setReviewing(false);
    if (speech.supported) speech.start();
  };

  /** Stops everything media/voice-related and releases the camera/mic. */
  const teardownLiveInterview = () => {
    tts.stop();
    if (speech.listening) speech.stop();
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    setTimerActive(false);
    monitor.stopStream();
  };

  const cancelInterview = () => {
    teardownLiveInterview();
    setStep('setup');
    setSession(null);
    setQuestions([]);
    setCurrentQ(0);
    setAnswer('');
    setInterim('');
    setEvaluation(null);
    setReviewing(false);
    setAvatarState('idle');
    setCaption('');
    toast('Interview cancelled', { icon: '👋' });
  };

  // ── Live integrity monitoring: warn immediately, and end the interview
  // outright after repeated severe violations. This never claims to detect
  // a specific device (phone, second screen, etc.) — only what the browser
  // can actually observe: more than one face, or the camera going dark/off. ──
  const endInterviewForIntegrity = async (reason) => {
    if (integrityEndedRef.current) return;
    integrityEndedRef.current = true;
    toast.error(reason, { duration: 7000, icon: '⚠️' });
    teardownLiveInterview();
    setAvatarState('idle');
    try {
      const { data } = await api.post('/career/interview/complete', {
        sessionId: session._id, integrityEvents: monitor.events, durationSeconds: timer
      });
      setFinalResult(data);
      setFlagged(true);
      setStep('result');
    } catch { toast.error('Failed to complete session'); }
  };

  useEffect(() => {
    if (step !== 'interview') return;
    const newEvents = monitor.events.slice(lastHandledEventCountRef.current);
    lastHandledEventCountRef.current = monitor.events.length;
    if (!newEvents.length) return;

    newEvents.forEach(e => {
      if (e.type === 'multiple_faces') { toast.error('More than one face detected — only you should be visible.', { icon: '⚠️' }); severeViolationScoreRef.current += 2; }
      else if (e.type === 'camera_off') { toast.error('Your camera turned off.', { icon: '📷' }); severeViolationScoreRef.current += 2; }
      else if (e.type === 'camera_covered') { toast.error('Your camera looks covered or the lighting dropped.', { icon: '📷' }); severeViolationScoreRef.current += 1; }
      else if (e.type === 'face_missing') { toast('You stepped out of frame — please stay visible.', { icon: '👀' }); severeViolationScoreRef.current += 1; }
      else if (e.type === 'tab_switch') { toast('Please stay on this tab during the interview.', { icon: '⚠️' }); }
      else if (e.type === 'mobile_detected') {
        endInterviewForIntegrity('Interview ended — mobile phone detected in camera feed.');
      }
    });

    if (severeViolationScoreRef.current >= 5) {
      endInterviewForIntegrity('Interview ended — repeated integrity issues were detected (multiple people visible or camera problems).');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitor.events, step]);

  /** Speaks the question at `idx` (with a personalized greeting for question 1),
   *  then hands off to speech recognition / typing once the AI finishes "talking".
   *  Deliberately a plain function (not useCallback) so it always closes over
   *  the latest state — it's cheap to redefine and avoids stale-closure bugs
   *  when it hands off to finishInterview() further down the chain. */
  const speakQuestionAt = (idx, list) => {
    const q = (list || questionsRef.current)[idx];
    if (!q) return;
    if (speech.listening) speech.stop();
    setInterim('');
    setAnswer('');
    setReviewing(false);
    hasSpokenRef.current = false;

    let text = q.question;
    if (idx === 0) {
      const firstName = (user?.fullName || '').split(' ')[0] || 'there';
      text = `Hello ${firstName}. Welcome to today's interview. I hope you're doing well. Today we'll be conducting a ${targetRole} interview. The interview will take approximately ${duration} minutes. Please answer naturally, and take your time. If you're ready, let's begin. ${q.question}`;
    }

    setCaption(text);
    setAvatarState('speaking');

    const goToListening = () => {
      setMouthOpen(false);
      setAvatarState('listening');
      setCaption(q.question);
      lastSpeechAtRef.current = Date.now();
      if (speech.supported) speech.start();
    };

    if (voiceEnabled && tts.supported) {
      tts.speak(text, { onWord: () => setMouthOpen(m => !m), onDone: goToListening });
    } else {
      goToListening();
    }
  };

  /** Advances to the next question, or wraps up the interview with a closing line. */
  const advance = () => {
    const list = questionsRef.current;
    const next = currentQRef.current + 1;
    if (speech.listening) speech.stop();

    if (next < list.length) {
      setCurrentQ(next);
      setAnswer('');
      setEvaluation(null);
      speakQuestionAt(next, list);
    } else {
      const closing = "Thank you, that concludes today's interview. Great job today — let's take a look at how you did.";
      setCaption(closing);
      setAvatarState('speaking');
      if (voiceEnabled && tts.supported) {
        tts.speak(closing, { onWord: () => setMouthOpen(m => !m), onDone: () => { setMouthOpen(false); finishInterview(); } });
      } else {
        finishInterview();
      }
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled(v => {
      const next = !v;
      if (!next) {
        tts.stop();
        if (avatarState === 'speaking') {
          setMouthOpen(false);
          setAvatarState('listening');
          setCaption(questionsRef.current[currentQRef.current]?.question || '');
          if (speech.supported) speech.start();
        }
      }
      return next;
    });
  };

  useEffect(() => {
    api.get('/career/skills/profile').then(r => {
      if (r.data.profile) {
        setTargetRole(r.data.profile.targetRole || '');
        setSkills(r.data.profile.currentSkills?.map(s => s.name) || []);
        if (r.data.profile.experienceLevel) setExperienceLevel(r.data.profile.experienceLevel);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  useEffect(() => {
    if (step !== 'interview') {
      tts.stop();
      if (speech.listening) speech.stop();
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
      monitor.stopStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Final safety net: if the person navigates away from this page entirely
  // (closes the tab, clicks another nav link) mid-interview, release the
  // camera/mic immediately rather than leaving them on.
  useEffect(() => () => { tts.stop(); monitor.stopStream(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const remainingSeconds = Math.max(0, duration * 60 - timer);

  const goToReadiness = () => {
    if (!targetRole.trim()) return toast.error('Please select a target role');
    setStep('readiness');
  };

  const startInterview = async (readiness) => {
    setReadinessResult(readiness);
    setLoading(true);
    try {
      const { data } = await api.post('/career/interview/generate', {
        role: targetRole, type: interviewType, skills, experienceLevel, difficulty, duration, readinessCheck: readiness
      });
      const fetchedQuestions = data.session.questionDetails || [];
      setSession(data.session);
      setQuestions(fetchedQuestions);
      setCurrentQ(0);
      setStep('interview');
      setTimer(0);
      setTimerActive(true);
      setFollowUpCount(0);
      setFlagged(false);
      severeViolationScoreRef.current = 0;
      lastHandledEventCountRef.current = 0;
      integrityEndedRef.current = false;
      toast.success('Mock interview started! Good luck 🎯');
      setTimeout(() => speakQuestionAt(0, fetchedQuestions), 400);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start interview');
      setStep('setup');
    } finally { setLoading(false); }
  };

  // Evaluation happens in the background and is stored for the final report,
  // but — like a real interviewer — nothing is shown to the candidate mid-
  // interview. The AI just reacts briefly and moves on to the next question.
  const submitAnswer = async () => {
    if (!answer.trim()) return toast.error('No answer was captured — please try speaking again');
    if (speech.listening) speech.stop();
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    setInterim('');
    setReviewing(false);
    setEvaluating(true);
    setAvatarState('thinking');
    setCaption('');
    let score = 0;
    try {
      const { data } = await api.post('/career/interview/answer', {
        sessionId: session._id,
        questionIndex: currentQ,
        answer,
        question: questions[currentQ]?.question,
        role: targetRole
      });
      setEvaluation(data.evaluation);
      score = data.evaluation?.score ?? 0;

      // Adaptive follow-up: only fire for a very strong or very weak answer,
      // and cap the number of follow-ups so API usage stays bounded.
      if ((score >= 8 || score < 5) && followUpCount < 3) {
        try {
          const fu = await api.post('/career/interview/followup', {
            role: targetRole, question: questions[currentQ]?.question, answer, score
          });
          if (fu.data?.followUp?.question) {
            const followUpQ = { ...fu.data.followUp, isFollowUp: true, category: fu.data.followUp.category || questions[currentQ]?.category || 'technical' };
            setQuestions(prev => {
              const copy = [...prev];
              copy.splice(currentQ + 1, 0, followUpQ);
              questionsRef.current = copy;
              return copy;
            });
            setFollowUpCount(c => c + 1);
          }
        } catch { /* follow-up is a bonus; ignore failures silently */ }
      }
    } catch (err) {
      toast.error('Evaluation failed');
    } finally {
      setEvaluating(false);
    }

    // React like a human interviewer, then move on.
    const reaction = pickReaction(score);
    setCaption(reaction);
    setAvatarState('speaking');
    if (voiceEnabled && tts.supported) {
      tts.speak(reaction, { onWord: () => setMouthOpen(m => !m), onDone: () => { setMouthOpen(false); advance(); } });
    } else {
      setTimeout(() => advance(), 900);
    }
  };

  // Manual skip/finish control — stops any AI speech/listening in progress
  // and moves straight to the next question without a spoken reaction.
  const nextQuestion = () => {
    tts.stop();
    if (speech.listening) speech.stop();
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    setMouthOpen(false);
    setReviewing(false);
    advance();
  };

  const finishInterview = async () => {
    teardownLiveInterview();
    try {
      const { data } = await api.post('/career/interview/complete', {
        sessionId: session._id,
        integrityEvents: monitor.events,
        durationSeconds: timer
      });
      setFinalResult(data);
      setStep('result');
      setAvatarState('idle');
      toast.success('Interview completed! 🎉');
    } catch { toast.error('Failed to complete session'); }
  };


  const downloadPrepGuide = () => {
    const type = INTERVIEW_TYPES.find(t => t.id === interviewType);
    const skillList = skills;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
      <title>Interview Guide - ${targetRole}</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;padding:32px;max-width:750px;margin:0 auto;background:#fff;color:#1a1a2e}
        h1{color:#6366f1;font-size:26px;margin-bottom:4px}
        h2{color:#4f46e5;font-size:16px;margin:24px 0 8px;border-bottom:2px solid #e0e7ff;padding-bottom:6px}
        h3{color:#374151;font-size:14px;margin:12px 0 4px}
        p,li{color:#4b5563;font-size:13px;line-height:1.7}
        .tip{background:#f0fdf4;border-left:4px solid #10b981;padding:10px 14px;border-radius:4px;margin:8px 0}
        .warn{background:#fffbeb;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:4px;margin:8px 0}
        .star{background:#eff6ff;border-left:4px solid #6366f1;padding:10px 14px;border-radius:4px;margin:8px 0}
        ul{padding-left:20px}
        .meta{color:#6b7280;font-size:12px;margin-bottom:24px}
        @media print{body{padding:16px}}
      </style></head><body>
      <h1>🎯 Interview Preparation Guide</h1>
      <div class="meta">
        <strong>Role:</strong> ${targetRole} &nbsp;|&nbsp;
        <strong>Type:</strong> ${type?.label || interviewType} &nbsp;|&nbsp;
        <strong>Skills:</strong> ${skillList.join(', ')}<br/>
        <strong>Generated:</strong> ${new Date().toLocaleDateString()}
      </div>

      <h2>📋 Before the Interview</h2>
      <ul>
        <li>Research the company thoroughly — products, culture, recent news</li>
        <li>Review the job description and match your skills to requirements</li>
        <li>Prepare 3-5 specific examples from your experience using STAR method</li>
        <li>Test your tech setup (camera, mic, internet) 30 minutes before</li>
        <li>Dress professionally even for remote interviews</li>
        <li>Prepare 3 thoughtful questions to ask the interviewer</li>
      </ul>

      <h2>🗣️ How to Behave & Communicate</h2>
      <div class="tip">Speak clearly and at a moderate pace. Pause briefly before answering to collect your thoughts — this shows confidence, not hesitation.</div>
      <ul>
        <li>Maintain eye contact (look at the camera for video calls)</li>
        <li>Use positive body language — sit upright, smile naturally</li>
        <li>Listen carefully to the full question before answering</li>
        <li>If you don't know something, say "I haven't worked with that directly, but here's how I'd approach it..."</li>
        <li>Avoid filler words (um, uh, like) — practice pausing instead</li>
        <li>Show enthusiasm for the role and company</li>
      </ul>

      <h2>⭐ STAR Method for Behavioral Questions</h2>
      <div class="star">
        <strong>S</strong>ituation — Set the context briefly<br/>
        <strong>T</strong>ask — What was your responsibility?<br/>
        <strong>A</strong>ction — What specific steps did YOU take?<br/>
        <strong>R</strong>esult — What was the measurable outcome?
      </div>
      <p>Example: "Tell me about a challenging project" → Describe the project (S), your role (T), the specific decisions you made (A), and the impact/result with numbers if possible (R).</p>

      ${interviewType === 'technical' || interviewType === 'coding' || interviewType === 'mixed' ? `
      <h2>💻 Technical Round Tips for ${targetRole}</h2>
      <ul>
        <li>Think out loud — explain your reasoning as you solve problems</li>
        <li>Clarify requirements before jumping into solutions</li>
        <li>Start with a brute-force solution, then optimize</li>
        <li>Discuss time and space complexity of your solutions</li>
        <li>For ${skillList.slice(0,3).join(', ')} — review core concepts, common patterns, and recent updates</li>
        <li>Practice coding on a whiteboard or shared editor beforehand</li>
      </ul>` : ''}

      ${interviewType === 'hr' || interviewType === 'mixed' ? `
      <h2>👔 HR Round — Common Questions & Tips</h2>
      <ul>
        <li>"Tell me about yourself" — 2-minute structured pitch: background → skills → why this role</li>
        <li>"Why do you want this job?" — Connect your goals to the company's mission</li>
        <li>"What's your weakness?" — Choose a real weakness you're actively improving</li>
        <li>"Where do you see yourself in 5 years?" — Show ambition aligned with the company</li>
        <li>Salary negotiation: Research market rates, give a range, not a single number</li>
      </ul>` : ''}

      <h2>🚫 Common Mistakes to Avoid</h2>
      <div class="warn">
        <ul style="margin:0;padding-left:16px">
          <li>Badmouthing previous employers</li>
          <li>Giving vague answers without specific examples</li>
          <li>Not asking any questions at the end</li>
          <li>Lying or exaggerating your experience</li>
          <li>Checking your phone or being distracted</li>
          <li>Forgetting to follow up with a thank-you email</li>
        </ul>
      </div>

      <h2>📝 Key Topics to Study for ${targetRole}</h2>
      <ul>
        ${skillList.map(s => `<li><strong>${s}</strong> — core concepts, best practices, common interview questions</li>`).join('')}
        <li>System design basics (for senior roles)</li>
        <li>Data structures & algorithms fundamentals</li>
        <li>Version control (Git) workflows</li>
      </ul>

      <h2>✅ After the Interview</h2>
      <ul>
        <li>Send a thank-you email within 24 hours</li>
        <li>Note down questions you struggled with for future practice</li>
        <li>Follow up if you haven't heard back within the stated timeline</li>
      </ul>

      <p style="margin-top:32px;color:#9ca3af;font-size:11px;text-align:center">Generated by CareerIQ AI Platform — Good luck! 🍀</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const downloadReportPDF = () => {
    if (!finalResult) return;
    const sessionQuestions = finalResult.session?.questions || [];
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
      <title>Interview Report - ${targetRole}</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;padding:32px;max-width:850px;margin:0 auto;background:#fff;color:#1a1a2e}
        h1{color:#6366f1;font-size:26px;margin-bottom:4px}
        h2{color:#4f46e5;font-size:16px;margin:24px 0 10px;border-bottom:2px solid #e0e7ff;padding-bottom:6px}
        .meta{color:#6b7280;font-size:12px;margin-bottom:20px}
        .scores{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}
        .score-card{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:14px 18px;text-align:center;min-width:110px}
        .score-card .val{font-size:24px;font-weight:800;color:#6366f1}
        .score-card .lbl{font-size:11px;color:#6b7280;margin-top:2px}
        .q-card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:8px 0;page-break-inside:avoid}
        .q-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
        .q-badge{background:#6366f1;color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700}
        .q-score{font-weight:800;font-size:14px}
        .q-text{font-weight:600;font-size:13px;margin-bottom:6px}
        .q-feedback{font-size:12px;color:#374151;background:#eff6ff;padding:8px 10px;border-radius:6px}
        ul{padding-left:20px} li{font-size:13px;color:#4b5563;line-height:1.7}
        .footnote{color:#9ca3af;font-size:10px;margin-top:24px;text-align:center}
        @media print{body{padding:16px}.q-card{page-break-inside:avoid}}
      </style></head><body>
      <h1>📊 AI Interview Performance Report</h1>
      <div class="meta">
        <strong>Candidate Role:</strong> ${targetRole} &nbsp;|&nbsp;
        <strong>Type:</strong> ${interviewType} &nbsp;|&nbsp;
        <strong>Duration:</strong> ${formatTime(timer)} &nbsp;|&nbsp;
        <strong>Date:</strong> ${new Date().toLocaleDateString()}
      </div>

      <div class="scores">
        <div class="score-card"><div class="val">${finalResult.overallScore}%</div><div class="lbl">Overall Score</div></div>
        <div class="score-card"><div class="val">${finalResult.readinessScore || 0}%</div><div class="lbl">Role Readiness</div></div>
        <div class="score-card"><div class="val">${finalResult.integrityScore ?? 100}%</div><div class="lbl">Integrity Score</div></div>
        <div class="score-card"><div class="val">${finalResult.answeredCount || 0}/${finalResult.totalQuestions || 0}</div><div class="lbl">Questions Answered</div></div>
      </div>

      <h2>💪 Strengths</h2>
      <ul>${(finalResult.session?.strengths || []).map(s => `<li>${s}</li>`).join('') || '<li>Keep practicing to build up strengths.</li>'}</ul>

      <h2>📈 Areas to Improve</h2>
      <ul>${(finalResult.session?.improvements || []).map(s => `<li>${s}</li>`).join('') || '<li>Great job overall!</li>'}</ul>

      <h2>📝 Question-by-Question Breakdown</h2>
      ${sessionQuestions.map((q, i) => `
        <div class="q-card">
          <div class="q-header">
            <span class="q-badge">Q${i + 1}${q.isFollowUp ? ' · Follow-up' : ''}</span>
            <span class="q-score">${q.score || 0}/10</span>
          </div>
          <div class="q-text">${q.question}</div>
          ${q.aiFeedback ? `<div class="q-feedback">${q.aiFeedback}</div>` : ''}
        </div>
      `).join('')}

      <h2>🎯 Next Steps</h2>
      <ul>${(finalResult.report?.nextSteps || []).map(s => `<li>${s}</li>`).join('')}</ul>

      <p class="footnote">Integrity monitoring reflects only what your browser could observe (tab switches, window focus, camera/mic state) — it is not a claim of detecting phones or other devices. Generated by CareerIQ AI Platform.</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <DashboardLayout>
      <div className={`mx-auto space-y-6 transition-all ${step === 'interview' ? 'max-w-5xl' : 'max-w-4xl'}`}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">AI HR Interviewer</h1>
            <p className="text-white/50 text-sm">Live voice interview with adaptive questions & real-time evaluation</p>
          </div>
          {step === 'interview' && (
            <div className="ml-auto flex items-center gap-2">
              <button onClick={toggleVoice} title={voiceEnabled ? 'Mute AI voice' : 'Unmute AI voice'}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/20 transition-all">
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                <Clock className="w-4 h-4 text-accent-cyan" />
                <span className="text-white font-mono font-bold">{formatTime(remainingSeconds)}</span>
                <span className="text-white/30 text-xs">left</span>
              </div>
            </div>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* SETUP */}
          {step === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="glass-card p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/50 font-medium mb-1.5 block">Target Role</label>
                    <RoleSelect value={targetRole} onChange={(label) => { setTargetRole(label); setSkills([]); }} />
                  </div>
                  <div>
                    <label className="text-sm text-white/50 font-medium mb-1.5 block">Experience Level</label>
                    <div className="grid grid-cols-4 gap-2">
                      {EXPERIENCE_LEVELS.map(lvl => (
                        <button key={lvl.value} type="button" onClick={() => setExperienceLevel(lvl.value)}
                          className={`px-2 py-3 rounded-xl border text-center transition-all
                            ${experienceLevel === lvl.value ? 'border-primary-500/60 bg-primary-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white'}`}>
                          <p className="font-bold text-xs">{lvl.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/50 font-medium mb-1.5 block">Your Skills</label>
                  <SkillMultiSelect roleLabel={targetRole} value={skills} onChange={setSkills} />
                </div>

                <div>
                  <label className="text-sm text-white/50 font-medium mb-3 block">Interview Type</label>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {INTERVIEW_TYPES.map(type => (
                      <button key={type.id} onClick={() => setInterviewType(type.id)}
                        className={`p-4 rounded-xl border text-left transition-all
                          ${interviewType === type.id ? 'border-primary-500/60 bg-primary-500/15' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center mb-2`}>
                          <Mic className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-white font-semibold text-sm">{type.label}</p>
                        <p className="text-white/50 text-xs">{type.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/50 font-medium mb-2 block">Difficulty</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DIFFICULTY_OPTIONS.map(d => (
                        <button key={d.value} onClick={() => setDifficulty(d.value)}
                          className={`py-2.5 rounded-xl border text-center text-sm font-semibold transition-all
                            ${difficulty === d.value ? 'border-primary-500/60 bg-primary-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'}`}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-white/50 font-medium mb-2 block">Duration</label>
                    <div className="grid grid-cols-4 gap-2">
                      {DURATION_OPTIONS.map(d => (
                        <button key={d.value} onClick={() => setDuration(d.value)}
                          className={`py-2.5 rounded-xl border text-center text-sm font-semibold transition-all
                            ${duration === d.value ? 'border-primary-500/60 bg-primary-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'}`}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button onClick={goToReadiness} disabled={loading}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5" /> Continue to Readiness Check
                  </motion.button>
                  <button onClick={downloadPrepGuide}
                    className="btn-ghost flex items-center gap-2 px-4">
                    <Download className="w-4 h-4" /> Prep Guide PDF
                  </button>
                </div>
              </div>

              {/* Notes to study */}
              <div className="glass-card p-5 border border-accent-cyan/20">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent-cyan" /> Quick Study Notes
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                    <p className="text-accent-cyan font-semibold mb-1">STAR Method</p>
                    <p className="text-white/50 text-xs">Situation → Task → Action → Result. Use for all behavioral questions.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                    <p className="text-accent-green font-semibold mb-1">Body Language</p>
                    <p className="text-white/50 text-xs">Eye contact, upright posture, smile. Pause before answering.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                    <p className="text-accent-yellow font-semibold mb-1">Technical Tips</p>
                    <p className="text-white/50 text-xs">Think out loud. Clarify before solving. Start simple, then optimize.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                    <p className="text-accent-purple font-semibold mb-1">HR Tips</p>
                    <p className="text-white/50 text-xs">Research the company. Prepare 3 questions to ask. Follow up after.</p>
                  </div>
                </div>
              </div>

              {/* History */}
              <InterviewHistory />
            </motion.div>
          )}

          {/* READINESS CHECK */}
          {step === 'readiness' && (
            <motion.div key="readiness" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ReadinessCheck onReady={startInterview} onCancel={() => setStep('setup')} />
              {loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-white/50 text-sm">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating your personalized questions...
                </div>
              )}
            </motion.div>
          )}

          {/* INTERVIEW */}
          {step === 'interview' && questions.length > 0 && (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
              <div className="space-y-4">
                {/* Progress */}
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/50 text-sm">Question {currentQ + 1} of {questions.length}</span>
                    <span className="text-white/30 text-xs">~{Math.max(0, questions.length - currentQ - 1)} remaining</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-accent-purple rounded-full transition-all duration-500"
                      style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
                  </div>
                </div>

                {/* AI HR Avatar */}
                <HRAvatar state={avatarState} caption={avatarState === 'listening' && interim ? interim : caption} mouthOpen={mouthOpen} />

                {/* Current question / answer */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className={`text-xs capitalize px-2 py-0.5 rounded-full border
                      ${questions[currentQ]?.category === 'hr' ? 'text-cyan-neon bg-cyan-neon/10 border-cyan-neon/30' :
                        questions[currentQ]?.category === 'technical' ? 'text-purple-400 bg-purple-500/10 border-purple-500/30' :
                        'text-green-400 bg-green-500/10 border-green-500/30'}`}>
                      {questions[currentQ]?.category}
                    </span>
                    {questions[currentQ]?.isFollowUp && (
                      <span className="text-xs px-2 py-0.5 rounded-full border text-amber-300 bg-amber-500/10 border-amber-500/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Adaptive follow-up
                      </span>
                    )}
                    <span className="text-white/50 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {questions[currentQ]?.timeLimit}s suggested
                    </span>
                  </div>

                  <h2 className="text-white text-lg font-bold mb-3 leading-relaxed">
                    {questions[currentQ]?.question}
                  </h2>

                  {questions[currentQ]?.hint && (
                    <p className="text-white/50 text-xs italic mb-4">💡 Hint: {questions[currentQ].hint}</p>
                  )}

                  {speech.supported ? (
                    <>
                      {!reviewing ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`w-3 h-3 rounded-full ${speech.listening ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
                            <p className="text-white/70 text-sm font-medium">
                              {avatarState === 'speaking' ? "Listen — I'm still asking the question..." :
                               avatarState === 'thinking' ? 'Evaluating your answer...' :
                               speech.listening ? "I'm listening — go ahead and answer naturally." : 'Getting the mic ready...'}
                            </p>
                          </div>
                          <p className="text-white/50 text-sm min-h-[3rem] leading-relaxed">
                            {interim || answer || <span className="text-white/25 italic">Your words will appear here as you speak...</span>}
                          </p>
                          {avatarState === 'listening' && (
                            <button onClick={stopAndReview} disabled={!hasSpokenRef.current}
                              className="btn-primary mt-4 flex items-center gap-2 disabled:opacity-40">
                              <CheckCircle className="w-4 h-4" /> I'm Done Answering
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-5 mb-4">
                          <p className="text-primary-300 text-xs font-semibold mb-2 uppercase tracking-wide">Here's what I heard:</p>
                          <p className="text-white text-sm leading-relaxed mb-4">{answer || <span className="text-white/40 italic">No speech was captured.</span>}</p>
                          <div className="flex gap-2">
                            <button onClick={submitAnswer} disabled={evaluating || !answer.trim()}
                              className="btn-primary flex-1 flex items-center justify-center gap-2">
                              <Send className="w-4 h-4" /> Submit This Answer
                            </button>
                            <button onClick={reRecord} className="btn-ghost flex items-center gap-2">
                              <RotateCcw className="w-4 h-4" /> Re-record
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`relative ${(interviewType === 'coding' || questions[currentQ]?.category === 'technical') ? 'font-mono' : ''}`}>
                      <p className="text-amber-400/80 text-xs mb-2">Voice recognition isn't supported in this browser, so you can type your answer instead — try Chrome or Edge for the full voice interview.</p>
                      <textarea
                        ref={textareaRef}
                        value={answer}
                        disabled={avatarState === 'speaking' || avatarState === 'thinking'}
                        onChange={e => setAnswer(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Tab' && (interviewType === 'coding')) { e.preventDefault(); const t = e.target; const s = t.selectionStart; setAnswer(answer.slice(0, s) + '  ' + answer.slice(t.selectionEnd)); } }}
                        placeholder={interviewType === 'coding' ? '// Write your solution here...' : 'Type your answer here...'}
                        rows={interviewType === 'coding' ? 9 : 5}
                        className={`input-field resize-none w-full mb-4 disabled:opacity-50 ${(interviewType === 'coding' || questions[currentQ]?.category === 'technical') ? 'text-sm leading-relaxed' : ''}`}
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    {(!speech.supported || reviewing) && (
                      <motion.button onClick={submitAnswer} disabled={evaluating || !answer.trim() || avatarState === 'speaking' || (speech.supported && !reviewing)}
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        className="btn-primary flex items-center gap-2">
                        {evaluating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                        {evaluating ? 'Evaluating...' : 'Submit Answer'}
                      </motion.button>
                    )}
                    <button onClick={nextQuestion} className="btn-ghost flex items-center gap-2">
                      {currentQ < questions.length - 1 ? 'Skip' : 'Finish'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={cancelInterview} className="btn-ghost ml-auto text-red-400/70 hover:text-red-400 flex items-center gap-2">
                      Cancel Interview
                    </button>
                  </div>
                  <p className="text-white/30 text-xs mt-3">
                    Your score and feedback for each question are saved and revealed together in your final report — just like a real interview.
                  </p>
                </div>
              </div>

              {/* Live sidebar */}
              <div className="space-y-3 lg:sticky lg:top-4">
                <div className="glass-card p-3 overflow-hidden">
                  <div className="rounded-lg overflow-hidden bg-black/60 aspect-video mb-2 relative">
                    <video ref={monitor.videoRef} muted playsInline className="w-full h-full object-cover" />
                    {monitor.camStatus !== 'active' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/80">
                        <VideoOff className="w-5 h-5 text-white/40" />
                        <span className="text-white/40 text-[11px]">Camera {monitor.camStatus === 'checking' ? 'connecting...' : 'off'}</span>
                      </div>
                    )}
                    {monitor.camStatus === 'active' && (
                      <span className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded bg-red-500/80 text-white font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> REC
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-white/60">
                      <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" /> Connection</span>
                      <span className={readinessResult?.connectionQuality === 'Poor' ? 'text-amber-400' : 'text-green-400'}>{readinessResult?.connectionQuality || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/60">
                      <span className="flex items-center gap-1.5">{monitor.micStatus === 'active' ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />} Microphone</span>
                      <span className={monitor.micStatus === 'active' ? 'text-green-400' : 'text-amber-400'}>{monitor.micStatus === 'active' ? 'Live' : 'Muted'}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/60">
                      <span className="flex items-center gap-1.5">{monitor.camStatus === 'active' ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />} Camera</span>
                      <span className={monitor.camStatus === 'active' ? 'text-green-400' : 'text-amber-400'}>{monitor.camStatus === 'active' ? 'Live' : 'Off'}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/60">
                      <span className="flex items-center gap-1.5"><ScanFace className="w-3.5 h-3.5" /> Face check</span>
                      <span className={
                        monitor.faceDetect.supported !== true ? 'text-white/30' :
                        monitor.faceDetect.faceCount === 1 ? 'text-green-400' : 'text-amber-400'
                      }>
                        {monitor.faceDetect.supported !== true ? 'Unavailable' :
                         monitor.faceDetect.faceCount === 1 ? '1 face' :
                         monitor.faceDetect.faceCount === 0 ? 'None' :
                         monitor.faceDetect.faceCount > 1 ? `${monitor.faceDetect.faceCount} faces` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-white/60">
                      <span className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Mobile check</span>
                      <span className={
                        monitor.faceDetect.supported !== true ? 'text-white/30' :
                        monitor.faceDetect.mobileDetected ? 'text-red-400 font-bold animate-pulse' : 'text-green-400'
                      }>
                        {monitor.faceDetect.supported !== true ? 'Unavailable' :
                         monitor.faceDetect.mobileDetected ? 'Detected' : 'No Phone'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-white/60">
                      <span className="flex items-center gap-1.5">{monitor.estimatedScore >= 80 ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />} Integrity</span>
                      <span className={monitor.estimatedScore >= 80 ? 'text-green-400' : 'text-amber-400'}>{monitor.estimatedScore}%</span>
                    </div>
                  </div>
                </div>
                <div className="glass-card p-3 text-xs text-white/40">
                  Please stay on this tab and keep your camera/mic on — switching away, covering the camera, or stepping out of frame is logged for your integrity report (not a claim of detecting other devices).
                </div>
              </div>
            </motion.div>
          )}

          {/* RESULTS */}
          {step === 'result' && finalResult && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
              {flagged && (
                <div className="glass-card p-5 border-2 border-red-500/50 bg-red-500/10 flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 font-bold">Interview ended early — integrity check failed</p>
                    <p className="text-red-200/70 text-sm mt-1">
                      {monitor.events.some(e => e.type === 'mobile_detected')
                        ? 'This session was stopped automatically because a mobile phone was detected in the camera feed. Use of external devices is strictly prohibited.'
                        : 'This session was stopped automatically after repeated issues your browser could observe (more than one face in frame, or the camera going off/dark). Results below reflect only what was completed before that point.'
                      }
                    </p>
                  </div>
                </div>
              )}
              {/* Score Card */}
              <div className="glass-card p-8 text-center">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-500/30 to-accent-purple/20 border-2 border-primary-500/40 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl font-black text-white">{finalResult.overallScore}%</span>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">
                  {flagged ? '⚠️ Interview Ended Early' :
                   finalResult.overallScore >= 80 ? '🎉 Excellent Performance!' :
                   finalResult.overallScore >= 65 ? '👍 Good Effort!' :
                   finalResult.overallScore >= 50 ? '💪 Decent Attempt!' : '📚 Keep Practicing!'}
                </h2>
                <p className="text-white/50 mb-2">Interview completed in {formatTime(timer)}</p>
                {finalResult.performanceLevel && (
                  <span className={`text-sm px-3 py-1 rounded-full border font-semibold ${
                    finalResult.performanceLevel === 'Excellent' ? 'text-green-400 border-green-500/40 bg-green-500/10' :
                    finalResult.performanceLevel === 'Good' ? 'text-cyan-neon border-cyan-neon/40 bg-cyan-neon/10' :
                    finalResult.performanceLevel === 'Average' ? 'text-pink-neon border-pink-neon/40 bg-pink-neon/10' :
                    'text-red-400 border-red-500/40 bg-red-500/10'
                  }`}>
                    {finalResult.performanceLevel}
                  </span>
                )}
              </div>

              {/* Performance Report */}
              {finalResult.report && (
                <div className="glass-card p-6 border-l-4 border-primary-500">
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-pink-neon" /> Performance Report
                  </h3>
                  <p className="text-white/50 text-sm mb-4">{finalResult.report.summary}</p>

                  <div className="grid sm:grid-cols-3 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/8 text-center">
                      <div className="text-2xl font-black text-primary-400">{finalResult.answeredCount || 0}/{finalResult.totalQuestions || 0}</div>
                      <div className="text-xs text-white/50">Questions Answered</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/8 text-center">
                      <div className={`text-2xl font-black ${finalResult.readinessScore >= 70 ? 'text-green-400' : 'text-pink-neon'}`}>{finalResult.readinessScore || 0}%</div>
                      <div className="text-xs text-white/50">Interview Readiness</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/8 text-center">
                      <div className={`text-2xl font-black ${(finalResult.integrityScore ?? 100) >= 80 ? 'text-green-400' : 'text-amber-400'}`}>{finalResult.integrityScore ?? 100}%</div>
                      <div className="text-xs text-white/50">Integrity Score</div>
                    </div>
                  </div>

                  {finalResult.integrityEvents?.length > 0 && (
                    <p className="text-white/30 text-xs mb-3">
                      {finalResult.integrityEvents.length} browser-observed event{finalResult.integrityEvents.length > 1 ? 's' : ''} logged during this session (tab switches, camera/mic state) — this is not a claim of detecting other devices.
                    </p>
                  )}

                  {finalResult.report.nextSteps?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/50 font-semibold mb-2">Next Steps:</p>
                      {finalResult.report.nextSteps.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-white/50 mb-1">
                          <span className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 text-xs flex items-center justify-center font-bold flex-shrink-0">{i+1}</span>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Strengths & Improvements */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <h3 className="text-green-400 font-bold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Strengths
                  </h3>
                  {finalResult.session?.strengths?.length > 0 ? finalResult.session.strengths.map((s, i) => (
                    <p key={i} className="text-white/50 text-sm mb-1.5 flex items-start gap-2">
                      <span className="text-green-400 flex-shrink-0">•</span> {s}
                    </p>
                  )) : <p className="text-white/50 text-sm">Keep practicing to identify strengths.</p>}
                </div>
                <div className="glass-card p-5">
                  <h3 className="text-pink-neon font-bold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Areas to Improve
                  </h3>
                  {finalResult.session?.improvements?.length > 0 ? finalResult.session.improvements.map((s, i) => (
                    <p key={i} className="text-white/50 text-sm mb-1.5 flex items-start gap-2">
                      <span className="text-pink-neon flex-shrink-0">•</span> {s}
                    </p>
                  )) : <p className="text-white/50 text-sm">Great job! Focus on depth in answers.</p>}
                </div>
              </div>

              {/* Learning Resources */}
              <div className="glass-card p-5 border border-accent-cyan/20">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent-cyan" /> Recommended Resources
                </h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    { name: 'LeetCode Practice', url: 'https://leetcode.com/problemset/', desc: 'Technical interview prep' },
                    { name: 'STAR Method Guide', url: 'https://www.themuse.com/advice/star-interview-method', desc: 'Behavioral questions' },
                    { name: 'Pramp Mock Interviews', url: 'https://www.pramp.com/', desc: 'Free mock interviews' },
                    { name: 'Interview Cake', url: 'https://www.interviewcake.com/', desc: 'Structured interview prep' },
                  ].map(r => (
                    <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/8 hover:border-primary-500/30 transition-all group">
                      <div className="w-7 h-7 rounded-lg bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                        <ExternalLink className="w-3 h-3 text-accent-cyan" />
                      </div>
                      <div>
                        <p className="text-white text-xs font-medium group-hover:text-primary-300">{r.name}</p>
                        <p className="text-white/50 text-xs">{r.desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={downloadReportPDF} className="btn-ghost flex-1 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download Report PDF
                </button>
                <button onClick={() => { setStep('setup'); setCurrentQ(0); setAnswer(''); setEvaluation(null); setTimer(0); setFinalResult(null); setReadinessResult(null); setAvatarState('idle'); setCaption(''); setInterim(''); setFollowUpCount(0); setFlagged(false); setReviewing(false); }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Practice Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

function InterviewHistory() {
  const [history, setHistory] = useState([]);
  useEffect(() => {
    api.get('/career/interview/history').then(r => setHistory(r.data.sessions || [])).catch(() => {});
  }, []);

  if (!history.length) return null;

  return (
    <div className="glass-card p-5">
      <h3 className="text-white font-bold mb-4">Recent Interviews</h3>
      <div className="space-y-3">
        {history.slice(0, 3).map(s => (
          <div key={s._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div>
              <p className="text-white text-sm font-medium">{s.targetRole}</p>
              <p className="text-white/50 text-xs capitalize">{s.type} • {new Date(s.createdAt).toLocaleDateString()}</p>
            </div>
            <div className={`text-lg font-black ${s.overallScore >= 70 ? 'text-green-400' : s.overallScore >= 50 ? 'text-pink-neon' : 'text-red-400'}`}>
              {s.overallScore}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
