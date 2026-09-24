import type { ReactNode } from 'react';

// The header strip every screen opens with (PERSONAL_OS_BRAND.md sections 5
// and 6): a Mint band holding eyebrow, title and subtitle, in that order,
// ending in a hairline. May differ per screen: a control on the right and
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
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  // A small pill on the eyebrow's line, at its right end (the move goal
  // streak on Home and Fitness).
  badge?: ReactNode;
  children?: ReactNode;
  overlay?: boolean;
}) {
  return (
    <header
      className="shrink-0 bg-green-100 border-b border-hairline px-4 pb-4"
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
    </header>
  );
}
