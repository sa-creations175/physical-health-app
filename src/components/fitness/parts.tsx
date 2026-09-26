import type { ReactNode } from 'react';
import { COLOR } from '../../lib/brand';

// Small pieces the Fitness cards share (body-fitness-proto.html): a ring, a
// row of day dots, the day letters under it, and a card heading.

// A progress ring: Green 700 for the filled share on a Stone track, with the
// number in the middle. `fill` is 0..1.
export function Ring({
  fill,
  children,
  size = 44,
  inner,
  textClass = 'text-micro',
  onMint = false,
}: {
  fill: number;
  children: ReactNode;
  size?: number;
  inner?: number; // the centre's diameter; 10px less than the ring by default
  textClass?: string;
  onMint?: boolean; // the centre matches a Mint card
}) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <span
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${COLOR.green700} ${pct}%, ${COLOR.stone} 0)`,
      }}
    >
      <span
        className={`rounded-full flex items-center justify-center font-bold text-ink tabular-nums ${textClass} ${
          onMint ? 'bg-green-100' : 'bg-white'
        }`}
        style={{ width: inner ?? size - 10, height: inner ?? size - 10 }}
      >
        {children}
      </span>
    </span>
  );
}

// One dot per day, Sun..Sat.
//   on   — Green 700
//   half — half Green 700 (some, under the goal)
//   miss — Bronze Amber
//   none — Stone (nothing, or still to come)
// Today carries a thin Green 300 ring. With `onTap`, days up to today are
// buttons.
export type DotState = 'on' | 'half' | 'miss' | 'none';

export function DayDots({
  days,
  today,
  onTap,
  label,
  small = false,
}: {
  days: { date: string; state: DotState }[];
  today: string;
  onTap?: (date: string) => void;
  label?: (date: string) => string;
  small?: boolean; // Home: 10px dots, no padding
}) {
  return (
    <div className="flex">
      {days.map((d) => {
        const dot = (
          <span
            className={`block rounded-full ${small ? 'w-2.5 h-2.5' : 'w-3 h-3'}`}
            style={{
              background:
                d.state === 'on'
                  ? COLOR.green700
                  : d.state === 'miss'
                    ? COLOR.amber
                    : d.state === 'half'
                      ? `linear-gradient(90deg, ${COLOR.green700} 50%, ${COLOR.stone} 50%)`
                      : COLOR.stone,
              // Today's ring: 3px out from the dot at most (1px ring, 2px gap on
              // Home's small dots), so it never touches the rule above.
              outline: d.date === today ? `${small ? 1 : 1.5}px solid ${COLOR.green300}` : undefined,
              outlineOffset: 2,
            }}
          />
        );
        const tappable = onTap && d.date <= today;
        return tappable ? (
          <button
            key={d.date}
            type="button"
            onClick={() => onTap(d.date)}
            aria-label={label?.(d.date)}
            className="flex-1 flex justify-center py-2"
          >
            {dot}
          </button>
        ) : (
          <span
            key={d.date}
            className={`flex-1 flex justify-center ${onTap ? 'py-2' : small ? '' : 'py-1'}`}
            aria-hidden="true"
          >
            {dot}
          </span>
        );
      })}
    </div>
  );
}

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DayLetters({ small = false }: { small?: boolean }) {
  return (
    <div className={`flex ${small ? 'mt-[3px]' : ''}`} aria-hidden="true">
      {DAY_INITIALS.map((d, i) => (
        <span
          key={i}
          className={`flex-1 text-center font-semibold text-hint ${
            small ? 'text-[9px] leading-none' : 'text-micro tracking-normal'
          }`}
        >
          {d}
        </span>
      ))}
    </div>
  );
}

// A card's heading row: the icon and Title Case heading in Green 900, any
// corner text on the right, and a thin Green 300 line under the row.
export function CardHead({
  icon,
  children,
  right,
  className = '',
}: {
  icon: ReactNode;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-head ${className}`}>
      <span className="card-heading">
        <span className="shrink-0 flex items-center">{icon}</span>
        {children}
      </span>
      {right}
    </div>
  );
}

// "Move goal days 3/7": a bold label, then the count.
export function DotLabel({ label, children, small = false }: { label: string; children?: ReactNode; small?: boolean }) {
  return (
    <span className={`text-hint whitespace-nowrap ${small ? 'text-[10px] leading-tight' : 'text-label'}`}>
      <b className="font-bold text-muted">{label}</b>
      {children !== undefined && <> {children}</>}
    </span>
  );
}

// The prototype's dumbbell and runner marks (Lucide's own don't match).
export function DumbbellIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 5v14M18 5v14M3 8v8M21 8v8M6 12h12" />
    </svg>
  );
}

export function RunnerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13" cy="4" r="2" />
      <path d="m7 21 3-7 3 2v6" />
      <path d="M6 12l3-4 4 1 3 4 3 1" />
    </svg>
  );
}

// Two cards side by side that line up row by row: the pair shares one grid,
// and each card takes its rows from it (CSS subgrid), so headings, rings,
// dividing lines, dot rows and bottom lines sit level across the pair,
// whatever each card holds. A card gives exactly `rows` children, one per row
// (an empty one keeps its place). Alignment is the pair's, not tuned per card.
export function PairRow({
  rows,
  gapClass = 'gap-x-2',
  children,
}: {
  rows: number;
  gapClass?: string;
  children: ReactNode;
}) {
  return (
    <div className={`grid grid-cols-2 ${gapClass}`} style={{ gridTemplateRows: `repeat(${rows}, auto)` }}>
      {children}
    </div>
  );
}

export function PairCard({
  rows,
  className = '',
  children,
  ...rest
}: {
  rows: number;
  className?: string;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>) {
  return (
    <div
      {...rest}
      className={`grid min-w-0 ${className}`}
      style={{ gridRow: `span ${rows}`, gridTemplateRows: 'subgrid' }}
    >
      {children}
    </div>
  );
}

// A card's bottom line ("Nights 7h+ 1/7", "Stretch days · Last Sat"): one
// layout for every card, so the small text sits on the same baseline across
// a pair (plain text in a paragraph would ride on the paragraph's taller line
// and sit lower).
export function BottomLine({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mt-0.5 flex items-center justify-between gap-1 ${className}`}>{children}</div>;
}
