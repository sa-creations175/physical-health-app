// Small 18px accent icons for each activity card's label row (Build 2.8).
// Green-mid, inline SVG — no icon-library dependency. Drawn simply so they
// stay recognizable at 18px.

const TINT = '#1a6b4a';

function Base({
  children,
  fill = 'none',
}: {
  children: React.ReactNode;
  fill?: string;
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={fill}
      stroke={fill === 'none' ? TINT : 'none'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

// Lower body — bold downward arrow (shaft + chevron head), single path.
export function LowerBodyIcon() {
  return (
    <Base>
      <path d="M12 4v16m-6-6 6 6 6-6" strokeWidth="2.5" />
    </Base>
  );
}

// Upper body — bold upward arrow, mirror of Lower Body.
export function UpperBodyIcon() {
  return (
    <Base>
      <path d="M12 20V4m-6 6 6-6 6 6" strokeWidth="2.5" />
    </Base>
  );
}

// Full body — lightning bolt (filled polygon).
export function FullBodyIcon() {
  return (
    <Base fill={TINT}>
      <path d="M13 2 5 13h5l-1 9 8-12h-5z" />
    </Base>
  );
}

// Cardio — heart with a pulse line through the center.
export function CardioIcon() {
  return (
    <Base>
      <path d="M12 20s-7-4.5-7-9.5a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 5-7 9.5-7 9.5z" />
      <path d="M6 12h3l1.5-3 2.5 6 1.5-3h2.5" />
    </Base>
  );
}

// Mobility — three petals radiating from a center point (lotus).
export function MobilityIcon() {
  return (
    <Base>
      <ellipse cx="12" cy="12" rx="2.2" ry="6" />
      <ellipse
        cx="12"
        cy="12"
        rx="2.2"
        ry="6"
        transform="rotate(-45 12 12)"
      />
      <ellipse cx="12" cy="12" rx="2.2" ry="6" transform="rotate(45 12 12)" />
    </Base>
  );
}

// Daily bundle — flame with an inner highlight curve.
export function BundleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill={TINT}
        d="M12 22c-3.3 0-6-2.4-6-5.6 0-2 1-3.7 2.4-5C9.2 9.7 9.3 7 8.6 4.4c2.6 1.5 4.1 3.6 4.6 5.7.5-1 .7-2 .5-3.1 2.1 1.7 3.2 4.1 3.2 6.6 0 3.2-2.6 5.6-4.9 5.6z"
      />
      <path
        fill="#a8dfc0"
        d="M12 22c-1.7 0-3-1.3-3-3 0-1.3.7-2.3 1.6-3 .3 1 .8 1.5 1.4 1.9.9-.9 1-2.1 1-2.9 1 1 1.5 2.3 1.5 3.4 0 1.8-1.4 3.6-3.5 3.6z"
      />
    </svg>
  );
}

// Apple Watch — case + strap stubs + center crown dot.
export function WatchIcon() {
  return (
    <Base>
      <rect x="7" y="7" width="10" height="10" rx="3" />
      <path d="M9.5 7V4h5v3" />
      <path d="M9.5 17v3h5v-3" />
      <circle cx="12" cy="12" r="1.6" />
    </Base>
  );
}
