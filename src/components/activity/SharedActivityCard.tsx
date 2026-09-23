import { useState, type ReactNode } from 'react';
import { todayISODate } from '../../lib/dateHelpers';
import type { ActivityDot } from '../../lib/dotHelpers';
import { COLOR } from '../../lib/brand';
import DayDetailSheet from './DayDetailSheet';
import type { DetailPillar } from '../../lib/dayDetailHelpers';

// Single-letter weekday initials, Sunday-first to match the app's week math.
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// The compact, glanceable activity card used across Fitness + Nutrition.
// Collapsed: label + count badge + a 7-day intensity dot row + a chevron.
// Expanded (controlled by the parent — one open at a time): the section's
// full detail slides in below a hairline divider, in the same growing card.
//
// When `pillar` is supplied (Fitness pillars), each day-dot becomes tappable
// and opens a per-pillar / per-day detail sheet. Cards without a pillar (the
// Apple Watch row, Nutrition's delivery streak) keep decorative, toggling dots.
export default function SharedActivityCard({
  label,
  badge,
  dots,
  expanded,
  onToggle,
  icon,
  children,
  pillar,
  callout,
}: {
  label: string;
  badge: ReactNode;
  dots: ActivityDot[];
  expanded: boolean;
  onToggle: () => void;
  icon?: ReactNode;
  children?: ReactNode;
  pillar?: DetailPillar;
  // Always-present hype callout under the card, on a Green 300 rail.
  callout?: string;
}) {
  const today = todayISODate();
  const [detailDate, setDetailDate] = useState<string | null>(null);

  const dotEls = dots.map((d) => {
    const swatch = (
      <span
        className="rounded-full block"
        style={{
          width: 10,
          height: 10,
          background: d.color,
          boxShadow: d.date === today ? `0 0 0 1.5px ${COLOR.green700}` : undefined,
        }}
      />
    );
    if (!pillar) {
      return (
        <div key={d.date} className="flex justify-center">
          {swatch}
        </div>
      );
    }
    return (
      <button
        key={d.date}
        type="button"
        onClick={() => setDetailDate(d.date)}
        aria-label={`${label} detail for ${d.date}`}
        className="flex justify-center py-1"
      >
        {swatch}
      </button>
    );
  });

  // The dots+initials block. For pillar cards the dots are their own buttons
  // (open the sheet), so the block is a plain div. For non-pillar cards the
  // whole block toggles expand, preserving the prior tap area.
  const dotsBlock = (
    <>
      <div className="mt-2 grid grid-cols-7">{dotEls}</div>
      <div className="mt-1 grid grid-cols-7">
        {DAY_INITIALS.map((letter, i) => (
          <span key={i} className="text-[8px] text-hint text-center">
            {letter}
          </span>
        ))}
      </div>
    </>
  );

  return (
    <div className="relative bg-white border border-hairline rounded-2xl px-4 py-2.5 overflow-hidden">

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
            <span className="text-[11px] font-display uppercase tracking-micro truncate text-green-700">
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[12px] text-ink whitespace-nowrap">{badge}</span>
            <span
              aria-hidden="true"
              className={`text-green-700 text-[16px] leading-none transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            >
              ▾
            </span>
          </div>
        </div>

        {/* Non-pillar cards: dots live inside the toggle button (decorative). */}
        {!pillar && dotsBlock}
      </button>

      {/* Pillar cards: tappable dots sit outside the toggle button. */}
      {pillar && <div className="relative">{dotsBlock}</div>}

      {expanded && children && (
        <div
          className="relative mt-3 pt-3 border-t border-hairline"
        >
          {children}
        </div>
      )}

      {callout && (
        <p className="relative mt-2 pl-2 text-[11px] leading-snug text-muted border-l-2 border-green-300">
          {callout}
        </p>
      )}

      {pillar && detailDate && (
        <DayDetailSheet
          pillar={pillar}
          date={detailDate}
          onClose={() => setDetailDate(null)}
        />
      )}
    </div>
  );
}
