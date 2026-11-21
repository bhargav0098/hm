import React from 'react';
import { Link } from 'react-router-dom';

/** Three stacked capsules: the palette sheet, shrunk to a mark. */
export function LogoMark({ size = 36, className = '' }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7437D1" /><stop offset="1" stopColor="#5B21B6" /></linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#A07BFA" /><stop offset="1" stopColor="#8B5CF6" /></linearGradient>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D8CAFF" /><stop offset="1" stopColor="#C7B3FF" /></linearGradient>
      </defs>
      <rect x="9" y="26" width="28" height="11" rx="5.5" fill={`url(#${id}c)`} />
      <rect x="3" y="15" width="34" height="12" rx="6" fill={`url(#${id}b)`} />
      <rect x="3" y="3" width="30" height="13" rx="6.5" fill={`url(#${id}a)`} />
      <rect x="6" y="5" width="22" height="2" rx="1" fill="#fff" opacity=".28" />
    </svg>
  );
}

export default function Brand({ to = '/', size = 34, subtitle, className = '', onClick, light = false }) {
  return (
    <Link to={to} onClick={onClick} className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="leading-none">
        <span className={`block font-display font-bold text-[1.15rem] tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
          CareerIQ<span className={light ? 'text-primary-300' : 'text-primary-400'}> AI</span>
        </span>
        {subtitle && <span className={`block text-xs mt-1 ${light ? 'text-white/70' : 'text-ink-mute'}`}>{subtitle}</span>}
      </span>
    </Link>
  );
}
