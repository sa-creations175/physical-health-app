import type { ReactNode } from 'react';

// Accent glyphs that sit at the top-right of each dashboard pillar. Rendered
// in a soft mint at full opacity — present but subtle on the white card /
// light section surfaces, never competing with the data. All inline SVG
// (no icon-lib dependency); path data kept to 1–4 elements so each reads
// cleanly at 28px. Decorative only — aria-hidden, since the adjacent section
// label already names the pillar.

const ICON_TINT = '#5DCAA5';

function PillarGlyph({
  children,
  size = 28,
  className,
}: {
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={ICON_TINT}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0${className ? ` ${className}` : ''}`}
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: number; className?: string };

// Strength — dumbbell: two plate circles joined by a handle bar.
export function DumbbellIcon(props: IconProps) {
  return (
    <PillarGlyph {...props}>
      <circle cx="5" cy="12" r="2.6" />
      <circle cx="19" cy="12" r="2.6" />
      <line x1="7.6" y1="12" x2="16.4" y2="12" />
    </PillarGlyph>
  );
}

// Cardio — ECG / pulse wave.
export function PulseIcon(props: IconProps) {
  return (
    <PillarGlyph {...props}>
      <polyline points="2 12 7 12 9.5 6 12.5 18 15 12 22 12" />
    </PillarGlyph>
  );
}

// Nutrition — leaf with a stem flick.
export function LeafIcon(props: IconProps) {
  return (
    <PillarGlyph {...props}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </PillarGlyph>
  );
}

// Delivery streak — flame.
export function FlameIcon(props: IconProps) {
  return (
    <PillarGlyph {...props}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </PillarGlyph>
  );
}

// Daily bundle — lightning bolt.
export function BoltIcon(props: IconProps) {
  return (
    <PillarGlyph {...props}>
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </PillarGlyph>
  );
}

// Apple Watch — heart with a pulse line through it.
export function HeartPulseIcon(props: IconProps) {
  return (
    <PillarGlyph {...props}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.28" />
    </PillarGlyph>
  );
}

// Mobility (future, no card mounted yet) — seated figure / lotus: head,
// torso, and a crossed-legs lap. Exported so the mobility card can adopt it
// when that pillar ships.
export function StretchIcon(props: IconProps) {
  return (
    <PillarGlyph {...props}>
      <circle cx="12" cy="5.5" r="2.5" />
      <path d="M12 8 L12 13" />
      <path d="M4.5 17.5 C7 13.5 17 13.5 19.5 17.5 C16 19.5 8 19.5 4.5 17.5 Z" />
    </PillarGlyph>
  );
}
