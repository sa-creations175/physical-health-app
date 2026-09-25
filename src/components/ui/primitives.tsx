import type { ReactNode } from 'react';
import { narrowDayLabel } from '../../lib/dateHelpers';
import { COLOR } from '../../lib/brand';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
}

// A section or card heading without an icon: Title Case, Green 900, over a
// thin Green 300 line, with optional text on the right of the row.
export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="card-head">
      <p className="card-heading">{children}</p>
      {right}
    </div>
  );
}

// Progress bar. Colour is not a choice: Stone track, Green 700 fill, and
// Bronze Amber only when the bar shows a miss against the person's own goal.
export function ProgressBar({
  value,
  max,
  miss = false,
  height = 4,
}: {
  value: number;
  max: number;
  miss?: boolean;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className="rounded-full overflow-hidden w-full bg-stone"
      style={{ height }}
    >
      <div
        className={`h-full rounded-full transition-all ${miss ? 'bg-amber' : 'bg-green-700'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SevenDayDotRow({
  dots,
  size = 8,
}: {
  dots: { date: string; hadSession: boolean }[];
  size?: number;
}) {
  return (
    <div className="flex justify-between items-center">
      {dots.map((d) => (
        <div key={d.date} className="flex flex-col items-center gap-1.5">
          <span
            className="rounded-full block"
            style={{
              width: size,
              height: size,
              background: d.hadSession ? COLOR.green700 : COLOR.stone,
            }}
          />
          <span className="micro text-muted">
            {narrowDayLabel(d.date)}
          </span>
        </div>
      ))}
    </div>
  );
}
