/** @type {import('tailwindcss').Config} */

// Every colour points at a CSS variable defined once in src/index.css
// (PERSONAL_OS_BRAND.md section 2). `colors` replaces Tailwind's default
// palette outright, so a stray `bg-red-500` or `text-gray-400` simply doesn't
// exist — the brand set is the only set.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: 'var(--white)',
      'green-900': 'var(--green-900)',
      'green-700': 'var(--green-700)',
      'green-500': 'var(--green-500)',
      'green-300': 'var(--green-300)',
      'green-100': 'var(--green-100)',
      amber: 'var(--amber)',
      'amber-tint': 'var(--amber-tint)',
      'amber-edge': 'var(--amber-edge)',
      'amber-text': 'var(--amber-text)',
      stone: 'var(--stone)',
      paper: 'var(--paper)',
      ink: 'var(--ink)',
      muted: 'var(--muted)',
      hint: 'var(--hint)',
      hairline: 'var(--hairline)',
      'hairline-warm': 'var(--hairline-warm)',
      scrim: 'var(--scrim)',
    },
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(13, 31, 24, 0.08), 0 1px 2px rgba(13, 31, 24, 0.04)',
      },
      letterSpacing: {
        micro: '0.06em',
      },
    },
  },
  plugins: [],
}
