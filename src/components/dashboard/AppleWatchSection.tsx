import { SectionLabel } from '../ui/primitives';

const STATS = [
  { key: 'steps', label: 'Steps' },
  { key: 'active_cal', label: 'Active Cal' },
  { key: 'rest_hr', label: 'Rest HR' },
];

export default function AppleWatchSection() {
  return (
    <section className="px-5 mt-6">
      <SectionLabel>Today — Apple Watch</SectionLabel>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {STATS.map(({ key, label }) => (
          <div
            key={key}
            className="bg-card border border-card-edge rounded-xl p-3 min-h-[80px] flex flex-col"
          >
            <p className="text-[9px] tracking-micro uppercase text-green-mint font-medium">
              {label}
            </p>
            <p className="mt-1.5 text-[12px] text-ink-hint">no data yet</p>
          </div>
        ))}
      </div>
    </section>
  );
}
