/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces — unchanged per April 27 spec
        charcoal: '#2a2a2a',
        card: '#686868',
        'card-edge': '#555555',
        divider: '#1a2e22',          // green-tinted dark, replaces #3a3a3a
        // Text — bumped brightness across the board
        ink: '#ffffff',              // pure white (primary stat numbers + day name)
        'ink-body': '#e0e0e0',       // body labels inside cards
        'ink-mute': '#aaaaaa',       // denominators, "sessions", "no data yet"
        'ink-soft': '#999999',       // header date + week number
        'ink-hint': '#888888',       // hints on charcoal background only
        'card-mute': '#bbbbbb',      // floor for any small hint/secondary text on card surfaces
        // Greens — single accent family
        'green-deep': '#0F6E56',
        'green-mint': '#5DCAA5',
        'green-light': '#9FE1CB',
        'green-leaf': '#3B6D11',
        // Other accents — one semantic meaning each
        'water-blue': '#185FA5',
        'red-alert': '#E24B4A',
      },
      letterSpacing: {
        micro: '0.06em',
      },
    },
  },
  plugins: [],
}
