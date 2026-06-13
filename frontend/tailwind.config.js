/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Space-Black Backgrounds ── */
        space:  { black: '#050505', deep: '#080808', card: '#0A0A0F', border: '#141420' },
        /* ── Core Neon Palette ── */
        purple:  { neon: '#8B5CF6', bright: '#A855F7', dim: 'rgba(139,92,246,0.15)' },
        violet:  { neon: '#A855F7', bright: '#C084FC', dim: 'rgba(168,85,247,0.15)' },
        pink:    { neon: '#EC4899', bright: '#F472B6', dim: 'rgba(236,72,153,0.15)' },
        cyan:    { neon: '#22D3EE', bright: '#67E8F9', dim: 'rgba(34,211,238,0.12)' },
        emerald: { neon: '#10B981', bright: '#34D399', dim: 'rgba(16,185,129,0.12)' },
        /* ── Aliases for existing classnames to seamlessly transition ── */
        primary: {
          50: '#f0f0ff', 100: '#e0e0ff',
          400: '#A855F7', 500: '#8B5CF6', 600: '#7C3AED',
          700: '#6D28D9', 900: '#4C1D95'
        },
        accent: {
          purple: '#8B5CF6', violet: '#A855F7',
          cyan:   '#22D3EE', pink:   '#EC4899',
          emerald:'#10B981', white:  '#FFFFFF',
          blue:   '#22D3EE', green:  '#10B981',
          yellow: '#EC4899', red:    '#EC4899'
        },
        dark: { 900: '#050505', 800: '#080808', 700: '#0A0A0F', 600: '#0F0F18', 500: '#1e1e4a', 400: '#2a2a5e', 300: '#3a3a7e' },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Clash Display', 'Plus Jakarta Sans', 'sans-serif']
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'gradient-neon':    'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)',
        'gradient-neon-r':  'linear-gradient(135deg, #22D3EE 0%, #10B981 100%)',
        'gradient-mesh':    'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
        'glass-surface':    'linear-gradient(135deg, rgba(5,5,5,0.75) 0%, rgba(8,8,8,0.55) 100%)',
        'glass':            'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
      },
      animation: {
        'float':         'float 6s ease-in-out infinite',
        'float-reverse': 'floatReverse 7s ease-in-out infinite',
        'pulse-slow':    'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up':      'slideUp 0.4s ease-out',
        'fade-in':       'fadeIn 0.3s ease-out',
        'shimmer':       'shimmer 1.8s linear infinite',
        'spin-slow':     'spin 8s linear infinite',
        'gradient':      'gradientShift 4s ease infinite',
        'scan':          'scanLine 3s ease-in-out infinite',
        'circuit':       'circuitPulse 2s ease-in-out infinite',
        'wave':          'wave 1s ease-in-out infinite',
        'border-glow':   'borderGlow 3s ease-in-out infinite',
        'page-enter':    'pageEnter 0.4s cubic-bezier(0.4,0,0.2,1) both',
      },
      keyframes: {
        float:          { '0%,100%': { transform: 'translateY(0px)' },            '50%': { transform: 'translateY(-14px)' } },
        floatReverse:   { '0%,100%': { transform: 'translateY(0px) rotate(0deg)' },'50%': { transform: 'translateY(12px) rotate(3deg)' } },
        slideUp:        { from: { opacity: 0, transform: 'translateY(16px)' },    to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:         { from: { opacity: 0 },                                   to: { opacity: 1 } },
        shimmer:        { '0%': { backgroundPosition: '200% 0' },                 '100%': { backgroundPosition: '-200% 0' } },
        gradientShift:  { '0%,100%': { backgroundPosition: '0% 50%' },            '50%': { backgroundPosition: '100% 50%' } },
        scanLine:       { '0%': { transform: 'translateY(-100%)', opacity: 0 },   '10%,90%': { opacity: 0.8 }, '100%': { transform: 'translateY(500%)', opacity: 0 } },
        wave:           { '0%,100%': { transform: 'scaleY(0.4)' },                '50%': { transform: 'scaleY(1)' } },
        circuitPulse:   { '0%,100%': { opacity: 0.3 },                            '50%': { opacity: 1 } },
        pageEnter:      { from: { opacity: 0, transform: 'translateY(18px) scale(0.99)' }, to: { opacity: 1, transform: 'translateY(0) scale(1)' } },
        borderGlow:     { '0%,100%': { borderColor: 'rgba(139,92,246,0.4)' },     '50%': { borderColor: 'rgba(236,72,153,0.6)' } },
        pulseGlow:      { '0%,100%': { boxShadow: '0 0 15px rgba(139,92,246,0.3)' }, '50%': { boxShadow: '0 0 35px rgba(139,92,246,0.7)' } },
      },
      boxShadow: {
        'neon-purple': '0 0 25px rgba(139,92,246,0.5), 0 0 50px rgba(139,92,246,0.2)',
        'neon-pink':   '0 0 25px rgba(236,72,153,0.5), 0 0 50px rgba(236,72,153,0.2)',
        'neon-cyan':   '0 0 25px rgba(34,211,238,0.5), 0 0 50px rgba(34,211,238,0.2)',
        'glass':       '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-lg':    '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backdropBlur: { xs: '4px', xl: '32px', '2xl': '48px' },
    }
  },
  plugins: []
}
