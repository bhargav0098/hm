import { useEffect, useState, useRef } from 'react';
import { Mic, Loader2 } from 'lucide-react';

/**
 * A deliberately stylized, abstract avatar rather than a photorealistic
 * face — this keeps it lightweight (pure SVG + CSS), avoids any uncanny-valley
 * or likeness concerns, and fits the product's existing visual language.
 * `mouthOpen` is toggled from outside (driven by TTS word-boundary events)
 * to give a lightweight approximation of lip-sync, not frame-accurate
 * phoneme matching.
 */
export default function HRAvatar({ state = 'idle', caption = '', mouthOpen = false }) {
  const headAnim = state === 'speaking' ? 'avatar-head-speaking' : state === 'thinking' ? 'avatar-head-thinking' : 'avatar-head-idle';

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10">
      {/* "Office" backdrop — soft studio-style gradient, not a stock photo */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1b1430] via-[#221a3a] to-[#140f24]">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute bottom-8 right-8 w-48 h-48 rounded-full bg-accent-cyan/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center py-10 px-6 min-h-[280px]">
        <div className={`relative ${headAnim}`}>
          {/* Listening pulse ring */}
          {state === 'listening' && (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-accent-cyan/50 avatar-listen-ring" />
              <span className="absolute -inset-3 rounded-full border border-accent-cyan/30 avatar-listen-ring" style={{ animationDelay: '0.4s' }} />
            </>
          )}

          <svg width="132" height="132" viewBox="0 0 132 132" className="drop-shadow-[0_8px_30px_rgba(139,92,246,0.35)]">
            <defs>
              <linearGradient id="avatarHead" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <linearGradient id="avatarCollar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#312e81" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </linearGradient>
            </defs>

            {/* Shoulders / professional collar */}
            <path d="M20 128 Q66 96 112 128 L112 132 L20 132 Z" fill="url(#avatarCollar)" />
            <path d="M50 112 L66 122 L82 112 L82 100 L50 100 Z" fill="#e9d5ff" opacity="0.9" />

            {/* Head */}
            <circle cx="66" cy="62" r="46" fill="url(#avatarHead)" />
            <circle cx="66" cy="62" r="46" fill="black" opacity="0.05" />

            {/* Hair silhouette */}
            <path d="M22 55 Q22 16 66 16 Q110 16 110 55 Q98 40 66 40 Q34 40 22 55 Z" fill="#1e1b4b" opacity="0.85" />

            {/* Eyes */}
            <ellipse className="avatar-eye eye-1" cx="50" cy="60" rx="5.5" ry="7" fill="#0f172a" />
            <ellipse className="avatar-eye eye-2" cx="82" cy="60" rx="5.5" ry="7" fill="#0f172a" />

            {/* Eyebrows — subtle friendly arch */}
            <path d="M42 48 Q50 43 58 48" stroke="#1e1b4b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M74 48 Q82 43 90 48" stroke="#1e1b4b" strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* Mouth — morphs between a closed friendly smile and an open speaking shape */}
            {mouthOpen ? (
              <ellipse cx="66" cy="84" rx="10" ry="7" fill="#0f172a" />
            ) : (
              <path d="M52 82 Q66 92 80 82" stroke="#0f172a" strokeWidth="3" fill="none" strokeLinecap="round" />
            )}
          </svg>

          {state === 'listening' && (
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent-cyan flex items-center justify-center border-2 border-[#1b1430]">
              <Mic className="w-3.5 h-3.5 text-[#1b1430]" />
            </span>
          )}
          {state === 'thinking' && (
            <span className="absolute -bottom-1 -right-1 flex items-center gap-0.5 px-2 py-1.5 rounded-full bg-white/10 border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-white avatar-think-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-white avatar-think-dot" style={{ animationDelay: '0.15s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white avatar-think-dot" style={{ animationDelay: '0.3s' }} />
            </span>
          )}
        </div>

        <p className="mt-4 text-xs uppercase tracking-wider text-white/30 font-semibold">
          {state === 'speaking' ? 'Speaking' : state === 'listening' ? 'Listening' : state === 'thinking' ? 'Thinking' : 'AI HR Interviewer'}
        </p>

        {caption && (
          <div className="mt-3 max-w-md text-center">
            <p className="text-white/80 text-sm leading-relaxed">{caption}</p>
          </div>
        )}
      </div>
    </div>
  );
}
