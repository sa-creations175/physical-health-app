import type { ExerciseHistoryEntry } from '../../lib/exerciseHistory';

// Tiny inline-SVG sparkline of an exercise's last-N session top-set metric.
// Caller passes entries in most-recent-first order (matches the helper).
// We reverse internally so progression reads left → right oldest → newest.
//
// The series is filtered to the dominant mode so the y-axis means one thing
// — a session whose top set was duration-mode while the rest were rep-mode
// would otherwise warp the scale.
export default function Sparkline({
  entries,
  height = 48,
}: {
  entries: ExerciseHistoryEntry[];
  height?: number;
}) {
  let repCount = 0;
  let durationCount = 0;
  for (const e of entries) {
    if (e.metricKind === 'duration') durationCount++;
    else repCount++;
  }
  const dominant: 'reps' | 'duration' = durationCount > repCount ? 'duration' : 'reps';

  const series = entries
    .slice()
    .reverse()
    .filter((e) => e.metricKind === dominant);

  if (series.length < 2) {
    return (
      <div
        className="text-card-mute text-[11px] flex items-center justify-center"
        style={{ height }}
      >
        not enough history yet
      </div>
    );
  }

  const values = series.map((s) => s.metric);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 100;
  const padY = 4;
  const stepX = width / (series.length - 1);

  const points = series.map((s, i) => {
    const x = i * stepX;
    const y = padY + (height - padY * 2) * (1 - (s.metric - min) / range);
    return { x, y, isPR: s.isPR };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      aria-label="last sessions trend"
    >
      <path d={pathD} fill="none" stroke="#3B6D11" strokeWidth={1.5} />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.isPR ? 2.6 : 1.8}
          fill={p.isPR ? '#5DCAA5' : '#3B6D11'}
        />
      ))}
    </svg>
  );
}
