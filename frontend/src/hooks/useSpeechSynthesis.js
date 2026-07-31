import { useRef, useState, useCallback, useEffect } from 'react';

const PREFERRED_VOICE_NAMES = [
  'Google UK English Female', 'Google US English', 'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)', 'Samantha', 'Karen'
];

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  for (const name of PREFERRED_VOICE_NAMES) {
    const v = voices.find(v => v.name === name);
    if (v) return v;
  }
  return voices.find(v => v.lang?.startsWith('en') && /female|aria|jenny|samantha|zira/i.test(v.name))
    || voices.find(v => v.lang?.startsWith('en'))
    || voices[0]
    || null;
}

/**
 * Text-to-speech for the AI HR avatar. Speaks a queue of lines sequentially
 * so a full greeting + question reads naturally with brief pauses, and fires
 * onWord callbacks (via SpeechSynthesisUtterance boundary events, where the
 * browser supports them) so the avatar's mouth can move roughly in time with
 * the words being spoken.
 */
export function useSpeechSynthesis() {
  const [supported] = useState(typeof window !== 'undefined' && !!window.speechSynthesis);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef(null);
  const queueRef = useRef([]);
  const onWordRef = useRef(null);
  const onDoneRef = useRef(null);

  useEffect(() => {
    if (!supported) return;
    const setVoice = () => { voiceRef.current = pickVoice(); };
    setVoice();
    window.speechSynthesis.onvoiceschanged = setVoice;
  }, [supported]);

  const speakNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      setSpeaking(false);
      onDoneRef.current?.();
      return;
    }
    const line = queueRef.current.shift();
    const utter = new SpeechSynthesisUtterance(line);
    utter.rate = 0.98;
    utter.pitch = 1.0;
    utter.volume = 1;
    if (voiceRef.current) utter.voice = voiceRef.current;
    utter.onboundary = () => onWordRef.current?.();
    utter.onend = () => speakNext();
    utter.onerror = () => speakNext();
    window.speechSynthesis.speak(utter);
  }, []);

  const speak = useCallback((text, { onWord, onDone } = {}) => {
    if (!supported || !text) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    onWordRef.current = onWord || null;
    onDoneRef.current = onDone || null;
    // Split into sentences for more natural pacing/pauses.
    queueRef.current = String(text).split(/(?<=[.?!])\s+/).filter(Boolean);
    setSpeaking(true);
    speakNext();
  }, [speakNext, supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    queueRef.current = [];
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, stop };
}
