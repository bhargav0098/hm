/** @type {import('tailwindcss').Config} */
/*
  CareerIQ design tokens
  ──────────────────────────────────────────────
  Palette (from the brand sheet)
    Primary    #5B21B6   deep violet   → primary-500 / DEFAULT
    Accent     #8B5CF6   bright violet → primary-400 / accent
    Secondary  #C7B3FF   lilac         → primary-300 / lilac
    Surface    #EDE9FE   mist          → primary-100 / surface
    Background #FAF9FF   canvas        → primary-50  / canvas
  `ink` is the only derived colour: a violet-black so body copy stays readable.
*/
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas:  '#FAF9FF',
        surface: '#EDE9FE',
        lilac:   '#C7B3FF',
        ink: { DEFAULT: '#1E1042', soft: '#4A3B78', mute: '#6B5C96' },

        primary: {
          DEFAULT: '#5B21B6',
          50: '#FAF9FF', 100: '#EDE9FE', 200: '#DDD3FF', 300: '#C7B3FF',
          400: '#8B5CF6', 500: '#5B21B6', 600: '#4C1B9A', 700: '#3F1680',
          800: '#2E1065', 900: '#1E1042'
        },

        /* Legacy aliases — every old class name now resolves into the violet family,
           except status colours (green / amber / red) which keep their meaning. */
        accent: {
          DEFAULT: '#8B5CF6',
          purple: '#8B5CF6', violet: '#7C3AED',
          cyan:   '#6D28D9', blue:   '#7C3AED', pink: '#9333EA',
          green:  '#0B8A5F', yellow: '#B7791F', red:  '#DC2626',
          emerald:'#0B8A5F', white:  '#FFFFFF'
        },
        purple:  { neon: '#7C3AED', bright: '#8B5CF6', dim: 'rgba(139,92,246,0.15)' },
        violet:  { neon: '#8B5CF6', bright: '#A78BFA', dim: 'rgba(139,92,246,0.15)' },
        pink:    { neon: '#9333EA', bright: '#A855F7', dim: 'rgba(147,51,234,0.12)' },
        cyan:    { neon: '#6D28D9', bright: '#7C3AED', dim: 'rgba(109,40,217,0.12)' },
        emerald: { neon: '#0B8A5F', bright: '#10B981', dim: 'rgba(11,138,95,0.12)' }
      },

      fontFamily: {
        sans:    ['"Figtree Variable"', 'Figtree', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', '"Bricolage Grotesque"', '"Figtree Variable"', 'system-ui', 'sans-serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },

      borderRadius: { pill: '999px', '4xl': '2rem', '5xl': '2.5rem' },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-neon':   'linear-gradient(135deg, #5B21B6 0%, #8B5CF6 100%)',
        'gradient-neon-r': 'linear-gradient(135deg, #8B5CF6 0%, #C7B3FF 100%)',
        'gradient-mesh':   'linear-gradient(135deg, #5B21B6 0%, #8B5CF6 100%)',
        'glass':           'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(237,233,254,0.5))',
        'pill-primary':    'linear-gradient(180deg, #7437D1 0%, #5B21B6 55%, #4C1B9A 100%)',
        'pill-accent':     'linear-gradient(180deg, #A07BFA 0%, #8B5CF6 60%, #7B4AE8 100%)',
        'pill-secondary':  'linear-gradient(180deg, #D8CAFF 0%, #C7B3FF 60%, #BBA2FB 100%)',
        'pill-surface':    'linear-gradient(180deg, #F5F2FF 0%, #EDE9FE 100%)'
      },

      /* Violet-tinted shadows: depth without a grey cast */
      boxShadow: {
        soft:      '0 1px 0 rgba(255,255,255,0.95) inset, 0 10px 28px -10px rgba(91,33,182,0.20), 0 2px 6px rgba(91,33,182,0.06)',
        'soft-lg': '0 1px 0 rgba(255,255,255,0.95) inset, 0 24px 56px -18px rgba(91,33,182,0.28), 0 4px 12px rgba(91,33,182,0.07)',
        pill:      '0 22px 40px -16px rgba(91,33,182,0.55), 0 1px 0 rgba(255,255,255,0.45) inset, 0 -10px 18px rgba(46,16,101,0.18) inset',
        'pill-light': '0 18px 34px -16px rgba(91,33,182,0.30), 0 1px 0 rgba(255,255,255,0.95) inset, 0 -8px 14px rgba(139,92,246,0.10) inset',
        glow:      '0 12px 32px -8px rgba(139,92,246,0.55)',
        'neon-purple': '0 12px 32px -8px rgba(139,92,246,0.45)',
        'neon-pink':   '0 12px 32px -8px rgba(147,51,234,0.35)',
        'neon-cyan':   '0 12px 32px -8px rgba(109,40,217,0.35)',
        glass:     '0 1px 0 rgba(255,255,255,0.95) inset, 0 10px 28px -10px rgba(91,33,182,0.18)',
        'glass-lg':'0 1px 0 rgba(255,255,255,0.95) inset, 0 24px 56px -18px rgba(91,33,182,0.26)'
      },

      animation: {
        float:           'float 6s ease-in-out infinite',
        'float-reverse': 'floatReverse 7s ease-in-out infinite',
        'pulse-slow':    'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up':      'slideUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in':       'fadeIn 0.3s ease-out',
        shimmer:         'shimmer 1.8s linear infinite',
        'spin-slow':     'spin 8s linear infinite',
        gradient:        'gradientShift 6s ease infinite',
        'page-enter':    'pageEnter 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'drift':         'drift 14s ease-in-out infinite',
        'breathe':       'breathe 5s ease-in-out infinite'
      },
      keyframes: {
        float:         { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        floatReverse:  { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(8px)' } },
        slideUp:       { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:        { from: { opacity: 0 }, to: { opacity: 1 } },
        shimmer:       { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        gradientShift: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        pageEnter:     { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        drift:         { '0%,100%': { transform: 'translate3d(0,0,0)' }, '50%': { transform: 'translate3d(24px,-18px,0)' } },
        breathe:       { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } }
      },
      backdropBlur: { xs: '4px', xl: '32px', '2xl': '48px' }
    }
  },
  plugins: []
};
