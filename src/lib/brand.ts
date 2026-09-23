// Brand colours for places a Tailwind class can't reach (inline styles, SVG
// attributes, computed backgrounds). Each is a reference to the CSS variable
// defined once in src/index.css, never a hex value, so the palette has a
// single source of truth.
export const COLOR = {
  green900: 'var(--green-900)',
  green700: 'var(--green-700)',
  green500: 'var(--green-500)',
  green300: 'var(--green-300)',
  green100: 'var(--green-100)',
  amber: 'var(--amber)',
  amberTint: 'var(--amber-tint)',
  amberEdge: 'var(--amber-edge)',
  amberText: 'var(--amber-text)',
  stone: 'var(--stone)',
  paper: 'var(--paper)',
  ink: 'var(--ink)',
  muted: 'var(--muted)',
  hint: 'var(--hint)',
  white: 'var(--white)',
  hairline: 'var(--hairline)',
  hairlineWarm: 'var(--hairline-warm)',
  scrim: 'var(--scrim)',
} as const;

