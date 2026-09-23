import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
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
          width: 18,
          height: 18,
          background: d.color,
          // Today is ringed in Green 700 (an outline, not a shadow).
          outline: d.date === today ? `2px solid ${COLOR.green700}` : undefined,
          outlineOffset: 1,
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
      <div className="mt-3 grid grid-cols-7">{dotEls}</div>
      <div className="mt-1 grid grid-cols-7">
        {DAY_INITIALS.map((letter, i) => (
          <span key={i} className="text-micro text-hint text-center">
            {letter}
          </span>
        ))}
      </div>
    </>
  );

  return (
    <div className="card relative px-4 py-3.5">
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
            <span className="eyebrow truncate">{label}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-body font-bold text-ink tabular-nums whitespace-nowrap">
              {badge}
            </span>
            <ChevronDown
              aria-hidden="true"
              size={18}
              strokeWidth={2}
              className={`text-green-700 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* Non-pillar cards: dots live inside the toggle button (decorative). */}
        {!pillar && dotsBlock}
      </button>

      {/* Pillar cards: tappable dots sit outside the toggle button. */}
      {pillar && <div className="relative">{dotsBlock}</div>}

      {expanded && children && (
        <div className="relative mt-3 pt-3 border-t border-hairline">
          {children}
        </div>
      )}

      {callout && (
        <p className="callout relative mt-3 font-semibold text-green-900">
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
