import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#06080c', 900: '#0a0d13', 850: '#0e121a', 800: '#131824', 700: '#1b2130',
          600: '#262e41', 500: '#3a455f', 400: '#5a6580', 300: '#8591ab', 200: '#b4bdd0', 100: '#dde2ee',
        },
        pulse: { 300: '#b3a6ff', 400: '#9a87ff', 500: '#7c5cff', 600: '#6844f0', 700: '#5533c9' },
        ion: '#4dd6ff',
        up: '#1fd8a0',
        down: '#ff5470',
        warn: '#ffb547',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,92,255,.35), 0 8px 40px -8px rgba(124,92,255,.45)',
      },
      keyframes: {
        flashUp: { '0%': { backgroundColor: 'rgba(31,216,160,.25)' }, '100%': { backgroundColor: 'transparent' } },
        flashDown: { '0%': { backgroundColor: 'rgba(255,84,112,.25)' }, '100%': { backgroundColor: 'transparent' } },
        drift: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        beat: { '0%,100%': { opacity: '.5' }, '50%': { opacity: '1' } },
      },
      animation: {
        flashUp: 'flashUp .6s ease-out', flashDown: 'flashDown .6s ease-out',
        drift: 'drift 7s ease-in-out infinite', beat: 'beat 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
