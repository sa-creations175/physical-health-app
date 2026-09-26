import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useScreenFrame } from '../../lib/screenFrame';

// The header strip every screen opens with (PERSONAL_OS_BRAND.md sections 5
// and 6): a Mint band holding eyebrow, title and subtitle, in that order,
// ending in a 1.5px Green 700 line edge to edge, as Mind's header strip draws
// it (mind-app/Mind/DesignSystem/BrandHeaderStrip.swift). May differ per screen: a control on the right and
// whatever sits under the subtitle (`children`). May not differ: colours,
// type, order.
//
// On a screen, the strip places itself in the screen frame's header area
// (components/AppLayout.tsx), above the scrolling content, so it never moves
// when the content scrolls or bounces. Full-screen overlays pass `overlay` and
// draw it where they are. The Mint runs up behind the status bar; the top
// padding brings the text below it. env() can read 0 inside the WebView
// before viewport-fit=cover settles, so it's floored against a physical
// fallback that clears the Dynamic Island.
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
  const { headerSlot } = useScreenFrame();
  const strip = (
    <header
      className={`relative shrink-0 bg-green-100 px-4 ${compact ? 'pb-1.5' : 'pb-4'}`}
      style={{
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
  if (overlay) return strip;
  // Until the frame's header area exists (the first render), draw nothing.
  return headerSlot ? createPortal(strip, headerSlot) : null;
}
