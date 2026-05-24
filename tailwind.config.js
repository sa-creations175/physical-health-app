/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces — light theme (matches Finance OS). Was a dark charcoal
        // base through v2.0; flipped to a near-white ground with white cards.
        charcoal: '#f5f7f5',         // app base (token name kept for churn-free migration)
        card: '#ffffff',             // all cards, panels, expandable sections
        'card-edge': '#e3e8e4',      // subtle light separation between cards
        divider: '#e7ece8',          // horizontal rules between sections
        // Text — dark ink on light surfaces
        ink: '#0d1f18',              // primary stat numbers, headings, day name
        'ink-body': '#2c3833',       // body labels inside cards
        'ink-mute': '#5f6b65',       // denominators, "sessions", "no data yet"
        'ink-soft': '#717c76',       // header date + week number
        'ink-hint': '#707a73',       // hints on the app background
        'card-mute': '#5f6b65',      // floor for small hint/secondary text on white cards
        dim: '#b8c2bc',              // disabled controls (e.g. reorder arrows at list ends)
        // Greens — single accent family. Deep green stays the primary accent
        // (CTAs, fills); mint is darkened so 9px section labels stay legible
        // on white. green-light remains for use ON green/colored surfaces.
        'green-deep': '#0F6E56',
        'green-mid': '#1a6b4a',
        'green-mint': '#157A5C',
        'green-light': '#9FE1CB',
        'green-leaf': '#3B6D11',
        // Other accents — one semantic meaning each
        'water-blue': '#185FA5',
        'red-alert': '#E24B4A',
      },
      fontFamily: {
        // Body copy + UI → DM Sans; display headings → Bricolage Grotesque.
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Soft elevation for white cards on the light ground.
        card: '0 1px 3px rgba(13, 31, 24, 0.08), 0 1px 2px rgba(13, 31, 24, 0.04)',
      },
      letterSpacing: {
        micro: '0.06em',
      },
    },
  },
  plugins: [],
}
