/** @type {import('tailwindcss').Config} */

// Every colour points at a CSS variable defined once in src/index.css
// (PERSONAL_OS_BRAND.md section 2). `colors` and `fontSize` replace Tailwind's
// defaults outright, so a stray `bg-red-500` or `text-sm` simply doesn't exist:
// the brand set and the type ladder (section 3) are the only sets.
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
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    },
    // The type ladder. Roles that always carry a weight (and tracking) bake it
    // in; Body, Label and Input are size only, so reading text stays 400.
    fontSize: {
      display: ['30px', { lineHeight: '1.15', fontWeight: '800' }],
      title: ['22px', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '800' }],
      heading: ['17px', { lineHeight: '1.3', fontWeight: '700' }],
      input: ['16px', { lineHeight: '1.35' }], // phones: 16 so iOS doesn't zoom
      body: ['15px', { lineHeight: '1.45' }],
      label: ['13px', { lineHeight: '1.35' }],
      eyebrow: ['11px', { lineHeight: '1.3', letterSpacing: '0.1em', fontWeight: '700' }],
      micro: ['10px', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '700' }],
    },
    extend: {
      boxShadow: {
        card: '0 1px 3px rgba(13, 31, 24, 0.08), 0 1px 2px rgba(13, 31, 24, 0.04)',
      },
    },
  },
  plugins: [],
}
