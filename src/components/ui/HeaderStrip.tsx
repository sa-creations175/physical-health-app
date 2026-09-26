import type { ReactNode } from 'react';

// The header strip every screen opens with (PERSONAL_OS_BRAND.md sections 5
// and 6): a Mint band holding eyebrow, title and subtitle, in that order,
// ending in a 1.5px Green 700 line edge to edge, as Mind's header strip draws
// it (mind-app/Mind/DesignSystem/BrandHeaderStrip.swift). May differ per screen: a control on the right and
// whatever sits under the subtitle (`children`). May not differ: colours,
// type, order.
//
// On a page, the negative top margin cancels the body's safe-area padding so
// the Mint reaches behind the notch; the top padding brings the text back
// below it. Full-screen overlays are position:fixed and ignore the body's
// padding, so they pass `overlay` and skip the negative margin. env() can
// read 0 inside the WebView before viewport-fit=cover settles, so it's
// floored against a physical fallback that clears the Dynamic Island.
export default function HeaderStrip({
  eyebrow,
  title,
  subtitle,
  right,
  badge,
  children,
  overlay = false,
  compact = false,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  // A small pill on the eyebrow's line, at its right end (Fitness's Goals
  // pill).
  badge?: ReactNode;
  children?: ReactNode;
  overlay?: boolean;
  // Home: a tighter bottom edge so the whole screen fits without scrolling.
  compact?: boolean;
}) {
  return (
    <header
      className={`relative shrink-0 bg-green-100 px-4 ${compact ? 'pb-1.5' : 'pb-4'}`}
      style={{
        marginTop: overlay ? 0 : 'calc(-1 * env(safe-area-inset-top))',
        paddingTop: 'calc(max(env(safe-area-inset-top), 47px) + 12px)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {badge ? (
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow">{eyebrow}</p>
              {badge}
            </div>
          ) : (
            <p className="eyebrow">{eyebrow}</p>
          )}
          <h1 className="text-title text-ink mt-0.5">{title}</h1>
          {subtitle && <p className="text-label text-muted mt-1">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
      </div>
      {children}
      {/* The Green 700 line along the bottom, 1.5px, edge to edge. Drawn as a
          bar over the bottom edge like Mind's (a 1.5px border would be snapped
          to whole device pixels). */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-green-700" style={{ height: 1.5 }} />
    </header>
  );
}
