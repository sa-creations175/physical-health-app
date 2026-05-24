import type { ReactNode } from 'react';
import { todayISODate } from '../../lib/dateHelpers';
import type { ActivityDot } from '../../lib/dotHelpers';

// Single-letter weekday initials, Sunday-first to match the app's week math.
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
  children,
}: {
  label: string;
  badge: ReactNode;
  dots: ActivityDot[];
  expanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  const today = todayISODate();

  return (
    <div className="bg-card shadow-card rounded-2xl px-4 py-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-[11px] font-display uppercase tracking-micro text-green-mid truncate">
              {label}
            </span>
            <span className="text-[12px] text-ink whitespace-nowrap">{badge}</span>
          </div>
          <span
            aria-hidden="true"
            className={`text-green-mid text-[16px] leading-none transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          >
            ▾
          </span>
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
        <div className="mt-3 pt-3 border-t" style={{ borderColor: '#f0f2f0' }}>
          {children}
        </div>
      )}
    </div>
  );
}
