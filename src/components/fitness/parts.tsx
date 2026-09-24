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
  onMint = false,
}: {
  fill: number;
  children: ReactNode;
  size?: number;
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
        className={`rounded-full flex items-center justify-center text-micro text-ink tabular-nums ${
          onMint ? 'bg-green-100' : 'bg-white'
        }`}
        style={{ width: size - 10, height: size - 10 }}
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
}: {
  days: { date: string; state: DotState }[];
  today: string;
  onTap?: (date: string) => void;
  label?: (date: string) => string;
}) {
  return (
    <div className="flex">
      {days.map((d) => {
        const dot = (
          <span
            className="block w-3 h-3 rounded-full"
            style={{
              background:
                d.state === 'on'
                  ? COLOR.green700
                  : d.state === 'miss'
                    ? COLOR.amber
                    : d.state === 'half'
                      ? `linear-gradient(90deg, ${COLOR.green700} 50%, ${COLOR.stone} 50%)`
                      : COLOR.stone,
              outline: d.date === today ? `1.5px solid ${COLOR.green300}` : undefined,
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
          <span key={d.date} className={`flex-1 flex justify-center ${onTap ? 'py-2' : 'py-1'}`} aria-hidden="true">
            {dot}
          </span>
        );
      })}
    </div>
  );
}

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DayLetters() {
  return (
    <div className="flex" aria-hidden="true">
      {DAY_INITIALS.map((d, i) => (
        <span key={i} className="flex-1 text-center text-micro font-semibold tracking-normal text-hint">
          {d}
        </span>
      ))}
    </div>
  );
}

// A card heading: an icon, then the eyebrow.
export function CardHead({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="eyebrow inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="shrink-0 flex items-center text-green-700">{icon}</span>
      {children}
    </span>
  );
}

// "Move goal days 3/7": a bold label, then the count.
export function DotLabel({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <span className="text-label text-hint whitespace-nowrap">
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
