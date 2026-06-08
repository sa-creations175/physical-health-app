import type { ReactNode } from 'react';
import { todayISODate } from '../../lib/dateHelpers';
import type { ActivityDot } from '../../lib/dotHelpers';
import {
  hexToRgba,
  PILLAR_FILL_ALPHA,
  PILLAR_FILL_ALPHA_COMPLETE,
} from '../../lib/pillarColors';

// Single-letter weekday initials, Sunday-first to match the app's week math.
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Per-pillar fill treatment (June 5 design): the card fills left-to-right with
// a soft tint of `color`, width = `fraction` (0..1, already clamped). When
// `complete`, the tint reaches full width at a slightly richer alpha and a
// colored border is added. `accent` colors the pillar label. Omit `color`
// entirely (e.g. the Apple Watch row) for a plain, fill-less card.
export interface CardFill {
  color: string;
  fraction: number;
  complete: boolean;
  accent: string;
}

// The compact, glanceable activity card used across Fitness + Nutrition.
// Collapsed: label + count badge + a 7-day intensity dot row + a chevron.
// Expanded (controlled by the parent — one open at a time): the section's
// full detail slides in below a hairline divider, in the same growing card.
export default function SharedActivityCard({
  label,
  badge,
  dots,
  expanded,
  onToggle,
  icon,
  children,
  fill,
}: {
  label: string;
  badge: ReactNode;
  dots: ActivityDot[];
  expanded: boolean;
  onToggle: () => void;
  icon?: ReactNode;
  children?: ReactNode;
  fill?: CardFill;
}) {
  const today = todayISODate();

  const fillWidth = fill ? Math.round(fill.fraction * 100) : 0;
  const fillAlpha = fill?.complete
    ? PILLAR_FILL_ALPHA_COMPLETE
    : PILLAR_FILL_ALPHA;

  return (
    <div
      className="relative bg-card shadow-card rounded-2xl px-4 py-2.5 overflow-hidden"
      // Transparent border by default so the box size matches whether or not
      // the card is complete (only the color changes on completion).
      style={{
        border: `1.5px solid ${
          fill?.complete ? fill.color : 'transparent'
        }`,
      }}
    >
      {/* Progress fill — a soft left-to-right tint behind the content. */}
      {fill && fillWidth > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0"
          style={{
            width: `${fillWidth}%`,
            background: hexToRgba(fill.color, fillAlpha),
          }}
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="relative w-full text-left"
      >
        <div className="flex items-center justify-between gap-2">
          {/* Icon + label left-aligned; badge + chevron right-aligned. */}
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="shrink-0 flex items-center">{icon}</span>}
            <span
              className="text-[11px] font-display uppercase tracking-micro truncate"
              style={{ color: fill?.accent ?? '#1a6b4a' }}
            >
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[12px] text-ink whitespace-nowrap">{badge}</span>
            <span
              aria-hidden="true"
              className={`text-green-mid text-[16px] leading-none transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            >
              ▾
            </span>
          </div>
        </div>

        {/* 7-day dot row, full card width. Today's dot gets a green-mid ring. */}
        <div className="mt-2 grid grid-cols-7">
          {dots.map((d) => (
            <div key={d.date} className="flex justify-center">
              <span
                className="rounded-full block"
                style={{
                  width: 10,
                  height: 10,
                  background: d.color,
                  boxShadow: d.date === today ? '0 0 0 1.5px #1a6b4a' : undefined,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7">
          {DAY_INITIALS.map((letter, i) => (
            <span key={i} className="text-[8px] text-dim text-center">
              {letter}
            </span>
          ))}
        </div>
      </button>

      {expanded && children && (
        <div
          className="relative mt-3 pt-3 border-t"
          style={{ borderColor: '#f0f2f0' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
