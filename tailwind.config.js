/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        charcoal: '#2a2a2a',
        card: '#686868',
        'card-edge': '#555555',
        divider: '#3a3a3a',
        // Text
        ink: '#f0f0f0',
        'ink-mute': '#aaaaaa',
        'ink-hint': '#777777',
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
