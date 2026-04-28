import type { ReactNode } from 'react';
import { narrowDayLabel } from '../../lib/dateHelpers';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-card border border-card-edge rounded-xl ${className}`}>
      {children}
    </div>
  );
}

export function SectionLabel({
  children,
  onCard = false,
}: {
  children: ReactNode;
  onCard?: boolean;
}) {
  return (
    <p
      className={`text-[9px] tracking-micro uppercase font-medium ${
        onCard ? 'text-green-mint' : 'text-ink-hint'
      }`}
    >
      {children}
    </p>
  );
}

const PROGRESS_COLOR_MAP: Record<string, string> = {
  'green-deep': '#0F6E56',
  'green-leaf': '#3B6D11',
  'green-light': '#9FE1CB',
  'water-blue': '#185FA5',
};

export function ProgressBar({
  value,
  max,
  color = 'green-deep',
  trackColor = '#3a3a3a',
  height = 4,
}: {
  value: number;
  max: number;
  color?: 'green-deep' | 'green-leaf' | 'green-light' | 'water-blue';
  trackColor?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className="rounded-full overflow-hidden w-full"
      style={{ height, background: trackColor }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: PROGRESS_COLOR_MAP[color] }}
      />
    </div>
  );
}

export function SevenDayDotRow({
  dots,
  activeColor = '#0F6E56',
  size = 8,
}: {
  dots: { date: string; hadSession: boolean }[];
  activeColor?: string;
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
              background: d.hadSession ? activeColor : '#444',
            }}
          />
          <span className="text-[9px] text-ink-hint uppercase tracking-micro">
            {narrowDayLabel(d.date)}
          </span>
        </div>
      ))}
    </div>
  );
}
