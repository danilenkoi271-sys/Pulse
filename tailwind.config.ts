import type { Config } from 'tailwindcss'

/**
 * Pulse design tokens. Warm blacks + bone text, one brand colour (lime "signal").
 * Up / down are semantic only and never used for branding.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    borderRadius: { none: '0', sm: '2px', DEFAULT: '0', md: '3px', full: '9999px' },
    extend: {
      colors: {
        void: '#0a0a08',
        base: '#0e0d0b',
        plate: '#121110',
        raise: '#1a1815',
        line: '#2a2721',
        line2: '#3b372d',
        dim: '#6b6657',
        mute: '#9b9585',
        text: '#e9e3d3',
        bone: '#f5f0e2',
        lime: { DEFAULT: '#d6ff3d', dim: '#aacc2f' },
        up: '#35d6a4',
        down: '#ff5a52',
        warn: '#ffb02e',
      },
      fontFamily: {
        display: ['"Anybody Variable"', 'Impact', 'sans-serif'],
        sans: ['"Instrument Sans Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: { caps: '0.14em' },
      keyframes: {
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.25' } },
        sweep: { '0%': { transform: 'translateX(-10%)' }, '100%': { transform: 'translateX(110%)' } },
        draw: { to: { strokeDashoffset: '0' } },
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        flashUp: { '0%': { color: '#35d6a4', backgroundColor: 'rgba(53,214,164,.16)' }, '100%': {} },
        flashDown: { '0%': { color: '#ff5a52', backgroundColor: 'rgba(255,90,82,.16)' }, '100%': {} },
      },
      animation: {
        marquee: 'marquee 70s linear infinite',
        blink: 'blink 1.6s ease-in-out infinite',
        sweep: 'sweep 5s linear infinite',
        draw: 'draw 2.4s cubic-bezier(.3,.7,.2,1) forwards',
        rise: 'rise .5s cubic-bezier(.2,.7,.2,1) both',
        flashUp: 'flashUp .7s ease-out',
        flashDown: 'flashDown .7s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config
