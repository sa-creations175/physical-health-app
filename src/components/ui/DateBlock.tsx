import { useRef } from 'react';
import { cardioDateLabel } from '../../lib/timeBucket';

// Date block matching the cardio logger's date field: dark surface,
// mint left accent, mint micro-label, "Today / Yesterday / Mon Apr 28"
// rendered as the value. The native <input type="date"> sits invisibly
// on top so a tap opens the platform picker — keeps our typography and
// drops zero native chrome into the visual.
export default function DateBlock({
  value,
  onChange,
  label = 'Date',
  ariaLabel = 'Date',
}: {
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
  label?: string;
  ariaLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{ borderLeftWidth: '2px', borderLeftColor: '#5DCAA5' }}
      className="relative bg-[#1a1a1a] border border-card-edge rounded-xl p-3 min-h-[64px] flex flex-col"
    >
      <p className="text-[10px] tracking-micro uppercase text-green-mint font-semibold">
        {label}
      </p>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[15px] text-[#f0f0f0] font-medium">
          {cardioDateLabel(value)}
        </span>
        <span aria-hidden className="text-card-mute text-[12px] leading-none">
          ⌄
        </span>
      </span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => {
          const el = inputRef.current;
          if (el && typeof el.showPicker === 'function') {
            try {
              el.showPicker();
            } catch {
              /* fall back to focus */
            }
          }
        }}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}
